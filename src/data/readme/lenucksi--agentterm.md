# agentterm

<img src="docs/media/logo.svg" alt="agentterm — PTY sessions for agents" width="380">

> Run long-lived processes the agent can read, write to and wait on.
> Stop wrapping dev servers in `&`.

**agentterm** is a PTY layer for coding agents: an OpenCode plugin, an MCP server for
harnesses that are not OpenCode, and a standalone web terminal — like tmux, but
agent-native.

[![CI](https://github.com/lenucksi/opencode-pty/actions/workflows/ci.yml/badge.svg)](https://github.com/lenucksi/opencode-pty/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-80%25+-brightgreen)](https://github.com/lenucksi/opencode-pty)
[![Version](https://img.shields.io/npm/v/@lenucksi%2Fagentterm)](https://www.npmjs.com/package/@lenucksi/agentterm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A plugin for [OpenCode](https://opencode.ai) that gives the agent real PTY sessions:
run dev servers, watchers, REPLs and TUIs in the background, send them input, read
their output on demand, and get notified when they exit. Multiple sessions, real
terminal emulation, a web UI and a TUI panel.

**Status:** actively maintained on `local/modernized` (1.0.1), published as
`@lenucksi/agentterm`. Fork of
[shekohex/opencode-pty](https://github.com/shekohex/opencode-pty); features are kept in a
shape that can be contributed upstream. The plugin id, the daemon socket and the state
directory keep the name `opencode-pty`: renaming them would orphan the archive and the
sidebar preferences of every existing install.

![agentterm in the browser](docs/media/web-ui-demo.gif)

![agentterm's TUI panel in OpenCode](docs/media/tui-demo.gif)

## Why agentterm?

tmux is built for a human attached to a terminal. agentterm is built for a model that
reads and types, and for a human who wants to watch the same process: a **PTY** layer,
not a pipe.

|                                | tmux                    | agentterm                                                                      |
| ------------------------------ | ----------------------- | ------------------------------------------------------------------------------ |
| Who reads it                   | a human, attached       | the agent: byte-exact paging with an offset cursor, regex filter, token budget |
| Who watches                    | a human                 | the human, in the browser, on the same process                                 |
| Waiting for new output         | polling in the terminal | `pty_wait`, or a `<pty_exited>` message, instead of polling                    |
| Programs that need a TTY       | yes                     | yes — a real PTY: mouse reporting, true colour, alternate screen               |
| What outlives the session      | the tmux server         | the daemon                                                                     |
| How the agent knows it is over | —                       | `<pty_exited>` (OpenCode) / `pty_wait` (MCP)                                   |

The word **PTY** is in the name of every tool for that reason: it is what people and
models type when they are looking for this.

OpenCode v2 can background shell calls — so this plugin isn't about _whether_ a process
runs in the background. It's about **real terminal emulation** and **shared control**:

- **Processes that need a TTY** — certain Ansible plays, SSH sessions, anything that prompts or formats for a terminal.
- **Long-running serial connections** — a VM's EFI/boot manager, a serial console you drive for minutes or hours.
- **Interactive programs** — REPLs, `top`, `vim`, prompts, TUIs.
- **Dev servers & watchers** (`bun run dev`, `cargo watch`, `bun test --watch`).

With a PTY, the agent and a human can send input to the _same_ running process, short or
long-lived, and both watch it through the web UI or the TUI panel. You get a real terminal
buffer with byte-exact paging, mouse reporting, selection, true colour, and exit
notifications instead of polling — like tmux, but agent-native.

## Install

OpenCode V2 (recommended):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [{ "package": "@lenucksi/agentterm", "options": { "port": 4200, "autostart": true } }]
}
```

`@lenucksi/agentterm` and `@lenucksi/agentterm/v2` are the same plugin — the bare name loads the V2
half, so a configuration that names either works. The TUI half is `@lenucksi/agentterm/v2/tui`,
and the host finds it by itself when the plugin directory has one.

This plugin needs OpenCode 2.x: the V1 plugin shape is gone, and the V2 half is the
only one there is.

### Not OpenCode? MCP.

The same eight tools, over MCP, for a harness that speaks it — Claude Code, Codex:

```json
{
  "mcpServers": {
    "pty": { "command": "bunx", "args": ["-p", "@lenucksi/agentterm", "agentterm-mcp"] }
  }
}
```

Same daemon, same sessions, same result tags — a session an MCP client starts is a
session the OpenCode plugin lists. The texts, the permission gate and the completion
signal are the route's own: see [`docs/mcp.md`](docs/mcp.md). The web interface is
also a binary of its own (`bunx -p @lenucksi/agentterm agentterm-web`) for a human who wants to watch.

## Where to find it

- **As an OpenCode plugin** — `@lenucksi/agentterm` in `opencode.json`; the TUI panel is
  found by the host from the package itself. The plugin id it reports is `opencode-pty`.
- **As an MCP server** — the same package ships `agentterm-mcp`, an MCP stdio server for
  harnesses that are not OpenCode (Claude Code, Codex, anything that speaks MCP). It is
  not a Bash replacement: the eight `pty_*` tools are added next to whatever shell tool
  the harness already has.
- **As a web terminal** — `agentterm-web` serves the same interface against the daemon,
  loopback by default.
- **Search terms that find it** — `pty`, `terminal`, `tmux`, `mcp`, `mcp-server`,
  `opencode-plugin`. The repository carries those as GitHub topics, the package as npm
  keywords, and the description names PTY, terminal, MCP and OpenCode in one sentence.

## Try it

Ask the agent: _"Start `bun run dev` as a background session and tell me when it's ready."_
It will call `pty_spawn`, wait for `<pty_exited>`/`pty_wait`, and report the URL.

## One session, end to end

```
pty_spawn: command="bun", args=["run","dev"], description="Dev server", title="Dev Server"
→ <pty_spawned id="pty_a1b2c3d4" cols="240" rows="80">

pty_read:  id="pty_a1b2c3d4", limit=50
→ last 50 lines of output

pty_read:  id="pty_a1b2c3d4", pattern="error|ERROR", ignoreCase=true
→ only the matching lines

pty_write: id="pty_a1b2c3d4", data="\x03"
→ Ctrl+C

pty_kill:  id="pty_a1b2c3d4", cleanup=true
→ terminated and freed
```

## Why this over the alternatives

- **vs. OpenCode's `bash` tool**: `bash` blocks until the process exits. PTYs run in the background and the agent reads, writes and waits on its own schedule — and gives the agent a real terminal, not a pipe.
- **vs. `tmux`/`screen`**: no second tool to learn, no pane to attach to. Sessions are first-class objects the agent can list, resize, screenshot and kill, with a web UI and a TUI panel.
- **vs. shelling out with `&`**: real terminal emulation (mouse reporting, selection, true colour), a bounded output buffer with byte-exact paging, and exit notifications instead of polling.

## Common invocations

```bash
# Dev server, sized for a wide terminal
pty_spawn({ command: "bun", args: ["run","dev"], description: "Dev server", cols: 200, rows: 50 })

# Serial console (raw line discipline — Enter arrives as CR, not LF)
pty_spawn({ command: "virsh", args: ["-c","qemu:///system","console","--force","myguest"],
            description: "Guest serial console", raw: true })

# Build, then wait for it
pty_spawn({ command: "npm", args: ["run","build"], description: "Build", notifyOnExit: true })
pty_wait({ id: "pty_..." })

# Full-screen program as a screen, not a byte stream
pty_screen({ id: "pty_..." })
```

## Configuration

Environment variables (full table in [`docs/configuration.md`](docs/configuration.md)):

| Variable               | Default      | What it does              |
| ---------------------- | ------------ | ------------------------- |
| `PTY_MAX_BUFFER_LINES` | `50000`      | Lines kept per session    |
| `PTY_READ_MAX_TOKENS`  | `25000`      | Default `pty_read` budget |
| `PTY_WEB_PORT`         | `0` (random) | Web UI port               |
| `PTY_WEB_HOSTNAME`     | `::1`        | Web UI bind host          |

Plugin options (V2): `port`, `hostname`, `autostart`, `retention`. Archive retention
(`maxSessions`, `maxAgeDays`, `maxBytesPerSession`) is enforced on the shared on-disk
archive; see `docs/configuration.md`.

Permissions: the model's `pty_spawn`/`pty_write` calls go through OpenCode's own
permission system — the same rules and the same prompt the built-in `bash` tool uses.
The web interface has no session to ask about, so it starts what you asked for.
See `docs/configuration.md`.

## Status, versioning, upgrade

- **Status**: actively maintained on `local/modernized` (1.0.0). Fork of
  [shekohex/opencode-pty](https://github.com/shekohex/opencode-pty); features are kept in a
  shape that can be contributed upstream.
- **Versioning**: SemVer. Breaking changes get a major bump.
- **Upgrade**: OpenCode checks for plugin updates on startup. Force a clean reinstall with
  `rm -rf ~/.cache/opencode/node_modules/opencode-pty && opencode`.

## Web UI & TUI panel

- **Web UI**: React/xterm, real-time WebSocket streaming, mouse selection, themes,
  download, session groups, coloured output. Start with `/pty-open-background-spy`.
- **TUI panel**: a PTY section in OpenCode's sidebar (2.0.23+) and a per-conversation
  session panel (`/pty-sessions`), with coloured output, scrollback and a command line.
- **REST API + WebSocket**: see [`docs/api.md`](docs/api.md).
- **Version identity**: `GET /api/server` and the Settings dialog show the build's
  version and the commit it was built from.

## How it works

1. **Spawn**: bun-pty runs the command in the background.
2. **Buffer**: rolling ring buffer (default 1 MB) with absolute character offsets.
3. **Read**: byte-exact paging via `since`; regex filtering; whole-result token budget.
4. **Screen**: `pty_screen` replays the buffer through the same VT parser the web UI uses.
5. **Write**: any input, including escape sequences.
6. **Lifecycle**: sessions persist until cleanup; auto-cleanup on session end.
7. **Notify**: `notifyOnExit` sends a `<pty_exited>` message.

More detail: [`docs/how-it-works.md`](docs/how-it-works.md), [`docs/diagrams.md`](docs/diagrams.md).

## Documentation

- [`docs/api.md`](docs/api.md) — REST API and WebSocket streaming
- [`docs/configuration.md`](docs/configuration.md) — environment variables, permissions, retention
- [`docs/web-ui.md`](docs/web-ui.md) — Web UI features and starting it
- [`docs/tui-panel.md`](docs/tui-panel.md) — TUI sidebar and session panel
- [`docs/how-it-works.md`](docs/how-it-works.md) — buffer, paging, screen rendering
- [`docs/credits.md`](docs/credits.md) — licence and the projects this stands on
- [`docs/diagrams.md`](docs/diagrams.md) — sequence diagrams
- [`docs/development.md`](docs/development.md) — local setup and quality gate

## Local development

```bash
bun install --force --frozen-lockfile
bun run test:local   # full quality gate (~15 steps)
bun run test:llm     # real model, costs tokens
bun run capture:demo # regenerate docs/media/web-ui-demo.gif
```

See [`docs/development.md`](docs/development.md).

## Licence

MIT — see [LICENSE](LICENSE). [Credits](docs/credits.md) names the four projects this
stands on; the full third-party notice is generated at build time (`dist/licenses.json`
and `dist/THIRD-PARTY-NOTICES.md`, shown in the docs dialog's **Licences** tab), with
each package's copyright line and every distinct licence body reproduced once.

## Contributing

Contributions welcome. Open an issue or PR. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Credits

- [OpenCode](https://opencode.ai) — the coding assistant this plugin extends
- [bun-pty](https://github.com/sursaone/bun-pty) — cross-platform PTY for Bun
- [shekohex/opencode-pty](https://github.com/shekohex/opencode-pty) — the upstream project this fork is based on; thanks for the original work

---

The V1 plugin is gone: the bare package name loads the V2 half, and OpenCode 1.x is no
longer supported.
