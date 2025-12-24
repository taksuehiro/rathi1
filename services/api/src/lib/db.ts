import { Pool } from 'pg'
import { getDbCredentials } from './secrets'

let pool: Pool | null = null

export const getPool = async () => {
  if (!pool) {
    let host = process.env.DB_HOST
    let database = process.env.DB_NAME
    let user = process.env.DB_USER
    let password = process.env.DB_PASSWORD

    // AWS環境ではSecrets Managerから取得
    if (process.env.DB_SECRET_NAME && !host) {
      const credentials = await getDbCredentials()
      host = credentials.host || process.env.DB_HOST
      database = credentials.dbname || process.env.DB_NAME
      user = credentials.username || process.env.DB_USER
      password = credentials.password || process.env.DB_PASSWORD
    }

    pool = new Pool({
      host: host || 'localhost',
      port: 5432,
      database: database || 'rathi_tin',
      user: user || 'postgres',
      password: password || 'localpassword',
      max: 1,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    })
  }
  return pool
}

export const query = async (text: string, params?: any[]) => {
  const pool = await getPool()
  return pool.query(text, params)
}

// Lambda終了時のクリーンアップ
process.on('SIGTERM', async () => {
  if (pool) await pool.end()
})

