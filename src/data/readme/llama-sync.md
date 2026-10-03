# llama-sync

OpenCode V2 plugin that keeps a **live model inventory** for a llama.cpp
provider: it watches a `llama-server` (router or single-instance) over its
management endpoints and publishes the models — with correct limits,
capabilities, and thinking/reasoning **variants** — to OpenCode
automatically. Add a preset on the service and it appears in `/models`
without touching `opencode.jsonc`.

The service URL is **not** a plugin option. The plugin reads
`settings.baseURL` from the target provider's own config entry (it has to
exist anyway — that's how OpenCode talks to the service), so there is exactly
one source of truth. Provider-level `headers` (e.g. `Authorization` for a
router behind `--api-key`) are forwarded on every request.

## Install

```bash
opencode plugin add llama-sync            # npm
opencode plugin add github:mattzink/llama-sync   # git
```

The CLI adds the bare entry `"plugins": ["llama-sync"]` — that is all
it can express (`plugin add` takes only a package spec, there is no
options flag). That entry is fine as-is only if your provider is named
`llamacpp` (the default `providerID`). Otherwise — or to override any
other option — configure the provider as usual and replace the entry
with the object form:

```jsonc
{
  "providers": {
    "gpuz": {
      "name": "gpuz",
      "package": "aisdk:@ai-sdk/openai-compatible",
      "settings": { "baseURL": "http://host:8080/v1" }
    }
  },
  "plugins": [
    {
      "package": "llama-sync",
      "options": { "providerID": "gpuz" }
    }
  ]
}
```

If models never appear with a bare entry, check the log for
`provider "llamacpp" not found or has no settings.baseURL; plugin is
inert` — the provider name doesn't match and the entry needs the
object form above. **Install via an explicit `plugins` entry only** —
don't move the package directory under `.opencode/plugins/` or another
discovery path, or it will load twice.

**First boot.** The plugin re-seeds the provider from the inventory it
stored on its previous run, so the models are present in `/models`
immediately on restart. On a brand-new install (no stored inventory yet)
the provider starts with no models for up to ~1 s: the plugin activates
before the provider is fully registered, and the first successful
SSE-connect retry (or, without SSE, the first poll) publishes them.

## Options

Resolution order per key: `ctx.options` ▸ `options.jsonc` sibling of
`src/index.ts` (npm installs ship none — copy
[options.example.jsonc](options.example.jsonc) and rename if you use it) ▸
built-in defaults.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `providerID` | string | `"llamacpp"` | Provider key in opencode.jsonc whose inventory is managed; also the entry the plugin reads `settings.baseURL` from |
| `modelsPath` | string | `"/models"` | Appended to the provider's `settings.baseURL` |
| `propsPath` | string | `"/props"` | Props endpoint path, resolved against `settings.baseURL` with a trailing `/v1` stripped (llama.cpp serves `/props` at the root, not under `/v1`) |
| `includeUnloaded` | boolean | `true` | Include router presets with `status.value === "unloaded"` (a service with on-demand loading can serve them); inert on plain single-instance servers |
| `disableUnloaded` | boolean | `false` | Unloaded presets appear but are `enabled: false` (wins over `includeUnloaded: false`; router-only) |
| `refreshMs` | number | `30000` | Poll interval. With SSE active it is the safety net that bounds staleness from missed events; on plain servers (or `sse: false`) it is the sole trigger |
| `sse` | boolean | `true` | Subscribe to the router's `GET /models/sse` and refresh on events. Router mode only — a 404/405 disables it for the plugin's life; reconnects back off 1 s → 60 s with a catch-up refresh |
| `timeoutMs` | number | `5000` | Fetch timeout (models list and every props call) |
| `autoVariants` | boolean | `true` | Derive thinking/reasoning variants from `/props`; if false, variants come only from `overrides` / `defaults.variants` |
| `variantReasoningEfforts` | string[] \| null | `null` | Restrict auto-derived effort variants to a subset (still intersected with what the template actually supports) |
| `noThinkVariant` | boolean | `true` | Append a `no-think` variant when the template supports `enable_thinking` |
| `effortProbe` | boolean | `true` | Run the one-time `POST /apply-template` render probe when a model's template digest is new/changed, so variants reflect what the template *actually* maps (levels that alias the default render as the canonical level; rejected levels are dropped). `false`: static candidate read only |
| `defaults` | object | `{ limit: { context: 160000, output: 32768 }, capabilities: { tools: true }, variants: [] }` | Applied to every discovered model (input/output modalities and auto-variants come from the endpoints, not here) |
| `overrides` | object | `{}` | Keyed by model id: `{ name?, limit?, capabilities?, variants?, extraVariants?, disabled? }` — `variants` **replaces** the derived set; `extraVariants` is **merged** into it |
| `aliases` | object | `{}` | Extra catalog entries aliasing a discovered model (OpenCode `id` ≠ `modelID`). Value: target id (string) or `{ model, name?, limit?, capabilities?, variants?, extraVariants?, disabled? }`. Inherits the target's props-derived values; pruned when the target leaves `/models`; keys colliding with a discovered id are rejected |
| `propsForUnloaded` | `"never" \| "autoload"` | `"never"` | `"never"`: props only for `loaded`/`sleeping` models — the plugin never causes a load. `"autoload"`: fetch props for unloaded models too (router loads them on demand). **Destructive on routers**: a load can LRU-evict the active model (e.g. `max_instances: 1`) — use only knowingly. Inert on plain servers |
| `propsCache` | boolean | `true` | Persist the last-known props projection (whitelisted scalars only) per model id so an unloaded model keeps its previously derived values. Fresh props always win; entries are evicted when the id disappears or its `n_ctx` no longer matches `--ctx-size` in the model's args. `false` disables persistence |

## llama.cpp service notes

**Router vs plain server.** Both work. Router mode additionally reports
`status` (load state), `architecture` (input/output modalities), and serves
the SSE event stream; a plain single-instance server has none of these and
the plugin falls back through the derivation chain (props `modalities` →
defaults; no status → treated as loaded).

**`/props` and the `chat_template` hazard.** The props endpoint returns the
model's raw Jinja `chat_template`. Some templates embed media-placeholder
tags (`__media__`) that look like multimodal media references to the model —
letting the template text reach storage, logs, or an LLM context can poison
agent turns. This plugin reads the template *in place* for a few bounded
signals (SHA-256 digest, `enable_thinking` presence, static reasoning-effort
candidates) and discards it: no template text ever survives the parse
boundary into storage, the inventory, logs, or error messages.

**Change notification.** Routers broadcast model changes on
`GET /models/sse` (no keepalive, no history). The stream is treated as a
*change detector, never a data source*: every event and every (re)connect
triggers a full re-fetch, and the `refreshMs` poll runs unconditionally as a
safety net that bounds worst-case staleness.

**Stream lifetime.** The router sends nothing on an idle stream (no
periodic ping), and client HTTP stacks — and some middleboxes — close idle
connections after a few minutes. When that happens the plugin logs one
warning, reconnects with backoff (1 s → 60 s), and immediately runs a
catch-up refresh; any event missed during the (≤ ~1 s) gap is picked up by
the next `refreshMs` poll, so model changes are never stale for more than
one poll interval.

**Unloaded models and the props cache.** Full props require a running
instance (`autoload=false` + unloaded → 400 by design; defaulting to
`autoload` would load models and, on `max_instances: 1` routers, LRU-evict
the active one — so the default is `"never"`). A model that has ever been
loaded keeps its derived values afterwards, because the last-known props
projection is persisted; only never-loaded presets run on `defaults`. With
`--sleep-idle-seconds`, a sleeping model still answers `/props`, so props
stay fresh through the sleep window.

**If your selected default model is removed from the service inventory**,
OpenCode surfaces `Model unavailable`; the plugin never auto-reselects.

## Development

Toolchain is managed by [mise](https://mise.jdx.dev) (`mise.toml`: Node 26,
pnpm via `packageManager`):

```bash
mise install        # toolchain
pnpm install
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
```

Source layout: `src/discover.ts` (models list), `src/props.ts` (whitelist
props parse + cache helpers), `src/probe.ts` (render probe), `src/sse.ts`
(frame parser, coalescing scheduler, backoff), `src/map.ts` (inventory
construction), `src/options.ts`, `src/hash.ts`, `src/index.ts` (lifecycle).
Tests live in `src/test/` with JSON fixtures (`src/test/fixtures/`).

The repository root has a one-line `index.ts` that re-exports
`./src/index.js`. It exists only because OpenCode resolves *local-directory*
plugin entries to `<dir>/index.*` (it does not read `package.json`
`exports` for that case); npm and git installs resolve through `exports`
and are unaffected by it.

## Publishing

Publishing is automated. Every push to `main` runs the `publish`
workflow, which typechecks, tests, and — on success — publishes
`1.0.<n>` to npm, where `<n>` is the workflow's build number
(`GITHUB_RUN_NUMBER`). The `major.minor` base is read from
`package.json` (currently `1.0.0`); bump it manually to move builds to
a new base (e.g. `1.1.0` → `1.1.<n>`). Builds that fail before
publishing leave gaps in the sequence.

The workflow publishes via npm
[trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC):
each run gets a short-lived token GitHub mints for that specific run of
this specific workflow file — no npm token or repository secret is
stored anywhere. The setup is one-time:

1. Publish the base once from a checkout: `npm login`, then
   `npm publish`. This creates the package, which is required before a
   trusted publisher can be configured.
2. npmjs.com → `llama-sync` → **Package settings → Trusted publishers
   → Add**: GitHub Actions, organization/user `mattzink`, repository
   `llama-sync`, workflow filename `publish.yml` — and tick
   **Allow `npm publish`** (configurations created after 2026-09-03
   default to *staged* publishing only, which would leave every build
   awaiting manual approval).
3. Push to `main`. The first automated release lands as `1.0.1`;
   because the repository is public, npm attaches a provenance
   attestation to each build automatically.

Note: the `repository.url` in `package.json` must keep matching the
GitHub repository exactly — npm validates it against the publisher
configuration.

Pin a specific build with `opencode plugin add llama-sync@1.0.42`. A
manual publish from a checkout is `npm publish` (typecheck and tests
run first via `prepublishOnly`).

## License

[MIT](LICENSE)
