/**
 * Tests for EncryptionService
 *
 * Tests AES-256-GCM encryption/decryption for API keys
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { EncryptionService } from '../encryption.service'

describe('EncryptionService', () => {
  let encryptionService: EncryptionService

  beforeEach(() => {
    encryptionService = new EncryptionService()
  })

  describe('encrypt', () => {
    it('should encrypt API key and return different ciphertext', () => {
      const apiKey = 'sk-ant-api03-1234567890abcdef'
      const encrypted = encryptionService.encrypt(apiKey)

      // Encrypted value should be different from original
      expect(encrypted).not.toBe(apiKey)
      expect(encrypted.length).toBeGreaterThan(0)
      expect(encrypted).not.toContain(apiKey)
    })

    it('should produce different ciphertext for same input (random IV)', () => {
      const apiKey = 'sk-test-key-12345'
      const encrypted1 = encryptionService.encrypt(apiKey)
      const encrypted2 = encryptionService.encrypt(apiKey)

      // Each encryption should use a random IV, producing different ciphertext
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle empty string', () => {
      const encrypted = encryptionService.encrypt('')
      expect(encrypted).toBeDefined()
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should handle special characters in API key', () => {
      const specialKey = 'sk-ant-_-test-.-key-~123'
      const encrypted = encryptionService.encrypt(specialKey)

      expect(encrypted).not.toBe(specialKey)
      expect(encrypted.length).toBeGreaterThan(0)

      // Verify decryption works
      const decrypted = encryptionService.decrypt(encrypted)
      expect(decrypted).toBe(specialKey)
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted API key correctly', () => {
      const apiKey = 'sk-ant-api03-1234567890abcdef'
      const encrypted = encryptionService.encrypt(apiKey)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(apiKey)
    })

    it('should handle multiple encrypt/decrypt cycles', () => {
      const originalKey = 'sk-ant-api03-original'
      const encrypted1 = encryptionService.encrypt(originalKey)
      const decrypted1 = encryptionService.decrypt(encrypted1)

      expect(decrypted1).toBe(originalKey)

      // Encrypt the decrypted value again
      const encrypted2 = encryptionService.decrypt(encrypted1)
      expect(encrypted2).toBe(originalKey)
    })

    it('should decrypt long API keys', () => {
      const longKey = 'sk-ant-api03-' + 'x'.repeat(200)
      const encrypted = encryptionService.encrypt(longKey)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(longKey)
    })

    it('should throw on invalid encrypted data', () => {
      expect(() => {
        encryptionService.decrypt('invalid-data-not-base64')
      }).toThrow()
    })

    it('should throw on malformed encrypted data', () => {
      // Valid base64 but not our format
      expect(() => {
        encryptionService.decrypt('dGVzdA==') // "test" in base64
      }).toThrow()
    })

    it('should throw on empty string', () => {
      expect(() => {
        encryptionService.decrypt('')
      }).toThrow()
    })

    it('should throw on tampered data (wrong auth tag)', () => {
      const apiKey = 'sk-test-key'
      const encrypted = encryptionService.encrypt(apiKey)

      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX'

      expect(() => {
        encryptionService.decrypt(tampered)
      }).toThrow()
    })
  })

  describe('round-trip encryption', () => {
    it('should maintain data integrity through encrypt-decrypt', () => {
      const testCases = [
        'sk-ant-api03-',
        'sk-ant-api03-1234567890',
        'sk-ant-api03-' + 'a'.repeat(100),
        'sk-ant-test_with_underscore',
        'sk-ant-test.with.dots',
        'sk-ant-test/with/slashes'
      ]

      testCases.forEach((apiKey) => {
        const encrypted = encryptionService.encrypt(apiKey)
        const decrypted = encryptionService.decrypt(encrypted)
        expect(decrypted).toBe(apiKey)
      })
    })
  })

  describe('key derivation', () => {
    it('should use same key for same service instance', () => {
      const apiKey = 'sk-test'
      const encrypted1 = encryptionService.encrypt(apiKey)

      // Create new instance with same key (in real scenario, key comes from env/file)
      const service2 = new EncryptionService(encryptionService.getKey())
      const decrypted = service2.decrypt(encrypted1)

      expect(decrypted).toBe(apiKey)
    })

    it('should not decrypt with different key', () => {
      const apiKey = 'sk-test'
      const encrypted = encryptionService.encrypt(apiKey)

      // Create service with different key (exactly 32 bytes)
      const differentKeyService = new EncryptionService(
        Buffer.from('different-key-32-bytes-long-1234')
      )

      expect(() => {
        differentKeyService.decrypt(encrypted)
      }).toThrow()
    })
  })
})
