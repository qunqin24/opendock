# opencode-monitors

[![CI](https://github.com/elad12390/opencode-monitors/actions/workflows/ci.yml/badge.svg)](https://github.com/elad12390/opencode-monitors/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-monitors.svg)](https://www.npmjs.com/package/opencode-monitors)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Background monitors for [OpenCode](https://opencode.ai), like Claude Code's Monitor tool. The agent runs a command in the background, and every new line it prints arrives in the session as a message, so the agent reacts the moment something happens instead of polling or sleeping. You see every monitor, read its output and kill it with `/monitors`.

[![OpenCode monitor demo: view live logs, filter by project, expand output, stop a monitor and see the agent notified](https://raw.githubusercontent.com/elad12390/opencode-monitors/main/docs/assets/monitors-demo.gif?v=2)](https://raw.githubusercontent.com/elad12390/opencode-monitors/main/docs/assets/monitors-demo.gif?v=2)

*A real OpenCode session using fictional log entries; the local account name is redacted.* The popup shows all output, while matching lines notify the agent. Press `k` twice to stop a monitor. [View the popup up close](https://raw.githubusercontent.com/elad12390/opencode-monitors/main/docs/assets/monitors-popup.png?v=2).

```
You:    Tail server.log and tell me the moment a 5xx shows up.
Agent:  [starts a monitor on: tail -F server.log | grep --line-buffered " 5[0-9][0-9] "]
        ...keeps working, or waits...
        [monitor] 2026-10-29 14:03:27 GET /api/orders 502
Agent:  A 502 on /api/orders just appeared. Looking at the upstream now.
```

## Install

Add the package to `plugins` in your OpenCode config (`~/.config/opencode/opencode.jsonc` for every project, or a project's `opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-monitors"]
}
```

OpenCode installs it and loads it, including the `/monitors` popup. Config changes apply without a restart.

On OpenCode 1.x use the `plugin` key instead. The tools and notices work there too; the `/monitors` popup needs OpenCode 2.

## What the agent gets

| Tool | What it does |
|---|---|
| `monitor` | Runs a command in the background and sends each new line it prints to the session. Optional `filter` (only matching lines) and `until` (stop after the first matching line) take JavaScript regexes. |
| `stop_monitor` | Stops a monitor, by its description or its ID. |
| `list_monitors` | Lists the running monitors. |

Each tool's description tells the agent what the tool does, why and when to use it (and when not), and how, so the agent picks it up without extra instructions.

The agent is always told when a monitor ends, after its last output: the command finished or failed (with its exit code and last stderr lines), you killed it from `/monitors`, its `until` matched, it stopped for flooding, or OpenCode restarted. Where restarting makes sense, the message includes the command.

### Examples

- Wait for CI: `gh run watch 4812` with `until: "completed|failed"`
- Only errors: `tail -F app.log | grep --line-buffered -E "ERROR|FATAL"`
- A dev server crash: `bun run dev` with `filter: "Error|panic|EADDRINUSE"`

Pipe `grep` with `--line-buffered`; without it, grep holds lines back and they arrive late or not at all.

## `/monitors`

Type `/monitors`, or pick **Monitors** from the command palette.

- `↑` `↓` select a monitor. Its command, process ID, filter and recent output (stdout and stderr, up to 1,000 lines) show below the list.
- `enter` expands the output; `↑` `↓` scroll, `pgup` `pgdn` page, `end` follows new output.
- `k` twice kills the selected monitor.
- `tab` switches between **All projects** and **This project**, and remembers the choice.
- `esc` closes it.

## Safety and limits

- A monitor runs your command with your user's permissions, like any shell command the agent runs. OpenCode's shell permission rules do not apply to it yet; see [the comparison](https://github.com/elad12390/opencode-monitors/blob/main/docs/claude-code-monitor-comparison.md).
- Output is batched every 200 ms. A command printing more than 100 lines per second is stopped, with a notice.
- `filter` and `until` run in a worker thread; a pattern that takes more than 250 ms on one line stops the monitor instead of freezing OpenCode. Lines over 64K characters are cut.
- The popup's recent-output buffer is kept in memory. Lines delivered to the agent, and stderr excerpts in failure notices, can be saved in OpenCode's session history; avoid watching secrets.
- Monitors are recorded in `~/.local/state/opencode-monitors/monitors.json` (override with `OPENCODE_MONITORS_STATE_FILE`). If OpenCode restarts or crashes, the next start kills the commands left running, after checking each process still runs that command, and tells each session that its monitor stopped.
- The command gets the session's ID in `MONITOR_SESSION_ID`.

## How it compares with Claude Code

[Compare it feature by feature with Claude Code's Monitor tool](https://github.com/elad12390/opencode-monitors/blob/main/docs/claude-code-monitor-comparison.md), including measured performance.

## Develop

```bash
bun install
bun run typecheck
bun run test              # unit tests
bun run test:integration  # real processes, plugin copies, restarts
bun run test:tui          # the /monitors popup, rendered and driven with key presses
bun run test:perf         # latency, batching, flood, scale, hostile output
bun run test:package      # tests OpenCode's resolver, installs the tarball and loads every entry point
```

To try a local checkout, run `bun install` and `bun run build`, then point OpenCode at the folder: `"plugins": ["file:///path/to/opencode-monitors"]`. OpenCode loads the server and built TUI through the package exports.

See [CONTRIBUTING.md](https://github.com/elad12390/opencode-monitors/blob/main/CONTRIBUTING.md) for how changes and releases work.

## Credits

Forked from [opencode-sentinel](https://github.com/tsukimiya/opencode-sentinel) by Kiryu Tsukimiya, which provides the original monitor tool. This fork renames it and adds the `/monitors` popup, end notices, restart recovery and the test suites. MIT licensed.
