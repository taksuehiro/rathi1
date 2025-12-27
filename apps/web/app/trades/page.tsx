'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Trade } from '@/lib/api-types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, Package, DollarSign, Calculator, Search } from 'lucide-react'

const STATUS_COLORS = {
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
}

export default function TradesPage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // フィルター
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-07-05')
  const [tradeTypeFilter, setTradeTypeFilter] = useState<'ALL' | 'PURCHASE' | 'SALE'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTrades()
  }, [asOf, dateFrom, dateTo])

  useEffect(() => {
    applyFilters()
  }, [trades, dateFrom, dateTo, tradeTypeFilter, searchQuery])

  const loadTrades = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.getTrades({
        asOf: asOf,
        from: dateFrom,
        to: dateTo,
        limit: 1000,
      })
      // APIレスポンスの構造を確認
      if (result && Array.isArray(result.trades)) {
        setTrades(result.trades)
      } else if (result && Array.isArray(result)) {
        // レスポンスが配列の場合
        setTrades(result)
      } else {
        setTrades([])
      }
    } catch (err: any) {
      console.error('Error loading trades:', err)
      setError(err.message || '取引データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...trades]

    // 日付フィルター
    if (dateFrom) {
      filtered = filtered.filter(t => t.periodDate >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(t => t.periodDate <= dateTo)
    }

    // 取引タイプフィルター
    if (tradeTypeFilter !== 'ALL') {
      const buySellValue = tradeTypeFilter === 'PURCHASE' ? 'BUY' : 'SELL'
      filtered = filtered.filter(t => t.buySell === buySellValue)
    }

    // 検索フィルター（取引ID、顧客名など）
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => {
        const tradeId = String(t.tradeId || '').toLowerCase()
        const customerName = (t as any).customerName?.toLowerCase() || ''
        const notes = (t.notes || '').toLowerCase()
        return tradeId.includes(query) || customerName.includes(query) || notes.includes(query)
      })
    }

    setFilteredTrades(filtered)
  }

  // KPI計算
  const totalTrades = filteredTrades.length
  const totalQuantity = filteredTrades.reduce((sum, t) => sum + t.quantityMt, 0)
  const totalAmount = filteredTrades.reduce((sum, t) => sum + (t.tradeAmountUsd || 0), 0)
  const averagePrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0

  // 取引タイプ別集計
  const purchaseTrades = filteredTrades.filter(t => t.buySell === 'BUY')
  const saleTrades = filteredTrades.filter(t => t.buySell === 'SELL')
  const purchaseQuantity = purchaseTrades.reduce((sum, t) => sum + t.quantityMt, 0)
  const saleQuantity = saleTrades.reduce((sum, t) => sum + t.quantityMt, 0)

  const tradeTypeChartData = [
    { name: 'Purchase', quantity: purchaseQuantity },
    { name: 'Sale', quantity: saleQuantity },
  ]

  // ステータス判定（簡易版：取引日が過去ならCompleted、未来ならPending）
  const getStatus = (trade: Trade): 'Completed' | 'Pending' | 'Cancelled' => {
    const tradeDate = new Date(trade.periodDate)
    const today = new Date()
    if (tradeDate < today) {
      return 'Completed'
    } else if (tradeDate > today) {
      return 'Pending'
    }
    return 'Completed'
  }

  // 顧客名の取得（APIレスポンスから取得）
  const getCustomerName = (trade: Trade): string => {
    // APIレスポンスにcustomerNameが含まれている場合はそれを使用
    return (trade as any).customerName || 'Unknown'
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
                <li>APIサーバーが起動しているか確認: <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:3001</code></li>
                <li>PostgreSQLデータベースが起動しているか確認</li>
                <li>Docker Composeで起動: <code className="bg-slate-100 px-2 py-1 rounded">docker-compose up -d</code></li>
                <li>ダミーデータを生成: <code className="bg-slate-100 px-2 py-1 rounded">cd scripts && npm run seed</code></li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadTrades} className="flex-1">
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
              取引一覧 (Trades)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              取引データの確認と分析
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

        {/* Filters */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>フィルター</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  開始日
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  終了日
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  取引タイプ
                </label>
                <Select value={tradeTypeFilter} onValueChange={(v: 'ALL' | 'PURCHASE' | 'SALE') => setTradeTypeFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">すべて</SelectItem>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="SALE">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  検索
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="取引ID、顧客名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={loadTrades} disabled={loading}>
                {loading ? '読み込み中...' : 'データ再読み込み'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                総取引数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTrades.toLocaleString()}件</div>
              <div className="text-xs opacity-75 mt-1">
                フィルター適用後
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                総取引量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalQuantity.toLocaleString()} mt</div>
              <div className="text-xs opacity-75 mt-1">
                合計数量
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                総取引額
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${totalAmount.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1">
                合計金額
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                平均単価
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${averagePrice.toFixed(2)}
              </div>
              <div className="text-xs opacity-75 mt-1">
                USD/mt
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trade Type Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>取引タイプ別数量</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tradeTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="数量 (mt)">
                  {tradeTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Purchase' ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Purchase:</span> {purchaseQuantity.toLocaleString()} mt ({purchaseTrades.length}件)
              </div>
              <div>
                <span className="font-semibold">Sale:</span> {saleQuantity.toLocaleString()} mt ({saleTrades.length}件)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trades Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>取引詳細リスト</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {filteredTrades.length}件の取引
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>取引ID</TableHead>
                    <TableHead>取引日</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>顧客</TableHead>
                    <TableHead className="text-right">数量 (mt)</TableHead>
                    <TableHead className="text-right">単価 ($/mt)</TableHead>
                    <TableHead className="text-right">金額 ($)</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        取引データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrades.map((trade) => {
                      const status = getStatus(trade)
                      const customerName = getCustomerName(trade)
                      return (
                        <TableRow key={trade.tradeId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <TableCell className="font-medium">{trade.tradeId}</TableCell>
                          <TableCell>{new Date(trade.periodDate).toLocaleDateString('ja-JP')}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              trade.buySell === 'BUY' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {trade.buySell === 'BUY' ? 'Purchase' : 'Sale'}
                            </span>
                          </TableCell>
                          <TableCell>{customerName}</TableCell>
                          <TableCell className="text-right">{trade.quantityMt.toLocaleString()}</TableCell>
                          <TableCell className="text-right">${trade.tradePriceUsd.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            ${(trade.tradeAmountUsd || trade.quantityMt * trade.tradePriceUsd).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                              {status}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
