# opencode-model-price-intel

[![CI](https://github.com/chris15joseph/opencode-model-price-intel/actions/workflows/ci.yml/badge.svg)](https://github.com/chris15joseph/opencode-model-price-intel/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-model-price-intel)](https://www.npmjs.com/package/opencode-model-price-intel)
[![license](https://img.shields.io/npm/l/opencode-model-price-intel)](LICENSE)

An OpenCode 2 plugin that puts **prices and the Artificial Analysis
Intelligence Index** next to every model in `/models`, and opens a full
`/model-pricing` table in a native TUI dialog when you need the details.

```text
/models
  GPT 6 Astra · in $2.5 out $15 · cache read $0.25 write $0 (2 tiers) · AA 56.9
  Kimi K3 · in $3 out $15 · cache read $0.3 write $3 · AA n/a
  Big Pickle · free · AA n/a
```

Prices are USD per 1M tokens, read from the live OpenCode model registry. Scores
come from Artificial Analysis and refresh in the background. Scores are cached,
so the first `/models` render is instant and the network never blocks it.

## Install

Requires OpenCode 2.2.x (the plugin pins `@opencode/plugin` to `2.2.5`) and
Node.js 20 or newer.

```sh
opencode plugin add opencode-model-price-intel
```

Or add it to `opencode.json(c)` yourself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-model-price-intel"]
}
```

Local checkout:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-model-price-intel"]
}
```

A plugin directory under `.opencode/plugins/` also loads automatically. Do not
list the same plugin twice.

### Options

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-model-price-intel",
      "options": {
        "decorateNames": true,
        "costFormat": "compact",
        "aaApiKey": "{env:ARTIFICIALANALYSIS_API_KEY}",
        "refreshHours": 12
      }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `decorateNames` | `true` | Append the price/score summary to `/models` names. The `/model-pricing` dialog still works when this is off. |
| `costFormat` | `"detailed"` | `"detailed"` renders `in $2.5 out $15 · cache read $0.25 write $0`; `"compact"` renders `$2.5/$15/$0.25/$0`. |
| `aaApiKey` | unset | Artificial Analysis API key. Falls back to `ARTIFICIALANALYSIS_API_KEY`. Without either, the public model-list page is used. |
| `refreshHours` | `12` | Score cache TTL and refresh interval, clamped to `1..596` hours. |

Invalid option values log one warning and fall back to the defaults.

## Usage

Open the native model picker with `/models`. Each row's name carries the
one-line summary:

```text
GPT 6 Astra · Turbo · in $2.5 out $15 · cache read $0.25 write $0 (2 tiers) · AA 56.9
```

Multi-tier models show the tier count; the `/models` row itself stays a single
line.

For the full table, run `/model-pricing` (or `/prices`). It opens a native TUI
dialog with an aligned, scrollable table of every provider, price tier, cache
price, and AA score. Click any column header to sort by it; click the same
header again to reverse the order. The active header shows `▲` (ascending) or
`▼` (descending), and multi-tier models stay together with their continuation
rows. The dialog can be dismissed with `Esc`, `Ctrl+C`, or a
click outside. The command handler is a toggle, so invoking it again while the
dialog is open closes it (the dialog is modal, so `Esc` is the usual path from
the prompt). The table is a TUI feature; the `/models` decoration is
server-side and works in every client.

The TUI part asks the server for structured rows over RPC, so the dialog uses
the same live registry and score cache as `/models`. It does not send a prompt
or make a model call. The table is laid out for the current terminal width and
scrolls vertically (and horizontally when the window is narrow).

## How it works

- Prices come from `Model.Info.cost` in the live OpenCode registry. The plugin
  does not bundle a price table and does not convert currencies.
- Scores are fetched from the Artificial Analysis Free Data API when a key is
  configured, otherwise from the public model-list page.
- A bundled v5.0 snapshot (captured 2026-10-31) is registered before any
  network or storage work, so the first render is immediate. It is only merged
  with live data from the same **major** index version.
- The last good result is cached in OpenCode plugin storage for `refreshHours`.
  A cache older than 30 days is ignored.
- The model registry reloads only when the score data actually changes.
- The TUI part is registered through the package's `./tui` export and fetches
  the table through the server-side RPC in `./rpc`.
- Unscored models show `AA n/a`. A model with no registry cost shows
  `pricing n/a` (or `n/a` in compact mode).

## Limitations

- The built-in picker has no plugin column API, so the summary is appended to
  the model **name**. Set `decorateNames: false` to leave names untouched.
- Prices are catalog prices, not your invoice. Providers can add surcharges,
  discounts, or regional pricing that the registry does not carry.
- AA scores are comparative within one index major version. The plugin never
  mixes a v5 snapshot into a v6 result.
- The plugin only decorates the model list and renders the pricing dialog. It
  does not route requests or change model selection.
- The `/model-pricing` dialog requires the TUI. Other clients still get the
  `/models` decoration.

## Development

Requires Node.js 20 or newer.

```sh
npm ci
npm run typecheck
npm test
npm pack --dry-run
```

The package exports raw TypeScript (`src/index.ts`, `src/rpc.ts`, and
`src/tui.tsx`); OpenCode 2.2.x transpiles it at load. Plain Node cannot import
the installed package from `node_modules`. The TUI part uses the host's
`@opentui` packages, declared as peer dependencies.

## Attribution

Scores and related model data are produced by
[Artificial Analysis](https://artificialanalysis.ai/). The `/model-pricing`
dialog carries the source, index version, capture/fetch date, and attribution
link. See [`NOTICE`](NOTICE) and [`SNAPSHOT-NOTICE.md`](SNAPSHOT-NOTICE.md)
for further provenance.

## License

MIT. See [LICENSE](LICENSE).
