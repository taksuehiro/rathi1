import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: process.env.DB_NAME || 'rathi_tin',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'localpassword',
})

// ダミーデータ生成
async function generateDummyData() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // 既存データを削除
    await client.query('DELETE FROM position_components')
    await client.query('DELETE FROM valuations')
    await client.query('DELETE FROM futures_curve')
    await client.query('DELETE FROM deliveries')
    await client.query('DELETE FROM trades')

    // 月次データ（2026-01-31 〜 2026-06-30）
    const monthlyDates = [
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]

    // 日次データ（2026-07-01 〜 2026-07-05）
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
      const date = new Date(dateStr)

      // futures_curve: tenor 0〜6
      for (let tenor = 0; tenor <= 6; tenor++) {
        const basePrice = 28000 - tenor * 50 // 緩やかな逆転
        await client.query(
          `INSERT INTO futures_curve (as_of_date, tenor_months, futures_price_usd, price_source)
           VALUES ($1, $2, $3, $4)`,
          [dateStr, tenor, basePrice, 'LME']
        )
      }

      // ダミー取引データ
      const trades = [
        { buy_sell: 'B', instrument_type: 'PHYSICAL', quantity: 100, price: 27900 },
        { buy_sell: 'S', instrument_type: 'PHYSICAL', quantity: -50, price: 28100 },
        { buy_sell: 'B', instrument_type: 'FUTURES', tenor: 3, quantity: 80, price: 27850 },
        { buy_sell: 'S', instrument_type: 'FUTURES', tenor: 1, quantity: -30, price: 28000 },
      ]

      for (const trade of trades) {
        await client.query(
          `INSERT INTO trades (period_type, period_date, buy_sell, instrument_type, tenor_months, quantity_mt, trade_price_usd, trade_amount_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            periodType,
            dateStr,
            trade.buy_sell,
            trade.instrument_type,
            trade.tenor || null,
            trade.quantity,
            trade.price,
            trade.quantity * trade.price,
          ]
        )
      }

      // position_components: 全component_code
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
        await client.query(
          `INSERT INTO position_components (as_of_date, period_type, scope, component_code, qty_mt, amount_usd)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (as_of_date, scope, component_code) DO UPDATE
           SET qty_mt = EXCLUDED.qty_mt, amount_usd = EXCLUDED.amount_usd`,
          [dateStr, periodType, 'TOTAL', comp.code, comp.qty, comp.amount]
        )
      }

      // valuations: scope=TOTAL
      const netPosition = components
        .filter((c) => c.qty !== null)
        .reduce((sum, c) => sum + (c.qty || 0), 0)
      const mtm = netPosition * 28000 // 簡易計算

      await client.query(
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

    await client.query('COMMIT')
    console.log('✅ ダミーデータの生成が完了しました')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ エラー:', error)
    throw error
  } finally {
    client.release()
  }
}

generateDummyData()
  .then(() => {
    console.log('完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('失敗:', error)
    process.exit(1)
  })
  .finally(() => {
    pool.end()
  })



