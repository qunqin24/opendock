# Bifrost opencode Plugin

An [opencode](https://opencode.ai) plugin that registers a self-hosted [Bifrost](https://github.com/maximhq/bifrost) gateway as an LLM provider, with automatic model and context-window discovery from Bifrost's `/v1/models` endpoint — no per-model configuration required.

## Setup

1. Add the plugin to your `opencode.json`:

   ```json
   {
     "plugin": ["opencode-bifrost-plugin"]
   }
   ```

2. Set your Bifrost connection via environment variables:

   ```sh
   export BIFROST_BASE_URL=https://bifrost.example.com
   export BIFROST_API_KEY=your-virtual-key
   ```

3. Start (or restart) opencode. Bifrost's models will appear under the `bifrost` provider.

### Why environment variables instead of `opencode auth login`?

opencode plugins get one hook that runs early enough to inject a fully-formed provider before opencode reads its config (`config`), but that hook has no way to read back a credential stored via opencode's interactive `/connect`/auth flow — the plugin SDK client only exposes `auth.set`, never `auth.get`. Environment variables are therefore the recommended way for this plugin to discover models automatically. If neither `BIFROST_BASE_URL` nor `BIFROST_API_KEY` is set, the plugin does nothing and leaves your config untouched.

### Alternative: `baseUrl`/`apiKey` plugin options

If you can't set environment variables for your opencode setup, you can instead pass `baseUrl` and `apiKey` via the plugin's array form in `opencode.json`:

```json
{
  "plugin": [
    ["opencode-bifrost-plugin", { "baseUrl": "https://bifrost.example.com", "apiKey": "your-virtual-key" }]
  ]
}
```

These are only used as a fallback for whichever of `BIFROST_BASE_URL`/`BIFROST_API_KEY` isn't set — env vars always take precedence. Prefer env vars when you can, since `opencode.json` is often committed to source control and a virtual key checked in there will end up in your repo's history.

### Discovery cadence

This plugin discovers models **once per opencode startup/config load**, since that's when the `config` hook runs. Restart opencode (or reload its config) to pick up newly added or removed Bifrost models.

## Context size resolution

Not every Bifrost provider reports `context_length`/`max_input_tokens` (its OpenRouter passthrough does; providers like Ollama, Cloudflare Workers AI, or custom OpenAI-compatible ones typically don't). When Bifrost doesn't know, the plugin tries, in order:

1. **Bifrost's own metadata** — used as-is when present.
2. **Cross-referencing other providers in the same Bifrost instance** — if the exact same model is also served by another configured provider that *does* report metadata (e.g. Moonshot's Kimi K3 via both OpenRouter and a second passthrough provider), that value is reused.
3. **Bifrost's public model registry** (`getbifrost.ai/datasheet`) — a best-effort lookup by base model name, cached locally on disk (location follows OS convention) and refreshed every 24h. For locally-hosted models it reports the model's architectural max, not necessarily what your server is actually configured to allow.
4. **A `contextSizeOverrides` plugin option** — your own correction, keyed by exact model id (e.g. `"ollama/llama3.1"`) or provider prefix (e.g. `"ollama"`), value in tokens.
5. **A conservative default** (4096) if none of the above resolve.

To set overrides, use the plugin's array form in `opencode.json`:

```json
{
  "plugin": [
    ["opencode-bifrost-plugin", { "contextSizeOverrides": { "ollama": 8192, "ollama/llama3.1": 16384 } }]
  ]
}
```

## Development

```sh
npm install
npm run build   # or: npm run watch
npm test
```

To try local changes against a real opencode install before publishing, point `opencode.json`'s `plugin` entry at this directory instead of the npm package name (see opencode's [plugin docs](https://opencode.ai/docs/plugins/) for the local-plugin path syntax).

Releases are published to npm automatically on version tags — see [.github/PUBLISHING.md](.github/PUBLISHING.md) for the release process and one-time trusted-publishing bootstrap.

## See also

[vs-code-bifrost-provider](https://github.com/Yeti47/vs-code-bifrost-provider) — the same idea for VS Code Copilot Chat, if you use that instead of (or alongside) opencode.
