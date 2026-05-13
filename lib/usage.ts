import type { RequestLog, LogQueryParams, UsageStats } from '@/types'
import { db } from './db'

export function logRequest(log: Omit<RequestLog, 'id' | 'created_at'>) {
  db.prepare(`
    INSERT INTO request_logs (request_id, api_key_id, channel_id, model, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, status, error_message, is_stream)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    log.request_id, log.api_key_id, log.channel_id, log.model,
    log.prompt_tokens, log.completion_tokens, log.total_tokens, log.cost,
    log.latency_ms, log.status, log.error_message, log.is_stream
  )
}

export function getLogs(params: LogQueryParams): { logs: RequestLog[]; total: number } {
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const offset = (page - 1) * pageSize

  let where = '1=1'
  const args: unknown[] = []

  if (params.model) { where += ' AND model = ?'; args.push(params.model) }
  if (params.status) { where += ' AND status = ?'; args.push(params.status) }
  if (params.keyId) { where += ' AND api_key_id = ?'; args.push(params.keyId) }
  if (params.startDate) { where += ' AND created_at >= ?'; args.push(params.startDate) }
  if (params.endDate) { where += ' AND created_at <= ?'; args.push(params.endDate + ' 23:59:59') }

  const total = (db.prepare(`SELECT COUNT(*) as c FROM request_logs WHERE ${where}`).get(...args) as { c: number }).c
  const logs = db.prepare(
    `SELECT * FROM request_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...args, pageSize, offset) as RequestLog[]

  return { logs, total }
}

export function getStats(): UsageStats {
  // 使用本地时区获取今天的日期（解决时区问题）
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
  
  // 计算30天前的日期
  const thirtyDaysAgoDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  const thirtyDaysAgo = thirtyDaysAgoDate.toISOString().split('T')[0]

  const totalRequests = (db.prepare('SELECT COUNT(*) as c FROM request_logs').get() as { c: number }).c
  // 今日统计使用 datetime 比较，避免隐式转换
  const todayRequests = (db.prepare(
    "SELECT COUNT(*) as c FROM request_logs WHERE created_at >= datetime(?, 'start of day')"
  ).get(today) as { c: number }).c
  const totalTokens = (db.prepare('SELECT COALESCE(SUM(total_tokens), 0) as s FROM request_logs').get() as { s: number }).s
  const totalCost = (db.prepare('SELECT COALESCE(SUM(cost), 0) as s FROM request_logs').get() as { s: number }).s
  const totalKeys = (db.prepare('SELECT COUNT(*) as c FROM api_keys').get() as { c: number }).c
  const activeKeys = (db.prepare('SELECT COUNT(*) as c FROM api_keys WHERE enabled = 1').get() as { c: number }).c
  const errorRate = totalRequests > 0
    ? (db.prepare("SELECT COUNT(*) as c FROM request_logs WHERE status = 'error'").get() as { c: number }).c / totalRequests
    : 0

  // 模型统计：按实际渠道模型名分组（而不是用户请求的 model 别名）
  // 通过 channel_id 关联 channels 表获取真实模型名
  const rawModelStats = db.prepare(`
    SELECT 
      COALESCE(c.model_name, r.model) as model, 
      COUNT(*) as count, 
      SUM(r.total_tokens) as tokens, 
      SUM(r.cost) as cost,
      AVG(r.latency_ms) as avg_latency
    FROM request_logs r
    LEFT JOIN channels c ON r.channel_id = c.id
    GROUP BY COALESCE(c.model_name, r.model)
    ORDER BY count DESC
  `).all() as { model: string; count: number; tokens: number; cost: number; avg_latency: number }[]

  // 合并大小写不一致的模型名
  const modelMap = new Map<string, { model: string; count: number; tokens: number; cost: number; avg_latency: number }>()
  for (const stat of rawModelStats) {
    // 统一转小写对比，但保留首次出现的显示名称
    const key = stat.model.toLowerCase()
    const existing = modelMap.get(key)
    if (existing) {
      existing.count += stat.count
      existing.tokens += stat.tokens
      existing.cost += stat.cost
      // 加权平均延迟
      existing.avg_latency = (existing.avg_latency * existing.count + stat.avg_latency * stat.count) / (existing.count + stat.count)
    } else {
      modelMap.set(key, { ...stat })
    }
  }
  const modelStats = Array.from(modelMap.values()).sort((a, b) => b.count - a.count)

  // 填充缺失日期，确保30天连续
  const rawDailyStats = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_tokens) as tokens, SUM(cost) as cost
    FROM request_logs WHERE created_at >= datetime(?, 'start of day') 
    GROUP BY DATE(created_at) ORDER BY date
  `).all(thirtyDaysAgo) as { date: string; count: number; tokens: number; cost: number }[]
  
  // 补充缺失的日期为0
  const dailyStats: { date: string; count: number; tokens: number; cost: number }[] = []
  const statMap = new Map(rawDailyStats.map(s => [s.date, s]))
  
  for (let i = 0; i <= 30; i++) {
    const d = new Date(thirtyDaysAgoDate.getFullYear(), thirtyDaysAgoDate.getMonth(), thirtyDaysAgoDate.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const stat = statMap.get(dateStr)
    dailyStats.push(stat || { date: dateStr, count: 0, tokens: 0, cost: 0 })
  }

  return {
    totalRequests, todayRequests, totalTokens, totalCost,
    totalKeys, activeKeys, errorRate,
    modelStats, dailyStats,
  }
}