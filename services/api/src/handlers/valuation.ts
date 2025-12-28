import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { query } from '../lib/db'

interface Trade {
  id: number
  trade_date: string
  contract_month: string
  buy_sell: 'BUY' | 'SELL'
  quantity_mt: number
  price_usd: number
  counterparty: string | null
}

interface FuturesCurvePoint {
  tenor_months: number
  futures_price_usd: number
}

// contract_month ('2026-M03') を Date に変換
function parseContractMonth(contractMonth: string): Date {
  const match = contractMonth.match(/(\d{4})-M(\d{2})/)
  if (!match) {
    throw new Error(`Invalid contract_month format: ${contractMonth}`)
  }
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1 // JavaScriptの月は0始まり
  return new Date(year, month, 1)
}

// valuation_date から contract_month までのテナー（月数）を計算
function calculateTenorMonths(valuationDate: Date, contractMonth: string): number {
  const deliveryDate = parseContractMonth(contractMonth)
  const monthsDiff = (deliveryDate.getFullYear() - valuationDate.getFullYear()) * 12 +
    (deliveryDate.getMonth() - valuationDate.getMonth())
  return Math.max(0, monthsDiff)
}

// 受け渡し済みかどうかを判定
function isDelivered(trade: Trade, valuationDate: Date): boolean {
  const deliveryDate = parseContractMonth(trade.contract_month)
  // 受け渡し月の初日がvaluation_dateより前なら受け渡し済み
  return deliveryDate <= valuationDate
}

// 先物カーブ価格を取得
async function getFuturesPrice(
  valuationDate: Date,
  tenorMonths: number
): Promise<number | null> {
  const result = await query(
    `SELECT futures_price_usd 
     FROM futures_curve 
     WHERE as_of_date = $1 AND tenor_months = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [valuationDate.toISOString().split('T')[0], tenorMonths]
  )

  if (result.rows.length === 0) {
    return null
  }

  return parseFloat(result.rows[0].futures_price_usd)
}

// 未実現損益を計算
function calculateUnrealizedPnL(
  trade: Trade,
  currentPrice: number
): number {
  const sign = trade.buy_sell === 'BUY' ? 1 : -1
  return sign * (currentPrice - trade.price_usd) * trade.quantity_mt
}

// 月次評価の前月評価を取得
async function getPreviousMonthPnL(yearMonth: string): Promise<number> {
  const [year, month] = yearMonth.split('-').map(Number)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevYearMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

  const result = await query(
    `SELECT net_pnl FROM monthly_pnl WHERE year_month = $1 ORDER BY valuation_date DESC LIMIT 1`,
    [prevYearMonth]
  )

  if (result.rows.length === 0) {
    return 0
  }

  return parseFloat(result.rows[0].net_pnl)
}

// 月次評価を計算
export async function handleCalculateMonthly(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const valuationDateStr = body.valuationDate || new Date().toISOString().split('T')[0]
    const valuationDate = new Date(valuationDateStr)

    // 年月を取得（'2025-03'形式）
    const yearMonth = `${valuationDate.getFullYear()}-${String(valuationDate.getMonth() + 1).padStart(2, '0')}`

    // 既に評価済みかチェック
    const existingResult = await query(
      `SELECT * FROM monthly_pnl WHERE year_month = $1 AND valuation_date = $2`,
      [yearMonth, valuationDateStr]
    )

    if (existingResult.rows.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'DUPLICATE_VALUATION', message: '既に評価済みです' },
        }),
      }
    }

    // 未受け渡しポジションを取得
    const tradesResult = await query(
      `SELECT * FROM trades WHERE trade_date <= $1 ORDER BY trade_date`,
      [valuationDateStr]
    )

    const trades: Trade[] = tradesResult.rows.map((row: any) => ({
      id: row.id,
      trade_date: row.trade_date,
      contract_month: row.contract_month,
      buy_sell: row.buy_sell,
      quantity_mt: parseFloat(row.quantity_mt),
      price_usd: parseFloat(row.price_usd),
      counterparty: row.counterparty,
    }))

    // 未受け渡しポジションをフィルタ
    const openPositions = trades.filter(trade => !isDelivered(trade, valuationDate))

    if (openPositions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            valuationDate: valuationDateStr,
            yearMonth,
            unrealizedPnl: 0,
            reversalPnl: 0,
            netPnl: 0,
            positionCount: 0,
          },
          message: '評価対象ポジションがありません',
        }),
      }
    }

    // 各ポジションの未実現損益を計算
    let totalUnrealizedPnL = 0
    const missingPrices: string[] = []

    for (const trade of openPositions) {
      const tenorMonths = calculateTenorMonths(valuationDate, trade.contract_month)
      const currentPrice = await getFuturesPrice(valuationDate, tenorMonths)

      if (currentPrice === null) {
        missingPrices.push(`${trade.contract_month} (${tenorMonths}M)`)
        continue
      }

      const pnl = calculateUnrealizedPnL(trade, currentPrice)
      totalUnrealizedPnL += pnl
    }

    if (missingPrices.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'MISSING_CURVE_DATA',
            message: `先物カーブデータが不足しています: ${missingPrices.join(', ')}`,
          },
        }),
      }
    }

    // 前月評価の戻し処理
    const previousPnL = await getPreviousMonthPnL(yearMonth)
    const reversalPnL = -previousPnL
    const netPnL = reversalPnL + totalUnrealizedPnL

    // DBに保存
    const insertResult = await query(
      `INSERT INTO monthly_pnl (valuation_date, year_month, unrealized_pnl, reversal_pnl, net_pnl, position_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [valuationDateStr, yearMonth, totalUnrealizedPnL, reversalPnL, netPnL, openPositions.length]
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: insertResult.rows[0].id,
          valuationDate: insertResult.rows[0].valuation_date,
          yearMonth: insertResult.rows[0].year_month,
          unrealizedPnl: parseFloat(insertResult.rows[0].unrealized_pnl),
          reversalPnl: insertResult.rows[0].reversal_pnl ? parseFloat(insertResult.rows[0].reversal_pnl) : null,
          netPnl: parseFloat(insertResult.rows[0].net_pnl),
          positionCount: insertResult.rows[0].position_count,
          createdAt: insertResult.rows[0].created_at,
        },
        message: '月次評価が完了しました',
      }),
    }
  } catch (error: any) {
    console.error('Monthly Valuation Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

// 日次評価を計算
export async function handleCalculateDaily(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}')
    const valuationDateStr = body.valuationDate || new Date().toISOString().split('T')[0]
    const valuationDate = new Date(valuationDateStr)

    // 既に評価済みかチェック
    const existingResult = await query(
      `SELECT * FROM daily_pnl WHERE valuation_date = $1`,
      [valuationDateStr]
    )

    if (existingResult.rows.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'DUPLICATE_VALUATION', message: '既に評価済みです' },
        }),
      }
    }

    // 未受け渡しポジションを取得
    const tradesResult = await query(
      `SELECT * FROM trades WHERE trade_date <= $1 ORDER BY trade_date`,
      [valuationDateStr]
    )

    const trades: Trade[] = tradesResult.rows.map((row: any) => ({
      id: row.id,
      trade_date: row.trade_date,
      contract_month: row.contract_month,
      buy_sell: row.buy_sell,
      quantity_mt: parseFloat(row.quantity_mt),
      price_usd: parseFloat(row.price_usd),
      counterparty: row.counterparty,
    }))

    // 未受け渡しポジションをフィルタ
    const openPositions = trades.filter(trade => !isDelivered(trade, valuationDate))

    if (openPositions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            valuationDate: valuationDateStr,
            realizedPnl: 0,
            unrealizedPnl: 0,
            totalPnl: 0,
            positionCount: 0,
          },
          message: '評価対象ポジションがありません',
        }),
      }
    }

    // 各ポジションの未実現損益を計算
    let totalUnrealizedPnL = 0
    const missingPrices: string[] = []

    for (const trade of openPositions) {
      const tenorMonths = calculateTenorMonths(valuationDate, trade.contract_month)
      const currentPrice = await getFuturesPrice(valuationDate, tenorMonths)

      if (currentPrice === null) {
        missingPrices.push(`${trade.contract_month} (${tenorMonths}M)`)
        continue
      }

      const pnl = calculateUnrealizedPnL(trade, currentPrice)
      totalUnrealizedPnL += pnl
    }

    if (missingPrices.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: {
            code: 'MISSING_CURVE_DATA',
            message: `先物カーブデータが不足しています: ${missingPrices.join(', ')}`,
          },
        }),
      }
    }

    // 実現損益は0（将来実装）
    const realizedPnL = 0
    const totalPnL = realizedPnL + totalUnrealizedPnL

    // DBに保存
    const insertResult = await query(
      `INSERT INTO daily_pnl (valuation_date, realized_pnl, unrealized_pnl, total_pnl, position_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [valuationDateStr, realizedPnL, totalUnrealizedPnL, totalPnL, openPositions.length]
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          id: insertResult.rows[0].id,
          valuationDate: insertResult.rows[0].valuation_date,
          realizedPnl: parseFloat(insertResult.rows[0].realized_pnl),
          unrealizedPnl: parseFloat(insertResult.rows[0].unrealized_pnl),
          totalPnl: parseFloat(insertResult.rows[0].total_pnl),
          positionCount: insertResult.rows[0].position_count,
          createdAt: insertResult.rows[0].created_at,
        },
        message: '日次評価が完了しました',
      }),
    }
  } catch (error: any) {
    console.error('Daily Valuation Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

// 月次損益を取得
export async function handleGetMonthly(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const yearMonth = event.queryStringParameters?.yearMonth

    let sql = 'SELECT * FROM monthly_pnl WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (yearMonth) {
      sql += ` AND year_month = $${paramIndex}`
      params.push(yearMonth)
      paramIndex++
    }

    sql += ' ORDER BY year_month DESC, valuation_date DESC'

    const result = await query(sql, params)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: result.rows.map((row: any) => ({
          id: row.id,
          valuationDate: row.valuation_date,
          yearMonth: row.year_month,
          unrealizedPnl: parseFloat(row.unrealized_pnl),
          reversalPnl: row.reversal_pnl ? parseFloat(row.reversal_pnl) : null,
          netPnl: parseFloat(row.net_pnl),
          positionCount: row.position_count,
          createdAt: row.created_at,
        })),
      }),
    }
  } catch (error: any) {
    console.error('Get Monthly PnL Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

// 日次損益を取得
export async function handleGetDaily(
  event: APIGatewayProxyEvent,
  headers: any
): Promise<APIGatewayProxyResult> {
  try {
    const startDate = event.queryStringParameters?.startDate
    const endDate = event.queryStringParameters?.endDate

    let sql = 'SELECT * FROM daily_pnl WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (startDate) {
      sql += ` AND valuation_date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      sql += ` AND valuation_date <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }

    sql += ' ORDER BY valuation_date DESC'

    const result = await query(sql, params)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: result.rows.map((row: any) => ({
          id: row.id,
          valuationDate: row.valuation_date,
          realizedPnl: parseFloat(row.realized_pnl),
          unrealizedPnl: parseFloat(row.unrealized_pnl),
          totalPnl: parseFloat(row.total_pnl),
          positionCount: row.position_count,
          createdAt: row.created_at,
        })),
      }),
    }
  } catch (error: any) {
    console.error('Get Daily PnL Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

// メインハンドラー
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  const path = event.path || (event as any).rawPath

  if (path === '/v1/valuation/calculate') {
    const body = JSON.parse(event.body || '{}')
    if (body.type === 'monthly') {
      return handleCalculateMonthly(event, headers)
    } else if (body.type === 'daily') {
      return handleCalculateDaily(event, headers)
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: { code: 'INVALID_TYPE', message: 'type must be "monthly" or "daily"' },
        }),
      }
    }
  }

  if (path === '/v1/valuation/monthly') {
    return handleGetMonthly(event, headers)
  }

  if (path === '/v1/valuation/daily') {
    return handleGetDaily(event, headers)
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    }),
  }
}

