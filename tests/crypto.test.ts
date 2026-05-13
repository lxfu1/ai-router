import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, isEncrypted, maskKey } from '@/lib/crypto'

describe('crypto', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const original = 'sk-test-api-key-12345'
      const encrypted = encrypt(original)
      expect(encrypted).not.toBe(original)
      expect(decrypt(encrypted)).toBe(original)
    })

    it('should produce different ciphertexts for the same input (random IV)', () => {
      const original = 'sk-same-input'
      const encrypted1 = encrypt(original)
      const encrypted2 = encrypt(original)
      expect(encrypted1).not.toBe(encrypted2)
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(original)
      expect(decrypt(encrypted2)).toBe(original)
    })

    it('should handle empty string', () => {
      expect(encrypt('')).toBe('')
      expect(decrypt('')).toBe('')
    })

    it('should return raw value for non-encrypted input', () => {
      const plainText = 'this-is-not-encrypted'
      expect(decrypt(plainText)).toBe(plainText)
    })

    it('should return raw value for malformed encrypted input', () => {
      const malformed = 'abc:def' // only 2 parts, not 3
      expect(decrypt(malformed)).toBe(malformed)
    })
  })

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encrypt('test-value')
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('should return false for plain text', () => {
      expect(isEncrypted('plain-text')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false)
    })
  })

  describe('maskKey', () => {
    it('should mask the middle of a key', () => {
      const key = 'sk-1234567890abcdef'
      const masked = maskKey(key)
      expect(masked.startsWith('sk-1')).toBe(true)
      expect(masked.endsWith('cdef')).toBe(true)
      expect(masked).toContain('*')
    })

    it('should return **** for short keys', () => {
      expect(maskKey('short')).toBe('****')
      expect(maskKey('12345678')).toBe('****')
    })

    it('should handle empty string', () => {
      expect(maskKey('')).toBe('****')
    })
  })
})