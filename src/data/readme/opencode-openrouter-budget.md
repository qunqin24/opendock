# opencode-openrouter-budget

An [OpenCode](https://opencode.ai) plugin that shows what you are **actually
spending on OpenRouter** — live, per session, from OpenRouter's own numbers.

OpenCode computes its built-in cost figure from static catalog prices. That
works for fixed models, but routing aliases such as `openrouter/auto` have no
catalog price (the router picks a different model per request), so OpenCode
shows `$0.00`. This plugin replaces the guesswork with authoritative data:
it reads `usage.cost` from every OpenRouter response and reports real spend.

## What it does

**Session sidebar** — while the active session uses an OpenRouter model, a
block appears in the right sidebar:

```
OpenRouter
Session total $0.1832 · 3 req
OpenRouter $0.0000 + BYOK $0.1832
Last: z-ai/glm-5.3 · total $0.0581
$70.31 key left (weekly)
Global: $392.08 left
```

- `Session total` — what this session cost, OpenRouter and BYOK together
  (cache discounts included)
- `OpenRouter + BYOK` — the two parts of that total. **OpenRouter** is what
  OpenRouter charged you (`usage.cost`). **BYOK** is what the upstream
  provider charged on your own key (`usage.cost_details.upstream_inference_cost`),
  counted only when OpenRouter flags the request as `is_byok`. Requests
  recorded before BYOK tracking, or without that flag, show as `unknown`
  instead of being counted as zero.
- `Last` — the model the Auto Router actually picked for the last request,
  with what it cost in total
- `key left` — the key's remaining budget and its reset period, from
  [`GET /api/v1/key`](https://openrouter.ai/docs/limits)
  (`limit_remaining`, `limit_reset`)
- `Global` — remaining account credits, shown **only** when the API key can
  read them (e.g. the workspace admin). Member keys see nothing here.

The block is hidden entirely when the session is not talking to OpenRouter,
and shows `waiting for first request…` until the first response completes.

**`/openrouter-budget` command** — a dialog with the full picture: every captured request
(time, kind, routed model, in/out tokens, OpenRouter and BYOK cost, generation
ID), the session total, and the wallet block — key label, key budget, account
credits, and fetch time. The wallet block also says whether BYOK spend counts
toward the key's own credit limit (`include_byok_in_limit`) and toward the
budget that blocks requests first (`effective_budget.include_byok`); these are
separate OpenRouter settings. Press `r` to refresh the wallet, `Esc` to close.

## Install

Add the package to the `plugins` array in your `opencode.json(c)` — OpenCode
downloads and loads it automatically:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-openrouter-budget"],
}
```

You can also pin a version:

```jsonc
{
  "plugins": ["opencode-openrouter-budget@0.1.0"],
}
```

### Requirements

- OpenRouter must be connected (via `/connect` or the `OPENROUTER_API_KEY`
  credential). The plugin resolves the key from OpenCode's credential store
  at runtime; it never asks for one itself.
- The sidebar block and capture only apply to the `openrouter` provider.

## How it works

- The server plugin hooks OpenCode's `http.response` for the `openrouter`
  provider and tees the response stream (fail-open: the model stream is never
  at risk). It parses `usage.cost`, the routed `model`, token counts, and the
  generation ID from the final SSE chunk, and keeps a per-session ledger in
  plugin storage.
- The wallet poller calls `GET /api/v1/key` (key budget, reset period,
  lifetime usage) and `GET /api/v1/credits` (account credits; silently
  skipped when the key cannot read them). It runs at startup, every 5
  minutes, and on demand from the `/openrouter-budget` dialog.
- OpenRouter responses are decoded with [Effect Schema](https://effect.website)
  (the same schema library OpenCode's runtime provides to plugins): lenient,
  so shape drift degrades to missing data instead of hard failures. The RPC
  contract between the server and TUI halves is defined with the same
  schemas, exposed through Standard Schema v1.
- The TUI plugin subscribes over the plugin RPC channel and renders the
  sidebar block and the `/openrouter-budget` dialog.

## Privacy

Your API key is resolved from OpenCode's credential store and used only to
call `openrouter.ai` endpoints listed above. Nothing else leaves your
machine; the plugin collects no telemetry and reports nothing anywhere else.

## Limitations

- The ledger starts when the plugin is first installed; spend from before
  installation is not reconstructed.
- The BYOK amount is the cost OpenRouter reports for the request, which can
  differ from what your provider invoices. The session total adds it to
  OpenRouter's own charge, so treat it as a reported total, not an invoice.
- Only requests made through this OpenCode instance are counted.
- Auxiliary requests (title generation, compaction) are counted too, and
  labeled by kind in the `/openrouter-budget` dialog.
- OpenCode's built-in `$0.00` figure for `openrouter/auto` remains — this
  plugin adds its own, labeled block beside it.

## Development

```sh
pnpm install
pnpm run check   # format:check + lint + typecheck + test
```

To hack on it live, point OpenCode at a local checkout instead of the
package:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-openrouter-budget"],
}
```

Local-directory loading resolves `server.ts`, `tui.ts`, and `rpc.ts` at the
package root, so keep those shims in sync with `src/`. OpenCode reloads
plugin files on save.

## License

[MIT](./LICENSE)
