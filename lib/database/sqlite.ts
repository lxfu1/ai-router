// SQLite 数据库适配器
// 使用 better-sqlite3，保持与原有实现兼容

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import type { DatabaseAdapter, QueryResult } from './types'
import { encrypt } from '../crypto'

export class SQLiteDatabase implements DatabaseAdapter {
  private db: Database.Database | null = null
  private schemaInitialized = false

  private getDb(): Database.Database {
    if (this.db) return this.db

    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    const globalForDb = globalThis as unknown as { db: Database.Database | undefined }
    this.db = globalForDb.db ?? new Database(path.join(dataDir, 'ai-router.db'))

    if (process.env.NODE_ENV !== 'production') {
      globalForDb.db = this.db
    }

    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')

    return this.db
  }

  exec(sql: string): void {
    this.getDb().exec(sql)
  }

  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
    return this.getDb().prepare(sql).all(...params) as T[]
  }

  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
    return this.getDb().prepare(sql).get(...params) as T | undefined
  }

  run(sql: string, ...params: unknown[]): QueryResult {
    const result = this.getDb().prepare(sql).run(...params)
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes,
    }
  }

  initSchema(): void {
    if (this.schemaInitialized) return
    this.schemaInitialized = true

    this.exec(`
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

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system',
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        detail TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_request_logs_api_key ON request_logs(api_key_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_channel ON request_logs(channel_id);
      CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_request_logs_model ON request_logs(model);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
    `)

    // 插入默认渠道
    const count = this.get<{ c: number }>('SELECT COUNT(*) as c FROM channels')
    if (count && count.c === 0) {
      const insertSql = `
        INSERT OR IGNORE INTO channels (name, provider, base_url, api_key, model_name, rate_multiplier, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
      this.run(insertSql, 'DeepSeek V4', 'deepseek',
        process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        encrypt(process.env.DEEPSEEK_API_KEY || ''),
        'deepseek-v4-pro', 1.0, 1)
      this.run(insertSql, '智谱 GLM-5', 'zhipu',
        process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        encrypt(process.env.ZHIPU_API_KEY || ''),
        'glm-5', 1.2, 2)
      this.run(insertSql, '通义千问 qwen-plus', 'qwen',
        process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        encrypt(process.env.QWEN_API_KEY || ''),
        'qwen-plus', 0.8, 3)
      this.run(insertSql, 'MiniMax M2.7', 'minimax',
        process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
        encrypt(process.env.MINIMAX_API_KEY || ''),
        'MiniMax-M2.7', 1.0, 4)
    }

    // 迁移：加密旧的明文 API Key
    this.migrateEncryptApiKeys()
  }

  private migrateEncryptApiKeys(): void {
    try {
      const channels = this.all<{ id: number; api_key: string }>('SELECT id, api_key FROM channels')
      for (const ch of channels) {
        if (ch.api_key && !ch.api_key.includes(':')) {
          this.run('UPDATE channels SET api_key = ? WHERE id = ?', encrypt(ch.api_key), ch.id)
        }
      }
    } catch {
      // 迁移失败不影响启动
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}