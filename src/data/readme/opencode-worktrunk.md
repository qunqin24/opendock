# opencode-worktrunk

> See which worktrees have active OpenCode sessions at a glance.

An [OpenCode](https://github.com/anomalyco/opencode) plugin that shows session status markers in [worktrunk](https://github.com/max-sixty/worktrunk)'s `wt list` output.

## What It Does

When you're running OpenCode in a git worktree, this plugin automatically sets status markers that appear in `wt list`:

```
$ wt list
  Branch       Status        HEAD±    main↕  Remote⇅  Path                 Commit    Age   Message
@ main             ^⇡                         ⇡1      .                    33323bc1  1d    Initial commit
+ feature-api      ↑ 🤖              ↑1               ../repo.feature-api  70343f03  1d    Add REST API endpoints
+ review-ui      ? ↑ 💬              ↑1               ../repo.review-ui    a585d6ed  1d    Add dashboard component
+ wip-docs       ? –                                  ../repo.wip-docs     33323bc1  1d    Initial commit
```

- 🤖 — OpenCode is working
- 💬 — OpenCode is waiting for input

## Prerequisites

- [worktrunk](https://github.com/max-sixty/worktrunk) must be installed (`cargo install worktrunk` or `brew install max-sixty/tap/worktrunk`)
- [OpenCode](https://github.com/anomalyco/opencode) v0.1.0+

## Installation

### Via npm (recommended)

Add to your OpenCode config:

```json
// opencode.json or ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-worktrunk"]
}
```

### Via local plugin

Copy the plugin file to your OpenCode plugins directory:

```bash
mkdir -p ~/.config/opencode/plugins
curl -o ~/.config/opencode/plugins/worktrunk.ts \
  https://raw.githubusercontent.com/jradtilbrook/opencode-worktrunk/main/src/plugin/index.ts
```

## How It Works

The plugin listens to OpenCode session events:

| Event | Marker | Meaning |
|-------|--------|---------|
| `session.status` (busy) | 🤖 | AI is actively working |
| `session.idle` | 💬 | AI is waiting for your input |
| `session.deleted` | (cleared) | Session ended |

Markers are stored in git config and persist until cleared. If you close OpenCode without a clean session end (e.g., Ctrl+C), the marker may persist — just run `wt config state marker clear` to reset it.

## Manual Marker Control

You can also set markers manually for any workflow:

```bash
wt config state marker set "🚧"                   # Current branch
wt config state marker set "✅" --branch feature  # Specific branch
wt config state marker clear                      # Clear current branch
wt config state marker clear --all                # Clear all markers
```

## Related

- [worktrunk](https://github.com/max-sixty/worktrunk) — Git worktree manager with status display
- [worktrunk Claude Code plugin](https://github.com/max-sixty/worktrunk/tree/main/.claude-plugin) — Similar integration for Claude Code

## License

MIT
