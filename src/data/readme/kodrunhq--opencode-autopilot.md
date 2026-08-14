<p align="center">
  <img src="https://img.shields.io/npm/v/@kodrunhq/opencode-autopilot?color=blue&label=npm" alt="npm version" />
  <img src="https://img.shields.io/github/actions/workflow/status/kodrunhq/opencode-autopilot/ci.yml?branch=main&label=CI" alt="CI" />
  <img src="https://img.shields.io/github/license/kodrunhq/opencode-autopilot" alt="license" />
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun&logoColor=black" alt="Bun" />
</p>

<p align="center">
  <img src="assets/logo.svg" alt="opencode-autopilot logo" width="120" height="120" />
</p>

<h1 align="center">opencode-autopilot</h1>

<p align="center">
  <strong>Autonomous AI coding pipeline for OpenCode.</strong><br/>
  Idea to shipped code &bull; 13-agent code review &bull; Adversarial model diversity &bull; Background task management &bull; Session recovery
</p>

---

A plugin for the [OpenCode](https://github.com/opencode-ai/opencode) AI coding CLI that turns it into a fully autonomous software development system. Give it an idea — it researches, designs architecture, plans tasks, implements code, runs multi-agent code review, writes documentation, and extracts lessons for next time.

The core insight: **adversarial model diversity**. Agents that review each other's work use different model families. Your architect designs in Claude, your critic challenges in GPT, your red team attacks from Gemini — three different reasoning patterns catching three different classes of bugs.

## Quick Start

### Option A: AI-guided setup (recommended)

Paste this into your AI session:

```
Install and configure opencode-autopilot by following the instructions here:
https://raw.githubusercontent.com/kodrunhq/opencode-autopilot/main/docs/guide/installation.md
```

The AI walks you through installation, model assignment for each agent group, and verification.

### Option B: CLI installer

```bash
bunx @kodrunhq/opencode-autopilot install
```

This registers the plugin in `.opencode.json` and creates a starter config. Then run `bunx @kodrunhq/opencode-autopilot configure` to set up your model assignments.

### Option C: Manual setup

This path requires Bun on `PATH`. The published CLI entrypoints use a Bun shebang and the plugin uses Bun-specific APIs.

**Install:**

```bash
npm install -g @kodrunhq/opencode-autopilot
```

**Add to your OpenCode config** (`.opencode.json`):

```json
{
  "plugin": ["@kodrunhq/opencode-autopilot"]
}
```

Launch OpenCode. The plugin auto-installs agents, skills, and commands on first load and shows a welcome toast.

If you cannot or do not want to install Bun globally, use the GitHub Release local bundle path below instead of the npm global CLI path.

### Option D: GitHub Release (corporate)

For environments that cannot access npm registries (e.g. corporate firewalls). Requires GitHub access.

**Automated:**

```bash
curl -fsSL https://github.com/kodrunhq/opencode-autopilot/releases/latest/download/install-local.sh | bash
```

Or pin a specific version:

```bash
curl -fsSL https://github.com/kodrunhq/opencode-autopilot/releases/download/v1.20.0/install-local.sh | bash -s -- --version=1.20.0
```

**Manual:**

1. Download the latest `opencode-autopilot-local-vX.Y.Z.tar.gz` and its `.sha256` file from [GitHub Releases](https://github.com/kodrunhq/opencode-autopilot/releases)
2. Verify the checksum:
   ```bash
   sha256sum -c opencode-autopilot-local-v*.tar.gz.sha256
   ```
3. Extract and install:
   ```bash
   mkdir -p ~/.config/opencode/plugins
   STAGING="$(mktemp -d ~/.config/opencode/plugins/.oca-staging-XXXXXX)"
   tar -xzf opencode-autopilot-local-v*.tar.gz -C "$STAGING"
   # Verify the bundle looks correct
   test -f "$STAGING/src/index.ts" && test -d "$STAGING/assets" && test -d "$STAGING/node_modules"
   # Rollback-safe swap (backup old, move staging in, remove backup)
   DEST=~/.config/opencode/plugins/opencode-autopilot
   BACKUP=""
   if [ -d "$DEST" ]; then
     BACKUP="$(mktemp -d ~/.config/opencode/plugins/.oca-backup-XXXXXX)"
     mv "$DEST" "$BACKUP/old" || { rm -rf "$STAGING" "$BACKUP"; exit 1; }
   fi
   mv "$STAGING" "$DEST" || {
     [ -n "$BACKUP" ] && mv "$BACKUP/old" "$DEST" 2>/dev/null
     rm -rf "$STAGING" "$BACKUP"
     exit 1
   }
   [ -n "$BACKUP" ] && rm -rf "$BACKUP"
   ```
4. Create a shim for auto-discovery:
   ```bash
   echo 'export { default } from "./opencode-autopilot/src/index";' > ~/.config/opencode/plugins/opencode-autopilot.ts
   ```

Alternatively, add to your `.opencode.json` with an absolute path:

```json
{
  "plugin": ["file:///home/YOU/.config/opencode/plugins/opencode-autopilot/src/index.ts"]
}
```

Replace `/home/YOU` with your actual home directory.

To verify a local installation, open OpenCode and run `/oc-doctor` in the chat.

### Agent visibility defaults

Primary Tab-cycle agents provided by this plugin are:

- `autopilot`
- `coder`
- `debugger`
- `planner`
- `researcher`
- `reviewer`

OpenCode native `plan` and `build` are suppressed by the plugin config hook to avoid
duplicate planning/building entries in the primary Tab menu.

### Verify your setup

```bash
bunx @kodrunhq/opencode-autopilot doctor
```

This checks config health, model assignments, and adversarial diversity between agent groups.

## Documentation

For detailed guides on every subsystem, see the **[full documentation](docs/README.md)**.

| Topic | Description |
|-------|-------------|
| [Installation Guide](docs/guide/installation.md) | Step-by-step setup with AI-guided or manual options |
| [Architecture](docs/architecture.md) | System architecture and internal module map |
| [The Pipeline](docs/pipeline.md) | 8-phase autonomous development pipeline |
| [Agents](docs/agents.md) | Complete catalog of all agents and model groups |
| [Code Review](docs/code-review.md) | 13-agent adversarial review pipeline |
| [Configuration](docs/configuration.md) | v7 configuration schema reference |
| [Tools Reference](docs/tools-reference.md) | Reference hub for the 39 registered `oc_*` tools |
| [CLI Reference](docs/cli-reference.md) | `install`, `configure`, `doctor`, and `inspect` commands |
| [Memory System](docs/memory-system.md) | Dual-scope project and user preference memory |
| [Model Fallback](docs/model-fallback.md) | Automatic fallback chains and session recovery |
| [Background & Routing](docs/background-and-routing.md) | Background tasks, category routing, and autonomy loop |
| [Skills & Commands](docs/skills-and-commands.md) | Adaptive skills and slash commands |
| [Observability](docs/observability.md) | Event tracking, structured logging, and diagnostics |

## Model Groups

Agents are organized into 8 groups by the type of thinking they do. Each group gets a primary model and fallback chain. Run `bunx @kodrunhq/opencode-autopilot configure` to assign models interactively. For advanced use, the `oc_configure` tool is also available in-session.

| Group | Agents | What they do | Model recommendation |
|-------|--------|-------------|---------------------|
| **Architects** | oc-architect, oc-planner, autopilot | System design, planning, orchestration | Most powerful available |
| **Challengers** | oc-critic, oc-challenger | Challenge architecture, find design flaws | Strong model, **different family from Architects** |
| **Builders** | oc-implementer | Write production code | Strong coding model |
| **Reviewers** | oc-reviewer + 11 review agents | Find bugs, security issues, logic errors | Strong model, **different family from Builders** |
| **Red Team** | red-team, product-thinker | Final adversarial pass, hunt exploits | **Different family from both Builders and Reviewers** |
| **Researchers** | oc-researcher, researcher | Domain research, feasibility analysis | Good comprehension, any family |
| **Communicators** | oc-shipper, documenter, oc-retrospector | Docs, changelogs, lesson extraction | Mid-tier model |
| **Utilities** | oc-explorer, metaprompter, pr-reviewer | Fast lookups, prompt tuning, PR scanning | Fastest/cheapest available |

### Adversarial diversity

The installer warns when adversarial pairs share a model family:

| Pair | Relationship | Why diversity matters |
|------|-------------|---------------------|
| Architects / Challengers | Challengers critique architect output | Same model = confirmation bias |
| Builders / Reviewers | Reviewers find bugs in builder code | Same model = shared blind spots |
| Red Team / Builders+Reviewers | Final adversarial perspective | Most effective as a third family |

### Example config

```json
{
  "version": 7,
  "configured": true,
  "groups": {
    "architects":    { "primary": "anthropic/claude-opus-4-6",   "fallbacks": ["openai/gpt-5.4"] },
    "challengers":   { "primary": "openai/gpt-5.4",             "fallbacks": ["google/gemini-3.1-pro"] },
    "builders":      { "primary": "anthropic/claude-opus-4-6",   "fallbacks": ["anthropic/claude-sonnet-4-6"] },
    "reviewers":     { "primary": "openai/gpt-5.4",             "fallbacks": ["google/gemini-3.1-pro"] },
    "red-team":      { "primary": "google/gemini-3.1-pro",      "fallbacks": ["openai/gpt-5.4"] },
    "researchers":   { "primary": "anthropic/claude-sonnet-4-6", "fallbacks": ["openai/gpt-5.4"] },
    "communicators": { "primary": "anthropic/claude-sonnet-4-6", "fallbacks": ["anthropic/claude-haiku-4-5"] },
    "utilities":     { "primary": "anthropic/claude-haiku-4-5",  "fallbacks": ["google/gemini-3-flash"] }
  },
  "overrides": {},
  "background": {
	"enabled": false,
	"maxConcurrent": 5,
	"persistence": true
  },
  "routing": {
	"enabled": false,
	"categories": {}
  },
  "recovery": {
    "enabled": true,
    "maxRetries": 3
  },
  "mcp": {
	"enabled": false,
	"skills": {}
  }
}
```

Per-agent overrides are supported for fine-grained control:

```json
{
  "overrides": {
    "oc-planner": { "primary": "openai/gpt-5.4", "fallbacks": ["anthropic/claude-opus-4-6"] }
  }
}
```

## The Pipeline

opencode-autopilot runs an 8-phase autonomous pipeline, each driven by a specialized agent:

```
IDEA --> RECON --> CHALLENGE --> ARCHITECT --> EXPLORE --> PLAN --> BUILD --> SHIP --> RETROSPECTIVE
           |          |              |                      |         |        |            |
       Research   Enhance      Multi-proposal           Task plan   Code +   Docs &     Extract
       & assess   the idea     design arena             with waves  review   changelog  lessons
```

| Phase | Agent | What happens |
|-------|-------|-------------|
| **RECON** | oc-researcher | Domain research, feasibility assessment, technology landscape |
| **CHALLENGE** | oc-challenger | Proposes ambitious enhancements to the original idea |
| **ARCHITECT** | oc-architect x N | Multiple design proposals debated by oc-critic; depth scales with confidence |
| **EXPLORE** | local analysis | Scans the repository structure to surface risk areas, tech debt indicators, and implementation patterns |
| **PLAN** | oc-planner | Decomposes architecture into wave-scheduled tasks (max 300-line diffs each) |
| **BUILD** | oc-implementer | Implements code with inline review; 3-strike limit on CRITICAL findings |
| **SHIP** | oc-shipper | Generates walkthrough, architectural decisions, and changelog |
| **RETROSPECTIVE** | oc-retrospector | Extracts lessons, injected into future runs |

### Confidence-driven architecture

The ARCHITECT phase uses a **multi-proposal arena**. Based on confidence signals from RECON:

- **High confidence** -> 1 architecture proposal
- **Medium confidence** -> 2 competing proposals (simplicity vs. extensibility)
- **Low confidence** -> 3 competing proposals + critic evaluation

### Strike-limited builds

BUILD tracks implementation quality with a strike system:

- Each CRITICAL review finding = 1 strike
- 3 strikes -> pipeline stops (prevents infinite retry loops)
- Non-critical findings generate fix instructions without strikes
- Waves execute in order; a wave advances only after passing review

## Code Review

The `oc_review` tool provides a 4-stage multi-agent review pipeline:

**Stage 1 -- Specialist dispatch:** Auto-detects your stack from changed files and dispatches relevant agents in parallel.

**Stage 2 -- Cross-verification:** Each agent reviews other agents' findings to filter noise and catch missed issues.

**Stage 3 -- Adversarial review:** Red-team agent hunts for exploits; product-thinker checks for UX gaps.

**Stage 4 -- Report or fix cycle:** CRITICAL findings with actionable fixes trigger an automatic fix cycle; everything else lands in the final report.

### 13 Review Agents

| Category | Agents | When selected |
|----------|--------|--------------|
| **Universal** (always run) | logic-auditor, security-auditor, code-quality-auditor, test-interrogator, code-hygiene-auditor, contract-verifier | Every review |
| **Stack-aware** (auto-selected) | architecture-verifier, database-auditor, correctness-auditor, frontend-auditor, language-idioms-auditor | Based on changed file types |
| **Sequenced** (run last) | red-team, product-thinker | After all findings collected |

Review memory persists per project -- false positives are tracked and suppressed in future reviews (auto-pruned after 30 days).

## Model Fallback

When a model is rate-limited, unavailable, or returns an error, the fallback system automatically:

1. Classifies the error (rate limit, auth, quota, service unavailable, etc.)
2. Selects the next model from the group's fallback chain
3. Replays the conversation on the new model
4. Shows a toast notification (configurable)
5. Recovers to the primary model after a cooldown period

## Bundled Assets

The plugin ships with production-ready assets that auto-install to `~/.config/opencode/`:

| Type | Assets | Purpose |
|------|--------|---------|
| **Agents** | researcher, metaprompter, documenter, pr-reviewer, autopilot + 10 pipeline agents | Research, docs, PR review, full autonomous pipeline |
| **Commands** | `/oc-brainstorm`, `/oc-tdd`, `/oc-quick`, `/oc-write-plan`, `/oc-stocktake`, `/oc-review-pr`, `/oc-update-docs`, `/oc-new-agent`, `/oc-new-skill`, `/oc-new-command` | Brainstorming, TDD, quick tasks, planning, auditing, PR reviews, docs, extend plugin |
| **Skills** | coding-standards | Universal best practices (naming, error handling, immutability, validation) |

### In-session creation

Extend the plugin without leaving OpenCode:

- **`/oc-new-agent`** -- Create a custom agent with YAML frontmatter + system prompt
- **`/oc-new-skill`** -- Create a skill directory with domain knowledge
- **`/oc-new-command`** -- Create a slash command (validates against built-in names)

All created assets write to `~/.config/opencode/` and are available immediately after restarting the OpenCode session.

## Configuration

Config lives at `~/.config/opencode/opencode-autopilot.json`. Run `bunx @kodrunhq/opencode-autopilot configure` for interactive setup, or edit manually.

| Setting | Options | Default |
|---------|---------|---------|
| `orchestrator.autonomy` | `full`, `supervised`, `manual` | `full` |
| `orchestrator.strictness` | `strict`, `normal`, `lenient` | `normal` |
| `orchestrator.phases.*` | `true` / `false` | all `true` |
| `confidence.thresholds.proceed` | `HIGH`, `MEDIUM`, `LOW` | `MEDIUM` |
| `confidence.thresholds.abort` | `HIGH`, `MEDIUM`, `LOW` | `LOW` |
| `fallback.enabled` | `true` / `false` | `true` |
| `background.enabled` | `true` / `false` | `false` |
| `background.maxConcurrent` | `1`-`50` | `5` |
| `background.persistence` | `true` / `false` | `true` |
| `routing.enabled` | `true` / `false` | `false` |
| `routing.categories` | category override map | `{}` |
| `recovery.enabled` | `true` / `false` | `true` |
| `recovery.maxRetries` | `0`-`10` | `3` |
| `mcp.enabled` | `true` / `false` | `false` |
| `mcp.skills` | skill-to-MCP config map | `{}` |

Config auto-migrates across schema versions (v1 -> v2 -> v3 -> v4 -> v5 -> v6 -> v7).

## Tools

The plugin registers 39 tools, all prefixed with `oc_` to avoid conflicts with OpenCode built-ins:

| Tool | Purpose |
|------|---------|
| `oc_orchestrate` | Core pipeline state machine -- start a run or advance phases |
| `oc_review` | Multi-agent code review (4-stage pipeline) |
| `oc_configure` | Interactive model group assignment (start/assign/commit/doctor/reset) |
| `oc_state` | Query and patch pipeline state |
| `oc_phase` | Phase transitions and validation |
| `oc_confidence` | Confidence ledger management |
| `oc_plan` | Query task waves and status counts |
| `oc_forensics` | Diagnose pipeline failures (recoverable vs. terminal) |
| `oc_graph_index` | Index a local code graph for symbol and dependency lookup |
| `oc_graph_query` | Query the local code graph for definitions, imports, dependents, and outlines |
| `oc_create_agent` | Create custom agents in-session |
| `oc_create_skill` | Create custom skills in-session |
| `oc_create_command` | Create custom commands in-session |
| `oc_background` | Manage background tasks (spawn, monitor, cancel) |
| `oc_loop` | Start/stop autonomy loop with verification checkpoints |
| `oc_delegate` | Category-based task routing with skill injection |
| `oc_recover` | Session recovery with strategy selection |
| `oc_doctor` | Run plugin health diagnostics |
| `oc_quick` | Quick-mode pipeline bypass for trivial tasks |
| `oc_hashline_edit` | Hash-anchored line edits with FNV-1a verification |
| `oc_logs` | Query structured session logs |
| `oc_route` | Validate intent classification and return routing instructions |
| `oc_session_stats` | Session statistics and token usage |
| `oc_pipeline_report` | Generate pipeline execution report |
| `oc_summary` | Session summary generation |
| `oc_mock_fallback` | Fallback chain testing with mock providers |
| `oc_stocktake` | Audit installed assets (agents, skills, commands) |
| `oc_update_docs` | Detect docs affected by code changes |
| `oc_memory_status` | Memory system status and statistics |
| `oc_memory_preferences` | Manage user preference observations |
| `oc_memory_save` | Save durable project or user memories for later sessions |
| `oc_memory_search` | Search saved memories by text, kind, or topic |
| `oc_memory_forget` | Soft-delete obsolete or incorrect memories |
| `oc_lsp_goto_definition` | Jump to symbol definition via LSP |
| `oc_lsp_find_references` | Find all references to a symbol via LSP |
| `oc_lsp_symbols` | Document or workspace symbol search via LSP |
| `oc_lsp_diagnostics` | Get errors/warnings from language server |
| `oc_lsp_prepare_rename` | Check if a symbol can be renamed via LSP |
| `oc_lsp_rename` | Rename a symbol across the workspace via LSP |

## Architecture

```
src/
+-- index.ts                 Plugin entry -- registers tools, hooks, fallback handlers
+-- config.ts                Zod-validated config with v1->v7 migration chain
+-- installer.ts             Self-healing asset copier (COPYFILE_EXCL, overwrites installer-managed files only)
+-- registry/
|   +-- types.ts             GroupId, AgentEntry, GroupDefinition, DiversityRule, ...
|   +-- model-groups.ts      AGENT_REGISTRY, GROUP_DEFINITIONS, DIVERSITY_RULES
|   +-- resolver.ts          Model resolution: override > group > default
|   +-- diversity.ts         Adversarial diversity checker
|   +-- doctor.ts            Shared diagnosis logic (CLI + tool)
+-- tools/                   Tool definitions (thin wrappers calling *Core functions)
+-- templates/               Pure functions: input -> markdown string
+-- review/                  13-agent review engine, stack gate, memory, severity
+-- orchestrator/
|   +-- handlers/            Per-phase state machine handlers
|   +-- fallback/            Model fallback: classifier, manager, state, chain resolver
|   +-- artifacts.ts         Phase artifact path management
|   +-- lesson-memory.ts     Cross-run lesson persistence
|   +-- schemas.ts           Pipeline state Zod schemas
+-- background/              Background task management with slot-based concurrency
|   +-- database.ts          SQLite persistence for task state
|   +-- state-machine.ts     Task lifecycle (queued -> running -> completed/failed)
|   +-- slot-manager.ts      Concurrent slot allocation and limits
|   +-- executor.ts          Task execution with timeout handling
|   +-- manager.ts           High-level API combining all background components
+-- autonomy/                Autonomy loop with verification checkpoints
|   +-- state.ts             Loop state tracking (iterations, context accumulation)
|   +-- completion.ts        Completion detection via positive/negative signals
|   +-- verification.ts      Post-iteration verification (tests, lint, artifacts)
|   +-- controller.ts        Loop lifecycle management (start, iterate, stop)
+-- routing/                 Category-based task routing
|   +-- categories.ts        Category definitions with model and skill mappings
|   +-- classifier.ts        Intent classification from task descriptions
|   +-- engine.ts            Routing engine combining classification + delegation
+-- recovery/                Session recovery and failure resilience
|   +-- classifier.ts        Failure classification (transient, permanent, partial)
|   +-- strategies.ts        Recovery strategies (retry, fallback, checkpoint)
|   +-- orchestrator.ts      Strategy selection and execution
|   +-- persistence.ts       Checkpoint save/restore via SQLite
+-- context/                 Context window management and injection
|   +-- discovery.ts         Active context discovery from session state
|   +-- budget.ts            Token budget allocation across injection sources
|   +-- injector.ts          System prompt injection orchestrator
|   +-- compaction-handler.ts  Context compaction when approaching limits
+-- ux/                      User experience surfaces
|   +-- notifications.ts     Toast and inline notification system
|   +-- progress.ts          Progress tracking for multi-step operations
|   +-- task-status.ts       Task status formatting and display
|   +-- context-warnings.ts  Context usage warnings and suggestions
|   +-- error-hints.ts       Actionable error hints with fix suggestions
|   +-- session-summary.ts   End-of-session summary generation
+-- mcp/                     MCP (Model Context Protocol) skill integration
|   +-- types.ts             MCP server and tool type definitions
|   +-- manager.ts           MCP config inventory and state tracking (no process lifecycle yet)
|   +-- scope-filter.ts      Scope-based MCP server filtering
+-- kernel/                  Database primitives and concurrency
|   +-- transaction.ts       SQLite transactions with retry on SQLITE_BUSY
|   +-- retry.ts             Exponential backoff retry for busy errors
+-- logging/                 Structured logging with sinks and rotation
+-- memory/                  Smart dual-scope memory (project patterns + user preferences)
+-- observability/           Session observability and structured event logging
+-- skills/                  Adaptive skill loading and injection
+-- health/                  Plugin self-diagnostics
+-- utils/                   Validators, paths, fs-helpers, gitignore management

bin/
+-- cli.ts                   CLI: install + doctor subcommands
```

**Dependency flow** (strictly top-down, no cycles):
`index.ts` -> `tools/*` -> `registry/*` + `templates/*` + `utils/*` + `kernel/*` -> Node built-ins + `yaml`

**Key patterns:**
- **Declarative registry** -- adding an agent = one line in AGENT_REGISTRY, everything derives from it
- **Atomic writes** -- all file operations use tmp + rename with crypto-random suffixes
- **Immutable state** -- deep-frozen data, spread operators, readonly arrays
- **Bidirectional validation** -- Zod parse on read AND write
- **Self-healing assets** -- bundled files copy on load, overwrite installer-managed files, never overwrite user customizations

## Contributing

```bash
git clone https://github.com/kodrunhq/opencode-autopilot.git
cd opencode-autopilot
bun install
bun test && bun run lint
```

1790+ tests across 190 files. No build step -- Bun runs TypeScript natively.

## License

[MIT](LICENSE)
