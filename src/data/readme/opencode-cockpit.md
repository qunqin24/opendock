# opencode-cockpit

[![CI](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml/badge.svg)](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-cockpit)](https://www.npmjs.com/package/opencode-cockpit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Superpowers for [OpenCode](https://opencode.ai).

The first one is **Shell**: background terminals that the agent starts, waits on and drives,
and that you watch and control without leaving the chat.

- **The agent stops sleeping and polling.** It starts a dev server and blocks until the port
  opens, runs a slow test suite and gets a message when it finishes, drives REPLs and prompts.
- **Logs that don't waste tokens.** Colours are stripped, progress-bar redraws collapse to their
  final frame, repeated lines fold, and reads continue from a cursor.
- **You see everything.** A docked panel under the chat, a sidebar section, and a keyboard-first
  console with a real typing mode.
- **Shells outlive OpenCode.** They run in a small daemon, `cockpitd`, shared by every OpenCode
  window and restarted automatically when the plugin updates.

## Install

```sh
opencode plugin opencode-cockpit --global
```

This adds the plugin to both `opencode.json` (agent tools) and `tui.json` (interface). Restart
OpenCode. Requires OpenCode 1.18 or newer on macOS or Linux.

## For the agent

| Tool | What it does |
|---|---|
| `shell_start` | Run a command in a background PTY. Optional `waitFor` blocks until a port opens, a pattern prints, output goes idle, or the process exits. Rerunning the same command in the same session reuses the shell. |
| `shell_wait` | Block on a condition instead of sleeping. |
| `shell_read` | Clean log from a cursor, with `grep`; or `view: "screen"` for full-screen programs. |
| `shell_send` | Type text or keys (`ctrl+c`, `up`, `enter`) and get the reply. |
| `shell_list` · `shell_stop` · `shell_restart` | Manage shells. |

The agent is messaged when a shell it started exits on its own.

Things to ask:

- *"Start the dev server in a background shell and wait until it's ready."*
- *"Run the test suite in the background, keep working on the parser, tell me if it fails."*
- *"Open a node REPL in a shell and check what `new URL('..', import.meta.url)` returns."*

## For you

| Key / command | Does |
|---|---|
| `ctrl+x o` · `/shells` | Toggle the shells panel under the chat |
| `ctrl+x i` · `/shell` | Open the shell console |
| `/shell-new` | Start a shell yourself |
| `/shells-clear` | Remove finished shells |
| `/shells-restart-daemon` | Restart `cockpitd` (asks first when shells are running) |

Status reads the same everywhere: `RUN` (with a spinner), `FAIL`, `STOP`, `DONE`. Running shells
and recent failures stay visible; everything else folds into `▸ N more`.

**Console keys.** Running shell: `i` type (every key goes to the program, `ctrl+]` to stop typing),
`c` ctrl+c, `r` restart, `x` stop. Finished shell: `r` run again, `d` remove. Always: `tab`
screen or log, `?` details, `[` `]` switch, `D` clear finished, `a` show all, `esc` close.

## Configuration

Options go on the plugin entry in `tui.json`:

```json
{
  "plugin": [
    ["opencode-cockpit", {
      "dockHeight": 16,
      "dockOpen": true,
      "historyMinutes": 60,
      "keybinds": { "cockpit.shells.dock": "<leader>j", "cockpit.shells.console": "<leader>k" }
    }]
  ]
}
```

| Environment variable | Default | Purpose |
|---|---|---|
| `COCKPIT_HOME` | `~/.cache/opencode-cockpit` | Socket, logs, process registry |
| `COCKPIT_IDLE_TIMEOUT_MS` | `600000` | Daemon exits after this long with no clients and no running shells |
| `COCKPIT_LOG_LEVEL` | `info` | `debug` for verbose daemon logs |

## Troubleshooting

| Problem | Look at |
|---|---|
| Tools fail with "did not start" | `~/.cache/opencode-cockpit/cockpitd.log` |
| Plugin not loading | newest file in `~/.local/share/opencode/log/` |
| Panel says the daemon runs older code | `/shells-restart-daemon` once your shells are done |

## How it works

```
OpenCode TUI thread ── opencode-cockpit/tui ──┐
                                               ├── unix socket, JSON-RPC ── cockpitd ── PTYs
OpenCode server worker ─ opencode-cockpit/server ┘
```

OpenCode runs its interface and its server in separate threads, so the plugin's two halves can't
share memory. Both talk to `cockpitd`, which owns every process. Each shell's output feeds a line
normalizer (the agent's log), a headless terminal emulator (the screen you see) and a raw ring
buffer (replay for late viewers). See [CONTRIBUTING.md](CONTRIBUTING.md) for the full picture.

| Package | Role |
|---|---|
| [`opencode-cockpit`](packages/opencode) | The plugin: agent tools and TUI |
| [`@opencode-cockpit/daemon`](packages/daemon) | `cockpitd` |
| [`@opencode-cockpit/client`](packages/client) | Typed, auto-spawning client |
| [`@opencode-cockpit/protocol`](packages/protocol) | Wire contracts |

## Roadmap

- **Watchers:** `tsc`, `eslint` and `vitest` shells that report only state changes.
- **Agents panel:** live subagent tree with a peek overlay.
- Coloured output in the panel and console.

## License

[MIT](LICENSE)
