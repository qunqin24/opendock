# opencode-backslash-newline

**Type `\` and press Enter to get a newline in the prompt, the way Claude Code does it.** In stock OpenCode, Enter submits, so that habit (or a keyboard macro built for Claude Code) sends your half-written message with a stray backslash at the end.

With the plugin, Enter checks the character right before the cursor. If it's a `\`, the backslash is removed and a newline goes in its place, wherever the cursor is in the prompt. Otherwise Enter submits as usual.

```
fix the login bug\⏎      →      fix the login bug
                                █
```

Emoji and other wide characters before the cursor are handled, so the check doesn't drift in long prompts.

## Install

```sh
opencode plugin opencode-backslash-newline -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/moritzWa/opencode-backslash-newline/main/index.js \
  -o ~/.config/opencode/tui-plugins/backslash-newline.js
```

Then add it to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["./tui-plugins/backslash-newline.js"]
}
```

Keep it out of `~/.config/opencode/plugins/`: files there are loaded as server plugins, and this one is TUI-only.

## License

MIT
