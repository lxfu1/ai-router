import type { CreateChannelInput, Channel } from '@/types'
import { db } from './db'
import { buildUpstreamUrl } from './models'

export type { Channel }

export function getEnabledChannels(): Channel[] {
  return db.prepare('SELECT * FROM channels WHERE enabled = 1 ORDER BY priority ASC').all() as Channel[]
}

export function getChannelByModel(model: string): Channel | undefined {
  return db.prepare('SELECT * FROM channels WHERE model_name = ? AND enabled = 1').get(model) as Channel | undefined
}

export function getChannelForAuto(): Channel | undefined {
  const healthy = db.prepare('SELECT * FROM channels WHERE enabled = 1 AND healthy = 1 ORDER BY priority ASC').all() as Channel[]
  if (healthy.length > 0) return healthy[Math.floor(Math.random() * healthy.length)]
  const enabled = db.prepare('SELECT * FROM channels WHERE enabled = 1 ORDER BY priority ASC').all() as Channel[]
  if (enabled.length > 0) return enabled[Math.floor(Math.random() * enabled.length)]
  return undefined
}

export function getAllChannels(): Channel[] {
  return db.prepare('SELECT * FROM channels ORDER BY priority ASC').all() as Channel[]
}

export function createChannel(data: CreateChannelInput): Channel {
  const result = db.prepare(`
    INSERT INTO channels (name, provider, base_url, api_key, model_name, rate_multiplier, priority, max_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.name,
    data.provider,
    data.base_url,
    data.api_key,
    data.model_name,
    data.rate_multiplier ?? 1.0,
    data.priority ?? 0,
    data.max_tokens ?? 4096
  )
  return db.prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid) as Channel
}

export function updateChannelHealth(id: number, healthy: boolean, latencyMs: number | null) {
  db.prepare("UPDATE channels SET healthy = ?, latency_ms = ?, last_check_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(healthy ? 1 : 0, latencyMs, id)
}

export function updateChannel(id: number, data: Partial<Channel>) {
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'created_at') continue
    fields.push(`${key} = ?`)
    values.push(value)
  }
  if (fields.length === 0) return
  fields.push(`updated_at = datetime('now')`)
  values.push(id)
  db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`).run(...values)
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

export async function checkChannelHealth(channel: Channel): Promise<{ healthy: boolean; latencyMs: number | null }> {
  const startTime = Date.now()
  try {
    const req = buildHealthCheckRequest(channel)
    console.log(`[HealthCheck] Checking ${channel.provider} at ${req.url}, model: ${channel.model_name}`)
    console.log(`[HealthCheck] Headers:`, JSON.stringify(req.headers, null, 2))
    console.log(`[HealthCheck] Body:`, JSON.stringify(req.body, null, 2))
    const response = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(15000),
    })

    const latencyMs = Date.now() - startTime
    console.log(`[HealthCheck] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`[HealthCheck] Channel ${channel.id} (${channel.provider}) HTTP ${response.status}: ${errorText.slice(0, 500)}`)
      return { healthy: false, latencyMs: null }
    }

    return { healthy: true, latencyMs }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[HealthCheck] Channel ${channel.id} (${channel.provider}) error: ${errorMessage}`)
    return { healthy: false, latencyMs: null }
  }
}

export async function checkAllChannels() {
  const channels = getAllChannels()
  const results = await Promise.allSettled(
    channels.filter(c => c.enabled).map(c => checkChannelHealth(c))
  )
  return results.map((r, i) => ({
    channel: channels[i],
    result: r.status === 'fulfilled' ? r.value : { healthy: false, latencyMs: null },
  }))
}