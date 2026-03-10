/**
 * Shared TypeScript types for Claude Canvas
 *
 * This file contains all type definitions shared between
 * frontend and backend packages.
 */

// ============================================
// Agent Types
// ============================================

/**
 * Status of an agent execution
 */
export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed'

/**
 * A tool call made by an agent
 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  error?: string
  timestamp: number
}

/**
 * Agent execution state
 */
export interface Agent {
  id: string
  name: string
  status: AgentStatus
  toolCalls: ToolCall[]
  startTime?: number
  endTime?: number
  error?: string
}

// ============================================
// Workflow Types
// ============================================

/**
 * Node type in a workflow
 */
export type WorkflowNodeType = 'prompt' | 'agent' | 'tool' | 'condition' | 'loop'

/**
 * A workflow node
 */
export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  name: string
  config: Record<string, unknown>
  position?: { x: number; y: number }
}

/**
 * A connection between workflow nodes
 */
export interface WorkflowEdge {
  id: string
  from: string
  to: string
  condition?: string
}

/**
 * Workflow execution status
 */
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed'

/**
 * A workflow definition
 */
export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: WorkflowStatus
  createdAt: number
  updatedAt: number
}

// ============================================
// Chat Types
// ============================================

/**
 * Message role in conversation
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * A chat message
 */
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
}

// ============================================
// Session Types
// ============================================

/**
 * A chat session
 */
export interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  workflowId?: string
}

// ============================================
// MCP Types
// ============================================

/**
 * MCP server connection status
 */
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * An MCP server configuration
 */
export interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  status: MCPServerStatus
  tools?: MCPTool[]
}

/**
 * An MCP tool available on a server
 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// ============================================
// Re-exports
// ============================================

export type {
  Agent,
  AgentStatus,
  ToolCall,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowStatus,
  WorkflowNodeType,
  Message,
  MessageRole,
  Session,
  MCPServer,
  MCPServerStatus,
  MCPTool
}
