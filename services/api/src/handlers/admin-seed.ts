import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { query } from '../lib/db'

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // 既存データを削除
    await query('DELETE FROM position_components')
    await query('DELETE FROM valuations')
    await query('DELETE FROM futures_curve')
    await query('DELETE FROM deliveries')
    await query('DELETE FROM trades')

    // シードスクリプトを実行（Lambda環境では直接実行できないため、ここでは簡易実装）
    // 実際の実装では、seed.tsのロジックをここに組み込むか、別の方法を検討
    const monthlyDates = [
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]

    const dailyDates = [
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]

    const allDates = [...monthlyDates, ...dailyDates]

    for (const dateStr of allDates) {
      const periodType = dailyDates.includes(dateStr) ? 'D' : 'M'

      // futures_curve
      for (let tenor = 0; tenor <= 6; tenor++) {
        const basePrice = 28000 - tenor * 50
        await query(
          `INSERT INTO futures_curve (as_of_date, tenor_months, futures_price_usd, price_source)
           VALUES ($1, $2, $3, $4)`,
          [dateStr, tenor, basePrice, 'LME']
        )
      }

      // position_components
      const components = [
        { code: 'INVENTORY_ON_HAND', qty: 150, amount: null },
        { code: 'IN_TRANSIT', qty: 50, amount: null },
        { code: 'OPEN_PURCHASE', qty: 200, amount: null },
        { code: 'OPEN_SALES', qty: -100, amount: null },
        { code: 'FUTURES_LME_NET', qty: 50, amount: null },
        { code: 'OTC_NET', qty: 0, amount: null },
        { code: 'LOAN_OUTSTANDING_USD', qty: null, amount: 5000000 },
      ]

      for (const comp of components) {
        await query(
          `INSERT INTO position_components (as_of_date, period_type, scope, component_code, qty_mt, amount_usd)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (as_of_date, scope, component_code) DO UPDATE
           SET qty_mt = EXCLUDED.qty_mt, amount_usd = EXCLUDED.amount_usd`,
          [dateStr, periodType, 'TOTAL', comp.code, comp.qty, comp.amount]
        )
      }

      // valuations
      const netPosition = components
        .filter((c) => c.qty !== null)
        .reduce((sum, c) => sum + (c.qty || 0), 0)
      const mtm = netPosition * 28000

      await query(
        `INSERT INTO valuations (as_of_date, period_type, scope, position_qty_mt, ref_tenor_months, futures_price_usd, mtm_value_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (as_of_date, scope) DO UPDATE
         SET position_qty_mt = EXCLUDED.position_qty_mt,
             ref_tenor_months = EXCLUDED.ref_tenor_months,
             futures_price_usd = EXCLUDED.futures_price_usd,
             mtm_value_usd = EXCLUDED.mtm_value_usd`,
        [dateStr, periodType, 'TOTAL', netPosition, 0, 28000, mtm]
      )
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Seed data generated successfully',
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

