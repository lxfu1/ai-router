import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger, logger } from '@/lib/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('createLogger', () => {
    it('should create a logger with service name', () => {
      const testLogger = createLogger('TestService')
      expect(testLogger).toHaveProperty('debug')
      expect(testLogger).toHaveProperty('info')
      expect(testLogger).toHaveProperty('warn')
      expect(testLogger).toHaveProperty('error')
    })

    it('should log info messages', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const testLogger = createLogger('Test')
      testLogger.info('test message', { key: 'value' })
      expect(spy).toHaveBeenCalled()
      const output = spy.mock.calls[0][0]
      expect(output).toContain('test message')
      expect(output).toContain('Test')
    })

    it('should log error messages', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const testLogger = createLogger('Test')
      testLogger.error('error message')
      expect(spy).toHaveBeenCalled()
    })

    it('should log warn messages', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const testLogger = createLogger('Test')
      testLogger.warn('warn message')
      expect(spy).toHaveBeenCalled()
    })

    it('should include extra data in log output', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const testLogger = createLogger('Test')
      testLogger.info('message with data', { requestId: 'abc-123', duration: 42 })
      expect(spy).toHaveBeenCalled()
      const output = spy.mock.calls[0][0]
      expect(output).toContain('requestId')
      expect(output).toContain('42')
    })
  })

  describe('default logger', () => {
    it('should have all log methods', () => {
      expect(logger).toHaveProperty('debug')
      expect(logger).toHaveProperty('info')
      expect(logger).toHaveProperty('warn')
      expect(logger).toHaveProperty('error')
      expect(logger).toHaveProperty('child')
    })

    it('should create child logger via child()', () => {
      const childLogger = logger.child('ChildService')
      expect(childLogger).toHaveProperty('info')
      expect(childLogger).toHaveProperty('error')
    })
  })
})