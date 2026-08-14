# opencode-ntfy-smart

`opencode-ntfy-smart` is a standalone OpenCode plugin that sends `ntfy.sh` push notifications with smart filtering for main sessions and subagents.

It keeps the four supported notification events while reducing subagent noise:

| Event | Main session | Subagent |
| --- | --- | --- |
| `session.idle` | notify | suppress |
| `session.error` | notify | suppress |
| `permission.asked` | notify | notify |
| `question.asked` | notify | notify |

## Install

When you use OpenCode as a global app, you do not need to run `npm install` manually for the plugin. OpenCode can install npm plugins automatically from `~/.config/opencode/opencode.json` and cache them under `~/.cache/opencode/`.

### Agentic

Give your agent a prompt like this:

```text
Update my OpenCode config to use `opencode-ntfy-smart` as a plugin. If `opencode-ntfy.sh` is present, replace it. Keep my other plugins unchanged, and create or update `~/.config/opencode/notification-ntfy-smart.json` with my ntfy.sh topic/server settings.
```

### Manual

1. Edit `~/.config/opencode/opencode.json` and add `opencode-ntfy-smart` to the `plugin` array. If you are migrating from `opencode-ntfy.sh`, replace it.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-ntfy-smart"]
}
```

2. Create `~/.config/opencode/notification-ntfy-smart.json` using the configuration example below.

## Local Development

```bash
npm install
npm run build
```

Use the local OpenCode plugin build at `/root/code/opencode-ntfy-smart/dist/index.js`.

Example OpenCode plugin configuration:

```json
{
  "plugin": [
    "/root/code/opencode-ntfy-smart/dist/index.js"
  ]
}
```

## Configuration

Create the config file at `~/.config/opencode/notification-ntfy-smart.json`.

```json
{
  "$schema": "https://raw.githubusercontent.com/antctt/opencode-ntfy-smart/main/notification-ntfy-smart.schema.json",
  "enabled": true,
  "events": {
    "session.idle": { "enabled": true },
    "session.error": { "enabled": true },
    "permission.asked": { "enabled": true },
    "question.asked": { "enabled": true }
  },
  "backend": {
    "topic": "opencode-example-topic",
    "server": "https://ntfy.sh",
    "priority": "default",
    "fetchTimeout": "PT10S",
    "title": {
      "session.idle": { "value": "{project}: opencode finished" },
      "session.error": { "value": "{project}: opencode error" },
      "permission.asked": { "value": "{project}: permission needed" },
      "question.asked": { "value": "{project}: response needed" }
    },
    "message": {
      "session.idle": { "value": "The agent finished and is waiting for input." },
      "session.error": { "value": "{error}" },
      "permission.asked": { "value": "Permission requested: {permission_type} {permission_patterns}" },
      "question.asked": { "value": "{question}" }
    }
  }
}
```

## Publish

```bash
npm pack
npm publish
```
