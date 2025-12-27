'use client'

import { useEffect, useState } from 'react'
import { getLimitsStatus } from '@/lib/api'
import type { PositionLimitStatus } from '@/lib/api-types'

export default function LimitsPage() {
  const [limits, setLimits] = useState<PositionLimitStatus[]>([])
  const [asOf, setAsOf] = useState('2026-07-05')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLimits()
  }, [asOf])

  async function loadLimits() {
    try {
      setLoading(true)
      const data = await getLimitsStatus(asOf)
      setLimits(data.limits)
    } catch (error) {
      console.error('Failed to load limits:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLimitTypeLabel = (type: string) => {
    switch (type) {
      case 'net_position': return 'Net Position'
      case 'customer_exposure': return 'Customer Exposure'
      case 'contract_month': return 'Contract Month'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      alert: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      normal: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status as keyof typeof colors]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading limits...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Position Limits</h1>
        <p className="text-gray-600">Monitor and manage position limits across all exposures</p>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">As of Date:</label>
        <input
          type="date"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Limits Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {limits.map((limit) => {
              const utilization = parseFloat(limit.utilization_pct)
              return (
                <tr key={limit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {getLimitTypeLabel(limit.limit_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {limit.entity_id || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {parseFloat(limit.current_value).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                    {parseFloat(limit.limit_value).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getStatusColor(limit.status)}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {utilization.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(limit.status)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-sm text-green-600 font-medium">Normal</div>
          <div className="text-2xl font-bold text-green-700">
            {limits.filter(l => l.status === 'normal').length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-sm text-yellow-600 font-medium">Warning</div>
          <div className="text-2xl font-bold text-yellow-700">
            {limits.filter(l => l.status === 'warning').length}
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-sm text-red-600 font-medium">Alert</div>
          <div className="text-2xl font-bold text-red-700">
            {limits.filter(l => l.status === 'alert').length}
          </div>
        </div>
      </div>
    </div>
  )
}

