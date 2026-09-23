# opencode-v2-axonhub

OpenCode **V2** plugin that discovers AxonHub models from `/v1/models` and `/v1/models?include=all`, merges both responses, and exposes them as the `axonhub` provider.

This is the V2 port of the plugin. OpenCode V2 loads plugins through its own module contract (`{ id, setup }`), calls plugin domains directly, and ships provider implementations in-process, so the V1 hook shape (`{ id, server }`, `config`/`provider` hooks, `@ai-sdk/*` packages) is no longer used. The V1 implementation is published as `@pandada8/opencode-axonhub` and lives on `master`; this one is on `feat/v2`.

## Usage

```json
{
  "plugins": [
    {
      "package": "opencode-v2-axonhub",
      "options": { "baseURL": "https://your-axonhub.example.com" }
    }
  ]
}
```

The plugin owns the whole `axonhub` provider: no `providers.axonhub` entry is required (and none is read). `baseURL` may also come from `AXONHUB_BASE_URL`; a trailing `/v1` is stripped.

Installing from a checkout instead of the registry:

```json
{
  "plugins": [{ "package": "/absolute/path/to/opencode-axonhub", "options": { "baseURL": "https://your-axonhub.example.com" } }]
}
```

A directory plugin needs a `server.ts`, `index.ts`, `server.js`, or `index.js` at its root; this repository ships `server.ts`. OpenCode watches the loaded file, so editing the plugin reloads it without a restart.

### Options

| Option | Default | Meaning |
| --- | --- | --- |
| `baseURL` | `AXONHUB_BASE_URL` | AxonHub origin. Discovery and every model request need it. |
| `apiKey` | `AXONHUB_API_KEY`, then the stored credential | API key used for discovery. Requests always use the stored credential. |
| `enrichModels` | `true` | Copy metadata (family, cost, limits, capabilities, variants) for models that also exist in OpenCode's catalog. |
| `log` | `true` | Append discovery diagnostics to `~/.cache/opencode/axonhub-plugin.log`. |

### Authentication

The plugin registers the `axonhub` integration, so OpenCode's own credential store holds the key:

```sh
opencode auth login axonhub
```

`AXONHUB_API_KEY` also works, because the plugin registers it as an environment method. Discovery and provider availability both follow the credential: logging in or out refetches the model list and reloads the provider while the server runs.

### Model routing

AxonHub exposes several protocol surfaces. The plugin routes each model by its `owned_by` value (a `gemini-` model id wins over `owned_by`):

| `owned_by` | Provider package | Endpoint |
| --- | --- | --- |
| `google`, `gemini`, or `gemini-*` id | `@opencode/ai/providers/google` | `<baseURL>/gemini/v1beta` |
| `openai` | `@opencode/ai/providers/openai` | `<baseURL>/v1` |
| anything else | `@opencode/ai/providers/anthropic` | `<baseURL>/anthropic/v1` |

Package and endpoint are set per model, so one AxonHub provider covers all three surfaces.

### Discovery

Model lists are cached at `~/.cache/opencode/axonhub-models.json` for one day. Without a base URL or API key, discovery is skipped and no provider is published. When a fetch fails, the plugin falls back to the last cached list (even past its TTL) instead of dropping models.

Enrichment matches AxonHub model ids against the provider catalog OpenCode already loaded, preferring the entry whose provider id equals `owned_by`, then `opencode`, then `openai`. Enriched fields are `family`, `name`, `compatibility`, `capabilities`, `variants` (reasoning-effort variants), `cost`, `limit`, `status`, `headers`, `body`, and settings other than `baseURL`; AxonHub's own context length, output limit, capabilities, and pricing win where it reports them.