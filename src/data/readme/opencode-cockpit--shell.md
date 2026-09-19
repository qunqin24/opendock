# opencode-cockpit

[![CI](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml/badge.svg)](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-cockpit?color=%23cb3837&label=opencode-cockpit)](https://www.npmjs.com/package/opencode-cockpit)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/shell?color=%23cb3837&label=%40opencode-cockpit%2Fshell)](https://www.npmjs.com/package/@opencode-cockpit/shell)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Superpowers for [OpenCode](https://opencode.ai) — take all of them, or just the one you need.**

**[Documentation →](https://codestz.github.io/opencode-cockpit/)**  ·  [Install](https://codestz.github.io/opencode-cockpit/start/install/)  ·  [Shell](https://codestz.github.io/opencode-cockpit/shell/overview/)  ·  [Configuration](https://codestz.github.io/opencode-cockpit/configuration/)  ·  [Changelog](CHANGELOG.md)

Coding agents are stuck in a one-command-at-a-time world: they run something, wait for it to
finish, and paste the whole log back into their context. Cockpit gives your agent the things a
developer actually has — long-running terminals, a way to wait for "ready", and output it can read
without drowning in it — and gives *you* a live view of all of it, inside OpenCode.

![The shells panel: a dev server running under the conversation](media/dock.gif)

*A real recording — every demo here is generated from a live OpenCode session by
[`bun run record`](CONTRIBUTING.md), and re-run on release, so none of them can drift from what
ships.*

## Features

| Feature | What your agent gains | Package |
|---|---|---|
| **Shell** | Background terminals it starts, waits on, reads and types into — dev servers, watchers, test suites, REPLs | [`@opencode-cockpit/shell`](packages/shell) |
| **Agents** *(next)* | A live, keyboard-first view of every subagent, without leaving your chat | `@opencode-cockpit/agents` |

## Shell, by example

**"Start the dev server and wait until it's actually ready."**
The agent starts it in a real terminal and blocks on the port opening — not a guess, not a sleep:
```
shell_start  command="npm run dev"  waitFor={ port: 5173 }
→ condition met: port is accepting connections
  1| VITE v7.3.1  ready in 431 ms
```

**"Run the tests, keep working, tell me if they fail."**
The suite runs in the background. When it exits, the agent is messaged once, with the error line
already picked out:
```
<shell_exited id="sh_9wq2f1ab" title="unit tests">
exited with code 1 after 48s
last output: 37| FAIL src/auth.test.ts > refresh token expiry
```

**"How is DB Monitoring doing?"**
Shells are shared across sessions and can be addressed by name:
```
shell_read name="DB Monitoring"
```

**Logs that don't eat your context.** Colour codes stripped, progress-bar redraws collapsed to
their final frame, repeated lines folded to `(×12)`, and every read returns a cursor so the next
one only brings what's new. For full-screen programs (`vitest --ui`, `htop`, prompts) the agent can
ask for the *screen* instead of the log.

**It notices breakage on its own.** Watch a process that never exits and the agent hears only about
changes, never about a thousand identical recompiles:
```
shell_start command="tsc --watch --noEmit" description="type checker" watch=true
→ tsc: ok → fail · src/auth.ts(42,3): error TS2339: Property 'id' does not exist
```
Presets cover about 35 tools (tsc, vitest, jest, eslint, cargo, go, gradle, pytest, vite, next,
docker compose…), and anything else takes three regexes of its own. A watched process that dies
counts as a failure, so a crashed dev server is reported too.

**You can find things in a huge log.** `/` in the console filters the scrollback to matching lines,
keeping line numbers and highlighting matches — and output keeps the colours the program printed.

**It can type.** Prompts, REPLs, migration wizards: `shell_send` sends text or named keys
(`ctrl+c`, `up`, `enter`) and returns whatever the program printed back.

### Why not just `bash`?

| | Built-in `bash` tool | Cockpit Shell |
|---|---|---|
| Long-running processes | Blocks until exit | Runs in the background, survives the turn |
| Knowing something is ready | Guess, or sleep and poll | Blocks on a port, a pattern, silence or exit |
| Interactive programs | Not possible (no TTY) | Real PTY: prompts, REPLs, ctrl+c |
| Reading output | Whole log, every time | Clean lines from a cursor, with grep |
| Noticing a break later | Never | Watchers report health changes |
| Your visibility | None until it finishes | Live panel, console and sidebar |
| After OpenCode restarts | Gone | Still running |

## For you, not just the agent

| Key / command | Does |
|---|---|
| `ctrl+x o` · `/shells` | Toggle the shells panel under the chat |
| `ctrl+x i` · `/shell` | Open the shell console |
| `/shell-new` | Start a shell yourself |
| `/shells-clear` | Remove finished shells |
| `/cockpit-update` | Update the plugin when a newer release exists |

Status reads the same everywhere — `RUN` (with a spinner), `FAIL`, `STOP`, `DONE` — running shells
and recent failures stay in view, the rest folds behind `▸ N more`. In the console: `i` types
straight into the program (`ctrl+]` to stop), `c` sends ctrl+c, `r` restarts, `x` stops, `tab`
switches between the live screen and the scrollback, `?` shows details.

## Install

**Everything**

```sh
opencode plugin opencode-cockpit --global
```

**Only what you want**

```sh
opencode plugin @opencode-cockpit/shell --global
```

Restart OpenCode. Requires OpenCode 1.18+ on macOS or Linux. Install a feature either through
`opencode-cockpit` or on its own — if both are configured, the first one loaded is used and
OpenCode warns you which entry to remove.

**Turn features off** (in both `opencode.json` and `tui.json`):

```json
{
  "plugin": [["opencode-cockpit", { "features": { "shell": true } }]]
}
```

**Configure them** in one file, read by both halves of the plugin and by every project:

```
~/.config/opencode-cockpit/config.json   →   <project>/.cockpit.json   →   plugin-entry options
```

```json
{
  "kinds": { "e2e": "playwright|cypress" },
  "defaults": { "logFile": true, "timeoutSeconds": 900 },
  "ui": { "dockHeight": 16, "historyMinutes": 60 }
}
```

Later sources win key by key, and an invalid file is ignored rather than fatal. You can categorize
your own commands, define watch rules, cap how long shells live, choose what may interrupt the
agent, and trade context tokens for accuracy. Each feature's README documents its own settings:
[Shell](packages/shell#configuration).

## How it works

```
OpenCode TUI thread ── feature plugins (tui) ──┐
                                                ├── unix socket, JSON-RPC ── cockpitd ── processes
OpenCode server worker ─ feature plugins (server) ┘
```

OpenCode runs its interface and its server in separate threads, so a plugin's two halves can't
share memory. Both talk to **`cockpitd`**, a small daemon that owns every long-lived process: it
starts on demand, is shared by every OpenCode window, upgrades itself when a newer plugin connects,
cleans up processes left by a crash, and exits when idle. That's why shells outlive OpenCode
restarts, and why one session can look at a shell another session started.

Each shell's output feeds three views at once: a normalized **log** for the agent, an emulated
**screen** for you, and a raw ring buffer so a panel opened late can catch up.

### Packages

| Package | What it is | Docs |
|---|---|---|
| [`opencode-cockpit`](packages/opencode) | The bundle: every bay, each switchable | [README](packages/opencode/README.md) |
| [`@opencode-cockpit/shell`](packages/shell) | Bay 01 — background terminals | [README](packages/shell/README.md) · [docs](https://codestz.github.io/opencode-cockpit/shell/overview/) |
| [`@opencode-cockpit/daemon`](packages/daemon) | `cockpitd`, the shared process host | [README](packages/daemon/README.md) |
| [`@opencode-cockpit/client`](packages/client) | Typed, auto-spawning client | [README](packages/client/README.md) |
| [`@opencode-cockpit/protocol`](packages/protocol) | Wire contracts and schemas | [README](packages/protocol/README.md) |

## Roadmap

- **Agents** — live subagent tree with a peek overlay.
- **Doctor** — one command that checks your setup and tells you how to fix it.
- Shell groups in the sidebar, if the five-row cap ever stops being enough.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the architecture,
the invariants worth knowing before changing anything, and how to run your working copy inside
OpenCode.

```sh
bun install
bun run check        # lint, typecheck, tests (real PTYs, real daemon)
bun run pack:check   # pack, install the tarballs, run a shell through them
bun run smoke:tui    # drive a real OpenCode against the packed plugin
```

## License

[MIT](LICENSE)
