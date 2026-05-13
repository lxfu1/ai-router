// 数据库抽象层
// 支持 SQLite（默认）和 PostgreSQL，通过 DATABASE_TYPE 环境变量切换
// 统一接口，业务代码无需关心底层实现

import type { DatabaseAdapter, QueryResult } from './types'
import { SQLiteDatabase } from './sqlite'
import { PostgreSQLDatabase } from './postgresql'

export type { DatabaseAdapter, QueryResult }

let _instance: DatabaseAdapter | null = null

/**
 * 获取数据库适配器实例（单例）
 */
export function getDatabase(): DatabaseAdapter {
  if (_instance) return _instance

  const dbType = (process.env.DATABASE_TYPE || 'sqlite').toLowerCase()

  switch (dbType) {
    case 'postgres':
    case 'postgresql':
      _instance = new PostgreSQLDatabase()
      break
    case 'sqlite':
    default:
      _instance = new SQLiteDatabase()
      break
  }

  return _instance
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (_instance) {
    await _instance.close()
    _instance = null
  }
}