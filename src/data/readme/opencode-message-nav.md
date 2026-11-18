# OpenCode Message Nav

[![npm version](https://img.shields.io/npm/v/opencode-message-nav)](https://www.npmjs.com/package/opencode-message-nav)
[![License: MIT](https://img.shields.io/npm/l/opencode-message-nav)](https://github.com/zhek/opencode-message-nav/blob/main/LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-5b8def)](https://opencode.ai/v2/docs/)

Prev/Next buttons under the “Jump to latest ↓” row that move quickly between
user messages in the OpenCode TUI. Mouse-driven, no keybinds, no modal mode.

## What it does

Two buttons appear above the prompt, under the `Jump to latest ↓` row:

- `Prev ↑` moves to the previous user message.
- `Next ↓` moves to the next user message.

Assistant messages are skipped. Both buttons are always visible and have the
same weight. Hovering a button changes its colour like `Jump to latest ↓`.

## Install

OpenCode V2 loads TUI-only plugins from `~/.config/opencode/cli.json`. Add the
package to `plugins`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-message-nav"]
}
```

OpenCode reloads `cli.json` on save. If the buttons do not appear, restart
OpenCode.

For a local checkout, use its path instead:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [{ "package": "/path/to/opencode-message-nav" }]
}
```

## Labels

`labels.prev` and `labels.next` rename the buttons. The defaults are
`Prev ↑` and `Next ↓`.

```json
{
  "plugins": [
    {
      "package": "opencode-message-nav",
      "options": { "labels": { "prev": "Back ↑", "next": "Forward ↓" } }
    }
  ]
}
```

- `labels.prev` — default `Prev ↑`.
- `labels.next` — default `Next ↓`.
- Each value must be a non-empty string; anything else falls back to the default
  for that side.

## Requirements

- OpenCode V2 with the TUI.
- `mouse` left enabled in `cli.json`. It is `true` by default; without mouse
  capture the buttons do not receive clicks.

## Limitations

- The buttons are always visible. They do not appear only when scrolled up:
  the plugin cannot read the scroll position.
- There is no message counter such as `3/10`: the plugin cannot read the current
  message or the total.
- User messages only. Assistant messages are skipped.
- Mouse only: there are no keybinds and no modal mode.

## License

[MIT](https://github.com/zhek/opencode-message-nav/blob/main/LICENSE)
