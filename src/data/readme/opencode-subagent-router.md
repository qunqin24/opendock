# opencode-subagent-router

Dynamic sub-agent model router for [OpenCode](https://opencode.ai) — cost-optimized model selection with escalation and quality guardrails.

## Provider Support

| Provider | Cost tracking | Default rules | Notes |
|---|---|---|---|
| **DeepSeek** | Built-in | Built-in | Full support |
| OpenAI | Config-based | Manual | Add via `providers` config |
| Anthropic | Config-based | Manual | Add via `providers` config |
| Google | Config-based | Manual | Add via `providers` config |
| Others | Config-based | Manual | Add via `providers` config |

> **Roadmap**: [#1](https://github.com/ashutoshsinghpr7/opencode-subagent-router/issues/1) Add built-in cost data + default rules for OpenAI, Anthropic, Google. PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Features

- **Dynamic routing**: `chat.message` hook intercepts sub-agent invocations and overrides the model based on task type
- **Cost-optimized**: Routes cheap tasks (explore, title, summary, compaction) to cheap models and complex tasks (general, build, plan) to powerful models
- **Provider-agnostic**: Works with any provider supporting multiple models via single API key. Built-in rules for DeepSeek; config-based rules for everything else.
- **Smart escalation**: If a cheap model receives a complex task, auto-promotes to the powerful model with cooldown
- **Quality guardrails**: Tracks when cheap models get re-tasked (signal of inadequate output) and auto-reverts to flagship
- **Session summaries**: Reports cost saved at session end via toast
- **TUI sidebar**: Live cost savings visible in the right-side panel
- **`/route-stats` command**: Show routing stats on demand

## Install

```bash
npm install opencode-subagent-router
```

### Configure

In `.opencode/opencode.json`:
```json
{
  "plugin": ["opencode-subagent-router"]
}
```

In `.opencode/tui.json`:
```json
{
  "plugin": ["opencode-subagent-router"]
}
```

## Configuration

Add a `model-router` section to `opencode.json`:

```json
{
  "model-router": {
    "rules": [
      {
        "agents": ["explore", "title", "summary", "compaction"],
        "model": "deepseek-v4-flash",
        "provider": "deepseek",
        "label": "Cheap with reasoning"
      },
      {
        "agents": ["general", "build", "plan"],
        "model": "deepseek-v4-pro",
        "provider": "deepseek",
        "label": "Flagship for code"
      }
    ],
    "defaultModel": "deepseek-v4-flash",
    "escalation": {
      "enabled": true,
      "threshold": 2,
      "cooldownMs": 300000
    },
    "guardrails": {
      "enabled": true,
      "maxRetries": 2,
      "retryWindowMs": 600000
    }
  }
}
```

### Adding a new provider

Add model costs via the `providers` field. The router uses this data to calculate per-session savings:

```json
{
  "model-router": {
    "rules": [
      {
        "agents": ["explore", "title", "summary", "compaction"],
        "model": "gpt-4o-mini",
        "provider": "openai",
        "label": "Cheap for simple tasks"
      },
      {
        "agents": ["general", "build", "plan"],
        "model": "gpt-4o",
        "provider": "openai",
        "label": "Powerful for code"
      }
    ],
    "defaultModel": "gpt-4o-mini",
    "providers": {
      "openai": {
        "gpt-4o-mini": {
          "cost": { "input": 0.15, "output": 0.60 },
          "reasoning": false,
          "context": 128000
        },
        "gpt-4o": {
          "cost": { "input": 2.50, "output": 10.00 },
          "reasoning": true,
          "context": 128000
        }
      }
    }
  }
}
```

## Architecture

```
chat.message hook
  └─ scan output.parts for SubtaskPart
       ├─ No subtask → pass through
       ├─ Subtask found → lookup agent in rules
       │    ├─ Match found → override part.model
       │    └─ No match → use defaultModel
       └─ Track decision + cost saved
```

## License

MIT
