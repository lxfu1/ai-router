// 数据库适配器类型定义

export interface QueryResult {
  lastInsertRowid?: number | bigint
  changes?: number
}

export interface DatabaseAdapter {
  /**
   * 执行无返回值的 SQL 语句（CREATE TABLE, CREATE INDEX 等）
   */
  exec(sql: string): void

  /**
   * 执行查询，返回所有匹配行
   */
  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[]

  /**
   * 执行查询，返回第一行
   */
  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined

  /**
   * 执行写操作（INSERT, UPDATE, DELETE），返回结果
   */
  run(sql: string, ...params: unknown[]): QueryResult

  /**
   * 初始化数据库 Schema
   */
  initSchema(): void

  /**
   * 关闭数据库连接
   */
  close(): Promise<void>
}