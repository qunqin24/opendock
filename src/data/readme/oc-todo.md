<p align="center">
  <img src="assets/icon.svg" width="128" height="128" alt="oc-todo icon" />
</p>
<h1 align="center">oc-todo</h1>
<p align="center"><strong>Per-session todo lists for your OpenCode terminal.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-todo" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-todo" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## What it is

oc-todo is an OpenCode plugin that gives every session its own durable todo list. It adds a `todo` tool the agent calls to track multi-step work, backed by real plugin storage rather than ephemeral UI text, plus a read-only checklist rendered in the sidebar beside any open session that has todos.

## Why

Agents doing multi-step work need a list that survives across turns and server restarts. oc-todo stores the list in the host's SQLite plugin store under a session-scoped key, so each session keeps its own history and nothing is lost when the server restarts.

## Features

- `todo` tool with `list`, `open`, `write` (V1 `todowrite` parity), `add`, `update`, `complete`, `move`, and `clear` actions.
- Per-session storage under `todos/session/<sessionID>` in the host's SQLite store; survives turns and server restarts.
- Cross-session `open` view of every unfinished todo, ordered by priority then recency.
- Read-only sidebar checklist that refreshes on `rpc.todo.changed` with a poll fallback for remote servers.
- Optional notes on items and a counts summary line on formatted output.
- No config file, no options, no network calls, no telemetry.

## Install

1. Add the plugin to the `plugins` array in your `opencode.jsonc` (stable npm route):
   ```jsonc
   { "plugins": ["oc-todo@0.4.0"] }
   ```
2. Restart OpenCode.
3. Verify the `todo` tool is available to the agent.

See [INSTALL.md](INSTALL.md) for the other two routes: the bleeding-edge GitHub package spec and a no-npm local directory entry.

## Usage

Ask the agent to track the work with the todo tool, for example: "use the todo tool to track these steps". The checklist appears in the sidebar beside the open session whenever that session has todos; an empty session shows a single hint line instead. Item statuses are `pending`, `in_progress`, `completed`, and `cancelled`; priorities are `high`, `medium`, and `low`. Remove `"oc-todo"` from the `plugins` array and restart OpenCode to uninstall; the stock sidebar returns exactly as it was.

## Build from source

Prerequisites: Node 22 or newer, or Bun 1.4 or newer.

```sh
git clone https://github.com/nathwn12/oc-todo.git
cd oc-todo
bun install
bun run check
```

`bun run check` runs the test suite plus `tsc --noEmit`.

## Docs

- [INSTALL.md](INSTALL.md) — the three install routes (pinned npm, GitHub package spec, local directory entry).
- [docs/specs/v0.2.0.md](docs/specs/v0.2.0.md) — the Tier 1 slice contract (cross-session list, move, notes, counts).
- [CHANGELOG.md](CHANGELOG.md) — release history.

## Status

**Unverified** — as-is, use at your own risk.

## License

MIT — see [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
