# @daika7ana/opencode-zenmux-plugin

[![npm version](https://img.shields.io/npm/v/@daika7ana/opencode-zenmux-plugin)](https://www.npmjs.com/package/@daika7ana/opencode-zenmux-plugin)
[![CI](https://github.com/daika7ana/opencode-zenmux-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/daika7ana/opencode-zenmux-plugin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [OpenCode](https://opencode.ai) plugin that keeps the ZenMux model catalog up to date by fetching it live from `https://zenmux.ai/api/v1/models` on every `opencode models --refresh`.

It also provides a non-duplicative way to force ZenMux provider routing via the `model:provider` syntax using a user-controlled routing table.

## Prerequisites

- [OpenCode](https://opencode.ai) CLI installed and working
- A ZenMux API key (get one at https://zenmux.ai)

## Quick Start

1. **Install:**
   ```bash
   opencode plugin --global @daika7ana/opencode-zenmux-plugin@latest
   ```
2. **Authenticate:**
   ```bash
   export ZENMUX_API_KEY="your-key"
   ```
   Or run `/connect zenmux` inside OpenCode to store the key in its auth system.
3. **Refresh:**
   ```bash
   opencode models --refresh
   ```

## Features

- **Live model refresh** — fetches the public ZenMux catalog on startup and on `opencode models --refresh`.
- **Provider routing** — rewrite `api.id` to `modelId:providerSlug` for any model without cluttering the model list.
- **Anthropic Messages API** — route specific models through ZenMux's Anthropic endpoint for extended features (extended thinking, prompt caching, etc.).
- **Auth hook** — adds `/connect zenmux` for storing an API key in OpenCode's auth system.
- **JSONC support** — both the plugin config file and routing files can include comments.
- **Configurable** — override base URL, Anthropic base URL, models URL, output token limit, non-chat filtering, and more.

## Installation

### From npm

This plugin is meant to be installed **globally**, not per-project. Use the `--global` flag and the `@latest` tag so OpenCode always resolves the newest published version:

```bash
opencode plugin --global @daika7ana/opencode-zenmux-plugin@latest
```

> The command above uses the current OpenCode CLI syntax. If your version of OpenCode uses a different plugin command, adjust accordingly.

This adds the plugin to your global OpenCode config (`~/.config/opencode/opencode.json`) and installs it into the OpenCode plugin cache.

After installing, refresh the model catalog so OpenCode picks up the ZenMux models:

```bash
opencode models --refresh
```

#### Force an update

Use the `--force` flag to replace the existing cached version:

```bash
opencode plugin --global --force @daika7ana/opencode-zenmux-plugin@latest
```

If a stale cache still prevents the update from being applied, delete the cached package and reinstall:

```bash
rm -rf ~/.cache/opencode/packages/@daika7ana/opencode-zenmux-plugin@latest
opencode plugin --global @daika7ana/opencode-zenmux-plugin@latest
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

Then add it to your global OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["file:///path/to/opencode-zenmux-plugin/dist/index.js"]
}
```

After installing from source, refresh the model catalog so OpenCode picks up the ZenMux models:

```bash
opencode models --refresh
```

**Next:** [Configure authentication](#authentication) and optionally set up [provider routing](#provider-routing).

</details>

### OpenCode V2

The plugin is a **dual V1/V2 plugin**: its default export is `{ id, setup, server }`. OpenCode 1.18.x calls `server()`; OpenCode 2.x calls `setup()`. One install covers both — no separate package.

Under V2, declare the plugin with the plural `plugins` key and an object entry rather than the V1 tuple:

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

Options behave exactly as in the V1 tuple form. V2 registers the provider and models through the provider/model plugin API — including per-model `package` and `settings.baseURL` so models routed with `sdk: "anthropic"` keep using `anthropicBaseURL` — and registers the API key as both an `env` method (`ZENMUX_API_KEY`) and a stored-key method.

> **Status:** V2 plugins are supported by the `@opencode/cli` 2.x line (the binary it installs is named `opencode2`, e.g. `2.0.12`), which reads the plural `plugins` key and calls `setup()`. The V1 line (`opencode-ai`, up to `1.18.31`) reads only the singular `plugin` key — its config schema has no `plugins` entry, so it silently ignores one. Both entrypoints are implemented, and each CLI picks the matching one.

## Configuration

The plugin uses two types of files:

- **`zenmux-plugin.json`** — plugin settings (base URL, token limits, etc.) with an optional inline `routing` field.
- **`zenmux-providers.json`** — standalone routing table only (no settings). See [Provider routing](#provider-routing).

### Config file

Create a `zenmux-plugin.json` file in your project root, `.opencode/`, or `~/.config/opencode/`. Both `.json` and `.jsonc` (JSON with comments) extensions are accepted; the plugin looks for the first existing file in this order:

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

  // Default output token limit (ZenMux does not expose this)
  "defaultOutputTokens": 16384,

  // Hide models that cannot produce text
  "excludeNonChat": true,

  // Minutes to cache the ZenMux catalog on disk (0 disables)
  "catalogCacheTTL": 60,

  // Include :providerSlug in the model id itself
  "routedModelIds": false,

  // Model ids (substring match) that must pass reasoning_content back to the API.
  // The plugin also auto-detects additional models from OpenCode's cached models.dev catalog.
  "reasoningContentModels": ["deepseek", "glm", "minimax", "kimi", "mimo"],

  // Inline routing table (same format as a routing file)
  "routing": [{ "model": "z-ai/glm-5.2", "provider": "streamlake" }],
}
```

### Plugin tuple override

You can also pass options directly in the plugin tuple in `opencode.json`. Those override the config file:

```json
{
  "plugin": [
    [
      "@daika7ana/opencode-zenmux-plugin",
      {
        "baseURL": "https://zenmux.ai/api/v1"
      }
    ]
  ]
}
```

### Configuration options

All options can be set in `zenmux-plugin.json` (or `zenmux-plugin.jsonc`). All options except `routing` can also be passed directly in the plugin tuple in `opencode.json`. The `routing` option can only be set in the config file because it belongs in a dedicated routing table. Plugin tuple options override the config file.

| Option                   | Type             | Default                                          | Description                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseURL`                | `string`         | `https://zenmux.ai/api/v1`                       | Base URL for actual ZenMux API calls.                                                                                                                                                                                                                                                  |
| `anthropicBaseURL`       | `string`         | `https://zenmux.ai/api/anthropic/v1`             | Base URL for Anthropic Messages API calls (used when a routing entry has `sdk: "anthropic"`).                                                                                                                                                                                          |
| `modelsURL`              | `string`         | `https://zenmux.ai/api/v1/models`                | URL to fetch the public model catalog.                                                                                                                                                                                                                                                 |
| `routingFile`            | `string \| null` | `null`                                           | Explicit path to the routing file; overrides the default search order.                                                                                                                                                                                                                 |
| `routing`                | `array`          | —                                                | In-file routing table. See [Provider routing](#provider-routing).                                                                                                                                                                                                                      |
| `defaultOutputTokens`    | `number`         | `16384`                                          | Default `limit.output` because ZenMux does not expose max output tokens.                                                                                                                                                                                                               |
| `excludeNonChat`         | `boolean`        | `true`                                           | Exclude models whose output modality is not `text`.                                                                                                                                                                                                                                    |
| `catalogCacheTTL`        | `number`         | `60`                                             | Minutes to cache the ZenMux catalog (models + frontend enrichment) on disk so startups skip the network calls. `0` disables the cache. `opencode models --refresh` bypasses the cache and refetches.                                                                                   |
| `routedModelIds`         | `boolean`        | `false`                                          | Put the provider suffix into the model `id` itself (see [below](#routed-model-ids)).                                                                                                                                                                                                   |
| `reasoningContentModels` | `array`          | `["deepseek", "glm", "minimax", "kimi", "mimo"]` | Model ids (substring match) that must pass `reasoning_content` back to the API on subsequent turns; enables OpenCode's `interleaved` capability for them. The plugin also unions in models that OpenCode's cached models.dev catalog marks as needing `reasoning_content` passthrough. |

### Option precedence

Options are merged in this order (later wins):

1. Plugin defaults
2. `zenmux-plugin.json` / `zenmux-plugin.jsonc`
3. Options passed directly in the plugin tuple in `opencode.json` (does not include `routing`)

That means plugin tuple options always override the config file, and the config file overrides the built-in defaults. The `routing` field can only be set in the config file.

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

When a routing entry exists with a `provider`, the plugin sets `api.id = "modelId:providerSlug"` for that model. If `provider` is omitted (for example when only swapping the SDK), `api.id` is left as the plain model id. The OpenCode model list still shows the model once.

### Routing precedence

If multiple routing sources are present, they are checked in this order and the first match wins:

1. **`routingFile`** in plugin options — explicit path to a routing file.
2. **`routing` field** in `zenmux-plugin.json` / `zenmux-plugin.jsonc`.
3. **Default routing file search** (see below).

If `routingFile` is set but the file does not exist, routing is disabled for that refresh; the plugin does **not** fall back to the inline `routing` field or the default file search.

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

- The model uses `@ai-sdk/anthropic` instead of `@ai-sdk/openai-compatible`
- Requests go to `anthropicBaseURL` (default: `https://zenmux.ai/api/anthropic/v1`) instead of `baseURL`
- Auth uses the same `ZENMUX_API_KEY` (sent as `x-api-key` header)

The `sdk` and `provider` fields are both optional. `sdk` defaults to `"openai"`; existing routing files without `sdk` continue to work unchanged. When `provider` is omitted alongside an SDK swap, the model id is left as-is and only the SDK + base URL change.

### Routed model ids

By default, routing only affects `api.id`. OpenCode's manual model selection uses `api.id`, so routing works there. Some tools (e.g., oh-my-opencode-slim) resolve models from their own JSON config and use the raw model `id` instead of `api.id`.

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

The plugin default-exports a dual entrypoint, an object `{ id, setup, server }`. OpenCode 1.18.x calls `server()`, which registers three hooks:

1. **`config`** — registers the `zenmux` provider with `@ai-sdk/openai-compatible` and the configured `baseURL`.
2. **`auth`** — adds an API key auth method for `/connect zenmux`.
3. **`provider.models`** — fetches the live ZenMux catalog, loads the routing table, maps records to OpenCode's `ModelV2` shape, and applies routing. Models with `sdk: "anthropic"` in the routing table use `@ai-sdk/anthropic` and point to `anthropicBaseURL`.

OpenCode 2.x calls `setup(ctx)` instead, which registers the same provider and models through the V2 provider/model plugin API. It registers from the on-disk catalog cache first — the host awaits `setup()` only briefly, and V2 transforms must stay synchronous — then fetches the live catalog in the background, replays the transform via `provider.reload()`, and repeats on the `catalogCacheTTL` interval. It also registers the API key as an integration method.

The public models endpoint does not require authentication. The API key is only used by the actual provider for chat/completion requests.

## License

MIT
