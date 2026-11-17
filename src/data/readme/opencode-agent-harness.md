# opencode-agent-harness

A reusable multi-agent harness for AI-assisted development. Ships a persona
fleet (planner, engine engineer, mobile, QA architect/runner, security,
architecture, product, data, devops, handoff, docs), operating rules, model routing,
and QA gates — then deploys them into any project.

> Extracted from a production project so the "agents / subagents / guardrails /
> personas" layer is **not** an inherent part of the app codebase. It lives in its
> own repo and is installed via `npx opencode-agent-harness init`.

> **OpenCode V2 (2.0.29+), V2-native.** The harness ships the V2 plugin API
> (`@opencode/plugin`; plugins default-export `{ id, setup }` and register tools
> via `ctx.tool.transform` and behavior via `ctx.tool`/`ctx.session`/`ctx.shell`/
> `ctx.permission`/`ctx.event` hooks) — V1 plugin implementations do **not** run in
> V2. Configuration is native V2 (`permissions`, `agents`, `mcp.servers`, no
> `small_model`), commands live in `.opencode/commands/`, and the always-loaded
> project instructions are `AGENTS.md` (V2 ignores the `instructions` config key).

## Prerequisites

- **OpenCode V2** (`opencode --version` >= 2.0.29). The harness ships V2 plugins
  and does not run on V1.
- **Node.js >= 20** and **git**.
- The default model routing targets the `opencode-go` provider. If you use a
  different provider, edit the `model:` lines in `.opencode/agents/*.md` and
  `opencode.json` after `init`; the routing policy is documented in
  `.agents/memory/model-routing.md`.

`init` writes into the target directory and does **not** commit or push by
default. Preview first with `--dry-run`.

## Why

- The agent harness is tooling, not application code. Its source lives in the
  npm package — you deploy it with `init`/`update` rather than hand-copying it
  into every repo.
- One canonical, versioned source of truth for personas/rules/QA tiers, deployed
  on demand and updatable via `npx opencode-agent-harness update`.

## Install & initialize

```bash
# from anywhere (uses a target dir or defaults to cwd)
npx opencode-agent-harness init --target /path/to/project --name "MyApp" --domain "a widget catalog"

# non-interactive
npx opencode-agent-harness init --target . --yes

# preview what would change, without writing anything
npx opencode-agent-harness init --target . --dry-run
```

`init` writes:

| Path | Content | Ownership |
|---|---|---|
| `AGENTS.md` | always-loaded project instructions (OpenCode V2 reads `AGENTS.md`; the V1 `instructions` key is ignored) | harness (overwrite) |
| `BACKLOG.md` | canonical task list (Open / In progress / Frozen / Archive / Not tracking) | **project** (create-if-missing) |
| `.opencode/agents/*.md` | 15 persona subagent defs (native V2 frontmatter: `model: provider/model#variant`, `permissions`, `steps`, `hidden`) | harness (overwrite) |
| `.agents/AGENTS.md` | full canonical operating rulebook (V2 auto-discovers it as you work under `.agents/`) | harness (overwrite) |
| `.agents/rules/00-operating.md` | expanded operating rules (referenced from `AGENTS.md`; V2 ignores the `instructions` config key) | harness (overwrite) |
| `.agents/skills/*/SKILL.md` | persona instruction skills (V2 also discovers `.agents/skills/` as skills) | harness (overwrite) |
| `.agents/features/INDEX.md` | pointer to `BACKLOG.md` (per-feature doc tree root) | **project** (create-if-missing) |
| `opencode.json` | main model + `agents` defaults (small-model on `title`, opportunistic `explore`) + the `permissions` baseline | harness (**merged**, see below) |
| `scripts/qa/*` | `test:dispatch` / `test:governance` / `test:qa-plan` / `test:prefix` gates + QA-script wiring check | harness (overwrite) |
| `scripts/backlog.js` | deterministic `BACKLOG.md` editor (list/add/take/archive/freeze) | harness (overwrite) |
| `.opencode/plugins/backlog.ts` | `backlog_*` custom tools the LLM calls (V2 plugin registering the tools; shells out to the CLI) | harness (overwrite) |
| `.opencode/plugins/backlog-notify.ts` | structured log whenever an agent mutates the board | harness (overwrite) |
| `.opencode/plugins/context-guard.ts` | mid-session checkpoint/loop nudges read from `orchestration.md` (core: `scripts/qa/context-guard-core.js`) | harness (overwrite) |
| `.opencode/plugins/session.ts` | `session_info` tool — reports the primary orchestrator session id (the handoff `session:` join key) + observed cost/tokens/turns | harness (overwrite) |
| `.opencode/plugins/checkpoint.ts` | `checkpoint_write` / `checkpoint_resume` tools (shell out to `scripts/checkpoint.js`) | harness (overwrite) |
| `.opencode/commands/checkpoint.md`, `.opencode/commands/resume.md` | mid-session checkpoint + bounded resume-from-checkpoint commands | harness (overwrite) |
| `scripts/checkpoint.js` | deterministic checkpoint write/replace/read for one session handoff (no timestamps, `unknown` for absent state) | harness (overwrite) |
| `scripts/ship.js` | deterministic branch lander (`npm run ship`): rebase on `origin/main`, branch gates, direct fast-forward push of `HEAD:main`, then wait for green CI on the landed SHA | harness (overwrite) |
| `scripts/qa/check-prefix-stability.js` | `test:prefix` gate — fails a volatile value (clock timestamp, machine path, session id) in the always-loaded prompt prefix | harness (overwrite) |
| `.github/workflows/{ci,deploy-uat,uat-health}.yml` | CI gate, CI-triggered artifact deploy, health probe — the self-contained release cycle `ship` drives | **project** (create-if-missing) |
| `.husky/pre-push` | pre-push battery (harness process gates + project test gates) | **project** (create-if-missing) |
| `.vercelignore` | keeps worktree symlinks (`node_modules`, `prisma/generated`) out of the remote build | **project** (create-if-missing) |
| `docs/ci-cd-pipeline.md` | the pipeline reference (setup, secrets/variables, rollback) | **project** (create-if-missing) |
| `scripts/agent-report.js` | deterministic dispatch report (`--cost` joins observed provider telemetry; `--json` schema `agent-report/1`) | harness (overwrite) |
| `scripts/qa/provider-stats.js` | observed cost/token/turn telemetry from the local opencode store (no sqlite dependency) | harness (overwrite) |
| `scripts/qa/session-recon.js` | tool-habit / context-hygiene recon (shell tool-choice, `cd`-chaining, whole-file + repeated reads, guessed paths, dumps, polling, dispatch sizes; `report:recon`) | harness (overwrite) |
| `.agents/memory/*` | project data (domain-map, stack-versions, locations, model-routing, orchestration, history, flow-map, product-principles, quality-parameters, test-design-parameters) | **project** (create-if-missing) |
| `.agents/reviews/*` | project data (durable review/audit deliverables — REPORT.md + scans, tagged by quality-parameters) | **project** (create-if-missing) |
| `.agents/handoffs/*` | project data (one session handoff file per session — sharded so concurrent sessions never collide) | **project** (create-if-missing) |
| `.agents/qa-plans/*` | project data (one QA plan file per change — sharded so concurrent sessions never collide) | **project** (create-if-missing) |
| `.harness.json` | deployed version + project profile + per-file checksums | harness |
| `.gitignore` | **project-owned** — deployment never reads or rewrites it; harness local-only artifact patterns go to the clone-local `.git/info/exclude` | project |
| `.gitattributes` | harness-managed section (`BACKLOG.md merge=backlog` — the row-aware merge driver) merged in, project entries preserved | harness (merged) |

### `opencode.json` is merged, not clobbered

The harness owns only `$schema`, `model`, its `agents` defaults
(`title`/`build`/`explore` — the V2 small-model pin lives on `agents.title.model`)
and the `permissions` baseline. Every other key your project adds — extra
`permissions`, `mcp.servers`, `plugins`, custom `agents`, etc. — is preserved
across `init`/`update` (the `permissions` array is unioned and `agents` is
add-only per agent). This is the **native V2 shape**: there is no V1
`small_model`, singular `agent`, keyed `permission`, or `instructions` key.

## Placeholders

Templates use `{{PROJECT_NAME}}` and `{{PROJECT_DOMAIN}}`; `init` substitutes
them from `--name` / `--domain` (or prompts, or `.harness.json`). Domain facts
that are genuinely project-specific (entity model, external sources, visibility
tiers, trust tiers) live in `.agents/memory/domain-map.md`, which `init`
scaffolds for you to fill in — the skills and rules reference memory instead of
hardcoding domain assumptions.

**Features (`.agents/features/`)** — the durable, feature-centric plan of record. A
found item is captured as one light row in the canonical `BACKLOG.md` (repo root; the
single write-path for all open work: what's known, priority, evidence). When a feature
is picked up, the `features` persona authors the per-feature doc chain
(`.agents/features/<slug>/`), each layer routed to its author persona — `intent.md`
(product-manager) → `scope.md` (system-architect, HIGH-risk only) → `plan.md` (planner)
→ `tests.md` (qa-architect, points to the feature's QA plan). Ceremony is right-sized to blast
radius: trivial → none, low → single `intent.md`, high (auth/DB/public API/flow-siblings)
→ full chain. Docs live beside the code, are written-back before continuing when
implementation invalidates them, and are archived on ship. `.agents/features/INDEX.md`
is a pointer to `BACKLOG.md`. See `.agents/skills/features/SKILL.md`.

**Product-first planning (`.agents/memory/product-principles.md`)** — the project-owned
product concepts (actors, product concepts, UX heuristics, design language, key journeys,
value-maximization rules) that LEAD planning. The `planner` reads it (plus a feature's
`intent.md`) before emitting a dispatch plan and sequences work value-first — smallest
slice that delivers the core outcome first — rather than by tech dependency. `intent.md`
must define Actor(s) → Need → Outcome → Acceptance criteria, and `plan.md` a Value-first
sequence + Product concepts applied; `npm run test:product` fails a feature that reaches
planning/implementation without them (a plan with no intent, or an intent that never
names a user/need/outcome). Fill `product-principles.md` in at `init`; evolve it as the
product does — see `.agents/skills/planner/SKILL.md` and
`.agents/skills/features/SKILL.md`.

**Flow map (`.agents/memory/flow-map.md`)** — the project-owned registry powering the
flow-closure half of `test:qa-plan`. Each user-facing flow lists the code surfaces that
implement the same behavior across codebases/layers (e.g. web component, `mobile/` sheet,
API route) plus its optional variants (e.g. `condition-selector-present` vs `-absent`). Fill
it in so a change to one surface is forced to account for all the others. If empty, the gate
warns but does not block; the guarantee only applies to registered flows.

**Environment registry (`.agents/memory/environments.md`)** — the project-owned
canonical registry of the three environments: **development** (dirty by design —
QA/test data lives and dies here), **User Acceptance (`uat`)**, and **production**
(both enforced clean). The rulebook's non-negotiable law: only **code**, **schema
migrations** (`prisma migrate deploy`), and **idempotent seeds** move forward
(dev → uat → prod); **data never does** — no dump/restore across environments.
Live QA tiers target the `development` DB only. Finalizing a task means deploying
to **uat**: the Definition of Done routes it through `devops-engineer` →
`deploy:uat`, then verifies the boundary with `test:data-hygiene -- --env uat`.
Production is human-gated and out of the per-task flow. The harness scaffolds
`environments.md` (create-if-missing, project-owned) and reminds projects to wire
`deploy:uat` / `deploy:prod` / `test:data-hygiene` via `check-qa-scripts.js`.

**Orchestration & context budget (`.agents/memory/orchestration.md`)** — the
project-owned tuning file for the cost/context guards the operating rules
reference: the main-orchestrator soft turn budget / hard safety ceiling, the
request-context observe → warn → checkpoint → intervene thresholds, dispatch
fan-out review bands, and the stuck/retry-loop heuristics. Shipped with sensible
experimental defaults; tune from post-change data and record why. Scaffolded
create-if-missing (project-owned).

**Bounded orchestration & structured session telemetry** — the harness keeps the
main context from growing unbounded: one bounded orchestration lifecycle per work
unit, compact deterministic checkpoints into the session's `.agents/handoffs/<id>.md`
when a session nears its budget (see `orchestration.md`), and a fresh context that
resumes from the checkpoint instead of replaying the transcript. The
**`context-guard` plugin** makes the budgets mechanical: it parses
`orchestration.md` at runtime (thresholds are never hardcoded) and nudges the
primary orchestrator session as it crosses them — turn bands AND request-token
levels (whichever is stronger), flags repeated identical tool calls, whole turns
with no material state change, and repeated failures sharing a signature, and
records band/request/loop/no-state/failure crossings in
`.agents/guard-events.jsonl` (local-only, excluded clone-locally). It also
**blocks two tool calls outright**: a `git checkout`/`git switch` that would move
HEAD under another live session in the same checkout, and any code change aimed
at the shared `main` checkout before the session isolates into its feature
worktree (`backlog worktree <id>`) — board/`.agents`/docs maintenance on `main`
stays allowed. A git op is judged by the paths it actually moves (explicit
pathspecs, or the live index/upstream diff for a whole-index `commit`/`push`)
against the checkout it selects, so `git -C <main>` is resolved rather than
bypassed. At the
checkpoint band the nudge is imperative: write ONE checkpoint, then stop at the
current **phase boundary** — a fresh bounded context resumes from it. The nudge is
injected **cache-safely**: it is appended as a synthetic tail message via the V2
`context` session hook (`ctx.session.hook("context")`), never written into the
system prompt — a
system-prompt change on a band crossing evicts the provider's entire prompt cache
and re-bills the whole transcript at full input price (measured: every full-price
re-read landed on turn 50/60/80/100). Appending at the tail keeps the cached
prefix byte-stable. Every handoff can
carry a `## Session metadata` block (`session`, `work_type`, `outcome`,
`termination_reason`, `checkpoint_count`, `model_escalation_evidence` —
controlled vocabularies, never fabricated) that `npm run report` aggregates
deterministically per feature.
`npm run report -- --cost --since=14d` (also `npm run report:cost`) closes the
telemetry loop: the `session_info` tool returns the primary session id, and
`agent-report` joins it to observed provider data
(`scripts/qa/provider-stats.js` reads the local opencode store, including
registered git worktrees) — totals, model mix by tier, cache-read share, P50/P90
cost and turns, >60-turn sessions, identical-call loop candidates, mid-cycle
context resets (resume/checkpoint sessions), and **cost per shipped feature**
(primary session + its subagent sessions = one feature run).
A primary session observed on an `escalation_models:` model is flagged when no
`model_escalation_evidence` / `## Escalations` reason is recorded — escalation is
visible, never assumed. Nothing is inferred from text length.

**End-to-end auto-resume (`agent-harness run`)** — chains bounded orchestration
contexts so a full delivery cycle (pick → plan → implement → QA → gates → ship →
land → UAT deploy) completes without a manual resume per phase. It runs the
next-item workflow, and whenever a phase ends with the feature not landed, it
launches a fresh opencode session that resumes from the checkpoint only. It stops
on landed (archived row or shipped outcome), the phase cap, an empty queue, or a
failed phase that did not land. The decision core
(`scripts/qa/run-loop.js`) is pure and unit-tested; `--dry-run` prints the phase
plan.

## Model routing & enforcement

- Concrete models are set in `.opencode/agents/<name>.md` (`model:
  provider/model#variant`) and `opencode.json` (`model`, plus `agents.title.model`
  for the small-model pin).
- Personas also carry mechanical guardrails in native V2 `permissions` frontmatter:
  - thinkers (`planner`, `product-manager`) → `edit` deny-by-default with a narrow
    artifact write grant (planner → `.agents/features/<feature>/plan.md`,
    product-manager → `.agents/features/<feature>/intent.md`, each writable in the
    main tree or the feature's `.worktrees` sibling), plus a `shell` deny
  - `qa-architect`, `handoff`, `docs` → a `shell` deny
  - code personas (`frontend-engineer`, `mobile-engineer`, `ui-designer`,
    `data-engineer`, `devops-engineer`, `security-engineer`, `system-architect`,
    `diagnostics-expert`) → an `edit` allow narrowed by denies for
    `opencode.json`, `.harness.json`, `.opencode/**`, `.agents/**` (governance
    and harness files are read-only), plus a `shell` allow
  - deterministic personas → a `#low` **model variant** (`model: <provider/model>#low`) — V2 treats `request.body.temperature` as a no-op, so the old temperature pin was replaced by the variant
  - all personas → a `steps:` cap (cost ceiling)
  - `planner`, `handoff` → `hidden: true`
- `.agents/skills/*/SKILL.md` carries a `model:` label only (informational).
- `npx opencode-agent-harness list` prints the persona → model mapping.
- `npm run test:dispatch` mechanically verifies model pins against
  `scripts/qa/models.allowlist.txt` and that `model-routing.md` does not name a
  stale model no longer pinned anywhere (doc↔config drift). Concrete IDs on the
  machine-readable `opportunistic_models:` / `escalation_models:` lines are
  legal declared targets, not drift.
- **Opportunistic tier** (`.agents/memory/model-routing.md`): free/low-cost
  models for best-effort bulk exploration/summarization, pinned through
  `opencode.json` `agents.explore.model` (default `opencode-go/glm-5.3-flash`) and
  ADD-ONLY overridable per project — with a mandatory fallback to the persona's
  normal tier and a no-confidential-data caveat. `report` classifies the model
  mix by tier.
- **Provider priority & fallback**: models run on the **OpenCode Go
  subscription first** (`opencode-go/*`), with **DeepSeek direct**
  (`deepseek/*`) as the pay-per-token fallback — except the **V4 Pro architect
  tier** (`planner`, `qa-architect`, `system-architect`, `security-engineer`),
  which always pins **direct `deepseek/deepseek-v4-pro`**. Every fallback is
  announced immediately (a fallback the user cannot see is a silent process
  change).
- **Provider funds stop**: a provider funds/quota error (`insufficient
  balance`/`funds`/`credits`, usage limit, HTTP 402) is a hard stop, never a
  silent inline degrade: the orchestrator announces the failed provider/model and
  the exact unfinished step, checkpoints, and waits for the user's explicit
  top-up-complete message. The `context-guard` plugin mechanically detects such
  an error from **structured failure evidence only** — a failed dispatch
  (`task` error), a non-zero-exit command, or a subagent session error — and
  injects the same stop; reading a document that merely quotes the rule (the
  session-start `model-routing.md`, a handoff, a plan) never trips it.
- **`/switch-model` command** — every deploy ships an opencode command
  (`.opencode/commands/switch-model.md`) plus per-platform twins
  `scripts/switch-reasoning-model.ps1` (Windows PowerShell) and
  `scripts/switch-reasoning-model.sh` (WSL/Linux/macOS; the command invokes this
  one on POSIX). It rewrites the main `opencode.json` `model` and the six
  reasoning-tier agents (planner, system-architect, security-engineer,
  diagnostics-expert, product-manager, qa-architect) in one step — a blunt
  override of the tiered default. Aliases: `go`/`go-flash`/`go-deepseek` →
  `opencode-go/deepseek-v4.1-flash` (default, OpenCode Go), `go-pro` →
  `opencode-go/deepseek-v4-pro` (Go escalation),
  `deepseek`/`flash`/`direct` → `deepseek/deepseek-flash` (direct fallback),
  `deepseek-v4-flash` → `deepseek/deepseek-v4-flash` (legacy V4 pin),
  `pro`/`deepseek-pro`/`deepseek-v4-pro` → `deepseek/deepseek-v4-pro`
  (direct escalation), `nvidia`/`kimi`/`kimi-k3` →
  `nvidia/moonshotai/kimi-k3` (NVIDIA NIM), `nemotron`/`nemotron-ultra` →
  `nvidia/nemotron-3-ultra-550b-a55b:free` (NVIDIA NIM, free),
  `openrouter`/`or`/`minimax-m3`/`m3` → `openrouter/minimax/minimax-m3`
  (OpenRouter), or any explicit `provider/model`. Restart opencode after
  switching (config reads once).
- **`/board` command** — every deploy ships an opencode command
  (`.opencode/commands/board.md`) that runs the deterministic `scripts/backlog.js
  list` and shows the active rows verbatim — no LLM filtering, no re-ordering, no
  transformation. Read-only, no git — the local file is the source of truth.

### Backlog management — fast, deterministic, no LLM in the loop

`BACKLOG.md` is the single source of truth; it is managed by a **deterministic
Node CLI** (no model round-trip) that both humans and agents share:

```bash
npm run backlog -- list              # In progress + Open, evidence on its own line (add --all for Frozen/Archive, --full to skip truncation)
npm run backlog -- add "NLI search times out" --p P2 --evidence docs/issues.md
npm run backlog -- take F-001 --handoff .agents/handoffs/F-001.md
npm run backlog -- archive F-001 --closed "shipped 2026-09-04"
npm run backlog -- freeze F-002 --why "not now" --reopen "customer asks"
```

`list` renders each row on two lines (task on top, evidence/handoff/reopen on a
labeled line below) and truncates long cells by default for scannability — pass
`--full` for the untruncated text. The `backlog_list` tool always uses `--full`
so agents see complete descriptions.

- The CLI validates the schema (`P1..P4`, non-empty evidence/handoff/reopen, `Depends on`
  references naming real rows), generates unique IDs, and sorts `Open` by priority — every
  write stays `npm run test:backlog`-green.
- **Dependencies are machine-readable**: a row's `Depends on` cell (`backlog depends <id>
  --on F-039,F-041` / `backlog add ... --depends-on ...`) lists IDs that must be archived
  first. `/next`, `take`, and `worktree` skip or refuse a row whose dependencies aren't
  archived — no more "until F-041" living in prose.
- **Isolation is a worktree per feature**: `backlog worktree <id>` (from the MAIN tree)
  creates a `git worktree` + branch and auto-takes the row. The branch is based on the
  current upstream (`origin/main`), never a stale local HEAD, and `--no-track` keeps it
  from silently tracking main. Every feature works in its own checkout — `main` stays
  board + shippable code only — so one session's uncommitted work can't leak into another's
  pre-push gate. Worktrees land in a single hidden container sibling,
  `<repo>/../.worktrees/<repo>/<id>`, so the parent folder (e.g. `C:\develop`) only ever
  holds top-level projects. Pass `--open` to launch the agent CLI *in the new worktree*
  after the board is written, so the session is root-scoped there and its lease + gates
  never land in `main`. If the worktree is instead created **mid-session** (no `--open`),
  the tools forward their session id and the CLI records the target at
  `.serve/sessions/<id>.worktree`; `backlog_*`, `checkpoint_*`, and `session_info` then
  follow the session into the worktree, and `archive` clears the pointer. `backlog archive
  <id>` removes the shipped feature's worktree + merged branch, so a session cleans up
  after itself on close.
- **Single-authority board (main-checkout freshness)**: because a feature's commits reach
  `origin/main` from its own worktree, the MAIN checkout's board can lag origin until it is
  pulled. Every mutating command in the MAIN checkout is therefore a transaction
  (`scripts/qa/board-sync.js`): fetch → row-aware reconcile against `origin/main` (an
  archived-upstream row wins over a stale local take; local-only rows survive) → apply →
  commit → fast-forward push. Main never carries an uncommitted board copy, so a mutation
  can never resurrect a shipped row; a genuine non-board local edit fails closed with an
  actionable message, while a redundant one (already identical to upstream) is cleared
  losslessly. `ship`'s post-landing convergence runs the same logic under the board lock
  (so it can't race a concurrent `backlog` command) and runs even when CI is red.
  `backlog sync` publishes offline edits later; `agent-harness doctor` warns when the
  checkout is behind. `agent-harness update` likewise fast-forwards a stale target before
  it auto-commits and refuses to commit onto a diverged branch (`--no-fetch` skips the
  network step for `backlog`).
- **Row-aware merge driver**: `.gitattributes` routes `BACKLOG.md` through
  `scripts/qa/merge-backlog.js` (wired by `init`/`update`), so two sessions editing
  *disjoint* rows merge by ID instead of conflicting — concurrent take/archive no longer
  produces a `BACKLOG.md` merge conflict.
- **Owned files**: `backlog owns <id> --files "scripts/test-*.ts, scripts/qa/routes.js"`
  records the files a row owns in `.agents/memory/owned-files.md`, sharpening
  `test:concurrency` to fail *exactly* when two In-progress rows own the same file.
- **Agents use the same path** via opencode custom tools (`backlog_add`,
  `backlog_take`, `backlog_archive`, `backlog_freeze`, `backlog_depends`, `backlog_owns`,
  `backlog_worktree`, `backlog_list`) that shell
  out to the CLI — never hand-edit `BACKLOG.md`.
- A **notify plugin** (`.opencode/plugins/backlog-notify.ts`) writes a structured
  log the moment an agent mutates the board. V2 server plugins have no TUI, so
  this is a console log (visible in the opencode log), not the V1 toast — but it
  still surfaces "an agent finished an item" without a manual refresh.

### Permission model & limits

- **Ordering is last-match-wins, so a project rule can shadow a harness deny.**
  V2 applies `permissions` in order (global → project → agent) and the *last*
  matching rule wins. `init`/`update` append a project's own rules **after** the
  harness rules, so a project-level `allow` can override a harness `deny` (for
  example the credential denies). The deployed baseline is ordered safely
  (denies after the work-root allow), but a hand-added project rule is stronger
  than the baseline — audit project `permissions` whenever a deny must be
  absolute, and treat the project layer as a deliberate escape hatch.
- **`permissions` gate tool *selection*, not the host.** They are advisory to
  the model; a `shell` call runs with the host user's full authority regardless
  of the rules (V2's own docs say so). The harness compensates with mechanical
  guards — the capacity envelope, the main-checkout / branch-switch guard,
  per-feature worktrees, session leases — not a kernel sandbox. Keep secrets off
  the box, and prefer a container or a dedicated user for untrusted work.

## QA gates

- `npm run test:dispatch` — persona model-pin preflight + persona↔skill parity + model-routing↔pin drift check.
- `npm run test:governance` — session wrap-up dispatch-log enforcement.
- `npm run test:backlog` — canonical single-backlog gate: `BACKLOG.md` is the one
  source of truth; status/priority enums, frozen-reopen conditions, non-empty
  priority/evidence (and non-empty task/handoff on `In progress` rows), no
  duplicate IDs, `Depends on` cells that name real rows, and `INDEX.md`/`todo.md`
  must be pointers (not live lists). Reports an over-wide row honestly ("row F-127
  has 7 cells, expected 6 — unescaped `|`") instead of surfacing a shifted cell as
  a bogus "depends on unknown row".
- `npm run test:concurrency` — cross-session working-tree guard. Fails when the
  board shows 2+ `In progress` rows while the tree has uncommitted changes; with
  owned files declared (`.agents/memory/owned-files.md`), it fails *exactly* when
  a dirty file is owned by two In-progress rows (or a tree mixes two sessions'
  WIP). The shared `BACKLOG.md` itself is treated as owned by every In-progress
  row, so a dirty board under 2+ active sessions is a hard failure. It also
  refuses two live *primary sessions* on one checkout via `.serve/sessions/`
  leases written by the context-guard plugin — liveness requires the pid **and** a
  matching process birth token (`bootId` + `/proc` starttime) **and** a fresh
  heartbeat, so a recycled pid or a closed TUI can't masquerade as a live session.
  `node scripts/qa/check-concurrency.js --prune` clears dead/recycled/stale leases
  (the plugin also sweeps at startup).
- `npm run test:integrate` — pre-push rebase check: fails when the current branch
  is behind `origin/main`, reminding you to `git rebase` and re-run the board +
  concurrency gates before pushing, so conflicts surface early.
- `npm run test:quality` — **mechanical code-quality gate on new/grown code**:
  flags dead exports (a symbol whose only reference is its own declaration) and
  files that are new or grew past the line limit (default 1000). Runs against the
  diff by default (`--paths a,b` to target files, `--base <ref>` to set the
  baseline, `--strict` for CI). Canonical rubric: `.agents/memory/quality-parameters.md`.
- `npm run test:wiring` — **orphan-test gate**: every `*.test.*` / `*.spec.*`
  file must be executed by some package script (directly, as a directory prefix,
  or via a glob). An authored test wired into no tier is neither protection nor a
  failure signal — test-design parameter T7. Default-discovery runners (`vitest
  run`, bare `node --test`, …) downgrade unwired files to warnings unless
  `--strict`; a deliberate orphan carries an auditable
  `// test-wiring-waived: reason` comment. Tags: `.agents/memory/test-design-parameters.md`.
- `npm run test:linger` — **exit-contract gate**: runs `test:quick` by default
  (or an explicit command after `--`), measures real process wall-clock, parses
  the runner's self-reported duration (`node:test` `duration_ms`, jest `Time:`,
  vitest `Duration`), and fails when the process lingers after the tests are done
  (T1/T6/T9) — the measured bug where 22 tests finished in 76 ms but the process
  exited 60.4 s later. Tune with `--max-linger <sec>` / `--ratio <x>`.
- `npm run test:prefix` — **cache-prefix stability gate**: the always-loaded
  prefix (root `AGENTS.md`, the rulebook, `00-operating.md`, and the session-start
  memory reads) must carry no per-run content — clock timestamps, machine-specific
  absolute paths, or session ids — because one changing byte breaks prompt-cache
  locality for every later turn. Bare historical dates are fine; `BACKLOG.md`,
  handoffs, and feature docs are out of scope.
- `npm run checkpoint -- write --feature <id> ...` / `resume --feature <id>` —
  deterministic bounded-state checkpoint in `.agents/handoffs/<id>.md`
  (agents: the `checkpoint_write` / `checkpoint_resume` tools, or `/checkpoint` /
  `/resume`). Rewriting identical state is a no-op; changed state increments
  `checkpoint_count`; no timestamps, `unknown` for anything not recorded.
- `npm run test:product` — **product/UX-first gate**: every feature doc in
  `.agents/features/<slug>/` must define its user before planning/implementation.
  `intent.md` must carry Actor(s) → Need → Outcome → Acceptance criteria, and `plan.md`
  a Value-first sequence + Product concepts applied; a `plan.md` with no `intent.md`
   fails (never plan around an undefined user need). Backward-compatible — no feature
   docs, gate passes.
- `npm run test:docs` — **docs-as-code gate**: `README.md` / `docs/**` must have no
  un-substituted `{{PLACEHOLDER}}` template vars, no dangling relative links, and every
  ADR (`docs/adr/*.md`) must carry Context → Decision → Consequences + a Status.
  Backward-compatible — no docs, gate passes.
- `npm run test:qa-plan` — **diff-coverage + flow-closure gate**:
  every changed CODE path must have a covering assertion (or a waivered reason) in
  a QA plan (one per-change file under `.agents/qa-plans/`) before a change is verified — and every touched flow
  (`.agents/memory/flow-map.md`) must have every sibling surface and declared optional
  variant addressed in the plan's `## Parallel-surface & variant audit`. Kills the
  "verified by a suite that never touched the change" failure mode: a tier label never
  proves coverage. It also makes **"Fix One, Fix All" mechanical**: a change to one
  surface (e.g. web) cannot ship while the same flow in another codebase (e.g. `mobile/`)
  silently keeps old behavior — the plan must name each sibling as covered (`->`) or
  out-of-scope (`audited: reason`, e.g. `deferred — logged in handoffs/`).
- `node scripts/qa/check-qa-scripts.js` — warns (or `--strict` fails) when the
  DoD-referenced runtime QA tiers aren't wired into `package.json`.

The harness ships only these gates. The runtime QA tiers (`test:quick`,
`test:routes`, `test:api`, `test:verify`, `test:security`) and their backing
scripts are **project-provided** — the rulebook references them, and
`check-qa-scripts.js` reminds you if they're missing.

## Update

```bash
npx opencode-agent-harness update --target /path/to/project
```

- Overwrites harness-owned files, preserves `.agents/memory/*`, `.agents/reviews/*`, `.agents/handoffs/*`, `.agents/qa-plans/*`, and `BACKLOG.md`.
- **Fails closed on a locally-modified harness-owned file**: if a harness-owned
  file's bytes no longer match the checksum in `.harness.json` (someone hand-edited
  it in the project), `update` aborts *before writing anything* and names the file.
  Port the change into the harness `templates/` (with a drift-guard test for a
  gate/QA script), release, and re-run — or pass `--accept-harness` to overwrite
  deliberately. This prevents the F-289 class of incident, where a project-side
  fix to `scripts/qa/board-sync.js` was silently clobbered by a routine deploy.
- Auto-wires the harness gate scripts (`test:dispatch`, `test:governance`,
  `test:qa-plan`, `test:backlog`, `test:product`, `test:docs`, `test:quality`,
  `test:wiring`, `test:linger`, `test:prefix`) plus the `report`,
  `report:cost`, `checkpoint`, and `serve` helpers into the target's `package.json`
  (merged, add-only).
- **Auto-commits** the harness files it changed (`chore(harness): opencode-agent-harness
  <old> -> <new>`) and **pushes** to origin, so the next session never sees unexplained
  modified harness files. Your unrelated uncommitted work is never staged. The push
  uses `--no-verify` — a `chore(harness)` maintenance commit must not be stranded by a
  project pre-push gate that legitimately refuses a direct main push.
  - `--no-commit` to skip commit+push, `--no-push` to commit but not push,
    `--accept-harness` to overwrite a locally-modified harness-owned file.
  - `init` does **not** commit or push by default: pass `--commit` to commit the
    files it scaffolds and `--push` to also push. A first run in an existing repo
    is always reviewable before anything enters git. A pre-existing `AGENTS.md`
    the harness did not create is refused (nothing is written); `--accept-harness`
    overwrites it deliberately after backing it up under `.harness-backup/`.
  - Harness-owned paths are **force-added**, so a project that gitignores deployment
    artifacts (an inherited `.agents/` `.opencode/` `AGENTS.md` pattern) still gets the
    harness commit instead of a raw `git add` failure that silently skips it — force-added
    files are called out in the summary.
- **`[Nothing-to-Update]` confirmation**: if the target is already at this CLI's version and no
  harness-owned file changed, `update` says so explicitly, writes nothing, and makes no commit —
  a no-op is never mistaken for a sync and never churns `.harness.json`.
- **Downgrade guard**: `update` refuses to run on a target whose deployed harness is NEWER than
  this CLI (e.g. deployed from a local checkout that was never published) and tells you to publish
  that version first.
- **Published-version check**: if this CLI's version is not the latest `dist-tags.latest` on npm,
  `update` warns you — catches the "bumped the version and updated a project from a local
  checkout, but never published" gap before it silently forks the projects.
- **Non-destructive**: a locally-modified harness-owned file is backed up to
  `.harness-backup/<timestamp>/` before any overwrite. With `--accept-harness`,
  after the overwrite the target's own `npm run test:quick` is run **before** the
  harness commit; if it is red the clobbered files and `.harness.json` are rolled
  back and the commit is aborted, so a deploy can never land a broken suite.
- `opencode.json` is merged (project keys preserved).
- **Local-only excludes — never `.gitignore`**: the harness's local artifacts
  (`.harness-backup/`, `.backlog.lock`, `.serve/`, `.agents/guard-events.jsonl`)
  are recorded in the clone-local `.git/info/exclude` (add-only; pre-existing
  excludes preserved). That file is untracked and never pushed, so the project's
  committed `.gitignore` is **never** read or rewritten. (A pre-0.1.55 managed
  `.gitignore` section truncated project entries after its marker, silently
  un-ignoring `.env`/`data/` — FamilyBudget F-020.) New harness files are tracked
  (committed), not ignored — so they don't need a gitignore change.
- **Managed `.gitattributes` + merge driver**: the harness merges a marked section
  (`BACKLOG.md merge=backlog`) into the project's `.gitattributes` and registers the
  row-aware driver in the local `.git/config` (`merge.backlog.driver`). The driver script is
  committed; the config pointer is per-clone, so `init`/`update` (re)register it on every
  deploy.
- `--dry-run` previews the plan without writing.

### Release cycle & `doctor`

`init` seeds a working CI/CD release scaffold create-if-missing (never overwritten,
so your edits survive `update`): the CI gate, the CI-triggered artifact deploy,
the UAT health probe, `.husky/pre-push` (process gates), `.vercelignore`, and
`docs/ci-cd-pipeline.md`. The cycle is:

```
worktree → npm run ship → direct fast-forward push to main → CI → (on CI success) deploy UAT → health probe
```

`ship` runs the harness process gates itself (not just via the git hook), lands
`HEAD:main` with a direct fast-forward push (retrying after a concurrent
landing), and **waits for CI to go green on the landed SHA** — the deploy runs
only after CI succeeds. Check readiness at any time with the deterministic report:

```bash
npx opencode-agent-harness doctor --target /path/to/project
```

It reports git/remote/branch, `gh` + auth, the CI/deploy workflows, the pre-push
gate, the Vercel link, and the local-only ignores. Missing infrastructure is a
warning; a missing prerequisite for the cycle the harness promises is a failure.

### Backlog migration (`migrate-backlog`)

```bash
npx opencode-agent-harness migrate-backlog --target /path/to/project
```

Consolidates any live `.agents/features/INDEX.md` F-rows and
`.agents/memory/todo.md` list items into the canonical `BACKLOG.md`, then rewrites
both as pointers. Idempotent — re-running never duplicates rows (it only merges into
an empty board) — and never deletes a source before `BACKLOG.md` is written and
verified. Logs a summary: `N open · M frozen · K archived`.

## Develop

```bash
npm test          # node --test
npm run lint      # syntax-check the CLI + QA scripts
node bin/agent-harness.js list
node bin/agent-harness.js init --target /tmp/demo --name Demo --yes
```

`npm test` runs the hermetic unit suite **and** `tests/plugin-loader.e2e.js` — a
**real-loader** check that loads the shipped plugins into a fixture location on a
running OpenCode service and asserts one guard event fires end-to-end (a session
lease). It **skips** when no service is running (always the case in CI), so
`npm run test:plugin-loader` is the explicit invocation on a dev box. See
`docs/opencode-v2-migration.md` §20.

### Running on WSL2

- Keep the checkout and target projects on the Linux filesystem
  (`~/develop/...`), never on `/mnt/c` — Node/npm I/O over the Windows drvfs
  mount is far slower. `init`/`update` warn when a target is on `/mnt/<drive>/`.
- `.gitattributes` pins `*.sh` to LF (and `*.ps1` to CRLF); the same rules are
  merged into every deployed project, so POSIX scripts survive a Windows-side
  checkout. See the `switch-reasoning-model.sh` POSIX twin, platform-dispatched
  by the `/switch-model` command.
- Worktrees live in a sibling container (`<repo>/../.worktrees/<repo>/<id>`), so
  allow `~/develop/**` in the global `opencode.jsonc` (an `external_directory`
  allow rule in the `permissions` array), or each worktree access prompts.

Clear the data-test except keep `templates/` generic; do not commit a target
project's `.agents/memory/` into this repo.
