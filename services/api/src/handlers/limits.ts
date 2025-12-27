import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { query } from '../lib/db'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// リミット一覧取得
export async function handleLimits(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const result = await query(`
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
  } catch (error: any) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

// リミット状況取得
export async function handleLimitsStatus(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const asOf = event.queryStringParameters?.asOf || new Date().toISOString().split('T')[0]

    const result = await query(`
      WITH current_net AS (
        SELECT COALESCE(SUM(position_qty_mt), 0) as total
        FROM valuations 
        WHERE as_of_date = $1 AND scope = 'TOTAL'
      )
      SELECT 
        pl.id,
        pl.limit_type,
        pl.entity_id,
        pl.limit_value,
        pl.warning_threshold,
        pl.alert_threshold,
        CASE 
          WHEN pl.limit_type = 'net_position' THEN (SELECT total FROM current_net)
          ELSE 0
        END as current_value,
        CASE 
          WHEN pl.limit_type = 'net_position' THEN (SELECT total FROM current_net) / pl.limit_value * 100
          ELSE 0
        END as utilization_pct,
        CASE
          WHEN (
            CASE 
              WHEN pl.limit_type = 'net_position' THEN (SELECT total FROM current_net) / pl.limit_value * 100
              ELSE 0
            END
          ) >= pl.alert_threshold THEN 'alert'
          WHEN (
            CASE 
              WHEN pl.limit_type = 'net_position' THEN (SELECT total FROM current_net) / pl.limit_value * 100
              ELSE 0
            END
          ) >= pl.warning_threshold THEN 'warning'
          ELSE 'normal'
        END as status
      FROM position_limits pl
      WHERE pl.is_active = true
      ORDER BY pl.limit_type, pl.entity_id
    `, [asOf])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ limits: result.rows, asOf }),
    }
  } catch (error: any) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}


