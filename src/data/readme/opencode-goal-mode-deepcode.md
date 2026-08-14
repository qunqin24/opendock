# OpenCode Goal Mode

**Goal Mode for [OpenCode](https://opencode.ai).**  
One primary agent, one server plugin, seven tools + nine slash commands. Deterministic verification, budgets, scope + risk guards, persistence, goal history — no sidebar, no reviewer army.

[![npm version](https://img.shields.io/npm/v/opencode-goal-mode-deepcode)](https://www.npmjs.com/package/opencode-goal-mode-deepcode)
[![license](https://img.shields.io/npm/l/opencode-goal-mode-deepcode)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/deepcode-ai-sys/opencode-goal-mode-deepcode/ci.yml?branch=main&label=CI)](https://github.com/deepcode-ai-sys/opencode-goal-mode-deepcode/actions)

## What it is

You pick the **goal** agent and give a real task. When the work deserves a finish line, the agent calls **`goal_set`** with a **verifiable** goal — a single condition, or an objective with criteria that carry verification commands (tests green, build passes, file contains X).

After each turn the session goes **idle**. Goal Mode checks the goal — deterministic criteria first (command exit codes from tool evidence), then a separate **evaluator** model reads the transcript and answers:

- **YES** — goal met → completed + summary, loop stops  
- **NO** — not yet → plugin sends a short continuation prompt and the **goal** agent keeps going  

That is the core loop: **work → idle → judge → continue or stop** — wrapped in a status machine, budgets, a scope guard, and persistence.

Casual chat without `goal_set` behaves like a normal agent — no hidden loops.

## OpenCode layout

OpenCode loads this from your config directory:

```
~/.config/opencode/
  agents/goal.md              # primary agent (goal_set / goal_update / goal_blocked / … via tools)
  commands/goal-*.md          # /goal, /goal-status, /goal-inspect, /goal-history, /goal-pause,
                              # /goal-resume, /goal-stop, /goal-discard, /goal-replace
  plugins/goal-mode.js        # server plugin entry
  plugins/goal-mode/          # plugin implementation
  skills/goal-mode/SKILL.md   # optional instruction layer for the goal agent
  opencode.jsonc              # register the plugin (see below)
```

No TUI plugin. No `tui.json` entry for goal mode. The plugin id is **`opencode-goal-mode`** (server only).

### Register the plugin

In `opencode.jsonc` (paths relative to that config dir):

```jsonc
{
  "plugin": [
    [
      "./plugins/goal-mode.js",
      {
        "evaluatorModel": "your-provider/your-model-id"
      }
    ]
  ],
  "default_agent": "goal"
}
```

`evaluatorModel` is optional — empty means reuse the same model as the goal session.

### Install (npm – recommended)

```bash
npm install -g opencode-goal-mode-deepcode
```

The post-install step prints a one-liner. Run it:

```bash
opencode-goal-mode-install --global --link     # symlinks (recommended)
# or
opencode-goal-mode-install --global            # copy install
```

Restart OpenCode.

### Uninstall (npm)

```bash
opencode-goal-mode-install --global --uninstall   # removes only files it owns
npm uninstall -g opencode-goal-mode-deepcode
```

If you manually added files later, delete them from `~/.config/opencode/agents/` and `~/.config/opencode/plugins/`.

### From this repo (dev)

```bash
node scripts/install.mjs --global --link   # symlinks
node scripts/install.mjs --global          # copy + manifest
```

Same uninstall command works.

## How to use

1. Open OpenCode TUI (or `opencode run -a goal "…"`).
2. Agent **goal** (Tab if needed) — or `/goal <objective>` for the guided start.
3. Describe work; the agent calls **`goal_set`** with a measurable goal (objective + criteria with verification commands) when there is a real finish line.
4. Agent uses normal tools (bash, edit, …); verification results are recorded with **`goal_update`** as it works.
5. Let turns complete; auto-continue only happens while a goal is active on the **goal** agent.
6. **`goal_clear`** / `/goal-stop` ends the loop; `/goal-status`, `/goal-pause`, `/goal-resume` manage it.

**Plugin tools:** `goal_set`, `goal_update`, `goal_blocked`, `goal_pause`, `goal_resume`, `goal_clear`, `goal_status`.

**Slash commands:** `/goal`, `/goal-status`, `/goal-inspect`, `/goal-history`, `/goal-pause`, `/goal-resume`, `/goal-stop`, `/goal-discard`, `/goal-replace` (installed into `~/.config/opencode/commands/`).

**Good goals** are checkable from the conversation: command exit codes, test output, file contents. Each criterion can carry a `verification` command — those are checked deterministically from tool evidence before the LLM evaluator runs.

## Configure

See [CUSTOMIZE.md](./CUSTOMIZE.md). Short version:

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch |
| `evaluatorModel` | *(session model)* | `provider/model` for YES/NO |
| `maxTurns` | `0` | Cap auto-continues (`0` = unlimited) |
| `noProgressLimit` | `3` | Pause if evaluator repeats the same NO |
| `abortSuppressMs` | `120000` | After user cancel, no auto-continue |
| `idleGraceMs` | `1200` | Wait after idle before evaluating |
| `maxConditionLength` | `4000` | Max chars in a `goal_set` condition |
| `transcriptMaxChars` | `24000` | Max transcript chars sent to evaluator |
| `idleTimeoutMs` | `120000` | Cap one idle-resolve attempt |
| `evaluatorRetryLimit` | `5` | Retries when evaluator is unavailable |
| `evaluatorRetryIntervalMs` | `15000` | Delay between those retries |
| `completionMarker` | `Goal Completed` | Fallback if evaluator unavailable |
| `tokenBudget` | `0` | Approx. token cap per goal (`0` = unlimited) |
| `timeBudgetSeconds` | `0` | Wall-clock cap per goal (`0` = unlimited) |
| `maxStuckCount` | `3` | No-progress NOs before the goal is stuck |
| `scopeGuard` | `true` | Block edits outside the goal scope |
| `defaultScope` | `{}` | Project default `{allowed, forbidden}` scope |
| `maxEvidenceEntries` | `40` | FIFO cap on stored evidence per goal |
| `maxCriteria` / `maxMilestones` | `12` | Caps for structured goals |
| `compileGoal` | `true` | LLM-compile objective → criteria on `goal_set` |
| `persistenceFile` | `.opencode/state/goals.json` | Resume active goals across restarts |
| `historyDir` | `.goal/history` | JSON completion reports |
| `riskGuard` | `true` | Block risky bash commands while a goal is active |
| `riskPatterns` | *(list)* | Regex patterns for the risk guard (deploy, force push, migrations…) |
| `escalationModel` | `""` | Model for continuation turns after repeated strategy resets |
| `escalateAfterStrategyResets` | `2` | Strategy resets before `escalationModel` takes over |

Environment: `GOAL_MODE_*` mirrors keys (`GOAL_MODE_EVALUATOR_MODEL`, etc.).

## How it really works

Read [GOAL.md](./GOAL.md) for the user-facing walkthrough, or [ARCHITECTURE.md](./ARCHITECTURE.md) for hooks and code layout.

## Benchmark

`scripts/benchmark.mjs` runs the same objective on the **goal** agent across
models and compares the Goal Mode history reports (outcome, turns, tokens,
time). Requires the `opencode` CLI on PATH and Goal Mode installed in the
target repo.

```bash
# one objective, several models
npm run benchmark -- --objective "Fix the typo in the README title" \
  --models "anthropic/claude-sonnet-4-5,ordis/deepseek/deepseek-v4-flash"

# in a specific repo, capped turns
node scripts/benchmark.mjs --cwd ./app --turns 20 --out work/results.json

# custom cases file: { "cases": [{ "name": "x", "model": "p/m", "objective": "…" }] }
node scripts/benchmark.mjs --cases ./bench-cases.json
```

Results are written as JSON (default `work/benchmark-results.json`) and printed
as a summary table.

## What's deliberately not included

- **Multiple workers / parallel milestones / sub-agent orchestration** — needs
  OpenCode core support; a single goal/session keeps the controller simple.
- **SQLite persistence** — JSON files keep the plugin dependency-free.
- **Sidebar/TUI UI** — status goes through `goal_status` and `/goal-status`.
- **Permission bypass** — Goal Mode never bypasses OpenCode permissions; scope
  and risk guards only *restrict*, they never widen.

## Contributing & security

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [SECURITY.md](./SECURITY.md).

## Development

```bash
npm ci
npm test
npm run lint
```

## Publishing (maintainers)

- Tag a release: `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`
- The `publish.yml` workflow runs on the tag (or via **Run workflow**) and publishes to npm.
- README + package.json already expose the `opencode-goal-mode` and `opencode-goal-mode-install` bins.

## License

MIT
