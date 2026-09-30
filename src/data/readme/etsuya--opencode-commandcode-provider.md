# @etsuya/opencode-commandcode-provider

[Command Code](https://commandcode.ai) provider for [opencode](https://opencode.ai), built on Command Code's **Provider API**.

> **Disclaimer:** This is an unofficial, community-maintained integration. It is not affiliated with, endorsed by, or supported by Command Code. You need your own Command Code account and API key or subscription; Command Code's terms, availability and pricing apply.

## Why this plugin

- **Zero runtime dependencies.** Nothing to install but the plugin itself. No bun, no test framework, no bundler, no vendored SDK.
- **No protocol code of its own.** SSE parsing, tool calls, reasoning blocks and image parts are delegated to opencode's own AI SDK adapters. There is no request-conversion layer and no hand-written streaming parser to keep in sync.
- **The whole catalog, not a snapshot.** Every model Command Code offers, each with its exact context window, effort levels, vision support and advertised price. See [docs/models.md](docs/models.md).
- **Self-refreshing.** The model list is fetched from the live public catalog endpoint at startup, cached for 6 hours, and replayed into a running opencode with `/commandcode-refresh` — no restart required. The embedded snapshot is only a fallback, so starting opencode never blocks on a network request.
- **Plan-aware instead of plan-guessing.** Command Code gates models server-side. This provider registers the whole catalog and labels the gated ones (`GPT-5.5 (Pro+)`), passing the server's rejection message through verbatim — it never infers your plan from local files, tokens or API probing. Declare a plan in the config and the picker filters for you.
- **Bring the key you already have.** `COMMANDCODE_API_KEY`, `/connect` in opencode, the key opencode already stored for Command Code, or the CLI's own `auth.json` files. All four work; re-authentication is never required.
- **Every knob is overridable.** Ten options, each with a matching environment variable, including an `offline` mode for air-gapped use.

Design rationale — why this targets the Provider API instead of the CLI, and how reasoning is wired up — is in [docs/design.md](docs/design.md).

**Not supported:** the Go plan. Go accounts are not offered Provider API access, and this package deliberately does not fall back to the CLI transport.

## Install

```bash
opencode plugin add @etsuya/opencode-commandcode-provider
```

`opencode plugin add` accepts npm registry packages and Git specifiers, and writes the entry to your global configuration. A **local checkout is not accepted** — `plugin add` rejects paths — so a checkout is added by hand:

```json
{
  "plugins": ["D:/path/to/opencode-commandcode-provider"]
}
```

A checkout has to be built first (`npm run build`): the package entry points resolve to `dist/`, which is what npm publishes. Anything under `.opencode/plugins/` in a project is loaded without configuration — and loads the TypeScript sources directly, no build required — which is handy while developing the plugin itself.

That is the whole configuration. The plugin declares the `commandcode` provider, its base URL, and every model at startup — you do not need a `provider` block.

## Connect

Either set the environment variable:

```bash
export COMMANDCODE_API_KEY="user_..."
```

or run `/connect` in opencode, search for **Command Code**, and paste a key.

If you already connected with an earlier Command Code plugin, the key opencode stored for the `commandcode` integration is reused as-is — no re-authentication needed. When no environment variable is set, existing credentials are also picked up from the CLI's own auth files (`~/.commandcode/auth.json`, `~/.pi/agent/auth.json`, `~/.omp/agent/auth.json`); set `COMMANDCODE_AUTH_FILE=0` to disable that fallback.

## Model catalog

Three sources, in decreasing order of freshness:

1. **live** — `GET /provider/v1/models`. Public (no auth needed) and plan-independent: it always returns the whole catalog. It owns the model *list* and the exact context window.
2. **cache** — `~/.cache/opencode/commandcode-models.json`. A cache younger than 6 hours short-circuits the network entirely, so starting opencode never waits on a request. A stale cache is refreshed at startup; if the refresh fails it is used anyway.
3. **snapshot** — `src/catalog.generated.ts`, regenerated from the CLI package's own documentation. It owns pricing, reasoning capability, selectable effort levels, vision support and plan gating, none of which the API exposes.

A model is never dropped for lacking metadata. When the API lists a model the snapshot has not seen yet, it is registered with honest defaults (cost 0, text-only) and reported by `commandcode-models refresh`.

Refresh the cache without waiting for a restart — from the shell:

```bash
commandcode-models refresh        # fetch the live catalog into the cache
commandcode-models status         # cache path, age, model counts
commandcode-models list           # print the merged catalog
commandcode-models print-catalog  # emit the catalog that gets registered, as JSON
```

or from inside opencode:

```
/commandcode-refresh
```

The slash command fetches the live catalog, stores it, and calls `provider.reload()` — the documented way to replay a plugin's transforms — which republishes the models to the running instance, with the outcome shown as a terminal toast. Deleting the cache file has the same effect as `refresh`.

The CLI ships with the package. In a checkout, `npm run build` then `npm link` puts `commandcode-models` on your `PATH`.

## Plans

Command Code gates models per plan, and the gate is enforced **per model by the server**: asking for a model above your plan returns

```
403 MODEL_NOT_IN_PLAN: GPT-5.5 available in Pro and above plans or extra on demand usage
```

A plan must never be inferred from local files, tokens or API probing, and the models endpoint does not filter by plan either. So this provider registers the whole catalog by default, appends the required tier to gated model names (e.g. `GPT-5.5 (Pro+)`), and passes the server's message through unchanged when a request is rejected.

If you know your plan, declare it and the gated models are filtered out instead:

```json
{
  "plugins": [{ "package": "@etsuya/opencode-commandcode-provider", "options": { "plan": "goat" } }]
}
```

That filters by the documented minimum plan. It is a convenience, not a security boundary — the server is still the authority. Per-plan reach counts and the full tier breakdown are in [docs/models.md](docs/models.md).

## Options

Plugin options are passed in the `options` field of the plugin entry, and every one of them also has an environment variable.

| Option | Env | Default | Meaning |
|---|---|---|---|
| `baseURL` | `COMMANDCODE_API_BASE` | `https://api.commandcode.ai/provider/v1` | Provider API base |
| `modelsUrl` | `COMMANDCODE_MODELS_URL` | `<baseURL>/models` | Catalog endpoint |
| `cachePath` | `COMMANDCODE_MODELS_CACHE` | `~/.cache/opencode/commandcode-models.json` | Cache location |
| `timeoutMs` | `COMMANDCODE_MODELS_TIMEOUT_MS` | `5000` | Catalog request timeout |
| `ttlMs` | `COMMANDCODE_MODELS_TTL_MS` | `21600000` (6h) | Cache freshness window |
| `offline` | `COMMANDCODE_MODELS_OFFLINE` | `false` | Never touch the network |
| `plan` | `COMMANDCODE_PLAN` | unset | Filter models above this plan |
| `planHint` | `COMMANDCODE_PLAN_HINT` | `true` without a plan | Append `(Pro+)` style suffixes |
| `includeDeprecated` | `COMMANDCODE_INCLUDE_DEPRECATED` | `false` | Keep retired models in the picker |
| `authFileFallback` | `COMMANDCODE_AUTH_FILE` | `true` | Read a key from the CLI auth files when no env var is set |

## Development

No bun, no test framework, no bundler — Node 22.18+ strips types and runs the tests straight from the sources. The one build step exists for the published artifact only: Node refuses to strip types under `node_modules`, so npm gets compiled `dist/` while the checkout keeps running `index.ts` untouched.

```bash
npm run build      # tsc -p tsconfig.build.json → dist/ (what npm publishes)
npm test           # node --test
npm run typecheck  # tsc --noEmit
npm run smoke      # end-to-end test against a real opencode + a local mock API
npm run sync       # regenerate src/catalog.generated.ts from command-code@latest
npm run sync:check # fail when the snapshot drifts (CI)
npm run models     # regenerate docs/models.md
```

The smoke-test contract, the `PWD`/stdin harness gotchas, and how `sync` reads the CLI package are documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
