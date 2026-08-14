# @hellogravel/opencode-lms

An [LM Studio](https://lmstudio.ai) provider plugin for [OpenCode](https://opencode.ai).

## What it does

- Discovers the chat models your LM Studio server is hosting and exposes them in OpenCode. Embedding models are filtered out by default (OpenCode has no slot that consumes them); list one in `provider.lmstudio.models` to opt it back in.
- Loads an unloaded LLM on first reference; load progress is logged to the OpenCode server log. Loads at a capped context window (`contextLength`, default 32k — agent sessions open well past 8k) to keep VRAM in check, and tags the model with an idle `ttl` (default 1h) so it auto-evicts when unused. A resident instance loaded with a smaller window than the policy is evicted and reloaded at it; concurrent sessions referencing the same cold model share a single load.
- Self-heals when LM Studio starts after OpenCode: discovery is retried on demand (throttled to 30s) from the first request that needs it, so auto-load and model listing recover without an OpenCode restart.
- Forwards an `Authorization: Bearer …` header to LM Studio when `apiKey` is set.
- Demotes `reasoning_effort: "max"` to `"xhigh"` before requests leave OpenCode, since LM Studio rejects `max`.
- Sets each model's OpenCode capability flags from what LM Studio reports — `reasoning`, `attachment` (vision models), `temperature`, `family`, etc. — and marks reasoning-capable models with `interleaved: { field: "reasoning_content" }` so OpenCode renders the streaming reasoning trace live in the TUI. Tool calling is always advertised as available (LM Studio's `trained_for_tool_use` flag is unreliable as a gate, so it's used only for a discovery-log diagnostic, not to disable tools).
- Suppresses OpenCode's auto-generated reasoning-effort picker (low/medium/high) for models that only support binary on/off reasoning, since every choice would route to "on" inside LM Studio anyway. Graduated reasoning models keep the picker.

## Compatibility

Requires **OpenCode ≥ 1.16.2** (validated on 1.17.15). The `@opencode-ai/plugin`
dependency pin governs the plugin API *types* only, not the OpenCode runtime
version you run against.

## Set up

Add the plugin and provider to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "provider": {
    "lmstudio": {
      "name": "LM Studio",
      "options": {
        "baseURL": "http://127.0.0.1:1234",
        "apiKey": "sk-lm-..."
      }
    }
  },
  "model": "lmstudio/google/gemma-4-26b-a4b",
  "plugin": ["@hellogravel/opencode-lms"]
}
```

Start LM Studio's server (`lms server start`) and restart OpenCode.

- This plugin extends OpenCode's built-in `lmstudio` provider in place — it supplies the live model list via OpenCode's `provider.models` hook. Do **not** add `lmstudio` to `disabled_providers`, or the plugin's models get disabled too.
- `apiKey` is only needed when LM Studio has API token auth enabled.
- `baseURL` should not include a `/v1` suffix — the plugin appends it.

> **Upgrading from a pre-0.2 build?** The provider id changed from `lms` to `lmstudio`. Rename the `provider.lms` config key to `provider.lmstudio`, update any `"model": "lms/…"` reference to `"lmstudio/…"`, and drop the old `"disabled_providers": ["lmstudio"]` line.

## Options

Under `provider.lmstudio.options`:

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | `"http://127.0.0.1:1234"` | LM Studio server URL |
| `apiKey` | `string` | — | Bearer token sent in the `Authorization` header |
| `autoDetect` | `boolean` | `true` | When `baseURL` is not set, probe localhost ports 1234, 8080, 11434 |
| `disableAutoLoad` | `boolean` | `false` | Skip the auto-load step on first model reference |
| `autoDownload` | `boolean` | `false` | Download a missing model on first reference (off by default — a typo could trigger a multi-GB download) |
| `loadTimeout` | `number` | `600000` | Load/unload timeout in ms |
| `downloadTimeout` | `number` | `1800000` | Download timeout in ms |
| `timeout` | `number` | `600000` | Overall chat-completion request timeout in ms |
| `chunkTimeout` | `number` | `120000` | Inter-chunk (time-to-next-token) timeout in ms — raise for SWA models (see note) |
| `contextLength` | `number` | `32768` | Global cap on the context window a model is *loaded* with (the VRAM knob). A model whose max is below this loads at its max; adjust per-model with `models[<id>].contextLength`. A resident instance with a smaller window is unloaded and reloaded at this value on first use, and the advertised `limit.context` follows it, so OpenCode budgets against the real window |
| `ttl` | `number` | `3600` | Idle seconds before a loaded model auto-evicts (frees VRAM), sent on each chat completion. The countdown resets on every request, so active models stay resident. `0` = resident (never auto-evict). **Reach is limited by LM Studio's API — see the TTL note below** |

> **TTL vs auto-load (LM Studio ≤0.4.19):** LM Studio applies a request's `ttl`
> only when that request JIT-loads the model; it ignores `ttl` on already-loaded
> instances, and the REST load endpoint rejects a `ttl` key outright (HTTP 400).
> Since this plugin auto-loads cold models via REST (to apply `contextLength`),
> plugin-loaded models evict on **LM Studio's server-default idle TTL**, not
> `options.ttl`. The configured `ttl` fully applies only when `disableAutoLoad`
> is set (JIT loads — which also bypass the context cap). Verified live on
> 0.4.19.

> **SWA models (e.g. Gemma) and `chunkTimeout`:** llama.cpp can't reuse the prompt cache for sliding-window-attention models, so every turn reprocesses the *entire* prompt from scratch. No streamed chunks are emitted during that prompt-processing phase, so a large prompt can exceed `chunkTimeout` before the first token — the request aborts and retries, reprocessing from 0% again, looping indefinitely. If you see prompt processing restart from 0% repeatedly, raise `chunkTimeout` (e.g. to match `timeout`) and/or shrink the prompt by disabling unused tools/MCP servers.

## Model overrides

Override per-model metadata under `provider.lmstudio.models[<id>]`:

```jsonc
"models": {
  "google/gemma-4-e4b": {
    "name": "Gemma 4 E4B",
    "reasoning": true,
    "contextLength": 32768,
    "limit": { "context": 131072, "output": 131072 }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `id` | `string` | LM Studio model identifier (e.g. `google/gemma-4-e4b`) |
| `name` | `string` | Display name |
| `reasoning` | `boolean` | Mark the model as reasoning-capable |
| `tool_call` | `boolean` | Mark the model as supporting tool calls |
| `modalities` | `object` | e.g. `{ input: ["text","image"], output: ["text"] }` |
| `limit` | `object` | `{ context: <ctx>, output: <out> }` — UI metadata, not the load-time window |
| `contextLength` | `number` | Load-time context window for *this* model (the VRAM knob); overrides the global `contextLength`, still clamped to the model's max |

Overrides merge on top of discovered models.

## Development

```bash
git clone https://github.com/hellogravel/opencode-lms
cd opencode-lms
npm install
npm run build       # Compile TypeScript → dist/
npm run typecheck
npm run test:run
```

For a containerized OpenCode runtime with this plugin loaded, see [`docker/`](./docker/).

`docker/smoke.sh` boots that harness (latest OpenCode, plugin baked in) and
asserts `GET /config/providers` returns 200 and lists `lmstudio` — the
loader-level regression check the unit suite can't cover. Run it before a
release and after any OpenCode version bump.

`test-live.mjs` exercises the plugin against a live LM Studio server:

```bash
npm run build
LMS_BASE_URL=http://192.168.1.10:1234 \
LMS_API_KEY=sk-lm-... \
  node test-live.mjs
```

## License

MIT
