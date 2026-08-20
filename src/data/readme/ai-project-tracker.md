# ai-project-tracker

> **🌐 [English](README.md) · [فارسی (Persian)](README.fa.md)**

Real-time project progress tracker **for AI coding tools** — opencode, Claude Code, any MCP-capable IDE (Cursor, Windsurf, Cline, Claude Desktop, VS Code Copilot, ...) and web AI platforms (Replit, Lovable, Bolt, v0) via a file protocol.

Tracks every operation (edit, test, deploy, docs, commit, ...) during a coding session, maps it to one of **7 project phases**, computes per-phase and overall **percentages**, a **growth rate**, and renders a **modern HTML dashboard** with SVG charts — fully **local, no data leaves your machine**.

![dashboard](https://img.shields.io/badge/dashboard-dark%20theme-8b5cf6) ![platform](https://img.shields.io/badge/platform-opencode%20%7C%20claude%20%7C%20mcp%20%7C%20cli%20%7C%20web-22d3ee) ![license](https://img.shields.io/badge/license-MIT-green)

## One engine, four adapters

| Adapter | Where it runs | How it tracks |
|---|---|---|
| **opencode plugin** | opencode | full auto — every tool call + chat + sessions |
| **Claude Code hooks** | Claude Code | full auto — `PostToolUse` / `UserPromptSubmit` / `SessionStart` / `Stop` |
| **MCP server** | Cursor, Windsurf, Cline, Claude Desktop, VS Code Copilot, ... | tools: `tracker_note`, `tracker_summary`, `tracker_open`, `tracker_report`, `tracker_init`, `tracker_list` |
| **CLI + file protocol** | any terminal + web AI platforms | `pt init / status / note / report / open / list` — web agents update `progress.json` / `USL_PROGRESS.md`, you regenerate the dashboard |

All adapters share the same **core engine** (`core/tracker-core.mjs`) and the same state files, so the same project can be tracked from multiple tools without conflicts.

## Install

### 📚 Detailed platform guides

| Platform | Guide |
|---|---|
| opencode | [`docs/OPENCODE.md`](docs/OPENCODE.md) — plugin placement, `/tracker` command, npm install |
| Claude Code | [`docs/CLAUDE-CODE.md`](docs/CLAUDE-CODE.md) — hooks, MCP, `/tracker`, troubleshooting |
| Any MCP client (Cursor, Windsurf, Cline, Claude Desktop, Copilot) | [`docs/MCP.md`](docs/MCP.md) — one-command installer, manual JSON per client, tool reference |
| CLI | [`docs/CLI.md`](docs/CLI.md) — full command reference with examples |
| Web AI platforms (Replit, Lovable, Bolt, v0) | [`docs/WEB-PLATFORMS.md`](docs/WEB-PLATFORMS.md) — file protocol, agent instructions |

### Option A — opencode (plugin)

Put the plugin file in the plugin directory and restart opencode:

- Project-level: `.opencode/plugins/project-tracker.ts`
- Global (all projects): `~/.config/opencode/plugins/project-tracker.ts`

Optionally add the `/tracker` command (shows a text summary in chat + opens the dashboard):

- `.opencode/command/tracker.md` or `~/.config/opencode/command/tracker.md`

### Option B — MCP server (Cursor, Windsurf, Cline, Claude Desktop, Copilot, Claude Code, ...)

Register `mcp/server.mjs` as a **stdio MCP server** (zero dependencies — no npm install).

**One-command installer** (merge-safe, idempotent, backs up before editing):

```sh
node mcp/install.mjs                # registers in: Claude Code, Claude Desktop, Cursor, Windsurf
node mcp/install.mjs --vscode       # also register in the current workspace (VS Code Copilot)
node mcp/install.mjs --list         # show registration status
```

Manual registration (equivalent):

- **Cursor**: Settings → MCP → Add → Command: `node /path/to/repo/mcp/server.mjs`
- **Windsurf**: Settings → MCP → Add → same command
- **Cline** (VS Code): MCP Servers → Add → stdio → `node /path/to/repo/mcp/server.mjs`
- **Claude Desktop**: `claude_desktop_config.json` → `"mcpServers": { "project-tracker": { "command": "node", "args": ["/path/to/repo/mcp/server.mjs"] } }`
- **Claude Code**: `~/.claude.json` → `"mcpServers"` (same shape) or `claude mcp add`
- **VS Code Copilot**: workspace `.vscode/mcp.json` → `"mcpServers"` (same shape)

Then ask your AI to call the tools (`tracker_summary`, `tracker_note`, `tracker_open`, ...). The server uses the working directory as the project; pass `project: "name-or-path-fragment"` to target any tracked project.

### Option C — Claude Code (hooks)

```sh
node hooks/claude-code/install.mjs            # global (~/.claude/settings.json)
node hooks/claude-code/install.mjs --project # this project only (.claude/settings.json)
```

Restart Claude Code. Every tool call is auto-recorded; dashboard via `node cli/pt.mjs open`.

### Option D — Web AI platforms (Replit, Lovable, Bolt, v0, ...)

No plugin needed — the agent updates a progress file, you generate the dashboard locally:

1. Paste `web/AGENT_INSTRUCTIONS.md` into your web agent's instructions.
2. Work with the agent (it maintains `USL_PROGRESS.md` / `progress.json`).
3. On your machine: `node cli/pt.mjs report` → then `node cli/pt.mjs open`.

See `web/README.md` for details.

### Option E — npm (opencode.json)

```json
{
  "plugin": ["ai-project-tracker"]
}
```

> `npm i -g ai-project-tracker` also provides the `pt` CLI anywhere.

## Usage

While working with opencode, the plugin records every tool operation in real time. To view progress:

1. Type `/tracker` (or `/t`) in the opencode prompt — a bilingual (EN/FA) numeric summary appears in chat and the dashboard opens in your browser.
2. Or press `ctrl+p` and pick **tracker** from the command list.
3. The dashboard auto-updates after every operation (throttled ~4s).

### Importing existing git history (backfill past phases)

If a project already has commits (before the tracker was installed), import them so the phase percentages and stats reflect past work — **idempotent** (re-runs only add new commits):

```sh
pt import-git                      # all commits in the current repo
pt import-git "2 weeks ago"        # only recent commits
```

or via MCP: `tracker_import_git` (args: `project`, `since`).

Each commit maps to a phase by its message: `feat/fix/refactor` → Implementation, `test` → Testing & QA, `docs` → Documentation, `ci/deploy/docker/release` → Deployment, `merge/version` → Review & Delivery. Commits count as verified successes with their real timestamps (so the growth chart stays honest).

### Notes with phase & weight (retroactive scoring)

By default notes only add to the timeline. Pass an optional `phase` + `weight` to also add score to a phase (e.g. recording completed work that was done outside the tracker):

```sh
pt note success "staging released manually" --phase deploy --weight 3
```

MCP equivalent: `tracker_note` with `{ "text": "...", "type": "success", "phase": "deploy", "weight": 3 }`.

## How it works

- Each tool call is classified into a phase with a weight (tests/deploys weigh more than reads).
- Phase progress = `score / goal` (goals are pre-defined per phase).
- Overall progress = total score / total goals, capped at 100%.
- Growth rate = score delta over the last 60 minutes, per hour.
- ETA = remaining points / growth rate (appears once enough history exists).
- Output files:

```
<project>/.opencode/project-tracker/
├── state.json    # machine-readable progress state
├── report.html   # self-contained visual dashboard (no internet needed)
├── report.md     # markdown summary
└── config.json   # optional: your customization (see below)
```

Global registry (all projects you track): `~/.config/opencode/project-tracker/projects.json`

## Configuration

Create `config.json` in `.opencode/project-tracker/` (per-project) or `~/.config/opencode/project-tracker/config.json` (global — project config overrides global):

```json
{
  "goals": { "coding": 80, "testing": 40 },
  "weights": { "edit": 2, "bash": 1 },
  "names": {
    "coding": { "en": "Coding", "fa": "کدنویسی" }
  }
}
```

- `goals` — target score per phase (keys: `research`, `setup`, `coding`, `testing`, `docs`, `deploy`, `delivery`)
- `weights` — override the weight of a specific tool (e.g. `edit`, `bash`, `read`, `write`, `task`)
- `names` — rename a phase in the dashboard (EN/FA)

### Custom phase lists (any number of phases)

If your project has a different workflow, replace the 7 default phases entirely with your own — more or fewer, any count:

```json
{
  "phases": [
    { "key": "planning", "en": "Planning", "fa": "برنامه‌ریزی", "desc_en": "Scope", "desc_fa": "دامنه", "goal": 20 },
    { "key": "build",    "en": "Build",    "fa": "ساخت",       "desc_en": "Code", "desc_fa": "کد",   "goal": 50 },
    { "key": "qa",       "en": "QA",       "fa": "کنترل کیفیت","desc_en": "Tests","desc_fa": "تست‌ها","goal": 20 },
    { "key": "release",  "en": "Release",  "fa": "انتشار",     "desc_en": "Ship", "desc_fa": "تحویل", "goal": 10 }
  ],
  "remap": { "coding": "build", "testing": "qa", "deploy": "release", "delivery": "release" },
  "default_phase": "planning"
}
```

- `phases` — your own list (fields `key`, `en`, `fa`, `desc_en`, `desc_fa`, `goal`, `color`; `key` is required, the rest fall back to defaults, colors auto-assigned from a palette)
- `remap` — map the built-in classification keys (`research`, `setup`, `coding`, `testing`, `docs`, `deploy`, `delivery`) to your phase keys
- `default_phase` — where unmatched operations go (default: first phase)

## Progress notes (bugs, errors, successes)

Every operation gets an automatic **status** — ✅ success / ❌ error / ⚠️ warning — with a short description of what actually happened (test output, file touched, error text). Totals are shown on the dashboard and in `report.md`.

You can also record explicit notes — e.g. a bug found, an error fixed, a successful deploy — by asking the assistant to call the built-in `tracker_note` tool:

```
Use tracker_note with text: "fixed auth bug — token expiry" and type: "success"
```

Types: `success`, `error`, `warning`, `info`. Notes appear instantly in the activity log and count toward the error/success totals.

## Recommendations & Solutions

The dashboard has a **💡 Recommendations & Solutions** section that combines:

1. **Automatic insights** — derived from the recorded data:
   - ❌ errors grouped per phase, each with a targeted fix (failed tests → run with `--nocapture`; `not found` → check path/imports; denied → check permissions; `panic/unwrap` → null handling; ports, timeouts, etc.)
   - ⚠️ high error-rate warning (≥ 20%)
   - 🧪 missing tests, 💾 edits without commits, 📚 no documentation, 🚀 phases not started yet, ✅ healthy pace, 🎉 project complete

2. **Agent suggestions & solutions** — record your own recommendations, they appear on top with 💡/🔧:

```
Use tracker_note with text: "prefer lockfile for reproducible builds" and type: "suggestion"
Use tracker_note with text: "split the big query into two to fix the timeout" and type: "solution"
```

Types: `suggestion`, `solution`, `recommendation` (also visible as a stat card). The same list is included in `report.md`.

## Automatic import of existing progress

Starting a tracker on an **existing project**? No more empty dashboard. The plugin automatically scans the project for progress files and imports completed steps into the phase scores:

- root level: `USL_PROGRESS.md`, `PROGRESS.md`, `progress*.json`, `ROADMAP.md`, `roadmap*.json`
- subfolders: `reports/`, `docs/`, `planning/`, `plans/`, `progress/` (2 levels deep)

**Supported formats (auto-detected, no configuration needed):**

1. JSON array of steps:
```json
[
  { "id": "s1", "name": "schema migration 011", "phase": "testing", "status": "committed", "score": 2 },
  { "id": "s2", "name": "GDPR erasure endpoint", "phase": "coding", "status": "done" },
  { "id": "s3", "name": "audit retention docs", "phase": "docs", "status": "todo" }
]
```
Statuses `done`/`complete`/`committed`/`ok`/`شده` score points; `todo` items register the phase without points. Phase field auto-detected (`phase`/`fase`/`stage`/`category`/`area`/`key`), score field auto-detected (`score`/`points`/`weight`/`value`, default 1).

2. JSON map: `{ "phases": { "coding": 80, "testing": 30 } }` or plain `{ "coding": 80 }`.

3. Markdown checklist with `## Phase` headings (or `(phase: key)` inline):
```md
## Testing
- [x] run integration suite
- [ ] add coverage for privacy module
- [x] smoke flow (phase: deploy)
```

**Behavior:** imports are idempotent — restarting opencode never double-counts (tracked by file mtime + item ids); when a progress file changes, new steps are imported automatically. The header shows `📥 واردشده: N گام از <files>`, a stat card counts imported steps, and the chart starts from the imported total. Disable with `"auto_seed": false` in `config.json`.

## Verified outcomes (results, not just activity)

Activity counting is complemented by **verified outcomes** — real results earn bonus points and a ★ badge:

| Signal | Bonus | Phase |
|---|---|---|
| `test result: ok. N passed` / tests passed | +2 | testing |
| successful `docker push` / `compose up` / `kubectl apply` / `helm install` | +2 | deploy |
| successful `git commit` / `git push` / `gh pr` | +1 | delivery |
| `Finished` build (`cargo build`, `make`, `compile`) | +1 | coding/delivery |
| `tracker_note` with type `success` | +1 | active phase |

Counted as **⭐ گامهای تأییدشده** (Verified) — stat card, star in the activity log, and a dedicated recommendation. A `success` note asserts a verified outcome; `error` notes assert failures. Failed runs (`test result: FAILED`, `denied`, `refused`, `forbidden`, `error`) never earn bonuses and count as errors.

## Warning reporting (no more silent failures)

Anything the plugin skips is now visible instead of silent:

- unreadable/invalid `config.json` → ⚠️ warning line in dashboard + `report.md`
- progress files with unknown formats → "ورود داده رد شد" with skipped count
- steps whose phase doesn't match any project phase → "N گام رد شد — فاز همخوانی ندارد"

Shown as amber ⚠️ lines under the header and in the **⚠️ اخطارها و موارد نادیدهشده** section of `report.md` (last 5, capped at 20).

## Data safety & inactivity (v1.3.5)

- **Corrupt state protection** — if `state.json` is ever unreadable, it is **not silently reset**: the file is renamed to `state.json.corrupt-<timestamp>` (backup), a warning is recorded, and counting restarts cleanly.
- **Milestones on imported data** — importing an existing project's progress (auto-seed) now fires the 25/50/75/100% milestones right away, even before any new tool call.
- **Idle detection** — if the project has been inactive for 2+ hours, the dashboard shows a ⏸️ recommendation ("پروژه از N ساعت پیش بدون فعالیت است") to resume the active phase. `updated_at` now reflects real activity (tool calls, notes, user messages), not file flushes.

## Recent work summary (assistant messages)

Every assistant reply is captured (rolled, newest 20, 160 chars each) and shown in the **📋 خلاصهٔ کارهای اخیر (دستیار)** section of the dashboard and `report.md` — a quick narrative of what was actually done, next to the raw tool-activity feed. Also counted as a dedicated stat card (💬 پیامهای دستیار).

## /tracker for any tracked project

`/tracker` (or `/t`) now accepts an argument — a project **name or path fragment** — and shows that project's summary instead of the current one:

```
/tracker                    → current project
/tracker proj-b             → project whose id/name/path matches "proj-b"
/tracker my-other-project   → partial match against the global registry
```

The new built-in `tracker_open` tool resolves the project from the global registry (`~/.config/opencode/project-tracker/projects.json`) and opens its `report.html` in the browser — no manual path guessing. Unknown projects return the list of tracked projects so you can pick one.

## Customization

Edit `PHASE_DEFAULTS` in `project-tracker.ts` to change phase names, goals or colors.

## Development

```sh
# syntax check
npx esbuild project-tracker.ts --bundle --platform=node --format=esm --external:@opencode-ai/plugin --outfile=/tmp/check.mjs
```

## License

MIT
