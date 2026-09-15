# opencode-pretty-sidebar

A focused sidebar for the OpenCode TUI. It keeps the session title at the top,
puts tasks first, surfaces active subagents and skills, provides common session
actions, and makes every MCP server clickable directly in the sidebar.

![OpenCode Pretty Sidebar](https://raw.githubusercontent.com/St1ggy/opencode-pretty-sidebar/main/screenshots/01-hero-sidebar.png)

## Features

- Theme-aware session title and activity indicator
- First-run setup guide with interactive section settings
- Collapsible Todo section with progress and priority indicators
- Active subagent list with live statuses and click-to-open navigation
- Compact, searchable workspace skill list with click-to-confirm slash commands
- Quick actions for rename, timeline, transcript copy, export, and compaction
- Live LSP connection status with compact inline server icons and click-to-reveal names
- Searchable MCP section with live radio-style connection controls
- Click any MCP row to connect or disconnect it
- Persist enabled and disabled MCP server states per worktree and reapply them between sessions
- Show or hide each sidebar section independently
- Configure visible sections from the sidebar settings button
- Save the current visibility and expansion layout as the default for new sessions
- Focus the sidebar with `Ctrl+Shift+F`, then navigate with arrows or `j`/`k`
- Toggle the sidebar with `Ctrl+Shift+B`
- Keep OpenCode's compact project path and branch footer

Todo starts expanded. Subagents, skills, quick actions, LSP, and MCP start
collapsed. Use `Save current layout as default` in sidebar settings to reuse the
current visible/hidden and expanded/collapsed states in new sessions.

Requires OpenCode 1.18.30 or newer. The default LSP icons require a terminal font
patched with Nerd Fonts v3 glyphs.

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
    "internal:sidebar-todo": false
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

On first launch, a short setup guide explains the sidebar controls and lets you
choose which sections to show. The guide is shown once and can be opened again
later from the sidebar settings button. The settings dialog also controls MCP
state persistence, LSP icon style, and the sidebar shortcuts without a restart.

## Options

Pass configured defaults with a tuple entry:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-pretty-sidebar",
      {
        "persist_mcp": true,
        "lsp_icon_style": "nerd",
        "focus_key": "ctrl+shift+f",
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

- `persist_mcp`: remembers enabled and disabled MCP server states per worktree. Defaults to
  `true`.
- `toggle_key`: sidebar shortcut. Defaults to `ctrl+shift+b`. Try `alt+s` if
  your terminal does not distinguish `Ctrl+Shift+B` from `Ctrl+B`.
- `focus_key`: moves keyboard focus into the sidebar. Defaults to
  `ctrl+shift+f`.
- `lsp_icon_style`: uses Nerd Fonts v3 glyphs when set to `nerd` (the default). Set
  it to `text` for compact letter badges when your terminal font does not
  include those glyphs. Known servers use icons or badges; unknown servers keep
  their full ID.
- `sections`: controls whether each section is rendered. Every section defaults
  to `true`; set any of `todo`, `subagents`, `skills`, `quick_actions`, `lsp`, or
  `mcp` to `false` to hide it.

Every option is also available from the sidebar gear button. Settings are split
into `Sections`, `Behavior`, and `Defaults & help`. Behavior changes apply
immediately and are stored as overrides of the configured defaults. Use
`Restore configured behavior` to remove those overrides. Section visibility and
expansion remain in-memory for the current OpenCode process until
`Save current layout as default` is selected; `Restore configured layout`
removes that saved layout. Section controls are also available in the first-run
setup guide.

## Keyboard controls

Press `Ctrl+Shift+F` to focus the sidebar. Use `Up`/`Down` or `k`/`j` to move,
`Enter` to activate the selected row, `Escape` to return to the previous focus,
and `?` to open the keyboard help. When a Skills or MCP filter owns focus,
typing edits the query and the first `Escape` returns to sidebar navigation.

The command palette also exposes `Focus sidebar` and direct commands for Todo,
Subagents, Skills, Quick Actions, LSP, and MCP. Both sidebar shortcuts can be
changed at runtime in settings.

OpenCode initializes enabled MCP servers before TUI plugins. A server remembered
as disabled can therefore connect briefly during startup before this plugin
disconnects it. Servers remembered as enabled are connected after the plugin
initializes.

Todo priorities are read-only because OpenCode does not expose a Todo mutation
API to TUI plugins.

Selecting a skill opens its description with Accept and Cancel controls before
appending its `/<name>` command to the current prompt. Select "Don't show again
for this skill" to skip that confirmation later. The sidebar settings dialog
can restore skipped confirmations. Quick actions invoke OpenCode's built-in
commands and display the active keybindings from your configuration.

## Scripts

```sh
bun run test
bun run test:e2e
bun run typecheck
bun run lint
bun run build
bun run bundle:size
bun run check
```

## Publishing

Publishing is handled by `.github/workflows/publish.yml` when a GitHub Release
is published. The release tag must match the package version, for example
`v1.2.3` for version `1.2.3`.

The workflow uses npm Trusted Publishing with provenance. Configure
`St1ggy/opencode-pretty-sidebar` and `publish.yml` as the trusted GitHub Actions
publisher in the package settings on npmjs.com before publishing a release.
