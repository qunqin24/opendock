# Swarm DAO

> **Unified AI Agent Governance** — One DAO core, multiple host adapters.

Swarm DAO unifies the governance systems from [pi-swarm-dao](https://github.com/guyghost/pi-swarm-dao) and the legacy opencode-dao project into a single, extensible architecture.

## Quick Start

```bash
# Clone
git clone https://github.com/guyghost/swarm-dao.git
cd swarm-dao

# Install dependencies (runs the workspace setup and build via `prepare`)
bun install

# Re-run the setup any time: workspace links, Pi extension, optional SDK stubs
bun run setup-workspace

# Start Pi — the extension is auto-discovered
pi
```

Inside Pi:
```
> dao_setup          # Initialize with 8 default agents
> dao_propose        # Create a proposal
> dao_deliberate     # Run swarm deliberation
> dao_check          # Quality gates
> dao_ship           # Ship approved proposal (checks deps)
```

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│  Hosts                                                                │
│  ┌──────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ ┌────────┐ ┌──────────┐ │
│  │  Pi  │ │ OpenCode │ │ Copilot │ │Claude │ │ Codex  │ │ CLI/MCP… │ │
│  └──┬───┘ └────┬─────┘ └────┬────┘ └───┬───┘ └───┬────┘ └────┬─────┘ │
│     │          │            │          │         │           │       │
│  ┌──┴──────────┴────────────┴──────────┴─────────┴───────────┴────┐  │
│  │                     Host Adapter Interface                    │  │
│  │      spawnAgent · spawnAgents · log · exec · readFile · …     │  │
│  └──────────────────────────────┬─────────────────────────────────┘  │
│                                 │                                     │
│  ┌──────────────────────────────┴─────────────────────────────────┐  │
│  │                        Swarm DAO Core                          │  │
│  │  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌────────┐          │  │
│  │  │Governance│ │Intelligence│ │ Delivery │ │Control │          │  │
│  │  │  (L1)    │ │   (L2)     │ │  (L3)    │ │ (L4)   │          │  │
│  │  └──────────┘ └────────────┘ └──────────┘ └────────┘          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                 │                                     │
│  ┌──────────────────────────────┴─────────────────────────────────┐  │
│  │                Persistence (.dao/ local files)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

The 4 layers above are the **governance model** (what the DAO does). Internally,
`@guyghost/swarm-dao-core` is organized as a hexagonal functional core — pure
`domain`/`models` (XState workflows), `application` use cases, narrow `ports`,
instance-owned `adapters`, and `presenters` — with no ambient I/O in the
business logic. See [ADR-002](docs/ADR-002-hexagonal-core.md) and
[models/README.md](models/README.md) for that internal boundary.

Pi spawns sub-agents natively; OpenCode, Copilot, Claude Code, and Codex use
manual/MCP-based dispatch (see [Pi vs OpenCode Differences](docs/USAGE.md#pi-vs-opencode-differences)
for the pattern all non-native hosts share).

## Packages

| Package | Description |
|---------|-------------|
| `@guyghost/swarm-dao-core` | Pure business logic + shared `host-tools` handlers |
| `@guyghost/swarm-dao-mcp` | Swarm DAO as a stdio MCP server (24 tools) |
| `@guyghost/swarm-dao-copilot-adapter` | GitHub Copilot plugin (MCP + instructions) |
| `@guyghost/swarm-dao-claude-adapter` | Claude Code plugin (MCP + slash commands) |
| `@guyghost/swarm-dao-codex-adapter` | OpenAI Codex plugin (MCP + AGENTS.md) |
| `@guyghost/swarm-dao-pi-adapter` | Bridge to Pi coding agent |
| `@guyghost/swarm-dao-opencode-adapter` | Bridge to OpenCode |
| `@guyghost/swarm-dao-tmux-adapter` | tmux host — one watchable pane per agent (swarm-forge model) |
| `@guyghost/swarm-dao-herdr-adapter` | herdr host — each agent is a real coding agent in a herdr workspace |
| `@guyghost/swarm-dao-cli` | Standalone CLI (`swarm-dao`) |

## 4-Layer Governance

| Layer | Purpose | Key Concepts |
|-------|---------|--------------|
| **L1 Governance** | Decide what enters the roadmap | Proposals, voting, quorum, state machine, amendments |
| **L2 Intelligence** | Produce analysis and recommendations | 7 specialized agents, parallel deliberation, synthesis |
| **L3 Delivery** | Convert decisions into execution | Plans, tasks, execution, verification, artefacts |
| **L4 Control** | Reduce risk before publication | Quality gates, audit trail, checklists |

## The 8 Default Agents

| Agent | Weight | Role |
|-------|--------|------|
| Product Strategist | 3 | Vision, objectives, hypotheses |
| Research Agent | 2 | Market, competition, user signals |
| Solution Architect | 3 | Technical options, tradeoffs |
| Critic / Risk Agent | 3 | Risk scoring, objections, guardrails |
| Prioritization Agent | 2 | Impact/cost/risk scoring, roadmap fit |
| Spec Writer | 1 | PRD, user stories, acceptance criteria |
| Delivery Agent | 1 | Implementation plan, tasks, CI/CD |
| UX/UI Designer | 2 | UX/UI critique, design directions, accessibility |

## Proposal Lifecycle

```
open ──► deliberating ──► approved ──► controlled ──► executed
                       ╲              ╲              ╲
                     rejected       rejected        failed
```

## CLI Usage

```bash
# Install (Homebrew or npm)
brew install guyghost/tap/swarm-dao
npm install -g @guyghost/swarm-dao-cli

# Initialize DAO storage
swarm-dao init

# Setup with default agents
swarm-dao setup

# Create proposal
swarm-dao propose --title "Add dark mode" --type product-feature \
  --description "Implement dark theme for the app"

# List proposals
swarm-dao list
swarm-dao list --status open
swarm-dao list --type security-change

# Show proposal details
swarm-dao show 1

# Cast a vote
swarm-dao vote 1 --position for --reasoning "Low risk, high impact" --weight 3

# Ship (execute) a proposal
swarm-dao ship 1
swarm-dao ship 1 --cascade   # also ship unexecuted dependencies first
swarm-dao ship 1 --force     # skip dependency checks

# Configure GitHub integration (auth via the gh CLI; --issues tracks proposals as GitHub issues)
swarm-dao github-config --owner myorg --repo myrepo

# Create a branch for a proposal
swarm-dao github-branch 1

# Open a pull request for a proposal
swarm-dao github-pr 1 --head-branch dao/1-add-dark-mode

# View audit trail
swarm-dao audit
swarm-dao audit --proposal 1

# View DAO status
swarm-dao status

# View configuration
swarm-dao config

# Run an improvement loop series (any project; gates in a bounded container)
REF=$(echo -n "$(git rev-parse HEAD)" | shasum -a 256 | cut -d' ' -f1)
swarm-dao improve init --series-id s1 --scope ci-health --reference-hash "$REF"
swarm-dao improve once --series-id s1 --sandbox container --image node:22-bookworm
swarm-dao improve status --series-id s1
```

Full CLI reference — installation, configuration, every command and flag — in
[`packages/cli/README.md`](packages/cli/README.md).

## Pi Usage

The Pi extension is auto-discovered from `.pi/extensions/` or `~/.pi/agent/extensions/`.

```bash
# Initialize
> dao_setup

# Create proposal
> dao_propose title="Add dark mode" type="product-feature" \
    description="Implement dark theme"

# Deliberate (automatic swarm dispatch)
> dao_deliberate proposalId=1

# Check quality gates
> dao_check proposalId=1

# Ship (execute, with dependency check)
> dao_ship proposalId=1

# View audit
> dao_audit proposalId=1
```

## OpenCode Usage

```bash
# Initialize
> dao_setup

# Create proposal
> dao_propose title="Add dark mode" type="product-feature" \
    description="Implement dark theme"

# Get dispatch plan (manual sub-agent spawning)
> dao_deliberate proposalId=1

# Record outputs after collecting from sub-agents
> dao_record_outputs proposalId=1 outputs=[...]

# Control gates
> dao_control proposalId=1

# Execute
> dao_execute proposalId=1
```

## Copilot, Claude Code, and Codex Usage

These hosts don't load a native extension/plugin — they speak **MCP**. Each
has a dedicated adapter package that bundles the MCP server plus native
config and instructions:

| Host | Package | Bundles |
|------|---------|---------|
| GitHub Copilot | `@guyghost/swarm-dao-copilot-adapter` | `.mcp.json`, `copilot-instructions.md` |
| Claude Code | `@guyghost/swarm-dao-claude-adapter` | `.mcp.json`, `CLAUDE.md`, `/dao-*` slash commands |
| OpenAI Codex | `@guyghost/swarm-dao-codex-adapter` | `config.toml` snippet, `AGENTS.md` |
| Any other MCP host | `@guyghost/swarm-dao-mcp` | stdio MCP server only |

Install the adapter for your host (`npm install @guyghost/swarm-dao-<host>-adapter`)
and follow its README for the exact config file to copy. Deliberation over MCP
is always **manual**, the same pattern as OpenCode above: `dao_deliberate`
returns a dispatch plan, the host spawns the sub-agents, then
`dao_record_outputs` feeds the results back in.

## Configuration

Per-project config in `.dao/config.json`:

```json
{
  "mode": "suggest",
  "criticalPaths": [
    "src/auth/**",
    "src/payment/**",
    ".env*"
  ],
  "agentOverrides": {
    "researcher": { "enabled": false },
    "critic": { "weight": 5 }
  },
  "execution": {
    "isolation": "worktree",
    "worktreeRoot": ".dao/worktrees",
    "baseBranch": "main"
  }
}
```

`mode` declares intent (`opt-in` *(default)*, `suggest`, `enforce`) and
`criticalPaths` declares the paths that matter. `agentOverrides` filters
and overrides agents on every `dao_deliberate` call; `mode` and
`criticalPaths` are enforced through the **edit gate** — agents call
`dao_check_edit` with the files they are about to touch before editing:

- **opt-in**: everything is allowed; critical paths are flagged
  informationally.
- **suggest**: everything is allowed; uncovered critical paths produce a
  non-blocking nudge toward `dao_propose`.
- **enforce**: a critical path is only editable when an `approved`,
  `controlled`, or `executed` proposal declares it in `affectedPaths`;
  otherwise the gate blocks the edit and explains how to get approval.

Paths are lexically normalized before matching (absolute paths,
  backslashes, `./` prefixes, and `a/../b` segments are refused or
  resolved), so the gate cannot be evaded by spelling variants — an
  unmatchable path is refused in every mode. Requests over 200 paths are
  rejected outright.

`dao_check_edit` is exposed on every agent-facing host (MCP and the
Copilot/Claude/Codex adapters, Pi, OpenCode). It is a deterministic,
read-only decision — the gate never edits files and never transitions
proposal state.

### Ship audit challenge (AUDIT_REQUIRED)

Opt-in, per project:

```json
{ "ship": { "auditChallenge": true } }
```

The swarm-forge `AUDIT_REQUIRED` pattern adapted to shipping: the first
`dao_ship` / `swarm-dao ship` call for a proposal does **not** execute — it
returns `AUDIT_REQUIRED` and records the decision fingerprint (votes, gates,
scope). Only a second, **unchanged** call executes; any change re-issues the
challenge. `--force` / `force=true` is an explicit, audited human bypass.
Snapshots persist in `.dao/ship-audits/`. No AI role exists in the model —
confirmation is deterministic ([models/ship-audit.md](models/ship-audit.md)).

### Execution isolation (worktrees)

When `execution.isolation` is `"worktree"` (default `"none"`), executing or
shipping a proposal first carves an isolated git worktree — branch
`dao/<id>-<slug>` checked out under `execution.worktreeRoot` (default
`.dao/worktrees`, gitignored with the rest of `.dao/`). The pattern comes
from swarm-forge: concurrent executions never step on each other in the
shared checkout, work happens on a dedicated branch, and merging back stays
a deliberate action (via the existing GitHub PR flow or a plain `git merge`).

Preparation is idempotent (re-running `dao_execute` reattaches to the
existing branch), and a failed preparation leaves the proposal `controlled`
— no state transition happens without the workspace. The execution snapshot
and audit entry record the real branch. Available on every host surface:
`dao_execute` (Pi, OpenCode, MCP hosts) and `swarm-dao ship` (CLI).

## Sequential (Pipeline) Deliberation (advanced, opt-in)

By default the swarm deliberates in parallel — every agent analyzes the
proposal independently, which maximizes vote independence. Projects that
prefer deeper deliberation can opt into the swarm-forge-style pipeline:

```json
{
  "deliberation": {
    "strategy": "sequential",
    "charsPerAgent": 1500
  }
}
```

Agents run **in order, one at a time** (registry order: strategist →
researcher → architect → critic → prioritizer → spec-writer → delivery), and
each agent receives a `## Prior Analyses` section built from the agents
before it — **analyses only, never votes or reasoning** (`extractAnalysis`
strips everything from the `## Vote` heading on, and each excerpt is capped
at `charsPerAgent` characters). The deterministic tally is unchanged and
stays independent: this is orchestration, not authority — no proposal state,
transition, or AI boundary moves. Manual hosts (MCP, OpenCode) receive the
pipeline protocol in their dispatch plan and feed analyses forward the same
way before recording all outputs together.

## Delegated Facet Investigation (advanced, opt-in)

Any agent can declare `delegates` (facet + archetype) so it can hand off a
narrow sub-question to a child agent mid-deliberation. Disabled by default —
opt in per project:

```json
{
  "delegation": {
    "enabled": true,
    "maxDepth": 1,
    "maxChildrenPerParent": 3,
    "foldTimeoutMs": 30000
  }
}
```

- Children are spawned via the same `HostAdapter.spawnAgent`, one level deep
  (a child cannot itself delegate).
- The child's output is folded into the parent's content under a
  `## Delegated Facets` section — it never touches the parent's `## Vote`.
- Governed by two pure state machines (coordinator budget + per-request
  gate/fold lifecycle) in `packages/core/src/governance/delegation.machine.ts`.

## Graph Engineering (deterministic change control)

A repository-local change-control overlay for Codex work. It moves a change run
from an explicit reviewed model to a verified implementation through an XState
machine, typed AI signals, an exact human-approved model hash, six frozen
deterministic anchors, and durable evidence — so model approval, implementation
authorization, verification, retries, and terminal outcomes are all
deterministic.

- Executable model: `packages/core/src/models/graph-engineering.machine.ts`;
  spec: [`models/graph-engineering.md`](models/graph-engineering.md).
- **Boundary:** it owns only the state of a change *run*. It never emits
  proposal events and never writes `.dao/`. A run may carry an immutable
  `proposalId` correlation, but that value grants no permission and causes no
  transition in either machine.
- AI workers (`modeler`, `implementer`) produce **signals only**; the human
  owner approves the exact model hash, and tools enforce the six success anchors
  (model-contract, graph-tests, architecture-contract, repository-ci,
  runtime-scenario, regression).
- Evidence lives in `evidence/graph-runs/` and is **not committed**.

```bash
# Initialize / inspect / submit a signal for a change run
bun run graph:init -- --run-id <id>
bun run graph:status -- --run-id <id>
bun run graph:submit -- --run-id <id> --signal <file>

# Validate the reviewed model hash and graph contract
bun run graph:validate

# End-to-end reference scenario + the six-anchor regression counter-check
bun run graph:demo
bun run graph:regression
```

## Improvement Loop (self-improvement cycle)

A self-improvement layer that sits *above* the proposal lifecycle and Graph
Engineering. Each cycle pairs an optimizing metric with a required
counter-metric (Goodhart pairing), audits the metric for drift, arbitrates any
conflict between the paired signals deterministically, and only succeeds when
six ground-contact anchors pass. A cycle can never succeed on AI judgment
alone, and a metric can never travel without its counter-metric.

- Executable model: `packages/core/src/models/improvement-loop.machine.ts`;
  spec: [`models/improvement-loop.md`](models/improvement-loop.md).
- **Boundary:** it owns only the state of an improvement *cycle run*
  (`proposalStateAuthority: "none"`). It never changes proposal or Graph
  Engineering status; correlation is immutable and one-way.
- AI workers (`sensor`, `counter-sensor`, `drift-auditor`) emit **signals only**;
  a deterministic `arbitrator` and `anchor-verifier` decide outcomes, and the
  human owner owns reference (target) values and the frozen set.
- Evidence lives in `evidence/improvement-cycles/` and is **not committed**.

```bash
# Initialize (reference hash required) / inspect / submit a signal for a cycle
bun run improvement:init -- --cycle-id <id> --reference-hash <hash> [--scope <s>]
bun run improvement:status -- --cycle-id <id>
bun run improvement:submit -- --cycle-id <id> --signal <file>

# Validate the reviewed model hash; run the frozen ground-contact anchors
bun run improvement:validate
bun run improvement:anchors

# End-to-end reference scenario + arbitration / frozen-set / regression tests
bun run improvement:demo
bun run improvement:regression
```

## Artefacts

Auto-generated for every approved proposal:

| Artefact | Description |
|----------|-------------|
| Decision Brief | Executive summary with key votes |
| ADR | Architecture Decision Record |
| Risk Report | Risks, permissions, guardrails |
| PRD Lite | User stories, scope, metrics |
| Implementation Plan | Phases, tasks, critical path |
| Test Plan | Unit, integration, E2E tests |
| Release Packet | Changelog, checklist, rollback |

## GitHub Integration

Available on every host surface: the CLI (`swarm-dao github-config` /
`github-branch` / `github-pr`), the MCP tools (`dao_config_github`,
`dao_github_create_branch`, `dao_github_open_pr` — exposed by
`@guyghost/swarm-dao-mcp` and the Copilot/Claude/Codex adapters), and the
Pi extension and OpenCode plugin (registered as native tools).

Authentication is delegated to the GitHub CLI: run `gh auth login` once and
Swarm DAO never stores or transmits tokens. Pass `issues=true` if you want
proposal modifications tracked as GitHub issues.

```bash
# Via an MCP host (Claude, Codex, Copilot, or a generic MCP client)
> dao_config_github owner="myorg" repo="myrepo" issues=true

# Create branch
> dao_github_create_branch proposalId=1

# Open PR
> dao_github_open_pr proposalId=1 headBranch="dao/1-add-dark-mode"
```

## Persistence

DAO state stored in `.dao/`:
- `state.json` — monolithic state snapshot (single source of truth, including all proposals)
- `decisions/NNN.json` — compact decision summaries
- `config.json` — per-project configuration

Previously each proposal was also mirrored in `.dao/proposals/NNN.json` "sidecar" files; that redundant copy has been removed. On the first load after upgrading, any existing sidecars are imported into `state.json` and the `proposals/` directory is removed.

## herdr Host (real coding agents in herdr workspaces)

Each deliberation agent runs as a **real coding agent** (pi, claude, codex,
grok, opencode…) inside an isolated [herdr](https://herdr.dev) workspace —
herdr tracks its lifecycle, you can attach to any agent pane live, and a
**blocked** agent (approval/question UI) surfaces as an error output, never
as a vote.

```typescript
import { createHerdrHostAdapter } from "@guyghost/swarm-dao-herdr-adapter";
const adapter = createHerdrHostAdapter({ workDir: process.cwd(), kind: "pi" });
```

Prerequisites: `herdr` installed and its server running. See
[packages/herdr-adapter](packages/herdr-adapter/README.md).

## tmux Host (one watchable pane per agent)

The swarm-forge execution model for deliberation: each agent runs as its own
detached tmux pane — watch it live with `tmux attach`, inspect scrollback
after the fact. Configure the agent CLI in `.dao/config.json`:

```json
{ "tmux": { "command": "claude -p \"$PROMPT\"", "timeoutMs": 300000 } }
```

`$PROMPT` carries the deliberation prompt; stdout is harvested as the
agent's output and feeds the same deterministic tally as every other host.
See [packages/tmux-adapter](packages/tmux-adapter/README.md).

## Adding a New Host

See [docs/EXTENSION-GUIDE.md](docs/EXTENSION-GUIDE.md).

Quick overview:

```typescript
import type { HostAdapter } from "@guyghost/swarm-dao-core";

const myAdapter: HostAdapter = {
  hostId: "my-host",
  spawnAgent: async ({ agent, proposal, systemPrompt }) => { /* ... */ },
  spawnAgents: async ({ agents, proposal, maxConcurrent }) => { /* ... */ },
  log: async ({ level, message }) => { /* ... */ },
  getWorkingDirectory: () => process.cwd(),
  readFile: async (path) => { /* ... */ },
  writeFile: async (path, content) => { /* ... */ },
  exec: async (command, options) => { /* ... */ },
  hasCapability: (cap) => true,
};
```

## Testing

```bash
# Run all tests
bun test

# Run specific package tests
bun test packages/core/tests
bun test packages/cli/tests

# Run integration tests
bun run test:integration

# Run performance benchmarks
bun run bench
bun run bench:ci
```

## CI/CD

GitHub Actions workflow included (`.github/workflows/ci.yml`):
- Lint
- Type checking
- Test execution
- Build verification
- Pi extension npm package validation

Release workflow included (`.github/workflows/publish.yml`):
- Creates Changesets version PRs from `pull_request_target`
- Publishes to npm from `main` via GitHub OIDC trusted publishing

## Documentation

- [ADR-001: Unified Architecture](docs/ADR-001-unified-architecture.md)
- [ADR-002: Hexagonal Functional Core](docs/ADR-002-hexagonal-core.md)
- [Behavioral Models Overview](models/README.md)
- [Graph Engineering Model](models/graph-engineering.md)
- [Improvement Loop Model](models/improvement-loop.md)
- [Command Registry](docs/DAO_COMMAND_REGISTRY.md)
- [MCP Host Integration Guide](docs/MCP_INTEGRATION.md)
- [Extension Guide](docs/EXTENSION-GUIDE.md)
- [Usage Guide](docs/USAGE.md)
- [Agent Prompts](docs/AGENT-PROMPTS.md)
- [XState Proposal Machine](docs/XSTATE_PROPOSAL_MACHINE.md)

## License

MIT
