# opencode-ntfy

OpenCode plugin that sends push notifications via [ntfy.sh](https://ntfy.sh) when the agent needs input, requests permission, or encounters errors.

## Installation

Add the plugin to your `opencode.json` or `opencode.jsonc`:

```json
{
  "plugin": ["opencode-ntfy"]
}
```

## Configuration

Create a configuration file at `~/.config/opencode/opencode-ntfy.json`:

```json
{
  "topic": "my-opencode-alerts"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `topic` | string | **required** | The ntfy topic to publish to |
| `server` | string | `https://ntfy.sh` | The ntfy server URL (for self-hosted instances) |
| `token` | string | `null` | Access token for authentication |
| `priority` | number (1-5) | `3` | Default notification priority |
| `events.idle` | boolean | `true` | Notify when agent finishes and needs input |
| `events.permission` | boolean | `true` | Notify when permission is requested |
| `events.error` | boolean | `true` | Notify on session errors |

### Full Configuration Example

```json
{
  "topic": "my-opencode-alerts",
  "server": "https://ntfy.sh",
  "token": "tk_xxx",
  "priority": 3,
  "events": {
    "idle": true,
    "permission": true,
    "error": true
  }
}
```

## Subscribing to Notifications

1. Install the ntfy app on your phone ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy), [iOS](https://apps.apple.com/app/ntfy/id1625396347))
2. Subscribe to your topic (e.g., `my-opencode-alerts`)
3. You'll receive push notifications when OpenCode events occur

You can also subscribe via the web at `https://ntfy.sh/your-topic`.

## Self-Hosted ntfy

If you're running your own ntfy server, set the `server` option:

```json
{
  "topic": "opencode",
  "server": "https://ntfy.example.com"
}
```

## Authentication

For protected topics, add your access token:

```json
{
  "topic": "private-alerts",
  "token": "tk_your_access_token"
}
```

## License

MIT
