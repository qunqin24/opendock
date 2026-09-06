# @te-river/opencode-gov-mode

A hierarchical multi-agent plugin for [OpenCode Desktop](https://opencode.ai) that implements an imperial government command structure. Coordinate complex coding tasks across a structured hierarchy of 15 specialized agents, from an Emperor down to domain specialists.

## Features

- **15 Specialized Agents** — Emperor, Prime Minister, 6 Ministries (Personnel, Finance, Protocol, Military, Justice, Engineering), Regional Governors, Local Officials, and 5 Specialists (Architect, Implementer, Reviewer, Tester, Researcher).
- **12 Slash Commands** — Full imperial workflow commands from `/gov-reign` to individual specialist dispatches.
- **Blackboard Coordination** — Shared artifact system with session isolation and TTL auto-cleanup for inter-agent communication.
- **Hierarchical Delegation** — Configurable max depth for deep sub-agent nesting.
- **Session Isolation** — Each task gets its own isolated blackboard with automatic resource management.
- **TypeScript** — Fully typed API for reliable plugin integration.

## Requirements

- Node.js ≥ 18
- [OpenCode Desktop](https://opencode.ai)

## Installation

### One-line installer

macOS / Linux (bash):
```bash
curl -fsSL https://ghproxy.net/https://raw.githubusercontent.com/Te-River/Opencode-GovMode/main/scripts/install.sh | bash
```

Windows (PowerShell):
```powershell
irm https://ghproxy.net/https://raw.githubusercontent.com/Te-River/Opencode-GovMode/main/scripts/install.ps1 | iex
```

### Manual config

Add the plugin to your `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@te-river/opencode-gov-mode@latest"
  ]
}
```

OpenCode will automatically install the plugin on startup.

## Quick Start

After installation, OpenCode Desktop will automatically detect the plugin. Open the command palette and start a new government session:

```
/gov-reign Implement a rate-limited middleware for the API gateway
```

This dispatches the full imperial workflow: the Emperor receives the task, delegates to the Prime Minister for coordination, who assigns it through the appropriate ministry, and ultimately a Regional Governor coordinates the implementation via Local Officials and Specialists.

## Agent Hierarchy

The plugin models a hierarchical imperial government. Each level can delegate to the level below, forming a tree of agents working on sub-tasks.

### 1. Emperor (君主) — Supreme Decision Maker
- Receives top-level tasks and makes final architectural decisions
- Delegates to the Prime Minister for coordination

### 2. Prime Minister (宰相) — Chief Coordinator
- Orchestrates work across ministries
- Routes tasks to the correct domain
- Aggregates reports for the Emperor

### 3. Six Ministries (六部) — Domain Specialists

| Ministry | Chinese | Responsibility |
|----------|---------|----------------|
| Personnel | 吏部 | Agent assignment and human-resource-like concerns |
| Finance | 户部 | Resource budgeting, cost analysis, and optimization |
| Protocol | 礼部 | Code conventions, documentation, and standards |
| Military | 兵部 | Security, threat modeling, and defensive design |
| Justice | 刑部 | Code quality, linting, and compliance |
| Engineering | 工部 | Architecture, infrastructure, and build systems |

### 4. Regional Governors (地方官) — Project Managers
- Manage a specific region (project/module) of the codebase
- Coordinate Local Officials and Specialists within their region

### 5. Local Officials (基层官员) — Task Executors
- Execute individual tasks within a region
- Report progress back to their Governor

### 6. Specialists — Domain Experts

| Specialist | Role |
|------------|------|
| Architect | System design and high-level architecture |
| Implementer | Code writing and implementation |
| Reviewer | Code review and quality assurance |
| Tester | Test design and execution |
| Researcher | Information gathering and analysis |

## Command Reference

| Command | Description |
|---------|-------------|
| `/gov-reign <task>` | Full imperial workflow — Emperor receives and orchestrates the entire task through the hierarchy |
| `/gov-decree <task>` | Issue an imperial decree — a direct, non-negotiable directive |
| `/gov-report` | View a status report from the current government session |
| `/gov-endorse <finding>` | Approve or reject findings from reviewers or auditors |
| `/gov-ministry <ministry> <task>` | Dispatch a task directly to a specific ministry (e.g., `/gov-ministry engineering Implement auth`) |
| `/gov-governor <region> <task>` | Dispatch a task to a Regional Governor for a specific region |
| `/gov-official <official> <task>` | Dispatch a task directly to a Local Official |
| `/gov-plan` | Invoke the Architect to produce a design plan |
| `/gov-implement` | Invoke the Implementer to write code according to a plan |
| `/gov-review` | Invoke the Reviewer to review code or a plan |
| `/gov-test` | Invoke the Tester to create and run tests |
| `/gov-research` | Invoke the Researcher to investigate a question or gather information |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Emperor (君主)                 │
│              Supreme Decision Maker              │
└──────────────────────┬──────────────────────────┘
                       │ delegates
┌──────────────────────▼──────────────────────────┐
│               Prime Minister (宰相)              │
│               Chief Coordinator                  │
└────┬──────┬──────┬──────┬──────┬───────┬────────┘
     │      │      │      │      │       │
┌────▼──┐┌──▼───┐┌─▼──┐┌─▼───┐┌─▼──┐┌───▼────┐
│Person-││Finance││Prot││Milit││Just││Engineer│
│nel    ││      ││ocol││ary  ││ice ││ing     │
└───┬───┘└──┬───┘└─┬──┘└─┬───┘└─┬──┘└───┬────┘
    │       │      │     │      │       │
    └───────┴──────┴──┬──┴──────┴───────┘
                      │
        ┌─────────────▼──────────────┐
        │    Regional Governors      │
        │     (地方官 / Project Mgr)  │
        └─────────────┬──────────────┘
                      │
        ┌─────────────▼──────────────┐
        │     Local Officials        │
        │   (基层官员 / Task Executor)│
        └─────────────┬──────────────┘
                      │
    ┌─────────┬───────┼────────┬──────────┐
    ▼         ▼       ▼        ▼          ▼
┌────────┐┌──────┐┌───────┐┌────────┐┌──────────┐
│Architect││Impl- ││Review-││ Tester ││Researcher│
│        ││ement.││  er   ││        ││          │
└────────┘└──────┘└───────┘└────────┘└──────────┘
```

### Blackboard Coordination

Agents communicate through a **blackboard** — a shared workspace for each session. Key properties:

- **Session Isolation** — Each `/gov-reign` invocation creates a fresh blackboard session.
- **TTL Auto-Cleanup** — Stale sessions are automatically garbage-collected.
- **Artifact Ownership** — Each agent writes to its own designated artifact; read-only access to others' artifacts.
- **Traceability** — Full audit trail of which agent wrote what and when.

### Delegation Model

- Tasks flow **top-down** (Emperor → Prime Minister → Ministry → Governor → Official → Specialist).
- Reports flow **bottom-up** (Specialist → Official → Governor → Ministry → Prime Minister → Emperor).
- **Max depth** is configurable to prevent runaway nesting.

## Configuration

The plugin reads configuration from your OpenCode Desktop settings. All options have sensible defaults.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ttlDays` | `number` | `5` | Blackboard session TTL in days |
| `defaultAgent` | `boolean` | `true` | Whether Emperor is the default agent |
| `maxDepth` | `number` | `10` | Maximum hierarchy nesting depth |
| `subagentDepth` | `number` | `9` | OpenCode subagent nesting depth (0=disable, 1=default, 2-9=nested levels) |

### Subagent Depth Configuration

The plugin automatically configures OpenCode's `subagent_depth` to enable hierarchical delegation:

- **`0`** — Disable all subagents
- **`1`** — Default: subagents cannot nest (single level only)
- **`2`** — Allow 2 levels of nesting (Emperor → Ministry → Official)
- **`3-9`** — Deep nesting for maximum chaos and fun!

The plugin sets `subagent_depth: 9` by default for maximum hierarchical insanity. You can override this in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "subagent_depth": 9,
  "plugin": [
    ["@te-river/opencode-gov-mode@latest", { "subagentDepth": 9 }]
  ]
}
```

**Warning:** This is for entertainment purposes only. Higher values cause exponential token consumption and cost. Use at your own risk!

## Development

```bash
# Clone and install
git clone https://github.com/Te-River/Opencode-GovMode.git
cd Opencode-GovMode
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository and create a feature branch from `main`.
2. **Write code** that follows the existing TypeScript conventions.
3. **Add tests** for any new functionality using the existing test framework.
4. **Run the full test suite** before submitting:
   ```bash
   npm test
   ```
5. **Open a Pull Request** with a clear description of what you changed and why.

### Code Style

- TypeScript with strict mode enabled.
- Follow the existing file structure under `src/`.
- Prefer named exports over default exports.
- Keep functions focused and small.

## License

[Apache License 2.0](LICENSE)

Copyright 2026 Te-River.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
