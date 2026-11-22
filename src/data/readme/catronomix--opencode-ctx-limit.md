# opencode-ctx-limit

[![npm](https://img.shields.io/npm/v/@catronomix/opencode-ctx-limit?cacheSeconds=3600)](https://www.npmjs.com/package/@catronomix/opencode-ctx-limit)
[![license](https://img.shields.io/npm/l/@catronomix/opencode-ctx-limit?cacheSeconds=3600)](LICENSE)
[![node](https://img.shields.io/node/v/@catronomix/opencode-ctx-limit?cacheSeconds=3600)](https://nodejs.org)

**One token cap for every model, in every session.**

An [OpenCode](https://opencode.ai) plugin that puts a single global context limit on
everything you run. Whichever provider or model a session uses, it never plans for more
context than the cap you set. Useful when you pay per token, run local models with a small
window, or just want sessions to stay predictable.

```
/ctxmax 128k   →   Global context limit — Models capped at 128k tokens.
```

---

## Why

- **Global, not per model.** One number, all providers, all models. No config edits per
  model, no provider-specific settings.
- **Enforced on the request itself.** OpenCode applies `limit` from model config in ways a
  registry transform can't always reach, so the cap is also applied to the exact payload
  about to be sent.
- **Shrink before cut.** Oversized tool output is elided first, then tool output that was
  already read later in the session, then prose from older assistant turns. Whole turns are
  dropped only when elision is not enough, so your own words are the last thing to go.
- **Turn-aware trimming.** When messages must be dropped, the oldest turns go first, from a
  user boundary, so an assistant tool call is never separated from its tool result. The
  newest turn is always kept.
- **Honest output budgets.** Output becomes `min(configured, cap / 4)`, clamped to
  1k–32k tokens, so generation can't starve the input budget.
- **Instant control.** Palette commands, a `/ctxmax` slash command, and presets. Change it
  in one window and the others follow.

## Install

Published as `@catronomix/opencode-ctx-limit` on npm:

```sh
opencode plugin add @catronomix/opencode-ctx-limit
```

Or add it to `plugins` in `~/.config/opencode/opencode.json(c)` yourself:

```jsonc
{
  "plugins": ["@catronomix/opencode-ctx-limit"]
}
```

One entry loads every part. Append `@<version>` to pin an exact release, or use
`github:catronomix/opencode-ctx-limit` to install straight from git.

### From a local checkout

Cloning works too — the checkout *is* the installed plugin:

```sh
git clone https://github.com/catronomix/opencode-ctx-limit.git \
  ~/.config/opencode/plugins/ctx-limit
```

Plugins under `~/.config/opencode/plugins/<name>/` load automatically. Anywhere else, add
the **directory** (not individual files) to `plugins`:

```jsonc
{
  "plugins": ["/home/you/src/opencode-ctx-limit"]
}
```

Use either the package entry or the path entry, never both: two entries for one plugin ID
give you two instances fighting over the same hooks.

### Parts

| Export  | File       | Runs in         | Role                                         |
| ------- | ---------- | --------------- | -------------------------------------------- |
| `.`     | `index.ts` | OpenCode server | Enforcement, persistence, RPC implementation |
| `./tui` | `tui.ts`   | Terminal UI     | Menu, slash command, RPC client              |
| `./rpc` | `rpc.ts`   | Shared          | Typed RPC contract                           |

Enforcement works with the server part alone; the menu needs the terminal part as well. If
only the terminal part is loaded, changing the cap says so instead of failing silently.

## Usage

| Action  | How                                                     |
| ------- | ------------------------------------------------------- |
| Set     | `/ctxmax 128k`, `/ctxmax 200000`, or `/ctxmax` to pick  |
| Presets | 64k, 100k, 128k, 160k, 200k, 256k, custom, or no limit  |
| Clear   | `/ctxmax` → **No limit**, or the palette's **Clear**    |

The command accepts raw counts and `k`/`m` suffixes. The minimum is 4096 tokens. Clearing
the cap returns every model to its configured context window.

Palette (`⌘K` → **Context**): **Set global max context** / **Clear global max context**.

## How it works

Two layers, because model config in OpenCode wins over registry transforms:

1. `ctx.model.transform` clamps every registry entry whose `limit.context` or `limit.output`
   exceeds the cap, so the UI and planning phases see the capped number.
2. `ctx.session.hook("context")` re-applies the cap to the final request: recompute the
   output budget, subtract the estimated system prompt, then shrink and, if that is still not
   enough, trim.

Shrinking runs in three escalating passes and stops as soon as the payload fits:

| Pass | Gives up first                                                        |
| ---- | --------------------------------------------------------------------- |
| 1    | Oversized tool output (keeps the head and tail, marks the elision)     |
| 2    | Tool output identical to a later result (the newest copy is kept)      |
| 3    | Prose in older assistant turns (tool calls are never touched)          |

Only then are whole turns dropped from the front, at user boundaries.

Compaction is deliberately left to the host: this plugin never makes an extra model call and
never triggers compaction behind your back. If a session is genuinely too big, use
OpenCode's own `/compact`.

Token counts are a cheap provider-agnostic estimate (~4 characters per token), not a
tokenizer, so leave headroom for whatever tokenizer your provider actually uses.

The hook computes everything before touching the request and passes the payload through
unchanged if anything fails — a plugin bug can cost you the cap, never the request.

## Security posture

- No network access, no filesystem access, no subprocesses, no `eval`.
- Zero dependencies. `@opencode/plugin` is imported for types only; the two
  runtime helpers it provided (`Plugin.define`, `Rpc.define`, both identity /
  validation no-ops in the SDK) live in [`define.ts`](define.ts), so installing
  this package adds nothing else to your tree.
- The only state is one number in OpenCode's own plugin storage.
- Settings changes travel over the plugin RPC channel, not the internet.
- No hidden model calls: shrinking is local string work, never a summarisation request.
- Shrinking and trimming are logged once per session:
  `ctx-limit: elided N message(s) of tool output, dropped M old message(s) to fit the K token cap`.

Publishing and metadata rules live in the maintainer's `PUBLISH-GUIDE.md`, which is not
tracked in this repo.

## Troubleshooting

**“The ctx-limit server part is not running at this location”** — the terminal part loaded
but no `ctx-limit` server part was found at the location the request was addressed to. The
plugin always sends its own `location` with each RPC call, so this normally means setup
failed server-side. Check `opencode api get /api/plugin` for a `ctx-limit` entry with
`server`, `tui` and `rpc` features, then read
`~/.local/share/opencode/log/opencode.log`.

Any other message is the server's real error text, including its RPC error type.

**The cap looks higher than the model claims.** Config-pinned `limit` values are clamped by
the transform but can still be displayed from config in some views. The request hook is what
actually enforces the cap.

**`opencode plugin list` doesn't show it.** That table lags behind config and package
changes. The server log line `msg="loading plugin" … entrypoint=file:///…` is the truth;
`/reload` or `opencode service restart` settles the table.

## Development

```sh
npm install
npm test          # node --test logic.test.ts
npm run typecheck # tsc --noEmit
```

The test runner relies on Node's native type stripping, so development needs Node
22.6+ (`engines` describes that, not the plugin's runtime, which is the Bun-based
OpenCode host).

`logic.ts` has no OpenCode imports on purpose — it is the testable core, and the only place
where the token math lives. `define.ts` holds the local `define` shims; it reaches the SDK
only through type-only imports, which is what keeps the published package dependency-free.

## Disclaimer

This plugin was **built with OpenCode** — designed, written and reviewed in collaboration
with an AI coding agent, then audited for security and behaviour before publishing.

It is a hobby project provided as-is under the MIT licence: no warranty, no support
guarantee, and no affiliation with the OpenCode team. It does mutate the payloads your
sessions send, so read the source before trusting it in a workflow you can't afford to
lose. It is deliberately small enough to read in one sitting.

## License

MIT © 2026 catronomix
