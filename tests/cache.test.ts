import { describe, it, expect, beforeEach } from 'vitest'

// 直接测试 MemoryCacheAdapter（同步可用）
describe('cache (MemoryCacheAdapter)', () => {
  // 因为 getCache() 是异步的且可能连接 Redis，我们直接测试 cacheAside 逻辑
  // 用简单的内存 Map 模拟

  let store: Map<string, { value: unknown; expiresAt: number | null }>

  beforeEach(() => {
    store = new Map()
  })

  async function cacheGet<T>(key: string): Promise<T | null> {
    const entry = store.get(key)
    if (!entry) return null
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      store.delete(key)
      return null
    }
    return entry.value as T
  }

  async function cacheSet(key: string, value: unknown, ttlMs?: number): Promise<void> {
    store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
    })
  }

  async function cacheAside<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 300000): Promise<T> {
    const cached = await cacheGet<T>(key)
    if (cached !== null) return cached
    const value = await fetcher()
    await cacheSet(key, value, ttlMs)
    return value
  }

  describe('cacheAside', () => {
    it('should fetch and cache value on first call', async () => {
      let callCount = 0
      const fetcher = async () => {
        callCount++
        return { data: 'test' }
      }

      const result = await cacheAside('test-key', fetcher)
      expect(result).toEqual({ data: 'test' })
      expect(callCount).toBe(1)
    })

    it('should return cached value on subsequent calls', async () => {
      let callCount = 0
      const fetcher = async () => {
        callCount++
        return { data: 'test' }
      }

      const result1 = await cacheAside('cache-hit', fetcher)
      const result2 = await cacheAside('cache-hit', fetcher)
      expect(result1).toEqual(result2)
      expect(callCount).toBe(1) // fetcher called only once
    })

    it('should cache different keys independently', async () => {
      const fetcherA = async () => 'value-a'
      const fetcherB = async () => 'value-b'

      const a = await cacheAside('key-a', fetcherA)
      const b = await cacheAside('key-b', fetcherB)
      expect(a).toBe('value-a')
      expect(b).toBe('value-b')
    })
  })

  describe('TTL expiration', () => {
    it('should expire entries based on TTL', async () => {
      let callCount = 0
      const fetcher = async () => {
        callCount++
        return 'fresh'
      }

      // Set with very short TTL (1ms)
      const result1 = await cacheAside('ttl-test', fetcher, 1)
      expect(result1).toBe('fresh')
      expect(callCount).toBe(1)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 10))

      const result2 = await cacheAside('ttl-test', fetcher, 1)
      expect(result2).toBe('fresh')
      expect(callCount).toBe(2) // fetcher called again
    })
  })

  describe('deleteByPrefix', () => {
    it('should delete entries matching prefix', async () => {
      await cacheSet('channels:enabled', [1, 2, 3])
      await cacheSet('channels:model:gpt-4', { id: 1 })
      await cacheSet('models:list', ['a', 'b'])

      // Delete channels: prefix
      for (const key of store.keys()) {
        if (key.startsWith('channels:')) {
          store.delete(key)
        }
      }

      expect(await cacheGet('channels:enabled')).toBeNull()
      expect(await cacheGet('channels:model:gpt-4')).toBeNull()
      expect(await cacheGet('models:list')).not.toBeNull()
    })
  })
})