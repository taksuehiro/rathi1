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
    await query('DELETE FROM limit_violations')
    await query('DELETE FROM position_limits')

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

    // マスターデータ（架空の会社名15社）
    const customers = [
      { id: 'CUST001', name: 'Toyoda Manufacturing Co.' },
      { id: 'CUST002', name: 'Handa Motors Ltd.' },
      { id: 'CUST003', name: 'Nishin Automotive Inc.' },
      { id: 'CUST004', name: 'Panasonic Electronics Corp.' },
      { id: 'CUST005', name: 'Soni Technologies Ltd.' },
      { id: 'CUST006', name: 'Mitsubishii Heavy Industries' },
      { id: 'CUST007', name: 'Hitashi Systems Co.' },
      { id: 'CUST008', name: 'Tosheba Electronics' },
      { id: 'CUST009', name: 'Fujitzu Computing Ltd.' },
      { id: 'CUST010', name: 'NEC Nippon Electric' },
      { id: 'CUST011', name: 'Shapp Corporation' },
      { id: 'CUST012', name: 'Mazuda Motor Company' },
      { id: 'CUST013', name: 'Suburu Automotive' },
      { id: 'CUST014', name: 'Suzuky Motors Ltd.' },
      { id: 'CUST015', name: 'Yamaha Industrial Co.' },
    ]

    // 契約月リスト
    const contractMonths = [
      '2026-M03', '2026-M06', '2026-M09', '2026-M12',
      '2027-M03', '2027-M06', '2027-M09', '2027-M12',
    ]

    // 取引データ生成
    console.log('Generating trade data...')
    const endDate = new Date('2026-07-05')
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 12) // 過去12ヶ月

    const tradeRecords: any[] = []
    
    // 600件の取引を生成
    for (let i = 0; i < 600; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const tradeDate = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      )
      const contractMonth = contractMonths[Math.floor(Math.random() * contractMonths.length)]
      const buySell = Math.random() > 0.5 ? 'BUY' : 'SELL'
      const volumeTons = Math.floor(Math.random() * 90) + 10 // 10-100トン
      const priceUsd = Math.floor(Math.random() * 2000) + 27000 // 27000-29000 USD

      tradeRecords.push({
        trade_date: tradeDate.toISOString().split('T')[0],
        contract_month: contractMonth,
        buy_sell: buySell,
        quantity_mt: volumeTons,
        price_usd: priceUsd,
        counterparty: customer.id,
      })
    }

    // 日付順にソート
    tradeRecords.sort((a, b) => a.trade_date.localeCompare(b.trade_date))

    // 取引データを挿入
    for (const record of tradeRecords) {
      await query(
        `INSERT INTO trades (trade_date, contract_month, buy_sell, quantity_mt, price_usd, counterparty)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.trade_date,
          record.contract_month,
          record.buy_sell,
          record.quantity_mt,
          record.price_usd,
          record.counterparty,
        ]
      )
    }
    console.log(`✓ Generated ${tradeRecords.length} trade records`)

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

    // 顧客リミット生成
    console.log('Generating customer limits...')
    for (const customer of customers) {
      const limitValue = Math.floor(Math.random() * 300) + 200 // 200-500トン
      await query(
        `INSERT INTO position_limits (limit_type, entity_id, limit_value, warning_threshold, alert_threshold)
         VALUES ('customer_exposure', $1, $2, 75, 90)`,
        [customer.id, limitValue]
      )
    }
    console.log(`✓ Generated ${customers.length} customer limits`)

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

