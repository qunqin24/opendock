# opencode-double-ctrl-c-v2

Require **two** `Ctrl+C` presses to exit the OpenCode TUI, Codex CLI style.

Pressing `Ctrl+C` once on an empty prompt shows a hint instead of quitting. Press it again within the confirmation
window and OpenCode exits. `Ctrl+C` keeps working as usual everywhere else: it still clears the prompt when there is
text, and it still copies when text is selected.

> **This plugin targets OpenCode v2 only** (the `@opencode/plugin` SDK, `>= 2.0.0`).
> If you installed OpenCode v1 from npm, use [`opencode-double-ctrl-c`](https://www.npmjs.com/package/opencode-double-ctrl-c)
> instead — it targets the v1 plugin API.

---

## Install

```bash
opencode plugin add opencode-double-ctrl-c-v2
```

Restart OpenCode after installing.

**That is all.** No configuration is required — the plugin intercepts the default `Ctrl+C` → *Exit the app* binding
itself, so the app no longer quits on the first press.

### Optional: keep a single-press exit shortcut

If you would rather still have a one-key way out, rebind the built-in exit command in `~/.config/opencode/cli.json`:

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "keybinds": {
    "app.exit": "ctrl+d,<leader>q"
  }
}
```

`ctrl+d` and `<leader>q` then exit immediately, and `Ctrl+C` is reserved for the two-press flow. This is optional — the
plugin works with the default keybindings as well.

---

## Behavior

| Situation | `Ctrl+C` does |
| --- | --- |
| Prompt has text | Clears the prompt (unchanged) |
| Text is selected | Copies the selection on Windows; on Linux/macOS/WSL the text was already copied on mouse-up, so the key acts as an exit intent — see [Platform differences in copy behavior](#platform-differences-in-copy-behavior) |
| Prompt is empty | Shows *"Press Ctrl+C again to exit"* |
| Prompt is empty, pressed again within the window | Exits OpenCode |
| Prompt is empty, pressed again after the window | Shows the hint again, does not exit |

Any other key press cancels a pending exit, so a stray `Ctrl+C` cannot trigger an exit later on.

---

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-double-ctrl-c-v2",
      "options": {
        "exitWindowMs": 2000,
        "enabled": true
      }
    }
  ]
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `exitWindowMs` | `number` | `1500` | Milliseconds within which a second `Ctrl+C` exits. Clamped to `200`–`10000`. |
| `enabled` | `boolean` | `true` | Set to `false` to disable the plugin without removing it. |

A TUI-only plugin is configured in `cli.json`, not in `opencode.json`. See the
[OpenCode plugin docs](https://opencode.ai/docs/cli/plugins).

---

## Notes and limitations

- **The plugin consumes `Ctrl+C` only when the prompt is empty.** In that state it stops the key from reaching the
  built-in *Exit the app* command, which is what makes zero-configuration work. When the prompt has text, or a selection
  is active, the key is passed through untouched and the built-in *clear input* / *copy* actions keep working.
- **`renderer.currentFocusedRenderable` is a renderer property, not a plugin API.** OpenCode does not expose the prompt
  contents through the plugin API, so the plugin reads the focused renderable to find out whether the prompt is empty.
  It prefers the public `renderer.currentFocusedRenderable` accessor and only falls back to the private
  `renderer._currentFocusedRenderable` field on renderer builds that do not expose the accessor. If a future OpenCode
  release changes the renderer internals, this plugin may stop detecting the prompt state. It fails safe: if the prompt
  state cannot be determined, the plugin does nothing and `Ctrl+C` keeps its default behavior.
- **Exit command detection.** The plugin dispatches the built-in `app.exit` command. It verifies that the command exists
  at startup and falls back to matching `/^(exit|quit)/i` command titles if the id ever changes. If no exit command can
  be found, the plugin shows an error toast instead of quitting.
- **Windows.** The plugin uses the same keymap and renderer APIs on every platform. However, on Windows terminals
  `Ctrl+C` has historically been intercepted by the console or the process group before reaching the TUI — see
  [anomalyco/opencode#2999](https://github.com/anomalyco/opencode/issues/2999) and
  [#65663](https://github.com/anomalyco/opencode/issues/65663). In that situation no plugin can help, because the key
  never reaches OpenCode. Behavior was verified on Linux; on Windows Terminal with a
  [v2 release](https://github.com/anomalyco/opencode/releases) it is expected to work, but this has not been verified on
  a real Windows machine.
- **OpenCode v1 is not supported.** `npm install -g opencode-ai` currently installs the v1 line (`1.19.6`), which uses
  the old `@opencode-ai/plugin` SDK. OpenCode v2 is distributed through the
  [GitHub releases](https://github.com/anomalyco/opencode/releases) and the official installer.

---

## Platform differences in copy behavior

OpenCode handles text selection itself (the TUI enables SGR mouse reporting), and the built-in selection handler runs
*before* the app keybindings. What `Ctrl+C` does while text is selected therefore depends on `terminal.copy`:

| Platform | `terminal.copy` default | Drag-select, then `Ctrl+C` |
| --- | --- | --- |
| Linux / macOS / WSL | `select` | The text is **already copied** when you release the mouse (OpenCode shows *"Copied to clipboard"*). Pressing `Ctrl+C` afterwards only dismisses the selection, so the plugin treats it as an exit intent: the first press shows the hint, a second press exits. |
| Windows | `manual` | The text is copied **by `Ctrl+C`**. OpenCode consumes the key (it never reaches the exit command), so the plugin does not interfere. |

You can change the default in `opencode.json`:

```jsonc
{
  "terminal": {
    "copy": "manual" // or "select"
  }
}
```

With `terminal.copy: "manual"` on Linux/macOS/WSL, `Ctrl+C` copies the selection and consumes the key, so the plugin
never sees it either.

**In short:** on Linux/macOS/WSL the copy already happened at mouse-up, so `Ctrl+C` afterwards being an exit intent
matches Codex CLI behavior. On Windows `Ctrl+C` remains a copy key while a selection is active.

A side effect worth knowing: without this plugin, `Ctrl+C` on an empty prompt in OpenCode quits immediately, and on
Linux/WSL `Ctrl+C` with an active selection also quits (the built-in selection handler dismisses the selection without
consuming the key). With the plugin installed, neither case quits on the first press.

---

## How it works

The plugin registers a keymap layer with `mode: "global"` and `priority: 100` that binds `ctrl+c`. Its `run` handler:

1. ignores the event when it is not `Ctrl+C`;
2. ignores it when the renderer reports a selection (`renderer.hasSelection`) — copying wins;
3. ignores it when the focused prompt still holds text — clearing wins;
4. otherwise it **consumes** the event (returns `undefined` instead of `false`), so the built-in *Exit the app* command
   never sees the key, and shows the hint toast;
5. on a second `Ctrl+C` inside the window, consumes the event again and dispatches `app.exit`, which quits the app.

Because the built-in exit command is reached through `keymap.dispatch("app.exit")` rather than through the key
press, it is unaffected by the interception — the app exits exactly once, on the second press.

---

## Development

```bash
npm pack                     # build the tarball
npm publish --dry-run        # inspect what would be published
```

To try it without publishing, point OpenCode at the local directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-double-ctrl-c-v2"]
}
```

---

## License

MIT © [cyqcw](https://github.com/cyqcw)
