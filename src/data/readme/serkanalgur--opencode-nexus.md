<div align="center">

<img src="./assets/banner.svg" alt="OpenCode Nexus" width="100%" />

[![npm version](https://img.shields.io/npm/v/@serkanalgur/opencode-nexus?style=flat-square&color=6366f1)](https://www.npmjs.com/package/@serkanalgur/opencode-nexus)
[![npm downloads](https://img.shields.io/npm/dw/@serkanalgur/opencode-nexus?style=flat-square&color=22c55e)](https://www.npmjs.com/package/@serkanalgur/opencode-nexus)
[![license](https://img.shields.io/npm/l/@serkanalgur/opencode-nexus?style=flat-square&color=8b5cf6)](https://github.com/serkanalgur/opencode-nexus/blob/main/LICENSE)
[![opencode](https://img.shields.io/badge/OpenCode-V2-6366f1?style=flat-square)](https://opencode.ai)
[![typescript](https://img.shields.io/badge/TypeScript-5.5+-3178c6?style=flat-square)](https://www.typescriptlang.org/)
[![sponsor](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=flat-square&logo=github)](https://github.com/sponsors/serkanalgur)

**Adaptive Multi-Agent Orchestration with Cost Intelligence**

[Installation](#installation) • [Quick Start](#quick-start) • [Features](#features) • [Agents](#agents) • [Tools](#tools) • [Configuration](#configuration) • [Development](#development)

</div>

---

## What is OpenCode Nexus?

OpenCode Nexus is an agent orchestration plugin for [OpenCode V2](https://opencode.ai) that spawns **real sub-agent sessions** with **cost-aware routing**, **DAG-based task execution**, **self-healing**, and a **TUI/web dashboard**.

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Real Sessions** | Each agent runs in its own OpenCode session via `ctx.session.create()` |
| **Role-Based Agents** | Architect, Coder, Reviewer, Tester, Explorer, Documenter — each with specialized prompts |
| **DAG Execution** | Tasks are parallelized based on dependency graphs with priority queuing |
| **Cost-Aware Routing** | Scores models by quality/cost/speed, selects optimal per task complexity |
| **Self-Healing** | Retries with exponential backoff, context transfer, escalation policies |
| **Web Dashboard** | Real-time monitoring via HTTP + WebSocket server on port 4747 |
| **TUI Dashboard** | Monitor agents, budget, and config from the terminal |
| **Team Mode** | Lead agent orchestrates specialist agents in parallel |
| **Todo & Goal Tracking** | Enforce task completion, persist objectives across sessions |
| **Persistent Memory** | SQLite-backed memory store with TTL and search |
| **Learning Module** | Pattern recognition from failures, confidence scoring |
| **JSONC Config** | Read/write project and global config files with comments |
| **LSP Integration** | Auto-enabled for TypeScript, Python, Go, and 30+ languages |
| **AST-Grep** | Pattern-aware code search and rewriting |
| **Security Scanning** | Automated secrets and vulnerability detection |
| **Slash Commands** | `/nexus`, `/nexus web`, `/nexus review`, and more |

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

Or manually add to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": ["@serkanalgur/opencode-nexus"]
}
```

### Auto-Setup

On first load, Nexus automatically:
- Creates `nexus-orchestrator` agent in `~/.config/opencode/agents/`
- Creates subagent files: `nexus-coder`, `nexus-explorer`, `nexus-reviewer`, `nexus-tester`, `nexus-architect`, `nexus-documenter`
- Enables LSP in OpenCode config
- Configures agent models from `.opencode/nexus.jsonc`

---

## Quick Start

### 1. Configure Agent Models

Press **Ctrl+N** or type `/nexus` to open the configuration dialog. Select where to save (project or global).

### 2. Use the Nexus Orchestrator

Select `nexus-orchestrator` as your primary agent, then:

```
# Spawn agents for tasks
Use nexus.spawn with role="coder" and task="Implement JWT auth"

# Wait for completion and get results
Use nexus.spawn with role="reviewer" and task="Review the implementation" and wait=true

# Delegate (convenience wrapper)
Use nexus.delegate with role="tester" and task="Write tests for auth module"

# Check progress
Use nexus.sessions

# Track goals
Use nexus.goal.set with description="Build complete auth system"
```

### 3. Use Slash Commands

```
/nexus              # Open full configuration
/nexus web          # Start web dashboard (open http://localhost:4747)
/nexus review       # Quick code review
/nexus fix          # Quick fix for last error
/nexus explain      # Explain last change
```

---

## Features

### Cost-Aware Model Selection

Models are configured per role in `.opencode/nexus.jsonc`. Nexus scores models by quality, cost, and speed — then picks the optimal one:

```jsonc
{
  "models": {
    "architect": "opencode/muse-spark-1.3-contributor-free",
    "coder": "opencode/mimo-v2.6-flash-free",
    "reviewer": "opencode/muse-spark-1.2-contributor-free",
    "tester": "opencode-go/mimo-v2.5",
    "explorer": "opencode/big-pickle",
    "documenter": "opencode/big-pickle"
  }
}
```

When you call `nexus.spawn(role="coder")`, the coder model from config is used automatically.

### Self-Healing with Escalation

Failed tasks follow a 4-step escalation chain:

1. **Retry** — Exponential backoff (1s, 2s, 4s...)
2. **Respawn** — Collect context, spawn new agent with transferred state
3. **Fallback Model** — Try cheaper alternative model
4. **Alert** — Emit escalation event, mark as failed

### Web Dashboard

Real-time monitoring via embedded HTTP + WebSocket server on port 4747.

**How to start:**

1. Ask the agent to start the dashboard:
   ```
   Use nexus.dashboard.start with port=4747
   ```

2. Or use the TUI command:
   ```
   /nexus web
   ```
   This shows instructions and tries to open your browser.

3. Open in browser: `http://localhost:4747`

**What it shows:**
- Agent grid with role, status, model, and metrics
- Cost tracker with budget gauge
- DAG visualization with task dependencies
- Activity log with all events
- Config panel (read-only)
- Auto-refresh every 5 seconds

**Stop the dashboard:**
```
nexus.dashboard.stop()
```

### Team Mode

Create a team of specialist agents working in parallel:

```
nexus.team.create(name="auth-team", leadRole="architect")
nexus.team.addMember(teamId="...", role="coder", model="opencode/mimo-v2.6-flash-free")
nexus.team.addMember(teamId="...", role="reviewer", model="opencode/muse-spark-1.2-contributor-free")
nexus.team.activate(teamId="...")
```

### Todo & Goal Tracking

Track tasks and persist objectives across sessions:

```
nexus.todo.add(description="Implement auth middleware")
nexus.todo.list()
nexus.todo.complete(id="...")

nexus.goal.set(description="Build complete auth system")
nexus.goal.status()
nexus.goal.complete()
```

### LSP Integration

OpenCode's built-in LSP servers are auto-enabled. Supports 30+ languages including TypeScript, Python, Go, Rust, and more.

### AST-Grep

Pattern-aware code search and rewriting:

```
nexus.astgrep.search(pattern="console.log($$$)", language="typescript", directory="src/")
nexus.astgrep.rewrite(pattern="var $X", rewrite="const $X", language="typescript", directory="src/")
```

### Security Scanning

Automated secrets and vulnerability detection:

```
nexus.security.scan(content="const API_KEY = \"sk-123\"", filename="config.ts")
```

### Persistent Memory

SQLite-backed memory store that survives restarts:

```typescript
orchestrator.memoryStore.set({
  key: 'api-pattern',
  value: { endpoint: '/users', method: 'GET' },
  scope: 'project',
  author: 'architect',
  confidence: 0.9,
  tags: ['api', 'design']
})
```

### Learning Module

Records failure patterns and solutions, building confidence over time:

```typescript
const solutions = orchestrator.learning.findSolutions('TypeScript TS2345 error')
// → [{ entry: { solution: 'Add type cast', confidence: 0.85 }, similarity: 0.7 }]
```

### Preset Configurations

| Preset | Models | Budget | Self-Healing |
|--------|--------|--------|--------------|
| **minimal** | Gemini Flash | $1 | Off |
| **balanced** | Claude/GPT mix | $10 | On (3 retries) |
| **enterprise** | Top-tier | $50 | On (5 retries) |
| **cost-optimized** | Cheapest | $3 | On (2 retries) |

---

## Agents

Nexus creates 7 agent files in `~/.config/opencode/agents/`:

| Agent | Mode | Purpose |
|-------|------|---------|
| `nexus-orchestrator` | primary | Main orchestrator — decompose, dispatch, integrate |
| `nexus-architect` | subagent | System design and architecture |
| `nexus-coder` | subagent | Implement code tasks |
| `nexus-reviewer` | subagent | Code review (read-only) |
| `nexus-tester` | subagent | Write and run tests |
| `nexus-explorer` | subagent | Explore codebases (read-only) |
| `nexus-documenter` | subagent | Write documentation |

### Clarify Skill

When instructions are ambiguous, use `nexus.clarify`:

```
nexus.clarify(question="Should I use JWT or OAuth?", options="JWT, OAuth", assumption="JWT")
```

---

## Tools

| Tool | Description | Input |
|------|-------------|-------|
| `nexus.spawn` | Spawn a sub-agent | `{ role, task, model?, wait?, timeout? }` |
| `nexus.delegate` | Spawn + wait + result | `{ role, task, model?, timeout? }` |
| `nexus.sessions` | List active sessions | `{}` |
| `nexus.background` | Move agents to background | `{}` |
| `nexus.result` | Get agent result | `{ sessionID }` |
| `nexus.status` | Orchestrator status | `{ detailed? }` |
| `nexus.costs` | Cost report & budget | `{}` |
| `nexus.forecast` | Predict costs | `{ tasks }` |
| `nexus.model.costs` | Show/set model pricing | `{ model?, setInput?, setOutput? }` |
| `nexus.preset` | Apply preset config | `{ name }` |
| `nexus.config.save` | Save config to disk | `{ level: 'project' \| 'global' }` |
| `nexus.config.init` | Initialize config files | `{ level }` |
| `nexus.dashboard.start` | Start web dashboard | `{ port?, host? }` |
| `nexus.dashboard.stop` | Stop web dashboard | `{}` |
| `nexus.todo.add` | Add a todo item | `{ description, assignedTo? }` |
| `nexus.todo.list` | List all todos | `{}` |
| `nexus.todo.complete` | Complete a todo | `{ id }` |
| `nexus.todo.stats` | Todo statistics | `{}` |
| `nexus.goal.set` | Set a goal | `{ description, autoContinue? }` |
| `nexus.goal.status` | Current goal status | `{}` |
| `nexus.goal.complete` | Complete goal | `{}` |
| `nexus.goal.list` | List all goals | `{}` |
| `nexus.team.create` | Create a team | `{ name, leadRole }` |
| `nexus.team.addMember` | Add team member | `{ teamId, role, model }` |
| `nexus.team.status` | Team status | `{ teamId? }` |
| `nexus.team.activate` | Start team | `{ teamId }` |
| `nexus.performance.scores` | Performance scores | `{}` |
| `nexus.performance.best` | Best model for role | `{ role }` |
| `nexus.history.list` | Execution history | `{ count? }` |
| `nexus.history.stats` | Execution statistics | `{}` |
| `nexus.astgrep.search` | Search AST patterns | `{ pattern, language, directory }` |
| `nexus.astgrep.status` | Check ast-grep install | `{}` |
| `nexus.security.scan` | Scan for security issues | `{ content, filename? }` |
| `nexus.clarify` | Ask clarifying question | `{ question, options?, assumption? }` |
| `nexus.worktree.enable` | Enable worktree isolation | `{ repoRoot? }` |
| `nexus.worktree.list` | List worktrees | `{}` |
| `nexus.worktree.disable` | Disable worktrees | `{}` |

---

## TUI Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/nexus` | `Ctrl+N` | Open full configuration dialog |
| `/nexus web` | `/nw` | Start web dashboard |
| `/nexus review` | `/nr` | Quick code review |
| `/nexus fix` | `/nf` | Quick fix for last error |
| `/nexus explain` | `/ne` | Explain last change |
| `/nexus config` | `/nc` | Configure models & budget |
| `/nexus model` | `/nm` | Select model for a role |
| `/nexus status` | `/ns` | Show config summary |
| `/nexus reset` | — | Reset all settings to defaults |

---

## Configuration

### Agent Models

Configure via `/nexus` or `Ctrl+N`:

```
🏗️ Architect: opencode/muse-spark-1.3-contributor-free
💻 Coder:     opencode/mimo-v2.6-flash-free
🔍 Reviewer:  opencode/muse-spark-1.2-contributor-free
🧪 Tester:    opencode-go/mimo-v2.5
🔬 Explorer:  opencode/big-pickle
📝 Documenter: opencode/big-pickle
```

### Custom Roles

Define your own agent roles:

```jsonc
{
  "customRoles": [
    {
      "name": "security-auditor",
      "displayName": "Security Auditor",
      "emoji": "🔐",
      "prompt": "You are a security auditor...",
      "model": "anthropic/claude-sonnet-4-6"
    }
  ]
}
```

### Task Templates

```
nexus.template(name="list")      — Show available templates
nexus.template(name="feature")   — Full feature pipeline
nexus.template(name="bugfix")    — Bug investigation and fix
nexus.template(name="refactor")  — Code refactoring pipeline
nexus.template(name="documentation") — Documentation update
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      NEXUS PLUGIN                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              SERVER PLUGIN (index.ts)                │     │
│  │  • 40+ tool registrations                            │     │
│  │  • Auto-creates agents and enables LSP              │     │
│  │  • Config file loading and creation                 │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │            ORCHESTRATOR (orchestrator.ts)            │     │
│  │  • Real OpenCode session creation                    │     │
│  │  • DAG execution with priority queuing               │     │
│  │  • Cost-aware model routing (scored selection)       │     │
│  │  • Self-healing with 4-step escalation               │     │
│  │  • Context transfer to respawned agents              │     │
│  │  • Deadlock detection (cycle finding)                │     │
│  │  • Todo/Goal tracking                                │     │
│  │  • Team management                                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                    MODULES                          │     │
│  │  Health Monitor │ Learning │ Message Store (SQLite) │     │
│  │  Persistent Mem │ Fan-Out  │ Notifications (OS)     │     │
│  │  State Broadcaster │ Module Registry │ Security     │     │
│  │  Cost Forecaster │ Performance Tracker │ AST-Grep   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              WEB DASHBOARD                          │     │
│  │  • Bun.serve() HTTP + WebSocket (port 4747)         │     │
│  │  • DAG viz, cost chart, config editor, auto-refresh │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │              AGENTS (auto-created)                   │     │
│  │  nexus-orchestrator (primary)                       │     │
│  │  nexus-architect, nexus-coder, nexus-reviewer        │     │
│  │  nexus-tester, nexus-explorer, nexus-documenter      │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
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
