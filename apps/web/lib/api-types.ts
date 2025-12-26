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

export interface CustomerData {
  asOf: string
  summary: {
    totalCustomers: number
    aCustomers: { count: number; revenueShare: number }
    bCustomers: { count: number; revenueShare: number }
    top5Concentration: number
  }
  abcAnalysis: Array<{
    category: 'A' | 'B' | 'C'
    revenueShare: number
    customerCount: number
  }>
  byIndustry: Array<{
    industry: string
    revenueShare: number
    customerCount: number
  }>
  byRegion: Array<{
    region: string
    revenueShare: number
    customerCount: number
  }>
  riskConcentration: Array<{
    customerName: string
    revenueShare: number
  }>
  customers: Array<{
    customerName: string
    industry: string
    region: string
    totalQuantityMt: number
    totalAmountUsd: number
    tradeCount: number
    abcCategory: 'A' | 'B' | 'C'
    riskLevel: 'High' | 'Medium' | 'Low'
    lastTradeDate: string
  }>
}



