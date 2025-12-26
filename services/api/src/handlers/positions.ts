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

    const result = await query(
      `SELECT * FROM position_components
       WHERE as_of_date = $1 AND scope = 'TOTAL'
       ORDER BY component_code`,
      [asOf]
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        asOf,
        components: result.rows.map((row: any) => ({
          componentCode: row.component_code,
          qtyMt: row.qty_mt ? parseFloat(row.qty_mt) : null,
          amountUsd: row.amount_usd ? parseFloat(row.amount_usd) : null,
          notes: row.notes,
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



