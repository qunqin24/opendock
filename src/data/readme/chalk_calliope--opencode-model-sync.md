# opencode-model-sync

[![npm version](https://img.shields.io/npm/v/@chalk_calliope/opencode-model-sync.svg)](https://www.npmjs.com/package/@chalk_calliope/opencode-model-sync)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

OpenCode **V2** plugin that pulls the latest model list from every connected **OpenAI-compatible**
provider at server startup and registers the new models, so gateways and self-hosted endpoints show up
in `/models` without hand-editing configuration.

Plugin ID: `provider-model-sync` · [中文文档](README.zh-CN.md)

## Features

- **Startup sync** — one `GET <baseURL>/v1/models` per provider at plugin load.
- **Configuration providers included** — providers declared by hand in `opencode.json` are registered
  by OpenCode after local plugins load, so the sync also runs when the provider registry reports them.
- **Account-aware auth** — active account connection → `settings.apiKey` → `<PROVIDER>_API_KEY`.
- **Non-destructive** — only new IDs are appended; explicit capabilities/limits/costs are kept.
- **Chat-only filter** — video, 3D, music, speech and embedding models are excluded by default.
- **Observable** — writes one status file per location under `status/`, including the number of
  models actually added, and reports failures per provider.
- **Zero runtime dependencies** — OpenCode types are imported with `import type` only.

## Install

```sh
npm install @chalk_calliope/opencode-model-sync
```

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["@chalk_calliope/opencode-model-sync"] }
```

For local development, clone into the global plugin directory instead — OpenCode loads it automatically:

```sh
git clone https://github.com/ChalkCalliope/opencode-model-sync.git \
  ~/.config/opencode/plugins/opencode-model-sync
```

⚠️ Pick **one** method. Never register a directory that OpenCode already auto-discovers, or the same
plugin ID loads twice and the second instance fails with `Duplicate plugin ID`.

Requires OpenCode `v2.x` (tested on `v2.3.0` with `@opencode/plugin` `2.3.0`).

## Verify

```sh
opencode plugin list             # one row: provider-model-sync
opencode api get /api/plugin     # state.status: active
```

```jsonc
// <plugin dir>/status/<location slug>.json — one file per location
{
  "location": "C:\\Users\\me\\project",
  "passes": 2,
  "applied": 2,
  "failed": 0,
  "seen": [{ "providerID": "siliconflow", "activation": "auto", "package": "…/openai-compatible" }],
  "providers": [
    {
      "providerID": "siliconflow",
      "status": "synced",
      "modelsURL": "https://api.siliconflow.com/v1/models",
      "credential": "connection:credential:key",
      "fetched": 80,
      "kept": 60,
      "excluded": 20,
      "added": 16
    }
  ]
}
```

`added` is computed while the transform replays, so it is written by the same run that registered the
models. `seen` lists every provider the last registry read returned, which explains providers that
were skipped before any query was made.

`status` is `synced`, `skipped` (no base URL or credential) or `failed` (URL, HTTP or network error).
Enable a JSON-lines debug log with `OPENCODE_PROVIDER_MODEL_SYNC_DEBUG=/tmp/model-sync.log opencode`.

## Behaviour

| Step | Rule |
| --- | --- |
| Provider source | catalog providers, account connections, and providers declared in `opencode.json` |
| Provider filter | `package` matches `@opencode/ai/providers/openai-compatible` |
| When | once per provider at plugin load, plus a pass whenever the location's provider registry changes |
| Model URL | first `/v1` segment, drop the rest, append `/v1/models` — `https://x/v1/chat/completions` → `https://x/v1/models`; no `/v1` → reported and skipped |
| Credential | account connection → `settings.apiKey` → env (`<PROVIDER_ID>_API_KEY`) |
| Merge | existing definitions win; only missing IDs are added, with OpenCode's fallback metadata |
| Filter | generation-only models are dropped (`video`, `3d`, `music`, `speech`, `embed`, …) |

Chat models that merely contain words such as `vision`, `mt` or `role` are kept. Set `exclude: []` to
disable filtering.

## Options

Options apply when the plugin is loaded through a `plugins` entry (npm package). Auto-discovered
directory plugins receive no options and always use the defaults (verified on OpenCode v2.3.0).

| Option | Default | Purpose |
| --- | --- | --- |
| `providers` | `[]` (all) | restrict to specific provider IDs |
| `packages` | `["@opencode/ai/providers/openai-compatible"]` | `package` values treated as OpenAI-compatible |
| `timeoutMs` | `15000` | timeout per `/v1/models` request |
| `env` | `{}` | per-provider fallback env var names |
| `headers` | `{}` | per-provider extra request headers |
| `allowAnonymous` | `[]` | provider IDs allowed to query without credentials |
| `exclude` / `include` | chat-only | override the model filter |
| `logPrefix` | `"[provider-model-sync]"` | log line prefix |
| `debugLog` | disabled | JSON-lines debug log path |
| `statusFile` | `<plugin dir>/status/<location slug>.json` | status file path |

## Limitations

- OpenAI-compatible providers only; other packages (anthropic, google, bedrock, …) are skipped.
- `/v1/models` returns IDs only, so new models use OpenCode's fallback metadata — define a model
  explicitly in your configuration if you need exact limits, pricing or capabilities.
- A provider whose `baseURL` contains no `/v1` segment is skipped.
- Each provider is synced at most once per plugin load; a changed upstream catalog needs a reload
  (saving configuration reloads the plugin).
- The status file is written per location, so two locations never overwrite each other's result.

## Development

```sh
npm run typecheck    # tsc --noEmit
npm test             # 41 tests (bun)
```

`index.ts` holds the setup orchestration; `lib/` holds `options`, `urls`, `auth`, `discovery`,
`models`, `plan`, `status` and `value`.

## License

[MIT](LICENSE)
