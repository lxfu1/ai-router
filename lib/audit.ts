// 审计日志模块
// 记录管理后台的所有关键操作

import { db } from './db'
import { createLogger } from './logger'

const logger = createLogger('Audit')

export interface AuditLog {
  id: number
  action: string
  actor: string
  resource_type: string
  resource_id: string | null
  detail: string | null
  ip_address: string | null
  created_at: string
}

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'channel_create'
  | 'channel_update'
  | 'channel_delete'
  | 'channel_toggle'
  | 'channel_health_check'
  | 'key_create'
  | 'key_toggle'
  | 'key_balance_update'
  | 'key_delete'
  | 'config_update'

/**
 * 记录审计日志
 */
export function logAudit(params: {
  action: AuditAction | string
  actor?: string
  resource_type: string
  resource_id?: string | number | null
  detail?: string | null
  ip_address?: string | null
}) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (action, actor, resource_type, resource_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      params.action,
      params.actor || 'system',
      params.resource_type,
      String(params.resource_id ?? ''),
      params.detail || null,
      params.ip_address || null
    )
  } catch (err) {
    // 审计日志写入失败不应影响业务流程
    logger.error('Failed to write audit log', { error: (err as Error).message })
  }
}

/**
 * 查询审计日志
 */
export function getAuditLogs(params: {
  page?: number
  pageSize?: number
  action?: string
  resource_type?: string
  startDate?: string
  endDate?: string
}): { logs: AuditLog[]; total: number } {
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const offset = (page - 1) * pageSize

  let where = '1=1'
  const args: unknown[] = []

  if (params.action) { where += ' AND action = ?'; args.push(params.action) }
  if (params.resource_type) { where += ' AND resource_type = ?'; args.push(params.resource_type) }
  if (params.startDate) { where += ' AND created_at >= ?'; args.push(params.startDate) }
  if (params.endDate) { where += ' AND created_at <= ?'; args.push(params.endDate + ' 23:59:59') }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM audit_logs WHERE ${where}`).get(...args) as { c: number }).c
  const logs = db.prepare(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset) as AuditLog[]

  return { logs, total }
}