// Next.js Middleware - 处理 CORS
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
} as const

export function middleware(request: NextRequest) {
  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
  }

  // 添加 CORS 头到响应
  const response = NextResponse.next()
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

// 只匹配 /v1/* 路径
export const config = {
  matcher: ['/v1/:path*'],
}