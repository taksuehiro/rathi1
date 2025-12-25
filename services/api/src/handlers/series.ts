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
    const params = event.queryStringParameters || {}
    const metric = params.metric // netPositionMt, mtmValueUsd, loanOutstandingUsd
    const from = params.from
    const to = params.to

    if (!metric || !from || !to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'metric, from, and to are required',
          },
        }),
      }
    }

    let sql = ''
    if (metric === 'netPositionMt' || metric === 'mtmValueUsd') {
      sql = `
        SELECT 
          as_of_date,
          period_type,
          ${metric === 'netPositionMt' ? 'position_qty_mt' : 'mtm_value_usd'} as value
        FROM valuations
        WHERE as_of_date >= $1 AND as_of_date <= $2 AND scope = 'TOTAL'
        ORDER BY as_of_date
      `
    } else if (metric === 'loanOutstandingUsd') {
      sql = `
        SELECT 
          as_of_date,
          period_type,
          amount_usd as value
        FROM position_components
        WHERE as_of_date >= $1 AND as_of_date <= $2 
          AND scope = 'TOTAL' 
          AND component_code = 'LOAN_OUTSTANDING_USD'
        ORDER BY as_of_date
      `
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid metric. Must be netPositionMt, mtmValueUsd, or loanOutstandingUsd',
          },
        }),
      }
    }

    const result = await query(sql, [from, to])

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        metric,
        from,
        to,
        data: result.rows.map((row: any) => ({
          date: row.as_of_date,
          periodType: row.period_type,
          value: parseFloat(row.value),
        })),
      }),
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


