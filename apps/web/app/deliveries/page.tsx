'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { Delivery } from '@/lib/api-types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Truck, Package, CheckCircle, Clock, Search } from 'lucide-react'

const STATUS_COLORS = {
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Cancelled: 'bg-red-100 text-red-800 border-red-300',
}

// 拡張されたDelivery型（モックデータ用）
interface ExtendedDelivery extends Delivery {
  customerName?: string
  warehouse?: string
}

export default function DeliveriesPage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<ExtendedDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // フィルター
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-07-05')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'Pending' | 'Cancelled'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadDeliveries()
  }, [asOf, dateFrom, dateTo])

  useEffect(() => {
    applyFilters()
  }, [deliveries, dateFrom, dateTo, statusFilter, searchQuery])

  const loadDeliveries = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await api.getDeliveries({
        from: dateFrom,
        to: dateTo,
        limit: 1000,
      })
      // APIレスポンスの構造を確認
      if (result && Array.isArray(result.deliveries)) {
        setDeliveries(result.deliveries)
      } else if (result && Array.isArray(result)) {
        setDeliveries(result)
      } else {
        setDeliveries([])
      }
    } catch (err: any) {
      console.error('Error loading deliveries:', err)
      setError(err.message || '納品データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered: ExtendedDelivery[] = deliveries.map(d => ({
      ...d,
      customerName: getCustomerName(d),
      warehouse: getWarehouse(d),
    }))

    // 日付フィルター
    if (dateFrom) {
      filtered = filtered.filter(d => d.periodDate >= dateFrom)
    }
    if (dateTo) {
      filtered = filtered.filter(d => d.periodDate <= dateTo)
    }

    // ステータスフィルター
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(d => {
        const status = getStatus(d)
        return status === statusFilter
      })
    }

    // 検索フィルター（納品ID、顧客名、倉庫名など）
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(d => 
        d.deliveryId.toLowerCase().includes(query) ||
        (d.customerName && d.customerName.toLowerCase().includes(query)) ||
        (d.warehouse && d.warehouse.toLowerCase().includes(query)) ||
        (d.linkedTradeId && d.linkedTradeId.toLowerCase().includes(query))
      )
    }

    setFilteredDeliveries(filtered)
  }

  // ステータス判定（簡易版：納品日が過去ならCompleted、未来ならPending）
  const getStatus = (delivery: Delivery): 'Completed' | 'Pending' | 'Cancelled' => {
    if (delivery.status) {
      const statusUpper = delivery.status.toUpperCase()
      if (statusUpper.includes('CANCELLED') || statusUpper.includes('CANCEL')) {
        return 'Cancelled'
      }
      if (statusUpper.includes('COMPLETED') || statusUpper.includes('COMPLETE')) {
        return 'Completed'
      }
      if (statusUpper.includes('PENDING')) {
        return 'Pending'
      }
    }
    const deliveryDate = new Date(delivery.periodDate)
    const today = new Date()
    if (deliveryDate < today) {
      return 'Completed'
    } else if (deliveryDate > today) {
      return 'Pending'
    }
    return 'Completed'
  }

  // 顧客名の取得（モック：実際のAPIから取得する場合は拡張）
  const getCustomerName = (delivery: Delivery): string => {
    const customers = ['TechCorp Global', 'AutoMotive Inc', 'ElectroSystems Ltd', 'BuildPro Industries', 'EnergySolutions Co']
    return customers[parseInt(delivery.deliveryId.slice(-1)) % customers.length] || 'Unknown'
  }

  // 倉庫名の取得（モック：実際のAPIから取得する場合は拡張）
  const getWarehouse = (delivery: Delivery): string => {
    const warehouses = ['Tokyo Warehouse', 'Osaka Warehouse', 'Nagoya Warehouse', 'Yokohama Warehouse']
    return warehouses[parseInt(delivery.deliveryId.slice(-2)) % warehouses.length] || 'Unknown Warehouse'
  }

  // KPI計算
  const totalDeliveries = filteredDeliveries.length
  const totalQuantity = filteredDeliveries.reduce((sum, d) => sum + d.deliveredQuantityMt, 0)
  const completedDeliveries = filteredDeliveries.filter(d => getStatus(d) === 'Completed')
  const pendingDeliveries = filteredDeliveries.filter(d => getStatus(d) === 'Pending')
  const completedCount = completedDeliveries.length
  const pendingCount = pendingDeliveries.length

  // ステータス別集計
  const statusData = {
    Completed: filteredDeliveries.filter(d => getStatus(d) === 'Completed').reduce((sum, d) => sum + d.deliveredQuantityMt, 0),
    Pending: filteredDeliveries.filter(d => getStatus(d) === 'Pending').reduce((sum, d) => sum + d.deliveredQuantityMt, 0),
    Cancelled: filteredDeliveries.filter(d => getStatus(d) === 'Cancelled').reduce((sum, d) => sum + d.deliveredQuantityMt, 0),
  }

  const statusChartData = [
    { name: 'Completed', quantity: statusData.Completed },
    { name: 'Pending', quantity: statusData.Pending },
    { name: 'Cancelled', quantity: statusData.Cancelled },
  ]

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
              <Button onClick={loadDeliveries} className="flex-1">
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
              納品一覧 (Deliveries)
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              納品データの確認と分析
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
                  ステータス
                </label>
                <Select value={statusFilter} onValueChange={(v: 'ALL' | 'Completed' | 'Pending' | 'Cancelled') => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">すべて</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
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
                    placeholder="納品ID、顧客名、倉庫名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={loadDeliveries} disabled={loading}>
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
                <Truck className="w-4 h-4" />
                総納品数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalDeliveries.toLocaleString()}件</div>
              <div className="text-xs opacity-75 mt-1">
                フィルター適用後
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Package className="w-4 h-4" />
                総納品量
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
                <CheckCircle className="w-4 h-4" />
                完了納品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedCount.toLocaleString()}件</div>
              <div className="text-xs opacity-75 mt-1">
                完了済み
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                保留納品
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingCount.toLocaleString()}件</div>
              <div className="text-xs opacity-75 mt-1">
                保留中
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Chart */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>ステータス別数量</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="数量 (mt)">
                  {statusChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === 'Completed' ? '#10b981' : 
                        entry.name === 'Pending' ? '#f59e0b' : 
                        '#ef4444'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold">Completed:</span> {statusData.Completed.toLocaleString()} mt ({completedCount}件)
              </div>
              <div>
                <span className="font-semibold">Pending:</span> {statusData.Pending.toLocaleString()} mt ({pendingCount}件)
              </div>
              <div>
                <span className="font-semibold">Cancelled:</span> {statusData.Cancelled.toLocaleString()} mt ({filteredDeliveries.filter(d => getStatus(d) === 'Cancelled').length}件)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>納品詳細リスト</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {filteredDeliveries.length}件の納品
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>納品ID</TableHead>
                    <TableHead>納品日</TableHead>
                    <TableHead>取引ID</TableHead>
                    <TableHead>顧客</TableHead>
                    <TableHead className="text-right">数量 (mt)</TableHead>
                    <TableHead>倉庫</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        納品データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeliveries.map((delivery) => {
                      const status = getStatus(delivery)
                      return (
                        <TableRow key={delivery.deliveryId} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <TableCell className="font-medium">{delivery.deliveryId}</TableCell>
                          <TableCell>{new Date(delivery.periodDate).toLocaleDateString('ja-JP')}</TableCell>
                          <TableCell>{delivery.linkedTradeId || '-'}</TableCell>
                          <TableCell>{delivery.customerName || '-'}</TableCell>
                          <TableCell className="text-right">{delivery.deliveredQuantityMt.toLocaleString()}</TableCell>
                          <TableCell>{delivery.warehouse || '-'}</TableCell>
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
