import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    
    // プロンプト構築
    const prompt = buildDashboardAnalysisPrompt(dashboardData)
    
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

function buildDashboardAnalysisPrompt(data: DashboardData): string {
  const netPosition = data.netPosition || 0
  const mtmValue = data.mtmValue || 0
  const loanOutstanding = data.loanOutstanding || 0
  
  const curveSummary = data.curve
    ?.map(c => `${c.tenorMonths}M: $${c.futuresPriceUsd.toLocaleString()}`)
    .join(', ') || 'データなし'
  
  const positionSummary = data.components
    ?.filter(c => c.qtyMt !== null && c.qtyMt !== 0)
    .map(c => `${c.componentCode}: ${c.qtyMt}mt`)
    .join(', ') || 'データなし'

  return `あなたは経験豊富な錫（Tin）トレーダーです。以下のダッシュボードデータを分析してください。

【現在のポジション】
- Net Position: ${netPosition} mt
- MTM Value: $${mtmValue.toLocaleString()}
- Loan Outstanding: $${loanOutstanding.toLocaleString()}

【先物カーブ状況】
${curveSummary}

【ポジション内訳】
${positionSummary}

以下の形式で分析してください：

## 市況分析
（2-3文で現在の市況を説明）

## リスク警告
- （重要なリスク1）
- （重要なリスク2）
- （重要なリスク3）

## 推奨アクション
1. （具体的なアクション1）
2. （具体的なアクション2）
3. （具体的なアクション3）

**注意**:
- 専門的かつ簡潔に
- 数値を具体的に引用
- 実行可能なアクションを提示`
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
  
  return `## 市況分析
現在のNet Positionは${netPosition}mt、MTM Valueは$${mtmValue.toLocaleString()}となっています。先物カーブはBackwardation傾向を示しており、短期需給が逼迫している可能性があります。Loan Outstandingが$${loanOutstanding.toLocaleString()}と比較的高いため、流動性管理に注意が必要です。

## リスク警告
- Net Positionが${netPosition > 0 ? 'プラス' : 'マイナス'}${Math.abs(netPosition)}mtと${Math.abs(netPosition) > 300 ? '大きく' : '中程度に'}偏っているため、価格変動リスクに注意が必要です
- Loan Outstandingが$${loanOutstanding.toLocaleString()}と高水準のため、金利上昇リスクを監視してください
- 先物カーブのBackwardation構造は在庫不足を示唆している可能性があります

## 推奨アクション
1. Net Positionを${Math.abs(netPosition) > 300 ? '削減' : '最適化'}し、リスクエクスポージャーを管理する
2. Loan Outstandingの返済計画を再検討し、金利コストを最適化する
3. 先物カーブの動向を継続的に監視し、在庫状況を確認する`
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

