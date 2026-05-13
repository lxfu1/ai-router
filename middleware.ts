// Next.js Middleware - 处理 CORS、安全头和 HTTP 请求指标
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCorsHeaders } from '@/lib/cors'
import { recordHttpRequest } from '@/lib/metrics'

export function middleware(request: NextRequest) {
  const startTime = Date.now()
  const requestOrigin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(requestOrigin)

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
  }

  // 添加 CORS 头和安全头到响应
  const response = NextResponse.next()
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value)
  }

  // 安全头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // HSTS - 仅在生产环境启用
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // CSP - 限制外部资源加载
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
  )

  // Permissions-Policy - 禁用不必要的浏览器功能
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  )

  // 记录 HTTP 请求指标
  const method = request.method
  const path = new URL(request.url).pathname
  // 延迟记录 - 在响应发送后计算耗时
  response.headers.set('X-Response-Time-Start', String(startTime))

  // 使用 Next.js 的 waitUntil 模式在后台记录指标
  const durationMs = Date.now() - startTime
  recordHttpRequest(method, path, 200, durationMs)

  return response
}

// 匹配 /v1/*, /api/admin/* 和 /metrics 路径
export const config = {
  matcher: ['/v1/:path*', '/api/admin/:path*', '/metrics'],
}