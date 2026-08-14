# opencode-routed-model

> **⚠️ This plugin is currently non-functional.**
> It depends on an OpenCode API that is not yet available. Track progress at [opencode issue #26091](https://github.com/anomalyco/opencode/issues/26091). Once that issue is resolved this plugin will work as described below.

An [OpenCode](https://opencode.ai) plugin that displays which model was selected by a [LiteLLM](https://docs.litellm.ai) auto router when using dynamic model routing (complexity router, semantic router, etc.).

## The Problem

When using a LiteLLM auto router (such as the **complexity router**), requests are dynamically routed to different models based on the input. For example, a simple question might be sent to a cheap model like `gpt-4o-mini`, while a complex coding task is routed to `claude-sonnet-4`. OpenCode only sees the router alias (e.g. `my-auto-router`) and has no visibility into which underlying model actually served the request.

This plugin surfaces that information directly in the OpenCode TUI as a toast notification after each response.

## How It Works

1. When you send a message through OpenCode, the request goes to the LiteLLM proxy with your router's `model_name` alias.
2. The LiteLLM complexity router scores the request across multiple dimensions (token count, code presence, reasoning markers, technical terms, etc.) and selects the appropriate tier model.
3. LiteLLM makes the actual LLM call and returns the response. The response includes the **actual model** that served the request in the `model` field.
4. This plugin listens for assistant message events in OpenCode and displays the model name from the response as a toast notification.

## Prerequisites

- [OpenCode](https://opencode.ai) installed and configured
- A [LiteLLM proxy](https://docs.litellm.ai/docs/simple_proxy) running with an auto router configured
- OpenCode connected to the LiteLLM proxy as a custom provider

### LiteLLM Complexity Router Setup

If you haven't set up the complexity router yet, here's a quick overview. Add this to your LiteLLM `config.yaml`:

```yaml
model_list:
  # Target models for each tier
  - model_name: gpt-4o-mini
    litellm_params:
      model: gpt-4o-mini

  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o

  - model_name: claude-sonnet
    litellm_params:
      model: claude-sonnet-4-20250514

  - model_name: o1-preview
    litellm_params:
      model: o1-preview

  # Complexity router
  - model_name: smart-router
    litellm_params:
      model: auto_router/complexity_router
      complexity_router_config:
        tiers:
          SIMPLE: gpt-4o-mini
          MEDIUM: gpt-4o
          COMPLEX: claude-sonnet
          REASONING: o1-preview
      complexity_router_default_model: gpt-4o
```

See the [LiteLLM auto routing docs](https://docs.litellm.ai/docs/proxy/auto_routing#complexity-router) for full details.

### OpenCode Provider Configuration

Connect OpenCode to your LiteLLM proxy as a custom provider in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "litellm": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "LiteLLM Proxy",
      "options": {
        "baseURL": "http://localhost:4000/v1",
        "apiKey": "your-litellm-api-key"
      },
      "models": {
        "smart-router": {
          "name": "Smart Router (Auto)"
        }
      }
    }
  }
}
```

**Important:** The model ID in OpenCode (`smart-router` above) must match the `model_name` you configured in LiteLLM, **not** the raw `auto_router/complexity_router` value.

## Installation

The package is published on npm: [opencode-routed-model](https://www.npmjs.com/package/opencode-routed-model)

You do **not** need to run `npm install` manually. OpenCode automatically installs npm plugins using Bun at startup, cached globally in `~/.cache/opencode/node_modules/`.

There are two ways to install this plugin.

### Option 1: npm plugin (recommended)

Add the plugin to your config file. To apply it to **all projects**, add it to your global config:

**Global (all projects) — `~/.config/opencode/opencode.json`:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-routed-model"]
}
```

To apply it to a **single project only**, add it to the `opencode.json` in your project folder instead.

### Option 2: Local file

Copy the plugin file directly into your OpenCode plugins directory.

**Per project:**

```bash
mkdir -p .opencode/plugins
curl -o .opencode/plugins/show-routed-model.ts \
  https://raw.githubusercontent.com/jtbnz/opencode-routed-model/main/src/index.ts
```

**Global (all projects):**

```bash
mkdir -p ~/.config/opencode/plugins
curl -o ~/.config/opencode/plugins/show-routed-model.ts \
  https://raw.githubusercontent.com/jtbnz/opencode-routed-model/main/src/index.ts
```

## Usage

Once installed, restart OpenCode. The plugin activates automatically -- no configuration needed.

After each assistant response, you will see a toast notification in the bottom of the TUI showing which model was used:

```
Model used: gpt-4o-mini
```

or

```
Model used: claude-sonnet-4-20250514
```

This tells you exactly which model the LiteLLM complexity router chose for that particular request.

## How the Complexity Router Selects Models

The LiteLLM complexity router scores each request across seven dimensions:

| Dimension | What It Detects | Effect |
|---|---|---|
| Token Count | Short or long prompts | Short = simpler, long = more complex |
| Code Presence | Keywords like `function`, `class`, `api` | Increases complexity |
| Reasoning Markers | Phrases like "step by step", "think through" | Triggers REASONING tier |
| Technical Terms | Words like `architecture`, `distributed` | Increases complexity |
| Simple Indicators | Phrases like "what is", "define", "hello" | Decreases complexity |
| Multi-Step Patterns | Patterns like "first...then", numbered steps | Increases complexity |
| Question Complexity | Multiple question marks | Increases complexity |

The weighted score maps to a tier: **SIMPLE**, **MEDIUM**, **COMPLEX**, or **REASONING**. Each tier routes to a different model.

**Special rule:** If 2 or more reasoning markers are detected, the request automatically routes to the REASONING tier regardless of the overall score.

## Tier Model Requirements

All models referenced in the `tiers` config must:

1. Exist as separate `model_name` entries in your LiteLLM proxy's model list.
2. Support **tool/function calling** if you are using OpenCode (OpenCode relies on tools for file operations, search, etc.). Models without tool support will fail on simple tasks.

## Troubleshooting

### Toast shows the router alias instead of the actual model

If you see the alias (e.g. `smart-router`) instead of the actual model name (e.g. `gpt-4o-mini`), the AI SDK may not be passing through the response model field. In this case, the actual model can be found:

- In the LiteLLM dashboard under **Logs**
- In the `x-litellm-model-id` response header
- By enabling verbose logging: set `LITELLM_LOG=DEBUG` on your proxy

### No toast appears

- Ensure the plugin file is in the correct directory (`.opencode/plugins/` or `~/.config/opencode/plugins/`)
- Restart OpenCode after adding the plugin
- Check that the file exports the plugin correctly

### "Unmapped LLM provider" error

You are likely sending the raw model name (`auto_router/complexity_router`) instead of the model alias (`smart-router`). Update your OpenCode model config to use the `model_name` from your LiteLLM proxy.

### Simple queries fail to use tools

Your SIMPLE tier model may not support function/tool calling. Replace it with a model that does (e.g. `gpt-4o-mini`, `claude-haiku`, `gemini-flash`).

## Cost Tracking

Because the complexity router dynamically selects different models with different costs, OpenCode cannot accurately track per-request costs. For cost visibility:

- Use the **LiteLLM dashboard** spend tracking, which knows the actual model per request.
- The `x-litellm-response-cost` response header contains the cost for each request.
- Query the `/spend/logs` API for detailed breakdowns by team, key, or model.

## Publishing to npm

This package is published at [npmjs.com/package/opencode-routed-model](https://www.npmjs.com/package/opencode-routed-model).

To publish an update:

1. Make your changes in `src/index.ts`
2. Bump the version in `package.json` (follow [semver](https://semver.org): patch for bug fixes, minor for new features)
3. Run:

```bash
npm publish
```

The `prepublishOnly` script automatically compiles TypeScript to `dist/` before publishing. You do not need to run the build step manually.

You must be logged in to npm (`npm login`) and have publish access to the package.

## License

MIT
