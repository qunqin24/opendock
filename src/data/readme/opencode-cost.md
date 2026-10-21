# opencode-cost

[![npm](https://img.shields.io/npm/v/opencode-cost)](https://www.npmjs.com/package/opencode-cost)

Persistent cost and token tracking with a native OpenCode TUI dashboard.

`/cost` opens a full-screen dashboard with date, project, and model filters. Costs come directly from OpenCode's assistant and completed-compaction records, so this plugin does not maintain a separate provider pricing table.

![opencode-cost dashboard showing cost, token, model, project, and daily activity breakdowns](https://raw.githubusercontent.com/ZackarySantana/opencode-cost/main/assets/oc-cost-demo.png)

Published on npm as [`opencode-cost`](https://www.npmjs.com/package/opencode-cost).

## Requirements

- OpenCode 2.1.1 or newer within the 2.x release line
- Bun, which is already used by OpenCode's plugin runtime

The TUI plugin API is new and version-coupled. This package declares an `engines.opencode` range so incompatible OpenCode versions skip it rather than loading an unsupported interface.

## Install

Install globally so usage from every project is recorded:

```sh
opencode plugin add opencode-cost
```

The package exposes a V2 server plugin at its main entrypoint and a native dashboard at `./tui`. OpenCode automatically loads both from the global server configuration:

- `~/.config/opencode/opencode.json` or `opencode.jsonc`

For a local checkout, add its absolute directory to `plugins` in that file after building it. Watched configuration changes reload automatically; restart OpenCode if a local build is not picked up.

Then run:

```text
/cost
```

## Dashboard

- `d`: choose today, 7 days, 30 days, or all time
- `p`: filter by project
- `m`: filter by provider/model
- `x`: reset filters
- `r`: refresh immediately
- `esc`: return to the session or home screen that opened the dashboard

The screen also refreshes automatically while it is open.

## Storage

The server plugin stores an idempotent SQLite ledger at:

```text
<opencode-state>/opencode-cost/cost.sqlite
```

Each usage record is keyed by its OpenCode message ID. Repeated message updates replace the existing values instead of double-counting cost.

Recorded costs remain in the ledger if their original OpenCode session is later deleted. To clear all history, quit OpenCode and remove the database file.

### Existing sessions

The first time a project is opened in the terminal with the plugin enabled, its existing sessions are backfilled, including paginated history before compaction and sessions in other worktrees of the same project. A project is marked complete only after every session was read successfully; interrupted imports retry on the next startup. Projects that are never opened after installation are imported when they are next opened.

In V2, historical backfill runs in the terminal plugin because the server plugin context exposes only messages after the latest compaction. Live usage is still collected by the server, including headless sessions. Open the project in the terminal to import any older usage.

The dashboard and collector share a local SQLite file; a dashboard connected to a remote server does not read that server's ledger.

## Custom Database Path

Both plugin targets accept a `database` option. Configure it in `opencode.jsonc`; the automatically loaded dashboard receives the same options:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-cost", "options": { "database": "/absolute/path/cost.sqlite" } }
  ]
}
```

A relative path is resolved from OpenCode's state directory.

## Upgrading from V1

This version uses the [OpenCode V2 plugin API](https://opencode.ai/v2/docs/build/plugins/migrate-v1) and no longer loads in OpenCode 1.x. Use the V2 `plugins` configuration shown above and remove any old explicit `opencode-cost` entry from `tui.json`; V2 uses `cli.json` for terminal-only plugins, but this package's dashboard is loaded automatically with its server plugin.

The SQLite path and schema are unchanged. Existing recorded usage is preserved without conversion.

## Development

The project pins Bun 1.4.3 with [mise](https://mise.jdx.dev/) and `packageManager` in `package.json`.

```sh
mise trust
mise install
bun install
bun run typecheck
bun run build
bun test
```

To load a local checkout, reference its absolute directory in `plugins` in `opencode.jsonc`, then restart OpenCode if needed.

## Data Model

The ledger records:

- OpenCode project, directory, session, and message IDs
- Provider and model IDs
- Message creation and completion timestamps
- Provider-calculated USD cost
- Input, output, reasoning, cache-read, and cache-write tokens

No prompts, responses, tool arguments, file contents, or credentials are stored.
