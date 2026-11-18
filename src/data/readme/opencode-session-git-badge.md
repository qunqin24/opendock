# opencode-session-git-badge

A small OpenCode Desktop plugin that shows a yellow dot on session tabs whose repository has uncommitted changes. Clean repositories show nothing.

Requires OpenCode Desktop 2.3.x.

## Install

Add the package to the global `~/.config/opencode/opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-git-badge"]
}
```

Or install it with the CLI:

```sh
opencode plugin add opencode-session-git-badge
```

Restart OpenCode Desktop, or open a new window.

## What it does

- Checks `git status` for each session's working directory.
- Adds a small warning-colored dot before the project icon when there is at least one staged, unstaged, or untracked file.
- Removes the dot when the working tree is clean.
- Refreshes every few seconds and when the sidebar changes.

## Notes

OpenCode Desktop has no plugin slot for the session list, so this follows the app's vertical-tab markup (`[data-slot="titlebar-tab-item"]`, `[data-slot="tab-link"]`, `[data-slot="tab-title"]`). A future OpenCode release can change that markup and break the plugin.

It only supports the vertical tabs sidebar used by OpenCode Desktop 2.3.x.

## Uninstall

Remove the entry from `~/.config/opencode/opencode.json` and restart, or run:

```sh
opencode plugin remove opencode-session-git-badge
```

## License

MIT
