'use client'

import { useEffect, useState } from 'react'
import { calculateValuation, getMonthlyPnL, getDailyPnL } from '@/lib/api'
import type { MonthlyPnL, DailyPnL } from '@/lib/api-types'

export default function ValuationPage() {
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0])
  const [valuationType, setValuationType] = useState<'monthly' | 'daily'>('monthly')
  const [monthlyPnL, setMonthlyPnL] = useState<MonthlyPnL[]>([])
  const [dailyPnL, setDailyPnL] = useState<DailyPnL[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [monthlyData, dailyData] = await Promise.all([
        getMonthlyPnL(),
        getDailyPnL(),
      ])
      setMonthlyPnL(monthlyData.data)
      setDailyPnL(dailyData.data)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'データの読み込みに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  async function handleCalculate() {
    try {
      setCalculating(true)
      setMessage(null)
      const result = await calculateValuation({
        valuationDate,
        type: valuationType,
      })
      setMessage({ type: 'success', text: result.message })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '評価計算に失敗しました' })
    } finally {
      setCalculating(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">損益評価</h1>
        <p className="text-gray-600">時価会計（Mark-to-Market）による損益計算</p>
      </div>

      {/* 評価実行セクション */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">評価実行</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">評価日</label>
            <input
              type="date"
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">評価タイプ</label>
            <select
              value={valuationType}
              onChange={(e) => setValuationType(e.target.value as 'monthly' | 'daily')}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="monthly">月次（3月〜6月）</option>
              <option value="daily">日次（7月以降）</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {calculating ? '計算中...' : '評価実行'}
            </button>
          </div>
        </div>
        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">データを読み込み中...</div>
        </div>
      ) : (
        <>
          {/* 月次損益テーブル */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">月次損益（3月〜6月）</h2>
            </div>
            {monthlyPnL.length === 0 ? (
              <div className="p-6 text-center text-gray-500">月次損益データがありません</div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">年月</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">評価日</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">戻し損益</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">新規評価</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">純損益</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ポジション数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthlyPnL.map((pnl) => (
                    <tr key={pnl.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {pnl.yearMonth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(pnl.valuationDate).toLocaleDateString('ja-JP')}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        pnl.reversalPnl && pnl.reversalPnl < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {pnl.reversalPnl !== null ? formatCurrency(pnl.reversalPnl) : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        pnl.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pnl.unrealizedPnl)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        pnl.netPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pnl.netPnl)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {pnl.positionCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 日次損益テーブル */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">日次損益（7月以降）</h2>
            </div>
            {dailyPnL.length === 0 ? (
              <div className="p-6 text-center text-gray-500">日次損益データがありません</div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">評価日</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">実現損益</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未実現損益</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">合計損益</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">ポジション数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyPnL.map((pnl) => (
                    <tr key={pnl.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {new Date(pnl.valuationDate).toLocaleDateString('ja-JP')}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        pnl.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pnl.realizedPnl)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                        pnl.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pnl.unrealizedPnl)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                        pnl.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(pnl.totalPnl)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {pnl.positionCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 損益推移グラフ（簡易版） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 月次損益グラフ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">月次損益推移</h3>
              {monthlyPnL.length === 0 ? (
                <div className="text-center text-gray-500 py-8">データがありません</div>
              ) : (
                <div className="space-y-2">
                  {monthlyPnL.map((pnl) => (
                    <div key={pnl.id} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600">{pnl.yearMonth}</div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div
                            className={`h-6 ${
                              pnl.netPnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.abs(pnl.netPnl) / 10000)}%`,
                            }}
                          />
                          <span className={`ml-2 text-sm font-medium ${
                            pnl.netPnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(pnl.netPnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 日次損益グラフ */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">日次損益推移</h3>
              {dailyPnL.length === 0 ? (
                <div className="text-center text-gray-500 py-8">データがありません</div>
              ) : (
                <div className="space-y-2">
                  {dailyPnL.slice(0, 10).map((pnl) => (
                    <div key={pnl.id} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-gray-600">
                        {new Date(pnl.valuationDate).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div
                            className={`h-6 ${
                              pnl.totalPnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.abs(pnl.totalPnl) / 10000)}%`,
                            }}
                          />
                          <span className={`ml-2 text-sm font-medium ${
                            pnl.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(pnl.totalPnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

