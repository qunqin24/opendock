# opencode-9router-model-sync

OpenCode plugin that fills `provider.9router.models` from a **self-hosted** 9router OpenAI-compatible `/v1/models` endpoint.

Without it, an empty `models: {}` stays empty and the model picker has nothing to show. With it, the catalog is loaded at startup (and can be refreshed with `/9router-sync`).

## Quick start

1. Install the plugin and define a provider with your self-hosted base URL:

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-9router-model-sync"],
  "provider": {
    "9router": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "9Router",
      "options": {
        "baseURL": "https://your-9router-host/v1"
      },
      "models": {}
    }
  }
}
```

`options.baseURL` is required — OpenCode needs it for chat, and this plugin reads the same value for `/models`.

2. Provide an API key (one of):
   - `/connect` in OpenCode and add credentials for `9router`
   - env: `9ROUTER_API_KEY`
   - or `provider.9router.options.apiKey` in config

3. Restart OpenCode.

4. Pick a model as `9router/<model-id>`, or force a refresh with `/9router-sync`.

## Auth

API key resolution order:

1. `provider.9router.options.apiKey`
2. `9ROUTER_API_KEY`
3. OpenCode auth store (`auth.json` entry for `9router`, type `api`)

If the key is missing, the last disk cache is used when present; otherwise sync fails with a clear error.

## Plugin options

```json
{
  "plugin": [
    [
      "opencode-9router-model-sync",
      {
        "providerId": "9router",
        "timeoutMs": 15000
      }
    ]
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `providerId` | `"9router"` | Key under `config.provider` |
| `syncCommands` | `["9router-sync"]` | Slash commands that force a revalidate |
| `timeoutMs` | `10000` | Fetch timeout (ms) |
| `apiKeyEnv` | `["9ROUTER_API_KEY"]` | Env vars checked for an API key |
| `cachePath` | `$XDG_CACHE_HOME/opencode/<providerId>-models.json` | Disk cache path |
| `authPath` | `$XDG_DATA_HOME/opencode/auth.json` | OpenCode auth file |

## Refresh

`/9router-sync` force-fetches `/models` (skips ETag short-circuit) and refreshes the in-memory catalog without quitting OpenCode.

## Caching

Catalog responses are written under the XDG cache dir. Conditional requests use `ETag` / `Last-Modified` when available (`304` reuses the cache).

## Local development

```bash
npm install
npm test
npm run build
```

Point OpenCode at the built entry:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-9router-model-sync/dist/index.js"]
}
```

Requires Node.js 20+. Restart OpenCode after config or build changes.

## License

MIT
