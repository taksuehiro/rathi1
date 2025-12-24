'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { DashboardData, SeriesData } from '@/lib/api-types'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, DollarSign, Package, ArrowUpRight } from 'lucide-react'

export default function DashboardPage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [periodType, setPeriodType] = useState<'M' | 'D'>('D')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [seriesData, setSeriesData] = useState<SeriesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [asOf])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboard, series] = await Promise.all([
        api.getDashboard(asOf),
        api.getSeries('netPositionMt', '2026-01-01', asOf)
      ])
      
      setDashboardData(dashboard)
      setSeriesData(series)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
                <li>PostgreSQLデータベースが起動しているか確認してください</li>
                <li>Docker Composeで起動: <code className="bg-slate-100 px-2 py-1 rounded">docker-compose up -d</code></li>
                <li>APIサーバーが起動しているか確認: <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:3001</code></li>
                <li>ダミーデータを生成: <code className="bg-slate-100 px-2 py-1 rounded">cd scripts && npm run seed</code></li>
              </ol>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const valuation = dashboardData?.valuation
  const components = dashboardData?.components || []
  const curve = dashboardData?.curve || []
  
  // Loan Outstanding取得
  const loanComponent = components.find(c => c.componentCode === 'LOAN_OUTSTANDING_USD')
  const loanOutstanding = loanComponent?.amountUsd || 0

  // 数量系コンポーネントのみフィルタ
  const qtyComponents = components.filter(c => c.qtyMt !== null)

  // 先物カーブデータ整形
  const curveChartData = curve.map(c => ({
    tenor: `${c.tenorMonths}M`,
    price: c.futuresPriceUsd
  }))

  // 時系列データ整形
  const trendChartData = seriesData?.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
    value: d.value,
    type: d.periodType
  })) || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              AI-Rathispherd Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              錫（Tin）取引ポジション管理
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
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                粒度
              </label>
              <Select value={periodType} onValueChange={(v: 'M' | 'D') => setPeriodType(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D">日次 (D)</SelectItem>
                  <SelectItem value="M">月次 (M)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Net Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{valuation?.netPositionMt.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                評価数量
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                MTM Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${(valuation?.mtmValueUsd || 0).toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                時価評価額
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Loan Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${loanOutstanding.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1">
                貸付残高
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Futures Curve */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>先物カーブ (0-6M)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={curveChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tenor" />
                  <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Futures Price (USD)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Position Components */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>ポジション内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={qtyComponents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="componentCode" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qtyMt" fill="#10b981" name="Quantity (mt)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Net Position 推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Net Position (mt)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
