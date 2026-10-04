# opencode-message-copy

[![npm version](https://img.shields.io/npm/v/opencode-message-copy.svg)](https://www.npmjs.com/package/opencode-message-copy)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

OpenCode TUI plugin for fuzzy-searching the current session, previewing the highlighted message as Markdown, and copying one exact user or assistant message as plain text.

## Features

- Fuzzy-searches the **full text** of every user and assistant message.
- Shows a responsive split-view picker with a Markdown preview of the highlighted message.
- Keeps the original message text separate from the rendered preview, so copied text is exact plain text.
- Shows newest messages first when the search is empty.
- Opens from `<leader>Y`, `/copy-message`, or the command palette.
- Supports macOS (`pbcopy`), Linux Wayland (`wl-copy`), Linux X11 (`xclip` / `xsel`), WSL (`clip.exe`), and OSC52-capable terminals.

## Install

### Current OpenCode

```bash
opencode plugin add opencode-message-copy
```

You can also configure the TUI plugin directly in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-message-copy"]
}
```

On older OpenCode builds that predate `plugin add`, the equivalent installer command is:

```bash
opencode plugin opencode-message-copy --global
```

## Usage

By default:

- `<leader>Y` opens the picker. With OpenCode's default leader, this is normally `Ctrl+X`, then `Shift+Y`.
- `/copy-message` opens the same picker from the prompt.
- **Copy message** is available in the command palette.
- Typing fuzzy-filters the full message bodies.
- Arrow keys, `Ctrl+P` / `Ctrl+N`, `Page Up` / `Page Down`, `Home`, and `End` navigate the message list using OpenCode's native select bindings.
- `Enter` copies the selected message.
- `Esc` or `Ctrl+C` closes the picker.

## Configure

A plugin entry may include options:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-message-copy",
      {
        "binding": "<leader>Y",
        "includeUser": true,
        "includeAssistant": true
      }
    ]
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `binding` | `"<leader>Y"` | Shortcut that opens the picker. Set to `false` to disable it. |
| `includeUser` | `true` | Include user messages. |
| `includeAssistant` | `true` | Include assistant messages. |

The package also exposes these defaults through its `./tui` export so OpenCode can write them during package installation.

## Compatibility

- OpenCode `>=1.18.34 <2`
- macOS, Linux, and WSL clipboard paths are supported.
- The UI uses OpenCode's public TUI plugin APIs and OpenTUI components; it does not patch OpenCode internals.

## Local development

```bash
npm ci
npm run typecheck
npm run build
npm pack --dry-run
```

To test the source checkout directly, point `tui.json` at `src/tui.ts`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "file:///absolute/path/to/opencode-message-copy/src/tui.ts"
  ]
}
```

The npm package ships compiled JavaScript and declaration files from `dist/`. `prepack` runs typechecking and the build automatically before `npm pack` or `npm publish`.

## Publishing

```bash
npm login
npm pack --dry-run
npm publish
```

After publishing, verify the package with:

```bash
npm view opencode-message-copy version
```

## How it works

The plugin reads the current session through `api.state.session.messages(...)` and `api.state.part(...)`. Each message's full whitespace-normalized body is used as the native `DialogSelect` search title, while the original text is retained separately for copying.

The picker is rendered in the global `app` slot as a plugin-owned overlay. Moving through the native message list updates a Markdown preview pane, but pressing Enter copies the original unrendered text.

## License

MIT
