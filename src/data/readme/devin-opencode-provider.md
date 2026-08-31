# devin-opencode-provider

Use [Devin](https://devin.ai) subscription models from [OpenCode](https://opencode.ai) and compatible coding agents by speaking Devin's Connect-RPC agent protocol.

This project is a custom **AI SDK provider** (`LanguageModelV3`) plus an **OpenCode plugin** that handles authentication and model discovery. Instead of calling a generic chat-completions API, it encodes and decodes Devin's protobuf agent protocol over HTTP/2 to Devin's agent backend.

> **Status:** Usable end-to-end for authentication, model discovery, streaming, and tools. See [Known limitations](#known-limitations).

## Demo

OpenCode driving a Devin-routed model through this provider:

![OpenCode running a model via devin-opencode-provider](https://raw.githubusercontent.com/oakimov/devin-opencode-provider/master/assets/screenshot.png)

## Features

- **OpenCode integration** — registers a `devin` provider with auth hooks and cached model list
- **Authentication** — browser OAuth (PKCE), or API key from [devin.ai/settings](https://devin.ai/settings)
- **Model discovery** — fetches available models from Devin's API and caches them locally
- **Streaming** — bidirectional Connect-RPC chat with token usage tracking
- **Tool calls** — maps Devin tool messages to AI SDK / OpenCode tool-call parts
- **Thinking / reasoning** — surfaces extended-thinking deltas where the model supports it

## Requirements

- [Bun](https://bun.sh) (for development and tests)
- [OpenCode](https://opencode.ai)
- An active Devin account with API access

## Installation

### From npm

Add the package to OpenCode config. OpenCode installs npm plugins with Bun at startup (cached under `~/.cache/opencode/node_modules/`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["devin-opencode-provider"],
  "provider": {
    "devin": {
      "npm": "devin-opencode-provider",
      "name": "Devin",
      "models": {}
    }
  }
}
```

Pin a version if you want: `"devin-opencode-provider@0.1.0"`.

You can also install it yourself first:

```bash
npm install devin-opencode-provider
# or: bun add devin-opencode-provider
```

### From a local clone

```bash
git clone https://github.com/yourusername/devin-opencode-provider.git
cd devin-opencode-provider
bun install
bun run build
```

Point OpenCode config at the built files with absolute `file://` URLs:

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

## OpenCode setup

If the `devin` provider block is omitted, the plugin auto-registers it on startup (as **Devin Integration**) using this package's entry. Model entries come from the local cache, which is filled after auth and again on startup when the cache is empty but credentials remain.

### Authenticate

```bash
opencode auth login
```

Choose the **devin** provider, then one of:

| Method | Description |
|--------|-------------|
| **Devin account (browser login)** | PKCE OAuth — opens devin.ai to sign in |
| **API key** | Paste a key from [devin.ai/settings](https://devin.ai/settings) |

After login, the plugin fetches your available models and writes them to `<host-cache>/devin-models.json`. On later startups, a missing, empty, or expired cache is refreshed during config load when Devin auth is available. `DEVIN_API_KEY` is also picked up automatically for auth without `/connect`.

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

Devin discovery returns many flat wire ids (`claude-opus-5-max`, `swe-1-7-lightning-medium`, …). This provider collapses them into **one OpenCode model id per family** with **parameter-only variants** (Cursor-shaped catalog). Pick the base id, then a variant:

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

#### Max vs Cursor Max Mode

**Max** here is a high-**effort** variant (`effort=max`), not Cursor’s IDE **Max Mode** toggle (which sets wire `max_mode` and unlocks long-context tiers). Devin has no equivalent Max Mode flag in this catalog. Longer context is a **separate base id** when Devin exposes it (for example `devin/claude-opus-4-6-1m` with `Thinking` / `No Thinking`).

| OpenCode selection | Variant params | Typical Devin wire id |
|--------------------|----------------|------------------------|
| `devin/claude-opus-5` + `Max` | `effort=max` | `claude-opus-5-max` |
| `devin/claude-opus-5` + `Max Fast` | `effort=max`, `fast=true` | `claude-opus-5-max-fast` |
| `devin/swe-1-7` + `Lightning Max` | `lightning=true`, `effort=max` | `swe-1-7-lightning` (alias) |

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
| `XDG_CACHE_HOME` | Base for host cache dirs (`$XDG_CACHE_HOME/opencode/`) |
| > `XDG_DATA_HOME` | When set, OpenCode `auth.json` is read from `$XDG_DATA_HOME/opencode/` instead of `~/.local/share/opencode/` |

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
| `src/model-config.ts` | Flat Devin models → Cursor-shaped OpenCode bases + parameter-only variants |
| `src/index.ts` | `createDevin` factory; default export is `DevinPlugin` |
| `src/language-model.ts` | AI SDK `LanguageModelV3` adapter (`doStream`, `doGenerate`) |
| `src/auth.ts` | PKCE OAuth, API key exchange, JWT refresh |
| `src/models.ts` | Model discovery and `devin-models.json` cache |
| `src/protocol/` | Protobuf encode/decode, chat framing, usage parsing |

## Package exports

| Import path | Export |
|-------------|--------|
| `devin-opencode-provider` | `createDevin`, `DevinPlugin` (named + default) |
| `devin-opencode-provider/plugin` | `DevinPlugin` (classic Hooks — auth) |

The package root intentionally stays plugin-safe for OpenCode's classic loader.

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| No Devin models in the picker | Confirm Devin auth (`opencode auth login` → **devin**). Restart OpenCode — if auth is present and the cache is empty, models are fetched on startup. Confirm `provider.devin.npm` is the package name (or a built `file://…/dist/index.js`). |
| Auth / 401 errors mid-session | Re-login. OAuth and exchanged API-key JWTs refresh automatically when near expiry; a revoked refresh token needs a fresh login. |
| Empty or stale model list / wrong variant order | Fully **restart** the OpenCode TUI after `bun run build` (long-lived processes keep the old plugin). Delete `<host-cache>/devin-models.json` (default `~/.cache/opencode/`) only if discovery itself is stale. Existing Devin auth is enough to refill the cache; re-login only if auth itself is broken. Set `DEVIN_PROVIDER_SHOW_DISABLED=1` if your plan hides most models. |

## Security

Project `instructions` may reference absolute or `~/` paths (OpenCode parity).

## Known limitations

- **Personal use / ToS** — this provider speaks Devin's private agent protocol. Use only with an account you own; Devin may change or restrict the API without notice.
- **Token usage tracking** — usage counts are extracted from Devin's protocol frames (`ModelUsageStats` / `ResponseStatistics`) and mapped to AI SDK `LanguageModelV3Usage`. Cache-read/write metrics are available when Devin provides them.

## License

MIT
