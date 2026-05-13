// 启动时安全检查
// 检测不安全配置并在控制台发出警告

import { createLogger } from './logger'

const logger = createLogger('Security')

export function runSecurityChecks() {
  const checks: { passed: boolean; prefix: string; message: string }[] = []

  // 1. 检查管理员密码是否为默认值
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || adminPassword === 'admin123') {
    checks.push({
      passed: false,
      prefix: 'ADMIN_PASSWORD',
      message: '管理员密码使用默认值 "admin123"，请在环境变量中设置强密码！',
    })
  } else {
    checks.push({ passed: true, prefix: 'ADMIN_PASSWORD', message: '已配置自定义管理员密码' })
  }

  // 2. 检查 JWT 密钥是否为默认值
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret === 'ai-router-secret-2024' || jwtSecret === 'change-this-to-a-random-string') {
    checks.push({
      passed: false,
      prefix: 'JWT_SECRET',
      message: 'JWT 密钥使用默认值，请在环境变量中设置随机密钥！',
    })
  } else {
    checks.push({ passed: true, prefix: 'JWT_SECRET', message: '已配置自定义 JWT 密钥' })
  }

  // 3. 检查加密密钥
  const encKey = process.env.ENCRYPTION_KEY
  if (!encKey) {
    checks.push({
      passed: true,
      prefix: 'ENCRYPTION_KEY',
      message: '未设置独立加密密钥，将从 JWT_SECRET 派生。建议设置 ENCRYPTION_KEY（openssl rand -hex 32）',
    })
  } else if (encKey.length !== 64) {
    checks.push({
      passed: false,
      prefix: 'ENCRYPTION_KEY',
      message: 'ENCRYPTION_KEY 长度不正确，需要 64 个十六进制字符（32 字节）',
    })
  } else {
    checks.push({ passed: true, prefix: 'ENCRYPTION_KEY', message: '已配置独立加密密钥' })
  }

  // 4. 检查 CORS 配置
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
  if (!corsOrigins || corsOrigins === '*') {
    checks.push({
      passed: true,
      prefix: 'CORS',
      message: 'CORS 允许所有来源（*）。生产环境建议设置 CORS_ALLOWED_ORIGINS 白名单',
    })
  } else {
    checks.push({ passed: true, prefix: 'CORS', message: `CORS 白名单已配置: ${corsOrigins}` })
  }

  // 5. 检查限流是否启用
  const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED
  if (rateLimitEnabled === 'false') {
    checks.push({
      passed: true,
      prefix: 'RATE_LIMIT',
      message: 'API 限流已禁用。生产环境建议启用限流',
    })
  } else {
    checks.push({ passed: true, prefix: 'RATE_LIMIT', message: 'API 限流已启用' })
  }

  // 输出结果
  const failed = checks.filter(c => !c.passed)

  for (const check of checks) {
    if (check.passed) {
      logger.info(`[${check.prefix}] ${check.message}`)
    } else {
      logger.error(`[${check.prefix}] ${check.message}`)
    }
  }

  if (failed.length > 0) {
    logger.error(`发现 ${failed.length} 个安全风险，请立即修复！`)
  }
}