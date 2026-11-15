# opencode-with-agy

An [OpenCode](https://opencode.ai) plugin that adds **Google Antigravity** as a model provider (`agy/...`) by the official **`agy` CLI** over the [Agent Client Protocol](https://agentclientprotocol.com). OpenCode **v2** only.

## ToS

This plugin only runs the official `agy` binary with ACP that you installed and logged into yourself. It **doesn't** emulate or call any Google HTTP APIs.

Other plugins emulate API calls, so they will eventually get banned by Google. This plugin avoids that risk.

## Install

1. Install `agy` v1.5+ and logged in (run `agy` once in a terminal)
2. Add plugin to `opencode.json`

```json
{
  // ...
  "plugins": ["opencode-with-agy"]
  // ...
}
```

### Options

| Option       | Type                 | Default | Meaning                                                                                                  |
| ------------ | -------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `permission` | `"allow"` / `"deny"` | `allow` | How to answer agy's permission requests (it asks before shell commands). **`allow` approves everything** |

Telemetry in the spawned `agy` process is always disabled via `--disable-telemetry`

### Models and thinking levels

Plugin reads the available models and their thinking levels directly from the `agy` binary at runtime. Otherwise, it uses a hard‑coded list

## Known limitations

- **agy** uses its own system prompt and tools
- titles use the chat model through agy, so each one costs about 9k input tokens
- deleting an OpenCode session doesn't delete agy session
