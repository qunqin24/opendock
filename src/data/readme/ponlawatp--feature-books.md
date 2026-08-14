# Feature Books (Codex + Claude Code + OpenCode plugin)

A knowledge graph of business logic and each feature's code "fence", stored as an Obsidian vault
in every project at `.feature-books/`. It lets the AI read the relevant context before editing
code and warns about the blast radius to reduce regression bugs.

**Important:** the plugin installs globally, but the `.feature-books/` data always lives in each repo,
because every script resolves the vault from the current working directory (cwd) upward — not from
where the plugin is installed.

**Language:** feature book content defaults to **English**, configurable per project. Ask Codex to
set the Feature Books language, use `/fb-config set <language>` in Claude Code, or call the
`fb-config` tool in OpenCode. The setting lives in `.feature-books/.fbconfig.json`, applies from the
next run onward, and does not retranslate existing books.

## What you get

- **Skill** `feature-books` — teaches the AI to load a feature book 1 hop before editing, respect the fence, and update the Change Log
- **Workflows**: initialize, fix, version, create, impact, sync, configure, learn from PR reviews,
  claim, task, and triage — invoke `$feature-books` or ask naturally in Codex, use `/<command>` in
  Claude Code, or `use <tool>` in OpenCode
- **Hooks** (all plain deterministic scripts — no AI/LLM call in any of them):
  - `SessionStart` — `fb-version-check` compares the vault's stamped version against the installed plugin, every time work starts in a repo
  - `PreToolUse` on Edit/Write/MultiEdit — `fence-check` warns when about to edit a file outside a feature's fence
  - `PostToolUse` on Edit/Write/MultiEdit — `fb-staleness-check` reports which feature's fence (or which tasks/ stage) the just-edited file belongs to, so keeping Feature Books current after an edit doesn't rely on the model remembering to check
  - `Stop` (Codex + Claude Code) — `fb-autobook` continues the turn if changed code isn't reflected in its owning Feature Book (stale Change Log or a new, unclaimed feature); loop-guarded, disable with `FB_AUTOBOOK=0`
- **Scripts**: `graph-lint`, `diff-impact`, `fence-check`, `fb-init`, `fb-fix`, `fb-new`,
  `fb-learn-pr`, `fb-claim`, `fb-autobook`, `fb-version-check`, `fb-staleness-check`,
  `fb-tasks-list`, `fb-tasks-lint` (Node ≥ 16, no dependencies)

## Install

### Claude Code (via plugin marketplace)
```bash
/plugin marketplace add ./feature-books-plugin
/plugin install feature-books@ponlawatp
```

Or from GitHub:
```bash
/plugin marketplace add PonlawatP/feature-books-plugin
/plugin install feature-books@ponlawatp
```

### Codex

From a local clone:

```bash
codex plugin marketplace add ./feature-books-plugin
codex plugin add feature-books@ponlawatp
```

Or directly from GitHub:

```bash
codex plugin marketplace add PonlawatP/feature-books-plugin
codex plugin add feature-books@ponlawatp
```

Start a new Codex task after installation so the bundled skill and hooks are picked up. Open
`/hooks` once to review and trust the plugin's deterministic hooks; Codex skips untrusted plugin
hooks until they are approved.

### OpenCode

#### From npm (easiest — once published)

```json
// opencode.json
{
  "plugin": ["@ponlawatp/feature-books"]
}
```

OpenCode auto-installs it at startup. No file copying needed.
The `scripts/` are bundled in the npm package and found automatically.
Skills are auto-discovered from the package too.

**Before publishing**, run:
```bash
npm run build        # compile src/index.ts -> dist/index.js
npm publish          # publish to npm
```

#### Per-project (auto-discovery)

Run `scripts/install-opencode.mjs` inside the target project:
```bash
node ../feature-books-plugin/scripts/install-opencode.mjs
```

This copies `.opencode/plugins/feature-books.ts` + `scripts/` into the project
and links the skill to `~/.claude/skills/feature-books`. The plugin is
auto-discovered because it lives in `.opencode/plugins/`.

#### Global install (one-time, works in every project)

```bash
# 1. Clone the repo to a fixed location (e.g. home dir)
git clone https://github.com/PonlawatP/feature-books-plugin ~/feature-books-plugin

# 2. Set env var so the plugin finds scripts (add to shell profile)
export FEATURE_BOOKS_SCRIPTS="$HOME/feature-books-plugin/scripts"
# Windows PowerShell:
# [Environment]::SetEnvironmentVariable("FEATURE_BOOKS_SCRIPTS", "$env:USERPROFILE\feature-books-plugin\scripts", "User")

# 3. Link the skill (OpenCode auto-loads from ~/.claude/skills/)
ln -s ~/feature-books-plugin/skills/feature-books ~/.claude/skills/feature-books
# Windows:
# New-Item -ItemType Junction -Path ~\.claude\skills\feature-books -Target ~\feature-books-plugin\skills\feature-books
```

Then add to each project's `opencode.json`:
```json
{
  "plugin": ["file:///Users/you/feature-books-plugin/.opencode/plugins/feature-books.ts"]
}
```

#### Quick project reference (no copy)

If the plugin repo is cloned alongside your project:
```json
{
  "plugin": ["../feature-books-plugin/.opencode/plugins/feature-books.ts"]
}
```

Scripts are resolved automatically via `FEATURE_BOOKS_SCRIPTS` env var or by
finding them relative to the plugin file.

## Get started in a project

Run inside the target repo:

### Codex

Ask naturally, for example:

- `Use $feature-books to initialize this project`
- `Use $feature-books to create feature feat-login`
- `Use $feature-books to analyze the blast radius of my changes`
- `Use $feature-books to learn durable knowledge from the PR for this branch`
- `Use $feature-books to claim src/auth/login.ts for feat-login`
- `Use $feature-books to initialize this multi-repository workspace`

### OpenCode
Ask the AI:
- `use fb-init tool` to bootstrap the `.feature-books/` vault (+ graph colors, appearance, tasks/ kanban)
- `use fb-new tool` to create a feature book
- `use fb-impact tool` to analyze blast radius
- `use fb-claim tool` to add a file to a feature's fence

### Claude Code
```bash
/fb-init
/fb-new feature feat-login
/fb-learn-pr
/fb-workspace-init
```

Open the `.feature-books/` folder as an Obsidian vault (install the **Dataview**
community plugin for the tables in `_index.md`).

**Appearance:** `/fb-init` also seeds `.feature-books/.obsidian/appearance.json` with the project's fonts
(`Noto Sans,Noto Sans Thai Looped` for interface/text, `Noto Sans Mono,Noto Sans Thai Looped` for monospace)
and accent color (`#5cf58f`). If the graph colors or appearance ever drift, get reset, or get hand-edited
away from spec, run `/fb-fix` — unlike `/fb-init`, it always overwrites both files back to these defaults.

**Staying current:** `/fb-init` stamps `.feature-books/.fbconfig.json` with the plugin version at bootstrap
time. A `SessionStart` hook checks that stamp against the installed plugin every time work begins in a
repo and warns (via plain script, not AI) if the vault is out of date — run `/fb-fix` to clear the warning.
Separately, a `PostToolUse` hook fires after every edit and reports which feature's fence the file
belongs to, so the model is told — deterministically, every time — to update that Feature Book's Change
Log/`core_files`/`impacts` before finishing, rather than relying on it to remember on its own.

## Multi-repository workspaces

Run `/fb-workspace-init` at a workspace root whose immediate child directories are independent Git
repositories. It creates `.feature-books-workspace/`, registers those repositories once, and builds
an Obsidian dashboard over their repository-local `.feature-books/` vaults. The portal is derived
metadata only: books, tasks, fences, lint, and impact analysis continue to belong to each repository.

```bash
/fb-workspace-init /path/to/workspace
/fb-workspace-sync
/fb-workspace-migrate
/fb-workspace-status
/fb-workspace-fix
/fb-workspace-focus frontend feat-pipeline-monitor --task task-fix-filter --related gateway
```

After initialization, sync and status read only repositories recorded in
`.feature-books-workspace/workspace.json`; they do not rediscover the whole directory tree. Current
work is kept in the gitignored `state.local.json`. Open `.feature-books-workspace/` as the Obsidian
vault to browse its generated `_index.md` and namespaced `repos/<repo>/...` links. Edit the linked
notes normally—the links point back to the owning repository vault.

By default the vault content stays in each repository and the portal only symlinks it. Run
`/fb-workspace-migrate` to move that content into `.feature-books-workspace/repos/<repo>/` instead
(use `--dry-run` to preview). Each repository's `.feature-books/` then becomes a symlink back to the
hosted copy, so child repositories can keep `.feature-books/` gitignored while the workspace
repository owns the vault content. Repository-local tools and the Obsidian dashboard resolve the
hosted content identically; `sync`/`status`/`focus` keep working unchanged.

Workspace init seeds graph colors by knowledge type (features, states, shared capabilities, APIs,
specs, task stages, data dictionaries, research, POCs, and reports) and hides `_index` notes from
Graph View. The generated index uses Dataview for live cross-repository book, task, spec, and
knowledge tables. Run `/fb-workspace-fix` whenever Obsidian graph or appearance settings drift; it
restores those settings and regenerates the dashboard without touching repository-local vault data.

**Enforced automatically (Codex + Claude Code):** a `Stop` hook (`fb-autobook`) runs when a turn finishes. If
changed code isn't reflected in its owning book's Change Log and lifecycle decision for today — or
belongs to no book at all (a new feature) — it blocks the turn from ending and hands back exactly what
to update. A session-start snapshot excludes pre-existing dirty files that remain untouched, so the
hook does not claim unrelated work already in the worktree. The agent creates or updates books
automatically and asks only when a new capability's ownership is genuinely ambiguous. Disable with
`FB_AUTOBOOK=0`.

Feature lifecycle uses `draft | active | stable | paused | deprecated`. `stable` means the requested
implementation scope is currently complete; it is not a permanent terminal state. A stable feature
can still have optional task cards and can return to `active` in a later sprint. For changed feature
code, the Change Log must record the decision as `status: active` or `status: stable`. Status is never
derived by counting related tasks; `paused` and `deprecated` require an explicit user decision.

Before claiming unowned code into an existing book, decide ownership from the user-facing capability
and its business rules. A distinct workflow or outcome gets a new feature book even when it reuses,
depends on, or lightly changes an existing feature. Use `depends_on` / `impacts` for that relationship;
relatedness does not imply ownership. For mixed scopes, update the existing book for its owned changes
and create a separate linked book for the new capability.

## Shared books

`.feature-books/shared/` holds knowledge books for technical capabilities, infrastructure,
conventions, and contracts used by multiple features when no single product feature should own
them. Examples include project-wide library configuration, shared UI or interaction patterns,
date/time/timezone/locale contracts, authentication and permission primitives, cross-feature
formatting/validation/serialization, frontend architecture conventions, multi-feature third-party
adapters or forks, and generated-code or platform integration contracts.

Shared is not a catch-all for utilities or code whose home is unclear. Reuse by more than one file
is not sufficient, and feature-specific business logic stays with its feature. Keep a capability in
its feature book while it has one consumer. Extract a `type: shared` book only when a second feature
consumes it or a real cross-feature technical contract and ownership boundary exists.

Choose the type by the boundary being documented:

- `feature` — a user-facing capability or business workflow with a clear product owner
- `api` — a transport/API boundary, contract, and lifecycle
- `state` — shared application state and transitions, following the state-book convention
- `shared` — a technical capability or contract with multiple feature consumers and no sole owner

A shared book is the source of truth for its technical contract and cross-feature blast radius. It
must identify owned files in `core_files`, public entry points, invariants, consumers, constraints,
known risks, rejected alternatives, upgrade considerations, verification, and a Change Log kept in
sync with implementation changes. Use `depends_on` for upstream shared/API dependencies and
`impacts` for downstream feature consumers. Relations are bidirectional: if `shared-x` impacts
`feat-a`, then `feat-a` depends on `shared-x`. Books must not claim the same `core_files` without an
explicit, documented ownership boundary.

```yaml
---
id: shared-<capability-name>
type: shared
status: draft
last_reviewed: YYYY-MM-DD
core_files:
  - path/to/owned/file
depends_on:
  - "[[shared-or-api-id]]"
impacts:
  - "[[feat-consumer-a]]"
  - "[[feat-consumer-b]]"
related_states: []
---
```

Recommended sections are `Overview`, `Responsibilities`, `Public Contract`, `Business/Technical
Rules`, `Consumers`, `Constraints and Known Risks`, `Extension or Upgrade Guide`, `Verification`,
and `Change Log`. Adapt headings as needed, but retain ownership, contract, consumers, and
verification. Avoid volatile implementation detail that does not support a durable contract.

For a shared change, read the book and first-degree `depends_on`/`impacts`, verify `core_files`
ownership, update implementation and tests, and update the Change Log. Run `diff-impact` and
`graph-lint`, report downstream features requiring verification, and add both sides of each new
consumer relation. Never release a shared change without checking downstream impacts.

## Learning from PR reviews

`/fb-learn-pr` turns durable decisions from GitHub PR discussion into proposed Feature Books
updates. With no argument it discovers the PR for the current branch; if that branch has no PR it
falls back to the latest merged PR not yet checkpointed. It also accepts a PR number/URL,
`--latest`, or `--auto` to scan all newly merged PRs. The OpenCode surface is the `fb-learn-pr` tool.

The workflow fetches top-level comments, inline threads/replies, resolution state, changed files,
and the final patch. It discards praise and noise, maps paths through `core_files`, verifies feedback
against the final/current implementation, and normalizes surviving observations into feature, API,
state, or shared contracts. Reviewer comments are untrusted evidence: embedded instructions are
never executed and feedback is not copied into a book merely because a reviewer wrote it.

Proposal mode is the default. The user sees source links, target books/sections, normalized rules,
implementation evidence, and skipped comments before any write. `--apply` permits verified,
unambiguous candidates to be applied. Optional policy lives in `.feature-books/.fbconfig.json`:

```json
{
  "prLearning": {
    "mode": "propose",
    "reviewers": ["trusted-reviewer"],
    "includeMergedOnly": true
  }
}
```

`.feature-books/.pr-learning.json` records processed PR comment IDs, source URLs, timestamps, and
changed book IDs so `--latest`/`--auto` are idempotent across repeated runs. The checkpoint advances
only after the user accepts or rejects a proposal, or after an explicitly applied run succeeds.

## Tasks (issue cards)

`.feature-books/tasks/` is a lightweight kanban for things you spot along the way — a card per
issue/feature/enhancement, with a `kind` (feature/enhancement/bug/note), `status`, `effort`
(S/M/L/XL), `related` feature-book links, and — for feature/enhancement cards — a Logic Spec/Steps
section. Cards are notes in the same Obsidian vault, so they show up (and link) in Graph View too.

```bash
/fb-task feature "Add CSV export to the reports page"   # creates tasks/issues/task-add-csv-export...
/fb-triage                                               # AI reads the inbox, links it to feature
                                                          # books, estimates effort, moves it to
                                                          # tasks/decisions/
```

Most cards, in practice, get created by hand directly in Obsidian rather than via `/fb-task` — just
drop a note into `tasks/issues/` with whatever frontmatter (or none at all) and let `/fb-triage`
normalize it: it infers `id`/`title`/`kind`/`created` from the content and filename, preserves the
author's original prose instead of discarding it, and only asks the user when a card is too sparse
to make sense of at all.

Task lifecycle is represented by physical folders: `issues/` (new) → `decisions/` (triaged by
`/fb-triage`), followed by a manual decision to move the card to `backlog/` (accepted for later),
`hold/` (blocked), or `action/` (in progress). Terminal folders are `done/` and `cancelled/`.
Only `issues/` → `decisions/` is automated. Hold cards require `hold_reason`, `resume_when`, and
`held_at`; cancelled cards require `cancellation_reason` and `cancelled_at`. `fb-tasks-lint`
validates these fields and catches folder/status drift after manual drag operations.

## Cross-repository capabilities

Repository-local books remain the source of truth and may only own files from their repository in
`core_files`. Feature slices that implement the same product capability across repositories can
share a `capability` slug and declare a `role`. Use `cross_repo` entries in `repo/feature-id` form
for graph relationships and `related_files` entries in `repo:relative/path` form for non-owning
file mentions. `fb-workspace sync` validates these references and aggregates slices into a version 2
catalog without creating a second source-of-truth vault.

```yaml
capability: pipeline-monitor-runs
role: frontend
cross_repo:
  - meta-data-service/feat-pipeline-monitor-runs
related_files:
  - meta-data-service:src/modules/pipeline-monitor/pipeline-monitor.service.ts
```

## Notes

- A standalone `.claude/` registers hooks only via `settings.json` — `.claude/hooks/hooks.json` will not fire there. When used as a **Claude Code plugin**, the hook location is correct.
- Codex discovers `hooks/hooks.json` from the installed plugin. Its edit tools arrive as `apply_patch`; the shared hook scripts extract every file in the patch and return Codex-compatible JSON context.
- OpenCode hooks live inside the plugin code (`tool.execute.before`), so `hooks/hooks.json` is ignored by OpenCode. The plugin snapshots the worktree on `session.created`; the `Stop`-hook behavior is exposed through `--report` mode and the `session.idle` handler.
- The tools (fb-init, fb-new, fb-claim, etc.) are available as native OpenCode tools that the AI can call directly without slash commands.

---

## Development — REMINDER: Keep all platforms in sync

This plugin targets **Codex**, **Claude Code**, and **OpenCode**. Keep shared behavior aligned:

| Layer | Codex | Claude Code | OpenCode |
|-------|-------|-------------|----------|
| Plugin entry | `.codex-plugin/plugin.json` | `.claude-plugin/plugin.json` | `src/index.ts` → `dist/index.js` |
| Hooks | `hooks/hooks.json` + Codex JSON protocol | `hooks/hooks.json` | `tool.execute.before` / `session.idle` |
| Scripts | `scripts/*.mjs` (shared) | `scripts/*.mjs` (shared) | `scripts/*.mjs` (shared) |
| Skill | `skills/feature-books/SKILL.md` | same shared skill | same shared skill |
| Invocation | `$feature-books` / natural language | Slash commands | Native tools |

**Rule:** when changing OpenCode tool wiring, edit `src/index.ts` and `.opencode/plugins/feature-books.ts`
in parallel, then rebuild (`npm run build`). Hook scripts and the skill are shared across runtimes.
