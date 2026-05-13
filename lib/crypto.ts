// AES-256-GCM 加密/解密工具
// 用于加密数据库中存储的敏感 API Key

import crypto from 'crypto'
import { createLogger } from './logger'

const logger = createLogger('Crypto')

// 加密密钥来源：环境变量 ENCRYPTION_KEY（32字节 hex），若未配置则派生自 JWT_SECRET
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, 'hex')
  }
  // 降级：从 JWT_SECRET 派生（确保相同密钥产生相同加密密钥）
  const secret = process.env.JWT_SECRET || 'ai-router-secret-2024'
  return crypto.createHash('sha256').update(`ai-router-enc:${secret}`).digest()
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12       // GCM 推荐 12 字节
const AUTH_TAG_LENGTH = 16  // GCM 认证标签 16 字节
const SEPARATOR = ':'       // 格式: iv:authTag:ciphertext (均为 hex)

/**
 * 加密明文
 * @returns 加密后的字符串，格式为 "iv:authTag:ciphertext"
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}${SEPARATOR}${authTag}${SEPARATOR}${encrypted}`
}

/**
 * 解密密文
 * @param ciphertext 加密后的字符串，格式为 "iv:authTag:ciphertext"
 * @returns 解密后的明文
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''

  // 兼容：如果不含分隔符，说明是未加密的旧数据，直接返回
  if (!ciphertext.includes(SEPARATOR)) {
    return ciphertext
  }

  const key = getEncryptionKey()
  const parts = ciphertext.split(SEPARATOR)
  if (parts.length !== 3) {
    // 格式不正确，可能是旧的未加密数据
    return ciphertext
  }

  try {
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // 解密失败（密钥变更等），返回原始值以兼容旧数据
    logger.error('Failed to decrypt value, returning raw ciphertext')
    return ciphertext
  }
}

/**
 * 判断一个值是否已被加密（包含分隔符格式）
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false
  const parts = value.split(SEPARATOR)
  if (parts.length !== 3) return false
  // 验证各部分是否为合法 hex
  return /^[0-9a-f]+$/i.test(parts[0]) && /^[0-9a-f]+$/i.test(parts[1]) && /^[0-9a-f]+$/i.test(parts[2])
}

/**
 * 掩码显示：仅显示密钥前4位和后4位
 */
export function maskKey(key: string): string {
  if (!key || key.length <= 8) return '****'
  return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`
}