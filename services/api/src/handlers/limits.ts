import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getPool } from '../lib/db'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const pool = await getPool()

  try {
    const path = event.path
    const method = event.httpMethod

    // GET /v1/limits - 全リミット取得
    if (method === 'GET' && path === '/v1/limits') {
      const result = await pool.query(`
        SELECT id, limit_type, entity_id, limit_value, 
               warning_threshold, alert_threshold, is_active, 
               created_at, updated_at
        FROM position_limits
        WHERE is_active = true
        ORDER BY limit_type, entity_id
      `)

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ limits: result.rows }),
      }
    }

    // GET /v1/limits/status - リミット使用状況
    if (method === 'GET' && path === '/v1/limits/status') {
      const asOf = event.queryStringParameters?.asOf || new Date().toISOString().split('T')[0]

      const result = await pool.query(`
        WITH current_net_position AS (
          SELECT 
            COALESCE(SUM(qty_mt), 0) as total_net_position
          FROM position_components
          WHERE as_of_date = $1::date
        ),
        customer_exposures AS (
          SELECT 
            counterparty as customer_id,
            COALESCE(SUM(
              CASE 
                WHEN buy_sell = 'BUY' THEN quantity_mt
                WHEN buy_sell = 'SELL' THEN -quantity_mt
                ELSE 0
              END
            ), 0) as total_exposure
          FROM trades
          GROUP BY counterparty
        ),
        contract_month_positions AS (
          SELECT 
            contract_month,
            COALESCE(SUM(
              CASE 
                WHEN buy_sell = 'BUY' THEN quantity_mt
                WHEN buy_sell = 'SELL' THEN -quantity_mt
                ELSE 0
              END
            ), 0) as month_position
          FROM trades
          GROUP BY contract_month
        )
        SELECT 
          pl.id,
          pl.limit_type,
          pl.entity_id,
          pl.limit_value,
          pl.warning_threshold,
          pl.alert_threshold,
          CASE 
            WHEN pl.limit_type = 'net_position' THEN COALESCE(cnp.total_net_position, 0)
            WHEN pl.limit_type = 'customer_exposure' THEN COALESCE(ce.total_exposure, 0)
            WHEN pl.limit_type = 'contract_month' THEN COALESCE(cmp.month_position, 0)
          END as current_value,
          CASE 
            WHEN pl.limit_type = 'net_position' THEN 
              CASE 
                WHEN pl.limit_value > 0 THEN COALESCE(cnp.total_net_position, 0) / pl.limit_value * 100
                ELSE 0
              END
            WHEN pl.limit_type = 'customer_exposure' THEN 
              CASE 
                WHEN pl.limit_value > 0 THEN COALESCE(ce.total_exposure, 0) / pl.limit_value * 100
                ELSE 0
              END
            WHEN pl.limit_type = 'contract_month' THEN 
              CASE 
                WHEN pl.limit_value > 0 THEN COALESCE(cmp.month_position, 0) / pl.limit_value * 100
                ELSE 0
              END
          END as utilization_pct,
          CASE
            WHEN (
              CASE 
                WHEN pl.limit_type = 'net_position' THEN COALESCE(cnp.total_net_position, 0)
                WHEN pl.limit_type = 'customer_exposure' THEN COALESCE(ce.total_exposure, 0)
                WHEN pl.limit_type = 'contract_month' THEN COALESCE(cmp.month_position, 0)
              END / NULLIF(pl.limit_value, 0) * 100
            ) >= pl.alert_threshold THEN 'alert'
            WHEN (
              CASE 
                WHEN pl.limit_type = 'net_position' THEN COALESCE(cnp.total_net_position, 0)
                WHEN pl.limit_type = 'customer_exposure' THEN COALESCE(ce.total_exposure, 0)
                WHEN pl.limit_type = 'contract_month' THEN COALESCE(cmp.month_position, 0)
              END / NULLIF(pl.limit_value, 0) * 100
            ) >= pl.warning_threshold THEN 'warning'
            ELSE 'normal'
          END as status
        FROM position_limits pl
        LEFT JOIN current_net_position cnp ON pl.limit_type = 'net_position'
        LEFT JOIN customer_exposures ce ON pl.entity_id = ce.customer_id AND pl.limit_type = 'customer_exposure'
        LEFT JOIN contract_month_positions cmp ON pl.entity_id = cmp.contract_month AND pl.limit_type = 'contract_month'
        WHERE pl.is_active = true
        ORDER BY 
          CASE
            WHEN (
              CASE 
                WHEN pl.limit_type = 'net_position' THEN COALESCE(cnp.total_net_position, 0)
                WHEN pl.limit_type = 'customer_exposure' THEN COALESCE(ce.total_exposure, 0)
                WHEN pl.limit_type = 'contract_month' THEN COALESCE(cmp.month_position, 0)
              END / NULLIF(pl.limit_value, 0) * 100
            ) >= pl.alert_threshold THEN 1
            WHEN (
              CASE 
                WHEN pl.limit_type = 'net_position' THEN COALESCE(cnp.total_net_position, 0)
                WHEN pl.limit_type = 'customer_exposure' THEN COALESCE(ce.total_exposure, 0)
                WHEN pl.limit_type = 'contract_month' THEN COALESCE(cmp.month_position, 0)
              END / NULLIF(pl.limit_value, 0) * 100
            ) >= pl.warning_threshold THEN 2
            ELSE 3
          END,
          pl.limit_type, pl.entity_id
      `, [asOf])

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ limits: result.rows, asOf }),
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    }

  } catch (error: any) {
    console.error('Limits API error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

