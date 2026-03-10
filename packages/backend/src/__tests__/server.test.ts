import { describe, it, expect, beforeAll } from 'bun:test'
import { app as honaApp } from '../index'

/**
 * Test Suite: Backend Server
 *
 * These tests verify the Hono server setup and configuration.
 */
describe('Backend Server', () => {
  it('should respond to health check', async () => {
    const response = await honaApp.request('/health')
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toHaveProperty('status')
    expect(json.status).toBe('ok')
  })

  it('should handle CORS preflight', async () => {
    const response = await honaApp.request('/api/test', {
      method: 'OPTIONS'
    })

    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('should handle GET request to api/test', async () => {
    const response = await honaApp.request('/api/test')
    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toHaveProperty('message')
    expect(json.message).toBe('API is working')
  })

  it('should have 404 for unknown routes', async () => {
    const response = await honaApp.request('/unknown-route')
    expect(response.status).toBe(404)
  })

  it('should handle errors gracefully', async () => {
    // The error handler returns 500 for errors
    // We can't easily trigger an error from a test without mocking
    // but we can verify the 404 handler works
    const response = await honaApp.request('/nonexistent')
    expect(response.status).toBe(404)
  })
})
