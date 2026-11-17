# @daika7ana/opencode-zenmux-plugin

[![npm version](https://img.shields.io/npm/v/@daika7ana/opencode-zenmux-plugin)](https://www.npmjs.com/package/@daika7ana/opencode-zenmux-plugin)
[![CI](https://github.com/daika7ana/opencode-zenmux-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/daika7ana/opencode-zenmux-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [OpenCode](https://opencode.ai) plugin that keeps the ZenMux model catalog up to date by fetching it live from `https://zenmux.ai/api/v1/models` and serving it to OpenCode's model catalog.

It also provides a non-duplicative way to force ZenMux provider routing via the `model:provider` syntax using a user-controlled routing table.

The instructions below target **OpenCode 2.x**. The same package also runs on OpenCode 1.18.x through a V1 entrypoint; those differences are called out inline and collected under [OpenCode 1.x](#opencode-1x).

## Prerequisites

- [OpenCode](https://opencode.ai) CLI installed and working
- A ZenMux API key (get one at https://zenmux.ai)

## Quick Start

1. **Install:**
   ```bash
   opencode plugin add @daika7ana/opencode-zenmux-plugin@latest
   ```
2. **Authenticate:**
   ```bash
   export ZENMUX_API_KEY="your-key"
   ```
   Or run `/connect zenmux` inside OpenCode to store the key in its auth system.
3. **Use it:** run `/models` and pick a `zenmux/...` entry. The catalog is fetched when the plugin loads and cached on disk for `catalogCacheTTL` (60 minutes by default). On a first run there is no cache yet, so the model list fills in a few seconds after startup.

## Features

- **Live model refresh** — fetches the public ZenMux catalog when the plugin loads and refreshes it every `catalogCacheTTL` minutes. OpenCode 2.x has no manual refresh command; on 1.x, `opencode models --refresh` forces a refetch.
- **Provider routing** — rewrite the request model ID to `modelId:providerSlug` for any model without cluttering the model list.
- **Anthropic Messages API** — route specific models through ZenMux's Anthropic endpoint for extended features (extended thinking, prompt caching, etc.).
- **Auth hook** — adds `/connect zenmux` for storing an API key in OpenCode's auth system.
- **JSONC support** — both the plugin config file and routing files can include comments.
- **Configurable** — override base URL, Anthropic base URL, models URL, output token limit, non-chat filtering, and more.

## Installation

### From npm

This plugin is meant to be installed **globally**, not per-project. Use the `@latest` tag so OpenCode always resolves the newest published version:

```bash
opencode plugin add @daika7ana/opencode-zenmux-plugin@latest
```

> The command above uses the OpenCode 2.x CLI syntax. On 1.x, use `opencode plugin --global @daika7ana/opencode-zenmux-plugin@latest`.

This adds the plugin to your global OpenCode config (`~/.config/opencode/opencode.json`) and installs it into the OpenCode plugin cache.

The plugin fetches the ZenMux catalog when OpenCode loads it, so there is no manual refresh step on OpenCode 2.x.

#### Force an update

Update the installed package:

```bash
opencode plugin update @daika7ana/opencode-zenmux-plugin
```

If a stale cache still prevents the update from being applied, delete the cached package and reinstall:

```bash
rm -rf ~/.cache/opencode/packages/@daika7ana/opencode-zenmux-plugin@latest
opencode plugin add @daika7ana/opencode-zenmux-plugin@latest
```

**Next:** [Configure authentication](#authentication) and optionally set up [provider routing](#provider-routing).

### From source

<details>
<summary>Build and install from source</summary>

Build the plugin locally:

```bash
pnpm install
pnpm build
```

Then add the plugin directory to your global OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugins": ["/path/to/opencode-zenmux-plugin"]
}
```

> OpenCode 2.x requires local plugin paths to name a directory. On 1.x, use the singular key with the built file: `"plugin": ["file:///path/to/opencode-zenmux-plugin/dist/index.js"]`.

The catalog is fetched when the plugin loads; no refresh command is needed.

**Next:** [Configure authentication](#authentication) and optionally set up [provider routing](#provider-routing).

</details>

### OpenCode 1.x

OpenCode 1.18.x reads the singular `plugin` key and calls the plugin's `server()` entrypoint instead of `setup()`. The V1 CLI installs and updates with the flags form:

```bash
opencode plugin --global @daika7ana/opencode-zenmux-plugin@latest
opencode plugin --global --force @daika7ana/opencode-zenmux-plugin@latest
```

Declare it with a tuple to pass options:

```json
{
  "plugin": [["@daika7ana/opencode-zenmux-plugin", { "baseURL": "https://zenmux.ai/api/v1" }]]
}
```

On 1.x the catalog is fetched when models are listed, and `opencode models --refresh` bypasses the disk cache and refetches. There is no background refresh interval on 1.x; the provider and models are registered through the `config` and `provider.models` hooks rather than a transform.

## Configuration

The plugin uses two types of files:

- **`zenmux-plugin.json`** — plugin settings (base URL, token limits, etc.) with an optional inline `routing` field.
- **`zenmux-providers.json`** — standalone routing table only (no settings). See [Provider routing](#provider-routing).

### Config file

Create a `zenmux-plugin.json` file in your project root, `.opencode/`, or `~/.config/opencode/`. Both `.json` and `.jsonc` (JSON with comments) extensions are accepted; within each directory `.jsonc` is checked first, then the plugin moves to the next directory:

1. `{projectRoot}/zenmux-plugin.json`
2. `{projectRoot}/.opencode/zenmux-plugin.json`
3. `~/.config/opencode/zenmux-plugin.json`

Example:

```jsonc
{
  // Base URL for actual ZenMux API calls
  "baseURL": "https://zenmux.ai/api/v1",

  // URL to fetch the public model catalog
  "modelsURL": "https://zenmux.ai/api/v1/models",

  // Optional: explicit path to a routing file
  "routingFile": null,

  // Fallback output token limit when the catalog has no max_completion_tokens
  "defaultOutputTokens": 16384,

  // Hide models that cannot produce text
  "excludeNonChat": true,

  // Minutes to cache the ZenMux catalog on disk (0 disables)
  "catalogCacheTTL": 60,

  // Price to use when ZenMux returns several prices for one threshold:
  // "lowest" (matches models.dev) or "highest" (list/peak price)
  "pricingTieBreak": "lowest",

  // Include :providerSlug in the model id itself
  "routedModelIds": false,

  // Model ids (substring match) that must pass reasoning_content back to the API.
  // The plugin also auto-detects additional models from OpenCode's cached models.dev catalog.
  "reasoningContentModels": ["deepseek", "glm", "minimax", "kimi", "mimo"],

  // Inline routing table (same format as a routing file)
  "routing": [{ "model": "z-ai/glm-5.2", "provider": "streamlake" }],
}
```

### Plugin options in `opencode.json`

You can also pass options in the `plugins` entry in `opencode.json`. Those override the config file:

```json
{
  "plugins": [
    {
      "package": "@daika7ana/opencode-zenmux-plugin",
      "options": { "baseURL": "https://zenmux.ai/api/v1" }
    }
  ]
}
```

On OpenCode 1.x, pass the same options object as the second item of the `plugin` tuple instead.

### Configuration options

All options can be set in `zenmux-plugin.json` (or `zenmux-plugin.jsonc`). All options except `routing` can also be passed in the `plugins` entry's `options` in `opencode.json`. The `routing` option can only be set in the config file because it belongs in a dedicated routing table. Options in `opencode.json` override the config file.

| Option                   | Type                    | Default                                             | Description                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseURL`                | `string`                | `https://zenmux.ai/api/v1`                          | Base URL for actual ZenMux API calls.                                                                                                                                                                                                                                                                                                                                                                                 |
| `anthropicBaseURL`       | `string`                | `https://zenmux.ai/api/anthropic/v1`                | Base URL for Anthropic Messages API calls (used when a routing entry has `sdk: "anthropic"`).                                                                                                                                                                                                                                                                                                                         |
| `modelsURL`              | `string`                | `https://zenmux.ai/api/v1/models`                   | URL to fetch the public model catalog.                                                                                                                                                                                                                                                                                                                                                                                |
| `frontendURL`            | `string`                | `https://zenmux.ai/api/frontend/model/listByFilter` | URL for the ZenMux frontend catalog used to enrich output limits and capabilities.                                                                                                                                                                                                                                                                                                                                    |
| `routingFile`            | `string \| null`        | `null`                                              | Explicit path to the routing file; overrides the default search order.                                                                                                                                                                                                                                                                                                                                                |
| `routing`                | `array`                 | —                                                   | In-file routing table. See [Provider routing](#provider-routing).                                                                                                                                                                                                                                                                                                                                                     |
| `defaultOutputTokens`    | `number`                | `16384`                                             | Fallback `limit.output` when the catalog has no `max_completion_tokens`.                                                                                                                                                                                                                                                                                                                                              |
| `excludeNonChat`         | `boolean`               | `true`                                              | Drop models that cannot serve chat completions: entries whose `suitable_api` omits `chat.completions`, or — when frontend data is absent — whose output modalities omit `text`.                                                                                                                                                                                                                                       |
| `catalogCacheTTL`        | `number`                | `60`                                                | Minutes to cache the ZenMux catalog (models + frontend enrichment) on disk so startups skip the network calls, and the interval between background refreshes on 2.x. `0` disables the cache and the refresh interval (2.x still fetches once per session). To force a refetch on 2.x, delete `$XDG_CACHE_HOME/opencode/zenmux-models-*.json` (default `~/.cache/opencode/`); on 1.x, run `opencode models --refresh`. |
| `pricingTieBreak`        | `"lowest" \| "highest"` | `"lowest"`                                          | Which price to use when ZenMux returns several prices for the same token threshold (time-of-day, cache-type or output-length variants OpenCode cannot represent). `"lowest"` matches the models.dev catalog; `"highest"` reports the most conservative (list/peak) price.                                                                                                                                             |
| `routedModelIds`         | `boolean`               | `false`                                             | Put the provider suffix into the model `id` itself (see [below](#routed-model-ids)).                                                                                                                                                                                                                                                                                                                                  |
| `reasoningContentModels` | `array`                 | `["deepseek", "glm", "minimax", "kimi", "mimo"]`    | Model ids (substring match) that return `reasoning_content` and must pass it back on later turns; enables OpenCode's `interleaved` capability on 1.x and `compatibility.reasoningField` on 2.x. Not applied to models routed with `sdk: "anthropic"`. The plugin also unions in models that OpenCode's cached models.dev catalog marks as needing `reasoning_content` passthrough.                                    |

### Option precedence

Options are merged in this order (later wins):

1. Plugin defaults
2. `zenmux-plugin.json` / `zenmux-plugin.jsonc`
3. `options` in the `plugins` entry in `opencode.json` (the `plugin` tuple on 1.x), which does not include `routing`

That means options in `opencode.json` always override the config file, and the config file overrides the built-in defaults. The `routing` field can only be set in the config file.

## Authentication

The plugin registers ZenMux as a provider that accepts an API key. You can authenticate in two ways:

### Environment variable

```bash
export ZENMUX_API_KEY="your-key"
```

### OpenCode auth system

Run inside OpenCode:

```text
/connect zenmux
```

Then enter your API key. It will be stored in OpenCode's auth system and used automatically.

## Provider routing

ZenMux supports forced routing by sending `modelId:providerSlug` as the model id. The plugin applies this via a routing table, which can live in `zenmux-plugin.json` under the `routing` field or in a separate routing file. You do not need both.

When a routing entry exists with a `provider`, the plugin sets the ID sent to ZenMux to `"modelId:providerSlug"` (`modelID` on 2.x, `api.id` on 1.x) for that model. If `provider` is omitted (for example when only swapping the SDK), the sent ID is left as the plain model id. The OpenCode model list still shows the model once.

### Routing precedence

If multiple routing sources are present, they are checked in this order and the first match wins:

1. **`routingFile`** in plugin options — explicit path to a routing file.
2. **`routing` field** in `zenmux-plugin.json` / `zenmux-plugin.jsonc`.
3. **Default routing file search** (see below).

If `routingFile` is set but the file does not exist, routing is disabled for that load; the plugin does **not** fall back to the inline `routing` field or the default file search.

### Routing file names

If you prefer to keep routing in its own file, the plugin looks for the first existing file in this order. Both `.json` and `.jsonc` (JSON with comments) extensions are accepted; `.jsonc` takes precedence when both exist in the same directory.

1. `{projectRoot}/zenmux-providers.json`
2. `{projectRoot}/zenmux-routing.json`
3. `{projectRoot}/.opencode/zenmux-providers.json`
4. `{projectRoot}/.opencode/zenmux-routing.json`
5. `~/.config/opencode/zenmux-providers.json`
6. `~/.config/opencode/zenmux-routing.json`

Use `routingFile` in plugin options to override this search and point to a custom file.

### Format

```jsonc
[
  // Route Claude through Amazon Bedrock (OpenAI-compatible)
  { "model": "anthropic/claude-sonnet-5", "provider": "amazon-bedrock" },

  // Route GLM through StreamLake (OpenAI-compatible)
  { "model": "z-ai/glm-5.2", "provider": "streamlake" },

  // Route MiniMax M3 through ZenMux's Anthropic Messages API endpoint
  { "model": "minimax/minimax-m3", "provider": "minimax", "sdk": "anthropic" },

  // Route Claude through ZenMux's Anthropic endpoint without forcing a specific provider
  { "model": "anthropic/claude-sonnet-5", "sdk": "anthropic" },
]
```

Both `provider` and `sdk` are optional. When `provider` is omitted, the model id is not rewritten and only the SDK swap is applied (useful when you want the Anthropic Messages API format without forcing a specific upstream provider).

#### Anthropic Messages API routing

Some models expose additional features through the Anthropic Messages API format (extended thinking, prompt caching, etc.). Set `"sdk": "anthropic"` on a routing entry to route that model through ZenMux's Anthropic endpoint instead of the default OpenAI-compatible endpoint.

When `sdk` is `"anthropic"`:

- The model uses `@opencode/ai/providers/anthropic` instead of `@opencode/ai/providers/openai-compatible` (on 1.x: `@ai-sdk/anthropic` instead of `@ai-sdk/openai-compatible`)
- Requests go to `anthropicBaseURL` (default: `https://zenmux.ai/api/anthropic/v1`) instead of `baseURL`; on 2.x this is applied per model through `settings.baseURL`
- Auth uses the same `ZENMUX_API_KEY` (sent as `x-api-key` header)

The `sdk` and `provider` fields are both optional. `sdk` defaults to `"openai"`; existing routing files without `sdk` continue to work unchanged. When `provider` is omitted alongside an SDK swap, the model id is left as-is and only the SDK + base URL change.

### Routed model ids

By default, routing only affects the ID sent to ZenMux, not the catalog ID you select in OpenCode. Some tools (e.g., oh-my-opencode-slim) resolve models from their own JSON config and use the raw catalog `id`, so they cannot address a routed variant.

Set `routedModelIds: true` in `zenmux-plugin.json` to include the provider suffix in the model `id` itself:

```jsonc
{
  "routedModelIds": true,
  "routing": [{ "model": "z-ai/glm-5.2", "provider": "streamlake" }],
}
```

With this enabled, a routed model appears in OpenCode as `z-ai/glm-5.2:streamlake`. Your oh-my-opencode-slim config would then use:

```json
{ "orchestrator": { "model": "zenmux/z-ai/glm-5.2:streamlake" } }
```

## Development

```bash
# Install dependencies
pnpm install

# Type-check
pnpm typecheck

# Run tests
pnpm test

# Build
pnpm build

# Lint
pnpm lint

# Auto-fix lint issues
pnpm lint:fix

# Format
pnpm format

# Check formatting
pnpm format:check
```

## How it works

The plugin default-exports `{ id, setup, server }`. OpenCode 2.x calls `setup(ctx)`, which:

1. Registers the `zenmux` provider and its models through `ctx.provider.transform`, using `@opencode/ai/providers/openai-compatible` and the configured `baseURL`. Models routed with `sdk: "anthropic"` get `@opencode/ai/providers/anthropic` plus a per-model `settings.baseURL`; models that need `reasoning_content` passthrough set `compatibility.reasoningField`.
2. Registers the API key through `ctx.integration.transform` as both an `env` method (`ZENMUX_API_KEY`) and a stored-key method (`/connect zenmux`).
3. Seeds the catalog from the on-disk cache and registers it **before the first `await`** — a Location's first catalog read returns only what is registered at that moment, so the config, routing, cache and models.dev reads are synchronous. It then fetches the live catalog in the background, replays the transform via `provider.reload()`, and repeats on the `catalogCacheTTL` interval. The cleanup returned from `setup()` stops the timer when the plugin unloads. With no cache yet (fresh install), the provider starts with an empty model list and models appear once the first background fetch finishes.

OpenCode 1.18.x calls `server()` instead, which registers the same provider and models through three hooks: `config` (provider with `@ai-sdk/openai-compatible` and `baseURL`), `auth` (API key for `/connect zenmux`), and `provider.models` (live catalog plus routing, with `@ai-sdk/anthropic` and `anthropicBaseURL` for `sdk: "anthropic"`).

The public models endpoint does not require authentication. The API key is only used by the actual provider for chat/completion requests.

## License

MIT
