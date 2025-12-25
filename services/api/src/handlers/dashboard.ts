import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { query } from '../lib/db'

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // パスによる分岐
  const path = event.path || event.rawPath
  
  if (path === '/v1/series') {
    return handleSeries(event, headers)
  }
  
  // デフォルトはdashboard処理
  return handleDashboard(event, headers)
}

async function handleDashboard(event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const asOf = event.queryStringParameters?.asOf
    if (!asOf) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'BAD_REQUEST', message: 'asOf is required' },
        }),
      }
    }

    // 1クエリで必要データを取得（UNION ALL使用）
    const result = await query(
      `
      -- valuations
      SELECT 
        as_of_date,
        period_type,
        position_qty_mt as net_position_mt,
        mtm_value_usd,
        ref_tenor_months,
        futures_price_usd,
        NULL::text as component_code,
        NULL::numeric as qty_mt,
        NULL::numeric as amount_usd,
        NULL::integer as tenor_months,
        'valuation' as data_type
      FROM valuations
      WHERE as_of_date = $1 AND scope = 'TOTAL'
      
      UNION ALL
      
      -- components
      SELECT 
        as_of_date,
        period_type,
        NULL::numeric as net_position_mt,
        NULL::numeric as mtm_value_usd,
        NULL::integer as ref_tenor_months,
        NULL::numeric as futures_price_usd,
        component_code,
        qty_mt,
        amount_usd,
        NULL::integer as tenor_months,
        'component' as data_type
      FROM position_components
      WHERE as_of_date = $1 AND scope = 'TOTAL'
      
      UNION ALL
      
      -- curve
      SELECT 
        as_of_date,
        NULL::varchar(1) as period_type,
        NULL::numeric as net_position_mt,
        NULL::numeric as mtm_value_usd,
        NULL::integer as ref_tenor_months,
        futures_price_usd,
        NULL::text as component_code,
        NULL::numeric as qty_mt,
        NULL::numeric as amount_usd,
        tenor_months,
        'curve' as data_type
      FROM futures_curve
      WHERE as_of_date = $1
      `,
      [asOf]
    )

    // データを整形
    const valuation = result.rows.find((r: any) => r.data_type === 'valuation')
    const components = result.rows.filter((r: any) => r.data_type === 'component')
    const curve = result.rows.filter((r: any) => r.data_type === 'curve')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        asOf,
        valuation: valuation
          ? {
              netPositionMt: parseFloat(valuation.net_position_mt),
              mtmValueUsd: parseFloat(valuation.mtm_value_usd),
              refTenorMonths: valuation.ref_tenor_months,
              futuresPriceUsd: valuation.futures_price_usd
                ? parseFloat(valuation.futures_price_usd)
                : null,
            }
          : null,
        components: components.map((c: any) => ({
          componentCode: c.component_code,
          qtyMt: c.qty_mt ? parseFloat(c.qty_mt) : null,
          amountUsd: c.amount_usd ? parseFloat(c.amount_usd) : null,
        })),
        curve: curve
          .sort((a: any, b: any) => a.tenor_months - b.tenor_months)
          .map((c: any) => ({
            tenorMonths: c.tenor_months,
            futuresPriceUsd: parseFloat(c.futures_price_usd),
          })),
      }),
    }
  } catch (error: any) {
    console.error('Error:', error)
    const errorMessage = error.message || 'Internal server error'
    const isDbError = errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { 
          code: 'INTERNAL_ERROR', 
          message: isDbError 
            ? 'データベースに接続できません。PostgreSQLが起動しているか確認してください。'
            : errorMessage 
        },
      }),
    }
  }
}

async function handleSeries(event: APIGatewayProxyEvent, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const metric = event.queryStringParameters?.metric
    const from = event.queryStringParameters?.from
    const to = event.queryStringParameters?.to
    const asOf = event.queryStringParameters?.asOf

    if (!metric || !from || !to || !asOf) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'BAD_REQUEST', message: 'metric, from, to, and asOf are required' },
        }),
      }
    }

    // 時系列データを取得
    // TODO: 実際のクエリを実装
    const result = await query(
      `
      SELECT 
        as_of_date as date,
        period_type,
        position_qty_mt as value
      FROM valuations
      WHERE as_of_date >= $1 AND as_of_date <= $2 AND as_of_date <= $3
        AND scope = 'TOTAL'
        AND period_type = 'D'
      ORDER BY as_of_date ASC
      `,
      [from, to, asOf]
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        metric,
        data: result.rows.map((r: any) => ({
          date: r.date,
          value: r.value ? parseFloat(r.value) : null,
          periodType: r.period_type,
        })),
      }),
    }
  } catch (error: any) {
    console.error('Error:', error)
    const errorMessage = error.message || 'Internal server error'
    const isDbError = errorMessage.includes('connect') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { 
          code: 'INTERNAL_ERROR', 
          message: isDbError 
            ? 'データベースに接続できません。PostgreSQLが起動しているか確認してください。'
            : errorMessage 
        },
      }),
    }
  }
}
