# opencode-messages

Installable OpenCode plugin package for controlling a running OpenCode instance from your iPhone over iMessage using [Messages.dev](https://www.messages.dev/).

The package exports `OpencodeMessagesPlugin` and is designed so users can configure everything directly in `opencode.json`.

If you provide a public tunnel URL, the plugin will create or reuse the Messages.dev webhook automatically. That removes the manual webhook setup step entirely.

It:

- receives `message.received` webhooks from Messages.dev
- verifies the webhook signature
- maps each allowed sender to an OpenCode session
- sends prompts, slash commands, shell commands, and permission replies into OpenCode
- sends the resulting assistant response back over iMessage

## What It Supports

- normal prompt messages
- `/new [title]`
- `/use <session-id>`
- `/status`
- `/abort`
- `/cmd </slash-command args>`
- `/shell <command>`
- `/approve <permission-id>`
- `/deny <permission-id>`

## Quick Start

1. Install the package:

```bash
npm install opencode-messages
```

2. Put this in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-messages"],
  "opencodeMessages": {
    "apiKey": "sk_live_...",
    "line": "+15551234567",
    "publicUrl": "https://paste-your-tunnel-url-here.trycloudflare.com",
    "allowedSenders": ["+15559876543"]
  }
}
```

3. Start OpenCode in the project.
4. Expose the local bridge over HTTPS:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

5. Replace `publicUrl` in `opencode.json` with the tunnel URL that `cloudflared` printed.
6. Restart OpenCode if it was already running.
7. Send `/help` from your iPhone.

No manual Messages.dev webhook creation is needed in this mode.

## Install

Published package usage in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-messages"],
  "opencodeMessages": {
    "apiKey": "sk_live_...",
    "line": "+15551234567",
    "publicUrl": "https://your-tunnel-url.trycloudflare.com",
    "allowedSenders": ["+15559876543"]
  }
}
```

That is the lowest-friction setup path because users already need this file for the plugin entry.

## Manual Setup

You can also use environment variables instead of `opencode.json`:

```bash
export OPENCODE_MESSAGES_API_KEY="sk_live_..."
export OPENCODE_MESSAGES_LINE="+15551234567"
export OPENCODE_MESSAGES_PUBLIC_URL="https://your-tunnel-url.trycloudflare.com"
export OPENCODE_MESSAGES_ALLOWED_SENDERS="+15559876543"
```

If you do not want the plugin to auto-manage the webhook, you can still configure a webhook yourself and provide a secret manually:

```bash
export OPENCODE_MESSAGES_WEBHOOK_SECRET="whsec_..."
```

Optional overrides:

```bash
export OPENCODE_MESSAGES_HOST="127.0.0.1"
export OPENCODE_MESSAGES_PORT="8787"
export OPENCODE_MESSAGES_WEBHOOK_PATH="/opencode-messages/webhook"
export OPENCODE_MESSAGES_STATE_FILE=".opencode/opencode-messages-state.json"
export OPENCODE_MESSAGES_MAX_CHUNK_CHARS="1800"
```

## Package Layout

- `index.ts`: source for the package plugin entrypoint
- `dist/index.js`: built plugin entrypoint published to npm
- `.opencode/plugins/opencode-messages.ts`: local development wrapper that re-exports the package plugin

## Notes

- The plugin reads `opencode.json` from the `opencodeMessages` block, and environment variables override file values when both are present.
- The plugin accepts both the new `OPENCODE_MESSAGES_*` variables and the older `OPENCODE_MESSAGES_DEV_*` names for compatibility.
- `publicUrl` is the preferred setup path. When present, the plugin creates or reuses the Messages.dev webhook automatically.
- The plugin only accepts senders listed in `allowedSenders` or `OPENCODE_MESSAGES_ALLOWED_SENDERS`.
- If you do not want secrets in `opencode.json`, use environment variables instead.
- State is persisted in `.opencode/opencode-messages-state.json` so sender-to-session mappings survive restarts.
- Permission prompts from OpenCode are sent back to iMessage, and you can reply with `/approve <id>` or `/deny <id>`.
- Incoming webhooks must reach the machine running OpenCode. Messages.dev requires an HTTPS endpoint for webhook delivery.

## Health Check

The plugin exposes a local health endpoint:

```text
GET /health
```

Example:

```bash
curl http://127.0.0.1:8787/health
```
