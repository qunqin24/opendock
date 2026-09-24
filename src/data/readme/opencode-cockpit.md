# opencode-cockpit

[![CI](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml/badge.svg)](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-cockpit?color=%23cb3837&label=opencode-cockpit)](https://www.npmjs.com/package/opencode-cockpit)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/shell?color=%23cb3837&label=%40opencode-cockpit%2Fshell)](https://www.npmjs.com/package/@opencode-cockpit/shell)
[![npm](https://img.shields.io/npm/v/@opencode-cockpit/status?color=%23cb3837&label=%40opencode-cockpit%2Fstatus)](https://www.npmjs.com/package/@opencode-cockpit/status)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Give [OpenCode](https://opencode.ai) the instruments it does not ship with.**

**[Documentation →](https://codestz.github.io/opencode-cockpit/)**  ·  [Install](https://codestz.github.io/opencode-cockpit/start/install/)  ·  [Shell](https://codestz.github.io/opencode-cockpit/shell/overview/)  ·  [Review](https://codestz.github.io/opencode-cockpit/review/overview/)  ·  [Statusline](https://codestz.github.io/opencode-cockpit/status/overview/)  ·  [Changelog](CHANGELOG.md)

A tool call has to finish. A dev server does not, and neither does the context window filling up
behind you. Cockpit is the instrument panel: things your agent can use, and things that tell you
what it is doing.

```sh
opencode plugin opencode-cockpit@0.5.2 --global --force
```

---

### 🖥️  Shell — terminals that keep running

Your agent starts a dev server and the tool call blocks until you kill it. It backgrounds one
instead and loses the output. **Shell** gives it terminals with a real PTY that outlive the turn,
wait for a port or a pattern, and hand back the part that matters — and gives you a panel where
every one of them reports its own health.

![The shells panel: a dev server running under the conversation](media/dock.gif)

*A real recording. Every demo here is generated from a live OpenCode session by
[`bun run record`](CONTRIBUTING.md) and re-run on release, so none of them can drift from what
ships.*

**9 agent tools · 35 watch presets · [docs](https://codestz.github.io/opencode-cockpit/shell/overview/) · [`@opencode-cockpit/shell`](packages/shell)**

---

### 🔍  Review — a pull request in the terminal

Reviewing what your agent wrote means reading a diff in a chat log and describing your objection in
prose. **Review** gives you the diff where the work happened, comments on the lines they are about,
and an agent that can read them, answer them and mark them resolved — which a chat message cannot do.

Comments live on the branch rather than in the chat, so they outlive the conversation. `s` hands them
over; the agent fetches them with `review_list`, changes the code, and answers with
`review_reply resolved=true`. That resolve is **checked against the file**: a thread remembers the
lines it was written against, so "done" over an untouched file is recorded as a reply and the thread
stays open for you.

**3 agent tools · 12 filetypes · [docs](https://codestz.github.io/opencode-cockpit/review/overview/) · [`@opencode-cockpit/review`](packages/review)**

---

### 📊  Statusline — what the session is costing you

How full is the context? Where did the tokens go? What has changed? OpenCode answers the first in a
corner and the rest not at all. **Statusline** answers them where you are already looking.

![The statusline under an OpenCode conversation: a context bar at 40%, the token total with its cache, input and output parts, what is uncommitted, elapsed time and todo progress](media/statusline.png)

*The default line — no configuration written at all. Every part is a segment you can reshape,
recolour or remove, or write yourself in TypeScript. Your Claude Code statusline script runs here
unchanged, colours and all.*

**14 segments · 2 surfaces · [docs](https://codestz.github.io/opencode-cockpit/status/overview/) · [`@opencode-cockpit/status`](packages/status)**

---

### 🔄  Updater — every plugin, and what it is really running

OpenCode installs a plugin once and never resolves its spec again, so `@latest` quietly means *the
release that was newest the day you installed it* — and nothing anywhere says which one that was.
**Updater** lists every plugin you have, what is running beside what your config says and what is
published, and updates the ones you pick. It pins an exact version through OpenCode's own
`opencode plugin`, clears the stale cache, and reads every file back before calling it done.

![The updater in OpenCode: a plugin frozen behind @latest at 1.2.3 and one pinned behind, reviewed, updated, and both confirmed on disk](media/updater.gif)

`/plugins-update` inside OpenCode, or `npx opencode-cockpit@latest update` from a shell — which
works whatever version you are stuck on, because it comes from npm rather than from the copy that
cannot update itself.

**Every plugin, not just this one · [`@opencode-cockpit/updater`](packages/updater)**

---

Each bay is its own npm package with a switch in config. They share the daemon, the config file and
the keys, so the second costs nothing and moving between them changes nothing you already set up.

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
| `/shells` | Every shell in view, plus "New shell": pick one to open its console |
| `ctrl+x o` · `/shells-dock` | Toggle the shells panel under the chat |
| `ctrl+x i` · `/shell` | Reopen the last shell's console |
| `/shell-new` | Start a shell yourself |
| `/shells-clear` | Remove finished shells |
| `/plugins-update` | Every plugin you have installed: what runs, what is published, and an update checked against disk |

Status reads the same everywhere — `RUN` (with a spinner), `FAIL`, `STOP`, `DONE` — running shells
and recent failures stay in view, the rest folds behind `▸ N more`. In the console: `i` types
straight into the program (`ctrl+]` to stop), `c` sends ctrl+c, `r` restarts, `x` stops, `tab`
switches between the live screen and the scrollback, `?` shows details.

## Install

**Everything**

```sh
opencode plugin opencode-cockpit@0.5.2 --global --force
```

**Only what you want**

```sh
opencode plugin @opencode-cockpit/shell@0.5.2 --global --force
```

The version is pinned on purpose. OpenCode resolves a plugin spec once and never again, so a
bare `opencode-cockpit` or `@latest` stays on whatever it installed first. `--force` replaces an
entry you already have, so the same line is also how you move to a newer release.

**Stuck on an old version?** This runs outside OpenCode, from npm, so it works whatever you have
installed — and shows every plugin you have, not just this one:

```sh
npx opencode-cockpit@latest update     # or: bunx opencode-cockpit@latest update
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
| [`@opencode-cockpit/status`](packages/status) | Bay 02 — the statusline | [README](packages/status/README.md) · [docs](https://codestz.github.io/opencode-cockpit/status/overview/) |
| [`@opencode-cockpit/review`](packages/review) | Bay 03 — a pull request in the terminal | [README](packages/review/README.md) · [docs](https://codestz.github.io/opencode-cockpit/review/overview/) |
| [`@opencode-cockpit/updater`](packages/updater) | Bay 04 — every plugin, and an update checked against disk | [README](packages/updater/README.md) |
| [`@opencode-cockpit/daemon`](packages/daemon) | `cockpitd`, the shared process host | [README](packages/daemon/README.md) |
| [`@opencode-cockpit/client`](packages/client) | Typed, auto-spawning client | [README](packages/client/README.md) |
| [`@opencode-cockpit/protocol`](packages/protocol) | Wire contracts and schemas | [README](packages/protocol/README.md) |

## What is being worked on

Not a roadmap of promises — the next thing, and why it is next.

**Doctor.** One command that checks your setup and says how to fix it: which halves are loaded,
which keys collide, whether a daemon is running code older than the plugin talking to it.

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
