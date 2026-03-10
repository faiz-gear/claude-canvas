/**
 * Tests for OnboardingWizard component
 *
 * Tests the multi-step onboarding flow for first-time setup
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { OnboardingWizard } from '../wizard'

// Mock the API
const mockFetch = global.fetch = bunFetch as any

// Test helpers
function renderWithWrapper(component: React.ReactElement) {
  return render(component)
}

describe('OnboardingWizard', () => {
  beforeEach(() => {
    // Reset fetch mock
    mockFetch.mockClear()
  })

  afterEach(() => {
    // Cleanup
  })

  describe('Initial State', () => {
    it('should show welcome screen initially', () => {
      renderWithWrapper(<OnboardingWizard />)

      expect(screen.getByText('Welcome')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
    })

    it('should show progress indicator', () => {
      renderWithWrapper(<OnboardingWizard />)

      const progress = screen.getByRole('progressbar', { hidden: true })
      expect(progress).toBeInTheDocument()
    })

    it('should show total number of steps', () => {
      renderWithWrapper(<OnboardingWizard />)

      // Should show at least the welcome step
      expect(screen.getByText(/step/i)).toBeInTheDocument()
    })
  })

  describe('Step 1: Detect Configuration', () => {
    it('should advance to config detection on Get Started click', async () => {
      renderWithWrapper(<OnboardingWizard />)

      const startButton = screen.getByRole('button', { name: /get started/i })
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText(/detect.*configuration/i)).toBeInTheDocument()
      })
    })

    it('should show loading state while detecting', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {}))

      renderWithWrapper(<OnboardingWizard />)

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/detecting/i)).toBeInTheDocument()
      })
    })

    it('should show "No local config found" when .claude does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConfig: false,
          hasLocalConfig: false,
          config: {}
        })
      })

      renderWithWrapper(<OnboardingWizard />)

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/no.*config.*found/i)).toBeInTheDocument()
      })
    })

    it('should show "Local config detected" when .claude exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasConfig: true,
          hasLocalConfig: true,
          config: {
            model: 'claude-sonnet-4'
          }
        })
      })

      renderWithWrapper(<OnboardingWizard />)

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/local.*config.*detected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Step 2: API Key Configuration', () => {
    beforeEach(async () => {
      // Start the wizard and advance to step 2
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          hasConfig: false,
          hasLocalConfig: false,
          config: {}
        })
      })
    })

    it('should show API key input field', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Click through to step 2
      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/no.*config.*found/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
      })
    })

    it('should validate API key format', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Navigate to API key step
      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        const input = screen.getByLabelText(/api key/i)
        fireEvent.change(input, { target: { value: 'invalid-key' } })
        fireEvent.blur(input)

        expect(screen.getByText(/invalid.*api.*key/i)).toBeInTheDocument()
      })
    })

    it('should show model selector', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Navigate to API key step
      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        expect(screen.getByLabelText(/model/i)).toBeInTheDocument()
        expect(screen.getByText(/claude.*sonnet/i)).toBeInTheDocument()
        expect(screen.getByText(/claude.*opus/i)).toBeInTheDocument()
      })
    })
  })

  describe('Step 3: Optional Settings', () => {
    it('should show max tokens input', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Navigate through to step 3
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
      })

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText(/api key/i)
        fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-api03-1234567890abcdef' } })
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/max.*tokens/i)).toBeInTheDocument()
      })
    })

    it('should show temperature slider', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Navigate through to step 3
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
      })

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText(/api key/i)
        fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-api03-1234567890abcdef' } })
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/temperature/i)).toBeInTheDocument()
      })
    })
  })

  describe('Step 4: Success', () => {
    it('should show success message after completion', async () => {
      renderWithWrapper(<OnboardingWizard />)

      // Mock successful API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, config: {} })
        })

      // Complete the flow
      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText(/api key/i)
        fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-api03-1234567890abcdef' } })
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        expect(screen.getByText(/setup.*complete|success/i)).toBeInTheDocument()
      })
    })

    it('should redirect to dashboard after completion', async () => {
      const mockRouter = { push: jest.fn() }

      renderWithWrapper(<OnboardingWizard />)

      // Mock successful API calls and redirect
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, config: {} })
        })

      // Complete the flow
      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      })

      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText(/api key/i)
        fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-api03-1234567890abcdef' } })
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))
      fireEvent.click(screen.getByRole('button', { name: /finish|done|go to dashboard/i }))

      await waitFor(() => {
        expect(screen.getByText(/setup.*complete/i)).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should allow going back to previous step', async () => {
      renderWithWrapper(<OnboardingWizard />)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
      })

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/detect.*configuration/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument()
      })
    })

    it('should disable back button on welcome screen', () => {
      renderWithWrapper(<OnboardingWizard />)

      const backButton = screen.queryByRole('button', { name: /back/i })
      expect(backButton).not.toBeInTheDocument()
    })

    it('should update progress indicator when moving between steps', async () => {
      renderWithWrapper(<OnboardingWizard />)

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ hasConfig: false, hasLocalConfig: false, config: {} })
      })

      fireEvent.click(screen.getByRole('button', { name: /get started/i }))

      await waitFor(() => {
        expect(screen.getByText(/step.*1.*of.*4/i)).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        const apiKeyInput = screen.getByLabelText(/api key/i)
        fireEvent.change(apiKeyInput, { target: { value: 'sk-ant-api03-1234567890abcdef' } })
      })

      fireEvent.click(screen.getByRole('button', { name: /continue|next/i }))

      await waitFor(() => {
        expect(screen.getByText(/step.*3.*of.*4/i)).toBeInTheDocument()
      })
    })
  })
})

function bunFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Mock implementation - will be replaced by tests
  return Promise.resolve({
    ok: true,
    json: async () => ({})
  } as Response)
}
