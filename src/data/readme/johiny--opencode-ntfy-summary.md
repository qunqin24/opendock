# opencode-ntfy (johiny fork — with agent summary)

Fork of [Stephanvs/opencode-ntfy](https://github.com/Stephanvs/opencode-ntfy) that adds an **agent message summary** to the ntfy notification when the OpenCode session goes idle.

Instead of getting a generic "Agent finished" notification, you get the first ~250 chars of what the agent actually said — so you can decide from your phone whether to come back to the PC or skip it.

## What changed vs upstream

- New config block: `summary.enabled`, `summary.maxLength`, `summary.messageLimit`
- On `session.idle`, the plugin calls `client.session.messages({ sessionID, limit })` to fetch the last few messages, walks back to the most recent assistant message, strips code blocks / markdown noise, and prepends it to the ntfy body
- Graceful fallback: if the summary fetch fails (network, auth, missing session), the notification falls back to the original "Agent finished" text

## Installation

Add the plugin to your `opencode.json` (use a GitHub raw URL or local path until published):

```json
{
  "plugin": ["@johiny/opencode-ntfy-summary"]
}
```

For local development, point at the cloned path:

```json
{
  "plugin": ["/home/johiny/Code_Library/opencode-ntfy"]
}
```

## Configuration

Create `~/.config/opencode/opencode-ntfy.json`:

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
  },
  "summary": {
    "enabled": true,
    "maxLength": 250,
    "messageLimit": 5
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `topic` | string | **required** | The ntfy topic to publish to |
| `server` | string | `https://ntfy.sh` | The ntfy server URL |
| `token` | string | `null` | Bearer token for protected topics |
| `priority` | number (1-5) | `3` | Default notification priority |
| `events.idle` | boolean | `true` | Notify when agent finishes |
| `events.permission` | boolean | `true` | Notify on permission requests |
| `events.error` | boolean | `true` | Notify on session errors |
| `summary.enabled` | boolean | `true` | Include agent-message summary on idle |
| `summary.maxLength` | number | `250` | Max chars of the summary body |
| `summary.messageLimit` | number | `5` | How many recent messages to scan backwards |

## Example notification

**Before (upstream):**

```
Agent finished and needs input
/home/johiny/projects/myapp
```

**After (this fork):**

```
myapp: Refactored the auth middleware to use the new token format. I also
caught a bug in the rate limiter where requests were being double-counted
when the upstream returned 503. Tests pass for both cases. Ready for
review when you are — let me know if you want me to also update the
do...
/home/johiny/projects/myapp
```

## Building from source

```sh
bun install
bun run build
```

Output goes to `dist/`.

## Subscribing

Install the ntfy app ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy), [iOS](https://apps.apple.com/app/ntfy/id1625396347)) and subscribe to your topic. Or open `https://ntfy.sh/your-topic` in a browser.

## License

MIT (inherited from upstream).
