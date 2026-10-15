# opencode-context-compaction

Compact an OpenCode session on a **token budget**, at an idle moment, instead of
waiting for the model's context ceiling.

## Why

OpenCode compacts automatically near the window limit (`limit − compaction.buffer`).
On a 1M-token model that is roughly 900k, so a session can sit at 150–250k all
afternoon and never compact: every request keeps re-reading a large transcript,
and the conversation keeps drifting away from what it actually needed.

The obvious fix — "compact at 40% of the window" — does not work for the same
reason: 40% of 1M is 400k, which real sessions never reach. A budget in absolute
tokens is the rule that actually bounds context, so that is what this uses.

## What it does

- Watches the context assembled for every model call and estimates its size.
- When a session goes quiet for `idleMs` **and** its context is over `maxTokens`,
  it requests a normal OpenCode compaction (`delivery: "queue"`, so a prompt you
  send in the meantime is not stuck behind the summary).
- Adds no model calls of its own. The compaction it requests costs one summary
  call plus a prompt-cache miss on the next request, because the conversation is
  rewritten — the same cost the built-in trigger pays, just at a moment you chose.
- Leaves subagent sessions alone, and will not compact the same session twice
  inside `cooldownMs` (the latch is durable, so a reload does not double-fire).

## Terminal integration

The server plugin and the terminal plugin are separate halves that talk over
[RPC](https://opencode.ai/v2/docs/build/plugins/rpc), so the numbers on screen are
the numbers the trigger uses.

- **Status line** under the composer: `ctx 44k/150k 29%`, muted while comfortable,
  attention-coloured once the session is past budget (`ctx 160k/150k 100% · compacts at idle`).
- **Toasts** when a compaction is requested, and again when the session's history
  actually shrinks.
- **`/compact-status`** (also in the command palette) for budget, current usage,
  idle delay, cooldown, and whether a dry run is on.
- **`/compact-now`** to compact immediately.

## Install

Local plugin directories are picked up automatically, and a directory plugin's
`tui.ts` is loaded by the terminal client:

```sh
git clone https://github.com/jhanink/opencode-context-compaction
cp -R opencode-context-compaction/src ~/.config/opencode/plugins/context-compaction
```

Restart the terminal UI if the status line does not appear; the server half
reloads on its own.

Or as a package:

```sh
opencode plugin add @jhanink/opencode-context-compaction
```

## Options

Set options by loading the plugin from `opencode.json(c)` — and **do not** also
leave a copy in the auto-discovered plugins directory, or two instances will each
request compaction:

```jsonc
{
  "plugins": [
    {
      "package": "@jhanink/opencode-context-compaction",
      "options": {
        "maxTokens": 200000,
        "idleMs": 60000
      }
    }
  ]
}
```

Those two are a better starting point than the defaults on a model with a
1M-token window such as DeepSeek V4. Its built-in trigger sits out around 900k and
cache reads are cheap, so there is little reason to compact early; the longer idle
delay also keeps a short pause mid-task from reading as the end of one. Only the
keys you set are overridden:

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Turn the trigger off without removing the plugin. |
| `maxTokens` | `150000` | Compact at or above this estimated context size. |
| `charsPerToken` | `4` | Estimator for a text-heavy transcript; higher means later compaction. |
| `idleMs` | `45000` | How long a session must be quiet before acting. |
| `cooldownMs` | `600000` | Minimum gap between compactions of one session. |
| `dryRun` | `false` | Log and notify instead of compacting. |
| `history` | `false` | Record decisions and compactions in plugin storage. |

To watch decisions for a day before letting it rewrite anything, add
`"dryRun": true` — the toasts then tell you what it *would* have done.

### Sizing `maxTokens`

Set it where a session stops being useful to you, not where the provider starts
refusing it. Per-request cost is dominated by cache reads, which are cheap, so the
real reasons to compact are transcript drift and the ceiling itself.

## History

Off by default. Records are written to plugin storage — which is OpenCode's
database — so keeping them is a choice rather than a side effect. Set
`"history": true` to record what the trigger decided, and every compaction that
actually happened, including the ones OpenCode starts on its own.

Both record types carry sizes and counts, never message content:

| Record | Written when | Carries |
| --- | --- | --- |
| `decision` | the trigger evaluates a session | action, reason, estimated tokens, budget, dry run, gap since the last compaction |
| `compaction` | a compaction begins | origin, estimated tokens, characters, message count, model |

`origin` is the field worth having. OpenCode records *every* compaction in its
own database as `reason: manual` — whether you asked for it, the built-in trigger
did, or this plugin did — so without this the three are indistinguishable, and
there is no way to tell whether a budget fires when it should.

The records stay small because they do not duplicate what OpenCode already
stores: the per-request token counts you would want alongside them are already in
`opencode.db`. The newest 2,000 are kept, under the `history/` key prefix.

To read them:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select key, value from kv where key like 'plugin:%history/%' order by key;"
```

## How it works

```
session.hook("context")     →  estimate tokens  →  debounce (idleMs)
                                                 →  decide (budget, cooldown, subagent)
                                                 →  ctx.session.compact({ delivery: "queue" })
                                                 →  RPC event  →  toast
session.hook("compaction")  →  attribute (rule | command | external)  →  history
```

Estimated size is the serialized system parts and messages divided by
`charsPerToken`. JSON overhead makes it skew slightly high, which is the safe
direction for a budget: compact a little early rather than too late. Exact
tokenization would cost more than the decision is worth.

## Development

```sh
node --test test/*.test.ts   # pure decision logic, no OpenCode needed
```

`src/lib.ts` holds the rules and is free of OpenCode and Solid imports so it can
be tested on its own; `src/index.ts` and `src/tui.ts` are thin adapters.

OpenCode supplies `@opencode/plugin`, `@opentui/*` and `solid-js` at runtime, so
they are declared as **optional** peer dependencies and installing this package
fetches nothing else. (0.1.0 listed `@opencode/plugin` as a normal dependency,
which pulled 424 packages into every install, including a deprecated `glob`
with known advisories.)

## Prior art

Closest neighbours, both worth reading before adopting this:

- [`@cortexkit/opencode-magic-context`](https://www.npmjs.com/package/@cortexkit/opencode-magic-context) (MIT) — background compression of old conversation, cross-session memory, cache-aware deferred operations. Solves the same problem with a parallel summarizer.
- [`@tarquinen/opencode-dcp`](https://www.npmjs.com/package/@tarquinen/opencode-dcp) (AGPL-3.0) — prunes stale tool output from context instead of compacting.

This plugin deliberately does neither: it drives OpenCode's *native* compaction,
adds no dependencies, and makes no model calls of its own.

## License

MIT. See [LICENSE](./LICENSE).
