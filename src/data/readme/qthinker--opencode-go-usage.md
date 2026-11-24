# opencode-go-usage

[![npm version](https://img.shields.io/npm/v/@qthinker/opencode-go-usage)](https://www.npmjs.com/package/@qthinker/opencode-go-usage)
[![license](https://img.shields.io/npm/l/@qthinker/opencode-go-usage)](./LICENSE)
[![ci](https://github.com/QThinkerJR/opencode-go-usage/actions/workflows/ci.yml/badge.svg)](https://github.com/QThinkerJR/opencode-go-usage/actions/workflows/ci.yml)

English | [简体中文](https://github.com/QThinkerJR/opencode-go-usage/blob/main/README.zh-CN.md)

An OpenCode V2 plugin that shows the three OpenCode Go subscription usage windows — 5-hour, weekly, and monthly — in
the TUI sidebar and in a pinned OpenCode Desktop side panel.

The data comes from the local OpenCode server's `client.experimental.usage.limits()`. The plugin never reads
`auth.json`, `opencode.db`, or any token, and never calls the upstream service directly: the server owns credential
refresh and workspace resolution.

> Published as `@qthinker/opencode-go-usage`. This is not the unscoped `opencode-go-usage` package on npm.

## Features

### TUI

- Appends a read-only `sidebar.content` panel.
- One row per window: label, character bar (`█` / `░`), used percentage, and reset countdown. A limited window shows
  `LIMITED` instead of its percentage.
- `stale` marker when the last refresh failed.
- Follows the active OpenCode theme.
- `/go-usage-refresh` fetches immediately.

### Desktop

- Pinned side-region tab (`Go Usage` / `Go 用量`).
- HTML/CSS progress bars, a refresh button, a loading skeleton, and error/empty states.
- Command palette entry **Open Go usage**, default shortcut `Ctrl+Shift+G` (`Cmd+Shift+G` on macOS), and the slash
  command `/go-usage`.

### Polling

- Every 60 seconds while healthy.
- Every 5 seconds when any window is limited or resets within a second.
- A failed request keeps the last snapshot and marks it `stale`.

## Requirements

- OpenCode V2 with an OpenCode Go subscription.
- The TUI and/or OpenCode Desktop. The Desktop GUI plugin API is marked experimental by OpenCode; this release
  targets `@opencode/plugin` 2.4.1.
- For development from a clone: Bun 1.4.x. The published package ships TypeScript sources and is loaded by OpenCode.

## Install

Add the package to the **global** `~/.config/opencode/opencode.json(c)` so the Desktop app sees it in every window:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@qthinker/opencode-go-usage"]
}
```

Or let the CLI edit the global config:

```bash
opencode plugin add @qthinker/opencode-go-usage
opencode plugin list
```

One entry loads the server, TUI, and GUI parts. OpenCode reloads plugins after the config change; the TUI also accepts
`/reload`. OpenCode Desktop reads only `opencode.json(c)`, not `cli.json`.

> `src/index.ts` is intentionally inert. OpenCode only loads a package's TUI part when the package has a server entry,
> so this part registers the package. It fetches no data and registers no tools or RPC.

## Uninstall

```bash
opencode plugin remove @qthinker/opencode-go-usage
```

Or delete the entry from the global `opencode.json(c)` and reload OpenCode.

## Usage

- **TUI**: expand the sidebar. The panel appears under the sidebar content as `OpenCode Go`.
- **Desktop**: open a session and select the pinned **Go Usage** tab in the side region, or run **Open Go usage** from
  the command palette, the `/go-usage` slash command, or `Ctrl+Shift+G`.
- **Refresh now**: use the Desktop refresh button, or run `/go-usage-refresh` in the TUI.

### States

| State | What it means |
|---|---|
| `Loading Go usage…` | The first request is running. |
| `Sign in to OpenCode Console` | The server reports no signed-in account. |
| `No Go subscription` | The account has no OpenCode Go plan. |
| `Usage unavailable` | The request failed; the last snapshot stays visible and is marked `stale`. |
| `LIMITED` | Go refuses requests until that window resets. The TUI replaces the percentage column with it; Desktop shows it as a badge beside the percentage. |

The displayed number is the usage figure the host returns, not an exact dollar amount.

## How it works

`fetchUsage` calls `client.experimental.usage.limits({ location: { directory } })` with the current session
directory. The host returns the workspace and the Go window data; the panels only render it. No token is read, stored,
or forwarded by this package.

The TUI part is loaded from `src/tui/index.tsx`; the Desktop part must be prebuilt to
`dist/gui-experimental.cjs` through the `./gui-experimental` export.

## Development

```bash
bun install
bun test              # pure formatting tests + headless TUI frame tests (testRender)
bun run typecheck     # tsc --noEmit
bun run build:gui     # bundles dist/gui-experimental.cjs
npm pack --dry-run    # audit the publish artifacts after building
```

Point a local config at the repository directory (a directory, not a file):

```jsonc
{
  "plugins": ["C:/path/to/opencode-go-usage"]
}
```

Run `bun run build:gui` before using the local directory so the Desktop part exists. The TUI part loads directly from
source, but the Desktop part is a prebuilt CommonJS bundle.

### Project layout

```text
src/
  index.ts          inert server part (registers the package)
  lib/types.ts      UsageState / UsageInfo contract
  lib/usage.ts      client.experimental.usage.limits + polling delay
  lib/format.ts     percentages, character bar, tones, countdown
  tui/index.tsx     Plugin.define + sidebar.content slot + polling
  tui/panel.tsx     pure-props TUI panel (OpenTUI)
  tui/theme.ts      theme token subset and fallbacks
  gui/index.tsx     Plugin.define + Panel/Command/Style
  gui/panel.tsx     pure-props Desktop panel (Solid DOM)
  gui/panel.css     scoped .ogu-* styles
  gui/i18n.ts       en/zh tab and command copy
tests/              bun test
```

## Known limitations

- The Desktop plugin API is experimental and may change between OpenCode releases.
- Desktop has no persistent left sidebar slot for plugins; the panel lives in the session's right side region as a
  pinned tab. The Home screen has no side region.
- The TUI `sidebar.content` slot only renders when the sidebar is expanded. A narrow terminal or icon rail
  (`session.sidebar` set to `auto` with too little width) hides it; widen the terminal or set `"show"` in `cli.json`.
- The panel shows percentages, `limited`, and `resetsAt`; it does not show dollar amounts, credits, or Console budgets.
- The TUI panel reads the directory when it mounts. Switching directories inside the same TUI instance does not
  refetch automatically (the Desktop panel does). Usage is workspace-level, so the practical impact is small; run
  `/go-usage-refresh` when needed.
- `percent` is the host's usage percentage (upstream floors it), not an exact dollar quota.

## Troubleshooting

- **No Desktop panel**: the plugin must be in the global `opencode.json(c)`; for a local clone, run
  `bun run build:gui` first, then reload the Desktop window.
- **No TUI panel**: expand the sidebar or set `session.sidebar` to `"show"` in `cli.json`.
- **`Sign in to OpenCode Console`**: sign in to OpenCode Console in the app.
- **`No Go subscription`**: the signed-in account has no OpenCode Go plan.

## License

[MIT](./LICENSE)
