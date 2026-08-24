# Sockless LLM Router — OpenCode Provider Plugin

Use models served by your local [Sockless LLM Router](https://www.sockless.tech/projects/sockless-llm-router/) as OpenCode models. Point this plugin at the router's API endpoint and every configured preset shows up automatically — no manual per-model configuration.

Sockless LLM Router is a local gateway that manages and launches model server presets (llama.cpp, etc.) and exposes them behind OpenAI- and Anthropic-compatible APIs. See the [project page](https://www.sockless.tech/projects/sockless-llm-router/) and [GitHub repo](https://github.com/sockless-coding/llm-router) for setup and preset configuration.

## How model discovery works

The router speaks a standard OpenAI-compatible `/v1/chat/completions` API, so this plugin registers it as an `@ai-sdk/openai-compatible` provider for the actual chat traffic. But the piece that makes zero-config discovery possible is the router's own `GET /v1/models/capabilities` extension endpoint, which reports — per preset — context length, max output tokens, and whether tool calling, vision, and reasoning effort are supported. This plugin calls that endpoint and maps its response straight onto OpenCode's model list, so every preset appears with the right context window and capability flags without you describing a single model by hand.

Three plugin hooks work together:

- **`config`** populates the provider (and does a first pass at fetching the model list) the moment `opencode.json` loads — so a router reachable via env vars needs no extra setup step.
- **`auth`** is the interactive path (`opencode auth login`) for entering the router's URL and an optional API key.
- **`provider.models`** refreshes the model list on demand, using whichever connection is active (env vars, `opencode.json` options, or the saved auth) — the same pattern OpenCode's own built-in Modal and DigitalOcean provider plugins use to keep their catalogs current.

## Install

Add the package to your `opencode.json` plugin list:

```json
{
	"$schema": "https://opencode.ai/config.json",
	"plugin": ["opencode-sockless-llm-router"]
}
```

OpenCode installs it automatically the next time it runs. Or install it globally from the CLI:

```sh
opencode plugin --global opencode-sockless-llm-router
```

## Configure

Pick whichever fits your workflow — they're all read in the same priority order (saved connection → `opencode.json` options → env vars → default).

**Env vars** (simplest, good for a single machine):

```sh
export SOCKLESS_LLM_ROUTER_BASE_URL="http://localhost:5054"   # the API port, not the admin UI's 5053
export SOCKLESS_LLM_ROUTER_API_KEY="..."                       # optional — only if the router requires one
```

**Interactive** — run `opencode auth login`, pick **Sockless LLM Router**, and enter the API endpoint URL and (optional) API key. The key is stored in OpenCode's credential store, not in `opencode.json`.

**`opencode.json`**, if you'd rather commit the endpoint (skip the API key here if it's a secret):

```json
{
	"provider": {
		"sockless-llm-router": {
			"options": {
				"baseURL": "http://localhost:5054"
			}
		}
	}
}
```

Once configured, every server preset from the router appears in OpenCode's model list, with context size and tool/vision/reasoning support carried over from `/v1/models/capabilities`.

## Requirements

- A running Sockless LLM Router instance with at least one server preset configured.
- OpenCode with plugin support (`@opencode-ai/plugin` v1.18+).

## Links

- Sockless LLM Router — [project page](https://www.sockless.tech/projects/sockless-llm-router/) · [GitHub](https://github.com/sockless-coding/llm-router)

## Development

```sh
npm install
npm run build
```

`src/index.ts` exports the plugin as both a named export (`SocklessLlmRouterPlugin`) and the default export, for either import style.
