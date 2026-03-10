# Claude Code Web UI - Implementation Plan

## Project Overview

**Project Name**: Claude Code Web UI (codename: "ClaudeCanvas")
**Objective**: Build a web-based UI for Claude Code CLI with Agent execution visualization and workflow orchestration
**Target**: Local deployment with Web + PWA support

---

## Task Type

- [x] Fullstack (→ Parallel development)

---

## Technical Solution

### Architecture: BFF Layer with Hybrid Authentication

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Layer (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard   │  │  Chat Panel  │  │  Agent Flow Visualizer  │  │
│  │              │  │              │  │  (React Flow)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ File Browser │  │  Terminal    │  │  Workflow Orchestrator   │  │
│  │  (CodeMirror)│  │  (xterm.js)  │  │  (Drag-Drop Canvas)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket + REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BFF Layer (Bun + Hono)                         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │   Auth     │ │  Session   │ │   Claude   │ │   Agent Flow  │  │
│  │  Service   │ │  Manager   │ │  Adapter   │ │   Tracker     │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │    MCP     │ │   Skills   │ │   File     │ │   Workflow     │  │
│  │  Bridge    │ │  Manager   │ │  Service   │ │   Engine       │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Claude Code Environment                          │
│  ~/.claude/  │  MCP Servers  │  Skills  │  Sessions  │  History  │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- Next.js 15 (App Router) + TypeScript
- shadcn/ui + Radix UI (components)
- Zustand (state management)
- CodeMirror 6 (code editor)
- xterm.js (terminal)
- React Flow (Agent visualization)
- DnD Kit (workflow drag-drop)
- TailwindCSS (styling)
- next-pwa (PWA support)

**Backend**:
- Bun runtime (performance)
- Hono (lightweight framework)
- WebSocket (real-time communication)
- SQLite (local database via better-sqlite3)
- Jose (JWT)

**DevOps**:
- Docker (containerization)
- npm (global package distribution)

---

## Implementation Steps

### Phase 1: Project Setup & Foundation (Week 1)

#### Step 1.1: Initialize Monorepo Structure
**Deliverable**: Monorepo with frontend and backend packages

```bash
# Directory structure
claude-webui/
├── packages/
│   ├── frontend/     # Next.js app
│   ├── backend/      # Hono server
│   └── shared/       # Shared types
├── docker/
├── scripts/
└── package.json
```

**Key Files**:
- `package.json`: Root workspace config
- `turbo.json`: Build pipeline config
- `.npmrc`: Package manager settings

#### Step 1.2: Setup Frontend Scaffold
**Deliverable**: Next.js app with shadcn/ui configured

```bash
# Commands
npx create-next-app@latest packages/frontend --typescript --tailwind --app
npx shadcn-ui@latest init
```

**Key Files**:
- `packages/frontend/app/layout.tsx`: Root layout
- `packages/frontend/app/page.tsx`: Dashboard
- `packages/frontend/components/ui/`: shadcn components
- `packages/frontend/lib/store.ts`: Zustand store

#### Step 1.3: Setup Backend Scaffold
**Deliverable**: Hono server with WebSocket support

```typescript
// packages/backend/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { websocket } from 'hono/websocket'

const app = new Hono()
app.use('/*', cors())
app.get('/ws', websocket((ws) => { /* ... */ }))
export default app
```

**Key Files**:
- `packages/backend/src/index.ts`: Main server
- `packages/backend/src/routes/`: API routes
- `packages/backend/src/services/`: Business logic
- `packages/backend/src/db/`: Database layer

#### Step 1.4: Setup Shared Types
**Deliverable**: TypeScript types shared between frontend and backend

```typescript
// packages/shared/src/types.ts
export interface Agent {
  id: string
  name: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  toolCalls: ToolCall[]
}

export interface Workflow {
  id: string
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
```

---

### Phase 2: Core Authentication (Week 1-2)

#### Step 2.1: Config Manager Service
**Deliverable**: Service to read local Claude config and merge with user input

```typescript
// packages/backend/src/services/config.service.ts
class ConfigManager {
  async getConfig(userId?: string) {
    const localConfig = await this.tryReadLocalConfig()
    const dbConfig = userId ? await this.db.getUserConfig(userId) : null
    return this.mergeConfig(localConfig, dbConfig)
  }

  private async tryReadLocalConfig() {
    const claudePath = path.join(os.homedir(), '.claude')
    const settings = JSON.parse(
      await fs.readFile(path.join(claudePath, 'settings.json'))
    )
    const credentials = JSON.parse(
      await fs.readFile(path.join(claudePath, '.credentials.json'))
    )
    return { settings, credentials }
  }
}
```

**Key Files**:
- `packages/backend/src/services/config.service.ts`
- `packages/backend/src/services/encryption.service.ts`

#### Step 2.2: Onboarding Flow
**Deliverable**: First-run setup wizard

```typescript
// packages/frontend/app/onboarding/page.tsx
export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  // Step 1: Detect local config
  // Step 2: Ask user to choose or enter API key
  // Step 3: Configure MCP servers
  // Step 4: Complete
}
```

**Key Files**:
- `packages/frontend/app/onboarding/page.tsx`
- `packages/frontend/components/onboarding/`: Wizard components

---

### Phase 3: Claude Integration Layer (Week 2-3)

#### Step 3.1: Claude Adapter Service
**Deliverable**: Service to communicate with Claude API

```typescript
// packages/backend/src/services/claude.service.ts
class ClaudeService {
  async chat(messages: Message[], config: ClaudeConfig) {
    const response = await fetch(config.baseUrl || ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        messages,
        stream: true
      })
    })
    return streamResponse(response)
  }
}
```

**Key Files**:
- `packages/backend/src/services/claude.service.ts`
- `packages/backend/src/services/stream.service.ts`

#### Step 3.2: MCP Bridge
**Deliverable**: Service to bridge MCP servers to web clients

```typescript
// packages/backend/src/services/mcp.service.ts
class MCPBridge {
  async listServers() { /* ... */ }
  async callTool(serverId: string, toolName: string, args: any) { /* ... */ }
  async subscribeToEvents(ws: WebSocket) { /* ... */ }
}
```

**Key Files**:
- `packages/backend/src/services/mcp.service.ts`
- `packages/backend/src/services/mcp/executor.ts`

---

### Phase 4: Agent Flow Visualization (Week 3-4)

#### Step 4.1: Agent Tracking Service
**Deliverable**: Backend service to track agent execution

```typescript
// packages/backend/src/services/agent-tracker.service.ts
class AgentTrackerService {
  private activeFlows = new Map<string, AgentFlow>()

  startFlow(sessionId: string): string {
    const flowId = nanoid()
    this.activeFlows.set(flowId, {
      id: flowId,
      sessionId,
      startTime: Date.now(),
      nodes: [],
      edges: []
    })
    return flowId
  }

  addNode(flowId: string, node: AgentNode) {
    const flow = this.activeFlows.get(flowId)
    flow?.nodes.push(node)
    this.broadcastUpdate(flowId, { type: 'node-added', node })
  }
}
```

**Key Files**:
- `packages/backend/src/services/agent-tracker.service.ts`
- `packages/backend/src/websocket/agent.handler.ts`

#### Step 4.2: Flow Visualizer Component
**Deliverable**: React Flow-based visualization

```typescript
// packages/frontend/components/agent/flow-visualizer.tsx
import ReactFlow, { Node, Edge } from 'reactflow'

export function AgentFlowVisualizer() {
  const { nodes, edges } = useAgentFlowStore()

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={agentNodeTypes}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}
```

**Key Files**:
- `packages/frontend/components/agent/flow-visualizer.tsx`
- `packages/frontend/components/agent/nodes/`: Custom node components
- `packages/frontend/hooks/use-agent-flow.ts`: WebSocket hook for real-time updates

---

### Phase 5: Workflow Orchestrator (Week 4-5)

#### Step 5.1: Workflow Engine Backend
**Deliverable**: Backend workflow execution engine

```typescript
// packages/backend/src/services/workflow.service.ts
class WorkflowService {
  async executeWorkflow(workflow: Workflow, context: ExecutionContext) {
    const executor = new WorkflowExecutor(workflow, context)
    return executor.execute()
  }

  async validateWorkflow(workflow: Workflow) {
    // Check for cycles, missing connections, etc.
  }
}

class WorkflowExecutor {
  async execute() {
    for (const node of this.topologicalSort()) {
      const result = await this.executeNode(node)
      this.setNodeResult(node.id, result)
      this.broadcastProgress(node.id, result)
    }
  }
}
```

**Key Files**:
- `packages/backend/src/services/workflow.service.ts`
- `packages/backend/src/services/workflow/executor.ts`
- `packages/backend/src/services/workflow/validator.ts`

#### Step 5.2: Workflow Editor Frontend
**Deliverable**: Drag-drop workflow builder

```typescript
// packages/frontend/components/workflow/editor.tsx
import { DndContext, PointerSensor, useSensor } from '@dnd-kit/core'

export function WorkflowEditor() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [edges, setEdges] = useState<WorkflowEdge[]>([])

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <WorkflowCanvas nodes={nodes} edges={edges} />
      <NodePalette />
      <PropertiesPanel />
    </DndContext>
  )
}
```

**Key Files**:
- `packages/frontend/components/workflow/editor.tsx`
- `packages/frontend/components/workflow/canvas.tsx`
- `packages/frontend/components/workflow/node-palette.tsx`
- `packages/frontend/components/workflow/properties-panel.tsx`

---

### Phase 6: File Browser & Terminal (Week 5-6)

#### Step 6.1: File Browser Service
**Deliverable**: Virtual file system with real file access

```typescript
// packages/backend/src/services/file.service.ts
class FileService {
  async listFiles(path: string): Promise<FileNode[]> {
    const fullPath = resolvePath(path)
    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(path, entry.name)
    }))
  }

  async readFile(path: string): Promise<string> {
    return await fs.readFile(resolvePath(path), 'utf-8')
  }
}
```

**Key Files**:
- `packages/backend/src/services/file.service.ts`
- `packages/frontend/components/file/explorer.tsx`
- `packages/frontend/components/file/editor.tsx`

#### Step 6.2: Terminal Service
**Deliverable**: WebSocket-backed terminal integration

```typescript
// packages/backend/src/services/terminal.service.ts
import { pty } from 'node-pty'

class TerminalService {
  private ptys = new Map<string, any>()

  create(sessionId: string): string {
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cwd: process.cwd(),
      env: process.env
    })
    this.ptys.set(sessionId, ptyProcess)
    return sessionId
  }

  write(sessionId: string, data: string) {
    this.ptys.get(sessionId)?.write(data)
  }

  onData(sessionId: string, callback: (data: string) => void) {
    this.ptys.get(sessionId)?.onData(callback)
  }
}
```

**Key Files**:
- `packages/backend/src/services/terminal.service.ts`
- `packages/frontend/components/terminal/terminal.tsx`
- `packages/frontend/hooks/use-terminal.ts`

---

### Phase 7: Session Management (Week 6-7)

#### Step 7.1: Session Service
**Deliverable**: Multi-session management with history

```typescript
// packages/backend/src/services/session.service.ts
class SessionService {
  async createSession(config: SessionConfig): Promise<Session> {
    const session = {
      id: nanoid(),
      title: config.title || 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    await this.db.sessions.create({ data: session })
    return session
  }

  async appendMessage(sessionId: string, message: Message) {
    await this.db.sessions.update({
      where: { id: sessionId },
      data: {
        messages: { push: message },
        updatedAt: Date.now()
      }
    })
  }
}
```

**Key Files**:
- `packages/backend/src/services/session.service.ts`
- `packages/backend/src/db/schema.ts`: Database schema
- `packages/frontend/components/session/sidebar.tsx`

---

### Phase 8: PWA & Mobile Support (Week 7-8)

#### Step 8.1: PWA Configuration
**Deliverable**: Installable PWA with offline support

```typescript
// packages/frontend/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true
})

module.exports = withPWA({
  // ... other config
})
```

**Key Files**:
- `packages/public/manifest.json`: PWA manifest
- `packages/public/sw.js`: Service worker
- `packages/frontend/app/layout.tsx`: PWA meta tags

#### Step 8.2: Responsive Design
**Deliverable**: Mobile-optimized UI

**Key Files**:
- `packages/frontend/components/layout/mobile-header.tsx`
- `packages/frontend/components/layout/mobile-nav.tsx`
- Responsive utilities in Tailwind config

---

### Phase 9: Plugin System (Week 8-9)

#### Step 9.1: Plugin Architecture
**Deliverable**: Extensible plugin system

```typescript
// packages/shared/src/plugin.ts
export interface Plugin {
  id: string
  name: string
  version: string
  tabs?: PluginTab[]
  backend?: PluginBackend
}

export interface PluginTab {
  id: string
  title: string
  component: React.ComponentType
  icon: string
}
```

**Key Files**:
- `packages/backend/src/services/plugin.service.ts`
- `packages/frontend/components/plugin/tab-manager.tsx`
- `packages/backend/src/plugins/`: Built-in plugins

---

### Phase 10: Deployment & Packaging (Week 9-10)

#### Step 10.1: CLI Wrapper
**Deliverable**: npm global package with single-command start

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { spawn } from 'child_process'

const serverPath = path.join(__dirname, '../backend/index.js')
spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || '3000' }
})
```

**Key Files**:
- `packages/cli/src/index.ts`: CLI entry point
- `packages/cli/package.json`: CLI package config
- `docker/Dockerfile`: Container definition

#### Step 10.2: Docker Image
**Deliverable**: Production Docker image

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
CMD ["bun", "run", "backend/index.js"]
```

---

## Key Files

| File | Operation | Description |
|------|-----------|-------------|
| `package.json` | Create | Root monorepo config |
| `packages/frontend/app/layout.tsx` | Create | Root layout with providers |
| `packages/backend/src/index.ts` | Create | Main Hono server |
| `packages/backend/src/services/config.service.ts` | Create | Claude config reader |
| `packages/backend/src/services/claude.service.ts` | Create | Claude API adapter |
| `packages/backend/src/services/agent-tracker.service.ts` | Create | Agent execution tracking |
| `packages/backend/src/services/workflow.service.ts` | Create | Workflow execution engine |
| `packages/frontend/components/agent/flow-visualizer.tsx` | Create | React Flow visualization |
| `packages/frontend/components/workflow/editor.tsx` | Create | Drag-drop workflow builder |
| `packages/backend/src/services/file.service.ts` | Create | File system access |
| `packages/backend/src/services/terminal.service.ts` | Create | PTY terminal service |
| `packages/backend/src/services/session.service.ts` | Create | Session management |
| `packages/cli/src/index.ts` | Create | CLI wrapper |
| `docker/Dockerfile` | Create | Production container |

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  config TEXT -- Encrypted API config
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  userId TEXT,
  title TEXT NOT NULL,
  messages TEXT NOT NULL, -- JSON array
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Workflows
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT NOT NULL,
  definition TEXT NOT NULL, -- JSON workflow
  createdAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- AgentExecutions
CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY,
  sessionId TEXT,
  flowData TEXT NOT NULL, -- JSON flow graph
  status TEXT NOT NULL,
  startTime INTEGER NOT NULL,
  endTime INTEGER,
  FOREIGN KEY (sessionId) REFERENCES sessions(id)
);
```

---

## API Routes

```
POST   /api/auth/onboarding  - Complete onboarding
GET    /api/auth/config       - Get current config
PUT    /api/auth/config       - Update config

GET    /api/sessions          - List sessions
POST   /api/sessions          - Create session
GET    /api/sessions/:id      - Get session
DELETE /api/sessions/:id      - Delete session

WS     /ws/chat               - Real-time chat stream
WS     /ws/terminal           - Terminal WebSocket
WS     /ws/agent              - Agent flow updates
WS     /ws/workflow           - Workflow execution updates

GET    /api/files/*           - List files
GET    /api/files/read/*      - Read file
PUT    /api/files/write/*     - Write file

GET    /api/mcp/servers       - List MCP servers
POST   /api/mcp/call           - Call MCP tool

GET    /api/workflows         - List workflows
POST   /api/workflows         - Create workflow
POST   /api/workflows/:id/run - Execute workflow
```

---

## Risks and Mitigation

| Risk | Mitigation |
|------|------------|
| File system security | Restrict access to workspace directory, validate paths |
| API Key exposure | Encrypt at rest, never log, use HTTPS only |
| MCP server instability | Timeout handling, circuit breaker, user notification |
| Terminal escape | Sanitize input, limit command duration |
| WebSocket connection drops | Auto-reconnect with exponential backoff |
| Large session history | Pagination, lazy loading, periodic cleanup |
| Workflow execution loops | Cycle detection, max steps limit, user approval for critical ops |

---

## Testing Strategy

1. **Unit Tests**: Core services (config, claude adapter, file service)
2. **Integration Tests**: API routes, WebSocket communication
3. **E2E Tests**: Critical user flows with Playwright
4. **Manual Testing**: MCP integration, terminal, file operations

---

## Performance Considerations

1. **Streaming**: Use Server-Sent Events or WebSocket chunks for AI responses
2. **Caching**: Cache file tree, session list, MCP server list
3. **Lazy Loading**: Load workflow nodes, file content on demand
4. **Code Splitting**: Route-based splitting in Next.js
5. **Virtual Scrolling**: For long message lists, file trees

---

## Security Checklist

- [ ] API Key encryption (AES-256-GCM)
- [ ] Path traversal prevention
- [ ] Command injection prevention in terminal
- [ ] CORS configuration
- [ ] Rate limiting on API routes
- [ ] Input validation on all endpoints
- [ ] WebSocket authentication
- [ ] Secure WebSocket (WSS)
- [ ] Environment variable validation
- [ ] Dependency scanning (npm audit)

---

## SESSION_ID (for /ccg:execute use)
- CODEX_SESSION: N/A (not using external models in this plan)
- GEMINI_SESSION: N/A (not using external models in this plan)

---

## Next Steps

1. Review this plan and adjust as needed
2. Set up the monorepo structure
3. Implement Phase 1 (Foundation)
4. Proceed with subsequent phases

**Estimated Timeline**: 10 weeks for full implementation
**Team Size**: 1-2 developers (frontend + backend focus)
