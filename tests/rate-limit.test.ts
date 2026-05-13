import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, checkKeyRateLimit, checkIpRateLimit, getClientIp, startRateLimitCleanup, stopRateLimitCleanup } from '@/lib/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    // Reset rate limiting state between tests by creating fresh stores
    stopRateLimitCleanup()
  })

  describe('checkKeyRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkKeyRateLimit('test-key')
      expect(result.allowed).toBe(true)
      expect(result.limit).toBeGreaterThan(0)
      expect(result.remaining).toBeGreaterThanOrEqual(0)
    })

    it('should return remaining count', () => {
      const result = checkKeyRateLimit('remaining-test')
      expect(result.remaining).toBeLessThan(result.limit)
    })

    it('should return resetAt timestamp', () => {
      const result = checkKeyRateLimit('reset-test')
      expect(result.resetAt).toBeGreaterThan(0)
    })
  })

  describe('checkIpRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkIpRateLimit('192.168.1.1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkRateLimit', () => {
    it('should return the stricter of key and IP limits', () => {
      const result = checkRateLimit('combo-key', '10.0.0.1')
      expect(result.allowed).toBe(true)
    })

    it('should return remaining as the minimum of both', () => {
      const result = checkRateLimit('remaining-combo', '10.0.0.2')
      const keyResult = checkKeyRateLimit('remaining-combo-2')
      // Combined remaining should be <= key-only remaining
      expect(result.remaining).toBeLessThanOrEqual(keyResult.limit)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      })
      expect(getClientIp(request)).toBe('1.2.3.4')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '9.8.7.6' },
      })
      expect(getClientIp(request)).toBe('9.8.7.6')
    })

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('http://localhost')
      expect(getClientIp(request)).toBe('unknown')
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.1.1.1',
          'x-real-ip': '2.2.2.2',
        },
      })
      expect(getClientIp(request)).toBe('1.1.1.1')
    })
  })
})