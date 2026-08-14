# opencode-morph-rotation

OpenCode plugin for automatic Morph API key rotation with rate-limit handling.

## Features

- 🔄 Automatic key rotation when rate limited
- 📊 Key health monitoring and status reporting
- ➕ Add/remove keys at runtime via tools
- 🛡️ Auto-disable keys after repeated failures
- 📋 `/morph-quota` slash command for quick status

## Installation

Add to your `opencode.jsonc`:

```jsonc
{
  "plugin": [
    "opencode-morph-rotation@latest"
  ]
}
```

Then restart OpenCode.

## Setup

### 1. Add your keys

Use the `morph_add_key` tool in chat:

> Add my Morph key sk-ABC123... with label "account1"

Or manually create `~/.config/opencode/morph-keys.json`:

```json
{
  "keys": [
    {
      "key": "sk-YOUR_KEY_1",
      "label": "account1",
      "enabled": true,
      "rateLimitResetTime": 0,
      "consecutiveFailures": 0,
      "lastUsed": 0,
      "addedAt": 1711152000000
    }
  ],
  "strategy": "least-recently-used",
  "defaultCooldownMs": 60000,
  "maxConsecutiveFailures": 5
}
```

### 2. Remove MORPH_API_KEY from MCP config

Since the plugin injects `MORPH_API_KEY` via `shell.env`, remove any hardcoded key from your MCP server config to avoid conflicts.

## Available Tools

| Tool | Description |
|------|-------------|
| `morph_quota` | Show status of all keys |
| `morph_add_key` | Add a new key for rotation |
| `morph_remove_key` | Remove a key by label |
| `morph_mark_rate_limited` | Manually mark a key as rate limited |

## Rotation Strategies

- **least-recently-used** (default): Picks the key used longest ago
- **round-robin**: Cycles through keys in order
- **sticky**: Stays on current key until it fails

## How It Works

1. Plugin loads on OpenCode start
2. Before each shell/tool execution, `shell.env` hook picks the best available key
3. When a key hits rate limit (429), use `morph_mark_rate_limited` to rotate
4. Disabled keys re-enable after cooldown period

## License

MIT
