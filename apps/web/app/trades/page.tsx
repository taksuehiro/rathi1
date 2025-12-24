"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getTrades, type Trade } from "@/lib/api"
import Link from "next/link"

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    from: "2026-01-01",
    to: "2026-07-05",
    periodType: "",
    instrumentType: "",
    tenorMonths: "",
  })

  const loadTrades = async () => {
    setLoading(true)
    try {
      const params: any = {
        from: filters.from,
        to: filters.to,
        limit: 100,
      }
      if (filters.periodType) params.periodType = filters.periodType
      if (filters.instrumentType) params.instrumentType = filters.instrumentType
      if (filters.tenorMonths) params.tenorMonths = parseInt(filters.tenorMonths)

      const result = await getTrades(params)
      setTrades(result.trades)
    } catch (error: any) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrades()
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
        <h1 className="text-3xl font-bold">取引一覧</h1>
        <Link href="/">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>フィルタ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
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
            <div>
              <Label htmlFor="instrument-type">種別</Label>
              <select
                id="instrument-type"
                value={filters.instrumentType}
                onChange={(e) => setFilters({ ...filters, instrumentType: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">すべて</option>
                <option value="PHYSICAL">現物</option>
                <option value="FUTURES">先物</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tenor">テナー</Label>
              <Input
                id="tenor"
                type="number"
                placeholder="0-6"
                value={filters.tenorMonths}
                onChange={(e) => setFilters({ ...filters, tenorMonths: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={loadTrades} disabled={loading}>
              {loading ? "読み込み中..." : "フィルタ適用"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>取引データ</CardTitle>
          <CardDescription>{trades.length}件</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>期間種別</TableHead>
                <TableHead>期間日</TableHead>
                <TableHead>売買</TableHead>
                <TableHead>種別</TableHead>
                <TableHead>テナー</TableHead>
                <TableHead className="text-right">数量 (mt)</TableHead>
                <TableHead className="text-right">価格 (USD/t)</TableHead>
                <TableHead className="text-right">金額 (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.tradeId}>
                  <TableCell>{trade.periodType}</TableCell>
                  <TableCell>{trade.periodDate}</TableCell>
                  <TableCell>{trade.buySell}</TableCell>
                  <TableCell>{trade.instrumentType}</TableCell>
                  <TableCell>{trade.tenorMonths ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(trade.quantityMt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(trade.tradePriceUsd)}
                  </TableCell>
                  <TableCell className="text-right">
                    {trade.tradeAmountUsd
                      ? formatNumber(trade.tradeAmountUsd)
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

