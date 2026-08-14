# opencode-ai-light

[OpenCode](https://opencode.ai) plugin that forwards session events to [AI Light](https://github.com/LeoKemp223/ai-light) — the desktop traffic light widget for monitoring AI coding assistants.

When OpenCode starts a session, submits a prompt, requests permission, or completes a task, this plugin sends real-time status updates to AI Light so you can see your OpenCode sessions alongside Claude Code and Codex at a glance.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@guan612/opencode-ai-light"]
}
```

OpenCode installs the package automatically at startup using Bun. Restart OpenCode and the plugin will connect to AI Light automatically.

OpenCode loads plugins at startup. Quit and reopen OpenCode after changing this package or your `opencode.json` plugin list.

## Configuration

No manual configuration needed. The plugin auto-discovers AI Light by reading:

- `~/.ai_light/runtime.json` — for the local AI Light HTTP port
- `AI_LIGHT_URL` environment variable — overrides auto-discovery if set

Logs are written to `~/.ai_light/opencode-plugin.log`.

## Event Mapping

| OpenCode Event | AI Light Event | Status |
|---|---|---|
| `session.created` | `session-start` | Idle (green) |
| `session.status` (busy/retry) | `prompt-submit` | Working (yellow) |
| `session.status` (idle) | `stop` | Done (green) |
| `session.idle` | `stop` | Done (green) |
| `session.error` | `notification` | Error (red) |
| `permission.asked` | `permission-request` | Error (red) |
| `session.deleted` | `session-end` | Removed |

`session.updated` is intentionally ignored because OpenCode also emits it for background session saves after completion. Treating it as work would turn the light yellow again after a task is done.
Completed assistant `message.updated` events are also ignored because they can occur while OpenCode is still busy, such as before a tool call or follow-up assistant output.

## AI Light Integration Note

OpenCode sessions appear as **Claude Code** tool type in AI Light's UI (the upstream AI Light project uses a hardcoded tool label). To show them as **OpenCode**, fork [ai-light](https://github.com/LeoKemp223/ai-light) and:

1. Add `OpenCode` to the `Tool` enum in `src-tauri/src/types.rs`
2. Use a dedicated route like `/events/opencode` to tag sessions correctly

## License

AGPL-3.0-only
