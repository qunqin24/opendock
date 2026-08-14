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

```sh
opencode plugin opencode-monitor -g
```

> Requires OpenCode and Node ≥ 22. Installs prebuilt — there is no build step on
> your machine. Drop `-g` to install into the current project only, or pin a
> version with `opencode plugin opencode-monitor@0.2.0 -g`.

## Why

An agent that needs to wait for something otherwise has two bad options:

- **Poll in a loop** — every check is a full LLM turn. Expensive, slow, and it
  floods the context.
- **`sleep N` in bash** — blocks the tool call for a fixed time, is not driven by
  the actual condition, and freezes the agent.

`monitor` moves the waiting into the shell. It arms a long-lived watcher and
**pushes each stdout line back into the session as a new turn**, so the agent
wakes per event without re-arming. The call returns immediately with a monitor
id; the agent spends roughly zero effort while parked.

## Quick example

Watch an app log and wake only on errors:

```
monitor({
  description: "app errors",              // label shown in every wake + the sidebar
  command: "tail -n0 -f /var/log/app.log",
  ready_pattern: "ERROR|FATAL",           // only wake on matching lines (omit = wake on every line)
})
```

The call returns a monitor id immediately. Each matching line then arrives as its
own wake, tagged with the label:

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

| field             | required | meaning                                                        |
| ----------------- | -------- | -------------------------------------------------------------- |
| `command`         | yes      | shell command to run and watch                                 |
| `description`     | no       | label shown in each wake and the sidebar                       |
| `ready_pattern`   | no       | regex — only lines matching it wake the agent (omit = all)     |
| `persistent`      | no       | `true` = run for the whole session; default = bounded          |
| `timeout_seconds` | no       | bounded watches auto-stop after this (default 300, max 3600)   |

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

> **When _not_ to use it:** for a command that finishes quickly, just call `bash`
> directly — `monitor` is for waiting on a slow or ongoing external condition, not
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

Each stdout line is forwarded to the session via OpenCode's synchronous
`POST /session/:id/message` (the SDK `session.prompt`). That is the *reliable* wake
path — deliberately not the `prompt_async` endpoint, which is silently dropped on
idle sessions
([anomalyco/opencode#21524](https://github.com/anomalyco/opencode/issues/21524)).
Wakes are serialized one per turn, so a chatty watcher cannot flood the agent.

<details>
<summary><b>Design notes: how the sidebar sees server-side state</b></summary>

OpenCode has no in-band channel for a plugin to surface server-side state to the
TUI (the reactive `api.state` only carries built-in domains — sessions, LSP, MCP,
todos; `tui.publish` is limited to four fixed UI-action events), and there is no
client endpoint to invoke a tool. So the engine exposes its live registry
out-of-band, over a **per-invocation unix status socket**
(`<runtime>/opencode-monitor/status-<worktreeHash>-<token>.sock`, token random per
plugin load) — the conventional status-endpoint pattern (cf. docker/systemd),
independent of whether the session log is synced, compacted, or even has a TUI.

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
npm run build       # compile dist/tui.jsx (server.ts is loaded from source)
npm test            # node:test
npm run typecheck
```

### Publish

`prepack` runs the build automatically, so the published tarball always contains
the compiled `dist/tui.jsx` — OpenCode installs plugins with scripts disabled, so
the artifact must ship prebuilt rather than being built on the user's machine:

```sh
npm version patch   # or minor / major
npm publish
git push --follow-tags
```

## License

MIT
