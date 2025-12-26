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
    const limit = parseInt(params.limit || '100')

    let sql = 'SELECT * FROM deliveries WHERE 1=1'
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

    sql += ` ORDER BY period_date DESC, created_at DESC LIMIT $${paramIndex}`
    queryParams.push(limit)

    const result = await query(sql, queryParams)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        deliveries: result.rows.map((row: any) => ({
          deliveryId: row.delivery_id,
          linkedTradeId: row.linked_trade_id,
          periodType: row.period_type,
          periodDate: row.period_date,
          deliveredQuantityMt: parseFloat(row.delivered_quantity_mt),
          bookingAmountUsd: parseFloat(row.booking_amount_usd),
          status: row.status,
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



