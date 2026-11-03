# @melivo/opencode-model-fallback

Native OpenCode v2 server plugin distributed as an npm package. It advances an explicitly configured child-subagent model chain on supported transient failures. This fork is based on [Smart-Coders-HQ/opencode-model-fallback](https://github.com/Smart-Coders-HQ/opencode-model-fallback) at commit `4920240fb95c48b42f8d9e9d7648aa473740afe0`; upstream attribution and the Apache-2.0 license are retained.

Check npm for available package versions and GitHub Releases for release details. See [Release and recovery runbook](docs/releases.md) for the safe-release procedure.

## Legacy OpenCode v1 behavior

The following fallback features and commands belong to the legacy `.` export, not the native v2 `./server` export.

### What problem does this solve?

If you use OpenCode with multiple models or providers, rate limits and transient provider failures can interrupt chats and force manual model switching. This plugin adds automatic model failover so OpenCode can continue with the next healthy model instead of getting stuck on repeated retries, 429s, or provider overload errors.

### How does legacy model fallback work?

The plugin tracks model health globally, keeps fallback depth per session, and walks an ordered fallback chain when the active model fails. If a model is already known to be unhealthy, the `chat.message` hook can preemptively redirect the next prompt before the provider returns another 429.

### Legacy features

- Preemptive redirect via `chat.message` when a model is already known to be rate-limited
- Reactive fallback from both `session.status` retry events and `session.error` API errors
- Per-agent ordered fallback chains with `"*"` wildcard support
- Global model health tracking with automatic recovery windows
- `/fallback-status` slash command for session depth, history, and model health
- Structured logs with provider free-form error text redacted

## OpenCode v2 installation and configuration

Install the package by adding it to the plural `plugins` key in OpenCode v2 `opencode.jsonc`. Check npm for available package versions. The package exposes its native server part as `./server`. The default has an empty agent map and is a safe no-op: it does not switch models without configured chains.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@melivo/opencode-model-fallback",
      "options": {
        "config": {
          "version": 2,
          "cooldownMs": 300000,
          "maxCycles": 1,
          "agents": {
            "reviewer": {
              "chain": [
                { "model": "anthropic/claude-sonnet-4-20250514" },
                { "model": "google/gemini-flash-2-5" }
              ]
            }
          }
        }
      }
    }
  ]
}
```

Replace `reviewer` with an ID of a subagent defined in your OpenCode setup, and use exact provider/model references available there. The plugin supports only explicitly named subagents, with 2–10 models per chain; there is no primary-agent or wildcard chain. Variants are optional. `cooldownMs` must be at least 10000; `maxCycles` is 1–5 and defaults to 1.

You may pass `options.config` as above or use `options.configPath` to point to a JSON file; when both are supplied, `options.config` takes precedence. If neither is supplied, the empty config observes but never switches models. The package does not install personal deployment config. OpenCode observes configuration changes; use `/reload` if needed. A process restart is not required for configuration changes.

See the [official OpenCode v2 plugin guide](https://opencode.ai/v2/docs/build/plugins) for package-based plugins and the plugins key.

## Legacy OpenCode v1 plugin

This guidance applies only to the legacy `.` export; it does not describe the native v2 server export.

### Legacy V1 installation

Add the legacy plugin to the singular `plugin` key in a V1 config:

```jsonc
{
  "plugin": ["@melivo/opencode-model-fallback"]
}
```

For local development, point this legacy entry at `dist/index.js`.

### Legacy V1 configuration file

Create `model-fallback.json` in either:

- `.opencode/model-fallback.json`
- `~/.config/opencode/model-fallback.json`

Minimal example:

```json
{
  "enabled": true,
  "defaults": {
    "fallbackOn": [
      "rate_limit",
      "quota_exceeded",
      "5xx",
      "timeout",
      "overloaded"
    ],
    "cooldownMs": 300000,
    "retryOriginalAfterMs": 900000,
    "maxFallbackDepth": 3
  },
  "agents": {
    "*": {
      "fallbackModels": [
        "anthropic/claude-sonnet-4-20250514",
        "google/gemini-flash-2-5"
      ]
    }
  },
  "logging": true,
  "logLevel": "info",
  "logPath": "~/.local/share/opencode/logs/model-fallback.log"
}
```

Most important knobs:

- `defaults.fallbackOn` - which error categories trigger fallback
- `defaults.cooldownMs` - how long a rate-limited model stays unavailable
- `defaults.retryOriginalAfterMs` - when a cooled-down model becomes healthy again
- `defaults.maxFallbackDepth` - max cascading fallbacks within one message
- `agents` - ordered fallback chains per agent
- `logging`, `logLevel`, `logPath` - structured file logging controls

Per-agent example:

```json
{
  "agents": {
    "build": {
      "fallbackModels": [
        "anthropic/claude-sonnet-4-20250514",
        "google/gemini-3-pro",
        "openai/gpt-4o"
      ]
    },
    "coder": {
      "fallbackModels": ["anthropic/claude-sonnet-4-20250514"]
    },
    "*": {
      "fallbackModels": [
        "anthropic/claude-sonnet-4-20250514",
        "google/gemini-flash-2-5"
      ]
    }
  }
}
```

If you still have `rate-limit-fallback.json`, it is discovered and auto-migrated on load.

### Legacy V1 `/fallback-status`

Run `/fallback-status` in any OpenCode session to see:

- current session fallback depth and history
- tracked model health and time remaining
- active agent name

Verbose mode adds token and cost breakdown by fallback period:

```text
/fallback-status verbose:true
```

When enabled, the plugin auto-creates `~/.config/opencode/commands/fallback-status.md` at startup.

### Legacy V1 troubleshooting

- **No toast appears** - toasts require an active OpenCode TUI session; headless/API runs still log events
- **`/fallback-status` is missing** - verify `~/.config/opencode/commands/` is writable and check logs for `fallback-status.command.write.failed`
- **"no fallback chain configured"** - add `agents["*"]` or an entry for the active agent with at least one `fallbackModels` value
- **"all fallback models exhausted"** - every configured fallback is currently rate-limited; wait for recovery or add more models
- **"max fallback depth reached"** - all models in the chain failed within one message; start a new session or raise `maxFallbackDepth`
- **Reactive fallback logged `replay.revert.failed`** - if OpenCode applied the revert but returned an invalid revert response, newer plugin builds verify session revert state and continue replay instead of aborting immediately

Check logs with:

```bash
tail -f ~/.local/share/opencode/logs/model-fallback.log | jq .
```

For more event detail, set `"logLevel": "debug"` and restart OpenCode.

## Development

```bash
bun install
bun run lint
bun test
bunx tsc --noEmit
bun run build
```

Legacy V1 local plugin config:

```jsonc
{ "plugin": ["file:///absolute/path/to/dist/index.js"] }
```

For legacy V1 local testing, place `model-fallback.json` in `.opencode/` in your project directory.

### Repository-specific v2 maintenance

The local v2 maintenance notes and integration-test instructions are in [docs/maintenance.md](docs/maintenance.md). They describe this checkout's maintenance setup, not a portable package configuration.
