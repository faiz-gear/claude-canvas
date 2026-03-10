/**
 * Tests for Auth Routes
 *
 * Tests onboarding and configuration API endpoints
 */

import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { authRoutes } from '../auth'

// Mock the services
const mockConfigService = {
  tryReadLocalConfig: async (): Promise<any> => null,
  detectLocalConfig: async (): Promise<boolean> => false,
  getClaudeDirectory: () => '/test/.claude',
  mergeConfig: (local: any, db: any) => ({
    ...db,
    ...local?.settings,
    hasLocalCredentials: local?.hasCredentials || false
  })
}

const mockEncryptionService = {
  encrypt: (key: string) => `encrypted-${key}`,
  decrypt: (key: string) => key.replace('encrypted-', '')
}

// Mock database
let mockDbConfig: Record<string, unknown> | null = null

describe('Auth API Routes', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()

    // Setup routes with mocked dependencies
    app.route('/api/auth', authRoutes({
      configService: mockConfigService as any,
      encryptionService: mockEncryptionService as any,
      getDbConfig: async () => mockDbConfig,
      setDbConfig: async (config: Record<string, unknown>) => {
        mockDbConfig = config
      }
    }))

    // Reset db config
    mockDbConfig = null
  })

  describe('GET /api/auth/config', () => {
    it('should return config status with no local or db config', async () => {
      const response = await app.request('/api/auth/config')
      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('hasConfig')
      expect(json.hasConfig).toBe(false)
      expect(json).toHaveProperty('hasLocalConfig')
      expect(json.hasLocalConfig).toBe(false)
      expect(json).toHaveProperty('config')
      expect(json.config).not.toHaveProperty('apiKey')
    })

    it('should detect existing local config', async () => {
      mockConfigService.detectLocalConfig = async () => true
      mockConfigService.tryReadLocalConfig = async () => ({
        settings: { model: 'claude-sonnet-4' },
        hasCredentials: true,
        hasSettings: true
      })

      const response = await app.request('/api/auth/config')
      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json.hasLocalConfig).toBe(true)
      expect(json.config.model).toBe('claude-sonnet-4')
      expect(json.config).not.toHaveProperty('apiKey')
    })

    it('should merge db config with local config', async () => {
      mockConfigService.detectLocalConfig = async () => true
      mockConfigService.tryReadLocalConfig = async () => ({
        settings: { model: 'claude-sonnet-4', temperature: 0.5 },
        hasCredentials: false,
        hasSettings: true
      })

      mockDbConfig = {
        apiKey: 'sk-ant-db-key',
        baseUrl: 'https://custom.anthropic.com'
      }

      const response = await app.request('/api/auth/config')
      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json.config.model).toBe('claude-sonnet-4')
      expect(json.config.temperature).toBe(0.5)
      // Db config should be included (apiKey would be encrypted in real scenario)
      expect(json.config.baseUrl).toBe('https://custom.anthropic.com')
    })

    it('should return hasConfig=true when any config exists', async () => {
      // Has db config only
      mockDbConfig = { apiKey: 'sk-ant-test' }

      const response = await app.request('/api/auth/config')
      const json = await response.json() as any

      expect(json.hasConfig).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      // Create a new app instance that throws an error
      const errorApp = new Hono()
      const throwingService = {
        ...mockConfigService,
        detectLocalConfig: async () => {
          throw new Error('Unexpected error')
        }
      }
      errorApp.route('/api/auth', authRoutes({
        configService: throwingService,
        encryptionService: mockEncryptionService as any,
        getDbConfig: async () => null,
        setDbConfig: async () => {}
      }))

      const response = await errorApp.request('/api/auth/config')
      const json = await response.json() as any

      expect(response.status).toBe(500)
      expect(json).toHaveProperty('error')
    })
  })

  describe('POST /api/auth/config', () => {
    it('should save valid config', async () => {
      const newConfig = {
        apiKey: 'sk-ant-api03-1234567890abcdef',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096
      }

      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })

      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('success')
      expect(json.success).toBe(true)
      expect(json).toHaveProperty('config')
      expect(json.config.model).toBe('claude-sonnet-4-20250514')
      // API key should be encrypted and not exposed in response
      expect(json.config).not.toHaveProperty('apiKey')
    })

    it('should reject invalid API key format', async () => {
      const invalidConfig = {
        apiKey: 'not-a-valid-api-key',
        model: 'claude-sonnet-4'
      }

      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      })

      const json = await response.json() as any

      expect(response.status).toBe(400)
      expect(json).toHaveProperty('error')
      expect(json.error).toContain('Invalid API key')
    })

    it('should reject empty API key', async () => {
      const invalidConfig = {
        apiKey: '',
        model: 'claude-sonnet-4'
      }

      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      })

      expect(response.status).toBe(400)
    })

    it('should accept valid API key formats', async () => {
      const validKeys = [
        'sk-ant-api03-1234567890abcdef',
        'sk-ant-api03-1234567890abcdefghijklmnopqrstuv',
        'sk-ant-api03-ABCDEFGHIJ', // 10 chars after prefix
        'sk-ant-12345678901', // at least 10 chars
        'sk-ant-test_key-123',
        'sk-ant-key_with_underscore'
      ]

      for (const apiKey of validKeys) {
        const response = await app.request('/api/auth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, model: 'claude-sonnet-4-20250514' })
        })

        expect(response.status).toBe(200)
      }
    })

    it('should update existing config', async () => {
      // Start with existing config
      mockDbConfig = {
        encryptedApiKey: 'encrypted-old-key',
        model: 'claude-opus-4'
      }

      const updateConfig = {
        apiKey: 'sk-ant-api03-new-key-12345',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7
      }

      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateConfig)
      })

      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json.config.model).toBe('claude-sonnet-4-20250514')
      expect(json.config.temperature).toBe(0.7)
    })

    it('should handle malformed JSON', async () => {
      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{{{'
      })

      expect(response.status).toBe(400)
    })

    it('should validate model name', async () => {
      const invalidConfig = {
        apiKey: 'sk-ant-api03-1234567890abcdef',
        model: 'invalid-model-name-xyz'
      }

      const response = await app.request('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidConfig)
      })

      const json = await response.json() as any

      expect(response.status).toBe(400)
      expect(json.error).toContain('model')
    })

    it('should accept valid model names', async () => {
      const validModels = [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307'
      ]

      for (const model of validModels) {
        const response = await app.request('/api/auth/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: 'sk-ant-api03-1234567890abcdef',
            model
          })
        })

        expect(response.status).toBe(200)
      }
    })
  })

  describe('DELETE /api/auth/config', () => {
    it('should clear existing config', async () => {
      mockDbConfig = {
        encryptedApiKey: 'encrypted-key',
        model: 'claude-sonnet-4'
      }

      const response = await app.request('/api/auth/config', {
        method: 'DELETE'
      })

      const json = await response.json() as any

      expect(response.status).toBe(200)
      expect(json).toHaveProperty('success')
      expect(json.success).toBe(true)
      // setDbConfig sets to {} not null
      expect(mockDbConfig).toEqual({})
    })

    it('should return success when no config exists', async () => {
      mockDbConfig = null

      const response = await app.request('/api/auth/config', {
        method: 'DELETE'
      })

      expect(response.status).toBe(200)
    })
  })
})
