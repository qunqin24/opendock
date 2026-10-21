# opencode-later

[![npm](https://img.shields.io/npm/v/opencode-later)](https://www.npmjs.com/package/opencode-later)

A global persistent Later list with native OpenCode sidebar integration and management.

`/later` opens a keyboard-first management view for adding, editing, completing, restoring, deleting, and reordering items. Active items remain visible in OpenCode's right sidebar across every session and project.

### Add Items

Add items from the keyboard-first management view.

![opencode-later add dialog for creating a new Later item](https://raw.githubusercontent.com/ZackarySantana/opencode-later/main/assets/oc-later-demo1.png)

### Manage Your List

Review active items and completed history, then edit, reorder, complete, restore, delete, or start an item.

![opencode-later management view showing active items and completed history](https://raw.githubusercontent.com/ZackarySantana/opencode-later/main/assets/oc-later-demo2.png)

Published on npm as [`opencode-later`](https://www.npmjs.com/package/opencode-later).

## Requirements

- OpenCode 2.1.1 or newer within the 2.x release line
- Bun, which is already used by OpenCode's plugin runtime

This is a V2 plugin, using `@opencode/plugin` and OpenTUI 0.6.6 or newer. It does not support OpenCode V1.

The sidebar works in the terminal TUI. It does not appear in the desktop application or `opencode --mini`.

## Install

Install globally so the same list is available from every project:

```sh
opencode plugin add opencode-later
```

Alternatively, add the package to the global `~/.config/opencode/opencode.jsonc` (or `opencode.json`), preserving any existing settings:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-later"]
}
```

The package exposes a main server entrypoint and a `./tui` entrypoint. V2 automatically loads the terminal component from the server's plugin list; no duplicate terminal configuration is needed. For terminal-only loading (including remote servers), put the same `plugins` entry in `~/.config/opencode/cli.json` instead.

V2 watches configuration for changes. Restart OpenCode if the plugin does not appear after installation.

Then run:

```text
/later
```

## Commands

- `/later`: open the management view

Messages may be duplicated. Active numbers always follow the current display order and are reassigned immediately after completion, deletion, or reordering.

## Sidebar

Active items appear in the right sidebar as a numbered ordered list in every session and project. Long messages wrap within the available sidebar width. The entire Later section is omitted when there are no active items.

The plugin does not force the right sidebar open; the section appears when OpenCode's sidebar is visible.

## Management View

- `a`: add an item
- `e`: edit the selected item
- `space`: complete the selected active item or restore the selected completed item
- `enter`: start the selected active item by completing it, closing the view, and placing its text in the prompt
- `d`: permanently delete the selected item
- `J` / `K`: move the selected active item down or up
- `j` / `k` or arrow keys: move selection
- `h`: show or hide completed history
- `r`: refresh immediately
- `esc`: return to the session or home screen that opened the view

The screen and sidebar refresh automatically when another active OpenCode instance changes the list.

Completing an item preserves it in history. Restoring a completed item appends it to the active list. Deleting an active or completed item removes it permanently.

## Storage

The plugin stores its SQLite database at:

```text
<opencode-state>/opencode-later/later.sqlite
```

This is plugin-owned global storage and does not use OpenCode's database. The state directory is `$XDG_STATE_HOME/opencode`, or `~/.local/state/opencode` by default. SQLite WAL mode and transactions allow multiple active OpenCode processes to read and update the list safely.

The database location and schema are unchanged from V1, so existing active items, order, and completed history are retained without conversion.

To clear all active items and history, quit OpenCode and remove the database file.

## Custom Database Path

Set the `database` option on the plugin entry in `opencode.jsonc` (or `cli.json` for terminal-only loading):

```jsonc
{
  "plugins": [
    {
      "package": "opencode-later",
      "options": { "database": "/absolute/path/later.sqlite" }
    }
  ]
}
```

A relative path is resolved from OpenCode's state directory.

## Migrating from V1

Install this V2 implementation and replace the old `plugin` entry with the `plugins` format above. Remove the old entry from `tui.json`; V2 terminal-only plugins use the global `cli.json` instead. Keep any custom `database` option pointing to the same file. Do not configure the package in both `opencode.jsonc` and `cli.json`.

The port follows the official [plugin migration guide](https://opencode.ai/v2/docs/build/plugins/migrate-v1) and [CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli).

## Development

```sh
bun install
bun run test
bun run typecheck
bun run build
```

After building, load a local checkout by adding its absolute directory to `plugins` in `opencode.jsonc` (or the global `cli.json` for terminal-only loading). Restart OpenCode after rebuilding if necessary.

## Data Model

The database records:

- A stable unique item ID
- Message text
- Active display position
- Creation and update timestamps
- Completion timestamp for historical items
- A monotonically increasing revision used to detect external changes

Project paths, session IDs, prompts, responses, tool arguments, file contents, and credentials are not stored.
