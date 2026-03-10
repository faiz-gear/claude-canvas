# Claude Code Web UI 项目调研报告

## 一、市面现有项目分析

### 1.1 ClaudeCodeUI (CloudCLI) - 最受欢迎 ⭐⭐⭐⭐⭐

**项目地址**: [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)
- **Stars**: 8,168 | **Forks**: 1,044
- **语言**: TypeScript
- **许可证**: GPL-3.0

**技术栈**:
```json
{
  "frontend": "Vite + React",
  "backend": "Node.js (Express风格)",
  "terminal": "@xterm/xterm",
  "editor": "@codemirror/*",
  "styling": "TailwindCSS",
  "cli": "@anthropic-ai/claude-agent-sdk",
  "models": "Claude, GPT, Gemini"
}
```

**架构特点**:
- **双模式**: 自托管 + Cloud 托管
- **插件系统**: 支持自定义 Tab 和后端服务
- **全功能**: 文件浏览器、Git 集成、终端、Shell
- **多模型支持**: Claude、GPT、Gemini 家族
- **Session 管理**: 多会话、历史追踪
- **移动端优先**: PWA 支持

**部署方式**:
```bash
# 自托管
npm install -g @siteboon/claude-code-ui
cloudcli

# 或访问 CloudCLI Cloud (托管服务)
https://cloudcli.ai
```

### 1.2 sugyan/claude-code-webui - 简洁流式

**项目地址**: [sugyan/claude-code-webui](https://github.com/sugyan/claude-code-webui)
- **Stars**: 950 | **Forks**: 218
- **语言**: TypeScript
- **许可证**: MIT

**特点**:
- 专注于流式聊天响应
- 轻量级设计
- 与 Claude CLI 无缝集成

### 1.3 Claude-Code-Web-GUI - 纯浏览器方案

**项目地址**: [binggg/Claude-Code-Web-GUI](https://github.com/binggg/Claude-Code-Web-GUI)
- **Stars**: 62 | **Forks**: 7
- **语言**: JavaScript
- **许可证**: MIT

**特点**:
- 完全在浏览器中运行，无需服务器
- 会话历史浏览和查看
- 可分享会话

---

## 二、架构模式对比分析

### 2.1 纯前端 + 本地 API 调用

```
┌─────────────────────────────────────┐
│          Web Browser                │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   React UI  │  │   WebSocket  │ │
│  └──────┬──────┘  └──────┬───────┘ │
│         │                │          │
└─────────┼────────────────┼──────────┘
          │                │
          │                ▼
          │    ┌─────────────────────┐
          │    │  Claude Code Local  │
          │    │  (CLI Process)      │
          │    │  MCP Servers        │
          │    └─────────────────────┘
          │
          └──────▶ 直接调用本地 Claude Code API
```

**优点**:
- ✅ 架构简单，开发快速
- ✅ 本地运行，数据隐私
- ✅ 无需额外服务器

**缺点**:
- ❌ 需要暴露本地端口（安全风险）
- ❌ 依赖本地 CLI 进程
- ❌ 移动端访问需要内网穿透
- ❌ 无法充分利用 Web 能力

### 2.2 BFF 层架构 (Backend For Frontend)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Web Client  │◀────▶│  BFF Server  │◀────▶│ Claude Code  │
│  (React/PWA) │      │  (Node.js)   │      │   CLI API    │
└──────────────┘      │  - 认证      │      │  - MCP       │
                      │  - 授权      │      │  - Agents    │
                      │  - 路由      │      └──────────────┘
                      │  - 协议转换  │
                      │  - 会话管理  │
                      └──────────────┘
```

**优点**:
- ✅ 可控的中间层，安全性高
- ✅ 支持多用户、团队协作
- ✅ 可扩展 REST/WebSocket API
- ✅ 移动端友好（统一 API 入口）
- ✅ 可添加业务逻辑和增强功能

**缺点**:
- ❌ 需要维护额外服务
- ❌ 增加了一层复杂度
- ❌ 本地部署需要更多资源

### 2.3 独立服务模式

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Web Client  │◀────▶│  Web Service │◀────▶│ Claude Code  │
│  (React/PWA) │      │  (独立)      │      │   环境       │
└──────────────┘      │  - 完整后端  │      │  - MCP       │
                      │  - 数据库    │      │  - 文件系统  │
                      │  - 任务队列  │      └──────────────┘
                      │  - WebSocket │
                      └──────────────┘
```

**优点**:
- ✅ 完全独立，可自托管
- ✅ 功能强大，扩展性强
- ✅ 支持复杂业务场景
- ✅ 可做数据持久化和分析

**缺点**:
- ❌ 架构最复杂
- ❌ 与 Claude Code 紧耦合问题

### 2.4 纯浏览器方案 (无需服务器)

```
┌─────────────────────────────────────┐
│          Web Browser                │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   React UI  │  │ File Reader  │ │
│  └──────┬──────┘  └──────┬───────┘ │
│         │                │          │
│         │    ┌───────────▼─────────┐│
│         │    │  Local Session Files││
│         │    │  (~/.claude/sessions)│
│         │    └─────────────────────┘│
└─────────────────────────────────────┘
```

**优点**:
- ✅ 零部署，静态托管即可
- ✅ 完全客户端运行
- ✅ 安全性高（本地数据）

**缺点**:
- ❌ 无法执行命令
- ❌ 功能受限（只读）
- ❌ 无实时交互

---

## 三、Claude Code 最新功能 (2026)

### 3.1 核心命令

| 命令 | 功能 |
|------|------|
| `/ask` | 询问 Claude |
| `/build` | 项目构建 |
| `/implement` | 功能实现 |
| `/analyze` | 代码分析 |
| `/improve` | 代码优化 |
| `/test` | 测试执行 |
| `/git` | Git 操作 |
| `/task` | 任务管理 |
| `/spawn` | 子任务编排 |
| `/cleanup` | 代码清理 |
| `/document` | 文档生成 |
| `/design` | 架构设计 |

### 3.2 Agent 系统

- **Sub-Agents**: planner, architect, tdd-guide, code-reviewer, security-reviewer
- **Auto-Activation**: 根据任务类型自动激活
- **Parallel Execution**: 并行任务执行

### 3.3 Skills 系统

- **Project Skills**: `.claude/skills/` 目录
- **Global Skills**: 全局技能
- **Skills Marketplace**: 社区技能市场

### 3.4 MCP (Model Context Protocol)

- **MCP Servers**: 外部服务集成
- **Shared Context**: 跨会话上下文共享
- **Tool Federation**: 工具联邦

### 3.5 Hooks 系统

- **PreToolUse**: 工具调用前
- **PostToolUse**: 工具调用后
- **Stop**: 会话结束

---

## 四、推荐架构设计

基于以上分析，推荐采用 **BFF 层架构 + 插件系统**：

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │   Web UI   │  │  PWA App   │  │   Mobile (Native)    │  │
│  │  (React)   │  │ (Service   │  │     (Future)         │  │
│  │            │  │  Worker)    │  │                      │  │
│  └──────┬─────┘  └──────┬─────┘  └──────────┬───────────┘  │
│         │                │                    │              │
└─────────┼────────────────┼────────────────────┼──────────────┘
          │                │                    │
          │    ┌───────────▼────────────────────▼─────────┐    │
          │    │              API Gateway                │    │
          │    │          (WebSocket + REST)             │    │
          │    └───────────────────┬──────────────────────┘    │
          │                        │                           │
┌─────────┼────────────────────────┼───────────────────────────┐
│         │    ┌───────────────────▼──────────────────────┐    │
│         │    │           BFF Layer (Node.js)            │    │
│         │    │  ┌─────────┐ ┌─────────┐ ┌────────────┐  │    │
│         │    │  │ Auth    │ │ Session │ │  Router    │  │    │
│         │    │  │ Service │ │ Manager │ │            │  │    │
│         │    │  └────┬────┘ └────┬────┘ └──────┬─────┘  │    │
│         │    │       │          │            │         │    │
│         │    │  ┌────▼─────┐ ┌──▼──────┐ ┌────▼──────┐  │    │
│         │    │  │ Plugin   │ │ Claude  │ │  File     │  │    │
│         │    │  │ System   │ │ Adapter │ │  Service  │  │    │
│         │    │  └──────────┘ └────┬────┘ └───────────┘  │    │
│         │    └────────────────────┼─────────────────────┘    │
│         │                         │                          │
└─────────┼─────────────────────────┼──────────────────────────┘
          │                         │
          │    ┌────────────────────▼──────────────────────┐    │
          │    │         Claude Code Environment           │    │
          │    │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │    │
          │    │  │   MCP    │ │  Skills  │ │   Hooks    │  │    │
          │    │  │ Servers  │ │          │ │            │  │    │
          │    │  └──────────┘ └──────────┘ └────────────┘  │    │
          │    │                                            │    │
          │    └────────────────────────────────────────────┘    │
          │                                                      │
          └──────────────────▶ Local File System / Shell        │
```

### 4.2 技术栈推荐

**前端**:
- **框架**: Next.js 14/15 (App Router) 或 Vite + React
- **状态管理**: Zustand / Jotai
- **UI 组件**: shadcn/ui + Radix UI
- **编辑器**: CodeMirror 6 或 Monaco Editor
- **终端**: xterm.js
- **样式**: TailwindCSS
- **PWA**: next-pWA 或 Vite PWA Plugin

**后端**:
- **运行时**: Node.js 20+ / Bun
- **框架**: Hono (轻量) 或 Express
- **WebSocket**: ws / Server-Sent Events
- **认证**: JWT + OAuth2
- **数据库**: SQLite (本地) / PostgreSQL (可选)

### 4.3 核心功能模块

1. **认证授权**: JWT + Claude API Key 管理
2. **会话管理**: 多会话、历史、搜索
3. **文件浏览器**: 虚拟文件系统、语法高亮
4. **终端集成**: xterm.js + WebSocket
5. **Git 集成**: 状态查看、提交、分支切换
6. **插件系统**: 可扩展的 Tab 和面板
7. **MCP 管理**: 服务器管理、工具调用
8. **Skills 管理**: 技能安装、配置、启用

---

## 五、部署方案

### 5.1 快速启动 (一键部署)

```bash
# npm 全局安装
npm install -g @your-org/claude-web-ui
claude-web-ui

# 或 Docker
docker run -d -p 3000:3000 your-org/claude-web-ui
```

### 5.2 开发模式

```bash
git clone https://github.com/your-org/claude-web-ui
cd claude-web-ui
npm install
npm run dev
```

### 5.3 Cloud 托管 (可选)

- 提供托管服务（类似 CloudCLI Cloud）
- 支持远程访问、团队协作
- 月费订阅模式

---

## 六、差异化功能建议

相比现有项目，可以增加以下功能：

1. **可视化调试**: Agent 执行流程可视化
2. **工作流编排**: 拖拽式工作流设计器
3. **知识库集成**: 项目文档、代码库索引
4. **协作功能**: 团队共享会话、代码评审
5. **AI 项目管理**: 自动生成任务、进度追踪
6. **代码分析可视化**: 依赖图、复杂度分析
7. **快捷指令系统**: 自定义命令模板
8. **多模型切换**: Claude/GPT/Gemini 无缝切换

---

## 七、参考资料

- [CloudCLI (claudecodeui)](https://github.com/siteboon/claudecodeui)
- [sugyan/claude-code-webui](https://github.com/sugyan/claude-code-webui)
- [Claude Code CLI Reference](https://smartscope.blog/en/generative-ai/claude/claude-code-reference-guide/)
- [Claude Code vs Cursor vs Windsurf](https://wetheflywheel.com/en/guides/claude-code-vs-cursor-vs-windsurf/)
- [Claude Code Complete Guide](https://blakecrosley.com/guides/claude-code)
