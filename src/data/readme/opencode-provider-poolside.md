<p align="center">
  <img src="https://raw.githubusercontent.com/grikomsn/opencode-provider-poolside/main/assets/cover.jpg" alt="Poolside and OpenCode" width="960">
</p>

<h1 align="center">OpenCode Provider for Poolside</h1>

<p align="center">
  Use hosted Poolside AI models (Laguna) directly from <a href="https://opencode.ai">OpenCode</a> with live model discovery and API key management.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-provider-poolside"><img src="https://img.shields.io/npm/v/opencode-provider-poolside?style=flat-square&logo=npm" alt="npm version"></a>
  <a href="https://github.com/grikomsn/opencode-provider-poolside/blob/main/LICENSE"><img src="https://img.shields.io/github/license/grikomsn/opencode-provider-poolside?style=flat-square" alt="MIT license"></a>
</p>

## Features

- **Live model discovery** — fetches the current model catalog from the Poolside API at startup, with sensible Laguna fallbacks when the API is unreachable.
- **OpenAI-compatible** — uses [`@ai-sdk/openai-compatible`](https://ai-sdk.dev/providers/open-source-providers/openai-compatible) under the hood, so streaming, tool calls, and JSON mode work out of the box.
- **API key management** — built-in auth hook for storing and loading your Poolside API key via OpenCode's `/connect` command.
- **Reasoning support** — Laguna M.1 and XS 2.1 expose `none`, `minimal`, `low`, `medium`, `high`, and `xhigh`; Laguna S 2.1 exposes its supported `none` and `xhigh` modes through OpenCode's variant picker.
- **Zero config** — add the plugin to your `opencode.json` and you're ready to go.

## Quick start

### 1. Install the plugin

Add the package to your OpenCode config. OpenCode installs it automatically:

```jsonc
// ~/.config/opencode/opencode.json  or  .opencode/opencode.json
{
  "plugin": ["opencode-provider-poolside"]
}
```

The legacy `opencode-provider-poolside/server` entry point remains supported.

### 2. Get a Poolside API key

Create a developer API key at [platform.poolside.ai](https://platform.poolside.ai) → API Keys → New key.

### 3. Connect your API key

In OpenCode, run:

```
/connect poolside
```

Follow the prompts to enter your API key. OpenCode stores it securely and the plugin loads it automatically.

Alternatively, set the environment variable:

```bash
export POOLSIDE_API_KEY="your-api-key"
```

### 4. Start using Poolside models

```bash
opencode -m poolside/laguna-m.1
```

Or set a default model in your config:

```jsonc
{
  "model": "poolside/laguna-m.1",
  "small_model": "poolside/laguna-xs-2.1"
}
```

## Available models

| Model | Context | Max output | Reasoning |
|---|---:|---:|---|
| `poolside/laguna-m.1` | 262,144 | 32,768 | `none`–`xhigh` |
| `poolside/laguna-xs-2.1` | 262,144 | 32,768 | `none`–`xhigh` |
| `poolside/laguna-s-2.1` | 1,048,576 | 131,072 | `none`, `xhigh` |

The static catalog uses these verified Poolside limits. Authenticated model discovery enriches the catalog with live capabilities, while preserving these limits when the Poolside `/models` response is incomplete or stale.

## Configuration

### Provider options

The plugin sets these defaults automatically, but you can override them in your config:

```jsonc
{
  "provider": {
    "poolside": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Poolside",
      "env": ["POOLSIDE_API_KEY"],
      "options": {
        "baseURL": "https://inference.poolside.ai/v1"
      }
    }
  }
}
```

### Custom base URL

If you use a Poolside deployment, set a custom base URL:

```jsonc
{
  "provider": {
    "poolside": {
      "options": {
        "baseURL": "https://your-deployment.example.com/openai/v1"
      }
    }
  }
}
```

### Environment variable

```bash
export POOLSIDE_API_KEY="your-api-key"
```

## How it works

1. **Config hook** — On startup, the plugin registers the `poolside` provider with `@ai-sdk/openai-compatible`, sets the base URL and environment variable, and populates the model catalog.
2. **Model discovery** — If `POOLSIDE_API_KEY` is available, the plugin fetches the live model list from `https://inference.poolside.ai/v1/models`. If the API is unreachable, it falls back to a static catalog of known Laguna models; verified limits remain in place if the endpoint reports stale values.
3. **Model aliases** — OpenCode exposes models as `poolside/laguna-*` while sending Poolside's required `poolside/laguna-*` upstream IDs without duplicating the provider prefix.
4. **Auth hook** — The plugin provides an API key auth method so you can manage your key with OpenCode's `/connect poolside` command.

## Related projects

- [Poolside for GitHub Copilot Chat](https://github.com/grikomsn/poolside-copilot-chat) — Use Poolside models directly in VS Code's Copilot Chat.
- [Pi Provider for Poolside](https://github.com/grikomsn/pi-provider-poolside) — Poolside provider for the Pi coding agent.

Unofficial project; not affiliated with Poolside, OpenCode, or Poolside AI. Poolside account limits and charges still apply. Licensed under [MIT](LICENSE).
