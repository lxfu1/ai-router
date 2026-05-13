// 结构化日志模块
// 支持 JSON 和文本两种格式，通过 LOG_FORMAT 和 LOG_LEVEL 环境变量配置
// 生产环境推荐 JSON 格式，方便日志采集和分析

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
const LOG_FORMAT = (process.env.LOG_FORMAT || 'json').toLowerCase()
const MIN_LEVEL = LOG_LEVELS[LOG_LEVEL] ?? LOG_LEVELS.info

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service?: string
  traceId?: string
  [key: string]: unknown
}

/**
 * 格式化时间戳（ISO 8601）
 */
function formatTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 格式化日志条目
 */
function formatEntry(entry: LogEntry): string {
  if (LOG_FORMAT === 'text') {
    // 文本格式：2024-01-01T00:00:00.000Z [INFO] [Service] Message
    const parts = [
      entry.timestamp,
      `[${entry.level.toUpperCase()}]`,
    ]
    if (entry.service) {
      parts.push(`[${entry.service}]`)
    }
    parts.push(entry.message)

    // 附加字段
    const extra: string[] = []
    for (const [key, value] of Object.entries(entry)) {
      if (key !== 'timestamp' && key !== 'level' && key !== 'message' && key !== 'service' && key !== 'traceId') {
        extra.push(`${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`)
      }
    }
    if (entry.traceId) {
      extra.push(`traceId=${entry.traceId}`)
    }
    if (extra.length > 0) {
      parts.push(extra.join(' '))
    }

    return parts.join(' ')
  }

  // JSON 格式
  return JSON.stringify(entry)
}

/**
 * 输出日志
 */
function log(level: LogLevel, message: string, data?: Record<string, unknown>, service?: string) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...(service && { service }),
    ...data,
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

/**
 * 创建带服务标识的日志器
 */
export function createLogger(service: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      log('debug', message, data, service)
    },
    info(message: string, data?: Record<string, unknown>) {
      log('info', message, data, service)
    },
    warn(message: string, data?: Record<string, unknown>) {
      log('warn', message, data, service)
    },
    error(message: string, data?: Record<string, unknown>) {
      log('error', message, data, service)
    },
  }
}

// 默认日志器
export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    log('debug', message, data)
  },
  info(message: string, data?: Record<string, unknown>) {
    log('info', message, data)
  },
  warn(message: string, data?: Record<string, unknown>) {
    log('warn', message, data)
  },
  error(message: string, data?: Record<string, unknown>) {
    log('error', message, data)
  },
  /**
   * 创建带服务标识的子日志器
   */
  child(service: string) {
    return createLogger(service)
  },
}