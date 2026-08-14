# opencode-models-discovery

[![npm version](https://img.shields.io/npm/v/%40abyssal-labs%2Fopencode-models-discovery)](https://www.npmjs.com/package/@abyssal-labs/opencode-models-discovery)
[![npm downloads](https://img.shields.io/npm/dm/%40abyssal-labs%2Fopencode-models-discovery)](https://www.npmjs.com/package/@abyssal-labs/opencode-models-discovery)
[![CI](https://github.com/abyssal-labs/opencode-models-discovery/actions/workflows/ci.yml/badge.svg)](https://github.com/abyssal-labs/opencode-models-discovery/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/node/v/%40abyssal-labs%2Fopencode-models-discovery)](https://www.npmjs.com/package/@abyssal-labs/opencode-models-discovery)
[![License](https://img.shields.io/npm/l/%40abyssal-labs%2Fopencode-models-discovery)](LICENSE)

Discover the models your OpenCode providers actually expose. The plugin queries compatible model-list APIs at startup, updates OpenCode's model selector, and caches the result for fast subsequent launches.

## Features

- One global plugin entry enables discovery for every configured compatible provider.
- Automatically selects OpenAI or Anthropic model-list behavior from the provider family.
- Supports custom wrappers, gateways, local servers, and proxies through `options.baseURL`.
- Uses credentials supplied by OpenCode's `/connect` flow without reading its on-disk auth store.
- Includes dedicated discovery for Amazon Bedrock, Cloudflare Workers AI, Cohere, Google Gemini, and Vercel AI Gateway.
- Preserves model IDs and maps context limits, output limits, display names, modalities, modes, service tiers, and costs when endpoints provide them.
- Uses bounded responses, request timeouts, same-origin pagination, credential-scoped caching, and stale-cache fallback.
- Never enriches or replaces endpoint results with models.dev metadata.

## Quick start

Add the plugin to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@abyssal-labs/opencode-models-discovery"]
}
```

Connect a supported built-in provider with `/connect`, or configure a provider with a compatible `baseURL`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@abyssal-labs/opencode-models-discovery"],
  "provider": {
    "my-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://example.com/v1",
        "apiKey": "{env:MY_PROVIDER_API_KEY}"
      }
    }
  }
}
```

Restart OpenCode. Discovered models are then available through the normal model selector.

## Discovery

Native OAuth is skipped when it does not use a custom `baseURL` and OpenCode already manages that provider's model catalog.

For configured providers with a custom `baseURL`, the plugin selects the wire format globally:

- Anthropic-family SDK identifiers use Anthropic headers and pagination.
- OpenAI-family SDK identifiers use the OpenAI model-list format.
- Other custom-baseURL providers default to the OpenAI format.

Other provider IDs can opt into either wire format with `modelsDiscovery.apiFormat` set to `"openai"` or `"anthropic"`.

The package also registers dedicated adapters automatically for APIs that do not follow either format:

- Amazon Bedrock foundation models, using a Bedrock bearer token and `AWS_REGION`.
- Cloudflare Workers AI, using the account id captured by `/connect` or `CLOUDFLARE_ACCOUNT_ID`.
- Cohere chat-capable models.
- Google Gemini generative models.
- Vercel AI Gateway's public model catalog.

GitHub Copilot, DigitalOcean, and GitLab are left to OpenCode's native dynamic discovery.

All matching providers are included by default. Use `providers.include` as an optional allowlist; when it is empty or omitted, all matching providers are included. Use `providers.exclude` to skip a provider.

For every discovered model, it maps endpoint metadata into opencode model config:

- `metadata.context_window` -> `limit.context`
- `metadata.context_length` or top-level `context_length` -> `limit.context`
- `max_model_len` and `max_context_length` -> `limit.context`
- `metadata.input_context_window` -> `limit.input`
- `metadata.max_output_tokens` -> `limit.output`
- `max_completion_tokens` and `max_tokens` -> `limit.output`
- `metadata.display_name` -> `name`
- `metadata.input_modalities` -> `modalities.input`
- `metadata.output_modalities` -> `modalities.output`
- `architecture.input_modalities` -> `modalities.input`
- `architecture.output_modalities` -> `modalities.output`

Modality names are normalized to lowercase, and `vision` is normalized to `image` for opencode compatibility.

Existing models are overridden by default so the wrapper/proxy `/models` metadata wins over models.dev metadata. With the default `overrideExisting: true`, providers expose only models returned by the `/models` endpoint. This is especially useful for custom `openai` base URLs because opencode otherwise starts from its built-in OpenAI model catalog.

Unknown limits are left unchanged for existing models. Newly discovered built-in provider models use the provider template's limits unless `fallbackContextTokens` or `fallbackOutputTokens` is configured.

## Modes and service tiers

The plugin creates additional model entries when a response provides `experimental.modes`, `modes`, or `additional_speed_tiers`. A mode named `fast` for model `example` becomes `example-fast`.

Mode metadata can provide:

- `provider.body`, converted from snake_case to opencode option names.
- `provider.headers`, restricted to string values.
- `cost`, including input, output, cache-read, and cache-write prices.
- Service tiers through `additional_speed_tiers` and `service_tiers`; these set the OpenAI `serviceTier` request option.

Paginated responses can use `next_page`, `next`, or `has_more` with `last_id`. Continuation URLs must remain on the original origin.

## Configuration

```json
{
  "plugin": ["@abyssal-labs/opencode-models-discovery"],
  "provider": {
    "openai": {
      "options": {
        "modelsDiscovery": {
          "refreshIntervalHours": 24
        }
      }
    },
    "my-openai-compatible-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://example.com/v1",
        "apiKey": "{env:MY_PROVIDER_API_KEY}"
      }
    }
  }
}
```

## Options

Default refresh interval is 24 hours. Cached values are still applied on startup when the cache is fresh; the endpoint is only rechecked after the interval.

For built-in providers with registered adapters, discovery uses API credentials configured through OpenCode's `/connect` flow when `options.apiKey` is not set. Credentials are supplied by OpenCode's supported plugin runtime and are never read from its on-disk auth store. An explicit `options.apiKey` takes precedence.

OpenAI-format discovery sends `Authorization: Bearer <key>`. Anthropic-format discovery sends `x-api-key` and the default `anthropic-version: 2023-06-01` header. Values in `modelsDiscovery.headers` can override the default headers.

Amazon Bedrock discovery supports the bearer token stored by `/connect`. AWS access keys, profiles, workload identity, and other SigV4 credential-chain sources are not exposed to plugin model hooks, so those setups retain OpenCode's existing catalog. Google Vertex has the same limitation with Application Default Credentials and is not dynamically discovered.

```json
{
  "plugin": [
    [
      "@abyssal-labs/opencode-models-discovery",
      {
        "refreshIntervalHours": 12,
        "fallbackContextTokens": 128000,
        "fallbackOutputTokens": 16384,
        "maxResponseBytes": 5242880,
        "maxPages": 10,
        "timeoutMs": 10000,
        "headers": {
          "x-api-key": "{env:DISCOVERY_API_KEY}"
        },
        "overrideExisting": true,
        "providers": {
          "include": [],
          "exclude": ["provider-to-skip"]
        }
      }
    ]
  ]
}
```

Provider-level overrides can live under `provider.<name>.options.modelsDiscovery`:

```json
{
  "provider": {
    "my-openai-compatible-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://example.com/v1",
        "apiKey": "{env:MY_PROVIDER_API_KEY}",
        "modelsDiscovery": {
          "apiFormat": "openai",
          "refreshIntervalHours": 6,
          "overrideExisting": true
        }
      }
    }
  }
}
```

Supported options:

- `apiFormat`: provider-level `"openai"` or `"anthropic"` override; normally inferred from the provider id or SDK.
- `enabled`: set `false` to disable globally.
- `refreshIntervalHours`: defaults to `24`.
- `refreshIntervalMs`: millisecond form, takes precedence over hours.
- `cachePath`: global option for cache file location.
- `fallbackContextTokens`: optional context limit for newly discovered built-in provider models without context metadata.
- `fallbackOutputTokens`: optional output limit for newly discovered built-in provider models without output metadata.
- `maxResponseBytes`: maximum discovery response size in bytes; defaults to 5 MiB.
- `maxPages`: maximum number of same-origin discovery pages; defaults to `10`.
- `timeoutMs`: timeout for each discovery page request; defaults to 10 seconds.
- `headers`: additional headers for `/models` discovery; values support `{env:NAME}` expansion.
- `providers.include`: optional allowlist; empty or omitted means include all matching providers.
- `providers.exclude`: skip these provider ids.
- `overrideExisting`: defaults to `true`; when `true`, providers expose only discovered models. When `false`, discovered models are merged into the existing model catalog without replacing existing definitions.

Invalid values and unknown option names are rejected during plugin initialization so configuration mistakes fail visibly.

TypeScript consumers can import `PluginOptions` and `ProviderDiscoveryOptions` from the package.

Default cache path:

```text
~/.cache/opencode-models-discovery/models-cache.json
```

`XDG_CACHE_HOME` is honored when set. On Windows, `LOCALAPPDATA` is used before the home-directory fallback.

## Compatibility

- Tested against `@opencode-ai/plugin` 1.18.x.
- Published output is standard ESM and requires Node.js 20 or newer when imported outside opencode.
- Discovery endpoints must use HTTP or HTTPS and return a supported model-list response.
- OpenCode currently supplies `/connect` credentials to plugin model hooks one provider id at a time. The package exports exact-id hooks only for its built-in and dedicated adapters; globally detected custom provider ids should configure `options.apiKey` or discovery headers.
- Azure OpenAI is not discovered because its resource model list does not reliably identify inference deployment names. Google Vertex is not discovered because its ADC credentials are unavailable to plugin hooks.

## Troubleshooting

Discovery failures are written to opencode logs under the `opencode-models-discovery` service. Logs include the provider, sanitized endpoint, HTTP status when available, and whether stale cache data was used. Credentials and URL query strings are not logged.

Set `refreshIntervalMs` to `0` to force discovery during each startup while debugging. Delete the cache file to discard all previously discovered metadata.

Release history and upgrade notes are available on the [GitHub Releases](https://github.com/abyssal-labs/opencode-models-discovery/releases) page.

Restart opencode after changing plugin or config files.
