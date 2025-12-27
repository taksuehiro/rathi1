import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { query } from '../lib/db'

interface DashboardData {
  netPosition: number
  mtmValue: number
  loanOutstanding: number
  curve: Array<{
    tenorMonths: number
    futuresPriceUsd: number
  }>
  components: Array<{
    componentCode: string
    qtyMt: number | null
    amountUsd: number | null
  }>
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    // リクエストボディの解析
    const dashboardData: DashboardData = JSON.parse(event.body || '{}')
    
    // リミット情報を取得
    const limitsResult = await query(`
      SELECT * FROM position_limits 
      WHERE limit_type = 'net_position' AND is_active = true
      LIMIT 1
    `)
    
    // プロンプト構築
    const prompt = await buildDashboardAnalysisPrompt(dashboardData, limitsResult.rows[0] || null)
    
    // Bedrock呼び出し（開発環境ではモックレスポンス）
    let aiAnalysis: string
    if (process.env.NODE_ENV === 'production' || process.env.USE_BEDROCK === 'true') {
      aiAnalysis = await callBedrock(prompt)
    } else {
      // ローカル開発用のモックレスポンス
      aiAnalysis = generateMockAnalysis(dashboardData)
    }
    
    // レスポンス解析
    const structuredResponse = parseAIResponse(aiAnalysis)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(structuredResponse),
    }
  } catch (error: any) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: { code: 'INTERNAL_ERROR', message: error.message },
      }),
    }
  }
}

async function buildDashboardAnalysisPrompt(data: DashboardData, limit: any): Promise<string> {
  const netPosition = data.netPosition || 0
  const mtmValue = data.mtmValue || 0
  const loanOutstanding = data.loanOutstanding || 0
  const curveData = data.curve || []
  
  // 先物カーブからスプレッドを計算
  const spreads = curveData.map((point, i) => {
    if (i === 0) return null
    const prevPoint = curveData[i - 1]
    return {
      spread: `${prevPoint.tenorMonths}M-${point.tenorMonths}M`,
      value: prevPoint.futuresPriceUsd - point.futuresPriceUsd,
      percentage: ((prevPoint.futuresPriceUsd - point.futuresPriceUsd) / point.futuresPriceUsd * 100).toFixed(2)
    }
  }).filter(s => s !== null) as Array<{ spread: string; value: number; percentage: string }>
  
  const curveAnalysis = spreads.length > 0 
    ? `スプレッド: ${spreads.map(s => `${s.spread} = $${s.value.toFixed(2)} (${s.percentage}%)`).join(', ')}`
    : '先物カーブデータなし'
  
  // リミット警告の生成
  let limitWarnings = 'リミット情報なし'
  if (limit) {
    const limitValue = parseFloat(limit.limit_value)
    const usage = (netPosition / limitValue * 100).toFixed(1)
    const status = parseFloat(usage) >= parseFloat(limit.alert_threshold) ? '🔴ALERT' :
                   parseFloat(usage) >= parseFloat(limit.warning_threshold) ? '⚠️WARNING' : '✅NORMAL'
    limitWarnings = `${status} ${limit.limit_type}: ${usage}% (${netPosition}mt / ${limitValue}mt)`
  }
  
  const curveStructure = curveData.length > 0 && curveData[0]?.futuresPriceUsd > curveData[curveData.length - 1]?.futuresPriceUsd 
    ? 'Backwardation（期近高）' 
    : 'Contango（期先高）'

  return `あなたは20年以上の経験を持つLME錫トレーディングの専門家です。物理取引のヘッジとしてLMEスプレッド取引を活用し、アウトライトポジションは持たない戦略を熟知しています。

# 現在の市況データ
- Net Position: ${netPosition} mt (リミット${limit ? parseFloat(limit.limit_value) : 1000} mt、使用率${limit ? (netPosition / parseFloat(limit.limit_value) * 100).toFixed(1) : (netPosition / 1000 * 100).toFixed(1)}%)
- MTM Value: $${mtmValue.toLocaleString()}
- Loan Outstanding: $${loanOutstanding.toLocaleString()}
- ${curveAnalysis}
- カーブ構造: ${curveStructure}

# リミット状況
${limitWarnings}

# あなたの専門知識
- LME錫のスプレッド取引戦略（0M-3M、3M-6M等）
- Backwardation/Contangoの変化を利用した収益機会
- 物理ポジションのLMEヘッジ
- ポジションリミット管理とリスク分散
- 流動性を考慮した執行戦略

# 重要な前提
- アウトライトポジションは持たない
- スプレッド取引でヘッジする
- リミット超過は即座に対応が必要

# 回答形式（必ず日本語）

## 市況分析 (2-3文)
スプレッドの状況とBackwardation/Contangoから見える市場構造を分析。

## リスク警告 (箇条書き2-3つ)
- リミット超過リスクを最優先
- スプレッド変動リスク
- 流動性リスク

## 推奨スプレッド戦略 (箇条書き2-3つ)
- 具体的なスプレッド取引提案（例: 「0M-3Mスプレッドを100mt買い」）
- リミット調整のための契約月シフト
- 優先順位の高い順

簡潔に、かつ具体的な数値を示してください。`
}

async function callBedrock(prompt: string): Promise<string> {
  try {
    // AWS SDK v3の動的インポート（本番環境でのみ使用）
    const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime')
    
    const bedrock = new BedrockRuntimeClient({ region: 'ap-northeast-1' })
    
    const response = await bedrock.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-sonnet-4-20250514',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    }))
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body))
    return responseBody.content[0].text
  } catch (error: any) {
    console.error('Bedrock error:', error)
    throw new Error(`Bedrock呼び出しエラー: ${error.message}`)
  }
}

function generateMockAnalysis(data: DashboardData): string {
  const netPosition = data.netPosition || 0
  const mtmValue = data.mtmValue || 0
  const loanOutstanding = data.loanOutstanding || 0
  const curveData = data.curve || []
  
  // スプレッド計算
  const spreads = curveData.length > 1 
    ? `${curveData[0].tenorMonths}M-${curveData[1].tenorMonths}Mスプレッド: $${(curveData[0].futuresPriceUsd - curveData[1].futuresPriceUsd).toFixed(2)}`
    : 'スプレッドデータなし'
  
  const limitUsage = (netPosition / 1000 * 100).toFixed(1)
  const limitStatus = parseFloat(limitUsage) >= 95 ? '🔴ALERT' : parseFloat(limitUsage) >= 80 ? '⚠️WARNING' : '✅NORMAL'
  
  return `## 市況分析
現在のNet Positionは${netPosition}mt（リミット使用率${limitUsage}%）、MTM Valueは$${mtmValue.toLocaleString()}となっています。${spreads}。先物カーブは${curveData.length > 0 && curveData[0].futuresPriceUsd > curveData[curveData.length - 1]?.futuresPriceUsd ? 'Backwardation（期近高）' : 'Contango（期先高）'}構造を示しており、${curveData.length > 0 && curveData[0].futuresPriceUsd > curveData[curveData.length - 1]?.futuresPriceUsd ? '短期需給が逼迫している可能性があります' : '期先プレミアムが発生しています'}。

## リスク警告
- ${limitStatus} リミット超過リスク: Net Positionが${netPosition}mtでリミット使用率${limitUsage}%。${parseFloat(limitUsage) >= 95 ? '即座に対応が必要です' : parseFloat(limitUsage) >= 80 ? '警告レベルに達しています' : '正常範囲内です'}
- スプレッド変動リスク: ${spreads}の変動によりヘッジ効果が変化する可能性があります
- 流動性リスク: Loan Outstandingが$${loanOutstanding.toLocaleString()}と高水準のため、金利上昇リスクを監視してください

## 推奨スプレッド戦略
- ${parseFloat(limitUsage) >= 80 ? `リミット調整のため、0M-3Mスプレッドを${Math.ceil((netPosition - 800) / 2)}mt売り、契約月をシフトする` : '現在のリミット使用率は正常範囲内です。スプレッド取引でヘッジを維持'}
- ${curveData.length > 1 ? `${curveData[0].tenorMonths}M-${curveData[1].tenorMonths}Mスプレッドを${Math.min(100, Math.ceil(netPosition * 0.1))}mt${curveData[0].futuresPriceUsd > curveData[1].futuresPriceUsd ? '買い' : '売り'}でヘッジ強化` : 'スプレッドデータが不足しています'}
- アウトライトポジションは持たず、スプレッド取引のみでリスク管理する`
}

function parseAIResponse(text: string): {
  marketAnalysis: string
  riskAlerts: string[]
  recommendations: string[]
} {
  // AI応答を構造化
  const sections = text.split('##').filter(s => s.trim())
  
  let marketAnalysis = ''
  let riskAlerts: string[] = []
  let recommendations: string[] = []
  
  sections.forEach(section => {
    const trimmed = section.trim()
    if (trimmed.startsWith('市況分析')) {
      marketAnalysis = trimmed.replace('市況分析', '').trim()
    } else if (trimmed.startsWith('リスク警告')) {
      const lines = trimmed.split('\n').filter(l => l.trim().startsWith('-'))
      riskAlerts = lines.map(l => l.replace('-', '').trim()).filter(l => l.length > 0)
    } else if (trimmed.startsWith('推奨アクション')) {
      const lines = trimmed.split('\n').filter(l => /^\d+\./.test(l.trim()))
      recommendations = lines.map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0)
    }
  })
  
  // フォールバック: パースに失敗した場合
  if (!marketAnalysis && sections.length > 0) {
    marketAnalysis = sections[0].replace(/^(市況分析|Market Analysis)/i, '').trim()
  }
  
  if (riskAlerts.length === 0) {
    riskAlerts = ['リスク分析を取得できませんでした']
  }
  
  if (recommendations.length === 0) {
    recommendations = ['推奨アクションを取得できませんでした']
  }
  
  return { marketAnalysis, riskAlerts, recommendations }
}

