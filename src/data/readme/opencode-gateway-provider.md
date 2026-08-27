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
3. Identify the native host from the directory header already configured on
   `PluginInput.client` (`x-opencode-directory`, `x-kilo-directory`, or
   `x-mimocode-directory`) and read the exact catalog file used by that host.
   OCP's explicit `OPENCODE_COMPAT_HOST` setting is honored first. OpenCode,
   Kilo, and MiMo model-path and model-URL overrides are mirrored exactly;
   `XDG_CACHE_HOME` and MiMo's self-contained `MIMOCODE_HOME` layout are also
   respected. The plugin reads only that one existing file. It performs no
   catalog download, subprocess, directory probing, or alternate-source
   fallback.
4. Match the complete gateway model ID against the provider rows; suffixes such
   as `-free` remain part of the ID. If exactly one distinct provider exposes
   that exact full ID, use it. A qualified ID such as
   `poolside/laguna-s-2.1-free` is not the same ID as
   `laguna-s-2.1-free`. If several providers expose the exact ID, use only the
   provider whose ID is identified as the native namespace by other catalog IDs—for example,
   reseller IDs named `moonshotai/kimi-k3` identify `moonshotai` as the native
   owner of `kimi-k3`. Self-prefixed reseller IDs are not native evidence. If
   there is no single native owner, emit defaults. There is no provider order,
   variant consensus, fuzzy match, or model-family fallback.
5. Build the config-shape model entries with generous defaults for unknown
   models and models.dev overrides where the native catalog entry is
   authoritative. Reasoning variant names come only from explicit string values
   in models.dev `reasoning_options` entries of type `effort`; toggle and token
   budget labels are not invented. Variants are emitted as translated labels
   (`None`, `Low`, `Medium`, `High`, `Extra High`, `Max`, plus `Default`/`Minimal`
   when the catalog lists them) with disabled tombstones for the raw effort keys
   so OpenCode's merge drops the raw `xhigh`/`none`/… entries. `null` effort
   values are normalized to `none`. Unknown effort tokens are passed through
   verbatim without Responses-only fields. For `@ai-sdk/openai` the selected
   variant also sets `reasoningSummary: "auto"` and
   `include: ["reasoning.encrypted_content"]` when the effort is greater than
   `low`; `@ai-sdk/openai-compatible` keeps `reasoningEffort` only. Provider-
   specific catalog request headers and bodies are deliberately not inherited, so
   an Anthropic or other native row cannot change the gateway's OpenAI request
   shape.

The gateway slug is always kept verbatim as the model id — it is what the
gateway expects on chat requests. `-free` models are looked up using that full
ID, get a ` Free` display suffix when needed, and never inherit the paid native
rate.

Models you declare explicitly in `opencode.json` are respected and never
overwritten; discovery only fills the gap.

OpenCode 1.18.x filters and clears reasoning metadata while building
`/api/model`, while `/provider` depends on the same config hook completing.
The `/path` and `/file/content` routes are also instance-scoped: calling either
from a `config` hook can re-enter instance bootstrap and wait on the plugin
which made the call. Reading the one host-resolved catalog file in-process
avoids all three lifecycle paths.
For example, `litellm/kimi-k3` resolves to the native `moonshotai/kimi-k3`
metadata and inherits its explicit `low`, `high`, and `max` effort values while
chat requests still use LiteLLM's OpenAI-compatible endpoint. If the cache is
unavailable, every gateway model is still emitted with defaults.

The native cache resolution rules are:

| Host | Exact file override | Custom source | Default cache file |
| --- | --- | --- | --- |
| OpenCode | `OPENCODE_MODELS_PATH` | `OPENCODE_MODELS_URL` | `${XDG_CACHE_HOME:-~/.cache}/opencode/models.json` |
| Kilo | `KILO_MODELS_PATH` | `KILO_MODELS_URL` | `${XDG_CACHE_HOME:-~/.cache}/kilo/models.json` |
| MiMo | `MIMOCODE_MODELS_PATH` | `MIMOCODE_MODELS_URL` | `${XDG_CACHE_HOME:-~/.cache}/mimocode/models.json`, or `$MIMOCODE_HOME/cache/models.json` |

A custom source uses the same `models-<sha1(source)>.json` filename as the
native host. An exact file override wins over every cache convention, just as
it does in the host source. The plugin never downloads or writes a catalog file.

Optional per-model patches live in the same host cache directory:

`${XDG_CACHE_HOME:-~/.cache}/opencode/gateway-model-overrides.json`

Kilo and MiMo use their cache roots the same way. Set
`GATEWAY_MODEL_OVERRIDES` to use an explicit file. Missing files are ignored.

```json
{
  "models": {
    "gpt-5.6-luna": {
      "name": "GPT-5.6 Luna",
      "provider": "openai",
      "context_size": 1050000,
      "pricing": { "input": 0.2, "output": 1.2, "cache_read": 0.02, "cache_write": 0.25 },
      "variants": ["none", "low", "medium", "high", "xhigh", "max"]
    }
  }
}
```

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
