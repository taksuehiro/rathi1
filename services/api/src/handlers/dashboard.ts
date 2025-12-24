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
      WITH valuation_data AS (
        SELECT 
          'valuation' as data_type,
          as_of_date,
          period_type,
          position_qty_mt as net_position_mt,
          mtm_value_usd,
          ref_tenor_months,
          futures_price_usd
        FROM valuations
        WHERE as_of_date = $1 AND scope = 'TOTAL'
      ),
      components_data AS (
        SELECT 
          'component' as data_type,
          as_of_date,
          period_type,
          component_code,
          qty_mt,
          amount_usd
        FROM position_components
        WHERE as_of_date = $1 AND scope = 'TOTAL'
      ),
      curve_data AS (
        SELECT 
          'curve' as data_type,
          as_of_date,
          tenor_months,
          futures_price_usd
        FROM futures_curve
        WHERE as_of_date = $1
      )
      SELECT * FROM valuation_data
      UNION ALL
      SELECT * FROM components_data
      UNION ALL
      SELECT * FROM curve_data
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

