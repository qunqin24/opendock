# opencode-statusline

OpenCode TUI plugin that displays configurable project and session status in the Sidebar.

```
▼ Status · opencode
● Session idle
🌿 main
📝 +42 ~17
▶ 📘 add-auth
▶ 📘 fix-login
✓ Tasks 5/7
```

All OpenSpec changes are listed. Expand a row to see its artifact and task-progress entries.

## Installation

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugin": ["opencode-statusline@latest"]
}
```

## Configuration

Create `~/.config/opencode/sidebar.json`:

```json
{
  "items": [
    { "type": "custom", "command": "basename \"$(pwd)\"", "format": "📁 {output}" },
    { "type": "git-branch", "format": "🌿 {branch}" },
    { "type": "git-diff", "format": "📝 +{added} ~{deleted}" },
    { "type": "openspec", "format": "{status}" }
  ],
  "refreshInterval": 500,
  "periodicInterval": 3000
}
```

### Status items

| type | description | format placeholders |
|---|---|---|
| `git-branch` | Current git branch | `{branch}` |
| `git-diff` | Unstaged added/deleted lines | `{added}`, `{deleted}` |
| `openspec` | OpenSpec change progress | `{status}` |
| `custom` | Arbitrary shell command | `{output}` |

Each item supports `format` (template with `{key}` placeholders) and `maxLength` (truncation).

### Options

| option | default | description |
|---|---|---|
| `refreshInterval` | `500` | Debounce interval in ms after OpenCode events |
| `periodicInterval` | `3000` | Fallback refresh interval in ms (minimum `500`) |

## Sidebar behavior

The panel is registered in `sidebar_content`. It refreshes after message, task, session, file, and Git-branch events, with a 3-second fallback refresh. Click the title to collapse it; click `Refresh` to request an update. The collapsed state is stored with OpenCode's plugin KV store.

The old `~/.config/opencode/statusline.json` remains supported as a migration fallback. No tmux setup or temporary status files are required.

## License

MIT
