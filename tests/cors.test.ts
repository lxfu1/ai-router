import { describe, it, expect, afterEach } from 'vitest'
import { getCorsHeaders } from '@/lib/cors'

describe('cors', () => {
  afterEach(() => {
    // Reset env
    delete process.env.CORS_ALLOWED_ORIGINS
  })

  describe('getCorsHeaders', () => {
    it('should allow all origins when no whitelist configured', () => {
      const headers = getCorsHeaders('https://example.com')
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
      expect(headers['Access-Control-Allow-Methods']).toContain('GET')
      expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    })

    it('should allow whitelisted origin', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'
      const headers = getCorsHeaders('https://app.example.com')
      expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com')
      expect(headers['Access-Control-Allow-Credentials']).toBe('true')
      expect(headers['Vary']).toBe('Origin')
    })

    it('should block non-whitelisted origin', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com'
      const headers = getCorsHeaders('https://evil.com')
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
      expect(headers['Vary']).toBe('Origin')
    })

    it('should handle null origin', () => {
      const headers = getCorsHeaders(null)
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })

    it('should handle wildcard in env', () => {
      process.env.CORS_ALLOWED_ORIGINS = '*'
      const headers = getCorsHeaders('https://any.com')
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
    })
  })
})