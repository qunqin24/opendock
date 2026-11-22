# agy-yolo-bridge

[![npm version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tested with Vitest](https://img.shields.io/badge/tested_with-vitest-6E9F18.svg)](https://vitest.dev/)
[![Code Quality: Biome](https://img.shields.io/badge/linted_with-biome-60a5fa.svg)](https://biomejs.dev/)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](package.json)

> **Enterprise-grade, modular OpenCode plugin (v1/v2) and standalone CLI tool bridging custom markdown commands (`commands/*.md`), repository constitutions (`AGENTS.md`), and specialized role personas (`agents/*.md`) to the Google Antigravity Agent Client Protocol (ACP) in autonomous YOLO mode (`accept-edits`).**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start & Installation](#quick-start--installation)
  - [1. As an OpenCode Plugin](#1-as-an-opencode-plugin)
  - [2. As a Standalone CLI Tool](#2-as-a-standalone-cli-tool)
  - [Prerequisites](#prerequisites)
- [The Universal 3-Tier Layering Model](#the-universal-3-tier-layering-model)
  - [Tier 1: Constitution Layer (AGENTS.md)](#tier-1-constitution-layer-agentsmd)
  - [Tier 2: Agent Persona Layer (agents/*.md)](#tier-2-agent-persona-layer-agentsmd)
  - [Tier 3: Action / Command Layer (commands/*.md)](#tier-3-action--command-layer-commandsmd)
- [Authoring Guide & Procedures](#authoring-guide--procedures)
  - [How to Create Agent Personas (agents/*.md)](#how-to-create-agent-personas-agentsmd)
  - [How to Create Custom Commands (commands/*.md)](#how-to-create-custom-commands-commandsmd)
- [Automated Multi-Stage Orchestration](#automated-multi-stage-orchestration)
  - [The 4-Stage Autonomous Pipeline](#the-4-stage-autonomous-pipeline)
  - [Configuring Automated Orchestration in opencode.json](#configuring-automated-orchestration-in-opencodejson)
- [Enumeration Reference (ENUMs & Types)](#enumeration-reference-enums--types)
  - [Execution Modes (mode / targetMode)](#execution-modes-mode--targetmode)
  - [Thinking Budgets (thoughtLevel)](#thinking-budgets-thoughtlevel)
  - [Streaming Event Types (SessionEvent)](#streaming-event-types-sessionevent)
- [OpenCode Tool Domain & Agent Tool Calling](#opencode-tool-domain--agent-tool-calling)
  - [agy_exec (Universal Instruction Execution)](#agy_exec-universal-instruction-execution)
  - [agy_ship_plan (Implementation Plan Execution)](#agy_ship_plan-implementation-plan-execution)
- [OpenCode Native MCP Bridging](#opencode-native-mcp-bridging)
- [Session Architecture & Process Safety](#session-architecture--process-safety)
  - [Single-Flight Workspace Mutex](#single-flight-workspace-mutex)
  - [Process Group Supervisor & Anti-Zombie Guarantees](#process-group-supervisor--anti-zombie-guarantees)
- [Configuration Reference](#configuration-reference)
  - [Configuration File (agy-bridge.json)](#configuration-file-agy-bridgejson)
  - [Environment Variables](#environment-variables)
- [Development & Verification](#development--verification)
- [License](#license)

---

## Overview

When building complex software systems with autonomous AI coding agents, developers require strict governance, role specialization, and deterministic execution. Traditional single-agent setups frequently encounter:

- **Prompt Contamination**: Instructions from planning leak into execution, causing agents to write superficial code without exhaustive testing.
- **Permission Prompt Fatigue**: Constant confirmation popups interrupt large refactorings or multi-file changes.
- **Tool Incompatibility**: MCP servers defined in one toolchain are not accessible in the agent execution runtime.
- **Dual-Model Confusion**: Mixing local models with cloud models without clear role boundaries causes runtime indeterminism.

**`agy-yolo-bridge`** solves this by creating a decoupled, zero-guesswork bridge between **OpenCode** and **Google Antigravity CLI (`agy`)**. It reads instructions from native markdown files, bridges all configured MCP servers dynamically, and executes tasks via Antigravity's Agent Client Protocol (ACP) in autonomous YOLO mode (`accept-edits`).

---

## Quick Start & Installation

### Prerequisites

1. **Node.js**: `>= 22.0.0`
2. **Google Antigravity CLI (`agy`)**: Installed and authenticated in your environment:

   ```bash
   agy --version
   ```

### 1. As an OpenCode Plugin

Add `agy-yolo-bridge` to your project's `opencode.json` (or global `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["agy-yolo-bridge@latest"]
}
```

Once declared, OpenCode automatically loads the plugin, registers `/agy` and all workspace markdown commands (`commands/*.md`), and exposes the `agy_exec` tool.

### 2. As a Standalone CLI Tool

Install globally or run via `npx`:

```bash
# Global installation
npm install -g agy-yolo-bridge

# Execute immediately via npx
npx agy-yolo-bridge ship
```

---

## The Universal 3-Tier Layering Model

`agy-yolo-bridge` implements a deterministic 3-tier layering model that separates enterprise invariants from role personas and task commands:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: CONSTITUTION                            │
│                 AGENTS.md / .opencode/AGENTS.md                        │
│   Universal repository invariants, security rules, VCS push prohibition │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Always loaded into system prompt)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         TIER 2: PERSONA                                │
│                   .opencode/agents/<persona>.md                        │
│   Specialized role behaviors, domain expertise, and operational modes   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Inherited by active task)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         TIER 3: ACTION                                 │
│                  .opencode/commands/<action>.md                        │
│   Surgical task specifications, dynamic template variables ($ARGUMENTS)│
└────────────────────────────────────────────────────────────────────────┘
```

Synthesized System Prompt formula:
$$\text{System Prompt} = \mathbf{AGENTS.md} \;+\; \mathbf{agents/<name>.md} \;+\; \mathbf{commands/<name>.md}$$

### Tier 1: Constitution Layer (`AGENTS.md`)

Defines the authoritative rules of the repository (e.g., zero untyped `any`, 7-tag docstring standard, strict prohibition of unprompted `git commit` or `git push`).

- **Auto-Discovery Precedence**:
  1. `./AGENTS.md` (Workspace root)
  2. `.opencode/AGENTS.md`
  3. `.agent/AGENTS.md`
  4. `~/.config/opencode/AGENTS.md` (User global fallback)

### Tier 2: Agent Persona Layer (`agents/*.md`)

Defines the specific job title, behavior, and capabilities of an agent.

- **Discovery Precedence**:
  1. `config.agents` mapping dictionary
  2. `.opencode/agents/<name>.md`
  3. `agents/<name>.md`
  4. `.agent/agents/<name>.md`
  5. `~/.config/opencode/agents/<name>.md`

### Tier 3: Action / Command Layer (`commands/*.md`)

Defines executable task workflows triggered via OpenCode slash commands or the CLI.

- **Discovery Precedence**:
  1. `config.commands` mapping dictionary
  2. `.opencode/commands/<name>.md`
  3. `commands/<name>.md`
  4. Explicit markdown file path (e.g. `.agent/handoff/02_TECHNICAL_PLAN.md`)

---

## Authoring Guide & Procedures

### How to Create Agent Personas (`agents/*.md`)

Create a markdown file in `.opencode/agents/<name>.md` (or `~/.config/opencode/agents/<name>.md`).

#### Persona YAML Frontmatter

```yaml
---
description: "Human-readable summary of persona responsibility"
model: "gemini-3.8-flash-high" # Target LLM model
mode: "accept-edits" # "accept-edits" (YOLO) | "default" | "plan"
thoughtLevel: "high" # "low" | "medium" | "high"
---
```

#### Production Persona Example: Implementation Driver (`agents/build.md`)

```markdown
---

description: "Autonomous Universal Implementation & Self-Healing Driver"
mode: accept-edits
thoughtLevel: low
---

# Agent Role: Autonomous Universal Implementation Driver (`build`)

You are the **Principal Implementation Engineer** operating under `AGENTS.md`.
When invoked via `/ship`, your mandate is to:

1. Ingest `.agent/handoff/02_TECHNICAL_PLAN.md` and `.agent/handoff/00_TASK_STATE.json`.
2. Verify dependency research freshness in `.agent/handoff/01_RESEARCH_REPORT.md`.
3. Implement all code changes adhering to the universal 7-tag docstring standard.
4. Author comprehensive unit and integration tests covering positive and negative paths.
5. Verify all linters, typecheckers, and test suites exit with code 0.
6. Generate `.agent/handoff/03_BUILD_MANIFEST.md` and dispatch the `reviewer` subagent.
7. If `04_REVIEW_AUDIT.md` returns `status: REJECTED_RETURN_TO_BUILD`, remediate defects and loop until approved.
```

#### Production Persona Example: Lead QA Auditor (`agents/reviewer.md`)

```markdown
---

description: "Independent Lead QA & Principal Cybersecurity Auditor"
mode: accept-edits
thoughtLevel: low
---

# Agent Role: Independent Lead QA Auditor (`reviewer`)

You are the **Lead QA & Cybersecurity Auditor**. Dispatched exclusively after the build phase, your mandate is:

- **Strict Read-Only Source Mandate:** Never mutate application source code directly.
- **6-Pillar QA Inspection:** Audit API contracts, frontend hydration, OWASP Top 10 vulnerabilities, supply-chain CVEs, anti-decorative test quality, and 7-tag docstrings.
- **Output:** Write definitive audit findings strictly to `.agent/handoff/04_REVIEW_AUDIT.md`.
```

---

### How to Create Custom Commands (`commands/*.md`)

Create a markdown file in `.opencode/commands/<name>.md` (or `~/.config/opencode/commands/<name>.md`). The filename directly determines the slash command name (e.g. `audit.md` becomes `/audit`).

#### Command YAML Frontmatter

```yaml
---
description: "Run automated security, memory leak, and race condition audit"
agent: "reviewer" # Optional: binds command to Tier 2 persona
model: "gemini-3.8-flash-high" # Optional: overrides default model
mode: "accept-edits" # "accept-edits" | "default" | "plan"
thoughtLevel: "high" # "low" | "medium" | "high"
timeoutMs: 600000 # Execution timeout in milliseconds (default: 600000)
---
```

#### Dynamic Template Placeholders

Interpolate runtime context directly into your instruction:

| Placeholder  | Alias      | Description                             | Replacement Example        |
| :----------- | :--------- | :-------------------------------------- | :------------------------- |
| `$ARGUMENTS` | `{{ARGS}}` | Arguments passed after the command      | `src/auth.ts --strict`     |
| `{{CWD}}`    | —          | Current working directory absolute path | `/workspace/my-service`    |
| `{{DATE}}`   | —          | Current UTC ISO timestamp               | `2026-11-22T10:00:00.000Z` |

#### Production Command Example (`commands/audit.md`)

```markdown
---

description: "Run comprehensive AppSec and concurrency audit"
agent: reviewer
thoughtLevel: high
mode: accept-edits
---

# Deep Security & Concurrency Audit

Target Scope: $ARGUMENTS

Audit Invariants:

1. Identify all unsanitized SQL, shell, or DOM injection sinks.
2. Verify all event listeners, database pools, and streams have explicit teardowns.
3. Detect race conditions on shared mutable states.

Output findings in a markdown table and assign severity ratings (CRITICAL, HIGH, MEDIUM, LOW).
```

---

## Automated Multi-Stage Orchestration

`agy-yolo-bridge` enables fully autonomous, self-healing software delivery workflows by dividing responsibilities between OpenCode's planning capabilities and Antigravity's high-performance execution engine.

### The 4-Stage Autonomous Pipeline

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: SPECIFICATION & RESEARCH (OpenCode Native Runtime)                   │
│  User / Agent 'plan' -> Explores repo, queries MCPs (context7, grep), writes   │
│  .agent/handoff/01_RESEARCH_REPORT.md and 02_TECHNICAL_PLAN.md                 │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼ (User executes /ship)
┌────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: AUTONOMOUS BUILD (Antigravity ACP via agy-yolo-bridge)               │
│  Antigravity ACP (agent: build) in YOLO mode:                                  │
│  - Reads 02_TECHNICAL_PLAN.md & verifies research freshness                    │
│  - Implements production code & tests across files                             │
│  - Runs compiler, linters, and test suites until 0 exit code                   │
│  - Emits .agent/handoff/03_BUILD_MANIFEST.md                                   │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼ (Build auto-dispatches Reviewer)
┌────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 3: ADVERSARIAL QA & REMEDIATION LOOP                                    │
│  Antigravity ACP (agent: reviewer):                                            │
│  - Audits git diff against plan & OWASP invariants                             │
│  - Writes .agent/handoff/04_REVIEW_AUDIT.md                                    │
│                                                                                │
│       ┌───────────────────────┐                                                │
│       ▼                       │                                                │
│   [REJECTED] ──> Build remediates & re-tests ──> Re-dispatches Reviewer        │
│       │                                                                        │
│       ▼ [APPROVED_FOR_HUMAN_REVIEW]                                            │
└──────────────────────────────────────┬─────────────────────────────────────────┘
                                       │
                                       ▼ (User inspects diff & runs /commit)
┌────────────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: RELEASE & VCS GATE (OpenCode Native Runtime)                         │
│  Agent 'committer': Verifies audit approval, filters secrets, stages files,    │
│  generates Conventional Commit citing task_id, and pushes cleanly.             │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Configuring Automated Orchestration in `opencode.json`

To establish this exact automated pipeline in your workspace, configure your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "plan",
  "plugins": ["agy-yolo-bridge@latest"],
  "commands": {
    "ship": {
      "description": "Execute approved plan, verify, deep review, and loop until PASS via Antigravity",
      "template": "/agy agent:build .agent/handoff/02_TECHNICAL_PLAN.md"
    },
    "commit": {
      "agent": "committer",
      "description": "Verify audit approval, filter secrets, commit via Conventional Commits, push, and archive task",
      "template": "Verify .agent/handoff/04_REVIEW_AUDIT.md has status APPROVED_FOR_HUMAN_REVIEW and matches active task_id. Filter out all secrets and ephemeral files, stage verified changes, commit using Conventional Commits 1.0.0 citing task_id, push to current remote branch, and archive task artifacts."
    }
  }
}
```

> [!TIP]
> Notice that `"agent": "build"` is omitted from `commands.ship`. When you type `/ship`, OpenCode expands the command directly to `/agy agent:build .agent/handoff/02_TECHNICAL_PLAN.md`, delegating the entire coding and testing phase directly to Antigravity ACP in YOLO mode!

---

## Enumeration Reference (ENUMs & Types)

### Execution Modes (`mode` / `targetMode`)

| Value            | Identifier         | Description                                                                                                                                                                              | Autonomy Level   |
| :--------------- | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| `"accept-edits"` | YOLO Mode          | **Default**. Automatically accepts all proposed file edits and tool execution permissions without user confirmation prompts. Ideal for CI/CD, headless workers, and automated pipelines. | Full Autonomy    |
| `"default"`      | Interactive Mode   | Standard agent mode. Presents interactive confirmation prompts for sensitive tool executions and file modifications according to client permission gates.                                | Guarded Autonomy |
| `"plan"`         | Architectural Mode | Read-only planning mode. Analyzes workspace context and outputs markdown execution plans without modifying files on disk.                                                                | Read-Only        |

### Thinking Budgets (`thoughtLevel`)

Controls the computational budget allocated to chain-of-thought (CoT) reasoning in supported models (e.g., `gemini-3.8-flash-high`, `gemini-3.8-pro`):

| Value      | Latency | Reasoning Depth              | Recommended Use Cases                                           |
| :--------- | :------ | :--------------------------- | :-------------------------------------------------------------- |
| `"low"`    | ~1-3s   | Minimal reasoning chain      | Straightforward tasks, unit test fixes, boilerplate scaffolding |
| `"medium"` | ~3-8s   | Balanced reasoning           | Standard feature implementation, bug fixing, test authoring     |
| `"high"`   | ~8-25s  | Deep multi-step verification | Complex refactoring, AppSec audits, concurrent architectures    |

### Streaming Event Types (`SessionEvent`)

The ACP engine streams structured telemetry and events in real time:

| Event Type      | Payload Properties                                                          | Description                                                            |
| :-------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `"status"`      | `message: string`                                                           | Lifecycle transitions (session initialization, model setup, shutdown). |
| `"thought"`     | `thought: string`                                                           | Real-time chain-of-thought reasoning stream emitted by the model.      |
| `"message"`     | `content: string`                                                           | Streaming text fragments of the assistant's direct response.           |
| `"tool_start"`  | `callId: string`, `toolName: string`, `args?: Record<string, unknown>`      | Notification that an external or MCP tool has begun execution.         |
| `"tool_update"` | `callId: string`, `status: string`, `output?: string`                       | Intermediate output or progress updates from an active tool execution. |
| `"usage"`       | `promptTokens?: number`, `candidateTokens?: number`, `totalTokens?: number` | Cumulative token consumption telemetry.                                |
| `"stderr"`      | `message: string`                                                           | Diagnostic output and standard error from the Antigravity subprocess.  |

---

## OpenCode Tool Domain & Agent Tool Calling

The bridge registers strictly typed tools conforming to `@opencode/schema/tool`, enabling autonomous agents to invoke Antigravity ACP programmatically without triggering harness warnings.

### `agy_exec` (Universal Instruction Execution)

Executes any custom command or markdown file via Antigravity ACP.

- **Input Schema:**
  - `command` (`string`, optional): Name of a registered command (e.g. `"audit"`).
  - `agent` (`string`, optional): Role persona name (e.g. `"build"`, `"reviewer"`).
  - `instructionPath` (`string`, optional): Relative or absolute path to instruction markdown file.
  - `inlineInstruction` / `prompt` (`string`, optional): Raw prompt or instruction text.
  - `args` (`string`, optional): Contextual user arguments.
  - `timeoutMs` (`number`, optional): Execution timeout in milliseconds. Set to `0` for unlimited duration (default: `0`).
- **Output Schema:** `output: Schema.String`
- **Return Shape:** `{ content: string, output: string }`

#### Tool Invocation Example:

```json
{
  "tool": "agy_exec",
  "arguments": {
    "agent": "build",
    "instructionPath": ".agent/handoff/02_TECHNICAL_PLAN.md",
    "args": "--verify-all",
    "timeoutMs": 0
  }
}
```

### `agy_ship_plan` (Implementation Plan Execution)

Specialized helper tool to execute an approved implementation plan in YOLO mode.

- **Input Schema:**
  - `planPath` (`string`, optional): Explicit path to plan file.
  - `inlinePlanText` (`string`, optional): Inline markdown plan text.
  - `timeoutMs` (`number`, optional): Execution timeout in milliseconds. Set to `0` for unlimited duration (default: `0`).
- **Output Schema:** `output: Schema.String`

---

## Live Process Visibility & Observability

During long-running multi-tool builds and audits, `agy-yolo-bridge` provides zero-friction, modular live visibility without making assumptions about workspace layout:

- **Universal Stderr Streaming**: Every tool call and status transition emitted by the model is immediately written to `process.stderr`:

  ```text
  [agy-bridge] [#1] edit: src/services/extractor.ts
  [agy-bridge] [#1] status: completed (tool-1)
  [agy-bridge] [#2] run_command: pnpm run typecheck
  [agy-bridge] Finished: COMPLETED in 24.5s (2 actions)
  ```

  This surfaces live progress directly to the OpenCode terminal in real-time.
- **Enriched `toolCtx.progress`**: Both `tool_start` and `tool_update` events feed OpenCode's dynamic tool progress hooks.

---

## OpenCode Native MCP Bridging

Antigravity natively includes internal tools. To ensure complete alignment with your OpenCode project, `agy-yolo-bridge` dynamically imports all MCP servers defined in OpenCode:

1. **Sources Inspected**:
   - Runtime `ctx.mcp.list()` (active plugin context)
   - `.opencode/mcp.json`
   - `opencode.json` (workspace root)
   - `~/.config/opencode/opencode.json` (user global)
2. **Protocol Conversion**:
   - **Local Stdio MCP Servers**: Converts `command`, `args`, `env`, and `cwd` into standard ACP server parameters.
   - **Remote HTTP/SSE MCP Servers**: Converts `url` and custom `headers` into standard ACP endpoints.
3. **Sterility & Isolation**:
   - Passes `--include-default-customizations=false` to Antigravity ACP.
   - Antigravity sees **only** OpenCode MCP servers and your markdown instructions, eliminating tool shadowing and prompt interference.

---

## Session Architecture & Process Safety

### Single-Flight Workspace Mutex

To prevent concurrent file mutation conflicts, the bridge enforces an atomic workspace lock:

- Creates `.opencode/.agy-yolo-bridge.lock` containing the active PID, timestamp, and task identifier.
- **Stale Lock Recovery**: Automatically verifies dead PIDs (`process.kill(pid, 0)`) and lock timeouts, automatically releasing abandoned locks.

### Process Group Supervisor & Anti-Zombie Guarantees

Child subprocesses can become orphaned zombie processes if the parent crashes or is interrupted:

- Spawns Antigravity in an isolated process group (`detached: true`).
- Hooks OS signals (`SIGINT`, `SIGTERM`, `SIGHUP`) and `AbortSignal` cancellation tokens.
- Dispatches `SIGTERM` to the entire negative PID group (`-child.pid`), escalating to `SIGKILL` after an explicit grace period.

---

## Configuration Reference

### Configuration File (`agy-bridge.json`)

Place `agy-bridge.json` in your workspace root or `.opencode/agy-bridge.json`:

```json
{
  "$schema": "./agy-bridge.schema.json",
  "binaryPath": "agy",
  "requireAgentsMd": false,
  "commandsDir": ".opencode/commands",
  "agentsDir": ".opencode/agents",
  "loadOpenCodeMcp": true,
  "useCustomSystemPrompt": true,
  "yolo": true,
  "targetMode": "accept-edits",
  "model": "gemini-3.8-flash-high",
  "thoughtLevel": "high",
  "maxExecutionTimeoutMs": 0,
  "idleTimeoutMs": 180000,
  "commands": {
    "audit": ".opencode/commands/audit.md",
    "review": ".opencode/commands/review.md",
    "ship": ".opencode/commands/ship.md"
  }
}
```

### Environment Variables

| Variable                              | Type                | Default                | Description                                                              |
| :------------------------------------ | :------------------ | :--------------------- | :----------------------------------------------------------------------- |
| `AGY_BRIDGE_BINARY`                   | `string`            | `"agy"`                | Path or command name for Antigravity CLI binary                          |
| `AGY_BRIDGE_REQUIRE_AGENTS_MD`        | `boolean` (`1`/`0`) | `false`                | Mandate that `AGENTS.md` constitution exists                             |
| `AGY_BRIDGE_AGENTS_MD_PATH`           | `string`            | `undefined`            | Explicit file path override to `AGENTS.md`                               |
| `AGY_BRIDGE_AGENTS_DIR`               | `string`            | `".opencode/agents"`   | Directory path for agent personas (`*.md`)                               |
| `AGY_BRIDGE_COMMANDS_DIR`             | `string`            | `".opencode/commands"` | Directory path for custom commands (`*.md`)                              |
| `AGY_BRIDGE_LOAD_OPENCODE_MCP`        | `boolean` (`1`/`0`) | `true`                 | Bridge OpenCode MCP servers to Antigravity ACP                           |
| `AGY_BRIDGE_USE_CUSTOM_SYSTEM_PROMPT` | `boolean` (`1`/`0`) | `true`                 | Override default system prompt with constitution                         |
| `AGY_BRIDGE_YOLO`                     | `boolean` (`1`/`0`) | `true`                 | Enable YOLO mode (`accept-edits`)                                        |
| `AGY_BRIDGE_MODE`                     | `enum`              | `"accept-edits"`       | Target ACP mode (`accept-edits`, `default`, `plan`)                      |
| `AGY_BRIDGE_MODEL`                    | `string`            | `undefined`            | Target LLM model identifier                                              |
| `AGY_BRIDGE_THOUGHT_LEVEL`            | `enum`              | `undefined`            | Thinking budget (`low`, `medium`, `high`)                                |
| `AGY_BRIDGE_MAX_TIMEOUT_MS`           | `number`            | `0`                    | Cumulative execution timeout in ms. `0` = unlimited (default)            |
| `AGY_BRIDGE_IDLE_TIMEOUT_MS`          | `number`            | `180000`               | Maximum idle silence in ms before triggering inactivity watchdog (3 min) |
| `AGY_BRIDGE_HANDSHAKE_TIMEOUT_MS`     | `number`            | `15000`                | Handshake RPC timeout in ms (15s)                                        |

---

## Development & Verification

`agy-yolo-bridge` enforces strict quality standards using Biome and Vitest:

```bash
# Check formatting, lint rules, and import sorting with Biome (sub-second)
pnpm run lint

# Auto-fix formatting and lint issues
pnpm run lint:fix

# Format all files
pnpm run format

# Run strict TypeScript typecheck
pnpm run typecheck

# Execute comprehensive Vitest test suite (70+ unit & integration tests)
pnpm test

# Build production distribution bundle
pnpm run build
```

---

## License

[MIT](LICENSE) © 2026 Shukoi. Distributed under the terms of the MIT License.
