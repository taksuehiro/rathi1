'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, AlertTriangle, Lightbulb, RefreshCw } from 'lucide-react'

interface AIAnalysis {
  marketAnalysis: string
  riskAlerts: string[]
  recommendations: string[]
}

interface AIPanelProps {
  dashboardData: any
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function AIPanel({ dashboardData }: AIPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    if (dashboardData) {
      loadAnalysis()
    }
  }, [dashboardData])

  const loadAnalysis = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/explain/dashboard`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dashboardData),
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch AI analysis: ${response.status}`)
      }
      
      const data = await response.json()
      setAnalysis(data)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('Failed to load AI analysis:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="w-[400px] h-screen bg-gradient-to-b from-blue-50 to-white border-l border-slate-200 p-6 sticky top-0 overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">AI分析を生成中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-[400px] h-screen bg-gradient-to-b from-blue-50 to-white border-l border-slate-200 p-6 sticky top-0 overflow-y-auto">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-800 text-sm mb-4">{error}</p>
            <Button onClick={loadAnalysis} size="sm" variant="outline">
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-[400px] h-screen overflow-y-auto bg-gradient-to-b from-blue-50 to-white border-l border-slate-200 p-6 sticky top-0">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">AI Market Insights</h2>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Powered by Claude Sonnet 4</span>
          <button
            onClick={loadAnalysis}
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            更新
          </button>
        </div>
      </div>

      {/* 市況分析 */}
      <Card className="mb-4 bg-blue-50 border-blue-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            📊 Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">
            {analysis?.marketAnalysis || '分析データがありません'}
          </p>
        </CardContent>
      </Card>

      {/* リスク警告 */}
      <Card className="mb-4 bg-orange-50 border-orange-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-orange-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis?.riskAlerts && analysis.riskAlerts.length > 0 ? (
            <ul className="space-y-2">
              {analysis.riskAlerts.map((alert, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-orange-800">
                  <span className="text-orange-600 font-bold mt-0.5">•</span>
                  <span>{alert}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-orange-700">リスク警告はありません</p>
          )}
        </CardContent>
      </Card>

      {/* 推奨アクション */}
      <Card className="mb-4 bg-green-50 border-green-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis?.recommendations && analysis.recommendations.length > 0 ? (
            <ol className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                  <span className="text-green-600 font-bold mt-0.5">{index + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-green-700">推奨アクションはありません</p>
          )}
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="text-xs text-slate-400 text-center mt-6 pb-4">
        最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
      </div>
    </div>
  )
}

