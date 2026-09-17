# opencode-pretty-sidebar

A focused sidebar for the OpenCode TUI. It keeps the session title at the top,
puts tasks first, surfaces active subagents and skills, provides common session
actions, and makes every MCP server clickable directly in the sidebar.

![OpenCode Pretty Sidebar](https://raw.githubusercontent.com/St1ggy/opencode-pretty-sidebar/main/screenshots/01-hero-sidebar.png)

## Features

- Theme-aware session title and activity indicator
- First-run setup guide with interactive section settings
- Collapsible Todo section with status filters, grouped tasks, progress and priority indicators
- Active subagent list with live statuses and click-to-open navigation, including dev-team workers running in separate local processes
- Compact, searchable workspace skill list with user-wide favorites, recent skills, source details, and click-to-confirm slash commands
- Configurable quick actions for rename, timeline, transcript copy, export, and compaction
- Live LSP connection status with compact inline server icons and click-to-reveal names
- Searchable MCP section with live radio-style connection controls
- Click any MCP row to connect or disconnect it
- Connect or disconnect every eligible MCP server with per-server progress and failed-only retry
- Save named MCP state presets and apply them from the MCP section heading
- Persist enabled and disabled MCP server states globally or per worktree and reapply them between sessions
- Show or hide each sidebar section independently
- Configure section visibility and order from the sidebar settings button
- Save visibility, expansion, and order globally or for the current worktree
- Focus the sidebar with `Ctrl+Shift+F`, then navigate with arrows or `j`/`k`
- Toggle the sidebar with `Ctrl+Shift+B`
- Keep OpenCode's compact project path and branch footer

Todo starts expanded. Subagents, skills, quick actions, LSP, and MCP start
collapsed. Use `Save current layout as default` in sidebar settings to reuse the
current visible/hidden, expanded/collapsed, and ordering states in new sessions.

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
later from the sidebar settings button. The settings dialog also selects global
or current-worktree scope, manages named layout presets, and controls section
order, MCP state persistence, LSP icon style, and the sidebar shortcuts without
a restart. Settings are grouped into tabs; use `Tab` and `Shift+Tab` to switch
tabs. In the Sections tab, use `Left`/`Right` or `Shift+Up`/`Shift+Down` to
reorder the selected section.

The Sections tab combines visibility, ordering, and the number of visible items
for each section. Click `Items: All` / `Items: N`, or press `L` on the selected
section, to edit its item limit. Enter toggles visibility; the arrow controls
change section order.
Every section defaults to `All` (`0`). A positive limit reveals `Show all (N more)`;
`Show less` restores the configured limit. Limits count items, not wrapped terminal
lines, and apply after filtering and sorting. Temporary expansion resets when the
target, filter, or limit changes. MCP bulk actions still operate on the full server
list. Limit changes persist immediately in the selected Global or Current worktree
scope; Restore configured behavior removes that scope's limit overrides.

On the Quick Actions row, click `Actions` or press `A` to choose individual
actions and their order. Enter toggles visibility; Left/Right or Shift+Up/Down
reorders the selected action. Changes save in the selected Global or Current
worktree scope. Escape returns to the Quick Actions row in Sections.

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
        "section_order": ["todo", "subagents", "skills", "quick_actions", "lsp", "mcp"],
        "section_item_limits": { "todo": 0, "subagents": 0, "skills": 5, "mcp": 5 },
        "quick_action_order": ["session.rename", "session.timeline", "session.copy", "session.export", "session.compact"],
        "quick_action_visibility": { "session.export": false },
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
- `section_order`: sets the configured section order. Missing and duplicate
  entries are normalized so every section appears exactly once.
- `section_item_limits`: non-negative integer limits for `todo`, `subagents`,
  `skills`, `quick_actions`, `lsp`, and `mcp`. Missing values default to `0` (All).
  Worktree overrides inherit each unspecified section from Global independently.
- `quick_action_order`: command IDs of the five built-in quick actions in display
  order. Missing actions are appended; unknown and duplicate IDs are ignored.
- `quick_action_visibility`: visibility by command ID. Actions default to visible;
  unspecified worktree values inherit the global setting. Restore configured
  behavior resets action overrides as well as the other behavior settings.

Every option is also available from the sidebar gear button. Choose `Global` or
`Current worktree` before editing. Values resolve in configured-default, global,
worktree, then current-session order. Behavior changes apply immediately in the
selected scope. Section visibility, expansion, and order remain in memory until
`Save current layout as default` is selected. The layout, behavior, and
remembered MCP-state resets remove only the selected scope's overrides, exposing
inherited values again. Skill-confirmation choices, favorite skills, and MCP
presets remain user-wide. Preferences
are stored in one unversioned, validated file under OpenCode's state directory.
The initial layout-preset list is empty. `Save as…` captures current visibility,
expansion, and section order; saved presets can be applied to the selected scope,
updated from the current layout, renamed, or deleted.

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
initializes. `Connect all` and `Disconnect all` run eligible server changes in
parallel, retain successful results when some servers fail, and offer a retry for
only the failed servers.

Use the `Preset` selector in the MCP heading to save the current enabled/disabled
state, apply a preset, update it from the current scope, rename it, or delete it.
Preset application runs only the necessary server changes and keeps per-server
progress and failed-only retry behavior. Servers in a preset that are not present
in the current scope are retained as desired state but skipped at application time.

Todo priorities are read-only because OpenCode does not expose a Todo mutation
API to TUI plugins.

Todo offers `All`, `Active`, and `Finished` views with counts. Active shows running
tasks before pending tasks. Finished contains separate Completed and Cancelled
groups. The selected view is temporary and resets to All when changing sessions.
The header always reports completed tasks against the full task count.

Subagents show observed run duration, retry countdowns, and execution errors.
An already-running child discovered by the sidebar uses `≥` because its exact
start time is unknown. Recent keeps the last 10 observed finished runs per parent
session in memory across navigation, until OpenCode exits. An idle transition is
labelled Finished, not a guarantee of successful task completion; errors and
cancellations retain their own labels. A worker timeout displays status
unavailability and does not mark its last confirmed active run as finished.
Active runs precede Recent under the shared Subagents item limit.

Selecting a skill opens its description with Accept and Cancel controls before
appending its `/<name>` command to the current prompt. Select "Don't show again
for this skill" to skip that confirmation later. The sidebar settings dialog
can restore skipped confirmations. Select the star beside a skill to keep it
ahead of non-favorite skills in every workspace. The last 10 successfully inserted
skills are remembered user-wide by source location and appear after favorites,
most recent first, marked `◷`. Other skills remain alphabetical. The `i` control
opens the description and full source location even when confirmation is skipped.
Quick actions invoke OpenCode's built-in
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
