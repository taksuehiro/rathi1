import http from 'http'

const PORT = process.env.PORT || 3001

// モックデータ
const mockDashboard = {
  asOf: '2026-07-05',
  valuation: {
    netPositionMt: 350,
    mtmValueUsd: 9800000,
    refTenorMonths: 0,
    futuresPriceUsd: 28000,
  },
  components: [
    { componentCode: 'INVENTORY_ON_HAND', qtyMt: 150, amountUsd: null },
    { componentCode: 'IN_TRANSIT', qtyMt: 50, amountUsd: null },
    { componentCode: 'OPEN_PURCHASE', qtyMt: 200, amountUsd: null },
    { componentCode: 'OPEN_SALES', qtyMt: -100, amountUsd: null },
    { componentCode: 'FUTURES_LME_NET', qtyMt: 50, amountUsd: null },
    { componentCode: 'OTC_NET', qtyMt: 0, amountUsd: null },
    { componentCode: 'LOAN_OUTSTANDING_USD', qtyMt: null, amountUsd: 5000000 },
  ],
  curve: [
    { tenorMonths: 0, futuresPriceUsd: 28000 },
    { tenorMonths: 1, futuresPriceUsd: 27950 },
    { tenorMonths: 2, futuresPriceUsd: 27900 },
    { tenorMonths: 3, futuresPriceUsd: 27850 },
    { tenorMonths: 4, futuresPriceUsd: 27800 },
    { tenorMonths: 5, futuresPriceUsd: 27750 },
    { tenorMonths: 6, futuresPriceUsd: 27700 },
  ],
}

const mockSeries = {
  metric: 'netPositionMt',
  from: '2026-01-01',
  to: '2026-07-05',
  data: [
    { date: '2026-01-31', periodType: 'M', value: 300 },
    { date: '2026-02-28', periodType: 'M', value: 310 },
    { date: '2026-03-31', periodType: 'M', value: 320 },
    { date: '2026-04-30', periodType: 'M', value: 330 },
    { date: '2026-05-31', periodType: 'M', value: 340 },
    { date: '2026-06-30', periodType: 'M', value: 350 },
    { date: '2026-07-01', periodType: 'D', value: 350 },
    { date: '2026-07-02', periodType: 'D', value: 350 },
    { date: '2026-07-03', periodType: 'D', value: 350 },
    { date: '2026-07-04', periodType: 'D', value: 350 },
    { date: '2026-07-05', periodType: 'D', value: 350 },
  ],
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)
  const path = url.pathname

  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // ルーティング
  if (path === '/v1/dashboard' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify(mockDashboard))
  } else if (path === '/v1/series' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify(mockSeries))
  } else if (path === '/v1/positions' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({
      asOf: url.searchParams.get('asOf') || '2026-07-05',
      components: mockDashboard.components,
    }))
  } else if (path === '/v1/curve' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({
      asOf: url.searchParams.get('asOf') || '2026-07-05',
      curve: mockDashboard.curve,
    }))
  } else if (path === '/v1/trades' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({ trades: [] }))
  } else if (path === '/v1/deliveries' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({ deliveries: [] }))
  } else if (path === '/v1/admin/seed' && req.method === 'POST') {
    res.writeHead(200)
    res.end(JSON.stringify({ success: true, message: 'Mock data (no database)' }))
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})

server.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`)
  console.log(`📊 Using mock data (no database required)`)
  console.log(`\nAvailable endpoints:`)
  console.log(`   GET  /v1/dashboard?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/series?metric=...&from=...&to=...`)
  console.log(`   GET  /v1/positions?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/curve?asOf=YYYY-MM-DD`)
  console.log(`   GET  /v1/trades`)
  console.log(`   GET  /v1/deliveries`)
  console.log(`   POST /v1/admin/seed`)
})






