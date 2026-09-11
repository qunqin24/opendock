# turn-timer

An OpenCode TUI plugin that shows how long the current turn has been running, inline in the prompt footer — right after the built-in `▣ Build · <model>` line:

```text
▣ Build · Opus 5 (max) ◷ 0:12
```

## Install

Install with the OpenCode CLI — it detects the TUI target and registers the plugin in `tui.json` for you:

```bash
opencode plugin @glaicer/supercode-turn-timer --global
```

- `--global` installs into the global config (`~/.config/opencode`); default is local (`.opencode` in the current project).
- `--force` replaces an already-installed version.
- Restart OpenCode after installing.

Manual install also works: add the package to the `plugin` array in `tui.json` (global `~/.config/opencode/tui.json` or local `<project>/.opencode/tui.json`):

```jsonc
{
  "plugin": ["@glaicer/supercode-turn-timer"]
}
```

> [!IMPORTANT]
> **The first OpenCode load after installing this plugin may be slow.** That's OpenCode downloading the plugin's packages into its cache. It happens once. Every subsequent start is fast.