// 缓存抽象层
// 支持 Redis（生产）和内存缓存（降级/开发），通过 REDIS_URL 环境变量切换
// 提供统一的 get/set/delete 接口，业务代码无需关心底层实现

import { createLogger } from './logger'

const logger = createLogger('Cache')

export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlMs?: number): Promise<void>
  delete(key: string): Promise<void>
  deleteByPrefix(prefix: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// ============ 内存缓存实现 ============

class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // 每分钟清理过期条目
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000)
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key)
    if (!entry) return false
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return false
    }
    return true
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.store.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }
}

// ============ Redis 缓存实现 ============

class RedisCacheAdapter implements CacheAdapter {
  private client: any = null
  private connected = false

  constructor(private url: string) {}

  private async getClient(): Promise<any> {
    if (this.client && this.connected) return this.client

    try {
      const { createClient } = await import('redis')
      this.client = createClient({ url: this.url })

      this.client.on('error', (err: Error) => {
        logger.error('Redis connection error', { error: err.message })
        this.connected = false
      })

      this.client.on('connect', () => {
        this.connected = true
      })

      this.client.on('disconnect', () => {
        this.connected = false
      })

      await this.client.connect()
      this.connected = true
      return this.client
    } catch (err) {
      logger.error('Redis connection failed, falling back to memory cache', { error: (err as Error).message })
      this.connected = false
      throw err
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient()
      const value = await client.get(key)
      if (value === null) return null
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    try {
      const client = await this.getClient()
      const serialized = JSON.stringify(value)
      if (ttlMs) {
        await client.set(key, serialized, { PX: ttlMs })
      } else {
        await client.set(key, serialized)
      }
    } catch (err) {
      logger.error('Redis set error', { error: (err as Error).message })
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient()
      await client.del(key)
    } catch (err) {
      logger.error('Redis delete error', { error: (err as Error).message })
    }
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const client = await this.getClient()
      const keys = await client.keys(`${prefix}*`)
      if (keys.length > 0) {
        await client.del(keys)
      }
    } catch (err) {
      logger.error('Redis deleteByPrefix error', { error: (err as Error).message })
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.getClient()
      return (await client.exists(key)) === 1
    } catch {
      return false
    }
  }

  async close(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.quit()
      this.connected = false
    }
  }
}

// ============ 缓存管理器 ============

let _cache: CacheAdapter | null = null
let _fallbackCache: MemoryCacheAdapter | null = null

/**
 * 获取缓存适配器实例
 * 如果 Redis 连接失败，自动降级到内存缓存
 */
export async function getCache(): Promise<CacheAdapter> {
  if (_cache) return _cache

  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    try {
      const redisCache = new RedisCacheAdapter(redisUrl)
      // 测试连接
      await redisCache.set('__health_check__', 'ok', 5000)
      const result = await redisCache.get('__health_check__')
      await redisCache.delete('__health_check__')

      if (result === 'ok') {
        logger.info('Using Redis cache')
        _cache = redisCache
        return _cache
      }
    } catch {
      logger.warn('Redis connection failed, falling back to memory cache')
    }
  }

  // 降级到内存缓存
  if (!_fallbackCache) {
    _fallbackCache = new MemoryCacheAdapter()
    logger.info('Using in-memory cache')
  }
  _cache = _fallbackCache
  return _cache
}

/**
 * 同步获取缓存（仅内存模式可用，用于兼容同步代码）
 */
export function getCacheSync(): CacheAdapter | null {
  if (_cache) return _cache
  // 如果还没有初始化，返回 null，调用方应使用异步版本
  return null
}

/**
 * 关闭缓存连接
 */
export async function closeCache(): Promise<void> {
  if (_cache instanceof RedisCacheAdapter) {
    await _cache.close()
  }
  if (_fallbackCache) {
    _fallbackCache.destroy()
    _fallbackCache = null
  }
  _cache = null
}

// ============ 常用缓存操作封装 ============

const DEFAULT_TTL = 5 * 60 * 1000 // 5 分钟

/**
 * 获取或设置缓存（Cache-Aside 模式）
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL
): Promise<T> {
  const cache = await getCache()

  // 尝试从缓存获取
  const cached = await cache.get<T>(key)
  if (cached !== null) return cached

  // 缓存未命中，执行查询
  const value = await fetcher()
  await cache.set(key, value, ttlMs)
  return value
}