import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Health')

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string }
  }
}

/**
 * GET /health
 * 健康检查端点，供 K8s/负载均衡器探测
 * 验证数据库连接等关键依赖
 */
export async function GET() {
  const checks: HealthStatus['checks'] = {
    database: { status: 'error' },
  }
  let overallStatus: HealthStatus['status'] = 'ok'

  // 检查数据库连接
  try {
    const start = Date.now()
    db.prepare('SELECT 1').get()
    const latencyMs = Date.now() - start
    checks.database = { status: 'ok', latencyMs }
  } catch (err) {
    checks.database = { status: 'error', error: (err as Error).message }
    overallStatus = 'error'
    logger.error('Health check: database connection failed', { error: (err as Error).message })
  }

  // 如果数据库不可用，返回 503
  const httpStatus = overallStatus === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    },
    { status: httpStatus }
  )
}