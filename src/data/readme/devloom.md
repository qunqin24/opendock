# DevLoom

**Autonomous Software Delivery System for OpenCode**

DevLoom combines *Developer* + *Loom* — the loom being the ancient machine that
weaves individual threads into finished fabric. It transforms a single prompt
into verified, documented, production-ready software — not just generated code.

> Generating code is not success. Passing verification is not success.
> Success is achieved only when all acceptance gates have passed.

---

## Highlights

- **15 agents, hard-delegation enforced** — Orchestrator routes; Planner, Developer, QA, Verifier, Security, Documenter, Vision execute. Orchestrator has `edit/write/patch: deny` at the OpenCode permission level — code production is IMPOSSIBLE without `task()` delegation. Sub-agents have `task: deny` to prevent delegation chains.
- **Complexity-based tiering** — Classifies prompts as senior/standard, calls variant agents by name. No global state.
- **Protocol compliance** — Inline RULES + guard injection per turn. Never skippable.
- **Pipeline continuity** — Sessions tracked via `state.sessions`, task_id reused across turns.
- **Loop detection** — Tracks retry counts per agent per ticket. Warns at 2+ retries, blocks at 3+. Detects delegation chains and phase stalls.
- **Peer review gate** — Multi-model consensus for high-risk changes.
- **Architecture atlas** — Auto-generated codebase map on plugin init.
- **Queue-over-preempt** — New prompts queue behind active work.
- **Tier degradation** — Auto-fallback on model failure: senior→standard→skip.
- **Agent listing** — `/devloom-agents` shows all agents and their current model assignments.
- **Background dispatch** — Independent lanes run via `task(..., background: true)` for parallel work.

## How It Works

```
/devloom "<prompt>"
         |
         v
   ORCHESTRATOR (never implements — routes only)
         |
          +-- CLASSIFY: complex? senior tier. Standard? Base agent.
          |              Then call the right variant by name.
         |
         +-- TRIAGE: pick minimal chain for intent
         |     feature → planner > developer > qa > documenter
         |     bug     → developer (root-cause) > qa (regression)
         |     small   → developer > qa
         |
         +-- CONDITIONAL ADD-ONS (only when touched)
         |     image        → vision first
         |     UI/API/CRUD  → verifier / security
         |
         +-- DEFECT LOOP: max 3 cycles, then BLOCKED
         +-- DEVLOOM_DONE: all chain gates pass
```

### Agents

| Agent | Role | Skill |
|-------|------|-------|
| Orchestrator | Triage, route, state, gate (hard-denied write/edit/patch) | — |
| Planner | Requirements + CleanArch plan + evidence path | `plan/planning` + `plan/verification-planning` |
| Developer | Implement / fix + simplify | `build/development` + `build/simplify` |
| QA | Tests, lint, review, regression + simplify | `verify/quality-assurance` + `build/simplify` |
| Verifier | Runtime checks by scope + peer review | `verify/app-verification` |
| Security | CRUD/exposure forensic review | `review/security-review` |
| Documenter | Docs + state updates | `ship/documentation` |
| Vision | Image/screenshot analysis | `build/vision-analysis` |

Each agent has variant files: `-senior` (strongest models) or `-flash` (cheapest), plus base (standard tier). Protocol rules are inlined in every agent — no external LOAD needed beyond the skill files.

---

## Installation

**From npm (recommended):**

```bash
npm install -g devloom
```

**From GitHub:**

```bash
npm install -g https://github.com/nsrau/devloom.git
```

**From source:**

```bash
git clone https://github.com/nsrau/devloom.git
cd devloom
npm install && npm run build && node postinstall.mjs
```

**Per-project via `opencode.json`:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["devloom"]
}
```

The plugin auto-bootstraps `.opencode/devloom/project/`, generates the
Architecture Atlas (`context/atlas.md`), and creates `.opencode/devloom/.tmp/`
for temporary files — all on OpenCode startup.

### Theme

DevLoom ships a custom **Night Owl** theme for OpenCode's TUI. Deep indigo
background with vibrant cyan, purple, and orange accents — designed for long
coding sessions and low eye strain.

```json
# ~/.config/opencode/tui.json or .opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "theme": "devloom-night-owl"
}
```

The theme file is at `.opencode/themes/devloom-night-owl.json` in the project
root. OpenCode loads it automatically when you open the devloom directory.

### Drift protection (always-on)

Long sessions make models "forget" prompt-only rules. DevLoom enforces the
flow deterministically at three levels — no reminders needed:

- **Level 1: OpenCode permissions (hardest)** — The orchestrator's `edit`/`write`/`patch` are denied at the OpenCode permission level. Calls fail with permission errors — the model has no way to bypass this. Sub-agents have `task: deny` so they cannot create delegation chains.
- **Level 2: Plugin guard** (`tool.execute.before`): if the orchestrator somehow attempts a write outside `.opencode/devloom/`, the plugin blocks it with an error telling it to delegate via `task()`. State persistence stays allowed.
- **Level 3: Per-turn injection** (`chat.message` + system transform): compliance requirements + protocol rules + live pipeline state injected into ALL devloom agents every turn.
- **Compaction guard** (`experimental.session.compacting`): the compaction summary is forced to preserve the routing rule and current pipeline state, so the flow survives context compression.
- **Session persistence**: session→agent mapping is written to `.opencode/devloom/.sessions.json` so the guard survives plugin reloads (e.g. after `opencode --continue`).

### Anti-loop protection

Agents that get stuck waste tokens. DevLoom tracks retry counts and stops runaway chains:

- **Per-agent retry counter** — `state.loopCounts[agentName]` tracks how many times the orchestrator re-delegated to the same agent for the current ticket.
- **WARN at 2 retries** — injected into the orchestrator's state summary as `loop_risk=[WARN:devloom-developer=2x]`.
- **HARD STOP at 3 retries** — orchestrator prompt enforces: mark ticket blocked, report BLOCKED, never attempt a 4th retry.
- **Phase stall detection** — if the same phase is re-entered 3+ times with no state advancement, report BLOCKED and ask for task decomposition.
- **Delegation chain detection** — if a sub-agent responds by calling `task()` instead of completing its work, STOP. Sub-agents have `task: deny` at the permission level as a hard guarantee.
- **Cost circuit breaker** — if a single ticket exceeds 2M tokens, pause and report.

---

## Usage

```
/devloom Build a GraphQL API with subscriptions and Redis caching
```

Check progress mid-run:

```
/devloom-status
```

List all agents and their current models:

```
/devloom-agents
```

Persist current state and pause for the next user command:

```
/devloom-save
```

Resume an interrupted execution:

```
/devloom-resume
```

Initialize a project for DevLoom:

```
/devloom-init
```

Non-interactive / CI mode:

```bash
opencode run "/devloom Add OpenTelemetry tracing to all HTTP handlers"
```

---

## The Completion Gate

DevLoom considers a task complete only when **all** of these pass:

| Gate | What It Checks |
|------|----------------|
| `build` | Compilation succeeds |
| `lint` | No lint errors |
| `unit_tests` | All unit tests pass |
| `integration_tests` | All integration tests pass |
| `e2e_tests` | All end-to-end tests pass |
| `all_routes_visited` | Every discovered route was visited |
| `all_buttons_tested` | Every button was clicked |
| `all_forms_tested` | Every form was verified |
| `all_links_verified` | Every link was navigated |
| `all_user_journeys_passed` | All user journeys executed successfully |
| `all_api_endpoints_verified` | Every endpoint validated |
| `accessibility_verified` | ARIA, keyboard, contrast all pass |
| `responsive_layout_verified` | No layout defects |
| `visual_validation_verified` | Rendering correct |
| `performance_validation_verified` | Performance baseline met |
| `security_validation_verified` | No security issues |
| `no_open_defects` | Defect registry is clean |

If any gate fails, DevLoom automatically returns to the repair phase.

---

## Autonomous Operation

DevLoom never stops after code generation. It continues through:

1. **Verification** -- Every route, form, button, link, and API endpoint is tested
2. **Defect Discovery** -- All defects logged to persistent registry
3. **Root Cause Analysis** -- Symptoms are traced to their source
4. **Repair** -- Minimal fixes applied to root causes only
5. **Re-Verification** -- Full regression suite after every fix
6. **Recovery** -- Self-healing from build/test/network failures

Human intervention is always the last resort.

---

## Loop Engineering

**Stop prompting the agent. Design the loop that prompts the agent.**

DevLoom's loop engineering system moves beyond one-shot prompts to recurring,
cadence-driven agent execution. A configured loop runs a pattern on a schedule,
with automatic circuit-breaking via token budget limits.

### Loop patterns (7 built-in)

| Pattern | Purpose |
|---------|---------|
| `daily-triage` | Review new issues, classify, route to planner |
| `pr-babysitter` | Check open PRs for CI status, staleness, conflicts |
| `ci-sweeper` | Retry or investigate failed CI jobs |
| `dependency-sweeper` | Scan for outdated/vulnerable dependencies |
| `changelog-drafter` | Generate changelog from recent commits |
| `post-merge-cleanup` | Clean up merged branches, update tickets |
| `issue-triage` | Triage issue queue with classification and routing |

### Safety levels

| Level | Behavior |
|-------|----------|
| L1 (report-only) | Observe and report — no file modifications |
| L2 (assisted) | Fix with worktree isolation + verifier approval |
| L3 (unattended) | Full autonomous fix-and-close cycle |

### Usage

Start a loop tick manually:

```bash
node .opencode/devloom/scripts/loop-run.mjs --pattern daily-triage
```

In OpenCode, start a background loop:

```
/devloom-loop start daily-triage --cadence "0 8 * * 1-5" --level L2
```

Each tick respects the token budget circuit breaker — if a run exceeds its
budget, the loop pauses and logs the overage before the next scheduled tick.

---

## Defect Registry

All discovered defects are tracked in `.opencode/devloom/defects.json`:

```json
{
  "defects": [
    {
      "id": "BUG-001",
      "severity": "high",
      "location": "/customers",
      "type": "route",
      "status": "open"
    }
  ]
}
```

Defects flow through: `open -> analyzed -> fixed -> verified -> closed`.
The same defect is never rediscovered -- the registry prevents duplication.

---

## Model Configuration

DevLoom provides five model profiles. Each maps every agent to a specific
model optimized for its role.

### Profile comparison

| Profile | Quality | Cost | Best for |
|---------|---------|------|----------|
| **go** | Highest | Premium | Production delivery, complex features |
| **go-economy** | High | Lower | Daily development, budget-conscious |
| **deepseek** | High | Lower | DeepSeek-only stack |
| **go-flash** | Good | Cheapest paid | High-volume, simple tasks |
| **free** | Good | Zero | Evaluation, learning, hobby projects |

### go profile (max quality)

Uses the strongest OpenCode Go models per role.

```json
{
  "models": {
    "orchestrator": "opencode-go/deepseek-v4-flash",
    "planner": "opencode-go/qwen3.7-max",
    "developer": "opencode-go/kimi-k2.7-code",
    "qa": "opencode-go/deepseek-v4-pro",
    "verifier": "opencode-go/deepseek-v4-pro",
    "security": "opencode-go/glm-5.2",
    "documenter": "opencode-go/qwen3.7-plus",
    "vision": "opencode-go/qwen3.6-plus"
  }
}
```

### go-economy profile

```json
{
  "models": {
    "orchestrator": "opencode-go/deepseek-v4-flash",
    "planner": "opencode-go/deepseek-v4-pro",
    "developer": "opencode-go/deepseek-v4-pro",
    "qa": "opencode-go/deepseek-v4-flash",
    "verifier": "opencode-go/deepseek-v4-flash",
    "security": "opencode-go/deepseek-v4-pro",
    "documenter": "opencode-go/qwen3.7-plus",
    "vision": "opencode-go/qwen3.6-plus"
  }
}
```

### deepseek profile

Uses only DeepSeek models for consistent provider affinity:

```json
{
  "models": {
    "orchestrator": "opencode-go/deepseek-v4-pro",
    "planner": "opencode-go/deepseek-v4-pro",
    "developer": "opencode-go/deepseek-v4-pro",
    "qa": "opencode-go/deepseek-v4-pro",
    "verifier": "opencode-go/deepseek-v4-flash",
    "security": "opencode-go/deepseek-v4-pro",
    "documenter": "opencode-go/deepseek-v4-flash",
    "vision": "opencode-go/qwen3.6-plus"
  }
}
```

### go-flash profile

All agents on DeepSeek V4 Flash for maximum throughput at minimum cost:

```json
{
  "models": {
    "orchestrator": "opencode-go/deepseek-v4-flash",
    "planner": "opencode-go/deepseek-v4-flash",
    "developer": "opencode-go/deepseek-v4-flash",
    "qa": "opencode-go/deepseek-v4-flash",
    "verifier": "opencode-go/deepseek-v4-flash",
    "security": "opencode-go/deepseek-v4-flash",
    "documenter": "opencode-go/deepseek-v4-flash",
    "vision": "opencode-go/qwen3.6-plus"
  }
}
```

### free profile

Uses only OpenCode Free models (zero cost). The profile auto-picks the best
available free model per agent role using a candidate chain.

The orchestrator leads with `x-preview-f-free` (stealth preview, strong agentic
routing). Role fallback order:
- **orchestration**: x-preview-f-free → big-pickle → nemotron-3-ultra-free →
  mimo-v2.5-free → hy3-free → muse-spark-1.2-contributor-free → nemotron-3.5-lightning-free
- **implementation / verification**: big-pickle → x-preview-f-free →
  nemotron-3-ultra-free → nemotron-3.5-lightning-free → hy3-free → mimo-v2.5-free
- **planning**: nemotron-3-ultra-free → muse-spark-1.2-contributor-free →
  x-preview-f-free → big-pickle → hy3-free → nemotron-3.5-lightning-free
- **documentation**: muse-spark-1.2-contributor-free → nemotron-3-ultra-free →
  x-preview-f-free → hy3-free → mimo-v2.5-free
- **vision** (vision-capable models only): mimo-v2.5-free → go multimodal fallbacks
  (mimo-v2.5-pro, minimax-m3, deepseek-v4-flash-vision-exp)

### Model-routing table (go)

Each of the 8 agents is assigned a model optimized for its role:

| Agent | Role | Standard Tier | Senior Tier |
|---|---|---|---|
| `orchestrator` | Triage, routing, state, gate | `deepseek-v4-flash` | `deepseek-v4-flash` |
| `planner` | Requirements + CleanArch plan | `qwen3.7-max` | `glm-5.2` |
| `developer` | Implementation + root-cause fixes | `kimi-k2.7-code` | `kimi-k3` |
| `qa` | Tests, lint, code review, regression | `v4-flash` | `v4-pro` |
| `verifier` | Runtime app checks + peer review | `v4-flash` | `v4-pro` |
| `security` | CRUD/exposure forensic review | `v4-flash` | `glm-5.2` |
| `documenter` | Docs + state updates | `v4-flash` | `qwen3.7-plus` |
| `vision` | Image analysis (multimodal) | `qwen3.6-plus` | `qwen3.6-plus` |

### Tier system (complexity-based agent selection)

The orchestrator automatically classifies each prompt by complexity and calls the
correct variant sub-agent by name — no global state switching. Each variant has
a fixed model in its agent file, so parallel worktrees never conflict.

| Tier | When | Agent Variant | Model |
|------|------|--------------|-------|
| **senior** | Complex feature, architecture, security audit, debugging | `-senior` suffix (planner, developer, security) | GLM-5.2, Kimi K3 |
| **standard** | Everything else (default) | Base agents (no suffix) | deepseek-v4-flash, qwen3.7-max, kimi-k2.7-code |

### Prefix requirement

All models MUST use the `opencode/` or `opencode-go/` prefix:

| Correct | Wrong |
|---|---|
| `opencode/nemotron-3-ultra-free` | `nemotron-3-ultra-free` |
| `opencode-go/deepseek-v4-pro` | `deepseek-v4-pro` |

If you forget the prefix, DevLoom adds it automatically and logs a warning.

### First-run interactive setup

If no `config.json` exists, Phase 0 detects available models (`opencode models`),
asks which profile to use (**go**, **go-economy**, or **free**), then
assigns the best model per agent role for the chosen profile.

### Profile & sidebar visibility

OpenCode installs npm plugins into a package cache (`~/.cache/opencode/packages`)
with `ignoreScripts`, so the DevLoom plugin code there can go stale. The DevLoom
`postinstall` and the `/devloom-refresh` command re-copy the current plugin code
(including the `config` hook that injects all 15 DevLoom agents + the active
profile into the OpenCode sidebar) into that cache, rebuilding `dist/` from
source first so the cache never receives stale compiled code.

- After installing or updating DevLoom, run `/devloom-refresh` once, then
  **restart opencode** (or continue with `opencode --continue`) to pick up the
  refreshed plugin.
- The sidebar header shows the active profile (`DevLoom - free`,
  `DevLoom - go`, ...) and every agent row shows its resolved model
  (`orchestrator: opencode/x-preview-f-free`, ...). The orchestrator
  agent description also carries the profile label:
  `DevLoom Orchestrator: autonomous multi-agent delivery (profile: go-flash)`,
  extended to `(profile: go, tier: senior)` with a senior tier override.
- The sidebar shows only the 8 base agents — all `-flash` and `-senior`
  variants are hidden for every profile. The variants stay registered so
  orchestrator `task()` routing keeps working; they are simply not listed.
- Switching profiles (`/devloom-go`, `/devloom-go-flash`, `/devloom-free`, ...)
  updates the installed agent files immediately; restart opencode to see the
  updated profile and models in the sidebar.

---

## OpenCode Go Optimization

DevLoom is **purpose-built for OpenCode Go** -- the premium model tier that
delivers the highest-quality results from the OpenCode platform.

### Why go?

Each agent in the pipeline has different cognitive demands. DevLoom assigns
role-optimized models via the tier system (senior/standard):

| Agent | Standard | Senior (complex) |
|-------|----------|-------------------|
| Orchestrator | `deepseek-v4-flash` (fast, reliable routing) | `deepseek-v4-flash` |
| Planner | `qwen3.7-max` (strong reasoning) | `glm-5.2` (deep analysis) |
| Developer | `kimi-k2.7-code` (code-specialized) | `kimi-k3` (newest gen) |
| QA | `v4-flash` (fast review) | `v4-pro` (thorough verification) |
| Verifier | `v4-flash` (fast checks) | `v4-pro` (deep inspection) |
| Security | `v4-flash` (light review) | `glm-5.2` (forensic depth) |
| Documenter | `v4-flash` (fast docs) | `qwen3.7-plus` (quality docs) |
| Vision | `qwen3.6-plus` (low-cost multimodal) | `qwen3.6-plus` |

### Token architecture

DevLoom eliminates redundant protocol loading at the architectural level:

1. **Inline RULES** — Every agent has protocol rules embedded in its own file body. No external LOAD needed.
2. **Single skill LOAD** — Agents load exactly one file: their skill. No protocol/DSL LOADs.
3. **Guard injection** — Compliance + state summary injected per turn (already in context).
4. **Tier degradation** — If a model fails twice, auto-fallback: senior→standard→skip agent.

**Pipeline token cost (planner→dev→qa→verifier→doc, one turn):**
- Before: ~24KB of LOADed protocol files
- After: ~8KB of inline rules + skill LOAD
- Savings: **~65%**

Run `opencode models` to see what's currently available in your environment.

---

## Skills

DevLoom ships focused skills per agent. Each skill folds in the relevant engineering standards — SOLID, clean code, clean architecture, TDD, UI/UX (WCAG-AA), and forensic root-cause discipline (no workarounds):

| Category | Skill | Agent |
|----------|-------|-------|
| `plan/` | planning | planner |
| `plan/` | verification-planning | planner (evidence path before non-trivial changes) |
| `build/` | development | developer |
| `build/` | simplify | developer, qa (behavior-preserving simplification) |
| `build/` | vision-analysis | vision |
| `verify/` | quality-assurance | qa |
| `verify/` | app-verification | verifier |
| `review/` | security-review | security (CRUD/exposure/auth audit) |
| `ship/` | documentation | documenter |
| `meta/` | skill-discovery | orchestrator |

---

## Project Workspace

Every initialized project gets a persistent workspace at `.opencode/devloom/project/`.

- English-only artifacts for cross-agent consistency
- Minified JSON for AI-only state files
- Jira-style local board with stories, tasks, bugs, decisions, and reports
- Single active ticket by default; unfinished work is always persisted
- Optional GitHub Project mirror only when the user explicitly enables it
- Existing legacy project files are normalized in place on `init`, `run`, and `resume`
- Opening OpenCode in a DevLoom project also normalizes the workspace automatically

---

## Architecture Reference

```
devloom/
+-- src/                          # Plugin source (TypeScript)
+-- agents/                       # 15 agents: 8 base + 7 tier variants
|   +-- devloom-orchestrator.md
|   +-- devloom-planner.md / -senior / -flash
|   +-- devloom-developer.md / -senior / -flash
|   +-- devloom-qa.md / -flash
|   +-- devloom-verifier.md
|   +-- devloom-security.md / -senior
|   +-- devloom-documenter.md / -flash
|   +-- devloom-vision.md
+-- commands/                     # 16 command files + profile.mjs
+-- skills/                       # 9 skill files + 10 loop skills
|   +-- plan/         planning, verification-planning
|   +-- build/        development, simplify, vision-analysis
|   +-- verify/       quality-assurance, app-verification
|   +-- review/       security-review
|   +-- ship/         documentation
|   +-- meta/         skill-discovery
|   +-- loop/         10 loop engineering skills
+-- protocol/                     # Shared protocols + rules.md
+-- .opencode/themes/             # DevLoom Night Owl theme
+-- __tests__/                    # 228 Jest tests
+-- postinstall.mjs               # Auto-installs 15 agents, 14 commands, 9 skills, theme
```
---

## Acknowledgements

DevLoom's skill structure and lifecycle-driven workflow drew inspiration from
[addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and the
broader pattern of packaging senior-engineering workflows as agent-readable
skills.

---

## License

MIT
