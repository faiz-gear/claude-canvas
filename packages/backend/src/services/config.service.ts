/**
 * ConfigService
 *
 * Detects and reads local Claude Code configuration from ~/.claude directory.
 * Merges local config with database config for unified configuration.
 *
 * Security: Never exposes sensitive data (API keys, tokens) from local config.
 */

import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { homedir } from 'os'

/**
 * Sensitive field names that should never be exposed from local config
 */
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionKey',
  'session_key',
  'customApiKey',
  'custom_api_key'
]

/**
 * Local configuration result
 */
export interface LocalConfig {
  settings: Record<string, unknown>
  hasCredentials: boolean
  hasSettings: boolean
}

/**
 * Merged configuration result
 */
export interface MergedConfig extends Record<string, unknown> {
  hasLocalCredentials: boolean
}

/**
 * Config service options
 */
export interface ConfigServiceOptions {
  homeDir?: string
}

/**
 * Service for detecting and reading Claude Code configuration
 */
export class ConfigService {
  private homeDir: string

  constructor(options: ConfigServiceOptions = {}) {
    this.homeDir = options.homeDir || homedir()
  }

  /**
   * Get the path to the .claude directory
   */
  getClaudeDirectory(): string {
    return join(this.homeDir, '.claude')
  }

  /**
   * Detect if local Claude config exists
   */
  async detectLocalConfig(): Promise<boolean> {
    const claudePath = this.getClaudeDirectory()

    try {
      const stats = await stat(claudePath)
      return stats.isDirectory()
    } catch {
      return false
    }
  }

  /**
   * Read local configuration from ~/.claude
   *
   * Returns null if .claude doesn't exist or has no valid config
   *
   * @returns Local config with sensitive fields removed
   */
  async tryReadLocalConfig(): Promise<LocalConfig | null> {
    const claudePath = this.getClaudeDirectory()

    // Check if directory exists
    if (!existsSync(claudePath)) {
      return null
    }

    let settings: Record<string, unknown> = {}
    let hasCredentials = false
    let hasSettings = false

    // Try to read settings.json
    const settingsPath = join(claudePath, 'settings.json')
    try {
      const content = await readFile(settingsPath, 'utf-8')
      const rawSettings = JSON.parse(content) as Record<string, unknown>

      // Filter out sensitive fields
      settings = this.filterSensitiveFields(rawSettings)
      hasSettings = true
    } catch {
      // File doesn't exist or invalid JSON - continue
    }

    // Check for .credentials.json
    const credentialsPath = join(claudePath, '.credentials.json')
    try {
      await stat(credentialsPath)
      hasCredentials = true
    } catch {
      // Credentials file doesn't exist
    }

    // Return null if we found nothing
    if (!hasSettings && !hasCredentials) {
      return null
    }

    return {
      settings,
      hasCredentials,
      hasSettings
    }
  }

  /**
   * Merge local config with database config
   *
   * Local config takes precedence over database config for settings.
   * Sensitive data (API keys) comes from database config only.
   *
   * @param localConfig - Config from local .claude directory
   * @param dbConfig - Config from database (encrypted)
   * @returns Merged configuration
   */
  mergeConfig(
    localConfig: LocalConfig | null,
    dbConfig: Record<string, unknown> | null
  ): MergedConfig {
    const merged: MergedConfig = {
      hasLocalCredentials: localConfig?.hasCredentials || false
    }

    // Start with database config
    if (dbConfig) {
      Object.assign(merged, { ...dbConfig })
    }

    // Overlay local settings (they take precedence)
    if (localConfig?.settings) {
      Object.assign(merged, { ...localConfig.settings })
    }

    return merged
  }

  /**
   * Remove sensitive fields from config object
   *
   * @param config - Raw config object
   * @returns Config with sensitive fields removed
   */
  private filterSensitiveFields(
    config: Record<string, unknown>
  ): Record<string, unknown> {
    const filtered: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(config)) {
      if (!SENSITIVE_FIELDS.includes(key)) {
        filtered[key] = value
      }
    }

    return filtered
  }

  /**
   * Check if a field name is sensitive
   */
  isSensitiveField(fieldName: string): boolean {
    const normalizedName = fieldName.toLowerCase()
    return SENSITIVE_FIELDS.some((sensitive) =>
      sensitive.toLowerCase() === normalizedName
    )
  }
}

/**
 * Singleton instance
 */
let defaultInstance: ConfigService | null = null

/**
 * Get default config service instance
 */
export function getConfigService(): ConfigService {
  if (!defaultInstance) {
    defaultInstance = new ConfigService()
  }
  return defaultInstance
}
