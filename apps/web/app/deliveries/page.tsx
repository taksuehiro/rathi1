"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { Delivery } from "@/lib/api-types"
import Link from "next/link"

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    from: "2026-01-01",
    to: "2026-07-05",
    periodType: "",
  })

  const loadDeliveries = async () => {
    setLoading(true)
    try {
      const params: any = {
        from: filters.from,
        to: filters.to,
        limit: 100,
      }
      if (filters.periodType) params.periodType = filters.periodType

      const result = await api.getDeliveries(params)
      setDeliveries(result.deliveries)
    } catch (error: any) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
  }, [])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">計上一覧</h1>
        <Link href="/">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>フィルタ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="from">開始日</Label>
              <Input
                id="from"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="to">終了日</Label>
              <Input
                id="to"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="period-type">粒度</Label>
              <select
                id="period-type"
                value={filters.periodType}
                onChange={(e) => setFilters({ ...filters, periodType: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">すべて</option>
                <option value="M">月次</option>
                <option value="D">日次</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={loadDeliveries} disabled={loading}>
              {loading ? "読み込み中..." : "フィルタ適用"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>計上データ</CardTitle>
          <CardDescription>{deliveries.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>期間種別</TableHead>
                <TableHead>期間日</TableHead>
                <TableHead>リンク取引ID</TableHead>
                <TableHead className="text-right">数量 (mt)</TableHead>
                <TableHead className="text-right">計上金額 (USD)</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.deliveryId}>
                  <TableCell>{delivery.periodType}</TableCell>
                  <TableCell>{delivery.periodDate}</TableCell>
                  <TableCell>{delivery.linkedTradeId ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(delivery.deliveredQuantityMt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(delivery.bookingAmountUsd)}
                  </TableCell>
                  <TableCell>{delivery.status ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

