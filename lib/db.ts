import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let _db: Database.Database | null = null
let _initialized = false

export function getDb(): Database.Database {
  if (_db) return _db

  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const globalForDb = globalThis as unknown as { db: Database.Database | undefined }
  _db = globalForDb.db ?? new Database(path.join(dataDir, 'ai-router.db'))

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.db = _db
  }

  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  return _db
}

export function initSchema() {
  if (_initialized) return
  _initialized = true

  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      rate_multiplier REAL NOT NULL DEFAULT 1.0,
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      healthy INTEGER NOT NULL DEFAULT 1,
      last_check_at TEXT,
      latency_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_value TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      used_balance REAL NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      api_key_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      is_stream INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id)
    );

    CREATE INDEX IF NOT EXISTS idx_request_logs_api_key ON request_logs(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_request_logs_channel ON request_logs(channel_id);
    CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model);
  `)

  const count = db.prepare('SELECT COUNT(*) as c FROM channels').get() as { c: number }
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO channels (name, provider, base_url, api_key, model_name, rate_multiplier, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insert.run(
      'DeepSeek V4', 'deepseek',
      process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      process.env.DEEPSEEK_API_KEY || '',
      'deepseek-v4-pro', 1.0, 1
    )
    insert.run(
      '智谱 GLM-5', 'zhipu',
      process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      process.env.ZHIPU_API_KEY || '',
      'glm-5', 1.2, 2
    )
    insert.run(
      '通义千问 qwen-plus', 'qwen',
      process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      process.env.QWEN_API_KEY || '',
      'qwen-plus', 0.8, 3
    )
    insert.run(
      'MiniMax M2.7', 'minimax',
      process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
      process.env.MINIMAX_API_KEY || '',
      'MiniMax-M2.7', 1.0, 4
    )
  }
}

export const db = new Proxy({} as Database.Database, {
  get(_target, prop) {
    if (typeof window !== 'undefined') return undefined
    initSchema()
    return (getDb() as any)[prop]
  },
})