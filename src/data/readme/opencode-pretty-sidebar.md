# opencode-pretty-sidebar

A focused sidebar for the OpenCode TUI. It keeps the session title at the top,
puts tasks first, surfaces active subagents and skills, provides common session
actions, and makes every MCP server clickable directly in the sidebar.

## Features

- Theme-aware session title and activity indicator
- Collapsible Todo section with progress and priority indicators
- Active subagent list with live statuses and click-to-open navigation
- Compact workspace skill list with click-to-confirm slash commands
- Quick actions for rename, timeline, transcript copy, export, and compaction
- Live LSP connection status with recognizable server badges
- Collapsible MCP section with live radio-style connection controls
- Click any MCP row to connect or disconnect it
- Persist disabled MCP servers per worktree and reapply them between sessions
- Show or hide each sidebar section independently
- Configure visible sections from the sidebar settings button
- Toggle the sidebar with `Ctrl+Shift+B`
- Keep OpenCode's compact project path and branch footer

Todo starts expanded. Subagents, skills, quick actions, LSP, and MCP start
collapsed. Each section remembers its own expanded state.

Requires OpenCode 1.18.30 or newer.

## Installation

Install the plugin for the current project:

```sh
opencode plugin opencode-pretty-sidebar
```

Use `--global` to install it for every project:

```sh
opencode plugin --global opencode-pretty-sidebar
```

`opencode plug` is an alias for `opencode plugin`.

The installer adds the package to the `plugin` array in `tui.json`. To avoid
duplicating sidebar sections, also disable the overlapping built-in plugins:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-pretty-sidebar"],
  "plugin_enabled": {
    "internal:sidebar-context": false,
    "internal:sidebar-mcp": false,
    "internal:sidebar-lsp": false,
    "internal:sidebar-todo": false,
    "internal:sidebar-files": false
  }
}
```

Use `.opencode/tui.json` for a project installation or
`~/.config/opencode/tui.json` for a global installation. Restart OpenCode after
changing the configuration.

## Develop locally

This repository already contains `.opencode/tui.json`, so starting OpenCode in
the repository loads `src/tui.tsx` and disables the overlapping built-in
sidebar blocks.

```sh
bun install
opencode
```

OpenCode reads TUI configuration at startup. Restart it after changing the
plugin or `tui.json`.

## Options

Pass options with a tuple entry:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-pretty-sidebar",
      {
        "persist_mcp": true,
        "toggle_key": "ctrl+shift+b",
        "sections": {
          "todo": true,
          "subagents": true,
          "skills": true,
          "quick_actions": true,
          "lsp": true,
          "mcp": true
        }
      }
    ]
  ]
}
```

- `persist_mcp`: remembers disabled MCP servers per worktree. Defaults to
  `true`.
- `toggle_key`: sidebar shortcut. Defaults to `ctrl+shift+b`. Try `alt+s` if
  your terminal does not distinguish `Ctrl+Shift+B` from `Ctrl+B`.
- `sections`: controls whether each section is rendered. Every section defaults
  to `true`; set any of `todo`, `subagents`, `skills`, `quick_actions`, `lsp`, or
  `mcp` to `false` to hide it. Runtime choices made from the settings button are
  persisted and take precedence until configured defaults are restored there.

OpenCode initializes enabled MCP servers before TUI plugins. A remembered
server can therefore connect briefly during startup before this plugin
disconnects it.

Todo priorities are read-only because OpenCode does not expose a Todo mutation
API to TUI plugins.

Selecting a skill opens its description with Accept and Cancel controls before
appending its `/<name>` command to the current prompt. Select "Don't show again
for this skill" to skip that confirmation later. The sidebar settings dialog
can restore skipped confirmations. Quick actions invoke OpenCode's built-in
commands and display the active keybindings from your configuration.

## Scripts

```sh
bun test
bun run typecheck
bun run build
bun run check
```

## Publishing

Publishing is handled by `.github/workflows/publish.yml` when a GitHub Release
is published. The release tag must match the package version, for example
`v1.2.3` for version `1.2.3`.

The workflow uses npm Trusted Publishing with provenance. Configure
`St1ggy/opencode-pretty-sidebar` and `publish.yml` as the trusted GitHub Actions
publisher in the package settings on npmjs.com before publishing a release.
