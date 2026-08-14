# ndomo

OpenCode multi-agent plugin. Taller de artesanos: 20 specialists under one Foreman, one Craftsman, and one Warden. Caveman-native. opencode-mem integrated. DCP peer optional.

## What is ndomo

ndomo is a multi-agent orchestration plugin for [OpenCode](https://github.com/opencode-ai). It routes development tasks to 20 specialized agents (scout, scribe, painter, smith, sage, guild, stack-smiths, inspector, critic, chronicler, and ops agents) coordinated by 3 primaries: Foreman (planning), Craftsman (implementation), Warden (operations). All agents use the Caveman output protocol for token-efficient communication. Memory persistence across sessions is handled by opencode-mem. The optional DCP plugin provides additional context pruning for long sessions.

**Quality features (since 0.4.0):** execution gates enforcement, binary critic review, brainstorm workflow with design docs, cross-session continuity ledgers, and circuit breaker loop detection.

## Agents

| Agent | Role | Model (default preset) | Type |
|---|---|---|---|
| **foreman** | Master orchestrator and scheduler | minimax/MiniMax-M3 | primary |
| **warden** | Ops custodian — CI/CD, deploy, releases, monitoring | opencode-go/deepseek-v4-flash | primary |
| **scout** | Codebase reconnaissance | opencode-go/minimax-m2.7 | subagent |
| **scribe** | External knowledge retrieval | opencode-go/minimax-m2.7 | subagent |
| **painter** | UI/UX design and visual composition | opencode-go/kimi-k2.6 | subagent |
| **smith** | Fast generic implementation | opencode-go/deepseek-v4-flash | subagent |
| **go-smith** | Go implementation specialist | xiaomi/mimo-v2.5-pro | subagent |
| **js-smith** | JS/TS implementation specialist | xiaomi/mimo-v2.5-pro | subagent |
| **python-smith** | Python implementation specialist | xiaomi/mimo-v2.5-pro | subagent |
| **vue-smith** | Vue 3 / Pinia implementation specialist | xiaomi/mimo-v2.5-pro | subagent |
| **zig-smith** | Zig 0.16 implementation specialist | xiaomi/mimo-v2.5-pro | subagent |
| **rust-smith** | Rust implementation specialist | opencode-go/mimo-v2.5-pro | subagent |
| **sage** | Architecture advisor and debugger | opencode-go/deepseek-v4-pro | subagent |
| **guild** | Multi-LLM consensus and debate | opencode-go/deepseek-v4-pro | subagent |
| **inspector** | Code quality and security auditor | opencode-go/deepseek-v4-pro | subagent |
| **critic** | Binary diff reviewer — APPROVED/REJECTED | minimax/MiniMax-M3 | subagent |
| **chronicler** | Technical documentation writer | opencode-go/deepseek-v4-flash | subagent |
| **ci-smith** | CI/CD pipeline specialist | opencode-go/deepseek-v4-flash | subagent |
| **deploy-smith** | Deployment automation specialist | opencode-go/deepseek-v4-flash | subagent |
| **release-smith** | Release management specialist | opencode-go/deepseek-v4-flash | subagent |
| **ops-scout** | Infrastructure recon specialist (read-only) | opencode-go/deepseek-v4-flash | subagent |

**Groups:** Orchestrator (foreman), Explorers (scout, scribe), Builders (painter, smith, go-smith, js-smith, python-smith, vue-smith, zig-smith, rust-smith), Advisors (sage, guild), Quality (inspector, chronicler), Operations (warden, ci-smith, deploy-smith, release-smith, ops-scout).

## Quick Start

```bash
# Quick install (interactive, will prompt for HTTP)
bunx ndomo install

# Non-interactive with preset + HTTP enabled
bunx ndomo install --preset=budget --enable-http

# With DCP
bunx ndomo install --with-dcp
```

By default the install applies `presets.default` from `config/ndomo.config.json`. Use `--preset=budget` for cheaper models, `--provider=ID` to override the provider prefix. See [docs/installer.md](docs/installer.md) for the full flag reference.

Or from source:

```bash
git clone https://github.com/nicosup98/ndomo-v2 ndomo
cd ndomo
bun install
bun run src/cli/install.ts
```

Inside OpenCode, verify all agents respond:

```
ping all agents
```

## Installation

**Prerequisites:** [bun](https://bun.sh) >= 1.1.0, OpenCode installed and configured with at least one authenticated provider.

Install via bunx (recommended):

```bash
# Interactive install (will prompt for HTTP)
bunx ndomo install

# With provider preset (non-interactive)
bunx ndomo install --provider=opencode --no-provider-prompt

# With budget preset + DCP
bunx ndomo install --preset=budget --with-dcp
```

Or from a local clone:

```bash
git clone https://github.com/nicosup98/ndomo-v2 ndomo
cd ndomo
bun install
bun run src/cli/install.ts                     # default preset
bun run src/cli/install.ts --preset=budget     # budget models
bun run src/cli/install.ts --with-dcp          # include DCP plugin
```

See [docs/installer.md](docs/installer.md) for detailed steps and full flag reference.

> **Migration note:** `scripts/install.sh` is preserved in the published tarball as a **compat shim for users coming from `curl -fsSL ... | bash`** (the pre-0.2.0 install path). It is deprecated — new installs should use `bunx ndomo install`. The shim is not removed to avoid breaking legacy one-liners, but no new features will be added there.

**Flags:**

| Flag | Description |
|---|---|
| `--provider=ID` | Override the provider prefix for all agents. The model ID is taken from the active preset; only the `provider/` segment of the `model:` field is swapped. |
| `--no-provider-prompt` | Skip the interactive provider prompt. The preset is still applied; no provider prefix override is performed. |
| `--preset=NAME` | Select preset from `config/ndomo.config.json::presets[NAME]`. (default: `default`, options: `default`, `budget`) |
| `--with-dcp` | Install and configure the DCP plugin. |
| `--dry-run` | Print planned changes without writing files. |
| `--skip-deps` | Skip the `bun install` dependency step. |
| `--enable-http` | Auto-enable HTTP server (writes http block to `ndomo.config.json`). |
| `--disable-http` | Skip the HTTP auto-prompt entirely (default in non-TTY / CI). |
| `--port=N` | HTTP server port (default: `4097`). |
| `--cors-origins=CSV` | HTTP CORS origins, comma-separated (default: `*`). |
| `--auth-required=BOOL` | HTTP auth requirement (default: `true`). |

**Uninstall:** `bunx ndomo install --uninstall` or `./scripts/uninstall.sh [--keep-data]`

## Plans & Tasks DB

ndomo persists plans, tasks, and sessions in a project-local SQLite database
(`<project>/.ndomo/state.db`) with FTS5 search, audit trail, and auto-archive
to markdown on completion. 17 tools exposed via OpenCode: `plan_create`,
`plan_get`, `plan_list`, `plan_search`, `plan_approve`, `plan_update_status`,
`task_create_batch`, `task_list`, `task_update_status`, `task_search`,
`task_next_for_agent`, `task_verify`, `session_start`, `session_checkpoint`,
`session_end`, `design_create`, `ledger_create`, `ledger_get`, `ledger_update`.

**New tools (since 0.4.0):**
- `task_verify` — inspector-only verification gate for execution gates
- `design_create` — persist brainstorm design docs (Phase 0)
- `ledger_create` / `ledger_get` / `ledger_update` — cross-session continuity ledgers

CLI write surface (since 0.3.0):
- `ndomo plan create|list|show|update|approve|complete|delete`
- `ndomo task create|list|show|update|reassign|complete|fail`

HTTP write surface (since 0.3.0): 10 endpoints covering plan create/update/approve/status/delete and task create/update/status/reassign/delete (`src/http/routes/`).

The foreman uses these to track work across agent dispatches. See
[docs/database.md](docs/database.md) for schema, tools, lifecycle, and
auto-archive behavior.

## Quality Features (since 0.4.0)

### Execution Gates (T1)

Tasks can require verification before completion. When `verification_required=true`, the task enters a `verifying` state and blocks until an inspector calls `task_verify` with `verdict='passed'`. A force+forceReason audit bypass exists for emergencies.

```typescript
// Task creation with verification
task_create_batch({ tasks: [{ verificationRequired: true, ... }] })

// Inspector verification
task_verify({ taskId, verdict: 'passed', reason: 'tests + lint clean' })

// Force bypass (audited)
task_verify({ taskId, verdict: 'waived', force: true, forceReason: 'hotfix deploy' })
```

### Critic Agent (T2)

A dedicated binary reviewer agent. Produces structured `APPROVED`/`REJECTED` verdicts with feedback, scores, and action items. Routed via inspector for execution gate enforcement.

```typescript
// Critic review tool
critic_review({ diff, verdict: 'APPROVED', critical: [], optimizations: [], scores: { security: 9, performance: 8, idiomaticity: 9 } })
```

### Brainstorm Workflow (T3)

Phase 0 (mandatory before `plan_create`): foreman clarifies the problem, runs `grill-me`, optionally dispatches scout/sage/scribe, then persists a design doc via `design_create`.

Design docs live in `.ndomo/designs/YYYY-MM-DD-{slug}-design.md` and include:
- Problem definition
- Options evaluated
- Decision taken + rationale
- Trade-offs accepted
- Scope and exclusions

```typescript
design_create({ slug: 'feat-x', title: 'Feature X design', problem: '...', goals: [...], constraints: [...], options: [...], decision: '...', tradeoffs: '...' })
```

### Continuity Ledger (T4)

Cross-session context persistence. Ledgers are written to `.ndomo/ledgers/{sessionId}.md` on every `session_checkpoint`. DB remains source of truth; ledger writes are best-effort.

```typescript
// Tools
ledger_create({ sessionId, content: '...' })
ledger_get({ sessionId })
ledger_update({ sessionId, patch: { keyDecisions: [...] } })

// Auto-written on session_checkpoint (best-effort, non-blocking)
```

### Circuit Breaker (T5)

Detects stuck sessions via tool call counting. Thresholds:
- **Total calls:** 4000 per session (configurable via `circuitBreaker.threshold`)
- **Identical consecutive:** 20 calls with same tool + args

On trip: warning emitted, target task marked `failed` with error `"Circuit breaker: potential loop detected"`. `task_update_status` calls are exempt to allow recovery.

```json
// config/ndomo.config.json
{
  "circuitBreaker": { "threshold": 4000 }
}
```

## Configuration

Config file: `~/.config/opencode/ndomo.json`

```json
{
  "preset": "default",
  "caveman": { "intensity": "full", "autoClarity": true },
  "mem": {
    "storagePath": "~/.ndomo/mem",
    "defaultScope": "project",
    "autoCaptureEnabled": true,
    "cavemanCompress": true
  },
  "circuitBreaker": { "threshold": 4000 }
}
```

See [docs/configuration.md](docs/configuration.md) for full reference. Agent presets support an optional `reasoning_effort` field (`low`/`medium`/`high`/`xhigh`) for reasoning-capable models.

**Circuit breaker config:** `circuitBreaker.threshold` (default: 4000) sets the max tool calls per session before the breaker trips.

## Skills

ndomo bundles 7 skills under `skills/`:

| Skill | Description |
|---|---|
| `caveman` | Ultra-compressed communication mode (~75% token reduction) |
| `cavecrew` | Caveman-style subagent presets (investigator, builder, reviewer) |
| `deepwork` | Structured heavy coding with plan files and review gates |
| `reflect` | Workflow friction analysis and reusable pattern extraction |
| `worktrees` | Git worktree management for isolated coding lanes |
| `dcp-integration` | Dynamic Context Pruning integration guide |
| `mem-recall` | opencode-mem tool usage and memory retrieval patterns |

## Integrations

- **opencode-mem** (required) — persistent memory with SQLite + USearch vector DB. Web UI at `:4747`. All agents compress memories before storage using caveman regex compression (0 LLM tokens).
- **DCP** (optional) — `@tarquinen/opencode-dcp` for dynamic context pruning. AGPL-3.0. Installed with `--with-dcp` flag.

See [docs/integrations.md](docs/integrations.md) for details.

## Web UI

The HTTP server ships with a Vue 3 SPA for browsing **and editing** plans and tasks in the browser. Single-port topology — the same Elysia process serves both the API (`/api/*`) and the SPA (everything else, with hash-mode fallback). Web UI uses **Bulma 1.0** (no jQuery, CSS-only, ~250KB minified) plus custom daisyUI components for write forms. Status palette exposed as CSS custom properties in `web/src/styles/main.css`.

Write UI features (since 0.3.0): create / edit / approve / complete / fail / archive plans; create / update / reassign / delete tasks. All writes go through `/api/*` write endpoints and surface `isLoading`/`error` refs to the components.

See [docs/web-ui.md](docs/web-ui.md) for architecture, build pipeline, and extension guide.

Quick start:

```bash
bun run web:build                                # build SPA -> src/http/web/
NDOMO_HTTP_ENABLED=true OPENCODE_SERVER_PASSWORD=secret bun run src/cli/serve.ts
# Open http://localhost:4097/
```

Vite dev mode (HMR):

```bash
# Terminal 1: server
NDOMO_HTTP_ENABLED=true OPENCODE_SERVER_PASSWORD=secret bun run src/cli/serve.ts
# Terminal 2: SPA dev
bun run web:dev
# Open http://localhost:5173/
```

## Optional HTTP server

Expose ndomo's SQLite state and OpenCode SDK event stream over HTTP+SSE via an embedded Elysia server. Phase 1 ships read-only REST endpoints (`/api/plans`, `/api/tasks`, `/api/sessions`) and a live SSE relay (`/api/events`).

**Recommended: use the installer flag to enable HTTP:**

```bash
bunx ndomo install --enable-http
```

Or set env vars manually and start the server:

```bash
export NDOMO_HTTP_ENABLED=true
export OPENCODE_SERVER_PASSWORD='pick-a-strong-passphrase'
bun run src/cli/serve.ts                       # binds 4097 by default
```

- **Default:** disabled (`NDOMO_HTTP_ENABLED=false`).
- **Auth:** HTTP Basic via `OPENCODE_SERVER_PASSWORD` (timing-safe compare). `503 auth_not_configured` if password unset when required.
- **Endpoints:** `GET /health` (public) + `/api/{plans,tasks,sessions,events}` (auth). See [docs/http-server.md](docs/http-server.md) for full API reference, CLI flags, CORS, security headers, and troubleshooting.

## Token Savings

The Caveman output protocol reduces token usage by ~60-75% vs standard prose by stripping articles, filler words, conjunctions, and pleasantries while preserving all technical content. The DCP plugin adds further context pruning by removing low-value tool output from the conversation history.

## License

MIT

## Links

- Repository: [https://github.com/nicosup98/ndomo-v2](https://github.com/nicosup98/ndomo-v2)
- OpenCode: [https://github.com/opencode-ai](https://github.com/opencode-ai)
- opencode-mem: [https://github.com/opencode-ai/opencode-mem](https://github.com/opencode-ai/opencode-mem)
