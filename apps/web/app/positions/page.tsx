'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { PositionComponent, SeriesData } from '@/lib/api-types'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, Package, Truck, FileText } from 'lucide-react'

const STATUS_COLORS = {
  Long: 'bg-green-100 text-green-800 border-green-300',
  Short: 'bg-red-100 text-red-800 border-red-300',
  Neutral: 'bg-gray-100 text-gray-800 border-gray-300',
}

// コンポーネントタイプの日本語ラベル
const COMPONENT_LABELS: Record<string, string> = {
  INVENTORY_ON_HAND: '在庫',
  IN_TRANSIT: '輸送中',
  OPEN_PURCHASE: '先物買建',
  OPEN_SALES: '先物売建',
  FUTURES_LME_NET: 'LME先物ネット',
  OTC_NET: 'OTCネット',
}

// コンポーネントタイプの色
const COMPONENT_COLORS: Record<string, string> = {
  INVENTORY_ON_HAND: '#10b981', // 緑
  IN_TRANSIT: '#8b5cf6', // 紫
  OPEN_PURCHASE: '#f59e0b', // オレンジ
  OPEN_SALES: '#ef4444', // 赤
  FUTURES_LME_NET: '#f97316', // オレンジ
  OTC_NET: '#6b7280', // グレー
}

interface ExtendedPositionComponent extends PositionComponent {
  componentLabel: string
  avgPrice: number
  marketValue: number
  share: number
  status: 'Long' | 'Short' | 'Neutral'
}

export default function PositionsPage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [components, setComponents] = useState<PositionComponent[]>([])
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
      
      const [positions, series] = await Promise.all([
        api.getPositions(asOf),
        api.getSeries('netPositionMt', '2026-01-01', asOf, asOf)
      ])
      
      setComponents(positions.components || [])
      setSeriesData(series)
    } catch (err: any) {
      console.error('Error loading positions:', err)
      setError(err.message || 'ポジションデータの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 拡張されたコンポーネントデータの計算
  const extendedComponents: ExtendedPositionComponent[] = components.map(comp => {
    const qty = comp.qtyMt || 0
    const amount = comp.amountUsd || 0
    const avgPrice = qty !== 0 ? amount / qty : 0
    
    // Net Position計算（全コンポーネントの合計）
    const netPosition = components.reduce((sum, c) => sum + (c.qtyMt || 0), 0)
    const share = netPosition !== 0 ? (qty / Math.abs(netPosition)) * 100 : 0
    
    // ステータス判定
    let status: 'Long' | 'Short' | 'Neutral' = 'Neutral'
    if (qty > 0) status = 'Long'
    else if (qty < 0) status = 'Short'
    
    return {
      ...comp,
      componentLabel: COMPONENT_LABELS[comp.componentCode] || comp.componentCode,
      avgPrice,
      marketValue: amount,
      share,
      status,
    }
  })

  // KPI計算
  const netPosition = components.reduce((sum, c) => sum + (c.qtyMt || 0), 0)
  const inventory = components.find(c => c.componentCode === 'INVENTORY_ON_HAND')?.qtyMt || 0
  const inTransit = components.find(c => c.componentCode === 'IN_TRANSIT')?.qtyMt || 0
  const openPurchase = components.find(c => c.componentCode === 'OPEN_PURCHASE')?.qtyMt || 0

  // グラフ用データ（Long positions only for pie chart）
  const pieChartData = extendedComponents
    .filter(c => c.qtyMt && c.qtyMt > 0)
    .map(c => ({
      name: c.componentLabel,
      value: Math.abs(c.qtyMt || 0),
      color: COMPONENT_COLORS[c.componentCode] || '#6b7280',
    }))

  // 棒グラフ用データ（Long/Short表示）
  const barChartData = extendedComponents.map(c => ({
    name: c.componentLabel,
    quantity: c.qtyMt || 0,
    color: c.qtyMt && c.qtyMt > 0 
      ? COMPONENT_COLORS[c.componentCode] || '#3b82f6'
      : '#ef4444',
  }))

  // 時系列データ
  const trendChartData = seriesData?.data.map(d => ({
    date: new Date(d.date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
    value: d.value,
  })) || []

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
              ポジション詳細 (Positions)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              ポジションコンポーネントの詳細分析
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
                <TrendingUp className="w-4 h-4" />
                Net Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{netPosition.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1">
                純ポジション
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                在庫
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inventory.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1">
                INVENTORY_ON_HAND
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                輸送中
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{inTransit.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1">
                IN_TRANSIT
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                先物買建
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{openPurchase.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1">
                OPEN_PURCHASE
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Components Pie Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>ポジション内訳（Long Positions）</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}mt`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Position Components Bar Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>ポジション内訳（Long/Short）</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" name="数量 (mt)">
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
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
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Net Position (mt)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Components Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>コンポーネント別詳細</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {extendedComponents.length}件のコンポーネント
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>コンポーネントタイプ</TableHead>
                    <TableHead className="text-right">数量 (mt)</TableHead>
                    <TableHead className="text-right">平均単価 ($/mt)</TableHead>
                    <TableHead className="text-right">評価額 ($)</TableHead>
                    <TableHead className="text-right">割合 (%)</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extendedComponents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        ポジションデータがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    extendedComponents.map((comp) => (
                      <TableRow key={comp.componentCode} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <TableCell className="font-medium">{comp.componentLabel}</TableCell>
                        <TableCell className={`text-right font-semibold ${
                          (comp.qtyMt || 0) < 0 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {(comp.qtyMt || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${comp.avgPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${
                          comp.marketValue < 0 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          ${comp.marketValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {comp.share.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[comp.status]}`}>
                            {comp.status}
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
      </div>
    </div>
  )
}
