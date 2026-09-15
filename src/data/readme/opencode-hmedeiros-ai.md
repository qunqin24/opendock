# opencode-hmedeiros-ai

OpenCode plugin for automatic model discovery from HMedeiros AI (Bifrost) gateways.

On startup, the plugin queries your gateway's `GET {baseURL}/models` endpoint and
injects the discovered models into the matching provider config — so you never have
to hand-maintain the `models` object in `opencode.json`.

## Install

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hmedeiros-ai"],
  "provider": {
    "hmedeiros-ai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "HMedeiros AI",
      "options": {
        "baseURL": "https://ai.hmedeiros.dev/v1",
        "apiKey": "{env:HMEDEIROS_AI_API_KEY}"
      }
    }
  }
}
```

The plugin matches providers by id (`hmedeiros-ai`), display name (`HMedeiros AI`),
or host (`ai.hmedeiros.dev`). Other providers are left untouched.

## Options

Per-provider discovery options live under `provider.<id>.modelsDiscovery`:

```json
{
  "provider": {
    "hmedeiros-ai": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "HMedeiros AI",
      "options": {
        "baseURL": "https://ai.hmedeiros.dev/v1",
        "apiKey": "{env:HMEDEIROS_AI_API_KEY}"
      },
      "modelsDiscovery": {
        "enabled": true,
        "timeoutMs": 15000,
        "includeRegex": ["^opencode-zen/"],
        "smartName": true
      }
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `true` | Set `false` to disable discovery for one provider. |
| `endpoint` | `/v1/models` | Models endpoint path (resolved against the provider origin). |
| `timeoutMs` | `15000` | Discovery request timeout. Raise for slow/remote gateways. |
| `apiKey` | — | Key used only for the discovery request. Falls back to `options.apiKey`, top-level `apiKey`, then OpenCode resolved credentials. |
| `includeRegex` / `excludeRegex` | — | Regex filters applied to model ids. |
| `smartName` | `true` | Use the gateway `normalized_name` when present. |

Environment override: `HMEDEIROS_AI_DISCOVERY_DEFAULT_ENABLED=false` makes providers
without explicit `modelsDiscovery.enabled` default to disabled.

Explicit `provider.<id>.models` entries are always preserved and merged last, so a
pinned model survives discovery.

## Auth

The discovery request needs a gateway key. Resolution order:

1. `modelsDiscovery.apiKey`
2. `options.apiKey` / top-level provider `apiKey`
3. OpenCode resolved provider credentials (`client.config.providers()`)

Unauthenticated gateways simply work without a key.

## Behavior

- Discovers from the Bifrost `/v1/models` payload: `normalized_name`, token limits,
  per-token pricing (converted to per-million costs), and modalities.
- Image-only models without chat context (e.g. `gpt-image-2`) are skipped — they are
  not selectable chat models.
- Non-HMedeiros providers are never modified.
- Discovery failure is non-fatal: explicit models remain and startup continues
  (bounded by a 5s config-hook budget).

## Development

```bash
npm install
npm run typecheck
npm run test:run
npm run compile
```

## License

MIT
