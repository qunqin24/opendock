# A2Way OpenCode Model Refresh

A multi-provider [OpenCode](https://opencode.ai) plugin that reconciles model pickers with
**live provider APIs**, rather than trusting the [models.dev](https://models.dev) catalogue
alone.

Provider-specific behavior lives in small **adapters**. The shared engine handles discovery,
probing, verdict caching, inventory updates and scheduling without knowing which provider it
is talking to.

## Why this exists

OpenCode's model picker can keep models that are withdrawn, unentitled, non-chat, or simply stale
in the provider's live API. This plugin reconciles the picker against the provider's own `/models`
endpoint and probes candidates before offering them, so unavailable models disappear without
removing models that only failed because of a timeout or rate limit.

## Verified adapters

| Adapter | Provider | Dialect handled by the adapter |
| --- | --- | --- |
| `nvidia` | NVIDIA NIM (`integrate.api.nvidia.com`) | Sparse `context_window` / `model_type` metadata; `410 Gone` for withdrawn models; `404` for unentitled endpoints |
| `opencode` | OpenCode hosted inference, free tier | models.dev-shaped metadata; User-Agent required by Cloudflare; free-only candidate selection; `429 FreeUsageLimitError` is not a refusal; region/auth failures are |

## What each reconciliation cycle does

1. Resolve the credential already attached to the provider, in this order:
   - OpenCode's connection store for `integrationID`;
   - `apiKey` in the provider's OpenCode settings.
2. Fetch the provider's `/models` inventory.
3. Probe models whose cached verdict is missing or due for recheck, using a minimal chat
   completion.
4. Rebuild that provider's inventory:

| Evidence | Result |
| --- | --- |
| Listed and not definitely refused | **Offered**, with normalized provider metadata applied |
| Definitely refused | **Removed**, even if models.dev still lists it |
| Unlisted but still answering | **Kept** |
| Timeout, rate limit, 5xx or network failure | **Unchanged** for models already offered; listed models are not removed because of an inconclusive probe |
| Provider unreachable | **Nothing changes** |

Existing catalogue and `opencode.json(c)` entries are reused for metadata when IDs match, so
configured limits, reasoning variants and costs survive. New models receive generic metadata
plus whatever the adapter can normalize.

Refused models are retried after **7 days**. Unlisted-but-working models are rechecked after
**24 hours**. Inconclusive probes are retried on the next cycle and never cause removal.

## Safety against provider dialect mismatches

- The probe first tries `max_tokens: 1`. On HTTP 400 it retries with
  `max_completion_tokens: 1`. Two rejections are **inconclusive**, not evidence that the model
  is gone.
- A cycle in which live models are refused and none succeeds is treated as a possible dialect
  or authentication failure. The last successfully reconciled inventory is restored instead of
  emptying the picker or exposing the provider's raw catalogue.
- A cycle limited to unlisted models is still allowed to remove them; that is how withdrawn
  models disappear.

## Install

From npm:

```bash
opencode plugin add opencode-model-refresh
```

From GitHub:

```bash
opencode plugin add github:a2way-com/opencode-model-refresh
```

Or clone it and point your global `opencode.json(c)` at the directory:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-model-refresh",
      "options": {
        "providers": ["nvidia", "opencode"]
      }
    }
  ]
}
```

OpenCode Desktop loads the slash commands from the prebuilt `./gui-experimental` export.
`dist/gui-experimental.cjs` is tracked in the repository, so GitHub installs do not need a build
step. This is required: OpenCode's plugin installer disables lifecycle scripts
(`ignoreScripts: true`), so a `prepare` build would not run during
`opencode plugin add github:…`. The terminal interface loads `./tui` from source and does not need
this bundle either.

For a local-path checkout, install the dependencies once:

```bash
npm install
```

Only rebuild the GUI bundle when you change `src/gui.tsx` or its imports:

```bash
npm run build
```

Commit the rebuilt bundle with the source change; otherwise GitHub installs keep running the
older commands.

With no `providers` option, the plugin does nothing. Providers are never assumed; this is a
double opt-in.

Each provider needs a usable credential already attached to it. The plugin has no `apiKey` option
and never stores credentials; it reuses OpenCode's connection store for `integrationID`, then
`apiKey` in the provider's OpenCode settings. If none is found, reconciliation is skipped and the
status report records why.

## Options

Each item in `providers` accepts:

| Option | Default | Purpose |
| --- | --- | --- |
| `provider` | Required | OpenCode provider ID whose models are reconciled. |
| `adapter` | Inferred from `provider` | Adapter ID from the registry. Required when reusing an adapter under a different provider ID. |
| `integrationID` | `provider` | Integration used for credential lookup. |
| `reasoningField` | `reasoning_content` | Reasoning field assigned to newly discovered models. |
| `refreshMinutes` | `60` | Refresh interval for this provider. |
| `statusPath` | `~/.local/state/opencode/com.a2way.opencode-model-refresh/<providerID>/models.json` | Last-run report location. |

Every provider gets an independent verdict cache, status file and timer.

### Adapter inference and reuse

Strings are **provider IDs**, not adapter IDs. When the adapter's default provider matches the
provider ID, omit `adapter`:

```jsonc
"providers": ["nvidia", "opencode"]
```

Object form does the same and is useful when you need to override other fields:

```jsonc
"providers": [{ "provider": "nvidia" }, { "provider": "opencode" }]
```

A provider with no matching adapter is skipped with a warning. If `/api/provider` lists a
provider but no adapter claims it, add the binding explicitly or add an adapter.

An **adapter describes a dialect, not one provider instance**. If a hypothetical provider
uses NVIDIA-compatible metadata and error semantics, reuse the NVIDIA adapter under a new
provider ID whose base URL is defined in its provider settings:

```jsonc
"providers": [
  "nvidia",
  "opencode",
  {
    "provider": "acme",
    "adapter": "nvidia"
  }
]
```

The `acme` provider itself defines the endpoint in `opencode.json(c)`:

```jsonc
{
  "providers": {
    "acme": {
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": { "baseURL": "https://api.acme.example/v1" }
    }
  }
}
```

This reconciles OpenCode's `acme` provider using the NVIDIA adapter. Credentials are looked up
under `acme` unless `integrationID` says otherwise, and cache/status state is independent of the
real NVIDIA provider. Only a provider with genuinely different dialect behavior needs a new
adapter file.

The endpoint comes only from the provider definition's `settings.baseURL`; neither adapters nor
plugin options define endpoints. Bare shorthand such as `"providers": ["nvidia", "opencode"]`
works because those built-in providers already carry their endpoints. A custom provider must
define `settings.baseURL` in `opencode.json(c)`, otherwise it is skipped with a warning.

## Architecture

```
src/
├── index.ts                 # option parsing, reconciler startup, RPC registration
├── ids.ts                   # namespaced plugin, RPC and TUI identifiers
├── reconcile.ts             # provider-agnostic reconciliation engine
├── openai.ts                # /models fetch and safe chat probing
├── rpc.ts                   # refresh method shared by server, Desktop and TUI
├── gui.tsx                  # Desktop commands, slash entries and toasts
├── tui.ts                   # terminal /refresh-models command and toast
├── summary.ts               # shared toast text
├── types.ts                 # adapter contract and shared types
└── adapters/
    ├── nvidia.ts            # NVIDIA metadata and status semantics
    └── opencode.ts          # OpenCode free-tier dialect and selection
dist/
└── gui-experimental.cjs     # prebuilt Desktop bundle (npm run build)
```

An adapter supplies only the dialect-specific pieces:

```ts
{
  normalize(entry),          // provider JSON -> normalized model metadata
  select(entries, offered),  // optional probe-pool restriction, e.g. free models only
  classify(status),          // HTTP status -> true | false | undefined
}
```

The registry key is the adapter ID, so adapters carry no provider or integration defaults.
`providerID` comes from the plugin entry, and `integrationID` defaults to it.

To support another provider, add an adapter file and register it in `src/index.ts`. The
engine does not need provider-specific edits, and no per-model allowlist is required.

Adapters describe dialect behavior only. Endpoints and credentials are resolved from the
provider definition and OpenCode's credential store, not from the adapter.

## Please read: this plugin makes requests on your accounts

A probe is a real chat completion with `max_tokens: 1` (or the retry equivalent), with at most
five probes concurrently per provider. After the initial pass, only new or due-for-recheck
models are probed.

It also **removes models** when the provider definitely refuses them. This is intentional:
withdrawn or unavailable catalogue entries should not remain selectable. Timeouts, rate limits
and ambiguous responses never remove anything.

## Manual refresh

Run `/refresh-models` to reconcile every configured provider immediately instead of waiting for
the timer. The command calls a server RPC method, runs the same cycle, and shows a toast. It does
not add a user or synthetic message, so the model is never invoked and nothing starts
investigating the result.

Use `/refresh-models-force` to re-probe every candidate, ignoring the 7-day refusal backoff and
the 24-hour unlisted recheck. Forced cycles still apply the wipe guard and probe concurrency
limit; if the guard trips, the picker keeps its last successfully reconciled inventory.

Both commands appear when you type `/` in the OpenCode Desktop composer and in the terminal
prompt. They are also available from the command palette (`Ctrl+P` in the terminal; the Desktop
command menu lists them under **Models**).

To refresh the Desktop bundle while developing the plugin:

```bash
npm run build
opencode service restart
```

A running Desktop background service resolves the plugin's subpath exports once, so restart it
after adding `./gui-experimental` for the first time or after changing that export. Reloading
the window is enough to pick up a rebuilt bundle afterwards.

## Observability

Last-run reports are written to:

- `~/.local/state/opencode/com.a2way.opencode-model-refresh/<providerID>/models.json`
- `~/.local/state/opencode/com.a2way.opencode-model-refresh/<providerID>/changes.txt` (newest first)

They include probe verdicts, the actual offered model IDs, refused models, and whether the
wipe guard skipped a rebuild.

## Disable

Disable the whole plugin:

```jsonc
{ "plugins": ["-com.a2way.opencode-model-refresh"] }
```

To disable one provider, remove its entry from the `providers` option. Removing the plugin
restores the normal models.dev-driven behavior on the next reload; model entries declared in
your own configuration are not deleted.

## Development

This project was developed with substantial AI assistance using OpenCode. Human review, testing,
and final decisions were applied throughout, but contributors should expect an AI-assisted
codebase and verify changes carefully.

## License

MIT
