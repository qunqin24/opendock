# opencode-zdr-models

[![npm](https://img.shields.io/npm/v/opencode-zdr-models)](https://www.npmjs.com/package/opencode-zdr-models)
[![CI](https://github.com/chris15joseph/opencode-zdr-models/actions/workflows/ci.yml/badge.svg)](https://github.com/chris15joseph/opencode-zdr-models/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/opencode-zdr-models)](LICENSE)

OpenCode 2 plugin that keeps only **0-day data-retention models** in `/models`.

It reads the published privacy tables for the `opencode` (Console) and
`opencode-go` catalogs, then removes every scoped model whose policy is not
`0 days`. Other providers pass through untouched.

```text
/models
  ✗ GPT-6 Luna                  30 days
  ✗ Mistral Large 4             not ZDR
  ✗ Muse Spark 1.3 Contributor  trains on request data
  ✓ Kimi K3                     0 days
  ✓ GLM-5.3-Flash               0 days
  ✓ DeepSeek V4.1 Flash         0 days*
```

Removing a model from the list does not clear a default or session model that
was already selected. The plugin does not edit your config or session. Expired
ZDR claims are always removed, even when `showUnknown` is enabled.

## Install

```sh
opencode plugin add opencode-zdr-models
```

Install from Git instead of npm:

```sh
opencode plugin add github:chris15joseph/opencode-zdr-models
```

Or add it to `opencode.json(c)` yourself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-zdr-models"]
}
```

Local checkout:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-zdr-models"]
}
```

A plugin directory under `.opencode/plugins/` also loads automatically. Do not
list the same plugin twice.

### Options

Use the object form to configure the plugin:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-zdr-models",
      "options": {
        "showUnknown": false,
        "refreshHours": 12,
        "providers": ["opencode", "opencode-go"],
        "verifiedZdr": [
          { "providerID": "opencode", "modelID": "mistral-large-4" }
        ]
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `showUnknown` | `false` | Also show scoped models with no published policy. Never shows expired conditional zeros or stale snapshot zeros, and never widens `30d`, `not-zdr`, or `training`. |
| `refreshHours` | `12` | Cache TTL and refresh interval, clamped to `1..596` hours. |
| `providers` | `["opencode", "opencode-go"]` | Complete list of provider IDs to filter. Replaces the default list. |
| `verifiedZdr` | `[]` | Exact `{ providerID, modelID }` pairs covered by a confirmed ZDR/opt-out agreement. User attestation only; nothing verifies it against provider docs or your account. |

Invalid option shapes produce one warning and fall back to the listed default.

## How it works

- The model transform is registered immediately with a bundled snapshot, before
  any storage or network work, so the first model list is already filtered.
- Live policies are fetched from the OpenCode Console and Go privacy pages and
  cached for `refreshHours`. Cache entries older than 30 days are ignored.
- Both pages are fetched independently. A failed or incomplete page keeps the
  last-known-good data for that provider.
- If live data is unavailable, the bundled snapshot remains active. A snapshot
  `zero` is trusted for at most 30 days after capture. Once that window ends,
  the model is treated as expired and removed from selection until a live
  policy arrives; `showUnknown: true` does not re-enable it.
- Training dominates retention: a row marked `Yes`, `Yes*`, or opt-in training
  is hidden even when its retention cell says `0 days`.
- Conditional `0 days*` policies are trusted only inside their published
  validity window. The Go catalog's DeepSeek entries are conditional through
  **2026-11-30**; an expired or unparseable window is expired and cannot be
  selected, even with `showUnknown: true`.
- The model list reloads only when the resolved policy set changes.

Snapshots were captured **2026-10-31** from
<https://opencode.ai/docs/console/go#privacy> and
<https://opencode.ai/docs/console/models#privacy>.

## Provider scope

`providers` is a complete replacement list, not an extension. Only the Console
and Go pages are fetched, so adding another provider without its own policy
source makes its models `unknown` (hidden by default).

Local providers (`ollama`, `lmstudio`, `llamacpp`, `vllm`, `mlx`, `localai`,
`jan`, `koboldcpp`, and common aliases) are left untouched when they are in
scope, because request data is assumed to stay on the machine. `local` and
`local-gateway` are deliberately not treated as local: they can point at remote
URLs.

Mistral is `not-zdr` by default. If you have a current, verified ZDR agreement,
attest the exact model with `verifiedZdr`; nothing is inferred from a docs link
or account state.

## Limitations

- This is a filter based on **published policy**, not a legal or technical
  guarantee. It cannot verify your region, account, provider subprocessors, or
  whether a provider changes its terms between refreshes.
- The plugin filters the model catalog only. It does not change routing inside
  a provider or inspect an already-running session.
- Model IDs and policy tables change. The snapshot is a fallback, not a
  substitute for live data.

## Development

Requires Node.js 20 or newer.

```sh
npm ci
npm run typecheck
npm test
```

The package exports raw TypeScript (`src/index.ts`); OpenCode 2.2.x transpiles
it at load. Plain Node cannot import the installed package from `node_modules`.

## License

MIT. See [LICENSE](LICENSE).
