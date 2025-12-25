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
    const from = params.from
    const to = params.to
    const periodType = params.periodType
    const instrumentType = params.instrumentType
    const tenorMonths = params.tenorMonths
    const limit = parseInt(params.limit || '100')

    let sql = 'SELECT * FROM trades WHERE 1=1'
    const queryParams: any[] = []
    let paramIndex = 1

    if (from) {
      sql += ` AND period_date >= $${paramIndex}`
      queryParams.push(from)
      paramIndex++
    }

    if (to) {
      sql += ` AND period_date <= $${paramIndex}`
      queryParams.push(to)
      paramIndex++
    }

    if (periodType) {
      sql += ` AND period_type = $${paramIndex}`
      queryParams.push(periodType)
      paramIndex++
    }

    if (instrumentType) {
      sql += ` AND instrument_type = $${paramIndex}`
      queryParams.push(instrumentType)
      paramIndex++
    }

    if (tenorMonths !== undefined) {
      sql += ` AND tenor_months = $${paramIndex}`
      queryParams.push(parseInt(tenorMonths))
      paramIndex++
    }

    sql += ` ORDER BY period_date DESC, created_at DESC LIMIT $${paramIndex}`
    queryParams.push(limit)

    const result = await query(sql, queryParams)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        trades: result.rows.map((row: any) => ({
          tradeId: row.trade_id,
          periodType: row.period_type,
          periodDate: row.period_date,
          buySell: row.buy_sell,
          instrumentType: row.instrument_type,
          tenorMonths: row.tenor_months,
          quantityMt: parseFloat(row.quantity_mt),
          tradePriceUsd: parseFloat(row.trade_price_usd),
          tradeAmountUsd: row.trade_amount_usd ? parseFloat(row.trade_amount_usd) : null,
          notes: row.notes,
          createdAt: row.created_at,
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


