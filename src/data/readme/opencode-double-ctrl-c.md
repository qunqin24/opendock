# opencode-double-ctrl-c

**Press ctrl+c twice to exit OpenCode, the way Claude Code and Codex CLI do.** Out of the box a single ctrl+c on an empty prompt quits the OpenCode TUI immediately, which is easy to hit by reflex in a long session. This plugin replicates the ctrl+c behaviour of Claude Code and Codex CLI:

- text in the prompt → ctrl+c clears it
- empty prompt → ctrl+c shows "ctrl+c again to exit"
- second ctrl+c within 1.5 s → exits

Nothing else changes. Escape still interrupts a running turn, ctrl+d and `/exit` still quit.

Double-press exit is a long-standing feature request upstream ([#9041](https://github.com/anomalyco/opencode/issues/9041), [#26371](https://github.com/anomalyco/opencode/issues/26371), [#10975](https://github.com/anomalyco/opencode/issues/10975)); this is a plugin you can use today.

## Install

```sh
opencode plugin opencode-double-ctrl-c -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` to install it for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

TUI plugins are not auto-discovered, so a file install needs both steps:

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/tannerbruhn/opencode-double-ctrl-c/main/src/tui.ts \
  -o ~/.config/opencode/tui-plugins/double-ctrl-c.ts
```

Then add it to `~/.config/opencode/tui.json` (create the file if it does not exist):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/double-ctrl-c.ts"]
}
```

Do not put the file in `~/.config/opencode/plugin/`. That directory is auto-discovered for *server* plugins and will try to load it the wrong way.

No keybind changes are required: the plugin registers ctrl+c at a priority above the built-in exit binding.

## Options

```json
"plugin": [["opencode-double-ctrl-c", { "window": 1500, "interrupt": false, "key": "ctrl+c" }]]
```

- `window` – milliseconds allowed between the two presses. Default 1500. Codex CLI uses about 1000, Claude Code a little longer; set whichever you are used to.
- `interrupt` – when true, the first press on an empty prompt stops a running turn instead of arming exit, which is what Claude Code and Codex CLI both do. Default false, because escape already does that in OpenCode.
- `key` – the key to take over. Default `ctrl+c`.

## If a single press still exits

Some builds may let the host's exit binding run first. If so, take ctrl+c off it in `tui.json` and the plugin does the rest:

```json
"keybinds": { "app_exit": "ctrl+d,<leader>q" }
```

## How it works

It registers one keymap layer with `priority: 1000` and a single binding for ctrl+c. The command reads the focused prompt's text: if there is any, it dispatches OpenCode's own `prompt.clear`; otherwise it arms a timer and shows a toast, and a second press inside the window dispatches `app.exit`. With `interrupt` on, a busy session gets `session.interrupt` on the first press instead.

## Requirements

OpenCode 1.18.18 or newer (the TUI plugin API with keymap layers). Tested on 1.18.26.

## License

MIT
