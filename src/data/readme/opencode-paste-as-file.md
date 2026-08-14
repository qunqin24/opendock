# opencode-paste-as-file

Paste clipboard text into opencode as a file reference.

The plugin reads your clipboard, writes it to `.opencode/pasted/`, and appends an `@file` reference to the current prompt.

## Install

Add the TUI plugin to your `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-paste-as-file",
      {
        "keybinds": ["<leader>v"],
        "dir": ".opencode/pasted"
      }
    ]
  ]
}
```

Restart opencode after changing plugin config.

## Usage

Run `Paste as file` from the command palette, or use the configured keybinding.

With the default opencode leader key, `<leader>v` is:

```text
ctrl+x v
```

The inserted prompt text looks like:

```text
@.opencode/pasted/paste-2026-05-20T12-00-00-000Z.txt
```

## Options

```ts
type Options = {
  dir?: string
  keybinds?: string[]
}
```

- `dir`: directory where pasted files are written. Defaults to `.opencode/pasted`.
- `keybinds`: TUI keybindings for the action. Defaults to `["<leader>v"]`.

## Clipboard Support

- macOS: `pbpaste`
- Windows: PowerShell `Get-Clipboard`
- Linux: tries `wl-paste`, then `xclip`, then `xsel`

## Git Ignore

Add this to your project `.gitignore`:

```gitignore
.opencode/pasted/
```
