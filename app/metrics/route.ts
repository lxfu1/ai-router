import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

import { generatePrometheusOutput, setGauge } from '@/lib/metrics'
import { db } from '@/lib/db'

/**
 * GET /metrics
 * Prometheus 指标端点
 * 可通过 METRICS_AUTH_TOKEN 环境变量设置访问令牌
 */
export async function GET(request: NextRequest) {
  // 可选的认证保护
  const metricsToken = process.env.METRICS_AUTH_TOKEN
  if (metricsToken) {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const queryToken = request.nextUrl.searchParams.get('token')
    if (bearerToken !== metricsToken && queryToken !== metricsToken) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  // 更新实时指标
  try {
    const channelCount = (db.prepare('SELECT COUNT(*) as c FROM channels WHERE enabled = 1 AND healthy = 1').get() as { c: number })?.c ?? 0
    const keyCount = (db.prepare('SELECT COUNT(*) as c FROM api_keys WHERE enabled = 1').get() as { c: number })?.c ?? 0
    setGauge('ai_router_channels_active', {}, channelCount)
    setGauge('ai_router_keys_active', {}, keyCount)
  } catch {
    // 数据库查询失败不影响指标输出
  }

  const output = generatePrometheusOutput()
  return new Response(output, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}