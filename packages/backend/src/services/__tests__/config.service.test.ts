/**
 * Tests for ConfigService
 *
 * Tests detection and reading of local Claude Code configuration
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { ConfigService } from '../config.service'
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ConfigService', () => {
  let tempDir: string
  let configService: ConfigService
  let claudeDir: string

  async function setupTestDir() {
    tempDir = await mkdtemp(join(tmpdir(), 'claude-canvas-test-'))
    claudeDir = join(tempDir, '.claude')
    configService = new ConfigService({ homeDir: tempDir })
  }

  async function cleanupTestDir() {
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  beforeEach(async () => {
    await setupTestDir()
  })

  afterEach(async () => {
    await cleanupTestDir()
  })

  describe('tryReadLocalConfig', () => {
    it('should return null when .claude directory does not exist', async () => {
      const result = await configService.tryReadLocalConfig()

      expect(result).toBeNull()
    })

    it('should return null when .claude directory exists but no config files', async () => {
      await mkdir(claudeDir, { recursive: true })

      const result = await configService.tryReadLocalConfig()

      expect(result).toBeNull()
    })

    it('should read settings.json when present', async () => {
      await mkdir(claudeDir, { recursive: true })

      const settings = {
        apiKey: 'sk-ant-test-key',
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096
      }

      await writeFile(
        join(claudeDir, 'settings.json'),
        JSON.stringify(settings, null, 2)
      )

      const result = await configService.tryReadLocalConfig()

      expect(result).not.toBeNull()
      expect(result?.settings).toEqual({
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096
      })
      // API key should NOT be exposed
      expect(result?.settings).not.toHaveProperty('apiKey')
    })

    it('should read .credentials.json when present', async () => {
      await mkdir(claudeDir, { recursive: true })

      const credentials = {
        apiKey: 'sk-ant-test-key',
        refreshToken: 'test-refresh-token'
      }

      await writeFile(
        join(claudeDir, '.credentials.json'),
        JSON.stringify(credentials, null, 2)
      )

      const result = await configService.tryReadLocalConfig()

      expect(result).not.toBeNull()
      // Credentials should NEVER be exposed from local config
      expect(result?.hasCredentials).toBe(true)
      expect(result?.credentials).toBeUndefined()
    })

    it('should read both settings and credentials files', async () => {
      await mkdir(claudeDir, { recursive: true })

      await writeFile(
        join(claudeDir, 'settings.json'),
        JSON.stringify({ model: 'claude-opus-4', maxTokens: 8192 }, null, 2)
      )

      await writeFile(
        join(claudeDir, '.credentials.json'),
        JSON.stringify({ apiKey: 'sk-ant-test-key' }, null, 2)
      )

      const result = await configService.tryReadLocalConfig()

      expect(result).not.toBeNull()
      expect(result?.settings).toEqual({
        model: 'claude-opus-4',
        maxTokens: 8192
      })
      expect(result?.hasCredentials).toBe(true)
    })

    it('should handle malformed JSON gracefully', async () => {
      await mkdir(claudeDir, { recursive: true })

      await writeFile(
        join(claudeDir, 'settings.json'),
        'invalid json content {{{'
      )

      const result = await configService.tryReadLocalConfig()

      // Should return null or partial result, not crash
      expect(result).toBeNull()
    })

    it('should handle empty settings file', async () => {
      await mkdir(claudeDir, { recursive: true })

      await writeFile(
        join(claudeDir, 'settings.json'),
        '{}'
      )

      const result = await configService.tryReadLocalConfig()

      expect(result).not.toBeNull()
      expect(result?.settings).toEqual({})
    })

    it('should exclude sensitive fields from settings', async () => {
      await mkdir(claudeDir, { recursive: true })

      const settingsWithSecrets = {
        apiKey: 'sk-ant-secret',
        model: 'claude-sonnet-4',
        accessToken: 'token-123',
        customApiKey: 'another-secret',
        maxTokens: 4096
      }

      await writeFile(
        join(claudeDir, 'settings.json'),
        JSON.stringify(settingsWithSecrets, null, 2)
      )

      const result = await configService.tryReadLocalConfig()

      expect(result).not.toBeNull()
      expect(result?.settings).toEqual({
        model: 'claude-sonnet-4',
        maxTokens: 4096
      })
      // No sensitive fields should be present
      expect(result?.settings).not.toHaveProperty('apiKey')
      expect(result?.settings).not.toHaveProperty('accessToken')
      expect(result?.settings).not.toHaveProperty('customApiKey')
    })
  })

  describe('mergeConfig', () => {
    it('should merge local and db config correctly', () => {
      const localConfig = {
        settings: {
          model: 'claude-sonnet-4',
          maxTokens: 4096
        },
        hasCredentials: true
      }

      const dbConfig = {
        apiKey: 'sk-ant-db-key',
        baseUrl: 'https://custom.anthropic.com'
      }

      const merged = configService.mergeConfig(localConfig, dbConfig)

      expect(merged).toEqual({
        model: 'claude-sonnet-4',
        maxTokens: 4096,
        apiKey: 'sk-ant-db-key',
        baseUrl: 'https://custom.anthropic.com',
        hasLocalCredentials: true
      })
    })

    it('should use db config values when local is missing', () => {
      const localConfig = {
        settings: {},
        hasCredentials: false
      }

      const dbConfig = {
        apiKey: 'sk-ant-db-key',
        model: 'claude-opus-4'
      }

      const merged = configService.mergeConfig(localConfig, dbConfig)

      expect(merged).toEqual({
        apiKey: 'sk-ant-db-key',
        model: 'claude-opus-4',
        hasLocalCredentials: false
      })
    })

    it('should prefer local config over db config', () => {
      const localConfig = {
        settings: {
          model: 'claude-sonnet-4-local',
          temperature: 0.5
        },
        hasCredentials: true
      }

      const dbConfig = {
        model: 'claude-opus-4-db',
        temperature: 0.8
      }

      const merged = configService.mergeConfig(localConfig, dbConfig)

      // Local settings should take precedence
      expect(merged.model).toBe('claude-sonnet-4-local')
      expect(merged.temperature).toBe(0.5)
    })

    it('should handle null local config', () => {
      const dbConfig = {
        apiKey: 'sk-ant-db-key',
        model: 'claude-sonnet-4'
      }

      const merged = configService.mergeConfig(null, dbConfig)

      expect(merged).toEqual({
        apiKey: 'sk-ant-db-key',
        model: 'claude-sonnet-4',
        hasLocalCredentials: false
      })
    })

    it('should handle null db config', () => {
      const localConfig = {
        settings: {
          model: 'claude-sonnet-4'
        },
        hasCredentials: false
      }

      const merged = configService.mergeConfig(localConfig, null)

      expect(merged).toEqual({
        model: 'claude-sonnet-4',
        hasLocalCredentials: false
      })
    })

    it('should handle both null configs', () => {
      const merged = configService.mergeConfig(null, null)

      expect(merged).toEqual({
        hasLocalCredentials: false
      })
    })
  })

  describe('detectLocalConfig', () => {
    it('should return false when .claude does not exist', async () => {
      const hasLocal = await configService.detectLocalConfig()

      expect(hasLocal).toBe(false)
    })

    it('should return true when .claude exists', async () => {
      await mkdir(claudeDir, { recursive: true })

      const hasLocal = await configService.detectLocalConfig()

      expect(hasLocal).toBe(true)
    })
  })

  describe('getClaudeDirectory', () => {
    it('should return correct path for custom home dir', () => {
      const service = new ConfigService({ homeDir: '/custom/home' })
      const path = service.getClaudeDirectory()

      expect(path).toBe('/custom/home/.claude')
    })

    it('should use default home dir when not specified', () => {
      const service = new ConfigService()
      const path = service.getClaudeDirectory()

      expect(path).toContain('.claude')
    })
  })
})
