# Claude Code Web UI - TDD Stories

## Story Breakdown Strategy

Stories are organized by:
- **Independent**: Each story can be developed and tested in isolation
- **Testable**: Clear acceptance criteria with 80%+ test coverage
- **Small**: Completable in 1-3 days
- **Value-Delivery**: Each story delivers incremental value

---

## Epic 1: Project Foundation

### Story 1.1: Monorepo Structure Setup
**Priority**: P0 | **Points**: 3
**Dependencies**: None

**Description**:
Initialize monorepo with separate packages for frontend, backend, and shared types.

**Acceptance Criteria**:
- [ ] Root package.json with workspace configuration
- [ ] Frontend package (Next.js) can run `npm run dev`
- [ ] Backend package (Bun + Hono) can run `npm run dev`
- [ ] Shared package exports TypeScript types
- [ ] Turbo builds all packages successfully

**Tests**:
```typescript
// packages/shared/src/__tests__/types.test.ts
describe('Shared Types', () => {
  it('should export Agent interface', () => {
    expect(Agent).toBeDefined()
  })
  it('should export Workflow interface', () => {
    expect(Workflow).toBeDefined()
  })
})
```

**Key Files**:
- `package.json`
- `turbo.json`
- `packages/frontend/package.json`
- `packages/backend/package.json`
- `packages/shared/package.json`
- `packages/shared/src/types.ts`

---

### Story 1.2: Frontend Scaffold with shadcn/ui
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 1.1

**Description**:
Setup Next.js frontend with shadcn/ui components and TailwindCSS.

**Acceptance Criteria**:
- [ ] Next.js 15 app router configured
- [ ] shadcn/ui components initialized
- [ ] TailwindCSS configured with custom theme
- [ ] Root layout with providers (Zustand, theme)
- [ ] Dashboard page renders without errors

**Tests**:
```typescript
// packages/frontend/components/__tests__/layout.test.tsx
describe('Root Layout', () => {
  it('should render children', () => {
    render(<RootLayout><div>Test</div></RootLayout>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})

// packages/frontend/app/__tests__/page.test.tsx
describe('Dashboard', () => {
  it('should render dashboard', () => {
    render(<Dashboard />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/app/layout.tsx`
- `packages/frontend/app/page.tsx`
- `packages/frontend/tailwind.config.ts`
- `packages/frontend/components/ui/` (shadcn components)
- `packages/frontend/lib/store.ts`

---

### Story 1.3: Backend Scaffold with Hono
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 1.1

**Description**:
Setup Hono backend server with WebSocket support and CORS.

**Acceptance Criteria**:
- [ ] Hono server starts on port 3001
- [ ] CORS configured for frontend origin
- [ ] WebSocket endpoint accepts connections
- [ ] Health check endpoint returns 200
- [ ] Error handling middleware configured

**Tests**:
```typescript
// packages/backend/src/__tests__/server.test.ts
describe('Backend Server', () => {
  it('should respond to health check', async () => {
    const response = await app.request('/health')
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.status).toBe('ok')
  })

  it('should handle CORS preflight', async () => {
    const response = await app.request('/api/test', {
      method: 'OPTIONS'
    })
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })
})
```

**Key Files**:
- `packages/backend/src/index.ts`
- `packages/backend/src/middleware/cors.ts`
- `packages/backend/src/middleware/error.ts`
- `packages/backend/src/routes/health.ts`

---

### Story 1.4: Shared Type Definitions
**Priority**: P0 | **Points**: 3
**Dependencies**: Story 1.1

**Description**:
Define TypeScript types shared between frontend and backend.

**Acceptance Criteria**:
- [ ] Agent interface with all required fields
- [ ] Workflow interface with nodes and edges
- [ ] Message interface for chat
- [ ] Session interface for session management
- [ ] MCP server and tool call interfaces
- [ ] Types exported from shared package

**Tests**:
```typescript
// packages/shared/src/__tests__/types.test.ts
describe('Type Definitions', () => {
  it('should create valid Agent object', () => {
    const agent: Agent = {
      id: 'test-id',
      name: 'Test Agent',
      status: 'idle',
      toolCalls: []
    }
    expect(agent.id).toBe('test-id')
  })

  it('should accept valid workflow status', () => {
    const statuses: AgentStatus[] = ['idle', 'running', 'completed', 'failed']
    statuses.forEach(status => {
      expect(['idle', 'running', 'completed', 'failed']).toContain(status)
    })
  })
})
```

**Key Files**:
- `packages/shared/src/types/agent.ts`
- `packages/shared/src/types/workflow.ts`
- `packages/shared/src/types/chat.ts`
- `packages/shared/src/types/session.ts`
- `packages/shared/src/types/mcp.ts`
- `packages/shared/src/index.ts`

---

## Epic 2: Authentication & Configuration

### Story 2.1: Config Detection Service
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 1.3

**Description**:
Service to detect and read local Claude Code configuration.

**Acceptance Criteria**:
- [ ] Detects ~/.claude directory existence
- [ ] Reads settings.json if present
- [ ] Reads .credentials.json if present
- [ ] Returns null for missing files (no errors)
- [ ] Merges local config with database config

**Tests**:
```typescript
// packages/backend/src/services/__tests__/config.service.test.ts
describe('ConfigService', () => {
  it('should return null when .claude directory does not exist', async () => {
    const result = await configService.tryReadLocalConfig('/nonexistent')
    expect(result).toBeNull()
  })

  it('should read settings.json', async () => {
    const result = await configService.tryReadLocalConfig(testConfigPath)
    expect(result?.settings).toBeDefined()
    expect(result?.settings.apiKey).toBeUndefined() // Never expose API key
  })

  it('should merge local and db config', async () => {
    const local = { settings: { model: 'claude-sonnet-4' } }
    const db = { apiKey: 'sk-test' }
    const merged = configService.mergeConfig(local, db)
    expect(merged.model).toBe('claude-sonnet-4')
    expect(merged.apiKey).toBe('sk-test')
  })
})
```

**Key Files**:
- `packages/backend/src/services/config.service.ts`
- `packages/backend/src/services/config.spec.ts`

---

### Story 2.2: API Key Encryption Service
**Priority**: P0 | **Points**: 3
**Dependencies**: None

**Description**:
Secure service to encrypt and decrypt API keys.

**Acceptance Criteria**:
- [ ] Encrypts API key using AES-256-GCM
- [ ] Decrypts encrypted API key
- [ ] Generates unique encryption key per installation
- [ ] Throws on decryption failure
- [ ] Never logs sensitive data

**Tests**:
```typescript
// packages/backend/src/services/__tests__/encryption.service.test.ts
describe('EncryptionService', () => {
  it('should encrypt and decrypt API key', () => {
    const apiKey = 'sk-ant-api03-...'
    const encrypted = encryptionService.encrypt(apiKey)
    expect(encrypted).not.toBe(apiKey)
    expect(encrypted).toHaveLengthGreaterThan(0)

    const decrypted = encryptionService.decrypt(encrypted)
    expect(decrypted).toBe(apiKey)
  })

  it('should throw on invalid encrypted data', () => {
    expect(() => {
      encryptionService.decrypt('invalid-data')
    }).toThrow()
  })

  it('should produce different ciphertext for same input', () => {
    const apiKey = 'sk-test'
    const encrypted1 = encryptionService.encrypt(apiKey)
    const encrypted2 = encryptionService.encrypt(apiKey)
    expect(encrypted1).not.toBe(encrypted2)
  })
})
```

**Key Files**:
- `packages/backend/src/services/encryption.service.ts`
- `packages/backend/src/services/encryption.spec.ts`

---

### Story 2.3: Onboarding API
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 2.1, Story 2.2

**Description**:
API endpoints for onboarding flow.

**Acceptance Criteria**:
- [ ] GET /api/auth/config returns current config status
- [ ] POST /api/auth/config saves encrypted config
- [ ] Validates API key format before saving
- [ ] Returns appropriate error messages

**Tests**:
```typescript
// packages/backend/src/routes/__tests__/auth.test.ts
describe('Auth API', () => {
  it('should return config status', async () => {
    const response = await app.request('/api/auth/config')
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toHaveProperty('hasConfig')
    expect(json).toHaveProperty('hasLocalConfig')
  })

  it('should save valid config', async () => {
    const response = await app.request('/api/auth/config', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'sk-ant-test' })
    })
    expect(response.status).toBe(200)
  })

  it('should reject invalid API key', async () => {
    const response = await app.request('/api/auth/config', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'invalid' })
    })
    expect(response.status).toBe(400)
  })
})
```

**Key Files**:
- `packages/backend/src/routes/auth.ts`
- `packages/backend/src/routes/auth.spec.ts`

---

### Story 2.4: Onboarding UI
**Priority**: P1 | **Points**: 8
**Dependencies**: Story 1.2, Story 2.3

**Description**:
Multi-step onboarding wizard for first-time setup.

**Acceptance Criteria**:
- [ ] Welcome screen with "Get Started" button
- [ ] Step 1: Detect local Claude config
- [ ] Step 2: Option to use local config or enter API key
- [ ] Step 3: Configure optional settings
- [ ] Step 4: Success message with redirect to dashboard
- [ ] Progress indicator

**Tests**:
```typescript
// packages/frontend/components/onboarding/__tests__/wizard.test.tsx
describe('OnboardingWizard', () => {
  it('should show welcome screen initially', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Welcome')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should advance to next step on click', async () => {
    render(<OnboardingWizard />)
    await user.click(screen.getByText('Get Started'))
    expect(screen.getByText('Detect Configuration')).toBeInTheDocument()
  })

  it('should show progress indicator', () => {
    render(<OnboardingWizard />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/app/onboarding/page.tsx`
- `packages/frontend/components/onboarding/wizard.tsx`
- `packages/frontend/components/onboarding/steps/`

---

## Epic 3: Claude Integration

### Story 3.1: Claude API Service
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 2.1

**Description**:
Service to communicate with Claude API with streaming support.

**Acceptance Criteria**:
- [ ] Sends chat request to Claude API
- [ ] Streams response chunks
- [ ] Handles API errors gracefully
- [ ] Supports model selection
- [ ] Includes system prompt if provided

**Tests**:
```typescript
// packages/backend/src/services/__tests__/claude.service.test.ts
describe('ClaudeService', () => {
  it('should send chat request', async () => {
    const messages = [{ role: 'user', content: 'Hello' }]
    const stream = claudeService.chat(messages, testConfig)
    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBeGreaterThan(0)
  })

  it('should handle API error', async () => {
    const messages = [{ role: 'user', content: 'Test' }]
    const stream = claudeService.chat(messages, { apiKey: 'invalid' })
    await expect(async () => {
      for await (const chunk of stream) { chunk }
    }).rejects.toThrow()
  })

  it('should include system prompt', async () => {
    const stream = claudeService.chat([], testConfig, {
      systemPrompt: 'You are a helpful assistant'
    })
    // Verify system prompt in request
  })
})
```

**Key Files**:
- `packages/backend/src/services/claude.service.ts`
- `packages/backend/src/services/claude.spec.ts`

---

### Story 3.2: Chat WebSocket Handler
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 3.1

**Description**:
WebSocket handler for real-time chat streaming.

**Acceptance Criteria**:
- [ ] Accepts WebSocket connections
- [ ] Receives chat messages from client
- [ ] Streams Claude responses back
- [ ] Handles disconnections gracefully
- [ ] Manages session context

**Tests**:
```typescript
// packages/backend/src/websocket/__tests__/chat.handler.test.ts
describe('ChatWebSocket', () => {
  it('should handle chat message', async () => {
    const ws = createMockWebSocket()
    await chatHandler.handle(ws, {
      type: 'chat',
      sessionId: 'test-session',
      message: { role: 'user', content: 'Hello' }
    })
    expect(ws.send).toHaveBeenCalledWith(expect.objectContaining({
      type: 'chunk'
    }))
  })

  it('should broadcast to session subscribers', async () => {
    const ws1 = createMockWebSocket()
    const ws2 = createMockWebSocket()
    // Test broadcast functionality
  })
})
```

**Key Files**:
- `packages/backend/src/websocket/chat.handler.ts`
- `packages/backend/src/websocket/chat.spec.ts`

---

### Story 3.3: Chat UI Component
**Priority**: P0 | **Points**: 8
**Dependencies**: Story 1.2, Story 3.2

**Description**:
Chat interface with message history and streaming support.

**Acceptance Criteria**:
- [ ] Message list with auto-scroll
- [ ] Input textarea with auto-resize
- [ ] Send button and keyboard shortcut (Enter)
- [ ] Streaming message display
- [ ] Message status indicators (sending, error)
- [ ] Markdown rendering for responses

**Tests**:
```typescript
// packages/frontend/components/chat/__tests__/panel.test.tsx
describe('ChatPanel', () => {
  it('should render message list', () => {
    render(<ChatPanel messages={testMessages} />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should send message on button click', async () => {
    const onSend = vi.fn()
    render(<ChatPanel onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), 'Test message')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSend).toHaveBeenCalledWith('Test message')
  })

  it('should send message on Enter key', async () => {
    const onSend = vi.fn()
    render(<ChatPanel onSend={onSend} />)
    await user.type(screen.getByRole('textbox'), 'Test{Enter}')
    expect(onSend).toHaveBeenCalledWith('Test')
  })
})
```

**Key Files**:
- `packages/frontend/components/chat/panel.tsx`
- `packages/frontend/components/chat/message-list.tsx`
- `packages/frontend/components/chat/message.tsx`
- `packages/frontend/hooks/use-chat.ts`

---

## Epic 4: MCP Integration

### Story 4.1: MCP Configuration Reader
**Priority**: P1 | **Points**: 3
**Dependencies**: Story 2.1

**Description**:
Service to read and parse MCP server configurations.

**Acceptance Criteria**:
- [ ] Reads ~/.claude/mcp.json
- [ ] Parses server configurations
- [ ] Validates server config schema
- [ ] Returns list of available servers
- [ ] Handles missing config gracefully

**Tests**:
```typescript
// packages/backend/src/services/__tests__/mcp-config.service.test.ts
describe('MCPConfigService', () => {
  it('should read mcp.json', async () => {
    const servers = await mcpConfigService.getServers()
    expect(servers).toBeInstanceOf(Array)
  })

  it('should validate server config', async () => {
    const servers = await mcpConfigService.getServers()
    servers.forEach(server => {
      expect(server).toHaveProperty('command')
      expect(server).toHaveProperty('args')
    })
  })

  it('should return empty array when config missing', async () => {
    const servers = await mcpConfigService.getServers('/nonexistent')
    expect(servers).toEqual([])
  })
})
```

**Key Files**:
- `packages/backend/src/services/mcp-config.service.ts`
- `packages/backend/src/services/mcp-config.spec.ts`

---

### Story 4.2: MCP Bridge Service
**Priority**: P1 | **Points**: 8
**Dependencies**: Story 4.1

**Description**:
Service to bridge MCP servers to web clients.

**Acceptance Criteria**:
- [ ] Lists available MCP servers
- [ ] Lists tools for each server
- [ ] Executes tool calls
- [ ] Streams tool results
- [ ] Handles server lifecycle (start/stop)

**Tests**:
```typescript
// packages/backend/src/services/__tests__/mcp-bridge.service.test.ts
describe('MCPBridgeService', () => {
  it('should list servers', async () => {
    const servers = await mcpBridge.listServers()
    expect(servers.length).toBeGreaterThan(0)
  })

  it('should list tools for server', async () => {
    const tools = await mcpBridge.listTools('test-server')
    expect(tools).toBeInstanceOf(Array)
  })

  it('should execute tool call', async () => {
    const result = await mcpBridge.callTool('test-server', 'test-tool', {})
    expect(result).toHaveProperty('content')
  })
})
```

**Key Files**:
- `packages/backend/src/services/mcp-bridge.service.ts`
- `packages/backend/src/services/mcp-bridge.spec.ts`

---

### Story 4.3: MCP UI Components
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 4.2

**Description**:
UI components for MCP server management.

**Acceptance Criteria**:
- [ ] Server list with status indicators
- [ ] Tool browser for each server
- [ ] Tool call form builder
- [ ] Result display component

**Tests**:
```typescript
// packages/frontend/components/mcp/__tests__/server-list.test.tsx
describe('MCPServerList', () => {
  it('should render server list', () => {
    const servers = [{ name: 'test-server', status: 'running' }]
    render(<MCPServerList servers={servers} />)
    expect(screen.getByText('test-server')).toBeInTheDocument()
  })

  it('should show server status', () => {
    const servers = [{ name: 'test-server', status: 'running' }]
    render(<MCPServerList servers={servers} />)
    expect(screen.getByRole('status')).toHaveClass('status-running')
  })
})
```

**Key Files**:
- `packages/frontend/components/mcp/server-list.tsx`
- `packages/frontend/components/mcp/tool-browser.tsx`
- `packages/frontend/components/mcp/tool-form.tsx`

---

## Epic 5: Agent Flow Visualization

### Story 5.1: Agent Tracking Service
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 3.1

**Description**:
Backend service to track agent execution flows.

**Acceptance Criteria**:
- [ ] Creates new flow on session start
- [ ] Adds nodes for each agent/tool call
- [ ] Creates edges between related nodes
- [ ] Broadcasts flow updates via WebSocket
- [ ] Stores flow data for session history

**Tests**:
```typescript
// packages/backend/src/services/__tests__/agent-tracker.service.test.ts
describe('AgentTrackerService', () => {
  it('should create new flow', () => {
    const flowId = agentTracker.startFlow('session-123')
    expect(flowId).toBeDefined()
    const flow = agentTracker.getFlow(flowId)
    expect(flow?.sessionId).toBe('session-123')
  })

  it('should add node to flow', () => {
    const flowId = agentTracker.startFlow('session-123')
    agentTracker.addNode(flowId, {
      id: 'node-1',
      type: 'tool',
      name: 'Read',
      status: 'running'
    })
    const flow = agentTracker.getFlow(flowId)
    expect(flow?.nodes).toHaveLength(1)
  })

  it('should broadcast updates', () => {
    const callback = vi.fn()
    agentTracker.subscribe('flow-1', callback)
    const flowId = agentTracker.startFlow('session-123')
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      type: 'flow-created'
    }))
  })
})
```

**Key Files**:
- `packages/backend/src/services/agent-tracker.service.ts`
- `packages/backend/src/services/agent-tracker.spec.ts`

---

### Story 5.2: Flow Visualizer Component
**Priority**: P1 | **Points**: 8
**Dependencies**: Story 5.1

**Description**:
React Flow-based agent flow visualization.

**Acceptance Criteria**:
- [ ] Renders flow nodes and edges
- [ ] Auto-layouts nodes
- [ ] Shows node status with colors
- [ ] Displays node details on click
- [ ] Updates in real-time via WebSocket
- [ ] Zoom and pan controls

**Tests**:
```typescript
// packages/frontend/components/agent/__tests__/flow-visualizer.test.tsx
describe('AgentFlowVisualizer', () => {
  it('should render flow nodes', () => {
    const nodes = [{ id: '1', type: 'tool', position: { x: 0, y: 0 } }]
    render(<AgentFlowVisualizer nodes={nodes} edges={[]} />)
    expect(screen.getByTestId('flow-node-1')).toBeInTheDocument()
  })

  it('should highlight active node', () => {
    const nodes = [{ id: '1', type: 'tool', status: 'running' }]
    render(<AgentFlowVisualizer nodes={nodes} edges={[]} />)
    expect(screen.getByTestId('flow-node-1')).toHaveClass('node-running')
  })

  it('should show node details on click', async () => {
    const nodes = [{ id: '1', type: 'tool', name: 'Read file' }]
    render(<AgentFlowVisualizer nodes={nodes} edges={[]} />)
    await user.click(screen.getByTestId('flow-node-1'))
    expect(screen.getByText('Read file')).toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/components/agent/flow-visualizer.tsx`
- `packages/frontend/components/agent/nodes/tool-node.tsx`
- `packages/frontend/components/agent/nodes/agent-node.tsx`
- `packages/frontend/hooks/use-agent-flow.ts`

---

## Epic 6: Workflow Orchestrator

### Story 6.1: Workflow Data Model
**Priority**: P2 | **Points**: 3
**Dependencies**: Story 1.4

**Description**:
Workflow data structures and validation schemas.

**Acceptance Criteria**:
- [ ] WorkflowNode interface with types
- [ ] WorkflowEdge interface
- [ ] Workflow validation schema
- [ ] Workflow execution context interface
- [ ] Workflow result interface

**Tests**:
```typescript
// packages/shared/src/__tests__/workflow-schema.test.ts
describe('Workflow Schema', () => {
  it('should validate valid workflow', () => {
    const workflow = {
      id: 'test',
      name: 'Test Workflow',
      nodes: [{ id: '1', type: 'agent' }],
      edges: []
    }
    expect(validateWorkflow(workflow)).toBe(true)
  })

  it('should reject workflow with cycles', () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'agent' },
        { id: '2', type: 'agent' }
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '1' }
      ]
    }
    expect(validateWorkflow(workflow)).toBe(false)
  })
})
```

**Key Files**:
- `packages/shared/src/types/workflow.ts`
- `packages/shared/src/schemas/workflow.schema.ts`

---

### Story 6.2: Workflow Executor
**Priority**: P2 | **Points**: 8
**Dependencies**: Story 6.1, Story 3.1

**Description**:
Workflow execution engine with topological sort.

**Acceptance Criteria**:
- [ ] Executes nodes in dependency order
- [ ] Passes data between nodes
- [ ] Handles execution errors
- [ ] Supports parallel execution
- [ ] Broadcasts progress updates

**Tests**:
```typescript
// packages/backend/src/services/workflow/__tests__/executor.test.ts
describe('WorkflowExecutor', () => {
  it('should execute sequential workflow', async () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'prompt', config: { prompt: 'Hello' } },
        { id: '2', type: 'prompt', config: { prompt: 'World' } }
      ],
      edges: [{ from: '1', to: '2' }]
    }
    const result = await executor.execute(workflow)
    expect(result.status).toBe('completed')
    expect(result.results).toHaveLength(2)
  })

  it('should execute parallel nodes', async () => {
    const workflow = {
      nodes: [
        { id: '1', type: 'prompt' },
        { id: '2', type: 'prompt' }
      ],
      edges: []
    }
    const startTime = Date.now()
    await executor.execute(workflow)
    const duration = Date.now() - startTime
    // Should complete faster than sequential
    expect(duration).toBeLessThan(1000)
  })

  it('should handle node errors', async () => {
    const workflow = {
      nodes: [{ id: '1', type: 'invalid' }],
      edges: []
    }
    const result = await executor.execute(workflow)
    expect(result.status).toBe('failed')
    expect(result.errors).toHaveLength(1)
  })
})
```

**Key Files**:
- `packages/backend/src/services/workflow/executor.ts`
- `packages/backend/src/services/workflow/executor.spec.ts`

---

### Story 6.3: Workflow Editor UI
**Priority**: P2 | **Points**: 8
**Dependencies**: Story 6.1

**Description**:
Drag-and-drop workflow builder.

**Acceptance Criteria**:
- [ ] Node palette with available node types
- [ ] Canvas for placing nodes
- [ ] Drag nodes from palette to canvas
- [ ] Connect nodes with edges
- [ ] Edit node properties
- [ ] Save and load workflows

**Tests**:
```typescript
// packages/frontend/components/workflow/__tests__/editor.test.tsx
describe('WorkflowEditor', () => {
  it('should render node palette', () => {
    render(<WorkflowEditor />)
    expect(screen.getByText('Agent Node')).toBeInTheDocument()
    expect(screen.getByText('Prompt Node')).toBeInTheDocument()
  })

  it('should add node on drag', async () => {
    render(<WorkflowEditor />)
    const node = screen.getByText('Agent Node')
    await drag(node, { to: screen.getByTestId('workflow-canvas') })
    expect(screen.getByTestId('node-agent-1')).toBeInTheDocument()
  })

  it('should connect nodes', async () => {
    const onConnect = vi.fn()
    render(<WorkflowEditor onConnect={onConnect} />)
    // Test node connection
  })
})
```

**Key Files**:
- `packages/frontend/components/workflow/editor.tsx`
- `packages/frontend/components/workflow/canvas.tsx`
- `packages/frontend/components/workflow/node-palette.tsx`
- `packages/frontend/components/workflow/properties-panel.tsx`

---

## Epic 7: File System & Terminal

### Story 7.1: File System Service
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 1.3

**Description**:
Backend service for file system operations.

**Acceptance Criteria**:
- [ ] Lists files in directory
- [ ] Reads file content
- [ ] Writes file content
- [ ] Creates/deletes files and directories
- [ ] Validates file paths (security)
- [ ] Respects workspace boundaries

**Tests**:
```typescript
// packages/backend/src/services/__tests__/file.service.test.ts
describe('FileService', () => {
  it('should list files', async () => {
    const files = await fileService.listFiles(testWorkspace)
    expect(files).toBeInstanceOf(Array)
  })

  it('should read file content', async () => {
    const content = await fileService.readFile(testFilePath)
    expect(content).toBeDefined()
  })

  it('should prevent path traversal', async () => {
    await expect(
      fileService.listFiles('../../../etc')
    ).rejects.toThrow('Path traversal detected')
  })

  it('should restrict to workspace', async () => {
    await expect(
      fileService.listFiles('/etc/passwd')
    ).rejects.toThrow('Outside workspace')
  })
})
```

**Key Files**:
- `packages/backend/src/services/file.service.ts`
- `packages/backend/src/services/file.spec.ts`

---

### Story 7.2: File Browser UI
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 7.1

**Description**:
File explorer component with tree view.

**Acceptance Criteria**:
- [ ] Tree view of files and folders
- [ ] Expand/collapse folders
- [ ] Click to open file in editor
- [ ] Context menu (rename, delete, create)
- [ ] File icons by type
- [ ] Search/filter files

**Tests**:
```typescript
// packages/frontend/components/file/__tests__/explorer.test.tsx
describe('FileExplorer', () => {
  it('should render file tree', () => {
    const files = [{ name: 'test.ts', type: 'file', path: '/test.ts' }]
    render(<FileExplorer files={files} />)
    expect(screen.getByText('test.ts')).toBeInTheDocument()
  })

  it('should expand folder on click', async () => {
    const files = [
      { name: 'src', type: 'directory', path: '/src', children: [] }
    ]
    render(<FileExplorer files={files} />)
    await user.click(screen.getByText('src'))
    expect(screen.getByTestId('folder-src')).toHaveClass('expanded')
  })

  it('should call onOpen when file clicked', async () => {
    const onOpen = vi.fn()
    const files = [{ name: 'test.ts', type: 'file', path: '/test.ts' }]
    render(<FileExplorer files={files} onOpen={onOpen} />)
    await user.click(screen.getByText('test.ts'))
    expect(onOpen).toHaveBeenCalledWith('/test.ts')
  })
})
```

**Key Files**:
- `packages/frontend/components/file/explorer.tsx`
- `packages/frontend/components/file/tree-item.tsx`
- `packages/frontend/hooks/use-files.ts`

---

### Story 7.3: Code Editor Component
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 7.2

**Description**:
CodeMirror-based code editor.

**Acceptance Criteria**:
- [ ] Syntax highlighting
- [ ] Line numbers
- [ ] Auto-indentation
- [ ] Search and replace
- [ ] Multiple file tabs
- [ ] Save indicator

**Tests**:
```typescript
// packages/frontend/components/file/__tests__/editor.test.tsx
describe('CodeEditor', () => {
  it('should render code content', () => {
    render(<CodeEditor content="const x = 1" language="typescript" />)
    expect(screen.getByText('const x = 1')).toBeInTheDocument()
  })

  it('should call onChange on edit', async () => {
    const onChange = vi.fn()
    render(<CodeEditor content="" onChange={onChange} />)
    // Simulate edit
    expect(onChange).toHaveBeenCalled()
  })

  it('should show save indicator when modified', () => {
    render(<CodeEditor content="test" modified={true} />)
    expect(screen.getByTitle('Modified')).toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/components/file/editor.tsx`
- `packages/frontend/components/file/tabs.tsx`
- `packages/frontend/hooks/use-editor.ts`

---

### Story 7.4: Terminal Service
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 1.3

**Description**:
Backend PTY terminal service with WebSocket.

**Acceptance Criteria**:
- [ ] Creates PTY for each session
- [ ] Sends user input to PTY
- [ ] Streams PTY output to client
- [ ] Handles terminal resize
- [ ] Cleans up PTY on disconnect

**Tests**:
```typescript
// packages/backend/src/services/__tests__/terminal.service.test.ts
describe('TerminalService', () => {
  it('should create PTY session', () => {
    const sessionId = terminalService.create('session-1')
    expect(sessionId).toBe('session-1')
  })

  it('should write to PTY', () => {
    terminalService.create('session-1')
    terminalService.write('session-1', 'echo "test"\n')
    // Verify write succeeded
  })

  it('should call onData callback', (done) => {
    terminalService.create('session-1')
    terminalService.onData('session-1', (data) => {
      expect(data).toBeDefined()
      done()
    })
  })

  it('should cleanup PTY on destroy', () => {
    const sessionId = terminalService.create('session-1')
    terminalService.destroy(sessionId)
    expect(terminalService.exists(sessionId)).toBe(false)
  })
})
```

**Key Files**:
- `packages/backend/src/services/terminal.service.ts`
- `packages/backend/src/services/terminal.spec.ts`

---

### Story 7.5: Terminal UI Component
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 7.4

**Description**:
xterm.js-based terminal component.

**Acceptance Criteria**:
- [ ] Renders xterm.js terminal
- [ ] Sends keyboard input to backend
- [ ] Displays terminal output
- [ ] Handles terminal resize
- [ ] Supports multiple terminal tabs
- [ ] Color and formatting support

**Tests**:
```typescript
// packages/frontend/components/terminal/__tests__/terminal.test.tsx
describe('Terminal', () => {
  it('should render terminal element', () => {
    render(<Terminal sessionId="test" />)
    expect(screen.getByTestId('terminal-container')).toBeInTheDocument()
  })

  it('should connect to WebSocket on mount', () => {
    const wsConnect = vi.fn()
    render(<Terminal sessionId="test" onConnect={wsConnect} />)
    expect(wsConnect).toHaveBeenCalled()
  })

  it('should send input on keypress', async () => {
    const onInput = vi.fn()
    render(<Terminal sessionId="test" onInput={onInput} />)
    // Simulate keypress
    expect(onInput).toHaveBeenCalled()
  })
})
```

**Key Files**:
- `packages/frontend/components/terminal/terminal.tsx`
- `packages/frontend/components/terminal/tabs.tsx`
- `packages/frontend/hooks/use-terminal.ts`

---

## Epic 8: Session Management

### Story 8.1: Database Schema & Migrations
**Priority**: P0 | **Points**: 3
**Dependencies**: None

**Description**:
SQLite database schema and migrations.

**Acceptance Criteria**:
- [ ] Users table with encrypted config
- [ ] Sessions table with messages
- [ ] Workflows table
- [ ] Agent executions table
- [ ] Migration system
- [ ] Database connection pooling

**Tests**:
```typescript
// packages/backend/src/db/__tests__/schema.test.ts
describe('Database Schema', () => {
  it('should create tables', async () => {
    await db.migrate()
    const tables = await db.getTables()
    expect(tables).toContain('users')
    expect(tables).toContain('sessions')
    expect(tables).toContain('workflows')
  })

  it('should run migrations idempotently', async () => {
    await db.migrate()
    await db.migrate()
    // Should not error
  })
})
```

**Key Files**:
- `packages/backend/src/db/schema.sql`
- `packages/backend/src/db/migrate.ts`
- `packages/backend/src/db/connection.ts`

---

### Story 8.2: Session Service
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 8.1

**Description**:
Session CRUD operations with message storage.

**Acceptance Criteria**:
- [ ] Creates new session
- [ ] Lists all sessions (paginated)
- [ ] Gets session by ID
- [ ] Updates session title
- [ ] Deletes session
- [ ] Appends messages to session

**Tests**:
```typescript
// packages/backend/src/services/__tests__/session.service.test.ts
describe('SessionService', () => {
  it('should create session', async () => {
    const session = await sessionService.create({
      title: 'Test Session'
    })
    expect(session.id).toBeDefined()
    expect(session.title).toBe('Test Session')
  })

  it('should list sessions', async () => {
    await sessionService.create({ title: 'Session 1' })
    await sessionService.create({ title: 'Session 2' })
    const sessions = await sessionService.list()
    expect(sessions).toHaveLength(2)
  })

  it('should append message', async () => {
    const session = await sessionService.create({})
    await sessionService.appendMessage(session.id, {
      role: 'user',
      content: 'Hello'
    })
    const updated = await sessionService.get(session.id)
    expect(updated.messages).toHaveLength(1)
  })
})
```

**Key Files**:
- `packages/backend/src/services/session.service.ts`
- `packages/backend/src/services/session.spec.ts`

---

### Story 8.3: Session Sidebar UI
**Priority**: P0 | **Points**: 5
**Dependencies**: Story 8.2

**Description**:
Session list sidebar with search and filters.

**Acceptance Criteria**:
- [ ] Lists all sessions
- [ ] Creates new session
- [ ] Switches between sessions
- [ ] Deletes session
- [ ] Renames session
- [ ] Search/filter sessions
- [ ] Session timestamps

**Tests**:
```typescript
// packages/frontend/components/session/__tests__/sidebar.test.tsx
describe('SessionSidebar', () => {
  const sessions = [
    { id: '1', title: 'Session 1', updatedAt: Date.now() },
    { id: '2', title: 'Session 2', updatedAt: Date.now() }
  ]

  it('should render session list', () => {
    render(<SessionSidebar sessions={sessions} />)
    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.getByText('Session 2')).toBeInTheDocument()
  })

  it('should create new session', async () => {
    const onCreate = vi.fn()
    render(<SessionSidebar sessions={sessions} onCreate={onCreate} />)
    await user.click(screen.getByTitle('New Session'))
    expect(onCreate).toHaveBeenCalled()
  })

  it('should filter sessions by search', async () => {
    render(<SessionSidebar sessions={sessions} />)
    await user.type(screen.getByPlaceholderText('Search'), 'Session 1')
    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.queryByText('Session 2')).not.toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/components/session/sidebar.tsx`
- `packages/frontend/components/session/session-item.tsx`
- `packages/frontend/hooks/use-sessions.ts`

---

## Epic 9: PWA & Mobile

### Story 9.1: PWA Configuration
**Priority**: P2 | **Points**: 3
**Dependencies**: Story 1.2

**Description**:
PWA manifest and service worker setup.

**Acceptance Criteria**:
- [ ] PWA manifest with icons
- [ ] Service worker registered
- [ ] Offline fallback page
- [ ] Install prompt handling
- [ ] Update notifications

**Tests**:
```typescript
// packages/frontend/service-worker/__tests__/registration.test.ts
describe('Service Worker', () => {
  it('should register service worker', async () => {
    await registerSW()
    expect(navigator.serviceWorker.ready).resolves.toBeDefined()
  })

  it('should handle update', async () => {
    const onUpdate = vi.fn()
    await registerSW({ onUpdate })
    // Trigger update
    expect(onUpdate).toHaveBeenCalled()
  })
})
```

**Key Files**:
- `packages/frontend/public/manifest.json`
- `packages/frontend/public/sw.js`
- `packages/frontend/app/layout.tsx` (meta tags)

---

### Story 9.2: Responsive Layout
**Priority**: P1 | **Points**: 5
**Dependencies**: Story 9.1

**Description**:
Mobile-optimized responsive layout.

**Acceptance Criteria**:
- [ ] Mobile navigation drawer
- [ ] Collapsible sidebar
- [ ] Responsive grid
- [ ] Touch-friendly controls
- [ ] Mobile-optimized chat panel
- [ ] Portrait/landscape handling

**Tests**:
```typescript
// packages/frontend/components/layout/__tests__/responsive.test.tsx
describe('ResponsiveLayout', () => {
  it('should show drawer on mobile', () => {
    window.innerWidth = 375
    render(<ResponsiveLayout />)
    expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
  })

  it('should show sidebar on desktop', () => {
    window.innerWidth = 1024
    render(<ResponsiveLayout />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })
})
```

**Key Files**:
- `packages/frontend/components/layout/responsive.tsx`
- `packages/frontend/components/layout/mobile-drawer.tsx`
- `packages/frontend/components/layout/mobile-header.tsx`

---

## Epic 10: Deployment

### Story 10.1: CLI Package
**Priority**: P1 | **Points**: 3
**Dependencies**: Story 1.3

**Description**:
npm CLI package for easy installation.

**Acceptance Criteria**:
- [ ] Global npm package
- [ ] `claude-webui start` command
- [ ] Port configuration
- [ ] Browser auto-open
- [ ] Status messages

**Tests**:
```typescript
// packages/cli/src/__tests__/cli.test.ts
describe('CLI', () => {
  it('should parse start command', () => {
    const args = parseArgs(['start', '--port', '3000'])
    expect(args.command).toBe('start')
    expect(args.port).toBe(3000)
  })

  it('should spawn server process', async () => {
    await cli.start({ port: 3000 })
    expect(serverProcess).toBeDefined()
  })
})
```

**Key Files**:
- `packages/cli/src/index.ts`
- `packages/cli/package.json`
- `packages/cli/bin/claude-webui`

---

### Story 10.2: Docker Image
**Priority**: P2 | **Points**: 3
**Dependencies**: Story 10.1

**Description**:
Production Docker container.

**Acceptance Criteria**:
- [ ] Multi-stage Dockerfile
- [ ] Small final image size
- [ ] Non-root user
- [ ] Health check endpoint
- [ ] Volume mount for data

**Tests**:
```bash
# docker/build.test.sh
docker build -t claude-webui:test .
docker run --rm claude-webui:test healthcheck
docker inspect claude-webui:test | grep User
```

**Key Files**:
- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/entrypoint.sh`

---

## Story Summary

| Epic | Stories | Total Points |
|------|---------|--------------|
| 1. Foundation | 4 | 16 |
| 2. Auth & Config | 4 | 21 |
| 3. Claude Integration | 3 | 18 |
| 4. MCP Integration | 3 | 16 |
| 5. Agent Flow | 2 | 13 |
| 6. Workflow | 3 | 19 |
| 7. Files & Terminal | 5 | 25 |
| 8. Sessions | 3 | 13 |
| 9. PWA & Mobile | 2 | 8 |
| 10. Deployment | 2 | 6 |
| **Total** | **31** | **155** |

## Priority Order

1. **P0** (Critical): Stories 1.1-1.4, 2.1-2.2, 3.1-3.3, 7.1-7.3, 8.1-8.3
2. **P1** (High): Stories 2.3-2.4, 4.1-4.3, 5.1-5.2, 7.4-7.5, 9.2, 10.1
3. **P2** (Medium): Stories 6.1-6.3, 9.1, 10.2

## TDD Workflow for Each Story

1. **Write test first** (RED)
2. **Run test** - confirm it fails
3. **Implement minimum code** to pass (GREEN)
4. **Refactor** for clarity (IMPROVE)
5. **Verify coverage** ≥80%
6. **Move to next test**
