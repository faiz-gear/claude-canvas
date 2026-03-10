import { describe, it, expect } from 'bun:test'
import type { Agent, Workflow, Message, Session, AgentStatus } from '../types'

/**
 * Test Suite: Shared Types
 *
 * These tests verify that shared TypeScript types are properly exported
 * and can be used by both frontend and backend packages.
 *
 * Note: TypeScript types are erased at runtime, so we test them through
 * type assertions and runtime value validation.
 */
describe('Shared Types', () => {
  it('should create valid Agent object with required fields', () => {
    const agent: Agent = {
      id: 'test-agent-id',
      name: 'Test Agent',
      status: 'idle',
      toolCalls: []
    }

    expect(agent.id).toBe('test-agent-id')
    expect(agent.name).toBe('Test Agent')
    expect(agent.status).toBe('idle')
    expect(agent.toolCalls).toEqual([])
  })

  it('should accept all valid Agent status values', () => {
    const statuses: AgentStatus[] = ['idle', 'running', 'completed', 'failed']

    statuses.forEach(status => {
      const agent: Agent = {
        id: 'test-id',
        name: 'Test',
        status,
        toolCalls: []
      }
      expect(['idle', 'running', 'completed', 'failed']).toContain(agent.status)
    })
  })

  it('should create valid Workflow object', () => {
    const workflow: Workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      nodes: [],
      edges: [],
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    expect(workflow.id).toBe('test-workflow')
    expect(workflow.name).toBe('Test Workflow')
    expect(workflow.nodes).toEqual([])
    expect(workflow.edges).toEqual([])
  })

  it('should create valid Message object', () => {
    const message: Message = {
      id: 'test-message',
      role: 'user',
      content: 'Hello, world!',
      timestamp: Date.now()
    }

    expect(message.id).toBe('test-message')
    expect(message.role).toBe('user')
    expect(message.content).toBe('Hello, world!')
  })

  it('should create valid Session object', () => {
    const session: Session = {
      id: 'test-session',
      title: 'Test Session',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    expect(session.id).toBe('test-session')
    expect(session.title).toBe('Test Session')
    expect(session.messages).toEqual([])
  })

  it('should allow optional fields in Agent', () => {
    const agent: Agent = {
      id: 'test-id',
      name: 'Test',
      status: 'running',
      toolCalls: [],
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      error: 'Test error'
    }

    expect(agent.startTime).toBeDefined()
    expect(agent.endTime).toBeDefined()
    expect(agent.error).toBe('Test error')
  })

  it('should support Workflow with all fields', () => {
    const workflow: Workflow = {
      id: 'test-workflow',
      name: 'Test Workflow',
      description: 'A test workflow',
      nodes: [
        {
          id: 'node-1',
          type: 'prompt',
          name: 'Prompt Node',
          config: { prompt: 'Hello' },
          position: { x: 100, y: 100 }
        }
      ],
      edges: [
        {
          id: 'edge-1',
          from: 'node-1',
          to: 'node-2'
        }
      ],
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    expect(workflow.nodes).toHaveLength(1)
    expect(workflow.edges).toHaveLength(1)
    expect(workflow.description).toBe('A test workflow')
  })
})
