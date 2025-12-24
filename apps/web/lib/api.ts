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

  async getSeries(metric: string, from: string, to: string) {
    const res = await fetch(
      `${API_BASE_URL}/v1/series?metric=${metric}&from=${from}&to=${to}`
    )
    if (!res.ok) throw new Error('Failed to fetch series')
    return res.json()
  },

  async getPositions(asOf: string) {
    const res = await fetch(`${API_BASE_URL}/v1/positions?asOf=${asOf}`)
    if (!res.ok) throw new Error('Failed to fetch positions')
    return res.json()
  },

  async getTrades(params: {
    from?: string
    to?: string
    periodType?: string
    instrumentType?: string
    tenorMonths?: number
    limit?: number
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${API_BASE_URL}/v1/trades?${query}`)
    if (!res.ok) throw new Error('Failed to fetch trades')
    return res.json()
  },

  async getCurve(asOf: string) {
    const res = await fetch(`${API_BASE_URL}/v1/curve?asOf=${asOf}`)
    if (!res.ok) throw new Error('Failed to fetch curve')
    return res.json()
  },

  async getDeliveries(params: {
    from?: string
    to?: string
    periodType?: string
    limit?: number
  }) {
    const query = new URLSearchParams(params as any).toString()
    const res = await fetch(`${API_BASE_URL}/v1/deliveries?${query}`)
    if (!res.ok) throw new Error('Failed to fetch deliveries')
    return res.json()
  },

  async seedData() {
    const res = await fetch(`${API_BASE_URL}/v1/admin/seed`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('Failed to seed data')
  },
}
