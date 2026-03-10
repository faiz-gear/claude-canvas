/**
 * Main backend server using Hono
 *
 * Serves the API with WebSocket support and CORS
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createBunWebSocket } from 'hono/bun'

// Create WebSocket upgrade handler
const { websocket } = createBunWebSocket()

// Create Hono app
const app = new Hono()

// CORS middleware
app.use('/*', cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// API routes
app.get('/api/test', (c) => {
  return c.json({ message: 'API is working' })
})

// WebSocket endpoint
app.get('/ws', websocket)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Export app for testing
export { app }

// Export for Bun server
export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
  websocket
}
