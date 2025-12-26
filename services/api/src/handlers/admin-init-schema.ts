import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { getPool } from '../lib/db'
import * as fs from 'fs'
import * as path from 'path'

// ⚠️ 重要: Lambda実行時のパス解決
// __dirnameはビルド後のdistディレクトリを指す
const migrationsDir = path.join(__dirname, '../migrations')

/**
 * マイグレーションファイルを読み込んで実行
 */
async function runMigration(filename: string): Promise<void> {
  const migrationPath = path.join(migrationsDir, filename)
  
  // ファイル存在確認
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${filename}`)
  }

  // SQLファイルを読み込み
  const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
  
  // プールからクライアントを取得
  const pool = await getPool()
  const client = await pool.connect()
  
  try {
    // トランザクション開始
    await client.query('BEGIN')
    
    // セミコロンで分割して順次実行
    // 注意: セミコロンはSQL文の区切り文字として使用
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Executing migration: ${filename} (${statements.length} statements)`)
    
    for (const statement of statements) {
      if (statement.length > 0) {
        await client.query(statement)
      }
    }
    
    // コミット
    await client.query('COMMIT')
    console.log(`Migration completed: ${filename}`)
  } catch (error: any) {
    // ロールバック
    await client.query('ROLLBACK')
    console.error(`Migration failed: ${filename}`, error)
    throw new Error(`Migration ${filename} failed: ${error.message}`)
  } finally {
    client.release()
  }
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
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // イベントパラメータからマイグレーション版を取得
    // bodyがJSON文字列の場合とオブジェクトの場合の両方に対応
    let body: any = {}
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
      } catch (e) {
        // JSONパースに失敗した場合は空オブジェクト
      }
    }
    
    const version = body.migrationVersion || event.queryStringParameters?.migrationVersion || 'all'
    
    const executedMigrations: string[] = []
    
    // ⚠️ 'all'の場合は001→002の順序で実行
    if (version === 'all' || version === '001') {
      await runMigration('001_initial_schema.sql')
      executedMigrations.push('001')
    }
    
    if (version === 'all' || version === '002') {
      await runMigration('002_add_position_limits.sql')
      executedMigrations.push('002')
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Migration executed successfully',
        version,
        executedMigrations
      }),
    }
  } catch (error: any) {
    console.error('Migration error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: { 
          code: 'MIGRATION_ERROR', 
          message: error.message,
          details: error.stack
        } 
      }),
    }
  }
}



