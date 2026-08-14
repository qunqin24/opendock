# opencode-gateway-provider

An [opencode](https://opencode.ai) plugin that auto-discovers models from a
custom OpenAI-compatible gateway and enriches them with models.dev metadata
(display name, costs, context/output limits, capabilities, modalities, release
date, and openai-compatible reasoning `variants`) — so a gateway in
`opencode.json` behaves like a first-class provider without hand-listing every
model.

## How it works

The plugin registers a `config` hook (the same mechanism
[cursor-opencode-provider](https://github.com/oakimov/cursor-opencode-provider)
uses). The hook runs before opencode builds its provider registry, so the
plugin can fill in `provider.<id>.models`:

1. Read `options.baseURL` from the provider block in `opencode.json`.
2. Fetch the gateway's model list from `{baseURL}/v1/models` (or
   `{baseURL}/models` when the configured baseURL already ends in `/v1`),
   authenticated with a bearer key from an environment variable.
3. Ask opencode 1.18.15's SDK for its internal models.dev-backed Catalog via
   `client.v2.model.list()` (`GET /api/model`). The plugin reuses opencode's
   authenticated in-process transport, so it performs no models.dev network
    request and reads no cache file. Map each gateway model id using the lookup
    strategy:
    exact bare-id match → substring match → `-free` tier fallback, with a
    deterministic provider preference when several Catalog rows share an id.
    Reverse-substring matches must cover at least half of the gateway slug so
    generic ids such as `auto` cannot capture `codex-auto-review`.
4. Build the config-shape model entries with generous defaults for unknown
   models and models.dev overrides where the catalog is authoritative.

The gateway slug is always kept verbatim as the model id — it is what the
gateway expects on chat requests. `-free` gateway aliases get a ` Free` suffix
on the display name and never inherit the paid native rate.

Models you declare explicitly in `opencode.json` are respected and never
overwritten; discovery only fills the gap.

## Setup

### From npm

Add the package to your opencode config. OpenCode installs npm plugins with
Bun at startup (cached under `~/.cache/opencode/node_modules/`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gateway-provider"],
  "provider": {
    "litellm": {
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "https://gateway.example.com/v1" },
      "env": ["LITELLM_API_KEY"]
    }
  }
}
```

Pin a version if you want: `"opencode-gateway-provider@0.1.0"`.

You can also install it yourself first:

```sh
npm install opencode-gateway-provider
# or: bun add opencode-gateway-provider
```

### From a local clone

```sh
git clone https://github.com/oakimov/opencode-gateway-provider.git
cd opencode-gateway-provider
bun install && bun run build
```

Point opencode at the built entry with an absolute `file://` URL:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-gateway-provider/dist/index.js"],
  "provider": {
    "litellm": {
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "https://gateway.example.com/v1" },
      "env": ["LITELLM_API_KEY"]
    }
  }
}
```

> `npm: "@ai-sdk/openai-compatible"` is applied automatically if omitted; it
> routes chat completions to `{baseURL}/chat/completions`. The `env` array is
> what makes opencode send the key on actual chat calls — keep it in sync with
> the env var below.

Set the API key environment variable:

```sh
export LITELLM_API_KEY="..."
```

The plugin checks `options.apiKeyEnv`, then the provider's `env` names, then
`GATEWAY_API_KEY`. To select an explicit variable, set `options.apiKeyEnv`:

```json
{
  "provider": {
    "litellm": {
      "options": { "baseURL": "https://gateway.example.com/v1", "apiKeyEnv": "MY_GATEWAY_KEY" }
    }
  }
}
```

Verify with:

```sh
opencode models litellm
```

## Configuration reference

| Setting | Default | Purpose |
| --- | --- | --- |
| `provider.<id>.options.baseURL` | — (required) | Gateway base URL; model list is discovered from `{baseURL}/v1/models` |
| `provider.<id>.options.apiKeyEnv` | provider `env`, then `GATEWAY_API_KEY` | Preferred environment variable holding the discovery API key |
| `provider.<id>.options.autoDiscover` | automatic | Force discovery on or opt out; consumed before provider construction |
| `provider.<id>.npm` | `@ai-sdk/openai-compatible` | SDK package used for chat calls |

## Development

```sh
bun run typecheck   # tsc --noEmit
bun test            # bun test (fixtures only, no network)
bun run build       # tsc → dist/
```