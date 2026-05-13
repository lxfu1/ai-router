// 数据库入口 - 向后兼容层
// 默认使用 SQLite（同步），当 DATABASE_TYPE=postgres 时使用 PostgreSQL（异步）
// 业务代码通过 db proxy 访问数据库，自动初始化 schema

import { getDatabase } from './database/index'
import type { DatabaseAdapter } from './database/types'

let _schemaInitialized = false

function ensureSchema(adapter: DatabaseAdapter): void {
  if (_schemaInitialized) return
  _schemaInitialized = true
  adapter.initSchema()
}

/**
 * 同步数据库代理（SQLite 模式）
 * 保持与原有 db.prepare().get/run/all 的兼容性
 * 
 * 用法不变：
 *   db.prepare('SELECT * FROM channels').all()
 *   db.prepare('INSERT INTO ...').run(...)
 */
export const db = new Proxy({} as any, {
  get(_target, prop) {
    if (typeof window !== 'undefined') return undefined
    const adapter = getDatabase()
    ensureSchema(adapter)

    // 代理 db.prepare() 调用
    if (prop === 'prepare') {
      return (sql: string) => {
        return {
          get: (...params: unknown[]) => adapter.get(sql, ...params),
          all: (...params: unknown[]) => adapter.all(sql, ...params),
          run: (...params: unknown[]) => adapter.run(sql, ...params),
        }
      }
    }

    // 代理 db.exec() 调用
    if (prop === 'exec') {
      return (sql: string) => adapter.exec(sql)
    }

    // 代理 db.pragma() 调用（仅 SQLite 支持，PostgreSQL 模式下忽略）
    if (prop === 'pragma') {
      return () => {} // no-op for compatibility
    }

    return undefined
  },
})

/**
 * 获取底层数据库适配器
 * 用于需要异步操作（PostgreSQL）的场景
 */
export function getDbAdapter(): DatabaseAdapter {
  const adapter = getDatabase()
  ensureSchema(adapter)
  return adapter
}

/**
 * 初始化数据库 Schema
 */
export function initSchema(): void {
  const adapter = getDatabase()
  adapter.initSchema()
}

// 向后兼容：保留 getDb 函数（仅 SQLite 模式有效）
export function getDb() {
  const adapter = getDatabase()
  ensureSchema(adapter)
  // 对于 SQLiteDatabase，尝试获取底层 better-sqlite3 实例
  if (adapter instanceof require('./database/sqlite').SQLiteDatabase) {
    return (adapter as any).getDb()
  }
  throw new Error('getDb() is only available in SQLite mode. Use getDbAdapter() instead.')
}