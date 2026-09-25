# opencode-cut

OpenCode V2 TUI plugin that makes `Ctrl+X` cut selected text in prompt and dialog inputs.

The plugin copies the selected text to the system clipboard first and deletes it only after the clipboard write succeeds. If the input, selection, or focused editor changes while copying, it is left untouched. Repeated cut requests are ignored while a copy is pending.

## Install

Add the package to the terminal client plugin list and move OpenCode's default leader key away from `Ctrl+X`:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-cut"],
  "keybinds": {
    "leader": "alt+x"
  }
}
```

OpenCode reloads valid `cli.json` changes while running. Restart the terminal client if the plugin is not picked up immediately.

## Usage

1. Select text in an OpenCode input with `Shift` plus the arrow keys.
2. Press `Ctrl+X`.
3. Paste it elsewhere with that application's paste shortcut (`Ctrl+V` in OpenCode).

With no input selection, `Ctrl+X` does nothing. Existing leader shortcuts continue to work with `Alt+X`; for example, `Alt+X`, then `N` creates a new session.

## Clipboard behavior

The plugin uses the native operating-system clipboard through [`clipboardy`](https://github.com/sindresorhus/clipboardy). Linux requires a working X11 or Wayland clipboard (for example, `xsel` or `wl-copy`); macOS and Windows use their native clipboard tools.

If the clipboard write fails, an error toast is shown and the selection is preserved. OSC 52 is not used because sending an escape sequence does not confirm that a terminal accepted the text. Headless/SSH environments need access to a native clipboard, such as X11 forwarding.

Requires OpenCode V2. Development and npm tooling require Node.js 20 or newer. The command ID is `aiev.cut` and can be rebound under `keybinds` in `cli.json`. The plugin does not change your leader automatically; keep the `leader` setting above when using `Ctrl+X`.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Load the working copy by adding its absolute path to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["/absolute/path/to/opencode-cut"]
}
```

## License

MIT
