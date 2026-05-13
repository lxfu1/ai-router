import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerCounter,
  registerGauge,
  registerHistogram,
  incCounter,
  setGauge,
  observeHistogram,
  generatePrometheusOutput,
  recordHttpRequest,
  recordUpstreamRequest,
  recordTokenUsage,
  recordCost,
  recordRateLimitRejected,
} from '@/lib/metrics'

describe('metrics', () => {
  beforeEach(() => {
    // Re-register metrics (they are idempotent)
  })

  describe('counter', () => {
    it('should increment counter', () => {
      incCounter('ai_router_http_requests_total', { method: 'GET', path: '/v1/models', status: '200' })
      incCounter('ai_router_http_requests_total', { method: 'GET', path: '/v1/models', status: '200' })
      const output = generatePrometheusOutput()
      expect(output).toContain('ai_router_http_requests_total')
    })
  })

  describe('gauge', () => {
    it('should set gauge value', () => {
      setGauge('ai_router_channels_active', {}, 5)
      const output = generatePrometheusOutput()
      expect(output).toContain('ai_router_channels_active')
      expect(output).toContain('5')
    })
  })

  describe('histogram', () => {
    it('should observe histogram values', () => {
      observeHistogram('ai_router_http_request_duration_seconds', 0.15, { method: 'GET', path: '/v1/models' })
      const output = generatePrometheusOutput()
      expect(output).toContain('ai_router_http_request_duration_seconds')
      expect(output).toContain('0.15')
    })
  })

  describe('convenience functions', () => {
    it('recordHttpRequest should not throw', () => {
      expect(() => recordHttpRequest('GET', '/v1/models', 200, 150)).not.toThrow()
    })

    it('recordUpstreamRequest should not throw', () => {
      expect(() => recordUpstreamRequest('deepseek', 'deepseek-v4', 200, 500)).not.toThrow()
      expect(() => recordUpstreamRequest('deepseek', 'deepseek-v4', 500, 1000)).not.toThrow()
    })

    it('recordTokenUsage should not throw', () => {
      expect(() => recordTokenUsage('deepseek-v4', 100, 50)).not.toThrow()
    })

    it('recordCost should not throw', () => {
      expect(() => recordCost('deepseek-v4', 0.002)).not.toThrow()
    })

    it('recordRateLimitRejected should not throw', () => {
      expect(() => recordRateLimitRejected('api_key')).not.toThrow()
    })
  })

  describe('Prometheus output format', () => {
    it('should include HELP and TYPE lines', () => {
      incCounter('ai_router_http_requests_total', { method: 'POST', path: '/v1/chat/completions', status: '200' })
      const output = generatePrometheusOutput()
      expect(output).toContain('# HELP ai_router_http_requests_total')
      expect(output).toContain('# TYPE ai_router_http_requests_total counter')
    })

    it('should include histogram buckets', () => {
      observeHistogram('ai_router_http_request_duration_seconds', 0.1, { method: 'GET', path: '/test' })
      const output = generatePrometheusOutput()
      expect(output).toContain('_bucket')
      expect(output).toContain('_sum')
      expect(output).toContain('_count')
      expect(output).toContain('+Inf')
    })
  })
})