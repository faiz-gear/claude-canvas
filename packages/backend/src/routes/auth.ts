/**
 * Auth Routes
 *
 * API endpoints for onboarding and configuration management.
 * Handles detection, retrieval, and storage of Claude API configuration.
 */

import { Hono } from 'hono'
import type {
  ConfigService,
  EncryptionService
} from '../services'

/**
 * Valid Claude API models
 */
const VALID_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2'
]

/**
 * API key pattern validation
 * Claude API keys start with 'sk-ant-api03' or 'sk-ant-' followed by alphanumeric
 */
const API_KEY_PATTERN = /^sk-ant-[a-zA-Z0-9_-]{10,}$/

/**
 * Request body for config update
 */
interface UpdateConfigRequest {
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
  baseUrl?: string
  [key: string]: unknown
}

/**
 * Dependencies for auth routes
 */
export interface AuthRoutesDeps {
  configService: Pick<ConfigService, 'tryReadLocalConfig' | 'detectLocalConfig' | 'getClaudeDirectory' | 'mergeConfig'>
  encryptionService: Pick<EncryptionService, 'encrypt' | 'decrypt'>
  getDbConfig: () => Promise<Record<string, unknown> | null>
  setDbConfig: (config: Record<string, unknown>) => Promise<void>
  clearDbConfig?: () => Promise<void>
}

/**
 * Create auth routes with dependencies
 */
export function authRoutes(deps: AuthRoutesDeps): Hono {
  const app = new Hono()

  /**
   * GET /api/auth/config
   *
   * Get current configuration status
   */
  app.get('/config', async (c) => {
    try {
      // Check for local config
      const hasLocalConfig = await deps.configService.detectLocalConfig()
      const localConfig = await deps.configService.tryReadLocalConfig()

      // Get database config
      const dbConfig = await deps.getDbConfig()

      // Decrypt API key from database if present
      let decryptedDbConfig: Record<string, unknown> | null = null
      if (dbConfig?.encryptedApiKey) {
        try {
          const apiKey = deps.encryptionService.decrypt(dbConfig.encryptedApiKey as string)
          // Create new object without encryptedApiKey
          const { encryptedApiKey, ...safeDbConfig } = dbConfig
          decryptedDbConfig = { ...safeDbConfig, apiKey }
        } catch {
          // Decryption failed - DO NOT expose encryptedApiKey
          // Use db config but remove the encrypted key
          const { encryptedApiKey, ...safeDbConfig } = dbConfig
          decryptedDbConfig = safeDbConfig
        }
      } else {
        decryptedDbConfig = dbConfig
      }

      // Merge configs (local takes precedence for settings)
      const mergedConfig = localConfig
        ? deps.configService.mergeConfig(localConfig, decryptedDbConfig)
        : {
            ...decryptedDbConfig,
            hasLocalCredentials: false
          }

      // Determine if any config exists
      const hasConfig = hasLocalConfig || dbConfig !== null

      return c.json({
        hasConfig,
        hasLocalConfig,
        config: mergedConfig
      })
    } catch (error) {
      console.error('Error getting config:', error)
      return c.json({ error: 'Failed to get configuration' }, 500)
    }
  })

  /**
   * POST /api/auth/config
   *
   * Save or update configuration
   */
  app.post('/config', async (c) => {
    try {
      const body = await c.req.json<UpdateConfigRequest>()

      // Validate API key if provided
      if (body.apiKey !== undefined) {
        if (!body.apiKey || typeof body.apiKey !== 'string') {
          return c.json({ error: 'API key is required and must be a string' }, 400)
        }

        if (!API_KEY_PATTERN.test(body.apiKey)) {
          return c.json({
            error: 'Invalid API key format. Claude API keys start with "sk-ant-"'
          }, 400)
        }
      }

      // Validate model if provided
      if (body.model !== undefined) {
        if (!VALID_MODELS.includes(body.model)) {
          return c.json({
            error: `Invalid model. Valid models: ${VALID_MODELS.join(', ')}`
          }, 400)
        }
      }

      // Get existing config
      const existingConfig = await deps.getDbConfig()

      // Encrypt API key if provided
      let configToSave: Record<string, unknown> = { ...existingConfig || {} }

      if (body.apiKey) {
        configToSave.encryptedApiKey = deps.encryptionService.encrypt(body.apiKey)
      }

      // Update other fields
      if (body.model !== undefined) configToSave.model = body.model
      if (body.maxTokens !== undefined) configToSave.maxTokens = body.maxTokens
      if (body.temperature !== undefined) configToSave.temperature = body.temperature
      if (body.baseUrl !== undefined) configToSave.baseUrl = body.baseUrl

      // Add additional fields
      for (const [key, value] of Object.entries(body)) {
        if (
          key !== 'apiKey' &&
          key !== 'model' &&
          key !== 'maxTokens' &&
          key !== 'temperature' &&
          key !== 'baseUrl'
        ) {
          configToSave[key] = value
        }
      }

      // Save to database
      await deps.setDbConfig(configToSave)

      // Return config without exposing API key
      const { encryptedApiKey, ...safeConfig } = configToSave

      return c.json({
        success: true,
        config: safeConfig
      })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return c.json({ error: 'Invalid JSON' }, 400)
      }
      console.error('Error saving config:', error)
      return c.json({ error: 'Failed to save configuration' }, 500)
    }
  })

  /**
   * DELETE /api/auth/config
   *
   * Clear stored configuration
   */
  app.delete('/config', async (c) => {
    try {
      if (deps.clearDbConfig) {
        await deps.clearDbConfig()
      } else {
        await deps.setDbConfig({})
      }

      return c.json({
        success: true,
        message: 'Configuration cleared'
      })
    } catch (error) {
      console.error('Error clearing config:', error)
      return c.json({ error: 'Failed to clear configuration' }, 500)
    }
  })

  return app
}
