'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { CurvePoint } from '@/lib/api-types'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, TrendingDown, TrendingUp, Activity } from 'lucide-react'

const STRUCTURE_COLORS = {
  Contango: 'bg-green-100 text-green-800 border-green-300',
  Backwardation: 'bg-red-100 text-red-800 border-red-300',
  Flat: 'bg-gray-100 text-gray-800 border-gray-300',
}

interface ExtendedCurvePoint {
  month: string
  monthLabel: string
  price: number
  changeFromSpot: number
  changeFromPrev: number
  spread: number
  structure: 'Contango' | 'Backwardation' | 'Flat'
}

export default function CurvePage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [curve, setCurve] = useState<CurvePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [asOf])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await api.getCurve(asOf)
      setCurve(result.curve || [])
    } catch (err: any) {
      console.error('Error loading curve:', err)
      setError(err.message || 'カーブデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // カーブデータを拡張
  const extendedCurve: ExtendedCurvePoint[] = curve
    .sort((a, b) => a.tenorMonths - b.tenorMonths)
    .map((point, index, array) => {
      const price = point.futuresPriceUsd
      const spotPrice = array.find(p => p.tenorMonths === 0)?.futuresPriceUsd || price
      const prevPrice = index > 0 ? array[index - 1].futuresPriceUsd : price
      
      const changeFromSpot = price - spotPrice
      const changeFromPrev = prevPrice !== 0 ? ((price - prevPrice) / prevPrice) * 100 : 0
      const spread = index > 0 ? price - prevPrice : 0
      
      // 市場構造の判定
      let structure: 'Contango' | 'Backwardation' | 'Flat' = 'Flat'
      if (spread > 10) structure = 'Contango'
      else if (spread < -10) structure = 'Backwardation'
      
      const monthLabel = point.tenorMonths === 0 
        ? 'Spot' 
        : `${point.tenorMonths}ヶ月`
      
      return {
        month: `${point.tenorMonths}M`,
        monthLabel,
        price,
        changeFromSpot,
        changeFromPrev,
        spread,
        structure,
      }
    })

  // KPI計算
  const spotPrice = extendedCurve.find(c => c.month === '0M')?.price || 0
  const price3M = extendedCurve.find(c => c.month === '3M')?.price || extendedCurve.find(c => c.month === '2M')?.price || spotPrice
  const price6M = extendedCurve.find(c => c.month === '6M')?.price || extendedCurve.find(c => c.month === '5M')?.price || spotPrice
  
  const spread0M3M = price3M - spotPrice
  const spread3M6M = price6M - price3M

  // カーブ傾きの判定
  const getCurveSlope = (): string => {
    if (spread0M3M < -20) return 'Strong Backwardation'
    if (spread0M3M < 0) return 'Backwardation'
    if (spread0M3M < 20) return 'Flat to Contango'
    return 'Contango'
  }

  // スプレッドデータ（月次）
  const spreadData = extendedCurve
    .filter((_, index) => index > 0)
    .map((point, index) => {
      const prevPoint = extendedCurve[index]
      return {
        period: `${prevPoint.month}-${point.month}`,
        spread: point.spread,
        structure: point.structure,
      }
    })

  // グラフ用データ
  const chartData = extendedCurve.map(c => ({
    month: c.monthLabel,
    price: c.price,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="max-w-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-red-600">エラーが発生しました</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-red-500 font-mono text-sm bg-red-50 p-4 rounded">
              {error}
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">解決方法:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>APIサーバーが起動しているか確認: <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:3001</code></li>
                <li>PostgreSQLデータベースが起動しているか確認</li>
                <li>Docker Composeで起動: <code className="bg-slate-100 px-2 py-1 rounded">docker-compose up -d</code></li>
                <li>ダミーデータを生成: <code className="bg-slate-100 px-2 py-1 rounded">cd scripts && npm run seed</code></li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadData} className="flex-1">
                再試行
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                ページ再読み込み
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              先物カーブ分析 (Futures Curve)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              先物価格カーブと市場構造の分析
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                基準日 (As-of)
              </label>
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="w-48"
              />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                現物価格
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${spotPrice.toLocaleString()}/mt
              </div>
              <div className="text-xs opacity-75 mt-1">
                Spot Price
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                0M-3M Spread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${spread0M3M.toLocaleString()}/mt
              </div>
              <div className="text-xs opacity-75 mt-1">
                {spread0M3M < 0 ? 'Backwardation' : 'Contango'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                3M-6M Spread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${spread3M6M.toLocaleString()}/mt
              </div>
              <div className="text-xs opacity-75 mt-1">
                {spread3M6M > 0 ? 'Contango' : 'Backwardation'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                カーブ傾き
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getCurveSlope()}
              </div>
              <div className="text-xs opacity-75 mt-1">
                Market Structure
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Curve Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>先物カーブ (0M-12M)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toLocaleString()}/mt`, '先物価格']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="先物価格 ($/mt)"
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Spread Analysis Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>スプレッド分析（月次スプレッド）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={spreadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="spread" name="スプレッド ($/mt)">
                  {spreadData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      fill={entry.spread > 0 ? '#10b981' : entry.spread < 0 ? '#ef4444' : '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>
              Contango (プラス)
              <span className="inline-block w-3 h-3 bg-red-500 rounded mr-2 ml-4"></span>
              Backwardation (マイナス)
            </div>
          </CardContent>
        </Card>

        {/* Curve Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>月別価格データ</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {extendedCurve.length}件のデータポイント
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Price ($/mt)</TableHead>
                    <TableHead className="text-right">Change from Spot ($)</TableHead>
                    <TableHead className="text-right">Change from Prev (%)</TableHead>
                    <TableHead className="text-right">Spread ($/mt)</TableHead>
                    <TableHead>Market Structure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extendedCurve.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        カーブデータがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    extendedCurve.map((point) => (
                      <TableRow key={point.month} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <TableCell className="font-medium">{point.monthLabel}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${point.price.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${
                          point.changeFromSpot > 0 ? 'text-green-600' : 
                          point.changeFromSpot < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {point.changeFromSpot > 0 ? '+' : ''}{point.changeFromSpot.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${
                          point.changeFromPrev > 0 ? 'text-green-600' : 
                          point.changeFromPrev < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {point.changeFromPrev > 0 ? '+' : ''}{point.changeFromPrev.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-right ${
                          point.spread > 0 ? 'text-green-600' : 
                          point.spread < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {point.spread > 0 ? '+' : ''}{point.spread.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${STRUCTURE_COLORS[point.structure]}`}>
                            {point.structure}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Explanation Box */}
        <Card className="bg-blue-50 border-blue-200 shadow-lg">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-3">市場構造の解説</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>Backwardation（バックワーデーション）:</strong> 
                現物価格が先物価格より高い状態。需給が逼迫している兆候。在庫不足や供給制約を示す。
              </p>
              <p>
                <strong>Contango（コンタンゴ）:</strong> 
                先物価格が現物価格より高い状態。在庫コスト（保管費、金利等）を反映した通常の市場構造。
              </p>
              <p>
                <strong>Flat（フラット）:</strong> 
                現物価格と先物価格がほぼ同じ状態。需給バランスが取れている状態。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
