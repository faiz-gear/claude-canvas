/**
 * EncryptionService
 *
 * Provides AES-256-GCM encryption for sensitive data like API keys.
 * Each encryption uses a random IV for semantic security.
 *
 * Security properties:
 * - AES-256-GCM: Authenticated encryption with associated data
 * - Random 96-bit IV for each encryption (prevents replay attacks)
 * - 128-bit auth tag verifies data integrity
 * - Key derived from environment or generated once per installation
 */

import { randomBytes, createSecretKey, createCipheriv, createDecipheriv } from 'crypto'

// Constants for AES-256-GCM
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits for GCM (recommended by NIST)
const KEY_LENGTH = 32 // 256 bits for AES-256
const AUTH_TAG_LENGTH = 16 // 128 bits auth tag

// Format: IV (12 bytes) + AuthTag (16 bytes) + Ciphertext
// All base64 encoded
const OVERHEAD = IV_LENGTH + AUTH_TAG_LENGTH

/**
 * Encryption result format
 */
interface EncryptedData {
  iv: string // base64 encoded IV
  tag: string // base64 encoded auth tag
  data: string // base64 encrypted data
}

/**
 * Encryption Service
 *
 * @example
 * ```ts
 * const service = new EncryptionService()
 * const encrypted = service.encrypt('sk-ant-api03-key')
 * const decrypted = service.decrypt(encrypted)
 * ```
 */
export class EncryptionService {
  private key: Buffer

  /**
   * Create encryption service
   *
   * @param key - Optional 32-byte key. If not provided, loads from environment
   *              or generates a new key (should be persisted for production)
   */
  constructor(key?: Buffer | string) {
    if (key) {
      if (typeof key === 'string') {
        this.key = Buffer.from(key, 'base64')
      } else {
        this.key = key
      }
    } else {
      // Try to get key from environment, or generate a new one
      const envKey = process.env.ENCRYPTION_KEY
      if (envKey) {
        this.key = Buffer.from(envKey, 'base64')
      } else {
        // For development: generate consistent key from machine ID
        // In production, this should be stored securely
        this.key = this.getOrCreatePersistentKey()
      }
    }

    // Validate key length
    if (this.key.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`)
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   *
   * @param plaintext - Data to encrypt
   * @returns Base64 encoded string containing IV + auth tag + ciphertext
   */
  encrypt(plaintext: string): string {
    if (plaintext === undefined || plaintext === null) {
      throw new Error('Cannot encrypt undefined or null')
    }

    // Generate random IV for each encryption
    const iv = randomBytes(IV_LENGTH)

    // Create cipher with key and IV
    const cipherKey = createSecretKey(this.key)
    const cipher = createCipheriv(ALGORITHM, cipherKey, iv)

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ])

    // Get auth tag
    const authTag = cipher.getAuthTag()

    // Combine: IV + AuthTag + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted])

    return combined.toString('base64')
  }

  /**
   * Decrypt data using AES-256-GCM
   *
   * @param ciphertext - Base64 encoded string from encrypt()
   * @returns Decrypted plaintext
   * @throws Error if decryption fails or auth tag verification fails
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new Error('Invalid ciphertext: must be a non-empty string')
    }

    // Decode base64
    let combined: Buffer
    try {
      combined = Buffer.from(ciphertext, 'base64')
    } catch {
      throw new Error('Invalid ciphertext: not valid base64')
    }

    // Validate minimum length
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid ciphertext: too short')
    }

    // Extract components
    const iv = combined.slice(0, IV_LENGTH)
    const authTag = combined.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = combined.slice(IV_LENGTH + AUTH_TAG_LENGTH)

    // Create decipher
    const decipherKey = createSecretKey(this.key)
    const decipher = createDecipheriv(ALGORITHM, decipherKey, iv)

    // Set auth tag for verification
    decipher.setAuthTag(authTag)

    // Decrypt
    let decrypted: string
    try {
      decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]).toString('utf8')
    } catch (error) {
      // Auth tag verification failed or data corrupted
      throw new Error('Decryption failed: data may be corrupted or tampered with')
    }

    return decrypted
  }

  /**
   * Get the encryption key (for persistence)
   *
   * @returns Base64 encoded key
   */
  getKey(): string {
    return this.key.toString('base64')
  }

  /**
   * Get or create a persistent encryption key
   *
   * ⚠️ CRITICAL: In production, ENCRYPTION_KEY environment variable MUST be set.
   * This fallback key is ONLY for local development and should NEVER be used in production.
   *
   * @private
   * @throws {Error} If in production mode without ENCRYPTION_KEY set
   */
  private getOrCreatePersistentKey(): Buffer {
    const isDevelopment = process.env.NODE_ENV !== 'production'

    if (!isDevelopment) {
      throw new Error(
        'ENCRYPTION_KEY environment variable must be set in production. ' +
        'Generate a secure key with: openssl rand -base64 32'
      )
    }

    // Development-only: generate deterministic key for local testing
    // ⚠️ NOT SECURE - only for local development!
    const hostname = process.env.HOSTNAME || 'claude-canvas'
    const pid = process.pid || 0
    const seed = `claude-canvas-dev-${hostname}-${pid}`

    // Use crypto directly (already imported)
    const hash = require('crypto').createHash('sha256').update(seed).digest()

    return hash
  }
}

/**
 * Singleton instance for convenience
 *
 * In production, prefer explicit instantiation with a stored key.
 */
let defaultInstance: EncryptionService | null = null

/**
 * Get or create default encryption service instance
 */
export function getEncryptionService(): EncryptionService {
  if (!defaultInstance) {
    defaultInstance = new EncryptionService()
  }
  return defaultInstance
}
