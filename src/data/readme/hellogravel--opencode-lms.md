# @hellogravel/opencode-lms

[LM Studio](https://lmstudio.ai) extras for [OpenCode](https://opencode.ai) 2.

OpenCode 2 ships a built-in `lmstudio` provider: it discovers the chat models
your LM Studio server hosts (from `/api/v1/models`), drops embedding models,
reads each model's context window and vision flag, and keeps the list fresh on
its own. This plugin doesn't replace any of that. It registers no provider; it
edits the built-in provider's models and hooks its requests to add what the
built-in doesn't do.

> **On OpenCode 1?** Use `@hellogravel/opencode-lms@0.4`. The 0.4.x line is the
> full provider plugin for OpenCode 1 (≥ 1.16.2); 1.x runs on OpenCode 2 only.

## What it adds

- **Auto-load at a capped context window.** Before a request goes to a cold
  model, the plugin loads it at `contextLength` (default 32k — agent sessions
  open well past 8k) instead of letting LM Studio JIT-load it at the model's full
  `max_context_length`, which can dominate VRAM. A resident instance loaded with
  a smaller window is unloaded and reloaded at the cap; concurrent sessions
  referencing the same cold model share a single load. Each model's advertised
  `limit.context` follows the window it will actually be loaded with (and
  `limit.output` reserves a quarter of it, up to 8192), so OpenCode budgets
  against the real window.
- **Idle `ttl` eviction.** Every chat completion carries LM Studio's `ttl`
  (default 1h), so a model unloads after that many idle seconds and frees VRAM.
  The countdown resets on every request, so models in use stay resident.
- **Tool calling always on.** The built-in only enables tools for models LM
  Studio reports as `trained_for_tool_use`, a flag that is unreliable as a gate
  (many capable models report false). The plugin turns tools on for every LM
  Studio model.
- **Reasoning models.** A model whose LM Studio reasoning options include
  graduated levels gets an effort picker with exactly those levels
  (low/medium/high). A model LM Studio only switches on/off gets no effort
  picker, since every choice would route to "on" anyway. `reasoning_effort:
  "max"` is demoted to `"xhigh"` on the wire, since LM Studio rejects `max`.

## Set up

Add the plugin to `opencode.jsonc` (in your project or
`~/.config/opencode/`), and point the built-in provider at LM Studio if it
isn't on the default `http://127.0.0.1:1234`:

```jsonc
{
  "plugins": ["@hellogravel/opencode-lms"],
  "providers": {
    "lmstudio": {
      "settings": {
        "baseURL": "http://127.0.0.1:1234/v1",
        "apiKey": "sk-lm-..."
      }
    }
  },
  "model": "lmstudio/google/gemma-4-26b-a4b"
}
```

Start LM Studio's server (`lms server start`) and start OpenCode.

- `baseURL` and `apiKey` belong to the built-in provider, not the plugin. The
  plugin reads them from there. `apiKey` is only needed when LM Studio has API
  token auth enabled.
- Request timeouts are provider settings too: set `timeout` or `chunkTimeout`
  (ms) under `providers.lmstudio.settings`. Raise `chunkTimeout` for
  sliding-window-attention models (see the note below).
- Per-model metadata (name, limits, variants) is set under
  `providers.lmstudio.models.<id>` in OpenCode's own config, which applies after
  this plugin, so explicit config wins.

## Options

Pass options with the object form of the plugin entry:

```jsonc
{
  "plugins": [
    {
      "package": "@hellogravel/opencode-lms",
      "options": {
        "contextLength": 32768,
        "models": { "qwen/qwen3-coder-30b": { "contextLength": 65536 } },
        "ttl": 3600
      }
    }
  ]
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `contextLength` | `number` | `32768` | Global cap on the context window a model is *loaded* with (the VRAM knob). A model whose max is below this loads at its max. A resident instance with a smaller window is unloaded and reloaded at this value on first use |
| `models` | `object` | — | Per-model load-time overrides keyed by LM Studio model key: `{ "<key>": { "contextLength": <n> } }`. Still clamped to the model's max |
| `ttl` | `number` | `3600` | Idle seconds before a loaded model auto-evicts, sent on each chat completion. `0` = resident (never auto-evict). **Reach is limited by LM Studio's API — see the TTL note below** |
| `disableAutoLoad` | `boolean` | `false` | Skip auto-loading; LM Studio JIT-loads cold models at its own defaults, and the built-in's advertised window stands |
| `loadTimeout` | `number` | `600000` | Load/unload timeout in ms |

> **TTL vs auto-load (LM Studio ≤0.4.19):** LM Studio applies a request's `ttl`
> only when that request JIT-loads the model; it ignores `ttl` on already-loaded
> instances, and the REST load endpoint rejects a `ttl` key outright (HTTP 400).
> Since this plugin auto-loads cold models via REST (to apply `contextLength`),
> plugin-loaded models evict on **LM Studio's server-default idle TTL**, not the
> `ttl` option. The configured `ttl` fully applies only when `disableAutoLoad`
> is set (JIT loads — which also bypass the context cap).

> **SWA models (e.g. Gemma) and `chunkTimeout`:** llama.cpp can't reuse the
> prompt cache for sliding-window-attention models, so every turn reprocesses
> the *entire* prompt from scratch. No streamed chunks are emitted during that
> prompt-processing phase, so a large prompt can exceed `chunkTimeout` before
> the first token — the request aborts and retries, reprocessing from 0% again.
> If you see prompt processing restart from 0% repeatedly, raise
> `providers.lmstudio.settings.chunkTimeout` and/or shrink the prompt by
> disabling unused tools/MCP servers.

Set `OPENCODE_LMS_LOG=1` to log loads and effort demotions to stdout (off by
default: OpenCode doesn't isolate plugin stdout from its TUI).

## Development

```bash
git clone https://github.com/hellogravel/opencode-lms
cd opencode-lms
npm install
npm run build       # Compile TypeScript → dist/
npm run typecheck
npm run test:run
```

The plugin is written against `@opencode/plugin` (exact-pinned to the OpenCode
2 release it was verified on). It imports only its types, so the published
module has no runtime dependency on it.

[`docker/`](./docker/) is still the OpenCode 1 harness from 0.4.x and has not
been ported to OpenCode 2.

## License

MIT
