# common progress tree mcp : opencode demo implementation (tui + desktop/web)

A non-blocking twin of `question` so coding agents can signal long-running work without looking dead, plus a **zero-token-burn out-of-band relay** so the agent never has to poll `stdout` just to keep the UI alive. (Also described as low-token-burn or token-minimizing progress: token cost scales with milestones, not with task duration.)

Two tools back this: `progress` (write) and `list` (read-only companion: your session's trees as text,
with user-dismissed entries hidden by default — useful before planning or when unsure what is tracked). **The tree is the glance-able layer above the transcript.** Thought traces, tool calls and command output are a wall of text; the rollup is the live, high-level view of what is happening, what is blocked, and what is next — so a user can read the pill instead of scrolling the log.

Implements the [Agent Progress Tool proposal](https://gist.github.com/jakedowns/ddc4eb4817184a074c82c61dc6e7228c) for OpenCode 2, and is written as a portable reference implementation that any model, agent, or harness can copy, adapt, or train on.

**Versions:** MCP server `2.8.0` · OpenCode plugin `2.14.1`

## Install from npm

Published packages:

- Plugin — [`@jakedowns/progress-tool-opencode-plugin`](https://www.npmjs.com/package/@jakedowns/progress-tool-opencode-plugin)
- MCP server + relay — [`@jakedowns/progress-tool-mcp`](https://www.npmjs.com/package/@jakedowns/progress-tool-mcp)

```bash
opencode plugin add @jakedowns/progress-tool-opencode-plugin
```

The plugin depends on the MCP package and **registers `progress-server` for you**
(`autoRegisterMcp: false` to opt out), so this one command is the whole install.
It spawns the server with a detected `node`/`bun` runtime — never with
`process.execPath`, which is the `opencode` binary under OpenCode Desktop. Pin
one with `{ "options": { "mcpRuntime": "/absolute/path/to/node" } }` if needed.
Restart the service or reload the window; the progress pill appears above the
composer, and the MCP tools (`progress`, `list`) plus the `progress-relay` /
`progress-emit` bins become available.

> If the MCP server fails to start, the plugin withholds its injected progress
> rules and strict-mode nudges until the `progress` tool actually shows up in the
> model's tool set, so agents are never told to call a tool that isn't there.

Manual configuration, if you prefer:

```jsonc
{
  "plugins": ["@jakedowns/progress-tool-opencode-plugin"],
  "mcp": {
    "servers": {
      "progress-server": {
        "type": "local",
        "command": ["npx", "-y", "@jakedowns/progress-tool-mcp"]
      }
    }
  }
}
```

Running from a source checkout instead? Point both entries at this repo's
`plugin/` directory and `mcp-server/index.js` — see Option A below.

---

> [!IMPORTANT]
> **No `AGENTS.md` edits required.** The bundled OpenCode plugin injects the progress & relay rules directly into every session's system instructions, and the MCP `progress` tool response reinforces them at the exact moment an agent starts a task — so agents know to wrap long-running commands with `progress-relay` *before* their first build, not after. Progress reporting works without any prompt engineering.
>
> For other harnesses, add the model-facing prompt snippet from [`docs/out-of-band-relay-spec.md` §7.4](docs/out-of-band-relay-spec.md) to your system prompt or agent rules file.
>
> If you manage your own `AGENTS.md`, the canonical rule text lives in [`plugin/src/instructions.ts`](plugin/src/instructions.ts) — copy it from there so your rules stay in sync with the injected ones.
>
> To disable the injection per project (for example, if you maintain your own `AGENTS.md` rules):
>
> ```jsonc
> { "plugins": [{ "package": "/path/to/progress-tool/plugin", "options": { "injectInstructions": false } }] }
> ```
>
> Want to see it live? Ask your agent to **"demo OSC 9;4 support"** (`.opencode/skills/osc-demo`) or **"demo the task tree"** (`.opencode/skills/tree-demo`) — both ship with this repo — or run them yourself: `bash demo/osc-demo.sh` streams native `OSC 9;4` progress sequences through `progress-relay`, and `bash demo/tree-demo.sh` builds a nested parent/child task tree that rolls up live (`PROGRESS_TREE_DEMO_FAIL=1` shows error roll-up).
>
> When installed from npm, the plugin **registers all three skills automatically** (usage, OSC demo, tree demo) via the skill registry — no separate skill install. Opt out with `{ "options": { "registerSkills": false } }`.

---

## Why: the token-burning polling loop

A blocking `question` tool pauses the agent until a human answers. A non-blocking `progress` tool returns immediately so the agent can keep working. That difference creates a structural problem during long-running background tasks (builds, test suites, downloads, deployments):

- An LLM has no background thread. Between tool calls it cannot see `stdout`/`stderr` or wall-clock time.
- To keep a UI updated with elapsed time, percentages, or log snippets, models fall back to `sleep` + `read_terminal_output` + `progress()` loops.
- Every tick burns input/output tokens, bloats context history, and slows the real work down.
- Every harness (OpenCode, Claude Code, Cursor, Cline, custom loops) manages background shells differently, so a single proprietary plugin API does not travel.

The fix is not a bigger prompt. It is to stop making the model the relay.

---

## Design: control plane + data plane

Progress has two kinds of updates, and they should not travel through the same pipe.

| Plane | Owner | Frequency | Cost |
|-------|-------|-----------|------|
| **Control plane** | The agent, via the MCP `progress` tool | Once per milestone / lifecycle transition | O(milestones) tokens |
| **Data plane** | An OS-level relay process, via `progress-relay` | Up to 4 writes/sec, driven by `stdout`/`stderr` and native `OSC 9;4` progress sequences | **Zero** model tokens |

Both planes converge on the same state file. The agent owns *meaning* (task topology, status transitions). The OS process owns *telemetry* (latest log line, percentage, elapsed time). The GUI just reads state.

```
┌──────────────────────────────────────────────────────────────┐
│  CONTROL PLANE (agent, token-bounded)                        │
│                                                              │
│  Agent ── progress({ id, status, title, parentId }) ──┐      │
│    • once when a phase starts                         │      │
│    • once when a child task is created                │      │
│    • once when a phase finishes / fails               │      │
└───────────────────────────────────────────────────────┼──────┘
                                                        │
                                                        ▼
                                    ~/.opencode-progress-state.json
                                                        ▲
                                                        │
┌───────────────────────────────────────────────────────┼──────┐
│  DATA PLANE (OS process, zero model tokens)           │      │
│                                                       │      │
│  npm run build ── stdout/stderr ── progress-relay ────┘      │
│    • latest non-empty line -> detail                         │
│    • "45%" or "6/10" -> progress                             │
│    • exit 0 -> done, exit != 0 -> error                      │
│    • throttled writes, atomic + locked state updates         │
└──────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                    GUI / TUI / status shim
                                    reads state, renders tree
```

### The one rule that makes it work

> **The agent calls `progress` at state boundaries. It never calls `progress` in a timer, sleep, or log-polling loop.**

If a command is long-running, attach the relay. If the relay is unavailable, still honor the boundary contract: call `progress` at start and end, and let the GUI derive elapsed time from `startedAt`.

---

## Progress tool schema

```ts
progress({
  id: "compile-1",           // stable id -> update / clear later
  status: "running" | "done" | "error" | "waiting",
  title: "Waiting on tsc",
  detail?: "34s elapsed",    // optional detail text
  progress?: 0.65,           // optional 0-1 fraction
  parentId?: "build",        // optional: nest under a parent task (tree)
  sessionId?: "ses_abc123",  // optional override; auto from env when omitted
})
```

- **Fire-and-forget** — does not pause the agent
- **Same `id` updates in place** — call again with the same id to refresh
- **Never requires a human reply**
- **Tree-like dependencies** — pass `parentId` to nest a task under a parent; parent status rolls up from children, and parent progress is the mean of child progress when the parent has no explicit progress (bootvine-inspired)
- **Multi-line titles/details** — `title` and `detail` accept real newlines, escaped `\n` / `\r\n`, extra-escaped `\\n`, or `<br>` / `<br/>` tags. Writers normalize these to plain newlines; viewers wrap long lines and scroll long details. Prefer a short title line plus a few detail lines over one huge single-line string.
- **Session isolation** — `sessionId` resolves from an explicit input, then `PROGRESS_SESSION_ID`, then `OPENCODE_SESSION_ID`. When present, entries are namespaced internally as `${sessionId}:${id}` so identical task IDs in concurrent sessions never collide. When absent, the original flat `id` keying is preserved for 100% backwards compatibility. Keep task IDs clean (`"build-1"`); do not manually prefix them.
- Renders in the TUI above the composer and as a composer pill in desktop/web; the optional standalone GUI uses a floating top-right overlay. The TUI word-wraps, desktop/web wrap titles and scroll long details, and both expose the full text on hover where the host supports it.

### Drop-in tool definition (harness-agnostic)

Use this description anywhere an MCP tool is registered. It encodes both the tree semantics and the zero-polling rule, so the model learns the contract even if it ignores long system prompts.

```ts
{
  name: "progress",
  description: `Report non-blocking task progress and dependency trees to the user's GUI. Fire-and-forget: never pauses execution or waits for human input.

OWNERSHIP & ZERO-POLLING CONTRACT:
- You own TASK MILESTONES and TREE STRUCTURE: call this tool once when starting a phase (status: "running"), when creating child sub-tasks (parentId), and when a phase finishes ("done" | "error").
- NEVER poll, sleep, or loop on terminal output just to refresh progress percentages or elapsed time.
- For long-running shell commands, delegate live stdout/progress streaming to the out-of-band CLI relay (the exact command is returned in this tool's response, e.g. `progress-relay --id <id> -- <cmd>`) so the OS process updates the GUI directly without burning tokens.

TREE ROLLUP (BOOTVINE SEMANTICS):
- Pass `parentId` to nest sub-tasks under a parent task.
- Parent status and progress automatically roll up from children (any child "error" -> parent "error"; any child "running"/"waiting" -> parent "running"/"waiting"; parent progress = mean of child progress when the parent has no explicit progress).

SESSION ISOLATION:
- Concurrent sessions are isolated automatically via OPENCODE_SESSION_ID / PROGRESS_SESSION_ID (or an explicit `sessionId` override).
- Keep using clean task IDs like `build-1`; do NOT manually prefix them with a session ID.

LINE BREAKS & LONG TEXT:
- `title` and `detail` support multi-line text. Use real newlines, escaped `\n` / `\r\n` (or an extra-escaped `\\n`), or `<br>` / `<br/>` tags.
- Keep `title` to a short headline and put verbose context in `detail` across a few lines instead of one huge single-line string.
- Viewers normalize these forms, wrap long lines, and scroll long details. Do not rely on the viewer to split a wall of text for you.`,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Stable task ID; re-using an ID updates the indicator in place." },
      status: { type: "string", enum: ["running", "waiting", "done", "error"] },
      title: { type: "string", description: "Short human-readable task label. Supports line breaks via real newlines, escaped \\n / \\r\\n, or <br> tags." },
      detail: { type: "string", description: "Optional status detail, latest step, or multi-line context. Supports line breaks via real newlines, escaped \\n / \\r\\n, or <br> tags; viewers wrap and scroll long text." },
      progress: { type: "number", minimum: 0, maximum: 1, description: "Optional completion fraction (0.0 to 1.0)." },
      parentId: { type: "string", description: "Optional parent task ID to nest this task in a dependency tree." },
      sessionId: { type: "string", description: "Optional session ID override; automatically resolved from PROGRESS_SESSION_ID or OPENCODE_SESSION_ID when set by the harness." }
    },
    required: ["id", "status", "title"]
  }
}
```

The server also returns the same contract in the MCP `initialize` instructions and repeats the relay command in every `running` tool response. That is deliberate: the command is visible immediately before the model invokes its shell tool, which is the moment the polling habit usually starts.

---

## The relay CLI (data plane)

The relay is a normal POSIX process. It needs no harness plugin, no daemon, and no model cooperation beyond using a shell pipe or wrapper. It writes to the same state file as the MCP server.

The command name and flags below are the reference implementation. The portable requirement is narrower: the agent must be able to attach *some* OS process that writes the shared state shape. Rename it, port it, or replace it with a native background-job hook; the contract lives in [`docs/out-of-band-relay-spec.md`](./docs/out-of-band-relay-spec.md), not in this particular binary.

> The relay does not make a blocking shell call asynchronous. It makes the progress display live and token-free while the command runs. Harnesses with background shells can attach the same relay to the background job and let the agent continue.

### Wrap a command (recommended: captures exit status)

```bash
progress-relay --id build-1 --title "Building" -- npm run build
```

The wrapped command inherits the relay's stdin. Its stdout/stderr are teed to the relay's own stdout/stderr, so the harness still captures the full output. The relay exits with the command's exit code.

### Pipe a command

```bash
npm run build | progress-relay --id build-1
```

Pipe mode cannot see the upstream command's exit code. It marks the task `done` when stdin closes. Use wrap mode when accurate failure detection matters.

### Emit a single milestone (no stream)

```bash
progress-emit --id build-1 --status running --title "Building"
progress-emit --id build-1 --status done --progress 1
```

`progress-emit` is for scripts that already know when a milestone happens and do not have a continuous output stream.

### Concurrent sessions

The relay resolves its session scope automatically: an explicit `--session <id>` wins, followed by `PROGRESS_SESSION_ID`, then `OPENCODE_SESSION_ID`. When a session is active, the state store keys entries as `${sessionId}:${id}` and records `sessionId` on the entry, so two sessions can both use `--id build-1` without overwriting each other. `entry.id` and `entry.parentId` stay clean, and parent roll-ups only match siblings in the same session.

```bash
progress-relay --id build-1 --session ses_abc123 -- npm run build
```

With no session flag and no session environment variables, keys stay flat (`build-1`) exactly as in previous versions.

### Options

| Option | Meaning |
|--------|---------|
| `--id <id>` | Stable task ID (or `PROGRESS_ID`) |
| `--title <title>` | Task label; only needed for a new task |
| `--parent <id>` | Nest under a parent task (or `PROGRESS_PARENT`) |
| `--detail <text>` | Initial detail line |
| `--progress <value>` | `0..1`, `45%`, or `6/10` |
| `--status <status>` | Initial status: `running`, `waiting`, `done`, `error` |
| `--session <id>` | Session scope (or `PROGRESS_SESSION_ID` / `OPENCODE_SESSION_ID`); omit it to keep the legacy flat keying |
| `--max-hz <n>` | Max state writes per second (default `4`; `0` = unlimited) |
| `--quiet`, `--no-tee` | Do not echo command output back to the caller |
| `--state-path <path>` | Override `~/.opencode-progress-state.json` |
| `--once` | Emit one update and exit (same as `progress-emit`) |

### What the relay does

- Reads `stdin` line-by-line, splitting on `\n`, `\r\n`, and bare `\r` (progress bars often use `\r`).
- Strips ANSI escape sequences and collapses whitespace.
- Keeps the latest non-empty line as `detail` (truncated to 240 chars).
- Parses `45%` and `6/10` into `progress` when present.
- Throttles writes to `--max-hz` so a noisy build cannot hammer the state file.
- **Preserves fields already set by the MCP tool** — attaching a relay does not clobber the agent's title, parent, or status.
- On exit `0`: `status: "done"`, `progress: 1.0`.
- On non-zero exit: `status: "error"`, with the exit code in `detail`.
- On signal: `status: "error"`, with the signal name in `detail`.

### If `progress-relay` is not on `$PATH`

Every form also works through the MCP server binary:

```bash
node /path/to/mcp-server/index.js relay --id build-1 -- npm run build
node /path/to/mcp-server/index.js emit --id build-1 --status running
```

From a checkout, run `cd mcp-server && npm link` to expose `progress-relay` and `progress-emit` globally. Set `PROGRESS_RELAY_CMD` to override the command printed in tool responses.

### A relay is optional

The relay is a convenience, not a requirement. Any process that writes the shared state shape with atomic semantics is a valid data-plane implementation. That is the interop boundary: **state file in, GUI out**. There is nothing OpenCode-specific about the contract.

### Minimal harness checklist

A harness can adopt the paradigm without any custom plugin:

1. Expose a fire-and-forget `progress` tool with the schema above.
2. Return the relay hint (or an equivalent command) whenever `status` is `running`.
3. Give the agent a normal shell that can run `progress-relay --id <id> -- <cmd>`.
4. Have the view read `~/.opencode-progress-state.json` (or `PROGRESS_STATE_PATH`). For a **shared global HUD** that shows several concurrent sessions, keep one state file and rely on `OPENCODE_SESSION_ID` / `PROGRESS_SESSION_ID` scoping; the view can group by `entry.sessionId` if desired.
5. For **per-session isolation** (separate HUD, history, or credentials), give each session its own `PROGRESS_STATE_PATH` instead of sharing one file.
6. Do not add a background polling loop in the model; let the OS process and the view do the waiting.

If you prefer a native implementation, replace step 3 with a stdout watcher or background-job hook that honors the same state shape. The [spec](./docs/out-of-band-relay-spec.md) includes pseudocode and a conformance checklist, which double as an RLHF/reference trajectory: milestone call → relay attach → no polling → one terminal report.

---

## Tool response: the self-teaching hint

When the agent calls `progress({ status: "running" })`, the tool response appends an actionable hint:

```text
Recorded progress [build-1] (running) - Running npm build - 10%
To stream live command output into this indicator without polling, use the out-of-band relay:
  progress-relay --id build-1 -- <cmd>
  # or: <cmd> | progress-relay --id build-1
Do NOT poll, sleep, or re-call progress in a loop for elapsed time or percentages.
Concurrent sessions are isolated automatically via OPENCODE_SESSION_ID / PROGRESS_SESSION_ID; keep task IDs clean (e.g. "build-1").
```

If an entry is scoped to a session, the hint also includes `--session <id>` so the relay attaches to the same namespace. If the bin is not on `$PATH`, the hint uses the exact `node /path/to/index.js relay ...` invocation instead. Either way, the model sees the correct command at the moment it is about to launch the shell command — before the polling loop starts.

---

## Tree-like dependencies (bootvine-inspired)

Both the MCP server and the views support nested tasks via `parentId`. A parent's status is derived from its children, and its progress is the mean of its children when it has no explicit progress:

```
├── build [██████░░░░] 6/10 · compiling SDL2
│   └── link-lib [████░░░░░░] 4/10 · linking libSDL2.a
└── npm-install [██████████] 10/10 · done ✓
```

If any child errors, the parent shows `error`. If any child is still running/waiting, the parent shows `running`/`waiting`. Parent progress is the average of child progress values when the parent has no explicit progress; otherwise the parent's own value wins. The relay can attach to a child with `--parent`, so a long build can stream into `build-1` while the agent only reports milestone transitions.

---

## State store and conformance

Both the MCP server and the relay share [`mcp-server/state-store.js`](./mcp-server/state-store.js):

- **Atomic writes** — write to a temp file in the same directory, `fsync`, then `rename`. Readers never see partial JSON.
- **Cross-process lock** — a `.lock` file serializes read-modify-write cycles, so concurrent child relays updating sibling `parentId` nodes do not lose updates or corrupt parent roll-ups.
- **Stale-lock recovery** — a lock older than 15 seconds is broken rather than wedging the command.
- **TTL cleanup (opt-in)** — nothing is pruned by default; entries ride so the store doubles as a history/report. Enable completed-entry retention with `PROGRESS_AUTO_PRUNE_S=<seconds>` (legacy `PROGRESS_TTL_MS` also works), and the orphaned-`running` sweep with `PROGRESS_STALE_MS`.
- **Session scoping** — when `sessionId` is resolved, keys are `${sessionId}:${id}` and entries carry `sessionId`; parent lookups stay within that namespace. With no session, keys remain flat (`build`) for backwards compatibility.
- **Path override** — `PROGRESS_STATE_PATH` for tests, multiple harnesses, or fully isolated sessions.

State file shape (session-scoped example):

```json
{
  "entries": {
    "<sessionId>:build": {
      "id": "build",
      "sessionId": "<sessionId>",
      "status": "running",
      "title": "building SDL2",
      "detail": "compiling source",
      "progress": 0.6,
      "parentId": null,
      "startedAt": 1794559267388,
      "createdAt": 1794559267388,
      "updatedAt": 1794559267388
    },
    "<sessionId>:link-lib": {
      "id": "link-lib",
      "sessionId": "<sessionId>",
      "status": "running",
      "title": "linking libSDL2.a",
      "detail": "ld -o libSDL2.a ...",
      "progress": 0.4,
      "parentId": "build",
      "startedAt": 1794559267388,
      "createdAt": 1794559267388,
      "updatedAt": 1794559267388
    }
  },
  "version": 2
}
```

The object key is the internal composite key (`"<sessionId>:<id>"`), while `entry.id` and `entry.parentId` stay clean for display and relay commands. Entries written without a session keep the legacy flat key (`"build"`) and omit `sessionId`.

`startedAt` lets a GUI show true elapsed time even when no relay tick is writing `updatedAt` every second.

The full normative spec, including conformance tests and harness integration notes, is in [`docs/out-of-band-relay-spec.md`](./docs/out-of-band-relay-spec.md).

---

## What's included

| Component | Path | Status |
|-----------|------|--------|
| MCP server (exposes `progress` to agents) | `mcp-server/index.js` | ✅ |
| Shared atomic state store | `mcp-server/state-store.js` | ✅ |
| Out-of-band relay core | `mcp-server/relay.js` | ✅ |
| `progress-relay` bin shim | `mcp-server/progress-relay.js` | ✅ |
| `progress-emit` bin shim | `mcp-server/progress-emit.js` | ✅ |
| Smoke tests (relay + MCP + concurrency) | `mcp-server/test/smoke.test.js` | ✅ |
| OpenCode plugin (server + TUI + desktop/web GUI) | `plugin/` | ✅ |
| Standalone desktop GUI server | `progress-gui-server.js` | ✅ |
| Setup script | `setup.sh` | ✅ |
| Launch script | `launch-gui.sh` | ✅ |
| TUI / CLI guide | `tui-progress-guide.md` | ✅ |
| Harness-agnostic relay spec | `docs/out-of-band-relay-spec.md` | ✅ |

---

## Installation

### Step 1: Add the MCP server

```bash
opencode mcp add progress-server -- ./mcp-server/index.js
```

Verify: `opencode mcp list` should show `progress-server` as **connected**. OpenCode reloads
config automatically; only restart the service if the server does not reconnect.

### Step 2: Make the relay available (optional but recommended)

From a checkout:

```bash
cd mcp-server
npm link          # exposes `progress-relay` and `progress-emit`
```

Or keep using the absolute form:

```bash
node /path/to/mcp-server/index.js relay --id build-1 -- <cmd>
```

For npm installs, the `bin` entries are installed automatically.

### Step 3: Install the view (TUI + desktop/web GUI)

#### Option A: OpenCode plugin (TUI + desktop/web GUI)

The plugin at `plugin/` targets the OpenCode **V2** plugin API and exposes four parts:
`server`, `tui`, `rpc`, and `gui-experimental`.

1. Build the desktop/web GUI bundle (only needed after editing `plugin/src/gui.tsx`):

   ```bash
   cd plugin
   npm install
   npm run build
   ```

   `dist/gui-experimental.cjs` is committed, so a fresh checkout already has a bundle.

2. Register the plugin. Desktop and browsers only read the **global** config, so add it to
   `~/.config/opencode/opencode.json`:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       { "package": "/absolute/path/to/progress-tool/plugin" }
     ]
   }
   ```

   For the terminal UI, also add it to `~/.config/opencode/cli.json`:

   ```json
   {
     "plugins": [
       { "package": "/absolute/path/to/progress-tool/plugin" }
     ]
   }
   ```

   `opencode plugin add` only accepts npm registry packages and Git specifiers, so a local
   checkout must be registered with the config entry above.

   #### Progress bar styles

   Both the TUI and GUI parts read these options:

   ```json
   {
     "plugins": [
       {
         "package": "/absolute/path/to/progress-tool/plugin",
         "options": {
           "barStyle": "emoji",
           "barSegments": 6,
           "barTotal": 420
         }
       }
     ]
   }
   ```

   - `barStyle`: `"blocks"` (default) or `"emoji"`.
   - `barSegments`: cells per bar (default 10 for blocks, 6 for emoji).
   - `barTotal`: denominator for the `(done/total)` label (default 100).

   With those options the TUI renders:

   ```
   skill issues: 🟩⬛️⬛️⬛️⬛️⬛️(69/420)
   ```

   The plugin never seeds demo tasks; `skill issues` is just an example task title. For demos,
   point `PROGRESS_STATE_PATH` at a throwaway file so demo entries never touch the real state.

   Lifecycle options:

   - `successHoldMs`: how long a `done` task stays visible after its last update
     (default `8000`). Only applies when `autoHideDone` is enabled.
   - `autoHideDone`: set to `true` to hide completed tasks after `successHoldMs`,
     regardless of dismissal. **Default `false`**: done entries you never
     dismissed stay visible indefinitely (retention is opt-in, see `PROGRESS_AUTO_PRUNE_S`) —
     including across plugin reloads.
   - `showDone`: set to `false` to drop completed tasks immediately.
   - `scope`: `"session"` (default) shows only the current chat's tasks; `"all"` shows every
     session sharing the state file.
   - `refreshMs`: how often the views re-read progress state in milliseconds
     (default `1000`, minimum `100`). Applies to the TUI poller, desktop GUI
     refresh loop, and the plugin's server-side state watcher. The standalone
     GUI server has the same knob via `PROGRESS_GUI_REFRESH_MS`.
   - `strictMode`: `"nudge"` (default), `"force"`, or `"off"`. The plugin watches
     tool calls: without any task entry, or with pending tasks whose progress
     has not changed, it writes a standing `progress-nudge` instruction
     ("any updates?") and clears it on compliance. `"force"` additionally
     sends one synthetic reminder per non-compliance run. Tune with
     `strictThreshold` (default `3` calls), `staleAfterMs` (default `5` min),
     and `cooldownMs` (default `2` min).
   - `idleReminder`: set to `false` to disable the turn-end nudge. By default,
     when a session is about to go idle with running/waiting entries still
     open, the plugin admits **one synthetic message** ("you have a tree of
     todos pending") into the same execution, listing the open entries.
     Debounced by entry signature, a 2-minute cooldown, and a per-run cap, so
     an agent that genuinely cannot act is not looped.
   - `unhinged`: set to `true` to append
     `[did the user's message just change your workload? update your task list!]`
     to every user message (via the prompt hook). **Default `false`** — it
     edits user input text, so it is strictly opt-in.
   - `expandRootsByDefault`: tree roots with children are **collapsed by default**
     in the pill menu (chevron + "N descendants" hint). Set to `true` to expand
     them by default; per-root toggles still work either way.
   - `verboseLogging`: set to `true` to record every nudge the plugin injects
     as JSONL in `~/.opencode-progress-nudges.log` (override the path with
     `PROGRESS_NUDGE_LOG`). Events: `config`, `strict` (silent-run / forced /
     stale-progress), `wall-clock`, `idle-reminder`, `child-list-error`
     (detected from the tool result), `transition` (per-entry `from`/`to`
     lifecycle changes — start, repeat, finish, reopen, pause), `unhinged`.
     **Default `false`**. Example:
     `grep -c '"event":"wall-clock"' ~/.opencode-progress-nudges.log`.
     Wall-clock tuning: `wallClockMs` (threshold, default 120s), only fires
     for sessions with a tool call in the last 10 minutes (a session stalled
     in a provider queue is not neglectful), and caps at 3 reminders per
     non-progress stretch.

   Running and waiting tasks stay visible. Errors stay visible until dismissed or updated on
   purpose, so a failure cannot silently scroll away. Completed tasks stay visible too unless
   you dismiss them (or opt into `autoHideDone`). In the desktop pill, each root row has a
   **✕** icon that dismisses that tree, and **✕ Dismiss all** hides every current report.
   Dismissal is scoped to the task itself: a dismissed tree stays hidden through relay telemetry
   and sibling/other-root activity. An **agent update** clears the dismissal — on the updated
   entry and on all of its ancestors — so real work inside a dismissed tree always comes back,
   **except terminal dismissal**: if you dismissed a task after it was already done/error, later
   done/error re-reports do not revive it (you've seen the outcome); only a restart (running/
   waiting) does. A done-dismissed tree stays hidden even when new children are appended under it (the
   done→running flip does not revive it); a child *failing* brings it back. With more than one
   root task, the pill shows `(N · agg%)` as a prefix — the number of roots and the mean of
   their progress. No extra agent hook is needed: report `status: "done"` once and the view
   handles retention and hiding. Entries are kept by default for reporting; opt into
   pruning with `PROGRESS_AUTO_PRUNE_S=<seconds>` (and `PROGRESS_STALE_MS` for orphans).

3. Verify:

   ```bash
   opencode plugin list
   opencode api get /api/plugin
   ```

   Both should list `opencode-progress` with features `server`, `tui`, `rpc`, and `gui`.

**Long commands in this repo — including our own toolchain — go through the relay.**
Bundles and test suites are exactly the "long-running programmatic calls" this tool
exists for, so practice what it preaches:

```bash
progress-relay --id build-1 -- npx vite build   # wrap mode: exit 0 -> done, non-zero -> error
progress-relay --id test-1  -- npm test         # wrap the whole suite
npm test | progress-relay --id test-1           # pipe mode: done on EOF (exit code unknown)
```

**Subagent usage report:** `node mcp-server/index.js report` reads the local OpenCode DB
read-only (python3 stdlib) and prints the `general` vs `explore` split plus your delegation
rate — the same query as Dax's subagent survey, run locally on demand.

`progress-relay` tees output, so you still see the build log and TAP output; `--quiet`
suppresses the tee. Use wrap mode whenever the exit status matters (it does for tests),
and run it in the background when the harness supports that so you keep working.

Two artifacts result, by design: the **state entry** holds only the latest line and parsed
percentage (bounded, cheap), while the **harness's background job output file** holds the full
log — readable after completion with the normal shell/file tools. Exception: `--quiet` disables
the tee, so use it only when the log truly isn't needed afterwards.

4. Desktop/web: **Settings → Extensions → Plugins → Reload** (or open a new window).
   A progress pill appears in the composer; its menu lists the dependency tree.

   TUI: the composer footer shows `N active · <title> <percent>` and the tree renders above
   the composer.

   > **Web tabs:** the native composer pill currently loads only in the desktop app. A plain
   > browser tab receives GUI plugin bundles through the Electron bridge, which it does not
   > have, so the web client does not mount `./gui-experimental`. Use the desktop app, the TUI,
   > or the standalone overlay in Option B. The plugin's RPC is reachable from a web session,
   > so a small browser shim can render the same data if needed.
   >
   > Upstream this is tracked in [anomalyco/opencode#60976](https://github.com/anomalyco/opencode/issues/60976)
   > ("Load configured ./gui-experimental plugins in the web app"), with working PRs
   > [#62608](https://github.com/anomalyco/opencode/pull/62608) and
   > [#61950](https://github.com/anomalyco/opencode/pull/61950). Once one lands, the pill
   > works in the web app with no plugin changes.

#### Option B: Standalone desktop GUI (works immediately)

```bash
./launch-gui.sh
```

Then open `http://localhost:8765` in your browser. You can also add it as a desktop app (e.g., Chrome "Install page as app" or your OS's web app feature).

---

## Usage from an agent

Once the MCP server is connected, agents can call `progress` in any session:

```js
progress({
  id: "build-1",
  status: "running",
  title: "Running npm build",
  detail: "Starting",
  progress: 0
})
// -> response includes: progress-relay --id build-1 -- <cmd>
```

Then attach the relay once, instead of polling:

```bash
progress-relay --id build-1 --title "Running npm build" -- npm run build
```

The relay streams percentages and the latest log line into the same indicator, and marks the task `done` or `error` from the real exit code.

### Multi-line titles and details

Verbose agent updates are easier to read with intentional line breaks. Send real
newlines, escaped `\n` / `\r\n`, an extra-escaped `\\n`, or `<br>` tags:

```js
progress({
  id: "fbo-regression",
  status: "running",
  title: "Fixing FBO=0 regression (black boot)",
  detail: [
    "glGenFramebuffers returns 0 on the game GL thread since the knob batch.",
    "Reverted composite shader to working text; added glGetError logging around FBO creation.",
    "Suspect: my error-logging edit didn't land in the last build (log missing) - verifying build chain next."
  ].join("\n"),
  progress: 0.5
})
```

The MCP server normalizes all supported forms to plain newlines. The TUI
word-wraps long lines; the desktop/web views wrap titles and keep long details
inside a scrollable region, with the full text available on hover. The relay's
latest-output line is intentionally one line, since it mirrors terminal output.

### Nesting a sub-task under a parent

```js
progress({
  id: "build-1",
  status: "running",
  title: "Building SDL2",
  progress: 0.5
})

progress({
  id: "link-lib",
  status: "running",
  title: "Linking libSDL2.a",
  detail: "ld -o libSDL2.a ...",
  progress: 0.4,
  parentId: "build-1"
})
```

Attach a relay to the child:

```bash
progress-relay --id link-lib --parent build-1 -- ld -o libSDL2.a ...
```

Update the parent only at the finish boundary:

```js
progress({
  id: "build-1",
  status: "done",
  title: "Building SDL2",
  detail: "Completed in 42s",
  progress: 1.0
})
```

Or signal an error:

```js
progress({
  id: "deploy-1",
  status: "error",
  title: "Deploy to production",
  detail: "Connection timeout"
})
```

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                     OpenCode Desktop                      │
│                                                           │
│  ┌─────────────┐   milestones   ┌──────────────────────┐  │
│  │    Agent    │───────────────▶│  MCP `progress` tool │  │
│  └─────────────┘                └──────────┬───────────┘  │
│         │                                  │              │
│         │ shell command                    │ atomic write │
│         ▼                                  ▼              │
│  ┌─────────────────────┐      ┌────────────────────────┐  │
│  │ progress-relay      │─────▶│ progress state file    │  │
│  │ (OS data plane)     │      │ ~/.opencode-progress-  │  │
│  │ stdout/stderr/exit  │      │ state.json             │  │
│  └─────────────────────┘      └───────────┬────────────┘  │
│                                           │ read           │
│                               ┌───────────▼────────────┐  │
│                               │ GUI / plugin / TUI     │  │
│                               │ renders nested tree    │  │
│                               └────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

There is no requirement that the data plane be this CLI. A harness can implement the same behavior natively (stdout watcher, background job hook, PTY reader) as long as it honors the state shape and the zero-polling contract. The CLI is the reference implementation and the smallest common denominator.

---

## Testing

```bash
cd mcp-server
npm test
```

The smoke suite covers one-shot emits, session resolution and isolation, pipe mode, wrap mode with a failing exit code, field preservation when attaching a relay, the MCP handshake and relay hint, 16 concurrent writers against one state file, and two concurrent sessions using identical task IDs (including parent roll-ups).

For manual demos, keep the real state clean by pointing the server, relay, and view at a throwaway file:

```bash
PROGRESS_STATE_PATH=/tmp/progress-demo.json ...
```

---

## Uninstalling

```bash
opencode mcp remove progress-server
```

Then remove the plugin entry from `~/.config/opencode/opencode.json` and, if you added it,
from `~/.config/opencode/cli.json`. For a published package, `opencode plugin remove <package>`
also works.

If you linked the relay: `cd mcp-server && npm unlink -g progress-mcp-server`.

---

## Files

- `mcp-server/index.js` — MCP server (stdio) and dual-mode CLI entrypoint (`relay`, `emit`)
- `mcp-server/state-store.js` — shared atomic, locked state store and bootvine tree roll-up
- `mcp-server/relay.js` — out-of-band relay implementation (pipe, wrap, emit)
- `mcp-server/progress-relay.js` — `progress-relay` bin shim
- `mcp-server/progress-emit.js` — `progress-emit` bin shim
- `mcp-server/test/smoke.test.js` — relay/MCP/concurrency smoke tests
- `mcp-server/package.json` — MCP server manifest
- `plugin/src/index.ts` — OpenCode server part (RPC + state watcher)
- `plugin/src/tui.tsx` — OpenCode TUI part (composer footer + tree)
- `plugin/src/gui.tsx` — OpenCode desktop/web GUI part (composer pill)
- `plugin/src/rpc.ts` — shared RPC contract (`list`, `updated`)
- `plugin/dist/gui-experimental.cjs` — prebuilt desktop/web GUI bundle (commit this)
- `plugin/package.json` — OpenCode plugin manifest (V2 `exports`)
- `plugin/index.js`, `plugin/gui-experimental.js` — legacy V1 plugin code (not loaded)
- `progress-gui-server.js` — Standalone desktop GUI HTTP server (renders nested tree)
- `launch-gui.sh` — Launch script for standalone GUI
- `setup.sh` — Setup script (installs MCP server)
- `tui-progress-guide.md` — Text/CLI implementation guide (ASCII progress bars + relay)
- `plugin/status-shim.js` — DOM shim that appends progress next to the native "Working" / "Thinking" text (served at `/status-shim.js`)
- `docs/desktop-status-shim.md` — How to shim into the desktop status indicator
- `docs/out-of-band-relay-spec.md` — Full model/agent/harness-agnostic relay specification
