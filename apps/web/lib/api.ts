const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

export interface DashboardData {
  asOf: string
  valuation: {
    netPositionMt: number
    mtmValueUsd: number
    refTenorMonths: number | null
    futuresPriceUsd: number | null
  } | null
  components: Array<{
    componentCode: string
    qtyMt: number | null
    amountUsd: number | null
  }>
  curve: Array<{
    tenorMonths: number
    futuresPriceUsd: number
  }>
}

export interface SeriesData {
  metric: string
  from: string
  to: string
  data: Array<{
    date: string
    periodType: string
    value: number
  }>
}

export interface Trade {
  tradeId: string
  periodType: string
  periodDate: string
  buySell: string
  instrumentType: string
  tenorMonths: number | null
  quantityMt: number
  tradePriceUsd: number
  tradeAmountUsd: number | null
  notes: string | null
  createdAt: string
}

export interface Delivery {
  deliveryId: string
  linkedTradeId: string | null
  periodType: string
  periodDate: string
  deliveredQuantityMt: number
  bookingAmountUsd: number
  status: string | null
  notes: string | null
  createdAt: string
}

export interface PositionComponent {
  componentCode: string
  qtyMt: number | null
  amountUsd: number | null
  notes: string | null
}

export interface CurvePoint {
  tenorMonths: number
  futuresPriceUsd: number
  priceSource: string | null
}

export async function getDashboard(asOf: string): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/v1/dashboard?asOf=${asOf}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`)
  }
  return response.json()
}

export async function getSeries(
  metric: string,
  from: string,
  to: string
): Promise<SeriesData> {
  const response = await fetch(
    `${API_BASE_URL}/v1/series?metric=${metric}&from=${from}&to=${to}`
  )
  if (!response.ok) {
    throw new Error(`Failed to fetch series: ${response.statusText}`)
  }
  return response.json()
}

export async function getPositions(asOf: string): Promise<{
  asOf: string
  components: PositionComponent[]
}> {
  const response = await fetch(`${API_BASE_URL}/v1/positions?asOf=${asOf}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch positions: ${response.statusText}`)
  }
  return response.json()
}

export async function getTrades(params: {
  from?: string
  to?: string
  periodType?: string
  instrumentType?: string
  tenorMonths?: number
  limit?: number
}): Promise<{ trades: Trade[] }> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.append("from", params.from)
  if (params.to) searchParams.append("to", params.to)
  if (params.periodType) searchParams.append("periodType", params.periodType)
  if (params.instrumentType) searchParams.append("instrumentType", params.instrumentType)
  if (params.tenorMonths !== undefined) searchParams.append("tenorMonths", String(params.tenorMonths))
  if (params.limit) searchParams.append("limit", String(params.limit))

  const response = await fetch(`${API_BASE_URL}/v1/trades?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch trades: ${response.statusText}`)
  }
  return response.json()
}

export async function getDeliveries(params: {
  from?: string
  to?: string
  periodType?: string
  limit?: number
}): Promise<{ deliveries: Delivery[] }> {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.append("from", params.from)
  if (params.to) searchParams.append("to", params.to)
  if (params.periodType) searchParams.append("periodType", params.periodType)
  if (params.limit) searchParams.append("limit", String(params.limit))

  const response = await fetch(`${API_BASE_URL}/v1/deliveries?${searchParams.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch deliveries: ${response.statusText}`)
  }
  return response.json()
}

export async function getCurve(asOf: string): Promise<{
  asOf: string
  curve: CurvePoint[]
}> {
  const response = await fetch(`${API_BASE_URL}/v1/curve?asOf=${asOf}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch curve: ${response.statusText}`)
  }
  return response.json()
}

export async function seedData(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/admin/seed`, {
    method: "POST",
  })
  if (!response.ok) {
    throw new Error(`Failed to seed data: ${response.statusText}`)
  }
}

