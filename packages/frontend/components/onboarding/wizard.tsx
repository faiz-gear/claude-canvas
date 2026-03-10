'use client'

/**
 * OnboardingWizard
 *
 * Multi-step onboarding flow for first-time Claude Canvas setup.
 * Guides users through:
 * 1. Welcome
 * 2. Configuration Detection
 * 3. API Key Input
 * 4. Optional Settings
 * 5. Success
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'welcome' | 'detect' | 'api-key' | 'settings' | 'success'

interface ConfigStatus {
  hasConfig: boolean
  hasLocalConfig: boolean
  config: {
    model?: string
    maxTokens?: number
    temperature?: number
    baseUrl?: string
  }
}

interface FormData {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  baseUrl: string
}

const VALID_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Recommended)' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)' }
]

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with Claude Canvas' },
  { id: 'detect', title: 'Detect Configuration', description: 'Checking for existing setup' },
  { id: 'api-key', title: 'API Configuration', description: 'Enter your Claude API key' },
  { id: 'settings', title: 'Optional Settings', description: 'Customize your experience' },
  { id: 'success', title: 'Setup Complete', description: 'You are ready to go' }
]

export function OnboardingWizard() {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.7,
    baseUrl: ''
  })

  const currentStep = STEPS[currentStepIndex]?.id as Step

  // Fetch config status on detect step
  useEffect(() => {
    if (currentStep === 'detect' && !configStatus) {
      fetchConfigStatus()
    }
  }, [currentStep, configStatus])

  const fetchConfigStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/config')
      if (!response.ok) {
        throw new Error('Failed to fetch configuration')
      }
      const data = await response.json()
      setConfigStatus(data)

      // If already has config, skip to success
      if (data.hasConfig) {
        setCurrentStepIndex(4)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formData.apiKey,
          model: formData.model,
          maxTokens: formData.maxTokens,
          temperature: formData.temperature,
          baseUrl: formData.baseUrl || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      // Move to success step
      setCurrentStepIndex(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 'settings') {
      await saveConfig()
      return
    }

    // Validate API key step
    if (currentStep === 'api-key') {
      if (!validateApiKey(formData.apiKey)) {
        setError('Invalid API key format')
        return
      }
    }

    setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
    setError(null)
  }

  const validateApiKey = (key: string): boolean => {
    return /^sk-ant-[a-zA-Z0-9_-]{10,}$/.test(key)
  }

  const handleFinish = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator */}
        {currentStep !== 'welcome' && currentStep !== 'success' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                Step {currentStepIndex} of {STEPS.length - 1}
              </span>
              <span className="text-sm text-slate-400">
                {Math.round((currentStepIndex / (STEPS.length - 1)) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {currentStep === 'welcome' && <WelcomeStep onNext={handleNext} />}
          {currentStep === 'detect' && <DetectStep isLoading={isLoading} configStatus={configStatus} onNext={handleNext} />}
          {currentStep === 'api-key' && (
            <ApiKeyStep
              formData={formData}
              onChange={setFormData}
              error={error}
            />
          )}
          {currentStep === 'settings' && (
            <SettingsStep formData={formData} onChange={setFormData} />
          )}
          {currentStep === 'success' && <SuccessStep onFinish={handleFinish} />}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'welcome' && currentStep !== 'success' && currentStep !== 'detect' && (
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : currentStep === 'settings' ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Step Components
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to Claude Canvas</h1>
        <p className="text-slate-400">
          A powerful web UI for Claude Code with agent visualization and workflow orchestration.
        </p>
      </div>

      <div className="text-left space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Agent Visualization</h3>
            <p className="text-sm text-slate-400">Watch Claude Code agents execute in real-time</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Workflow Builder</h3>
            <p className="text-sm text-slate-400">Create automated workflows with drag-and-drop</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Terminal & File Browser</h3>
            <p className="text-sm text-slate-400">Full access to your development environment</p>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
      >
        Get Started
      </button>
    </div>
  )
}

function DetectStep({
  isLoading,
  configStatus,
  onNext
}: {
  isLoading: boolean
  configStatus: ConfigStatus | null
  onNext: () => void
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-300">Detecting configuration...</p>
      </div>
    )
  }

  if (configStatus?.hasLocalConfig) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Local Configuration Detected</h2>
        <p className="text-slate-400 mb-6">
          We found your existing Claude Code configuration.
          {configStatus.config.model && ` Using model: ${configStatus.config.model}`}
        </p>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">No Configuration Found</h2>
      <p className="text-slate-400 mb-6">
        We couldn't find an existing Claude Code configuration. Let's set up your API key to get started.
      </p>
      <button
        onClick={onNext}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Continue to API Setup
      </button>
    </div>
  )
}

function ApiKeyStep({
  formData,
  onChange,
  error
}: {
  formData: FormData
  onChange: (data: FormData) => void
  error: string | null
}) {
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Configure Claude API</h2>
      <p className="text-slate-400 mb-6">
        Enter your Anthropic API key to connect to Claude.
      </p>

      <div className="space-y-6">
        {/* API Key Input */}
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              value={formData.apiKey}
              onChange={(e) => onChange({ ...formData, apiKey: e.target.value })}
              placeholder="sk-ant-api03-..."
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
            >
              {showApiKey ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400">Invalid API key format. Keys start with "sk-ant-"</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Get your API key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              console.anthropic.com
            </a>
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-slate-300 mb-2">
            Model
          </label>
          <select
            id="model"
            value={formData.model}
            onChange={(e) => onChange({ ...formData, model: e.target.value })}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {VALID_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Base URL (Optional) */}
        <div>
          <label htmlFor="baseUrl" className="block text-sm font-medium text-slate-300 mb-2">
            Base URL (Optional)
          </label>
          <input
            id="baseUrl"
            type="url"
            value={formData.baseUrl}
            onChange={(e) => onChange({ ...formData, baseUrl: e.target.value })}
            placeholder="https://api.anthropic.com"
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Only change this if you are using a custom API endpoint
          </p>
        </div>
      </div>
    </div>
  )
}

function SettingsStep({ formData, onChange }: { formData: FormData; onChange: (data: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">Optional Settings</h2>
      <p className="text-slate-400 mb-6">
        Customize your experience. These can be changed later.
      </p>

      <div className="space-y-8">
        {/* Max Tokens */}
        <div>
          <label htmlFor="maxTokens" className="block text-sm font-medium text-slate-300 mb-2">
            Max Tokens: {formData.maxTokens}
          </label>
          <input
            id="maxTokens"
            type="range"
            min={1024}
            max={8192}
            step={1024}
            value={formData.maxTokens}
            onChange={(e) => onChange({ ...formData, maxTokens: parseInt(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1K</span>
            <span>8K</span>
          </div>
        </div>

        {/* Temperature */}
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-slate-300 mb-2">
            Temperature: {formData.temperature}
          </label>
          <input
            id="temperature"
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={formData.temperature}
            onChange={(e) => onChange({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Precise (0)</span>
            <span>Creative (1)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>

      <h2 className="text-3xl font-bold text-white mb-2">Setup Complete!</h2>
      <p className="text-slate-400 mb-8">
        Your Claude Canvas is ready to use. Start chatting with Claude or explore the workflow builder.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-white mb-1">Chat</div>
          <div className="text-sm text-slate-400">Start a conversation</div>
        </div>
        <div className="p-4 bg-slate-700/50 rounded-lg">
          <div className="text-2xl font-bold text-white mb-1">Workflows</div>
          <div className="text-sm text-slate-400">Build automation</div>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  )
}
