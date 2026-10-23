# opencode-monitor

[![npm version](https://img.shields.io/npm/v/opencode-monitor.svg)](https://www.npmjs.com/package/opencode-monitor)
[![node](https://img.shields.io/node/v/opencode-monitor.svg)](https://www.npmjs.com/package/opencode-monitor)
[![license](https://img.shields.io/npm/l/opencode-monitor.svg)](./README.md#license)

**Let your [OpenCode](https://opencode.ai) agent wait for things — without burning turns or tokens.**

`monitor` is a tool for the OpenCode agent that watches an external condition — a
log line appearing, a port opening, a file changing, a CI run finishing, an event
stream — and wakes the agent **per event**. The waiting happens in a cheap shell
process, so the agent is parked at roughly zero cost and resumes the instant there
is signal. It's the OpenCode counterpart of Claude Code's built-in Monitor tool.

Supports **OpenCode v1 and v2** with the same monitor tools and sidebar. Version
0.4.0 was tested with OpenCode 1.19.3 and 2.1.2. Node ≥ 22 is required.

For OpenCode v2:

```sh
opencode plugin add opencode-monitor
```

For OpenCode v1:

```sh
opencode plugin opencode-monitor -g
```

The sidebar ships precompiled; no build runs during installation. For a local
build, run `npm pack`, install its archive in your OpenCode config directory, and
add `"./node_modules/opencode-monitor"` to `plugin` in `opencode.jsonc`. V2 accepts
that legacy field too. Add the same path to `plugins` in `cli.json` (v2) or
`plugin` in `tui.json` (v1). Local directory entry files are included for v2's
plugin resolver.

## Why

An agent that needs to wait for something otherwise has two bad options:

- **Poll in a loop** — every check is a full LLM turn. Expensive, slow, and it
  floods the context.
- **`sleep N` in bash** — blocks the tool call for a fixed time, is not driven by
  the actual condition, and freezes the agent.

`monitor` moves the waiting into the shell. It arms a long-lived watcher and
**pushes each matching stdout line into the session**: idle agents wake, and
active runs receive steering at the next model-turn boundary. The call returns
immediately with a monitor id; the agent spends roughly zero effort while parked.

## Quick example

Watch an app log and wake only on errors:

```
monitor({
  description: "app errors",              // label shown in every wake + the sidebar
  command: "tail -n0 -f /var/log/app.log",
  ready_pattern: "ERROR|FATAL",           // only wake on matching lines (omit = wake on every line)
})
```

The call returns a monitor id immediately. Each matching line then arrives as a
notification, tagged with the label:

```
<monitor id="m_1a2b3c4d" line="7" label="app errors">
connection reset by peer
</monitor>
```

When the command exits (or the watch times out) a final notice is pushed and the
monitor disappears from the registry and the sidebar:

```
<monitor id="m_1a2b3c4d" exited code="0" label="app errors">command finished after 6 line(s); last: "done"</monitor>
```

## Usage

`monitor` always arms a **streaming** watcher — every stdout line becomes a wake.
It takes:

| # | field             | required | meaning                                                        |
| - | ----------------- | -------- | -------------------------------------------------------------- |
| 1 | `command`         | yes      | shell command to run and watch                                 |
| 2 | `description`     | no       | label shown in each wake and the sidebar                       |
| 3 | `ready_pattern`   | no       | regex — only lines matching it wake the agent (omit = all)     |
| 4 | `persistent`      | no       | `true` = run for the whole session; default = bounded          |
| 5 | `timeout_seconds` | no       | bounded watches auto-stop after this (default 300, max 3600)   |
| 6 | `steer`           | no       | `true` (default) = deliver during active runs; `false` = wait for each wake's full response |

### Steering vs serialized delivery

By default, events are submitted as they arrive, even while the agent is already
working or responding to a previous event. OpenCode picks them up at the next
model-turn boundary; the current streamed response is allowed to finish. An idle
session is woken immediately. Multiple events can be handled together in the next
model turn.

Set `steer: false` to keep the previous behavior: submit one event, wait for the
agent's full response, then submit the next event. Later events remain queued in
the monitor until that response finishes.

```
monitor({ description: "deploy events", command: "tail -n0 -f deploy.log",
          ready_pattern: "READY|FAILED", steer: false })
```

### Bounded vs session-length

- **Bounded** (default) — auto-stops after `timeout_seconds`. Use it when you only
  care about a window:
  ```
  monitor({ description: "deploy events", command: "tail -n0 -f deploy.log",
            ready_pattern: "READY|FAILED", timeout_seconds: 600 })
  ```
- **Session-length** (`persistent: true`) — runs until the command exits or you
  stop it, no timeout. Use it for an always-on watcher:
  ```
  monitor({ description: "incoming DMs", command: "watch-dms.sh", persistent: true })
  ```

### Observe and cancel

```
monitor_list()                     // active monitors: id, label, pid, line count
monitor_stop({ id: "m_1a2b3c4d" }) // stop one; reaps the whole process tree
```

Monitors are auto-stopped when their parent session is deleted, and the whole
process tree is reaped on stop (`setsid` session kill), so nothing leaks.

> **When _not_ to use it:** for a command that finishes quickly, call `bash` (v1)
> or `shell` (v2) directly — `monitor` is for waiting on a slow or ongoing external condition, not
> a replacement for normal command execution. It also isn't a background *service
> manager*: it watches a process and wakes you on its output, but does not hold a
> long-running server open for you to keep interacting with.

## Sidebar panel

Armed monitors show up live in the OpenCode sidebar, next to MCP / LSP / Context.
Each one lists its description (or id), the command, line count / pid / age, and
the last line received:

```
▼ Monitors (1)
● app errors  m_1a2b3c4d
tail -n0 -f /var/log/app.log
lines=42 pid=3605900 age=1m3s
└ connection reset by peer
```

Click the `Monitors` header (or the `▼`/`▶` marker) to collapse it to a single
line, exactly like the built-in MCP panel. Monitors vanish from the panel the
moment they finish — only live watchers are listed. The panel updates by push, so
keeping it current costs no agent turns.

## How it works

Monitors run on the OpenCode **server** (a detached daemon), so they keep running
and waking the session even with no TUI attached — closing the sidebar or the
whole TUI does not stop them.

The command runs under `setsid` in its own process group, so when the watch ends —
for any reason — the whole tree is reaped with `SIGTERM` then `SIGKILL`.
Grandchildren die too; nothing leaks.

On v1, each stdout line uses the synchronous `session.prompt` route, which
reliably wakes idle sessions. Steering does not await its full response;
`steer: false` does.

On v2, each line uses `session.synthetic` with `delivery: "steer"` and
`resume: true`. Admission is awaited to preserve event order. For `steer: false`,
`session.wait` also waits for the full agent response before the next line is
submitted. Notifications retain their synthetic origin. Deleting a session or
disposing its v2 plugin stops its watchers and closes its status socket.

<details>
<summary><b>Design notes: how the sidebar sees server-side state</b></summary>

Both runtime adapters share a **per-invocation Unix status socket**
(`<runtime>/opencode-monitor/status-<worktreeHash>-<token>.sock`, token random per
plugin load). This keeps the sidebar independent of message-history syncing and
uses the same transport on both versions. The v1 adapter registers
`sidebar_content`; the v2 adapter appends to `sidebar.content`.

The runtime dir is resolved via
[`xdg-basedir`](https://github.com/sindresorhus/xdg-basedir) — `XDG_RUNTIME_DIR`
on Linux (0700, user-private), falling back to the per-user temp dir off-Linux;
the server mkdirs it `0700`. OpenCode can run more than one server process per
worktree and hot-reloads plugins (so an engine can exist more than once per
process), and each incarnation hosts its own in-memory registry — hence the random
per-load token rather than a pid (a pid token collides with itself across reloads
and orphans already-armed monitors off the filesystem). The panel connects to
**every** socket in its worktree and merges them, so a monitor armed in any engine
is visible; dead sockets from exited/crashed servers are pruned on the next start.
The server pushes a fresh snapshot on every change (armed, stopped, throttled per
line).

</details>

## CLI

The engine is also usable outside OpenCode as a standalone "block until condition"
shell tool — a condition-driven `timeout(1)`:

```sh
node src/cli.ts 'while ! curl -sf localhost:3000/health; do sleep 1; done' --timeout 120
node src/cli.ts 'tail -n0 -f app.log' --ready 'READY|ERROR' --json
```

This is the single-return engine (`runMonitor`), separate from the plugin's
streaming `monitor` tool. Exit codes follow `timeout(1)`: `124` on timeout,
otherwise the command's exit code.

## Develop

```sh
npm install
npm run build       # compile dist/tui.js (server.ts is loaded from source)
npm test            # node:test
npm run typecheck
```

Run the integration test against each installed OpenCode executable (requires
Python 3, tmux, and the Unix shell utilities used by the watcher):

```sh
OPENCODE_TEST_BINARY=/path/to/opencode-v1 node --test test/steering-live.test.ts
OPENCODE_TEST_BINARY=/path/to/opencode-v2 node --test test/steering-live.test.ts
```

It starts an isolated real server and TUI with a controlled local model stream.
The model calls the actual `monitor`, `monitor_list`, and `monitor_stop` tools.
Checks cover regex filtering, mid-stream delivery, event order at the next model
boundary, serialized opt-out, idle wakes, live sidebar counts and output, watcher
termination, and cleanup after session deletion. Sessions, processes, tmux state,
and temporary files are removed afterward; no remote model or credentials are
used. Set `OPENCODE_TEST_PLUGIN` to an installed package's absolute directory to
test the packed deployment rather than the checkout.

### Publish

`prepack` compiles the Solid JSX to plain JavaScript because OpenTUI does not
transform JSX in installed npm packages. Renderer imports stay external so the
plugin shares OpenCode's renderer and reactive state. The build runs automatically, so the published tarball always contains
the compiled `dist/tui.js` — OpenCode installs plugins with scripts disabled, so
the artifact must ship prebuilt rather than being built on the user's machine:

```sh
npm version patch   # or minor / major
npm publish
git push --follow-tags
```

## License

MIT
