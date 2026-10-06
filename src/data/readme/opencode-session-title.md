# opencode-session-title

**Shows the session title right next to where you type.** Without it, the only place to see which session you're in is the terminal tab at the top of the window. Claude Code shows it on the input box; this does the same for OpenCode.

The title sits dimmed at the right end of the agent/model row under the prompt:

```
┃  Build · Claude Opus 5.5 Cursor                   Displaying Session Title Above the Input Prompt…
╹▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
 ~/Code/my-project                                                       56.7K (19%)  ctrl+p commands
```

It updates when the session is auto-titled or renamed. Long titles are cut with `...` to fit the row, and in a window too narrow to show a useful part of it, the title hides.

## Install

```sh
opencode plugin opencode-session-title -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/moritzWa/opencode-session-title/main/index.js \
  -o ~/.config/opencode/tui-plugins/session-title.js
```

Then add it to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["./tui-plugins/session-title.js"]
}
```

## Options

```json
{
  "plugin": [["opencode-session-title", { "max": 60 }]]
}
```

| Option | Default | Meaning                                         |
| ------ | ------- | ----------------------------------------------- |
| `max`  | `48`    | Most columns the title takes before it is cut.  |
| `min`  | `12`    | Below this many columns the title is hidden.    |

## How it works

OpenCode's prompt has a `session_prompt_right` plugin slot on the agent/model row. The plugin renders a muted text node there and reads the title from `api.state.session.get(sessionID)`, which is reactive.

## License

MIT
