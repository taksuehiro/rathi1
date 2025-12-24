"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getCurve, getPositions, type CurvePoint } from "@/lib/api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import Link from "next/link"

export default function CurvePage() {
  const [asOf, setAsOf] = useState<string>("2026-07-05")
  const [curve, setCurve] = useState<CurvePoint[]>([])
  const [valuation, setValuation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [curveResult, positionsResult] = await Promise.all([
        getCurve(asOf),
        getPositions(asOf),
      ])
      setCurve(curveResult.curve)
      
      // 簡易的にvaluationを計算（実際はAPIから取得すべき）
      const netPosition = positionsResult.components
        .filter((c) => c.qtyMt !== null)
        .reduce((sum, c) => sum + (c.qtyMt || 0), 0)
      setValuation({
        netPosition,
        refTenor: 0,
        futuresPrice: curveResult.curve.find((c) => c.tenorMonths === 0)?.futuresPriceUsd || 0,
        mtm: netPosition * (curveResult.curve.find((c) => c.tenorMonths === 0)?.futuresPriceUsd || 0),
      })
    } catch (error: any) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [asOf])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatCurrency = (num: number) => {
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
        <h1 className="text-3xl font-bold">カーブ・評価</h1>
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
            <Button onClick={loadData} disabled={loading}>
              {loading ? "読み込み中..." : "更新"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* 先物カーブ */}
        <Card>
          <CardHeader>
            <CardTitle>先物カーブ (0〜6M)</CardTitle>
            <CardDescription>as_of: {asOf}</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChart
              width={400}
              height={300}
              data={curve.map((c) => ({
                tenor: `${c.tenorMonths}M`,
                price: c.futuresPriceUsd,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tenor" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#8884d8" />
            </LineChart>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>テナー</TableHead>
                  <TableHead className="text-right">価格 (USD/t)</TableHead>
                  <TableHead>価格ソース</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {curve.map((point) => (
                  <TableRow key={point.tenorMonths}>
                    <TableCell>{point.tenorMonths}M</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(point.futuresPriceUsd)}
                    </TableCell>
                    <TableCell>{point.priceSource || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 評価スナップショット */}
        <Card>
          <CardHeader>
            <CardTitle>評価スナップショット</CardTitle>
            <CardDescription>as_of: {asOf}</CardDescription>
          </CardHeader>
          <CardContent>
            {valuation && (
              <div className="space-y-4">
                <div>
                  <Label>参照テナー</Label>
                  <p className="text-2xl font-bold">{valuation.refTenor}M</p>
                </div>
                <div>
                  <Label>参照価格</Label>
                  <p className="text-2xl font-bold">
                    {formatNumber(valuation.futuresPrice)} USD/t
                  </p>
                </div>
                <div>
                  <Label>ポジション数量</Label>
                  <p className="text-2xl font-bold">
                    {formatNumber(valuation.netPosition)} mt
                  </p>
                </div>
                <div>
                  <Label>MTM Value</Label>
                  <p className="text-2xl font-bold">
                    {formatCurrency(valuation.mtm)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

