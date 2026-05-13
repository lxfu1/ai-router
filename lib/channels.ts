import type { CreateChannelInput, Channel } from '@/types'
import { db } from './db'
import { buildUpstreamUrl } from './models'
import { encrypt, decrypt, maskKey } from './crypto'
import { createLogger } from './logger'
import { cacheAside } from './cache'

const logger = createLogger('Channels')

const CACHE_TTL_CHANNELS = 2 * 60 * 1000   // 2 分钟
const CACHE_TTL_MODEL = 1 * 60 * 1000       // 1 分钟

/** 清除渠道相关缓存（增删改后调用） */
export async function invalidateChannelCache() {
  const { getCache } = await import('./cache')
  const cache = await getCache()
  await cache.deleteByPrefix('channels:')
}

export type { Channel }

/** 解密渠道的 api_key 字段（返回新对象，不修改原对象） */
function decryptChannel(channel: Channel): Channel {
  if (!channel) return channel
  return { ...channel, api_key: decrypt(channel.api_key) }
}

/** 解密渠道列表 */
function decryptChannels(channels: Channel[]): Channel[] {
  return channels.map(decryptChannel)
}

export async function getEnabledChannels(): Promise<Channel[]> {
  return cacheAside<Channel[]>('channels:enabled', () => {
    return Promise.resolve(decryptChannels(db.prepare('SELECT * FROM channels WHERE enabled = 1 ORDER BY priority ASC').all() as Channel[]))
  }, CACHE_TTL_CHANNELS)
}

export async function getChannelByModel(model: string): Promise<Channel | undefined> {
  return cacheAside<Channel | undefined>(`channels:model:${model}`, () => {
    const ch = db.prepare('SELECT * FROM channels WHERE model_name = ? AND enabled = 1').get(model) as Channel | undefined
    return Promise.resolve(ch ? decryptChannel(ch) : undefined)
  }, CACHE_TTL_MODEL)
}

// 默认路由优先级：DeepSeek > 其他
const DEFAULT_PRIORITY_PROVIDERS = ['deepseek', 'qwen', 'zhipu', 'minimax']

export async function getChannelForAuto(): Promise<Channel | undefined> {
  const channels = await getEnabledChannels()
  const healthy = channels.filter(c => c.healthy === 1)
  
  // 按优先级排序
  const sorted = (healthy.length > 0 ? healthy : channels).sort((a, b) => {
    const aIdx = DEFAULT_PRIORITY_PROVIDERS.indexOf(a.provider)
    const bIdx = DEFAULT_PRIORITY_PROVIDERS.indexOf(b.provider)
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })
  
  return sorted[0]  // 返回优先级最高的
}

export function getAllChannels(): Channel[] {
  // 管理后台展示：api_key 做掩码处理，不返回明文
  return (db.prepare('SELECT * FROM channels ORDER BY priority ASC').all() as Channel[]).map(ch => ({
    ...ch,
    api_key: maskKey(decrypt(ch.api_key)),
  }))
}

export async function createChannel(data: CreateChannelInput): Promise<Channel> {
  const encryptedApiKey = encrypt(data.api_key)
  const result = db.prepare(`
    INSERT INTO channels (name, provider, base_url, api_key, model_name, rate_multiplier, priority, max_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.provider,
    data.base_url,
    encryptedApiKey,
    data.model_name,
    data.rate_multiplier ?? 1.0,
    data.priority ?? 0,
    data.max_tokens ?? 4096
  )
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid) as Channel
  await invalidateChannelCache()
  return { ...ch, api_key: maskKey(data.api_key) }
}

export function updateChannelHealth(id: number, healthy: boolean, latencyMs: number | null) {
  db.prepare("UPDATE channels SET healthy = ?, latency_ms = ?, last_check_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(healthy ? 1 : 0, latencyMs, id)
}

export async function updateChannel(id: number, data: Partial<Channel>) {
  const fields: string[] = []
  const values: unknown[] = []
  // 允许更新的安全字段白名单
  const allowedFields = new Set(['name', 'provider', 'base_url', 'api_key', 'model_name', 'rate_multiplier', 'priority', 'max_tokens', 'enabled', 'healthy'])
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue
    if (!allowedFields.has(key)) continue
    // api_key 需要加密存储
    if (key === 'api_key' && typeof value === 'string') {
      fields.push(`${key} = ?`)
      values.push(encrypt(value))
    } else {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }
  if (fields.length === 0) return
  fields.push(`updated_at = datetime('now')`)
  values.push(id)
  db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  await invalidateChannelCache()
}

export async function deleteChannel(id: number) {
  db.prepare('DELETE FROM channels WHERE id = ?').run(id)
  await invalidateChannelCache()
}

function buildHealthCheckRequest(channel: Channel): { url: string; headers: Record<string, string>; body: unknown } {
  // 所有供应商统一使用 OpenAI 兼容格式
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${channel.api_key}`,
  }

  // MiniMax 使用 Bearer + API Key 作为 Authorization
  if (channel.provider === 'minimax') {
    headers['Authorization'] = `Bearer ${channel.api_key}`
  }

  return {
    url: buildUpstreamUrl(channel.base_url, channel.provider, 'chat/completions'),
    headers,
    body: {
      model: channel.model_name,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5,
    },
  }
}

/** 健康检查专用：获取解密后的渠道信息 */
function getDecryptedChannelForHealth(channel: Channel): Channel {
  return { ...channel, api_key: decrypt(channel.api_key) }
}

export async function checkChannelHealth(channel: Channel): Promise<{ healthy: boolean; latencyMs: number | null }> {
  const startTime = Date.now()
  try {
    // 使用解密后的渠道信息进行健康检查
    const decryptedChannel = getDecryptedChannelForHealth(channel)
    const req = buildHealthCheckRequest(decryptedChannel)
    logger.info('Checking channel health', { channelId: channel.id, provider: channel.provider, url: req.url, model: channel.model_name })
    const response = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(15000),
    })

    const latencyMs = Date.now() - startTime
    logger.info('Channel health check result', { channelId: channel.id, provider: channel.provider, status: response.status, latencyMs })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      logger.error('Channel health check failed', { channelId: channel.id, provider: channel.provider, status: response.status, error: errorText.slice(0, 200) })
      return { healthy: false, latencyMs: null }
    }

    return { healthy: true, latencyMs }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Channel health check error', { channelId: channel.id, provider: channel.provider, error: errorMessage })
    return { healthy: false, latencyMs: null }
  }
}

export async function checkAllChannels() {
  // 健康检查需要解密后的 api_key，从数据库直接读取并解密
  const rawChannels = db.prepare('SELECT * FROM channels ORDER BY priority ASC').all() as Channel[]
  const channels = rawChannels.map(ch => ({ ...ch, api_key: decrypt(ch.api_key) }))
  const results = await Promise.allSettled(
    channels.filter(c => c.enabled).map(c => checkChannelHealth(c))
  )
  return results.map((r, i) => {
    const channel = channels[i]
    return {
      channel: { ...channel, api_key: maskKey(channel.api_key) },
      result: r.status === 'fulfilled' ? r.value : { healthy: false, latencyMs: null },
    }
  })
}