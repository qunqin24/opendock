# devin-opencode-provider

Use [Devin](https://devin.ai) subscription models from [OpenCode](https://opencode.ai) and compatible coding agents by speaking Devin's Connect-RPC agent protocol.

This project is a custom **AI SDK provider** (`LanguageModelV3`) plus an **OpenCode plugin** that handles authentication and model discovery. Instead of calling a generic chat-completions API, it encodes and decodes Devin's protobuf agent protocol over HTTP/2 to Devin's agent backend.

> **Status:** Usable end-to-end for authentication, model discovery, streaming, and tools. See [Known limitations](#known-limitations).

## Demo

OpenCode driving a Devin-routed model through this provider:

![OpenCode running a model via devin-opencode-provider](https://raw.githubusercontent.com/oakimov/devin-opencode-provider/master/assets/screenshot.png)

## Features

- **OpenCode integration** — registers a `devin` provider with auth hooks and cached model list (classic 1.x plugin, plus a dedicated [OpenCode 2.0](docs/opencode-2.md) entry)
- **Authentication** — browser OAuth (PKCE), or API key from [devin.ai/settings](https://devin.ai/settings)
- **Model discovery** — fetches available models from Devin's API and caches them locally
- **Image input** — advertises vision only for supported models and forwards OpenCode image attachments to Devin
- **Streaming** — bidirectional Connect-RPC chat with token usage tracking
- **Tool calls** — maps Devin tool messages to AI SDK / OpenCode tool-call parts
- **Safe file reads** — strips OpenCode 1.x/2.0 read wrappers, preserves truncation meaning, and refuses whole-file writes copied from partial reads
- **Thinking / reasoning** — surfaces extended-thinking deltas where the model supports it

## Requirements

- [Bun](https://bun.sh) (for development and tests)
- [OpenCode](https://opencode.ai)
- An active Devin account with API access

## Installation

This package is one plugin with host-specific entrypoints. Use the guide for your OpenCode major version:

| Host | Guide |
|------|--------|
| **OpenCode 1.x** | This section — classic `plugin` plus optional 1.18 `plugin/v2` |
| **OpenCode 2.0** | [docs/opencode-2.md](docs/opencode-2.md) — `plugin/opencode2` only |

Do not load the 1.x and 2.0 entrypoints in the same host.

OpenCode 1.x (`~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["devin-opencode-provider"]
}
```

OpenCode 2.0 (prefer a dedicated `OPENCODE_CONFIG_DIR`):

```json
{
  "plugin": ["devin-opencode-provider/plugin/opencode2"]
}
```

### From npm / bun

```bash
npm install devin-opencode-provider
# or: bun add devin-opencode-provider
```

Pin a version if you want: `devin-opencode-provider@0.1.5`.

### From a local clone

```bash
git clone https://github.com/oakimov/devin-opencode-provider.git
cd devin-opencode-provider
bun install
bun run build
```

Point OpenCode 1.x config at the built files with absolute `file://` URLs:

```json
{
  "plugin": ["file:///absolute/path/to/devin-opencode-provider/dist/plugin.js"],
  "provider": {
    "devin": {
      "npm": "file:///absolute/path/to/devin-opencode-provider/dist/index.js",
      "name": "Devin",
      "models": {}
    }
  }
}
```

For OpenCode 2.0 local development, see [docs/opencode-2.md](docs/opencode-2.md#from-a-local-clone-devin_opencode2_dev_entry).

## OpenCode setup

Host config, auth commands, and local-clone wiring differ by major version — follow [OpenCode 2.0](docs/opencode-2.md) for 2.0-specific details.

### Authenticate

| Host | How |
|------|-----|
| **OpenCode 1.x** | `opencode auth login` → **devin** |
| **OpenCode 2.0** | `/connect` → **Devin** (see [docs/opencode-2.md](docs/opencode-2.md#authenticate)) |

Then choose a method:

| Method | Description |
|--------|-------------|
| **Devin account (browser login)** | PKCE OAuth — opens devin.ai to sign in |
| **API key** | Paste a key from [devin.ai/settings](https://devin.ai/settings) |

After login, the plugin fetches your available models and writes them to `<host-cache>/devin-models.json`. On later startups, a missing, empty, or expired cache is refreshed during config load when Devin auth is available. `DEVIN_API_KEY` / `WINDSURF_API_KEY` are also picked up automatically for auth without `/connect`.

### Paths (host cache)

Model/version caches and Devin project metadata live under a **host cache root**, resolved in this order:

1. Explicit `createDevin({ cacheDir })` / host API cache override
2. Native OpenCode: `$XDG_CACHE_HOME/opencode`, otherwise `~/.cache/opencode`

| Kind | Default (OpenCode) | Notes |
|------|--------------------|-------|
| Model and version **cache** | `~/.cache/opencode/` | |
| OpenCode **auth** (`auth.json`) | `~/.local/share/opencode/` | `$XDG_DATA_HOME/opencode/` when set |
| OpenCode **config** (AGENTS, skills, …) | `~/.config/opencode/` | |

### Select a model

Devin discovery returns many flat wire ids (`claude-opus-5-max`, `swe-1-7-lightning-medium`, …). This provider collapses them into **one OpenCode model id per family** with **parameter-only variants**. Pick the base id, then a variant:

```bash
# Effort ladder (Claude Opus 5): Low, Low Fast, Medium, …, Max, Max Fast
opencode run --model devin/claude-opus-5 --variant Max "Hello from Devin via OpenCode"

# SWE-1.7: Medium, Max, Lightning Medium, Lightning Max
opencode run --model devin/swe-1-7 --variant Max "Refactor this module"
opencode run --model devin/swe-1-7 --variant "Lightning Max" "Quick fix"

# Flat / unsuffixed ids still work when Devin only exposes one member
opencode run --model devin/swe-1-6-slow "Hello from Devin via OpenCode"
```

In the TUI: choose `devin/<base-id>`, then open the variant picker.

#### Variants

Devin models often expose parameterized variants (effort, thinking, fast, context tier, …). The plugin materializes those as OpenCode **model variants**. In the TUI, pick one from the variant dialog or cycle with OpenCode's `variant_cycle` keybind (default `ctrl+t`).

The selected variant's Devin parameter map is forwarded on the request (isolated under `providerOptions.devin.devinVariantParameters` so unrelated OpenCode options are not leaked onto the wire). The provider validates that explicit selection against the current cached tuple; malformed, reordered, or stale selections fail clearly instead of silently falling back to another variant.

#### 1M / long context

OpenCode's context limit is static per model entry, while Devin's long-context tier is a variant parameter (`context=1m`). When a model has both a base tier and a `1m` tier, the plugin emits a separate OpenCode entry `<model-id>-1m` (for example `claude-opus-4-6-1m`) with:

- `limit.context` set to the 1M window (so overflow checks and compaction match the tier)
- `limit.output` set to `128000` (max generation tokens — not the context window; base entries use `32000`)
- only the long-context variants in its picker
- the real Devin model id carried in `options.devinModelId` (not `config.id`, which would make OpenCode merge base variants into the 1M entry)

The request still uses Devin's original model id; OpenCode's synthetic `-1m` id is only for picking and limits.

#### Max vs Cursor Max Mode

**Max** here is a high-**effort** variant (`effort=max`), not Cursor's IDE **Max Mode** toggle (which sets wire `max_mode` and unlocks long-context tiers). Devin has no equivalent Max Mode flag in this catalog. Longer context is a **separate base id** when Devin exposes it (for example `devin/claude-opus-4-6-1m` with `Thinking` / `No Thinking`).

| OpenCode selection | Variant params | Typical Devin wire id |
|--------------------|----------------|------------------------|
| `devin/claude-opus-5` + `Max` | `effort=max` | `claude-opus-5-max` |
| `devin/claude-opus-5` + `Max Fast` | `effort=max`, `fast=true` | `claude-opus-5-max-fast` |
| `devin/swe-1-7` + `Lightning Max` | `lightning=true`, `effort=max` | `swe-1-7-lightning` (alias) |

#### Image input

The provider advertises `text` + `image` input only when the selected Devin model supports images; model output remains text. This works in the classic plugin, the 1.18 v2 plugin, and OpenCode 2.0.

Image support is resolved from Devin's `AvailableModels.supportsImages` metadata. OpenCode image file parts are decoded from bytes, base64/data URLs, local file URLs, or HTTP(S) URLs and sent through Devin's message fields. Attachments are limited to 20 MiB total, matching OpenCode's desktop attachment budget. PDF, audio, and video inputs are not advertised or silently discarded.

## Programmatic usage

```ts
import { createDevin } from "devin-opencode-provider"

const devin = createDevin({
  name: "devin",
  accessToken: process.env.DEVIN_ACCESS_TOKEN,
  apiKey: process.env.DEVIN_API_KEY,
  // apiBaseURL: "https://api.devin.ai",
  // cacheDir: "/path/to/host/cache",
})

const model = devin.languageModel("swe-1-6-slow")
// model implements AI SDK LanguageModelV3 (doStream / doGenerate)
```

Pass either `accessToken` (JWT from OAuth or key exchange) or `apiKey` (raw key). Optional: `apiBaseURL`, `cacheDir`, `headers`, `workspaceRoot`. You can also set `DEVIN_API_KEY` as an environment variable instead of passing `apiKey`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `DEVIN_API_KEY` | Devin API key (sk-ws-01-..., cog_..., or devin-session-token$...) for auth without `/connect` |
| `WINDSURF_API_KEY` | Alias for DEVIN_API_KEY (for Windsurf compatibility) |
| `DEVIN_API_BASE_URL` | Override API base URL (default `https://api.devin.ai`) |
| `DEVIN_PROVIDER_SHOW_DISABLED` | Set to `1` / `true` to include plan-disabled cascade models in the catalog (useful for debugging Pro vs full lists) |
| `DEVIN_PROVIDER_DEBUG` | Set to `1` or `true` to enable wire-level debug logging |
| `DEVIN_PROVIDER_DEBUG_FILE` | Override debug log path (default: `$TMPDIR/devin-provider-logs-<uid>/debug-<pid>.log`) |
| `DEVIN_OPENCODE2_DEV_ENTRY` | **Local OpenCode 2.0 only.** Absolute path to a built entry file (usually `dist/index.js`). Rewrites the AI SDK package to `aisdk:file://…` so the daemon imports your local build instead of `npm install`-ing the published package. Export它 **before** `opencode2 service start`, then restart after rebuilds. Unset in production. See [OpenCode 2.0 local clone](docs/opencode-2.md#from-a-local-clone-devin_opencode2_dev_entry). |
| `DEVIN_OPENCODE2_TODOS` | **OpenCode 2.0 only.** Set to `1` or `true` to register plugin-owned `todowrite`/`todoread` (in-memory; no TUI sidebar). Off by default. OpenCode 1.x still uses the host builtin. |
| `XDG_CACHE_HOME` | Base for host cache dirs (`$XDG_CACHE_HOME/opencode/`) |
| `XDG_DATA_HOME` | When set, OpenCode `auth.json` is read from `$XDG_DATA_HOME/opencode/` instead of `~/.local/share/opencode/` |

## Development

```bash
bun install          # install dependencies
bun run build        # compile TypeScript → dist/
bun run typecheck    # type-check without emit
bun test             # run unit tests
```

## Architecture

```
OpenCode
  └── DevinPlugin (auth, model cache, config hook)
        └── createDevin() → LanguageModelV3
              ├── language-model.ts  AI SDK adapter
              ├── protocol/   protobuf messages, framing
              └── auth.ts     PKCE OAuth, API key exchange
```

| Module | Role |
|--------|------|
| `src/plugin.ts` | OpenCode hooks: provider registration, OAuth, API key exchange |
| `src/plugin-core.ts` | Host-neutral SDK factory, API base resolution |
| `src/model-config.ts` | Flat Devin models → OpenCode bases + parameter-only variants |
| `src/index.ts` | `createDevin` factory; default export is `DevinPlugin` |
| `src/language-model.ts` | AI SDK `LanguageModelV3` adapter (`doStream`, `doGenerate`) |
| `src/auth.ts` | PKCE OAuth, API key exchange, JWT refresh |
| `src/models.ts` | Model discovery and `devin-models.json` cache |
| `src/protocol/` | Protobuf encode/decode, chat framing, usage parsing |
| `src/plugin-opencode2.ts` | OpenCode 2.0 plugin (`{ id, setup, server }`) |

## Package exports

| Import path | Export |
|-------------|--------|
| `devin-opencode-provider` | `createDevin`, `DevinPlugin` (named + default) |
| `devin-opencode-provider/plugin` | `DevinPlugin` (classic OpenCode 1.x Hooks) |
| `devin-opencode-provider/plugin/v2` | OpenCode 1.18 Promise v2 plugin |
| `devin-opencode-provider/plugin/opencode2` | OpenCode 2.0 plugin (`{ id, setup, server }`) |
| `devin-opencode-provider/server` | Same module as `plugin/opencode2` (Host.resolve) |

The package root intentionally stays plugin-safe for OpenCode's classic loader. OpenCode 2.0: see [docs/opencode-2.md](docs/opencode-2.md).

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| No Devin models in the picker (OpenCode 1.x) | Confirm Devin auth (`opencode auth login` → **devin**). Restart OpenCode — if auth is present and the cache is empty, models are fetched on startup. Confirm `provider.devin.npm` is the package name (or a built `file://…/dist/index.js`). |
| No Devin models in the picker (OpenCode 2.0) | Confirm `/connect` → **Devin** (or shared `auth.json`). Use a dedicated `OPENCODE_CONFIG_DIR` (not mixed with 1.x). Ensure `$OPENCODE_CONFIG_DIR/plugins/devin/` is a package directory re-exporting `plugin/opencode2` (not a bare `.js`). After auth, Devin models appear in the picker from the in-memory inventory — no `opencode.json` model list is required. Filter by provider **Devin** (`time.released` is not `0`, but models may sort lower). See [docs/opencode-2.md](docs/opencode-2.md). |
| Auth / 401 errors mid-session | Re-login. OAuth and exchanged API-key JWTs refresh automatically when near expiry; a revoked refresh token needs a fresh login. |
| Local OpenCode 2.0 still runs the published package | Set `DEVIN_OPENCODE2_DEV_ENTRY` to an absolute `…/dist/index.js` path **before** starting the daemon, persist it with `opencode2 service set env DEVIN_OPENCODE2_DEV_ENTRY …`, rebuild (`bun run build`), then `opencode2 service restart`. Loading only `dist/plugin-opencode2.js` is not enough — without the env var, 2.0 still `npm install`s the published package into the host cache. |
| Empty or stale model list / wrong variant order | Fully **restart** the OpenCode TUI after `bun run build` (long-lived processes keep the old plugin). Delete `<host-cache>/devin-models.json` (default `~/.cache/opencode/`) only if discovery itself is stale. Existing Devin auth is enough to refill the cache; re-login only if auth itself is broken. Set `DEVIN_PROVIDER_SHOW_DISABLED=1` if your plan hides most models. |
| Need wire-level logs | Set `DEVIN_PROVIDER_DEBUG=1` (optional `DEVIN_PROVIDER_DEBUG_FILE`; the default is `debug-<pid>.log` under `$TMPDIR/devin-provider-logs-<uid>/`) and reproduce the issue. |

## Security

Project `instructions` may reference absolute or `~/` paths (OpenCode parity). See [SECURITY.md](./SECURITY.md) for the trust model and `OPENCODE_DISABLE_PROJECT_CONFIG`.

## Known limitations

- **Personal use / ToS** — this provider speaks Devin's private agent protocol. Use only with an account you own; Devin may change or restrict the API without notice.
- **Token usage tracking** — usage counts are extracted from Devin's protocol frames (`ModelUsageStats` / `ResponseStatistics`) and mapped to AI SDK `LanguageModelV3Usage`. Cache-read/write metrics are available when Devin provides them.
- **Max vs Cursor Max Mode** — There is no Cursor-style Max Mode toggle; **Max** = high effort only. Longer context is a separate base id (`-1m`), not a Max Mode flag.

## License

MIT
