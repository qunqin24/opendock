# opencode-autogoal

[![CI](https://github.com/VerbalChainsaw/opencode-autogoal/actions/workflows/ci.yml/badge.svg)](https://github.com/VerbalChainsaw/opencode-autogoal/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-autogoal.svg)](https://www.npmjs.com/package/opencode-autogoal)
[![license](https://img.shields.io/npm/l/opencode-autogoal.svg)](LICENSE)

**Give OpenCode a goal and it keeps working until the goal is met.**

The easiest way to use it is to **just say what you want** — no syntax to remember:

> **You:** "Keep working until the tests pass and don't stop on your own."
> **OpenCode:** *(sets the goal itself)* "Goal set: tests pass — I'll keep going and check after each step. 🎯"

`opencode-autogoal` adds that behavior to [OpenCode](https://opencode.ai): conversational **tools** (so the agent
sets and manages goals when you ask in plain English), a `/goal` command if you prefer typing, and a
background auto-loop that re-checks the goal after every turn and nudges the agent onward until the
condition holds (or a turn/time limit trips).

Designed for **OpenCode Desktop (Electron)** and the **terminal** — the engine is a server plugin (what
Desktop runs). Its only dependency is `@opencode-ai/plugin` (the plugin API your OpenCode already provides).
An optional terminal-only dashboard ships alongside.

Requires **OpenCode ≥ 1.16** (uses the `session.idle` and `experimental.session.compacting` hooks).

---

## Install

```bash
opencode plugin opencode-autogoal
```

That single line enables the **conversational tools** — you can immediately say *"keep going until the
tests pass"* and OpenCode sets the goal itself. No command needed.

If you *also* want the `/goal` slash command, add the `command` block (it makes `/goal` exist; the plugin
attempts this automatically via the `config` hook too, but declaring it is the reliable path):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-autogoal"],
  "command": {
    "goal": {
      "description": "Set, view, pause, resume, or clear a task goal.",
      "agent": "build",
      "template": "Process the /goal command with arguments: $ARGUMENTS"
    }
  }
}
```

> If your project doesn't use a `build` agent, change `agent` to one you have. See
> [`examples/opencode.jsonc`](examples/opencode.jsonc).

---

## Usage

### Just talk to it (recommended)

The plugin gives OpenCode five tools, so you manage goals in plain language — it picks the right one:

| Say something like… | Tool the agent calls |
|---|---|
| "keep going until the tests pass", "don't stop until the build is green" | `set_goal` |
| "what's my goal?", "how's it going?" | `goal_status` |
| "pause the goal for a sec" | `pause_goal` |
| "ok, back to the goal" | `resume_goal` |
| "stop the goal", "we're done with that" | `clear_goal` |

Tip: mention a check command and it's verified deterministically — *"keep going until `npm test` passes."*

> **Note:** the conversational path needs a model that's good at tool-calling (e.g. Claude, GPT-class,
> strong DeepSeek). Smaller/free models may not invoke `set_goal` from plain English — on those, use the
> `/goal` command below, which is deterministic on **any** model.

### Or use the `/goal` command (if you prefer typing)

```
/goal set "<condition>"                 set a goal (the agent starts working immediately)
/goal set "<condition>" --command "<c>" verify completion by running a shell command (exit 0 = met)
/goal set "<condition>" stop after 10 turns
/goal                                   show current goal + progress (bare /goal = view)
/goal pause | resume | clear            control the loop (clear aliases: stop, off, reset, none, cancel)
/goal template <name>                   set a goal from a built-in or project template
/goal history                           show recent evaluation results

# v0.2.0+ live dials — change the goal mid-run
/goal turns <n>                         set maxTurns (1..10000)
/goal time <n>                          set maxTimeMinutes (1..10000)
/goal tokens <n>                        set maxTokens (1..10000000)
/goal condition "<new text>"            edit the condition, keep id/evals/constraints
/goal steer "<hint>"                    append a steering note for the next nudge
/goal unsteer                           drop all steering notes
/goal restart                           clear + re-set with same condition (new id)
/goal handoff [note]                    serialize state to .opencode/.goal-handoff.json
/goal claim                             resume a handoff
```

Inline modifiers: `stop after N turns`, `stop after N minutes`, `stop after Nk tokens`,
`--command "<check>"` (also `--turns N`, `--time N`). Everything else is the condition.

Both paths share the same engine and state — use whichever feels natural.

The 9 dials above are also bound to the TUI keymap (with the
`opencode-autogoal/tui` plugin loaded) — run `/goal-turns` from the
command palette to get a dialog, or `/goal-steer "next time try X"`
to drop a hint for the next nudge without changing the goal.

### Examples

```
/goal set "all unit tests pass" --command "npm test"
/goal set "remove every TODO comment in src/ and explain each removal" stop after 8 turns
/goal template fix-lint
```

### Good to know

- **An active goal steers the conversation.** Until the goal is met, the agent treats it as top priority
  and gets nudged back to it each turn. Use **`/goal pause`** (or `/goal clear`) before switching to
  unrelated work. Bare **`/goal`** shows the current status.
- **The `stop after N …` phrasing is parsed anywhere in the condition.** So `/goal set "make it stop
  after 5 turns of retrying"` would read `5` as a turn limit. For literal text like that, set limits with
  the unambiguous flags instead (`--turns`, `--time`) and keep them out of the condition prose.
- **Status commands cost one model turn.** `/goal view|clear|pause|resume|history` are handled by the
  agent relaying the result, so they aren't instantaneous like a native UI button.

---

## How it works

Two kinds of goal, two kinds of evaluation:

- **Verifiable goals** (`--command`): after each turn the plugin runs your command in the project
  directory. **Exit 0 = achieved.** Cross-platform (uses the OS shell), deterministic, the reliable path.
- **Open-ended goals** (no command): the plugin reads the agent's latest message **read-only** and looks
  for an explicit completion signal — it never injects evaluation prompts or guesses. The agent declares
  done with a line beginning `GOAL_COMPLETE:` (and `GOAL_BLOCKED:` if it's stuck). These markers are
  **line-anchored and code-fence-aware** — the agent merely *talking about* the protocol, or showing an
  example inside a markdown code block, will not trip the goal. (The detector ignores lines inside
  ```` ``` ```` or `~~~` fences, and lines indented 4+ spaces — markdown's "indented code block"
  threshold — so the marker is only matched when the agent writes it on its own prose line.)

When a goal isn't met yet, one continue-nudge is injected to drive the next turn. Turn and time limits
stop a runaway loop. On any terminal state (achieved / stopped / blocked) you get a notification **both**
as a TUI toast (terminal) **and** as a status line in the conversation — the latter is what surfaces on
Desktop, where TUI toasts don't render.

State lives in `.opencode/.goal-state.json` (atomic writes; auto-gitignored).

### Templates

Built-in: `fix-lint`, `fix-types`, `pass-tests`. Add your own at `.opencode/goals/<name>.json`:

```json
{
  "description": "Ship the migration",
  "condition": "the migration script runs cleanly and the app boots",
  "command": "npm run migrate && npm run smoke",
  "constraints": { "maxTurns": 20, "maxTimeMinutes": 30 }
}
```

A project file with the same name overrides a built-in.

---

## Desktop vs. terminal

OpenCode **Desktop (Electron)** is driven entirely by *server* plugins — it does **not** load TUI plugins.
Everything above works on Desktop via the server plugin. The interactive console below is **terminal-only**.
It does not start an extra HTTP server and does not add runtime dependencies.

### OpenCode terminal console

The OpenCode TUI plugin (`opencode-autogoal/tui`) adds a full-screen goal
dashboard plus palette commands, slash commands, dialogs, and keybindings:

- `alt+g` opens the goal dashboard.
- `alt+n` opens a set-goal dialog.
- `alt+s` opens a steering-note dialog.
- `alt+p` pauses/resumes the goal.
- `alt+c` confirms goal clear.
- `Esc` closes the dashboard without trapping the host palette.

It is **terminal-only** and **off by default**. Enable it in `tui.json` when you run OpenCode in a terminal:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-autogoal/tui"]
}
```

### OpenCode terminal sidebar (v0.2.0+)

A persistent goal sidebar ships as `opencode-autogoal/sidebar`. It shows
the live goal state in every session, without the user having to navigate to a full-screen
dashboard. The sidebar slots (sidebar_title / sidebar_content / sidebar_footer) carry:

  - **status icon + condition** (sanitized against newlines and zero-width chars)
  - **progress bar** + turn/time/tokens counters (thousands separators)
  - **last evaluation reason**
  - **steering note count** + **handoff indicator** (when present)
  - **last 3 evaluations** strip with ✓ met, ! blocked, · in-progress tags
  - **last condition-edit timestamp** ("3m ago", "2h ago", etc.)

The sidebar reuses the validated I/O from `tui-logic.ts` and the dial primitives from
`goal-state.ts` — it cannot drift from the dashboard, and a hostile state file cannot
break its layout (single source of sanitizer truth: `sanitizeForPrompt` in `goal-state.ts`).

It is **terminal-only** and **off by default**. Enable it alongside the
dashboard in your `tui.json`; the sidebar footer advertises the dashboard
hotkeys plus slash-command fallbacks:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-autogoal/tui", "opencode-autogoal/sidebar"]
}
```

They have no effect on Desktop. A Desktop/web-console goal panel would require
OpenCode app-side integration; this package does not ship a separate web server
as a substitute for that.

---

## Development

```bash
npm install
npm run build       # tsc → dist/ (the server plugin; zero runtime deps)
npm test            # build, then run the regression suite (node --test)
npm run typecheck   # type-check src/ (server + tui)
```

- `src/goal-state.ts` — types, arg parsing, atomic state I/O, transitions, marker detection, status formatting, `parseShellWords` (POSIX-style command word splitting for debug diagnostics).
- `src/command.ts` — the `/goal` dispatcher (pure, deterministic).
- `src/server.ts` — the plugin wiring: command hook + the auto-loop.
- `src/tui.tsx` — optional terminal dashboard (shipped as source). Hosts the keymap layer (12+ commands including the v0.2.0 dials), the file-watcher-driven `useGoalState` hook, and the dialog openers.
- `src/tui-logic.ts` — TUI pure logic: validated reads, progress-bar math, file-watcher predicate. Unit-tested separately from the JSX layer.
- `src/tui-dials-logic.ts` — v0.2.0+ dial submit handlers: parse + validate + call the goal-state primitive + return a result. 53 tests in `test/tui-dials-logic.test.mjs`. The pure sibling to the dialog logic in `tui.tsx`.
- `src/sidebar.tsx` — optional terminal sidebar (shipped as source, opt-in via `opencode-autogoal/sidebar`). Registers against the host's `sidebar_title` / `sidebar_content` / `sidebar_footer` slot map.
- `src/sidebar-logic.ts` — sidebar pure view-model builder: title/content/footer strings. Reuses `sanitizeForPrompt` from goal-state.ts so the sidebar display surface and the auto-loop's prompt-injection guard stay in lockstep. Unit-tested separately from the JSX layer.
- `src/templates.ts` — built-in goal templates.

The package ships compiled JS (`dist/`) so it loads regardless of whether the host runtime is Node or Bun.

### What's tested vs. what needs a live check

`npm test` covers `goal-state.ts` and the `/goal` dispatcher (parsing, state, transitions, markers,
every command path) against the **built** output. What unit tests *can't* exercise is the live OpenCode
integration: the `command.execute.before`/`config` hooks, the `session.idle` loop, and how injected
messages render in the Desktop UI. **Smoke-test the packaged tarball before publishing:**

```bash
npm pack                                   # builds dist/ and makes opencode-autogoal-x.y.z.tgz
cd /path/to/a/throwaway/project
npm i /path/to/opencode-autogoal-x.y.z.tgz     # exercises the COMPILED output + real install path
# add the plugin (+ optional command block) to opencode.json, then in OpenCode:
#   CONVERSATIONAL (primary path):
#     "set a goal to write a haiku, then keep going until it's done"  → agent calls set_goal
#     "what's my goal?"  → goal_status     ·     "stop the goal"  → clear_goal
#   SLASH COMMAND (if you added the command block):
#     /goal              → shows "no active goal"
#     /goal set "say hi once you've written a haiku"   (no --command: tests the GOAL_COMPLETE path)
#     /goal pause, /goal resume, /goal clear
#     /goal set "<thing>" --command "<cmd that exits 0>"   (tests deterministic completion)
```

If `/goal` does nothing, the command-registration/`command.execute.before` path needs adjustment for
your OpenCode version — open an issue with your version (`opencode --version`).

---

## Standalone CLI (v0.2.1+)

The package ships a standalone `opencode-autogoal` binary that drives the
goal loop from any shell or external script — no OpenCode required. This
is the **read/write surface for external automation**: CI bots, cron
jobs, shell aliases, other agents, and any tool that can exec a
subprocess can drive the goal loop.

```bash
opencode-autogoal set "make all tests pass"      # start a goal
opencode-autogoal status                         # view the current state
opencode-autogoal steer "focus on the flaky suite"  # add a hint for the next nudge
opencode-autogoal turns 100                      # edit a constraint mid-run
opencode-autogoal pause                          # pause the auto-loop
opencode-autogoal handoff "for tomorrow"         # write a handoff file
opencode-autogoal --dir /path/to/project status  # operate on a different workspace
opencode-autogoal help                           # full command list
```

### How it works

The CLI is a thin wrapper around the same `dispatchGoalCommand` function
that the `/goal` slash-command uses. It reads and writes the same state
file at `<dir>/.opencode/.goal-state.json`. Multiple surfaces
(OpenCode TUI, OpenCode sidebar, this CLI) coordinate via the on-disk
state — there's exactly one source of truth, and it's atomic.

### Reading the state from external tools

Any tool that can read JSON can observe the goal's state without invoking
the CLI:

```bash
cat .opencode/.goal-state.json | jq '.condition, .status, .constraints'
```

The state file is `.opencode/.goal-state.json` (relative to the workspace
directory). It's gitignored — runtime data, not source.

### Exit codes

| Code | Meaning                                                              |
|------|----------------------------------------------------------------------|
| 0    | Success                                                              |
| 1    | User error (bad args, invalid value, missing required arg)           |
| 2    | Precondition not met (no goal, terminal state, handoff already pending) |
| 3    | Write failed (I/O error, permission denied, disk full)                |
| 4    | Corrupt state file detected and quarantined as `.goal-state.json.corrupt.<ts>` (v0.4.2) |

`status` exits **2** when there is no current goal (precondition not
met), not 0. Scripts that want to distinguish "no goal yet" from
"goal is set and idle" should branch on the exit code, not the
output text.

Scripts can branch on exit code without parsing the human-readable output.

#### The `--command` flag on `set`

```bash
opencode-autogoal set "ship v2" --command "make deploy"
```

The value after `--command` is **one shell-quoted argument**. The
shell groups multi-word commands into a single argv element before
the CLI sees them. The CLI re-quotes that value (using double
quotes) for the dispatcher's parser.

If the value contains a literal double-quote character, the CLI
refuses with exit 1 — this is a hard constraint; the dispatcher's
parser uses double-quote delimiters and the CLI cannot safely
escape an inner double quote without ambiguity.

**Empty value `--command ""`** is treated as "no command" — the
flag is stripped entirely. The goal is stored with
`command: null`. This is the read-back-symmetric way to express
"verification disabled" from a script.

**Duplicate `--command`** errors with exit 1. The dispatcher
doesn't silently take the first or the last; the user must
resolve the contradiction in their script.

**Shell semantics.** The verification command is run via
`exec()` (the auto-loop's `evaluateDeterministic` in
`src/server.ts`), which means it gets full **shell semantics**:
pipes (`|`), redirects (`>`), logical operators (`&&`, `||`),
and backtick expansion all work. The shell is whatever the
OpenCode host spawns — typically `/bin/sh` on POSIX, `cmd.exe`
on Windows. Scripts that pass multi-step commands
(`"make test && make deploy"`) are a deliberate use of this
feature, not a footgun — but if you need to pass a value that's
guaranteed NOT to be shell-evaluated, you can't use this CLI.

### Health check: `doctor` (v0.5.0+)

```bash
opencode-autogoal doctor
```

Prints a check table and exits 0 (healthy) / 1 (any FAIL). Useful in
CI or as a first stop when something feels off:

| Check | What it means |
|---|---|
| goal state | valid (or absent) — FAIL means corrupt (file is quarantined on read) |
| chain file | valid (or absent) — same semantics |
| handoff file | valid (or absent) — same semantics |
| quarantined artifacts | WARN if any `.corrupt.<ts>` files are present (lists newest 3) |
| node version | `>= 20` |
| package version | always OK; prints its own version |

`doctor` is intentionally NOT a goal action — it never routes through
the dispatcher, so it can never accidentally mutate state.

```bash
opencode-autogoal --json doctor   # machine-readable, one line
```

### Interactive control center: `tui` (v0.6.0+)

```bash
opencode-autogoal tui     # full-screen interactive cockpit
opencode-autogoal         # bare, in a terminal, launches the same TUI
```

A full-screen, keyboard-driven control center — the interactive sibling of
`watch`. The v0.7.0 release turns this into a **three-pane shell** (header ·
goal pane · live session pane) with drill-down history, 7 new actions, and
a categorized, paged, searchable help overlay. Every management action is a
single keypress:

| Key | Action | Key | Action |
|---|---|---|---|
| `p` | pause / resume | `n` | set a new goal |
| `s` | add a steering note | `H` | write a handoff |
| `e` | edit the condition | `C` | claim a handoff |
| `t`/`m`/`k` | max turns / minutes / tokens | `?` | help overlay |
| `R` | restart (confirms) | `q` / `Esc` | quit |
| `c` | clear (confirms) | `↑`/`↓` | scroll history |
| `Tab` | enter drill-down (steering / eval history) | `Enter` | open detail / select |
| `A` | view goal archive | `T` | view templates |
| `D` | inline doctor check | `L` / `O` | open .opencode/ in the file manager |
| `g` | copy full goal state JSON to clipboard | `Ctrl+L` | redraw |

Destructive actions ask for confirmation; text actions (steer, edit, new
goal) drop into an inline editor. The drill-down mode (`Tab` to enter) lets
you navigate the steering list or the evaluation history with ↑/↓, open
the full-reason detail view with `Enter`, copy the current item to the
clipboard with `c` (OSC 52), and edit the selected steering note in place
with `e`. The help overlay (`?`) is paged (`n`/`p`) and searchable (just
type) — three sections (Goal / Session / Nav) cover all 18 key bindings.

It's built on pure ANSI + raw-mode stdin — **zero new dependencies**, runs
in any terminal, and restores the terminal cleanly on `q` / ctrl-c / crash.
It needs a real TTY; in a non-TTY (CI/pipe) it refuses with a hint to use
`watch` or `--json status` instead.

#### On Windows

It works on Windows out of the box — there are no native bits, just ANSI and
raw-mode stdin. For the nicest result:

```powershell
npm i -g opencode-autogoal     # Node >= 20
opencode-autogoal tui          # or just: opencode-autogoal
```

- Prefer **Windows Terminal** (with PowerShell or `cmd` inside it) over the
  legacy console host — modern Windows Terminal renders the `█░` progress bar,
  box glyphs, and the 🎯 status icon crisply. A programming font like
  **Cascadia Code / Cascadia Mono** keeps everything aligned.
- It needs a real terminal. Piping or redirecting (`opencode-autogoal tui | cat`)
  or a non-interactive CI step makes it refuse cleanly — that's intended; use
  `watch` or `--json status` there instead.
- `Ctrl-C` or `q` exits and restores the terminal; set `NO_COLOR=1` for
  monochrome.

### Live terminal dashboard: `watch` (v0.5.0+)

```bash
opencode-autogoal watch                  # 2s refresh, TTY-rendered
opencode-autogoal watch --interval 5000  # custom refresh (250-60000 ms)
```

Renders a live, plain-ANSI dashboard of the current goal. Works in any
terminal — tmux pane, second terminal, SSH session — with zero host
dependencies. No plugins, no TUI libraries.

In a non-TTY (CI/pipe) it prints one frame and exits 0 — safe to
embed in scripts. SIGINT (ctrl-c) cleans up and exits 0.

### Goal archive + `stats` (v0.5.0+)

Every terminal outcome (`achieved` / `cleared` / `replaced`) is
appended to `.opencode/goal-archive.jsonl` (gitignored). The file is
capped at 1 MB; when exceeded it's atomically trimmed to the newest
200 lines.

```bash
opencode-autogoal archive   # list the 10 most recent outcomes
opencode-autogoal stats     # totals: total, achieved, cleared, replaced, avg turns to achieve
opencode-autogoal --json stats  # machine-readable, one line
```

Archiving is best-effort — a full disk or permission failure will not
break a goal transition.

### The "looper agent" use case

The CLI is the foundation for making this tool reusable beyond OpenCode:

- **From a CI pipeline**: `opencode-autogoal set "ship v2" --command "make deploy"` runs the goal loop on every push.
- **From a cron job**: a watchdog cron can `opencode-autogoal status` and alert on regressions.
- **From another AI agent**: any agent that can exec a subprocess can drive the goal loop. The agent reads `.goal-state.json` to observe, invokes the CLI to act.
- **From a shell alias**: `alias goal='opencode-autogoal'` gives instant goal-loop access from any terminal.

The CLI surface is intentionally a strict subset of the OpenCode-internal surface (no subagent wiring, no TUI/dialog flows, no hot-reload semantics) — just the durable primitives the state file already supports.

---

## Related work & a high five 🙌

Huge props to **[@mirsella](https://github.com/mirsella)** and
**[opencode-goal](https://github.com/mirsella/opencode-goal)** — they shipped the original
"Codex-style long-running goals for OpenCode," and it's a clean, lightweight take that proves the idea.
If you want something simpler and model-judgment-based, go give it a star. 🌟

`opencode-autogoal` heads in a different direction: **deterministic `--command` verification**,
**turn/time limits**, **templates**, and a **conversational tool interface** so you set goals by just
talking. Different trade-offs, same good idea. Thanks for blazing the trail. 🤝

---

## License

MIT © VerbalChainsaw
