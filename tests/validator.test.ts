import { describe, it, expect } from 'vitest'
import { validateChatRequest, validateChannelInput, validateKeyInput, validateId } from '@/lib/validator'

describe('validator', () => {
  describe('validateChatRequest', () => {
    it('should validate a valid chat request', () => {
      const result = validateChatRequest({
        model: 'deepseek-v4',
        messages: [{ role: 'user', content: 'Hello' }],
      })
      expect(result.success).toBe(true)
      expect(result.data?.model).toBe('deepseek-v4')
    })

    it('should default model to "auto" when not provided', () => {
      const result = validateChatRequest({
        messages: [{ role: 'user', content: 'Hello' }],
      })
      expect(result.success).toBe(true)
      expect(result.data?.model).toBe('auto')
    })

    it('should reject request without messages', () => {
      const result = validateChatRequest({
        model: 'deepseek-v4',
      })
      expect(result.success).toBe(false)
    })

    it('should reject request with empty messages', () => {
      const result = validateChatRequest({
        model: 'deepseek-v4',
        messages: [],
      })
      expect(result.success).toBe(false)
    })

    it('should default stream to false', () => {
      const result = validateChatRequest({
        model: 'auto',
        messages: [{ role: 'user', content: 'Hi' }],
      })
      expect(result.success).toBe(true)
      expect(result.data?.stream).toBe(false)
    })

    it('should accept stream: true', () => {
      const result = validateChatRequest({
        model: 'auto',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })
      expect(result.success).toBe(true)
      expect(result.data?.stream).toBe(true)
    })
  })

  describe('validateChannelInput', () => {
    it('should validate a valid channel input', () => {
      const result = validateChannelInput({
        name: 'Test Channel',
        provider: 'openai',
        base_url: 'https://api.openai.com',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      })
      expect(result.success).toBe(true)
    })

    it('should reject channel without required fields', () => {
      const result = validateChannelInput({
        name: 'Test',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validateKeyInput', () => {
    it('should validate key with name only', () => {
      const result = validateKeyInput({ name: 'test-key' })
      expect(result.success).toBe(true)
    })

    it('should reject key without name', () => {
      const result = validateKeyInput({})
      expect(result.success).toBe(false)
    })

    it('should accept key with name and balance', () => {
      const result = validateKeyInput({ name: 'test-key', balance: 100 })
      expect(result.success).toBe(true)
      expect(result.data?.balance).toBe(100)
    })
  })

  describe('validateId', () => {
    it('should validate a positive integer id', () => {
      const result = validateId(1)
      expect(result.success).toBe(true)
      expect(result.data).toBe(1)
    })

    it('should reject non-positive id', () => {
      expect(validateId(0).success).toBe(false)
      expect(validateId(-1).success).toBe(false)
    })

    it('should reject non-number id', () => {
      expect(validateId('abc').success).toBe(false)
      expect(validateId(null).success).toBe(false)
    })
  })
})