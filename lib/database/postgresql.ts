// PostgreSQL 数据库适配器
// 通过 pg 库连接 PostgreSQL，实现与 SQLite 相同的接口

import type { DatabaseAdapter, QueryResult } from './types'
import { encrypt } from '../crypto'

// 动态导入 pg，因为不是所有环境都需要
let pgModule: any = null

async function loadPg() {
  if (pgModule) return pgModule
  try {
    pgModule = await import('pg')
    return pgModule
  } catch {
    throw new Error(
      'PostgreSQL driver (pg) is not installed. Run: npm install pg'
    )
  }
}

export class PostgreSQLDatabase implements DatabaseAdapter {
  private pool: any = null
  private schemaInitialized = false

  private async getPool(): Promise<any> {
    if (this.pool) return this.pool

    const { Pool } = await loadPg()
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL')
    }

    this.pool = new Pool({ connectionString, max: 10 })
    return this.pool
  }

  exec(sql: string): void {
    // PostgreSQL 的 exec 需要异步，这里用同步包装
    // 对于 schema 初始化，使用 initSchema 中的异步方式
    throw new Error('Use initSchema() for DDL statements in PostgreSQL mode')
  }

  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
    // PostgreSQL 需要异步查询，这里提供同步兼容
    // 实际使用中，业务代码已改为使用 allAsync
    throw new Error('Use allAsync() for PostgreSQL queries')
  }

  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
    throw new Error('Use getAsync() for PostgreSQL queries')
  }

  run(sql: string, ...params: unknown[]): QueryResult {
    throw new Error('Use runAsync() for PostgreSQL queries')
  }

  // 异步方法
  async allAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
    const pool = await this.getPool()
    // 将 SQLite 的 ? 占位符转换为 PostgreSQL 的 $1, $2 格式
    const { query, values } = this.convertPlaceholders(sql, params)
    const result = await pool.query(query, values)
    return result.rows as T[]
  }

  async getAsync<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    const pool = await this.getPool()
    const { query, values } = this.convertPlaceholders(sql, params)
    const result = await pool.query(query, values)
    return result.rows[0] as T | undefined
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<QueryResult> {
    const pool = await this.getPool()
    const { query, values } = this.convertPlaceholders(sql, params)
    const result = await pool.query(query, values)
    return {
      lastInsertRowid: result.rows[0]?.id ?? 0,
      changes: result.rowCount ?? 0,
    }
  }

  /**
   * 将 SQLite 的 ? 占位符转换为 PostgreSQL 的 $1, $2 格式
   */
  private convertPlaceholders(sql: string, params: unknown[]): { query: string; values: unknown[] } {
    let index = 1
    const query = sql.replace(/\?/g, () => `$${index++}`)
    return { query, values: params }
  }

  async initSchema(): Promise<void> {
    if (this.schemaInitialized) return
    this.schemaInitialized = true

    const pool = await this.getPool()

    await pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        base_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        model_name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        priority INTEGER NOT NULL DEFAULT 0,
        rate_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        max_tokens INTEGER NOT NULL DEFAULT 4096,
        healthy INTEGER NOT NULL DEFAULT 1,
        last_check_at TEXT,
        latency_ms INTEGER,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
        updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_value TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        balance DOUBLE PRECISION NOT NULL DEFAULT 0,
        used_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
        updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
      );

      CREATE TABLE IF NOT EXISTS request_logs (
        id SERIAL PRIMARY KEY,
        request_id TEXT NOT NULL,
        api_key_id INTEGER NOT NULL REFERENCES api_keys(id),
        channel_id INTEGER NOT NULL REFERENCES channels(id),
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        cost DOUBLE PRECISION NOT NULL DEFAULT 0,
        latency_ms INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'success',
        error_message TEXT,
        is_stream INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'system',
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        detail TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
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
    const countResult = await pool.query('SELECT COUNT(*) as c FROM channels')
    if (parseInt(countResult.rows[0].c) === 0) {
      const insertSql = `
        INSERT INTO channels (name, provider, base_url, api_key, model_name, rate_multiplier, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (name) DO NOTHING
      `
      await pool.query(insertSql, ['DeepSeek V4', 'deepseek',
        process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
        encrypt(process.env.DEEPSEEK_API_KEY || ''),
        'deepseek-v4-pro', 1.0, 1])
      await pool.query(insertSql, ['智谱 GLM-5', 'zhipu',
        process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
        encrypt(process.env.ZHIPU_API_KEY || ''),
        'glm-5', 1.2, 2])
      await pool.query(insertSql, ['通义千问 qwen-plus', 'qwen',
        process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        encrypt(process.env.QWEN_API_KEY || ''),
        'qwen-plus', 0.8, 3])
      await pool.query(insertSql, ['MiniMax M2.7', 'minimax',
        process.env.MINIMAX_BASE_URL || 'https://api.minimaxi.com/v1',
        encrypt(process.env.MINIMAX_API_KEY || ''),
        'MiniMax-M2.7', 1.0, 4])
    }

    // 迁移：加密旧的明文 API Key
    try {
      const channels = await pool.query('SELECT id, api_key FROM channels')
      for (const ch of channels.rows) {
        if (ch.api_key && !ch.api_key.includes(':')) {
          await pool.query('UPDATE channels SET api_key = $1 WHERE id = $2', [encrypt(ch.api_key), ch.id])
        }
      }
    } catch {
      // 迁移失败不影响启动
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
    }
  }
}