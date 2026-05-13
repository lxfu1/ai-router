// CORS 配置模块
// 支持通过环境变量 CORS_ALLOWED_ORIGINS 配置白名单
// 多个来源用逗号分隔，例如: https://app.example.com,https://admin.example.com
// 留空或未设置则默认允许所有来源（兼容旧配置）

/**
 * 获取允许的 Origin 列表
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  if (!envOrigins || envOrigins.trim() === '' || envOrigins.trim() === '*') {
    return [] // 空数组表示允许所有
  }
  return envOrigins.split(',').map(o => o.trim()).filter(o => o.length > 0)
}

/**
 * 判断请求 Origin 是否被允许
 */
function isOriginAllowed(origin: string): boolean {
  const allowed = getAllowedOrigins()
  if (allowed.length === 0) return true // 未配置白名单则允许所有
  return allowed.includes(origin)
}

/**
 * 获取 CORS 响应头
 * 根据 Origin 动态设置 Access-Control-Allow-Origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()

  // 未配置白名单，允许所有来源
  if (allowedOrigins.length === 0) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }

  // 有白名单配置
  const origin = requestOrigin || ''
  if (isOriginAllowed(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    }
  }

  // Origin 不在白名单中，不设置 Allow-Origin（浏览器会阻止）
  return {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}