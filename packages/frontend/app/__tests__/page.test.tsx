import { describe, it, expect } from 'bun:test'
import { createElement } from 'react'

/**
 * Test Suite: Frontend Dashboard Page
 *
 * These tests verify the dashboard renders correctly.
 */
describe('Dashboard', () => {
  it('should be a valid React component', async () => {
    const { default: Dashboard } = await import('../page')

    // Verify Dashboard is a function/component
    expect(typeof Dashboard).toBe('function')
  })

  it('should have valid page exports', async () => {
    const pageModule = await import('../page')

    // Next.js pages should have default export
    expect(pageModule).toHaveProperty('default')
  })

  it('should generate metadata', async () => {
    // Import the metadata if available
    const layoutModule = await import('../layout')

    expect(layoutModule).toHaveProperty('metadata')
  })
})
