# opencode-custom-provider

[中文文档](README.zh-CN.md)

An OpenCode plugin that turns any OpenAI-compatible endpoint into a first-class
provider: you configure the endpoint and key, and the model list is discovered
from `GET {baseURL}/models`.

It never touches built-in providers, so an official OpenAI (or Anthropic, Google,
and so on) account keeps working at the same time.

## Why

OpenCode only auto-discovers models for a few built-in runtimes (Ollama, LM
Studio, vLLM). A provider declared under `providers` in `opencode.json(c)` needs
every model listed by hand. The usual workaround — pointing the built-in `openai`
provider at a gateway through `settings.baseURL` — also breaks the official
OpenAI account, because one provider ID can only have one endpoint.

This plugin gives each custom endpoint its own provider ID. The official
providers stay untouched, and the gateway's model list comes from the endpoint
instead of a hand-maintained list.

## Requirements

- OpenCode V2.
- `@opencode/plugin` installed where the OpenCode config directory can resolve
  it, usually via `~/.config/opencode/package.json`:

  ```json
  {
    "dependencies": {
      "@opencode/plugin": "2.0.24"
    }
  }
  ```

- An endpoint implementing `GET {baseURL}/models` that returns
  `{ "data": [{ "id": "...", "label": "..." }] }`. The `label` field is
  optional and is used as the display name in OpenCode.

## Install

Clone this repository anywhere OpenCode can read, then install dependencies and
build the plugin:

```sh
git clone https://github.com/ekworp/opencode-custom-provider.git \
  ~/nodejs/opencode-custom-provider
cd ~/nodejs/opencode-custom-provider
pnpm install
pnpm build
```

The build output is written to `dist/` and is the entry point used by OpenCode.

Register it in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"plugins": [
		{
			"package": "~/path/to/opencode-custom-provider",
			"options": {
				"baseURL": "https://api.example.com/v1",
				"apiKeyEnv": "EXAMPLE_API_KEY",
				"models": {
					"example-model": {
						"context": "1M",
						"output": "128K"
					}
				},
				"reasoning": {
					"efforts": ["low", "medium", "high"]
				}
			}
		}
	]
}
```

That is the whole setup. The provider ID is derived from the hostname:
`api.example.com` becomes `example`, so models appear as
`example/example-model`.

Restart the OpenCode service after changing plugin code or its registration:

```sh
opencode service restart
```

Then verify:

```sh
opencode models | grep '^example/'
```

To force an immediate model refresh instead of waiting for `refreshInterval`,
run this OpenCode command:

```text
/custom-provider-refresh
```

## Configuration

### Single provider

Minimal form — endpoint and key only:

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"baseURL": "https://llm.acme.example/v1",
		"apiKey": "sk-..."
	}
}
```

Override the derived ID and display name when needed:

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"id": "acme",
		"name": "Acme Gateway",
		"baseURL": "https://llm.acme.example/v1",
		"apiKeyEnv": "ACME_API_KEY"
	}
}
```

### Multiple providers

Use `providers` to register several endpoints with one plugin instance:

```jsonc
{
	"package": "~/path/to/opencode-custom-provider",
	"options": {
		"refreshInterval": 21600,
		"reasoning": {
			"efforts": ["low", "medium", "high"],
			"none": true
		},
		"providers": [
			{
				"baseURL": "https://api.example.com/v1",
				"apiKeyEnv": "EXAMPLE_API_KEY"
			},
			{
				"id": "local",
				"name": "Local vLLM",
				"baseURL": "http://127.0.0.1:8000/v1"
			}
		]
	}
}
```

### Options

| Option            | Type   | Default                                    | Purpose                                                                               |
| ----------------- | ------ | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `baseURL`         | string | required                                   | OpenAI-compatible base URL, including `/v1` when the endpoint expects it.             |
| `apiKey`          | string | `""`                                       | Inline API key, sent as `Authorization: Bearer ...`.                                  |
| `apiKeyEnv`       | string | none                                       | Environment variable read before `apiKey`.                                            |
| `id`              | string | derived from host                          | Provider prefix used in model references. Must not contain `/` or `#`.                |
| `name`            | string | `id`                                       | Display name in `/models`.                                                            |
| `package`         | string | `@opencode/ai/providers/openai-compatible` | OpenCode runtime package for this provider.                                           |
| `headers`         | object | none                                       | Extra headers sent to discovery and model requests.                                   |
| `models`          | object | none                                       | Per-model local overrides. Only configured `context` and `output` fields are applied. |
| `reasoning`       | object | none                                       | Expose reasoning-effort variants for discovered models.                               |
| `providers`       | array  | none                                       | Provider entries. When present, the top-level provider fields are ignored.            |
| `refreshInterval` | number | `21600` (6 hours)                          | Refresh interval in seconds. `0` disables refreshing.                                 |

`apiKeyEnv` at the top level applies to every entry that does not define its own.

When `reasoning` is configured, each discovered model gets variants selected as
`provider/model#low`, `provider/model#medium`, and so on. The default request
parameter is `reasoningEffort`, which is suitable for OpenAI-compatible gateways.
Set `reasoning.parameter` when your endpoint uses another JSON option name. Set
`reasoning.none` to `true` to add a variant that sends `reasoningEffort: "none"`.
If the endpoint returns reasoning in a custom assistant-message field, set
`reasoning.field`, for example `reasoning_content`.

Use `models` to override metadata for models returned by the current endpoint.
Only models listed in this object are changed; all other models keep OpenCode's
default metadata. Supported fields are `context` and `output`, both in tokens.
They accept numbers or unit strings such as `1M`, `200K`, and `128K` (using
decimal units: `1M` means 1,000,000 tokens).
The plugin does not set model status, and ignores unrelated upstream fields such
as `longContext`.

### Derived provider IDs

The hostname is scanned for the first label that is not generic infrastructure
naming (`api`, `www`, `llm`, `gateway`, `proxy`, `openai`, `chat`, `v1`, common
TLDs). Some examples:

| `baseURL`                        | Derived `id` |
| -------------------------------- | ------------ |
| `https://api.example.com/v1`     | `example`    |
| `https://llm.acme.example/v1`    | `acme`       |
| `https://gateway.example.com/v1` | `example`    |
| `http://127.0.0.1:8000/v1`       | `local`      |

Set `id` explicitly when the derived value is not what you want or when two
endpoints would collide.

## How it works

1. On plugin setup it requests `{baseURL}/models` for each configured provider.
2. Every returned ID becomes a model of that provider, built with
   `Model.Info.default()`; the ID is sent upstream unchanged. When present, the
   returned `label` is used as the display name. Optional reasoning settings
   become OpenCode model variants.
3. The provider is published through `ctx.provider.transform`, so it exists only
   at runtime and shares nothing with built-in providers.
4. A shared process-level scheduler re-fetches each list and calls
   `ctx.provider.reload()`. Multiple OpenCode locations do not create a separate
   refresh timer for each location. Requests for the same provider that overlap,
   or finish within a 60-second coalescing window, reuse one `/models` request
   and its result, even across separate plugin contexts. Only the instance that
   performs the request logs `discovered`. `/custom-provider-refresh` bypasses
   the cached result and fetches immediately. Removed models disappear and new
   ones show up without editing configuration.
5. A failed refresh logs an error and keeps the last successful list. A failed
   initial fetch leaves that provider unregistered.

## Caveats

- `/models` returns model IDs and may include display labels. Capabilities and
  limits therefore use OpenCode's
  fallback for unknown models: tools enabled, text and image input, text output,
  200k context, 32k output. If a model differs, customize the mapping in
  `loadModels()` — for example set `limit` or `capabilities` per ID or prefix.
- Reasoning variants are opt-in. The endpoint must support the configured request
  parameter (by default `reasoningEffort`); this plugin does not infer which
  reasoning levels each model supports.
- Use `/custom-provider-refresh` to refresh all configured providers immediately.
- Do not also declare the same provider ID under `providers` in
  `opencode.json(c)`; two definitions of one ID conflict.
- Discovery is the only thing this plugin does. Requests are handled by
  OpenCode's bundled OpenAI-compatible runtime.
- A model listed by `/models` is not guaranteed to work; the endpoint is the
  source of truth for what it actually serves.
- Prefer `apiKeyEnv` plus `opencode service set env EXAMPLE_API_KEY ...` to keep
  secrets out of the config file.

## Troubleshooting

Check that the plugin loaded and discovery succeeded:

```sh
grep -a "custom-provider" ~/.local/share/opencode/log/opencode.log | tail
```

Typical messages:
- `discovered N models from .../models` — success.
- `discovery failed: HTTP 401` — wrong or missing API key.
- `discovery failed: HTTP 404` — `baseURL` is missing `/v1` or points at the
  wrong host.
- `skipping provider entry without baseURL` — incomplete options.
- `duplicate provider id "..."` — two endpoints derived the same ID; set `id`.

If `/models` is empty, query it manually:

```sh
curl -s -H "Authorization: Bearer $EXAMPLE_API_KEY" \
  https://api.example.com/v1/models
```
