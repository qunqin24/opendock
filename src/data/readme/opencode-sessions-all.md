# opencode-sessions-all

[![npm](https://img.shields.io/npm/v/opencode-sessions-all)](https://www.npmjs.com/package/opencode-sessions-all)

Cross-project session search and navigation with a native OpenCode TUI.

`/sessions-all` opens a keyboard-first browser over sessions indexed from every project you use after installing the plugin. Search session titles, project paths, and message text without leaving OpenCode.

![opencode-sessions-all dashboard showing cross-project sessions, subagents, search filters, and session details](https://raw.githubusercontent.com/ZackarySantana/opencode-sessions-all/main/assets/oc-sessions-all-demo.png)

Published on npm as [`opencode-sessions-all`](https://www.npmjs.com/package/opencode-sessions-all).

## Requirements

- OpenCode 2.1.1 or newer within the 2.x release line
- Bun 1.4.3 or newer, which is already used by OpenCode's plugin runtime

The TUI plugin API is new and version-coupled. This package declares an `engines.opencode` range so incompatible OpenCode versions skip it rather than loading an unsupported interface.

## Install

Install globally so every opened project contributes to the shared index:

```sh
opencode plugin add opencode-sessions-all
```

The package exposes a V2 server entrypoint and a `./tui` entrypoint. Add it once to the global `~/.config/opencode/opencode.json` (or `opencode.jsonc`); OpenCode automatically loads both:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-sessions-all"]
}
```

Do not also add the package to `cli.json`. Watched configuration changes reload automatically; restart OpenCode if the plugin has not appeared.

Then run:

```text
/sessions-all
```

## Session Browser

- `/`: search titles, paths, and messages
- `p`: filter by project
- `s`: show or hide subagents (hidden by default)
- `j` / `k` or arrow keys: move selection
- `enter`: open the selected session
- `x`: clear search and project filters
- `r`: refresh
- `esc`: return to the session or home screen that opened the browser

The screen also refreshes automatically while it is open.

Sessions in the current directory open immediately. Selecting another directory's session retains the original confirmation-and-copy workflow: copy a shell-safe `opencode <directory> --session <id>` command for a new terminal.

## Indexing

The SQLite index is stored at:

```text
<opencode-state>/opencode-sessions-all/sessions.sqlite
```

Session and message events update existing records instead of creating duplicates. Deleted sessions are removed from the index. The database path and schema remain compatible with the V1 plugin, so existing indexed history is retained.

The shared SQLite index is intended for a local CLI and server on the same machine. A remote server's filesystem is not shared with the local browser.

### Existing Sessions

When a project is opened with the plugin enabled, its existing sessions are backfilled. The server indexes active session context and subsequent messages. The terminal client also paginates complete message history, including messages before compaction, for the current directory and previously indexed projects. Backfill runs in the background; the browser refreshes as records arrive. Projects that are never opened after installation are indexed when they are next opened.

## Custom Database Path

Both plugin targets accept a `database` option. Configure it once in `opencode.jsonc`; OpenCode passes it to both entrypoints:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-sessions-all",
      "options": { "database": "/absolute/path/sessions.sqlite" }
    }
  ]
}
```

A relative path is resolved from OpenCode's state directory.

## Migrating from the V1 Plugin

Use this V2 implementation with OpenCode 2.1.1 or newer. Replace the old `plugin` entry with the `plugins` entry above, and remove this package from the old `tui.json` configuration (or any migrated `cli.json` entry). Keep the same `database` option, if configured. No index deletion or database conversion is required.

The port follows OpenCode's [V1 plugin migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1) and [CLI plugin guide](https://opencode.ai/v2/docs/build/plugins/cli).

## Development

Bun 1.4.3 is pinned in `mise.toml` and declared in `package.json`. Set up the project toolchain with [mise](https://mise.jdx.dev/):

```sh
mise trust
mise install
```

Then run:

```sh
bun install
bun run build
bun run test
bun run typecheck
```

If mise is not activated in your shell, prefix commands with `mise exec --`, for example `mise exec -- bun run test` or `mise exec -- npm publish --tag latest`.

To load a local checkout, build it and reference its absolute directory once in `plugins` in `opencode.jsonc`, then restart OpenCode if needed. Build before testing: the package-output and rendering tests check the published TUI bundle. Use `bun run test` so Solid uses the browser/reactive runtime, as it does in OpenCode.

## Data Model

The index records:

- OpenCode project, directory, session, and parent-session IDs
- Session titles and creation/update timestamps
- Provider and model IDs
- Message roles and searchable message text
- Cost and input, output, reasoning, cache-read, and cache-write tokens

Tool payloads, credentials, file contents, and attachments are not stored.
