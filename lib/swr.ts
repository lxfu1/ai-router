// 轻量级数据获取缓存工具

import { useState, useEffect } from 'react'

type Fetcher<T> = () => Promise<T>

interface CacheItem<T> {
  data: T
  timestamp: number
  promise: Promise<T> | null
}

const cache = new Map<string, CacheItem<unknown>>()
const DEFAULT_STALE_TIME = 5000

// 检查是否在浏览器环境
const isBrowser = typeof window !== 'undefined'

export function useCachedFetch<T>(
  key: string,
  fetcher: Fetcher<T>,
  options: { staleTime?: number; enabled?: boolean } = {}
): { data: T | undefined; isLoading: boolean; error: Error | null } {
  const { staleTime = DEFAULT_STALE_TIME, enabled = true } = options

  // SSR 时返回固定状态
  if (!isBrowser) {
    return { data: undefined, isLoading: false, error: null }
  }

  const [state, setState] = useState<{ data: T | undefined; isLoading: boolean; error: Error | null }>(() => {
    // 初始状态检查缓存
    const cached = cache.get(key) as CacheItem<T> | undefined
    const now = Date.now()
    if (cached && now - cached.timestamp < staleTime && cached.data !== undefined) {
      return { data: cached.data, isLoading: false, error: null }
    }
    return { data: undefined, isLoading: enabled && isBrowser, error: null }
  })

  useEffect(() => {
    if (!enabled || !isBrowser) return

    const cached = cache.get(key) as CacheItem<T> | undefined
    const now = Date.now()

    // 有缓存且未过期
    if (cached && now - cached.timestamp < staleTime && cached.data !== undefined) {
      setState({ data: cached.data, isLoading: false, error: null })
      return
    }

    // 如果正在请求中
    if (cached?.promise) {
      cached.promise
        .then(data => setState({ data, isLoading: false, error: null }))
        .catch(error => setState({ data: undefined, isLoading: false, error }))
      return
    }

    // 发起新请求
    setState(prev => ({ ...prev, isLoading: true }))
    
    const promise = fetcher()
    
    cache.set(key, {
      data: cached?.data,
      timestamp: now,
      promise,
    } as CacheItem<unknown>)

    promise
      .then(data => {
        cache.set(key, {
          data,
          timestamp: Date.now(),
          promise: null,
        } as CacheItem<unknown>)
        setState({ data, isLoading: false, error: null })
      })
      .catch(error => {
        cache.set(key, {
          data: cached?.data,
          timestamp: Date.now(),
          promise: null,
        } as CacheItem<unknown>)
        setState({ data: undefined, isLoading: false, error })
      })
  }, [key, enabled, staleTime])

  return state
}

export function useAuthToken(): string | null {
  // SSR 时返回 null
  const [token, setToken] = useState<string | null>(() => 
    isBrowser ? localStorage.getItem('admin_token') : null
  )
  
  useEffect(() => {
    if (!isBrowser) return
    const currentToken = localStorage.getItem('admin_token')
    if (currentToken !== token) {
      setToken(currentToken)
    }
  }, [])
  
  return token
}

export function useDashboardStats() {
  const token = useAuthToken()
  return useCachedFetch(
    token ? `stats-${token.slice(-8)}` : 'no-token',
    async () => {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    { enabled: !!token, staleTime: 10000 }
  )
}

export function useChannels() {
  const token = useAuthToken()
  return useCachedFetch(
    token ? `channels-${token.slice(-8)}` : 'no-token',
    async () => {
      const res = await fetch('/api/admin/channels', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch channels')
      const data = await res.json()
      return data.channels || []
    },
    { enabled: !!token, staleTime: 5000 }
  )
}

export function useApiKeys() {
  const token = useAuthToken()
  return useCachedFetch(
    token ? `keys-${token.slice(-8)}` : 'no-token',
    async () => {
      const res = await fetch('/api/admin/keys', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch keys')
      const data = await res.json()
      return data.keys || []
    },
    { enabled: !!token, staleTime: 5000 }
  )
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}
