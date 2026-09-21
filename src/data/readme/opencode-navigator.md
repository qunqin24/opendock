# OpenCode Navigator

Search, navigate, and manage OpenCode sessions from the TUI. Navigator combines
Search Everything, task and subagent views, skills, MCP presets, and quick actions
with a configurable sidebar.

![OpenCode Navigator](https://raw.githubusercontent.com/St1ggy/opencode-navigator/main/screenshots/01-hero-sidebar.png)

## Features

- Theme-aware session title and activity indicator
- First-run setup guide with interactive section settings
- Collapsible Todo section with status filters, grouped tasks, progress and priority indicators
- Active subagent list with live statuses and click-to-open navigation, including dev-team workers running in separate local processes
- Compact, searchable workspace skill list with user-wide favorites, recent skills, source details, and click-to-confirm slash commands
- Configurable quick actions for rename, timeline, transcript copy, export, and compaction
- Live LSP connection status with error-first sorting and clickable server/root details
- Searchable MCP section with live radio-style connection controls
- Click any MCP row to connect or disconnect it
- Connect or disconnect every eligible MCP server with per-server progress and failed-only retry
- Save named MCP state presets and apply them from the MCP section heading
- Persist enabled and disabled MCP server states globally or per worktree and reapply them between sessions
- Keep favorite MCP servers first across workspaces
- Search Everything in a keyboard-first modal with category tabs and fuzzy results
- Show or hide each sidebar section independently
- Configure section visibility and order from the sidebar settings button
- Save visibility, expansion, and order globally or for the current worktree
- Focus the sidebar with `Ctrl+Shift+F`, then navigate with arrows or `j`/`k`
- Toggle the sidebar with `Ctrl+Shift+B`
- Keep OpenCode's compact project path and branch footer

Todo starts expanded. Subagents, skills, quick actions, LSP, and MCP start
collapsed. Use `Save current layout as default` in sidebar settings to reuse the
current visible/hidden, expanded/collapsed, and ordering states in new sessions.

Requires OpenCode 1.18.30 or newer. All interface icons use Nerd Font glyphs by
default (Codicons for controls, keyboard symbols for hints, language logos for LSP). Use a Nerd Fonts v3
terminal font, or select **Settings → Behavior → Icon style → Text fallback**.
The switch applies to the entire interface, including Quick Actions, search
tabs, section headings, statuses, favorites, and dialogs.
Components read the live style through the shared icon context; host-mounted
and nested dialogs inherit the same context through the dialog adapter.
Highlighted rows, tabs, and buttons use rounded ends in Nerd Font mode;
multiline selections use inverse corner masks over a solid background from the additional
**OpenCode Navigator Corners** fallback font. Installing that font is required
for rounded multiline selections; Nerd Fonts alone do not contain these four
custom glyphs. Text fallback retains rectangular
highlights. Rounded edges stay inside the control's padding and remain clickable.
Navigator uses the full available sidebar slot width; the current OpenCode TUI
fixes the outer panel at 42 columns. Long preset labels are truncated to keep the
MCP heading and server count on one line.

## Installation

Install the plugin for the current project:

```sh
opencode plugin opencode-navigator
```

Use `--global` to install it for every project:

```sh
opencode plugin --global opencode-navigator
```

`opencode plug` is an alias for `opencode plugin`.

### Install the corner font

**Required for rounded multiline selections in Nerd Font mode.** Run the font
installer on the computer displaying your terminal, even if OpenCode runs over
SSH on another machine:

```sh
npx --yes --package=opencode-navigator opencode-navigator-font
```

This command requires Node.js 20+ and npm. It installs the small bundled
[`OpenCodeNavigatorCorners.ttf`](assets/OpenCodeNavigatorCorners.ttf)
for your user account. Version 1.001 contains four corner masks and preserves the
four legacy filled corners. It is licensed under MIT. Keep your existing Nerd Font selected as the terminal font; the new
font supplies only the missing corner characters through font fallback.

**Fully quit and reopen the terminal application**, then start OpenCode again.
Restarting only OpenCode may leave the terminal's old font cache in use.

The installer uses `~/Library/Fonts` on macOS, the user font directory under
`XDG_DATA_HOME` (or `~/.local/share/fonts`) on Linux, and the per-user Windows font
directory and registry. Linux requires `fc-cache` from Fontconfig.
The bundled metrics are tested with IoskeleyMono Nerd Font Propo; see
[`assets/README.md`](assets/README.md) for generating a matching font for other metrics.

If you skip font installation, select **Settings → Behavior → Icon style →
Text fallback** (or set `icon_style` to `text`) to use rectangular selections
without missing-glyph boxes.

To remove only the additional font:

```sh
npx --yes --package=opencode-navigator opencode-navigator-font --uninstall
```

Switch to Text fallback and restart the terminal after uninstalling it.

### Configure sidebar sections

The `opencode plugin` command adds the package to the `plugin` array in `tui.json`. To avoid
duplicating sidebar sections, also disable the overlapping built-in plugins:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-navigator"],
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

### Upgrading from Pretty Sidebar

OpenCode Navigator is the new name of `opencode-pretty-sidebar`. Replace the old
package entry in `tui.json` with `opencode-navigator` rather than loading both.
If you disabled the plugin through `plugin_enabled`, rename that key to
`opencode-navigator` as well.

Existing settings, presets, favorites, recent skills, and shortcuts are retained:
Navigator uses the established `opencode-pretty-sidebar/preferences.json` and its
lock under OpenCode's state directory. No file copying is required. Public
`opencode-pretty-sidebar.toggle`, `.focus`, `.focus.<section>`, and `.search`
commands remain available as aliases for custom keybindings.

## Develop locally

This repository already contains `.opencode/tui.json`, so starting OpenCode in
the repository loads `src/tui.tsx` and disables the overlapping built-in
sidebar blocks.

```sh
bun install
bun run font:install
```

Fully restart the terminal once after installing the corner font, then run:

```sh
opencode
```

OpenCode reads TUI configuration at startup. Restart it after changing the
plugin or `tui.json`.

On first launch, a short setup guide explains the sidebar controls and lets you
choose which sections to show. The guide is shown once and can be opened again
later from the sidebar settings button. The settings dialog also selects global
or current-worktree scope, manages named layout presets, and controls section
order, MCP state persistence, icon style, and the sidebar shortcuts without
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
      "opencode-navigator",
      {
        "persist_mcp": true,
        "icon_style": "nerd",
        "focus_key": "ctrl+shift+f",
        "search_key": "ctrl+shift+k",
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
- `search_key`: opens Search Everything. Defaults to `ctrl+shift+k`; choose a
  terminal-friendly alternative such as `alt+y` in Settings → Behavior.
- `icon_style`: `nerd` (default) for Nerd Font icons throughout Navigator, or
  `text` for ASCII controls and compact text badges. The legacy `lsp_icon_style`
  option and saved preference remain supported and now control all icons too;
  an explicit `icon_style` option takes precedence. Unknown LSP servers keep
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

Choose **Preview & apply** in a saved layout preset's menu to review visibility,
expansion, and position changes before applying it. Changed sections appear first,
with their destination positions. Opening the preview does not change the layout;
select **Apply** to confirm or **Cancel** / `Escape` to return to the preset menu.
Applying a preset updates the in-memory layout for the selected scope. Use
`Save current layout as default` to persist it.

## Keyboard controls

Press `Ctrl+Shift+F` to focus the sidebar. Use `Up`/`Down` or `k`/`j` to move,
`Enter` to activate the selected row, `Escape` to return to the previous focus,
and `?` to open the keyboard help. When a Skills or MCP filter owns focus,
typing edits the query and the first `Escape` returns to sidebar navigation.
The filter icon, placeholder, entered text, clear control, and cursor use the same
contrasting focus palette; the field follows actual input focus and blur.

The command palette also exposes `Focus sidebar` and direct commands for Todo,
Subagents, Skills, Quick Actions, LSP, and MCP. Both sidebar shortcuts can be
changed at runtime in settings.

### Search Everything

Press `Ctrl+Shift+K` or run **Search Everything** from the command palette. Use
the Skills, Subagents, MCP, and Actions tabs to choose a category. The query is
shared across tabs; each tab shows its matching result count, including zero.
Tab icons match the sidebar sections and section entries in settings.
Search covers names, descriptions, skill source paths, and subagent IDs in the
current workspace/session. It uses full source lists, regardless of sidebar
visibility and item limits; actions hidden from the sidebar are still searchable.

- `Up` / `Down`: select a result in the current tab; `Tab` / `Shift+Tab` or a click:
  switch tabs. Each tab remembers its selection and scroll position until the
  query changes.
- `Enter`: insert a skill (honouring its confirmation preference), open a child
  session, connect/disconnect an MCP server, or run a built-in action.
- MCP toggles keep the search open and update the server status in place,
  preserving the query, selection, and scroll position.
- `Escape`: close and return focus; `Ctrl+R`: retry loading sources.

Results use compact title/preview rows. Background refresh preserves the current
scroll position and does not flash a refresh indicator. Cached results remain
available when a source refresh fails. Busy MCP actions
are disabled; session actions on the home screen explain that a session is required.
Changing session or workspace closes the search dialog to prevent stale actions.

OpenCode initializes enabled MCP servers before TUI plugins. A server remembered
as disabled can therefore connect briefly during startup before this plugin
disconnects it. Servers remembered as enabled are connected after the plugin
initializes. `Connect all` and `Disconnect all` run eligible server changes in
parallel, retain successful results when some servers fail, and offer a retry for
only the failed servers.

Use the `Preset` selector in the MCP heading to save the current enabled/disabled
state, apply a preset, update it from the current scope, rename it, or delete it.
**Preview & apply** refreshes the current server states and shows the planned
connections, disconnections, unchanged servers, and unavailable or missing servers
that will be skipped. Changes appear first. The preview updates when the preset or
server state changes; `Ctrl+R` refreshes it again. Applying is disabled while states
are loading, a refresh has failed, or another MCP mutation is running.

Use `Up` / `Down` to scroll a preview, `Tab` or `Left` / `Right` to select its
buttons, and `Enter` to confirm. Buttons also support mouse activation. Changing
the target scope/workspace closes the preview, and deleting the preset disables
its Apply action.

Preset application runs only the necessary server changes and keeps per-server
progress and failed-only retry behavior. Servers in a preset that are not present
in the current scope are skipped at application time; their desired states are
retained when MCP state persistence is enabled.

The MCP bookmark control saves favorites user-wide by server name. Favorites appear
first, alphabetically within each group, with a blank separator before other
servers. The bookmark does not connect or disconnect the server.

LSP servers with connection errors appear first, followed by alphabetical ID and
root order. Activate any badge, including a custom server, to see its ID, root,
and current connection status. OpenCode's public LSP state does not provide the
underlying diagnostic error text; the details view points to configuration/logs.

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
Local session events update subagents immediately; snapshot and worker-status
polling runs every five seconds. Background refresh is silent after the initial
load, including when a section is empty, so it does not shift the list.
Use `All / Active / Recent / Errors` and the text filter to narrow the subagent
list before applying its item limit. Filters reset on a target change. In a child
session, `Parent session` opens the parent even when no subagents are listed.

Selecting a skill opens its description with Accept and Cancel controls before
appending its `/<name>` command to the current prompt. Select "Don't show again
for this skill" to skip that confirmation later. The sidebar settings dialog
can restore skipped confirmations. Select the star beside a skill to keep it
ahead of non-favorite skills in every workspace. The last 10 successfully inserted
skills are remembered user-wide by source location and appear after favorites,
most recent first, marked with a history icon (`~` in text mode). Other skills
remain alphabetical. The info control (`i` in text mode)
opens the description and full source location even when confirmation is skipped.
Quick actions invoke OpenCode's built-in
commands and display the active keybindings from your configuration.

Nested dialogs support back navigation: Escape, Cancel, and close controls return
to the previous menu. Settings retain the selected tab and row; Search Everything
also restores its query, selection, and scroll position. Escape at the root closes
the dialog. Completing an action closes its confirmation, and changing the search
session or workspace dismisses the entire search dialog chain.

## Scripts

Development requires Bun 1.4.0 and Node.js 24.16 or newer. Install dependencies with
`bun install --frozen-lockfile`.

ESLint uses the Solid preset from
[`@st1ggy/linter-config`](https://github.com/St1ggy/linter-config); Prettier uses its
common preset. `eslint.config.js` documents project-specific adaptations for
OpenTUI callbacks, SDK compatibility, and test fixtures. Type-aware linting covers
application code, tests, build scripts, and JavaScript configuration files.

```sh
bun run test
bun run test:e2e
bun run typecheck
bun run lint
bun run lint:fix
bun run format
bun run format:check
bun run font:install
bun run build
bun run bundle:size
bun run check
```

`bun run check` runs the tests, TypeScript, ESLint, bundle-size guard, and formatting
check. The unminified TUI bundle is limited to 345,000 bytes.
Font generation is a separate development task: `bun run font:build` and
`bun run font:check` use `uv` and the pinned FontTools dependency. Users install
the already generated font; Python and FontTools are not needed at runtime.
CI checks that the bundled font matches its generator.

## Publishing

Publishing is handled by `.github/workflows/publish.yml` when a GitHub Release
is published. The release tag must match the package version, for example
`v1.2.3` for version `1.2.3`.

The workflow uses npm Trusted Publishing with provenance. Configure
`St1ggy/opencode-navigator` and `publish.yml` as the trusted GitHub Actions
publisher in the package settings on npmjs.com before publishing a release.
The new npm package needs its own trusted-publisher configuration; the old
package's settings are not transferred by renaming the GitHub repository.
