# opencode-provider-laiya

An OpenCode V2 plugin that discovers models from a Laiya OpenAI-compatible API
and registers them with the appropriate request protocol and reasoning variants.

## Requirements

- OpenCode V2.
- Laiya with an authenticated `GET /v1/models` endpoint.
- A `LAIYA_API_KEY` environment variable in the OpenCode server environment.

## Install

Add the plugin and a Laiya provider to `opencode.json`:

```jsonc
{
	"$schema": "https://opencode.ai/config.json",
	"plugins": ["@socketry/opencode-provider-laiya"],
	"providers": {
		"laiya": {
			"name": "Laiya",
			"env": ["LAIYA_API_KEY"],
			"package": "@opencode/ai/providers/openai-compatible",
			"settings": {
				"baseURL": "http://aiko.local:9293/v1",
			},
			"models": {},
		},
	},
	"model": "laiya/gpt-6-luna",
}
```

Set `LAIYA_API_KEY` on the OpenCode server, not in this configuration file. For
the managed OpenCode server, use `opencode service set env LAIYA_API_KEY <key>`.
The provider stub needs only its endpoint and auth environment variable; the
plugin fills the model map from Laiya's `/v1/models` and refreshes it every five
minutes.

Discovered models use the `laiya` provider ID. Codex models select OpenCode's
Responses package per model, preserving Codex tool calls; Ollama models inherit
the OpenAI-compatible Chat Completions package. Named reasoning efforts become
model variants. Ollama boolean thinking controls are exposed as `thinking` and
`no-thinking` variants.

Choose a discovered model with `/models`, for example:

```text
laiya/gpt-6-luna
laiya/qwen3-coder:latest
```

## Development

```sh
npm install
npm test
npm run build
```
