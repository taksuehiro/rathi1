"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { getDashboard, getSeries, seedData, type DashboardData, type SeriesData } from "@/lib/api"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts"
import Link from "next/link"

type PeriodType = "M" | "D"

export default function DashboardPage() {
  const [asOf, setAsOf] = useState<string>("2026-07-05")
  const [periodType, setPeriodType] = useState<PeriodType>("D")
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [seriesData, setSeriesData] = useState<SeriesData | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadDashboard()
  }, [asOf])

  useEffect(() => {
    loadSeries()
  }, [periodType])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const data = await getDashboard(asOf)
      setDashboardData(data)
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "データの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSeries = async () => {
    try {
      const from = periodType === "M" ? "2026-01-31" : "2026-07-01"
      const to = asOf

      const [netPosition, mtm, loan] = await Promise.all([
        getSeries("netPositionMt", from, to),
        getSeries("mtmValueUsd", from, to),
        getSeries("loanOutstandingUsd", from, to),
      ])

      setSeriesData({
        metric: "combined",
        from,
        to,
        data: netPosition.data.map((item, i) => ({
          date: item.date,
          periodType: item.periodType,
          netPositionMt: item.value,
          mtmValueUsd: mtm.data[i]?.value || 0,
          loanOutstandingUsd: loan.data[i]?.value || 0,
        })),
      })
    } catch (error: any) {
      console.error("Series load error:", error)
    }
  }

  const handleSeed = async () => {
    setLoading(true)
    try {
      await seedData()
      toast({
        title: "成功",
        description: "ダミーデータを生成しました",
      })
      await loadDashboard()
      await loadSeries()
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "データ生成に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
        <h1 className="text-3xl font-bold">AI-Ratispherd Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={handleSeed} variant="outline" disabled={loading}>
            {loading ? "処理中..." : "ダミーデータ生成"}
          </Button>
          <Link href="/trades">
            <Button variant="outline">取引一覧</Button>
          </Link>
          <Link href="/deliveries">
            <Button variant="outline">計上一覧</Button>
          </Link>
          <Link href="/positions">
            <Button variant="outline">ポジション詳細</Button>
          </Link>
          <Link href="/curve">
            <Button variant="outline">カーブ・評価</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基準日・粒度設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="period-type">粒度</Label>
              <select
                id="period-type"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="M">月次 (M)</option>
                <option value="D">日次 (D)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {dashboardData && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Net Position</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {dashboardData.valuation
                    ? formatNumber(dashboardData.valuation.netPositionMt)
                    : "N/A"}{" "}
                  mt
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>MTM Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {dashboardData.valuation
                    ? formatCurrency(dashboardData.valuation.mtmValueUsd)
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Loan Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatCurrency(
                    dashboardData.components.find(
                      (c) => c.componentCode === "LOAN_OUTSTANDING_USD"
                    )?.amountUsd || 0
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ポジション内訳（スタック棒） */}
          <Card>
            <CardHeader>
              <CardTitle>ポジション内訳</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                width={800}
                height={300}
                data={[
                  {
                    name: "内訳",
                    INVENTORY_ON_HAND:
                      dashboardData.components.find(
                        (c) => c.componentCode === "INVENTORY_ON_HAND"
                      )?.qtyMt || 0,
                    IN_TRANSIT:
                      dashboardData.components.find(
                        (c) => c.componentCode === "IN_TRANSIT"
                      )?.qtyMt || 0,
                    OPEN_PURCHASE:
                      dashboardData.components.find(
                        (c) => c.componentCode === "OPEN_PURCHASE"
                      )?.qtyMt || 0,
                    OPEN_SALES:
                      dashboardData.components.find(
                        (c) => c.componentCode === "OPEN_SALES"
                      )?.qtyMt || 0,
                    FUTURES_LME_NET:
                      dashboardData.components.find(
                        (c) => c.componentCode === "FUTURES_LME_NET"
                      )?.qtyMt || 0,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="INVENTORY_ON_HAND" fill="#8884d8" />
                <Bar dataKey="IN_TRANSIT" fill="#82ca9d" />
                <Bar dataKey="OPEN_PURCHASE" fill="#ffc658" />
                <Bar dataKey="OPEN_SALES" fill="#ff7300" />
                <Bar dataKey="FUTURES_LME_NET" fill="#0088fe" />
              </BarChart>
            </CardContent>
          </Card>

          {/* 先物カーブ */}
          <Card>
            <CardHeader>
              <CardTitle>先物カーブ (0〜6M)</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                width={800}
                height={300}
                data={dashboardData.curve.map((c) => ({
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
            </CardContent>
          </Card>

          {/* 推移 */}
          {seriesData && (
            <Card>
              <CardHeader>
                <CardTitle>推移</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart width={800} height={300} data={seriesData.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="netPositionMt"
                    stroke="#8884d8"
                    name="Net Position (mt)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="mtmValueUsd"
                    stroke="#82ca9d"
                    name="MTM (USD)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="loanOutstandingUsd"
                    stroke="#ffc658"
                    name="Loan (USD)"
                  />
                </LineChart>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

