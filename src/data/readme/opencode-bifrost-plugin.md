# Bifrost opencode Plugin

An [opencode](https://opencode.ai) plugin that registers a self-hosted [Bifrost](https://github.com/maximhq/bifrost) gateway as an LLM provider, with automatic model and context-window discovery from Bifrost's `/v1/models` endpoint — no per-model configuration required.

Works with both opencode v2 and opencode v1 from the same package.

## Setup

1. Add the plugin to your `opencode.json`:

   ```json
   {
     "plugins": ["opencode-bifrost-plugin"]
   }
   ```

   On opencode v1 the key is `plugin` (singular) instead. opencode v2 normalizes a v1 `plugin` key for you, so an existing config keeps working.

2. Set your Bifrost connection via environment variables:

   ```sh
   export BIFROST_BASE_URL=https://bifrost.example.com
   export BIFROST_API_KEY=your-virtual-key
   ```

3. Start (or restart) opencode. Bifrost's models will appear under the `bifrost` provider.

### Why environment variables instead of `opencode auth login`?

Discovery has to run before opencode presents a model list, which is earlier than any credential the interactive auth flow stores becomes readable back to the plugin. On v1 the only hook early enough (`config`) could call `auth.set` but never `auth.get`; on v2 the provider inventory is contributed during plugin `setup`, before any integration connection for this gateway exists. Environment variables are therefore the recommended way for this plugin to discover models automatically. If neither `BIFROST_BASE_URL` nor `BIFROST_API_KEY` is set, the plugin does nothing and leaves your providers untouched.

### Alternative: `baseUrl`/`apiKey` plugin options

If you can't set environment variables for your opencode setup, you can instead pass `baseUrl` and `apiKey` as plugin options in `opencode.json`:

```json
{
  "plugins": [
    { "package": "opencode-bifrost-plugin", "options": { "baseUrl": "https://bifrost.example.com", "apiKey": "your-virtual-key" } }
  ]
}
```

On opencode v1, options use the array form instead:

```json
{
  "plugin": [
    ["opencode-bifrost-plugin", { "baseUrl": "https://bifrost.example.com", "apiKey": "your-virtual-key" }]
  ]
}
```

These are only used as a fallback for whichever of `BIFROST_BASE_URL`/`BIFROST_API_KEY` isn't set — env vars always take precedence. Prefer env vars when you can, since `opencode.json` is often committed to source control and a virtual key checked in there will end up in your repo's history.

### Discovery cadence

This plugin discovers models **once per plugin load** — v2 `setup`, v1 `config`. Restart opencode (or reload its config) to pick up newly added or removed Bifrost models.

## Context size resolution

Not every Bifrost provider reports `context_length`/`max_input_tokens` (its OpenRouter passthrough does; providers like Ollama, Cloudflare Workers AI, or custom OpenAI-compatible ones typically don't). When Bifrost doesn't know, the plugin tries, in order:

1. **Bifrost's own metadata** — used as-is when present.
2. **Cross-referencing other providers in the same Bifrost instance** — if the exact same model is also served by another configured provider that *does* report metadata (e.g. Moonshot's Kimi K3 via both OpenRouter and a second passthrough provider), that value is reused.
3. **Bifrost's public model registry** (`getbifrost.ai/datasheet`) — a best-effort lookup by base model name, cached locally on disk (location follows OS convention) and refreshed every 24h. For locally-hosted models it reports the model's architectural max, not necessarily what your server is actually configured to allow.
4. **A `contextSizeOverrides` plugin option** — your own correction, keyed by exact model id (e.g. `"ollama/llama3.1"`) or provider prefix (e.g. `"ollama"`), value in tokens.
5. **A conservative default** (4096) if none of the above resolve.

To set overrides, pass them as plugin options in `opencode.json`:

```json
{
  "plugins": [
    { "package": "opencode-bifrost-plugin", "options": { "contextSizeOverrides": { "ollama": 8192, "ollama/llama3.1": 16384 } } }
  ]
}
```

On opencode v1, use the array form (`["opencode-bifrost-plugin", { "contextSizeOverrides": { ... } }]`).

## Development

```sh
npm install
npm run build   # or: npm run watch
npm test
```

To try local changes against a real opencode install before publishing, run `npm run build` and point `opencode.json` at this directory instead of the npm package name — `{ "plugins": ["/path/to/opencode-bifrost-plugin"] }` on v2, `{ "plugin": ["/path/to/opencode-bifrost-plugin"] }` on v1. See opencode's plugin docs ([v2](https://opencode.ai/v2/docs/plugins/), [v1](https://opencode.ai/docs/plugins/)).

### Supporting two opencode versions

`src/index.ts` default-exports one object carrying both APIs: `setup()` (v2) and `server()` (v1). opencode v2 reads `id` + `setup` and ignores `server`; opencode v1 calls `server()` and uses the hooks it returns. The two share connection handling (`connection.ts`), discovery (`bifrostClient.ts`), and context-size resolution (`modelMapping.ts`), then diverge only in how a provider is described:

| | opencode v1 | opencode v2 |
| --- | --- | --- |
| Entry | `server()` → `config` hook | `setup(ctx)` |
| Registration | mutate `cfg.provider.bifrost` | `ctx.provider.transform(editor => editor.add(...))` |
| Provider package | `npm: "@ai-sdk/openai-compatible"` | `package: "@opencode/ai/providers/openai-compatible"` |
| Connection | `options: { baseURL, apiKey }` | `settings: { baseURL, apiKey }` |
| Model shape | `tool_call` / `attachment` / `modalities` | `capabilities: { tools, input, output }` |

Releases are published to npm automatically on version tags — see [.github/PUBLISHING.md](.github/PUBLISHING.md) for the release process and one-time trusted-publishing bootstrap.

## See also

[vs-code-bifrost-provider](https://github.com/Yeti47/vs-code-bifrost-provider) — the same idea for VS Code Copilot Chat, if you use that instead of (or alongside) opencode.
