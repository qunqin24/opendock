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

Install the package by adding it to the plural `plugins` key in OpenCode v2 `opencode.jsonc`. Check npm for available package versions. The package exposes its native server part as `./server`. Its shipped deployment template is deliberately neutral: `version: 2`, `cooldownMs: 300000`, `maxCycles: 1`, and an empty `agents` object. Without configured chains, the plugin is a safe no-op and does not switch models.

### Neutral template

To create a separate config file, choose OpenCode's config directory: `$XDG_CONFIG_HOME/opencode` when `XDG_CONFIG_HOME` is set, otherwise `~/.config/opencode`. Install the package first, then copy `deployment/model-fallback.v2.json` from that installed package to `model-fallback.v2.json` in the config directory. For example, if the package is installed in the current project:

```sh
config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
mkdir -p "$config_dir"
cp -n node_modules/@melivo/opencode-model-fallback/deployment/model-fallback.v2.json "$config_dir/model-fallback.v2.json"
```

Use the installed package's actual directory if it differs from this example. `cp -n` leaves an existing destination untouched; if the destination already exists, inspect it and choose another filename rather than replacing it. Package installation itself does not create or modify files in your OpenCode config directory or install agent profiles.

The complete neutral template is:

```json
{
  "version": 2,
  "cooldownMs": 300000,
  "maxCycles": 1,
  "agents": {}
}
```

### Configured example (illustrative, not a default)

To enable fallback, add an entry for an explicitly configured subagent and replace both example model references with exact provider/model references available in your own OpenCode setup. The chain requires 2–10 steps, including its start model and at least one fallback. Do not assume that the example provider names or model IDs exist in your setup.

```json
{
  "version": 2,
  "cooldownMs": 300000,
  "maxCycles": 1,
  "agents": {
    "example-subagent": {
      "chain": [
        { "model": "your-provider/your-start-model" },
        { "model": "your-provider/your-fallback-model" }
      ]
    }
  }
}
```

Use `options.configPath` to load the file. It must be an absolute path; expand `~` yourself and replace the placeholder below with the exact path to the file you created. You can add this object to your existing `plugins` array:

```jsonc
{
  "package": "@melivo/opencode-model-fallback",
  "options": {
    "configPath": "/absolute/path/to/model-fallback.v2.json"
  }
}
```

If neither `options.config` nor `options.configPath` is supplied, the plugin uses the neutral empty config. When both are supplied, `options.config` takes precedence. OpenCode observes configuration changes; use `/reload` if needed. A process restart is not required for configuration changes.

See the [official OpenCode v2 plugin guide](https://opencode.ai/docs/build/plugins) for package-based plugins and the plugins key.

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
