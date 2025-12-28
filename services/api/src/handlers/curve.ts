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
      `SELECT * FROM futures_curve
       WHERE as_of_date = $1
       ORDER BY tenor_months`,
      [asOf]
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        asOf,
        curve: result.rows.map((row: any) => ({
          tenorMonths: row.tenor_months,
          futuresPriceUsd: parseFloat(row.futures_price_usd),
          priceSource: row.price_source,
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






