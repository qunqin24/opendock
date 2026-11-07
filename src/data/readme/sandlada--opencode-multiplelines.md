# @sandlada/opencode-multiplelines

A plugin for **OpenCode TUI v2** only (V1 is completely unsupported). It does exactly one thing: adds a boolean setting named **Multiple Lines** (`on`/`off`, OpenCode TUI uses `on`/`off` for on/off).

- **Off (default)**: keeps OpenCode's default behavior — in the chat input, `Enter` sends; newlines use `Shift+Enter` / `Ctrl+Enter` / `Alt+Enter` / `Ctrl+J`.
- **On**: `Enter` inserts a newline; the original newline keys (`Shift+Enter` / `Ctrl+Enter` / `Alt+Enter` / `Ctrl+J`) send the prompt.

The setting is persistent (survives restarts, synced across TUI instances) and only affects the chat input: `Enter` inside dialogs, autocomplete popups, queued prompts, etc. is untouched.

## Install

This package ships a TUI entrypoint (`./tui`) plus a no-op server entrypoint (`.` / `./server`) so that `opencode plugin add` can install it; it **only supports OpenCode v2** (`engines.opencode` requires `>=2.0.0`). V1 silently ignores it.

### Option 1: opencode CLI (recommended)

```bash
opencode plugin add @sandlada/opencode-multiplelines
```

This automatically writes the package into the global `plugins` array of `~/.config/opencode/cli.json` (TUI-only plugins belong in `cli.json`, not `opencode.json(c)`) and installs dependencies.

### Option 2: manual configuration

Edit `~/.config/opencode/cli.json` directly:

```jsonc title="~/.config/opencode/cli.json"
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@sandlada/opencode-multiplelines"]
}
```

### Local development

```jsonc title="~/.config/opencode/cli.json"
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["E:\\projects\\sandlada\\opencode-multiplelines"]
}
```

Or override temporarily with `OPENCODE_CLI_CONFIG_CONTENT`:

```bash
OPENCODE_CLI_CONFIG_CONTENT='{"plugins":["E:\\projects\\sandlada\\opencode-multiplelines"]}' opencode
```

## Usage

Open the **Multiple Lines** setting, two ways:

1. Press `Ctrl+P`, run the **Multiple Lines** command, then pick `on` / `off` in the dialog;
2. Type a slash command in the input:
   - `/multiple-lines` — opens the dialog above;
   - `/multiple-lines on` — turn on;
   - `/multiple-lines off` — turn off;
   - `/multiple-lines toggle` — flip directly.

Each change shows a `Multiple Lines: on/off` toast. The current value is stored in plugin storage (`settings`), default `off`.

You can also seed the initial value via plugin options in `cli.json` (only the first time, when no storage file exists; afterward storage wins):

```jsonc
{
  "plugins": [
    {
      "package": "@sandlada/opencode-multiplelines",
      "options": { "multipleLines": true }
    }
  ]
}
```

## How it works

Two keymap layers are registered:

- `global` command layer: provides the setting command above;
- `base` swap layer (`priority: 100`, above the host managed-textarea layer's default `0`), `enabled` bound to the setting:
  - When on, `return` dispatches `input.newline`; `shift+return` / `ctrl+return` / `alt+return` / `ctrl+j` dispatch `input.submit`;
  - The `run` checks that the focused editor is a multiline `Textarea` (excludes single-line `Input`); otherwise it returns `false` so the keystroke continues to its normal handler;
  - The swap layer only activates in `base` mode; `modal`/`autocomplete` modes keep their own bindings, so dialog `Enter` is never mis-swapped.

> Note: this plugin targets OpenCode v2's default keybinds (`input.submit` = `return`, `input.newline` = `shift+return,ctrl+return,alt+return,ctrl+j`). If you override those two keybinds in `cli.json`, the plugin still intercepts the default keys listed above; adapt the extra keys in your own keybind config.

## Development & verification

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # bun test (pure-logic + mock-context integration tests)
pnpm run pack:dry-run
```

Coverage: setting title, on/off parsing, slash-command input, options initial value, multiline-vs-single-line focus, on/off swap behavior and fallback.

## Layout

```text
package.json     # npm plugin manifest (exports "./tui", v2 only)
src/tui.ts       # plugin entry (Plugin.define)
src/settings.ts  # pure logic (title, key names, parsing, fallback detection)
test/*.test.ts   # Bun tests
```
