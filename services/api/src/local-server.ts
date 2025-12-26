import http from 'http'
import { handler as dashboardHandler } from './handlers/dashboard'
import { handler as tradesHandler } from './handlers/trades'
import { handler as deliveriesHandler } from './handlers/deliveries'
import { handler as positionsHandler } from './handlers/positions'
import { handler as curveHandler } from './handlers/curve'
import { handler as seriesHandler } from './handlers/series'
import { handler as adminSeedHandler } from './handlers/admin-seed'

const PORT = process.env.PORT || 3001

// 環境変数設定（ローカル開発用）
process.env.DB_HOST = process.env.DB_HOST || 'localhost'
process.env.DB_NAME = process.env.DB_NAME || 'rathi_tin'
process.env.DB_USER = process.env.DB_USER || 'postgres'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'localpassword'

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const path = url.pathname
  const method = req.method || 'GET'

  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // リクエストボディの読み取り
  let body = ''
  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', async () => {
    // API Gateway形式のイベントを作成
    const event = {
      httpMethod: method,
      path,
      pathParameters: null,
      queryStringParameters: Object.fromEntries(url.searchParams),
      headers: req.headers as any,
      body: body || null,
      isBase64Encoded: false,
      requestContext: {
        requestId: 'local-request',
        stage: 'local',
      },
    } as any

    let handler: any = null

    // ルーティング
    if (path === '/v1/dashboard' && method === 'GET') {
      handler = dashboardHandler
    } else if (path === '/v1/trades' && method === 'GET') {
      handler = tradesHandler
    } else if (path === '/v1/deliveries' && method === 'GET') {
      handler = deliveriesHandler
    } else if (path === '/v1/positions' && method === 'GET') {
      handler = positionsHandler
    } else if (path === '/v1/curve' && method === 'GET') {
      handler = curveHandler
    } else if (path === '/v1/series' && method === 'GET') {
      handler = seriesHandler
    } else if (path === '/v1/admin/seed' && method === 'POST') {
      handler = adminSeedHandler
    } else if (path === '/v1/explain/dashboard' && method === 'POST') {
      handler = explainHandler
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not Found' }))
      return
    }

    try {
      const response = await handler(event)
      res.writeHead(response.statusCode, response.headers)
      res.end(response.body)
    } catch (error: any) {
      console.error('Handler error:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error.message }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`)
  console.log(`📊 Available endpoints:`)
  console.log(`   GET  /v1/dashboard?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/trades?from=...&to=...`)
  console.log(`   GET  /v1/deliveries?from=...&to=...`)
  console.log(`   GET  /v1/positions?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/curve?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/series?metric=...&from=...&to=...`)
  console.log(`   POST /v1/admin/seed`)
})



