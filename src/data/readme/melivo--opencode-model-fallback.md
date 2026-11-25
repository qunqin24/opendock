# @melivo/opencode-model-fallback

Native OpenCode v2 server plugin distributed as an npm package. It advances an
explicitly configured child-subagent model chain on supported transient
failures. This fork is based on
[Smart-Coders-HQ/opencode-model-fallback](https://github.com/Smart-Coders-HQ/opencode-model-fallback)
at commit `4920240fb95c48b42f8d9e9d7648aa473740afe0`; upstream attribution and
the Apache-2.0 license are retained.

The package is published on npm; see
[GitHub Releases](https://github.com/Melivo/opencode-model-fallback/releases)
for release details and the
[release and recovery runbook](docs/releases.md) for the safe-release procedure.

## OpenCode v2 installation and configuration

This plugin helps a **subagent**—a helper the main agent starts in a separate
child session to handle part of a task—continue with the next model in a
fallback chain when its current model fails with a rate limit, quota error,
timeout, provider overload, or 5xx server error. It only affects child
subagents that you explicitly configure; your primary agent is never switched.
Until you configure a chain, the plugin is a safe no-op and does not switch
models. It can override HTTP JSON request bodies, but not WebSocket frames.
Legacy status and toast features below belong to V1 and are not provided by the
native v2 server.

### 1. Install the plugin

Install the package with OpenCode's plugin CLI:

```sh
opencode plugin add @melivo/opencode-model-fallback
```

The plugin is now installed but does nothing until you configure a fallback
chain (next step).

### 2. Add a fallback chain

After installation, OpenCode prints the selected config path, for example:
`Plugin "@melivo/opencode-model-fallback" installed and added to <path>`.
Open that exact file; the path in the message is authoritative. OpenCode
chooses the first existing file in the global config directory in this order:
`opencode.json`, `opencode.jsonc`, `.opencode/opencode.json`, then
`.opencode/opencode.jsonc`. If none exists, it creates `opencode.json`.

In that file, replace the plugin's string entry with the object below; keep all
other settings and plugin entries. The CLI avoids adding the same package twice
in that file. OpenCode may load both global `opencode.json` and
`opencode.jsonc`, so check both and keep only one entry for this package. If
the CLI says it is already configured, edit the existing entry in the reported
file instead of adding another. Use the built-in subagent `general`; it works
without defining a custom agent. The first model below is `general`'s start
model, and the second is its fallback:

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
            "general": {
              "chain": [
                { "model": "anthropic/claude-sonnet-5-5#high" },
                { "model": "openai/gpt-6.1-sol" }
              ]
            }
          }
        }
      }
    }
  ]
}
```

To use the example chain, ask the main agent to delegate a task to the built-in
`general` subagent, for example: `Use the general subagent to research this
question.` OpenCode starts it in a child session through the `subagent` tool.
The built-in `build` agent is a primary agent, not a subagent, so this plugin
does not switch its model.

Notes:

- For another subagent, use its exact configured name and include its actual
  starting model as the first chain step. Write model references as
  `provider/model`, optionally followed by `#variant`; the current model and
  variant must match the chain entry exactly. For `general`, the plugin sets
  its start model from the first chain step.
- The model IDs above are documented examples, not a promise that they are
  enabled for your account or project. Run `/models` in OpenCode and choose
  models available to you; use a variant only if it is listed for that model.
  See the official [Agents](https://opencode.ai/docs/agents) and
  [Models](https://opencode.ai/docs/models) documentation for agent names,
  model references, and variants.
- `cooldownMs` (at least 10000) is how long a failed model stays skipped;
  `maxCycles` (1–5, default 1) limits passes through the chain per child
  session. The first pass counts as 1, so the default does not wrap around.
- OpenCode merges `plugins` arrays from your config files instead of replacing
  them and reloads watched config changes automatically; run `/reload` if
  needed.
- If `opencode plugin add` already listed the package in your `plugins` array as
  a plain string, turn that entry into the object form above instead of adding a
  second one.

### Alternative: separate config file

Instead of the inline `config` object you can keep the configuration in a
separate file:

1. Create `model-fallback.v2.json` in OpenCode's config directory, starting from
   the neutral template below (also shipped as
   `deployment/model-fallback.v2.json` inside the installed package). If a file
   with this name already exists, edit it instead of overwriting it.
2. Point the plugin at the file by replacing the `config` object with
   `"configPath": "/absolute/path/to/model-fallback.v2.json"`. The path must be
   absolute; expand `~` yourself. When both are supplied, `config` takes
   precedence. With neither, the plugin uses the neutral empty config and
   switches nothing.

```json
{
  "version": 2,
  "cooldownMs": 300000,
  "maxCycles": 1,
  "agents": {}
}
```

See the [official OpenCode plugin guide](https://opencode.ai/docs/plugins) for
the `plugins` key, `opencode plugin add`, and config precedence.

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
