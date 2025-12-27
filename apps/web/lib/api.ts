import type { LimitsResponse, LimitsStatusResponse } from './api-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = {
  async getDashboard(asOf: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/dashboard?asOf=${asOf}`)
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to fetch dashboard: ${res.status} ${res.statusText} - ${errorText}`)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async getSeries(metric: string, from: string, to: string, asOf: string) {
    const res = await fetch(
      `${API_BASE_URL}/v1/series?metric=${metric}&from=${from}&to=${to}&asOf=${asOf}`
    )
    if (!res.ok) throw new Error('Failed to fetch series')
    return res.json()
  },

  async getPositions(asOf: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/positions?asOf=${asOf}`)
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `Failed to fetch positions: ${res.status} ${res.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message
          }
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async getTrades(params: {
    asOf?: string
    from?: string
    to?: string
    periodType?: string
    instrumentType?: string
    tenorMonths?: number
    limit?: number
  }) {
    try {
      const query = new URLSearchParams(params as any).toString()
      const res = await fetch(`${API_BASE_URL}/v1/trades?${query}`)
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `Failed to fetch trades: ${res.status} ${res.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message
          }
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async getCurve(asOf: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/curve?asOf=${asOf}`)
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `Failed to fetch curve: ${res.status} ${res.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message
          }
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async getDeliveries(params: {
    asOf?: string
    from?: string
    to?: string
    periodType?: string
    limit?: number
  }) {
    try {
      const query = new URLSearchParams(params as any).toString()
      const res = await fetch(`${API_BASE_URL}/v1/deliveries?${query}`)
      if (!res.ok) {
        const errorText = await res.text()
        let errorMessage = `Failed to fetch deliveries: ${res.status} ${res.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          if (errorJson.error?.message) {
            errorMessage = errorJson.error.message
          }
        } catch {
          if (errorText) {
            errorMessage += ` - ${errorText}`
          }
        }
        throw new Error(errorMessage)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async seedData() {
    const res = await fetch(`${API_BASE_URL}/v1/admin/seed`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to seed data')
  },

  async explainDashboard(dashboardData: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/explain/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboardData),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Failed to explain dashboard: ${res.status} ${res.statusText} - ${errorText}`)
      }
      return res.json()
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },

  async getCustomers(asOf: string) {
    try {
      // TODO: 実際のAPIエンドポイントが実装されたら置き換え
      // const res = await fetch(`${API_BASE_URL}/v1/customers?asOf=${asOf}`)
      // if (!res.ok) throw new Error('Failed to fetch customers')
      // return res.json()
      
      // モックデータ（開発用）
      return getMockCustomerData(asOf)
    } catch (err: any) {
      if (err.message.includes('fetch')) {
        throw new Error(`APIサーバーに接続できません。APIサーバーが起動しているか確認してください: ${API_BASE_URL}`)
      }
      throw err
    }
  },
}

// リミット関連のAPI関数
export async function getLimits(): Promise<LimitsResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/limits`)
  if (!response.ok) throw new Error('Failed to fetch limits')
  return response.json()
}

export async function getLimitsStatus(asOf: string): Promise<LimitsStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/limits/status?asOf=${asOf}`)
  if (!response.ok) throw new Error('Failed to fetch limits status')
  return response.json()
}

// モックデータ（開発用）
function getMockCustomerData(asOf: string) {
  return {
    asOf,
    summary: {
      totalCustomers: 40,
      aCustomers: { count: 5, revenueShare: 70 },
      bCustomers: { count: 12, revenueShare: 22 },
      top5Concentration: 68.9,
    },
    abcAnalysis: [
      { category: 'A' as const, revenueShare: 70, customerCount: 5 },
      { category: 'B' as const, revenueShare: 22, customerCount: 12 },
      { category: 'C' as const, revenueShare: 8, customerCount: 23 },
    ],
    byIndustry: [
      { industry: 'Electronics', revenueShare: 45, customerCount: 12 },
      { industry: 'Automotive', revenueShare: 28, customerCount: 10 },
      { industry: 'Construction', revenueShare: 18, customerCount: 11 },
      { industry: 'Energy', revenueShare: 9, customerCount: 7 },
    ],
    byRegion: [
      { region: 'Asia Pacific', revenueShare: 52, customerCount: 22 },
      { region: 'North America', revenueShare: 28, customerCount: 10 },
      { region: 'Europe', revenueShare: 15, customerCount: 6 },
      { region: 'Other', revenueShare: 5, customerCount: 2 },
    ],
    riskConcentration: [
      { customerName: 'TechCorp Global', revenueShare: 18.5 },
      { customerName: 'AutoMotive Inc', revenueShare: 15.2 },
      { customerName: 'ElectroSystems Ltd', revenueShare: 14.8 },
      { customerName: 'BuildPro Industries', revenueShare: 12.1 },
      { customerName: 'EnergySolutions Co', revenueShare: 8.3 },
    ],
    customers: [
      { customerName: 'TechCorp Global', industry: 'Electronics', region: 'Asia Pacific', totalQuantityMt: 1250, totalAmountUsd: 18500000, tradeCount: 45, abcCategory: 'A' as const, riskLevel: 'High' as const, lastTradeDate: '2026-07-03' },
      { customerName: 'AutoMotive Inc', industry: 'Automotive', region: 'North America', totalQuantityMt: 980, totalAmountUsd: 15200000, tradeCount: 38, abcCategory: 'A' as const, riskLevel: 'High' as const, lastTradeDate: '2026-07-04' },
      { customerName: 'ElectroSystems Ltd', industry: 'Electronics', region: 'Asia Pacific', totalQuantityMt: 950, totalAmountUsd: 14800000, tradeCount: 42, abcCategory: 'A' as const, riskLevel: 'High' as const, lastTradeDate: '2026-07-02' },
      { customerName: 'BuildPro Industries', industry: 'Construction', region: 'Europe', totalQuantityMt: 780, totalAmountUsd: 12100000, tradeCount: 35, abcCategory: 'A' as const, riskLevel: 'Medium' as const, lastTradeDate: '2026-07-01' },
      { customerName: 'EnergySolutions Co', industry: 'Energy', region: 'Asia Pacific', totalQuantityMt: 530, totalAmountUsd: 8300000, tradeCount: 28, abcCategory: 'A' as const, riskLevel: 'Medium' as const, lastTradeDate: '2026-06-30' },
      { customerName: 'SmartDevice Corp', industry: 'Electronics', region: 'North America', totalQuantityMt: 420, totalAmountUsd: 6500000, tradeCount: 22, abcCategory: 'B' as const, riskLevel: 'Medium' as const, lastTradeDate: '2026-07-01' },
      { customerName: 'CarParts Manufacturing', industry: 'Automotive', region: 'Asia Pacific', totalQuantityMt: 380, totalAmountUsd: 5900000, tradeCount: 20, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-29' },
      { customerName: 'Construction Plus', industry: 'Construction', region: 'North America', totalQuantityMt: 350, totalAmountUsd: 5400000, tradeCount: 18, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-28' },
      { customerName: 'GreenEnergy Ltd', industry: 'Energy', region: 'Europe', totalQuantityMt: 320, totalAmountUsd: 5000000, tradeCount: 16, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-27' },
      { customerName: 'MobileTech Inc', industry: 'Electronics', region: 'Asia Pacific', totalQuantityMt: 280, totalAmountUsd: 4300000, tradeCount: 15, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-26' },
      { customerName: 'Vehicle Systems', industry: 'Automotive', region: 'Europe', totalQuantityMt: 250, totalAmountUsd: 3900000, tradeCount: 14, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-25' },
      { customerName: 'BuildMaster Co', industry: 'Construction', region: 'Asia Pacific', totalQuantityMt: 220, totalAmountUsd: 3400000, tradeCount: 12, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-24' },
      { customerName: 'PowerGrid Solutions', industry: 'Energy', region: 'North America', totalQuantityMt: 200, totalAmountUsd: 3100000, tradeCount: 11, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-23' },
      { customerName: 'ComponentWorks', industry: 'Electronics', region: 'Europe', totalQuantityMt: 180, totalAmountUsd: 2800000, tradeCount: 10, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-22' },
      { customerName: 'AutoParts Direct', industry: 'Automotive', region: 'Asia Pacific', totalQuantityMt: 150, totalAmountUsd: 2300000, tradeCount: 9, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-21' },
      { customerName: 'InfraBuild Ltd', industry: 'Construction', region: 'North America', totalQuantityMt: 120, totalAmountUsd: 1900000, tradeCount: 8, abcCategory: 'B' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-20' },
      { customerName: 'SmallTech Solutions', industry: 'Electronics', region: 'Asia Pacific', totalQuantityMt: 100, totalAmountUsd: 1500000, tradeCount: 7, abcCategory: 'C' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-19' },
      { customerName: 'LocalAuto Dealer', industry: 'Automotive', region: 'Europe', totalQuantityMt: 90, totalAmountUsd: 1400000, tradeCount: 6, abcCategory: 'C' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-18' },
      { customerName: 'Regional Builder', industry: 'Construction', region: 'Asia Pacific', totalQuantityMt: 80, totalAmountUsd: 1200000, tradeCount: 5, abcCategory: 'C' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-17' },
      { customerName: 'Local Energy Co', industry: 'Energy', region: 'North America', totalQuantityMt: 70, totalAmountUsd: 1100000, tradeCount: 4, abcCategory: 'C' as const, riskLevel: 'Low' as const, lastTradeDate: '2026-06-16' },
    ],
  }
}
