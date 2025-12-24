"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { PositionComponent } from "@/lib/api-types"
import Link from "next/link"

export default function PositionsPage() {
  const [asOf, setAsOf] = useState<string>("2026-07-05")
  const [components, setComponents] = useState<PositionComponent[]>([])
  const [loading, setLoading] = useState(false)

  const loadPositions = async () => {
    setLoading(true)
    try {
      const result = await api.getPositions(asOf)
      setComponents(result.components)
    } catch (error: any) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()
  }, [asOf])

  const formatNumber = (num: number | null) => {
    if (num === null) return "-"
    return new Intl.NumberFormat("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatCurrency = (num: number | null) => {
    if (num === null) return "-"
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ポジション詳細</h1>
        <Link href="/">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基準日設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div>
              <Label htmlFor="as-of">基準日 (As-of)</Label>
              <Input
                id="as-of"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                max="2026-07-05"
                min="2026-01-01"
              />
            </div>
            <Button onClick={loadPositions} disabled={loading}>
              {loading ? "読み込み中..." : "更新"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ポジション内訳</CardTitle>
          <CardDescription>as_of: {asOf}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コンポーネント</TableHead>
                <TableHead className="text-right">数量 (mt)</TableHead>
                <TableHead className="text-right">金額 (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp) => (
                <TableRow key={comp.componentCode}>
                  <TableCell>{comp.componentCode}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(comp.qtyMt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(comp.amountUsd)}
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

