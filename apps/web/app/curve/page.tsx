'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { PositionComponent, CurvePoint } from '@/lib/api-types'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function CurvePage() {
  const [asOf, setAsOf] = useState('2026-07-05')
  const [curveData, setCurveData] = useState<any>(null)
  const [valuation, setValuation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [asOf])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [curveResult, positionsResult] = await Promise.all([
        api.getCurve(asOf),
        api.getPositions(asOf)
      ])
      
      setCurveData(curveResult)
      
      // 簡易的にvaluationを計算（実際はAPIから取得すべき）
      const netPosition = positionsResult.components
        .filter((c: PositionComponent) => c.qtyMt !== null)
        .reduce((sum: number, c: PositionComponent) => sum + (c.qtyMt || 0), 0)
      
      setValuation({
        netPosition,
        refTenor: 0,
        futuresPrice: curveResult.curve.find((c: CurvePoint) => c.tenorMonths === 0)?.futuresPriceUsd || 0,
        mtm: netPosition * (curveResult.curve.find((c: CurvePoint) => c.tenorMonths === 0)?.futuresPriceUsd || 0),
      })
    } catch (error: any) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8">読み込み中...</div>
  }

  const chartData = curveData?.curve.map((c: CurvePoint) => ({
    tenor: `${c.tenorMonths}M`,
    price: c.futuresPriceUsd,
  })) || []

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">カーブ・評価</h1>
        
        <div className="flex items-center gap-4">
          <div>
            <label className="text-sm font-medium">基準日 (As-of)</label>
            <Input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valuation?.netPosition.toLocaleString()} mt
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ref Tenor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valuation?.refTenor}M
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Futures Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valuation?.futuresPrice.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">MTM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${valuation?.mtm.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>先物カーブ (0-6M)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
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
    </div>
  )
}
