# opencode-wlb-quota

[English](README.md) | [简体中文](README.zh-CN.md)

An OpenCode TUI plugin that displays WLB daily and weekly quota usage in the
footer. It refreshes every five minutes and provides a detail view with daily,
total, and per-model usage.

## Requirements

- OpenCode 1.18.5 or newer
- A configured OpenCode provider named `wlb`

## Install

Add the npm package to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-wlb-quota"]
}
```

Restart OpenCode after changing the configuration.

## Provider configuration

The plugin reads `baseURL` and `apiKey` from the `wlb` provider and queries
`GET {baseURL}/usage` for quota data. Keep your API key in your own OpenCode
configuration; it is never bundled with this plugin.

### Minimal configuration

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "YOUR_WLB_API_KEY"
      }
    }
  }
}
```

### Recommended: reference the key via an environment variable

Instead of hard-coding the key, set it in your environment and reference it
with the `{env:...}` syntax:

```sh
export WLB_API_KEY="YOUR_WLB_API_KEY"
```

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "{env:WLB_API_KEY}"
      }
    }
  }
}
```

### Full configuration with models

The `models` section declares the Codex models served by WLB, their context
limits, and selectable variants so you can switch reasoning effort and output
verbosity from the model picker. `gpt-5.6-terra` and `gpt-5.6-luna` share the
same `variants` block as `gpt-5.6-sol` — copy it over (or keep only the
presets you actually use).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "https://codex.wlbclub.com/v1",
        "apiKey": "{env:WLB_API_KEY}"
      },
      "models": {
        "gpt-5.6-sol": {
          "name": "GPT-5.6 Sol",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            "none": { "reasoningEffort": "none" },
            "low": { "reasoningEffort": "low" },
            "medium": { "reasoningEffort": "medium" },
            "high": { "reasoningEffort": "high" },
            "xhigh": { "reasoningEffort": "xhigh" },
            "max": { "reasoningEffort": "max" },
            "low-verbosity": { "textVerbosity": "low" },
            "medium-verbosity": { "textVerbosity": "medium" },
            "high-verbosity": { "textVerbosity": "high" },
            "none-low": { "reasoningEffort": "none", "textVerbosity": "low" },
            "none-medium": { "reasoningEffort": "none", "textVerbosity": "medium" },
            "none-high": { "reasoningEffort": "none", "textVerbosity": "high" },
            "low-low": { "reasoningEffort": "low", "textVerbosity": "low" },
            "low-medium": { "reasoningEffort": "low", "textVerbosity": "medium" },
            "low-high": { "reasoningEffort": "low", "textVerbosity": "high" },
            "medium-low": { "reasoningEffort": "medium", "textVerbosity": "low" },
            "medium-medium": { "reasoningEffort": "medium", "textVerbosity": "medium" },
            "medium-high": { "reasoningEffort": "medium", "textVerbosity": "high" },
            "high-low": { "reasoningEffort": "high", "textVerbosity": "low" },
            "high-medium": { "reasoningEffort": "high", "textVerbosity": "medium" },
            "high-high": { "reasoningEffort": "high", "textVerbosity": "high" },
            "xhigh-low": { "reasoningEffort": "xhigh", "textVerbosity": "low" },
            "xhigh-medium": { "reasoningEffort": "xhigh", "textVerbosity": "medium" },
            "xhigh-high": { "reasoningEffort": "xhigh", "textVerbosity": "high" },
            "max-low": { "reasoningEffort": "max", "textVerbosity": "low" },
            "max-medium": { "reasoningEffort": "max", "textVerbosity": "medium" },
            "max-high": { "reasoningEffort": "max", "textVerbosity": "high" }
          }
        },
        "gpt-5.6-terra": {
          "name": "GPT-5.6 Terra",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            // Same variants block as gpt-5.6-sol above
          }
        },
        "gpt-5.6-luna": {
          "name": "GPT-5.6 Luna",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            // Same variants block as gpt-5.6-sol above
          }
        },
        "gpt-5.5": {
          "name": "GPT-5.5",
          "reasoning": true,
          "limit": {
            "context": 272000,
            "input": 258400,
            "output": 128000
          },
          "variants": {
            "low": { "reasoningEffort": "low" },
            "medium": { "reasoningEffort": "medium" },
            "high": { "reasoningEffort": "high" },
            "low-verbosity": { "textVerbosity": "low" },
            "medium-verbosity": { "textVerbosity": "medium" },
            "high-verbosity": { "textVerbosity": "high" }
          }
        }
      }
    }
  },
  "model": "wlb/gpt-5.6-sol"
}
```

### Field reference

| Field | Description |
| --- | --- |
| `options.baseURL` | Base URL of the WLB gateway, ending in `/v1`. The plugin queries `GET {baseURL}/usage` for quota. |
| `options.apiKey` | Your WLB API key. Hard-code it or reference an environment variable with `{env:NAME}`. |
| `models.<id>.name` | Display name shown in the model picker. |
| `models.<id>.reasoning` | Whether the model supports reasoning. |
| `models.<id>.limit` | Token limits: `context` (window), `input`, `output`. |
| `models.<id>.variants` | Selectable presets: `reasoningEffort` (`none`/`low`/`medium`/`high`/`xhigh`/`max`) and `textVerbosity` (`low`/`medium`/`high`), alone or combined. |
| `model` | Default model, e.g. `wlb/gpt-5.6-sol`. |

The plugin itself only needs `options.baseURL` and `options.apiKey` — the rest
is regular OpenCode provider configuration so the models can be used.

## Usage

- The footer refreshes automatically every five minutes.
- Run `/quota` to refresh manually and open the detail view.
- Click the underlined `WLB` label to open the latest cached detail view.
- If a refresh fails, the last successful data remains visible with a stale-data warning.

## Development

```sh
npm install
npm run typecheck
npm pack --dry-run
```

For local testing, reference the source file from `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./extensions/opencode-wlb-quota/src/tui.tsx"]
}
```

## License

MIT
