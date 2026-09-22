<div align="center">

<img src="./assets/banner.svg" alt="OpenCode Nexus" width="100%" />

[![npm version](https://img.shields.io/npm/v/@serkanalgur/opencode-nexus?style=flat-square&color=6366f1)](https://www.npmjs.com/package/@serkanalgur/opencode-nexus)
[![license](https://img.shields.io/npm/l/@serkanalgur/opencode-nexus?style=flat-square&color=8b5cf6)](https://github.com/serkanalgur/opencode-nexus/blob/main/LICENSE)
[![opencode](https://img.shields.io/badge/OpenCode-V2-6366f1?style=flat-square)](https://opencode.ai)
[![typescript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?style=flat-square)](https://www.typescriptlang.org/)

**Adaptive Multi-Agent Orchestration with Cost Intelligence**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#features) • [TUI Commands](#tui-commands) • [Tools](#tools) • [Configuration](#configuration) • [Development](#development) • [Contributing](#contributing)

</div>

---

## What is OpenCode Nexus?

OpenCode Nexus is an agent orchestration plugin for [OpenCode V2](https://opencode.ai) that spawns **real sub-agent sessions** with **cost-aware routing**, **DAG-based task execution**, **self-healing**, and a **TUI dashboard**.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Real Sessions** | Each agent runs in its own OpenCode session via `ctx.session.create()` |
| **Role-Based Agents** | Architect, Coder, Reviewer, Tester, Explorer, Documenter — each with specialized prompts |
| **DAG Execution** | Tasks are parallelized based on dependency graphs |
| **Cost-Aware Routing** | Automatically selects cheaper models when budget is tight |
| **Self-Healing** | Retries failed tasks with exponential backoff |
| **TUI Dashboard** | Monitor agents, budget, and config from the terminal |
| **Slash Commands** | `/nexus`, `/nexus-dashboard`, `/nexus-model`, and more |

---

## Installation

```bash
# Using npm
npm install -g @serkanalgur/opencode-nexus

# Using bun
bun add -g @serkanalgur/opencode-nexus

# Add to OpenCode config
opencode plugin @serkanalgur/opencode-nexus --global
```

Or manually add to `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@serkanalgur/opencode-nexus"]
}
```

---

## Quick Start

### 1. Configure Agent Models

Press **Ctrl+N** or type `/nexus` to open the configuration dialog and select models for each agent role.

### 2. Use Slash Commands

```
/nexus              # Open full configuration
/nexus config       # Configure models & budget
/nexus status       # Show config summary
/nexus dashboard    # Show dashboard
/nexus model        # Select model for a role
/nexus reset        # Reset to defaults
```

### 3. Spawn Agents via Tools

From any agent prompt, use the nexus tools:

```
Use the nexus.spawn tool to create a coder agent for implementing JWT auth
Use the nexus.status tool to check orchestrator state
Use the nexus.agents tool to list all spawned agents
Use the nexus.costs tool to see cost breakdown
```

### 4. Programmatic Usage

```typescript
import { NexusOrchestrator } from '@serkanalgur/opencode-nexus'

const orchestrator = new NexusOrchestrator({
  budget: { maxTotalCost: 10.00 }
})

// Initialize with OpenCode context (done automatically by plugin)
orchestrator.initialize(ctx)

// Spawn a real agent session
const agent = await orchestrator.spawnAgent({ role: 'coder' })

// Execute tasks in DAG
const result = await orchestrator.execute({
  tasks: [
    {
      id: 'task-1',
      name: 'Implement auth',
      description: 'Add JWT authentication',
      requiredRole: 'coder',
      complexity: { overall: 60, factors: { fileCount: 3, codeLines: 200, dependencyDepth: 2, domainKnowledge: 40, riskLevel: 'medium' } },
      dependencies: [],
      files: { include: ['src/auth/**'] },
      priority: 'high',
      status: 'pending'
    }
  ]
})

console.log(`Completed in ${result.totalDuration}ms, cost: $${result.totalCost}`)
```

---

## Features

### Real OpenCode Sessions

Each agent runs in its own OpenCode session with the correct model and role-specific system prompt:

```typescript
// Creates a real OpenCode session
const session = await ctx.session.create({ title: '[Nexus] coder-agent-a1b2c3d4' })

// Switches to the appropriate agent and model
await ctx.session.switchAgent({ sessionID: session.id, agent: 'build' })
await ctx.session.switchModel({ sessionID: session.id, model: { providerID: 'anthropic', id: 'claude-sonnet-4-6' } })

// Sends the task prompt
await ctx.session.prompt({ sessionID: session.id, text: 'You are a senior software engineer...' })
```

### Role-Specific System Prompts

Each agent role gets a specialized prompt:

| Role | Focus |
|------|-------|
| **Architect** | System design, architecture patterns, high-level decisions |
| **Coder** | Clean, efficient code following best practices |
| **Reviewer** | Code review for correctness, security, performance |
| **Tester** | Comprehensive tests, edge cases, quality assurance |
| **Explorer** | Codebase navigation, architecture analysis |
| **Documenter** | Clear technical documentation |

### Cost-Aware Model Selection

Nexus automatically selects cheaper models when budget is running low:

```typescript
const orchestrator = new NexusOrchestrator({
  budget: {
    maxTotalCost: 10.00,
    maxCostPerTask: 1.00,
    alertThreshold: 0.2  // Alert at 20% remaining
  }
})

// When budget < $1 remaining, falls back to free tier
// Otherwise uses configured model for the role
```

### Self-Healing

Failed tasks are automatically retried with exponential backoff:

```typescript
const orchestrator = new NexusOrchestrator({
  selfHealing: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2  // 1s, 2s, 4s delays
  }
})
```

---

## TUI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/nexus` | — | Open full configuration dialog |
| `/nexus config` | `/nc` | Configure models & budget |
| `/nexus dashboard` | `/nd` | Show dashboard with models, budget, commands |
| `/nexus model` | `/nm` | Select model for a role |
| `/nexus status` | `/ns` | Show config summary |
| `/nexus reset` | — | Reset all settings to defaults |

**Keyboard shortcut:** `Ctrl+N` opens the main configuration dialog.

---

## Tools

Register these tools in your agent prompts:

| Tool | Description | Input |
|------|-------------|-------|
| `nexus.status` | Orchestrator status | `{ detailed?: boolean }` |
| `nexus.agents` | List spawned agents | `{ filter?: string }` |
| `nexus.costs` | Cost report & budget | `{}` |
| `nexus.dashboard` | Full state for dashboard | `{}` |
| `nexus.spawn` | Spawn a sub-agent | `{ role: string, task: string, model?: string }` |

### Tool Examples

```
# Spawn a coder agent
Use nexus.spawn with role="coder" and task="Implement JWT auth middleware"

# Check status
Use nexus.status with detailed=true

# List agents
Use nexus.agents with filter="idle"

# Get cost report
Use nexus.costs
```

---

## Configuration

### Agent Models (TUI)

Configure via `/nexus` or `Ctrl+N`:

```
🏗️ Architect: anthropic/claude-sonnet-4-6
💻 Coder:     anthropic/claude-sonnet-4-6
🔍 Reviewer:  openai/gpt-5-mini
🧪 Tester:    anthropic/claude-haiku-4-5
🔬 Explorer:  google/gemini-2.5-flash
📝 Documenter: anthropic/claude-haiku-4-5
```

### Budget

```
💰 Max Total: $10.00
   Max Per Task: $1.00
   Alert Threshold: 20%
```

### Self-Healing

```
🛡️ Enabled: ✅
   Max Retries: 3
   Context Transfer: ✅
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS PLUGIN                              │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              SERVER PLUGIN (index.ts)              │          │
│  │  • Tool registration (status, agents, costs,      │          │
│  │    dashboard, spawn)                              │          │
│  │  • Session hook for /nexus commands               │          │
│  │  • State persistence to storage                   │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │            ORCHESTRATOR (orchestrator.ts)          │          │
│  │  • Real OpenCode session creation                  │          │
│  │  • DAG-based task execution                        │          │
│  │  • Role-specific system prompts                    │          │
│  │  • Cost tracking & budget enforcement              │          │
│  │  • Self-healing with retry & backoff               │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              TUI PLUGIN (tui.tsx)                  │          │
│  │  • /nexus slash commands                           │          │
│  │  • /nexus-dashboard                                │          │
│  │  • Configuration dialogs (model selection)         │          │
│  │  • Keyboard shortcut (Ctrl+N)                      │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │              OpenCode SESSION API                   │          │
│  │  ctx.session.create() → session per agent          │          │
│  │  ctx.session.prompt()  → send task                 │          │
│  │  ctx.session.wait()    → wait for completion       │          │
│  │  ctx.session.context() → read results              │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Development

```bash
# Clone the repo
git clone https://github.com/serkanalgur/opencode-nexus.git
cd opencode-nexus

# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Type check
npx tsc --noEmit
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [Serkan Algur](https://github.com/serkanalgur)**

[![GitHub](https://img.shields.io/badge/GitHub-serkanalgur-181717?style=flat-square&logo=github)](https://github.com/serkanalgur)
[![npm](https://img.shields.io/badge/npm-@serkanalgur-cb3837?style=flat-square&logo=npm)](https://www.npmjs.com/package/@serkanalgur)

</div>
