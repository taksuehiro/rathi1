'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { CustomerData } from '@/lib/api-types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'

const COLORS = {
  A: '#3b82f6', // Blue
  B: '#10b981', // Green
  C: '#f59e0b', // Orange
}

const RISK_COLORS = {
  High: 'bg-red-100 text-red-800 border-red-300',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Low: 'bg-green-100 text-green-800 border-green-300',
}

const ABC_COLORS = {
  A: 'bg-blue-100 text-blue-800 border-blue-300',
  B: 'bg-green-100 text-green-800 border-green-300',
  C: 'bg-orange-100 text-orange-800 border-orange-300',
}

export default function CustomersPage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [viewMode, setViewMode] = useState<'quantity' | 'revenue'>('revenue')
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [asOf])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getCustomers(asOf)
      setCustomerData(data)
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
            <Button onClick={() => window.location.reload()} className="w-full">
              再読み込み
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!customerData) return null

  const { summary, abcAnalysis, byIndustry, byRegion, riskConcentration, customers } = customerData

  // ABC分析チャートデータ
  const abcChartData = abcAnalysis.map(item => ({
    name: `${item.category}類`,
    value: item.revenueShare,
    count: item.customerCount,
  }))

  // 業種別チャートデータ
  const industryChartData = byIndustry.map(item => ({
    name: item.industry,
    share: item.revenueShare,
    count: item.customerCount,
  }))

  // 地域別チャートデータ
  const regionChartData = byRegion.map(item => ({
    name: item.region,
    share: item.revenueShare,
    count: item.customerCount,
  }))

  // リスク集中度チャートデータ
  const riskChartData = riskConcentration.map(item => ({
    name: item.customerName,
    share: item.revenueShare,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              顧客ポートフォリオ分析
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              顧客別取引分析とリスク管理
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
                表示モード
              </label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'revenue' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('revenue')}
                >
                  金額
                </Button>
                <Button
                  variant={viewMode === 'quantity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('quantity')}
                >
                  数量
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Users className="w-4 h-4" />
                総顧客数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary.totalCustomers}社</div>
              <div className="text-xs opacity-75 mt-1">
                アクティブ顧客数
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                A顧客
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary.aCustomers.count}社
              </div>
              <div className="text-xs opacity-75 mt-1">
                売上シェア {summary.aCustomers.revenueShare}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                B顧客
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary.bCustomers.count}社
              </div>
              <div className="text-xs opacity-75 mt-1">
                売上シェア {summary.bCustomers.revenueShare}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                上位5社集中度
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {summary.top5Concentration}%
              </div>
              <div className="text-xs opacity-75 mt-1">
                リスク集中度
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ABC分析 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>ABC分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={abcChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {abcChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name.includes('A') ? 'A' : entry.name.includes('B') ? 'B' : 'C']} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span><strong>A類:</strong> 売上の{abcAnalysis.find(a => a.category === 'A')?.revenueShare}%を占める重要顧客 ({abcAnalysis.find(a => a.category === 'A')?.customerCount}社)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span><strong>B類:</strong> 売上の{abcAnalysis.find(a => a.category === 'B')?.revenueShare}%、成長余地あり ({abcAnalysis.find(a => a.category === 'B')?.customerCount}社)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span><strong>C類:</strong> 売上の{abcAnalysis.find(a => a.category === 'C')?.revenueShare}%、効率化が必要 ({abcAnalysis.find(a => a.category === 'C')?.customerCount}社)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 業種別セグメント */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>業種別セグメント</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={industryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="share" fill="#8b5cf6" name="売上シェア (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Region and Risk Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 地域別セグメント */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>地域別セグメント</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={regionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="share" fill="#10b981" name="売上シェア (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* リスク集中度分析 */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>リスク集中度分析（上位5社）</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={riskChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 25]} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="share" fill="#f59e0b" name="売上シェア (%)" />
                </BarChart>
              </ResponsiveContainer>
              {summary.top5Concentration > 60 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-300 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">集中リスク警告</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-2">
                    上位5社の売上集中度が{summary.top5Concentration}%と高く、顧客依存リスクが懸念されます。
                    顧客基盤の多様化を検討してください。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Summary Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>顧客別取引サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>業種</TableHead>
                    <TableHead>地域</TableHead>
                    <TableHead>取引量 (mt)</TableHead>
                    <TableHead>取引額 (USD)</TableHead>
                    <TableHead>取引回数</TableHead>
                    <TableHead>ABC分類</TableHead>
                    <TableHead>リスクレベル</TableHead>
                    <TableHead>最終取引日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{customer.customerName}</TableCell>
                      <TableCell>{customer.industry}</TableCell>
                      <TableCell>{customer.region}</TableCell>
                      <TableCell>{customer.totalQuantityMt.toLocaleString()}</TableCell>
                      <TableCell>${customer.totalAmountUsd.toLocaleString()}</TableCell>
                      <TableCell>{customer.tradeCount}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${ABC_COLORS[customer.abcCategory]}`}>
                          {customer.abcCategory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${RISK_COLORS[customer.riskLevel]}`}>
                          {customer.riskLevel}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(customer.lastTradeDate).toLocaleDateString('ja-JP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



