# ndomo

OpenCode multi-agent plugin. Taller de artesanos: 23 agents — 4 primary (Foreman/Craftsman/Warden/Ranger) + 19 specialists. Caveman-native. Embedded memory (bun:sqlite + FlexSearch). Obsidian brain layer. DCP peer optional.

## What is ndomo

ndomo is a multi-agent orchestration plugin for [OpenCode](https://github.com/opencode-ai). It routes development tasks to 23 agents: 4 primaries (Foreman — planning, Craftsman — implementation, Warden — operations, Ranger — sensing and analysis) and 19 specialists (scout, scribe, painter, smith, go-smith, js-smith, python-smith, vue-smith, zig-smith, rust-smith, sage, guild, inspector, critic, chronicler, ci-smith, deploy-smith, release-smith, ops-scout). All agents use the Caveman output protocol for token-efficient communication. Memory persistence across sessions is handled by ndomo's embedded memory store (bun:sqlite + FlexSearch, one SQLite DB per project). Plans, tasks and sessions persist in a project-local state DB (SQLite + FTS5), and the Obsidian brain layer projects plans, tasks, designs and memories one-way to an external vault. The optional DCP plugin provides additional context pruning for long sessions.

**Quality features (since 0.4.0):** execution gates enforcement, binary critic review, brainstorm workflow with design docs, cross-session continuity ledgers, and circuit breaker loop detection.

## Agents

| Agent | Role | Model (default preset) | Type |
|---|---|---|---|
| **foreman** | Master orchestrator and scheduler | streamlake/kat-coder-pro-v2.5 | primary |
| **craftsman** | Disciplined implementer — ad-hoc or plan-driven bugs, features, scoped refactors | opencode-go/gpt-5.6-luna | primary |
| **warden** | Ops custodian — CI/CD, deploy, releases, monitoring | opencode-go/gpt-5.6-luna | primary |
| **ranger** | Analyst / cartographer / onboarding — senses and persists findings to `analyses`, no plans | minimax/MiniMax-M3 | primary |
| **scout** | Codebase reconnaissance | opencode-go/mimo-v2.6-flash | subagent |
| **scribe** | External knowledge retrieval | opencode-go/mimo-v2.6-flash | subagent |
| **painter** | UI/UX design and visual composition | opencode-go/qwen3.7-plus | subagent |
| **smith** | Fast generic implementation | opencode-go/mimo-v2.6-flash | subagent |
| **go-smith** | Go implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **js-smith** | JS/TS implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **python-smith** | Python implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **vue-smith** | Vue 3 / Pinia implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **zig-smith** | Zig 0.16 implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **rust-smith** | Rust implementation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **sage** | Architecture advisor and debugger | opencode-go/kimi-k2.7-code | subagent |
| **guild** | Multi-LLM consensus and debate | minimax/MiniMax-M3 | subagent |
| **inspector** | Code quality and security auditor | opencode-go/kimi-k2.7-code | subagent |
| **critic** | Binary diff reviewer — APPROVED/REJECTED | minimax/MiniMax-M3 | subagent |
| **chronicler** | Technical documentation writer | opencode-go/deepseek-v4-flash | subagent |
| **ci-smith** | CI/CD pipeline specialist | opencode-go/mimo-v2.6-flash | subagent |
| **deploy-smith** | Deployment automation specialist | opencode-go/mimo-v2.6-flash | subagent |
| **release-smith** | Release management specialist | opencode-go/mimo-v2.6-flash | subagent |
| **ops-scout** | Infrastructure recon specialist (read-only) | opencode-go/deepseek-v4-flash | subagent |

**Groups:** Primaries (foreman, craftsman, warden, ranger), Explorers (scout, scribe), Builders (painter, smith, go-smith, js-smith, python-smith, vue-smith, zig-smith, rust-smith), Advisors (sage, guild), Quality (inspector, critic, chronicler), Operations (ci-smith, deploy-smith, release-smith, ops-scout).

## Quick Start

```bash
# Quick install (interactive)
bunx ndomo install

# Non-interactive with preset
bunx ndomo install --preset=budget

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
# Interactive install
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

> **Migration note:** `scripts/install.sh` remains in the published tarball as a **compat shim for users coming from `curl -fsSL ... | bash`** (the pre-0.2.0 install path). It is deprecated — new installs should use `bunx ndomo install`. The shim is not removed to avoid breaking legacy one-liners, but no new features will be added there.

**Flags:**

| Flag | Description |
|---|---|
| `--provider=ID` | Override the provider prefix for all agents. The model ID is taken from the active preset; only the `provider/` segment of the `model:` field is swapped. |
| `--no-provider-prompt` | Skip the interactive provider prompt. The preset is still applied; no provider prefix override is performed. |
| `--preset=NAME` | Select preset from `config/ndomo.config.json::presets[NAME]`. (default: `default`, options: `default`, `budget`) |
| `--with-dcp` | Install and configure the DCP plugin. |
| `--dry-run` | Print planned changes without writing files. |
| `--skip-deps` | Skip the `bun install` dependency step. |

**Uninstall:** `bunx ndomo install --uninstall` or `./scripts/uninstall.sh [--keep-data]`

## Plans & Tasks DB

ndomo persists plans, tasks, sessions, analyses and ops records (incidents, deployments, releases, rollbacks) in a project-local SQLite database
(`<project>/.ndomo/state.db`) with FTS5 search, audit trail, and auto-archive
to markdown on completion. 65 tools are exposed via OpenCode, grouped by domain:

| Domain | Tools |
|---|---|
| Plans | `plan_create`, `plan_get`, `plan_list`, `plan_search`, `plan_approve`, `plan_delete`, `plan_update_status`, `plan_progress`, `plan_files_write` |
| Tasks | `task_create_batch`, `task_list`, `task_update_status`, `task_verify`, `task_search`, `task_next_for_agent`, `task_peek_for_agent`, `task_dependency_resolver`, `task_add_artifact`, `task_review`, `task_escalate` |
| Sessions & ledgers | `session_start`, `session_checkpoint`, `session_end`, `ledger_create`, `ledger_get`, `ledger_update` |
| Routing & classification | `route`, `can_parallel`, `classify_intent`, `classify_tests`, `code_traffic_light`, `validate_task_dependencies` |
| Dispatch & background | `dispatch`, `active_tasks`, `background_task_status`, `background_task_cancel` |
| Worktrees | `worktree_create`, `worktree_list`, `worktree_remove`, `worktree_verify` |
| Memory | `mem_add`, `mem_search`, `mem_list`, `mem_forget`, `mem_stats`, `memory_compress` |
| Analyses | `analysis_create`, `analysis_get`, `analysis_list`, `analysis_search`, `analysis_update`, `analysis_archive`, `analysis_link_plan` |
| Obsidian | `obsidian_export`, `obsidian_read_note` |
| Ops | `incident_create`, `rollback_record` |
| Design & review | `design_create`, `critic_review` |
| Specs | `spec_create`, `spec_get`, `spec_lint` |
| Utility | `status`, `ndomo_write_unlock`, `stats` |

The foreman uses these to track work across agent dispatches; ranger writes `analyses` rows (linkable to plans via `analysis_link_plan`). See
[docs/database.md](docs/database.md) for schema, tools, lifecycle, and
auto-archive behavior.

CLI write surface (since 0.3.0):
- `ndomo plan create|list|show|update|approve|complete|delete`
- `ndomo task create|list|show|update|reassign|complete|fail`

CLI report surface:
- `ndomo stats [--since 7d|30d|all] [--agent <name>] [--json]` — Agent scorecard (success rate, durations, escalations)
- `ndomo audit [--json] [--update-manifest]` — Self-audit report (drift, permissions, counts, config, sha256 manifest) with score 1-100; exit 1 on any ERROR

See [docs/features/harness-intelligence.md](docs/features/harness-intelligence.md) for history-aware routing, the agent scorecard, and the self-audit.

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

### Spec-Driven Gates (T0/T1)

Spec-driven development is opt-in per plan (see [docs/workflows.md](docs/workflows.md)):

| Gate | Scope | Rule |
|---|---|---|
| T0 | plan with `metadata.specId` | cannot reach `approved` while `spec_lint` reports any `error` finding; the block message names the offending path/rule; a deleted spec file blocks approval naming the missing path |
| T1 (extended) | task with non-empty `metadata.reqIds` | `task_verify({verdict:"passed"})` additionally requires `result.redProof` (failing-test output captured before implementation) + ≥1 `testRef` tagged `REQ-xxx`; the existing inspector-only rule still applies |

Plans/tasks without those metadata keys behave exactly as before (REQ-006 — no migration;
the metadata reuses the existing JSON columns).

```typescript
// Spec tools (opt-in SDD)
spec_create({ slug: 'sdd-core' })          // → { path, id, created }
spec_lint({ id: 'SPEC-001' })              // → { ok, findings: [{ rule, severity, line, message }], stats }

// Task verification with red-proof (extended T1)
task_verify({ taskId, verdict: 'passed', result: { redProof: 'bun test ... → 1 failed', testRefs: ['REQ-001-AC-1'] } })
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

ndomo bundles 26 skills under `skills/`, grouped by family:

**Caveman protocol**
- `caveman` — ultra-compressed communication mode (~75% token reduction)
- `cavecrew` — caveman-style subagent delegation (investigator, builder, reviewer)
- `caveman-review` — ultra-compressed code review comments (location, problem, fix)

**Workflow & quality**
- `ndomo` — operating guide for the ndomo ecosystem (plans, tasks, sessions, memory, gates)
- `grill-me` — relentless interview to sharpen a plan or design
- `find-skills` — discover and install additional agent skills
- `frontend-design` — distinctive, non-templated UI design guidance
- `security-review` — security checklist for auth, user input, secrets, payments
- `api-security-best-practices` — secure API design patterns (authN/Z, validation, rate limiting)

**Bash**
- `bash-scripting` — production-ready shell scripts with defensive patterns

**Bun / JS / TS**
- `bun` — build, run, test and bundle JS/TS with Bun
- `modern-javascript-patterns` — ES6+ idioms and functional patterns
- `javascript-testing-patterns` — Jest, Vitest and Testing Library strategies

**Vue**
- `vue-best-practices` — Composition API, `<script setup>` and TypeScript
- `vue-pinia-best-practices` — Pinia stores and reactivity patterns

**Go**
- `golang-patterns` — idiomatic Go patterns and conventions
- `golang-security` — injection, crypto, filesystem and network safety
- `golang-testing` — table-driven tests, subtests, benchmarks, fuzzing

**Python**
- `python-anti-patterns` — checklist of common anti-patterns to avoid
- `python-design-patterns` — KISS, separation of concerns, composition over inheritance
- `python-error-handling` — validation, exception hierarchies, partial failures
- `python-testing-patterns` — pytest fixtures, mocking, TDD

**Rust**
- `rust-patterns` — ownership, error handling, traits, concurrency
- `rust-testing` — unit, integration, async, property-based tests, coverage

**Zig**
- `zig-0.16` — Zig 0.16.0 API guidance and porting notes

## Integrations

- **Embedded memory** (built-in) — persistent memory with bun:sqlite + FlexSearch. One SQLite DB per project at `~/.ndomo/mem/projects/<projectTag>.db` (WAL). Tools: `mem_add`, `mem_search`, `mem_list`, `mem_forget`, `mem_stats`, and `memory_compress` (regex caveman compression, 0 LLM tokens). Legacy memory shards can be migrated with `bun scripts/migrate-memory.ts`.
- **DCP** (optional) — `@tarquinen/opencode-dcp` for dynamic context pruning. AGPL-3.0. Installed with `--with-dcp` flag.
- **Obsidian Brain Layer** (built-in) — deterministic, one-way projection (repo → vault) of plans, tasks, designs and memories to an external Obsidian vault. Tools: `obsidian_export` (idempotent, SHA-256 skip) and `obsidian_read_note`. Requires the `obsidian` block in `ndomo.json`; no reverse sync, watchers or CLI. See [docs/obsidian.md](docs/obsidian.md).

See [docs/integrations.md](docs/integrations.md) for details.

## Token Savings

The Caveman output protocol reduces token usage by ~60-75% vs standard prose by stripping articles, filler words, conjunctions, and pleasantries while preserving all technical content. The DCP plugin adds further context pruning by removing low-value tool output from the conversation history.

## License

MIT

## Links

- Repository: [https://github.com/nicosup98/ndomo-v2](https://github.com/nicosup98/ndomo-v2)
- OpenCode: [https://github.com/opencode-ai](https://github.com/opencode-ai)
