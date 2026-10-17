# opencode-autocompact

Claude Code's autocompact, with a knob. An [OpenCode](https://opencode.ai) **V2**
plugin that compacts a session *before* the model's real context limit — at a
number you choose, per session.

```
/autocompact 500k      # compact this session (and its children) at 500k tokens
/autocompact 500000    # same, plain count
/autocompact 1m        # suffix form
/autocompact           # report the effective threshold and the model's limit
/autocompact off       # revert this session (and descendants) to normal auto
```

Tested against OpenCode `2.0.24`.

## Why

OpenCode already compacts automatically when a session approaches the model's
context limit, but that behaviour is configured **globally** and only in terms of
the limit itself:

```jsonc
{
  "compaction": {
    "auto": true,
    "keep": { "tokens": 15000 },
    "buffer": 20000        // tokens kept free below the model limit
  }
}
```

There is no per-session setting, and on a large-context model (256K, 1M, …) the
default kicks in very late. Sometimes you want to trim a session much earlier —
cheaper requests, more headroom for big tool results, a shorter tail for the
summarizer, or simply a predictable ceiling. `/autocompact 500k` says exactly
that, for one session, without touching anyone else's config.

## What it does

- **Per-session thresholds.** `/autocompact <n>` records a token ceiling for the
  session it was run in.
- **Inheritance.** The threshold applies to that session's children and
  subagents, resolved by walking the `parentID` chain.
- **Early compaction.** Once the session's live context reaches the threshold,
  the plugin asks OpenCode to compact, so it happens well below the model limit.
- **Opt-out.** `/autocompact off` stops the plugin for that session and its
  descendants, falling back to OpenCode's normal auto-compaction.
- **Zero footprint by default.** With no threshold set for a session or any of
  its ancestors, the plugin does nothing at all.
- **Visible when set.** When a threshold applies, a small chip joins the prompt
  footer's status row (next to OpenCode's own context indicator), and a side
  panel shows the numbers in detail.

## Install

```sh
opencode plugin add @hacky.software/opencode-autocompact@0.1.6
```

Or add it to `opencode.json` directly — string form, or the object form to pass
options:

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@hacky.software/opencode-autocompact",
      "options": {
        "minCheckIntervalMs": 2000,
        "compactionTimeoutMs": 300000,
        "debugEvents": false
      }
    }
  ]
}
```

To run from a checkout instead, point the config at the directory (the loader
does not install dependencies for local-path entries, so run `bun install` once
inside it):

```jsonc
{
  "plugins": [{ "package": "/path/to/opencode-autocompact" }]
}
```

## Usage

| Command | Effect |
| --- | --- |
| `/autocompact 500k` | Set the threshold to 500,000 tokens for this session and its children. |
| `/autocompact 500000` | Same, plain count. Accepts `k`/`m` suffixes, underscores, and a space before the suffix (`1.5m`, `250_000`). |
| `/autocompact` | Report the effective threshold and the current model's `limit.context`. |
| `/autocompact off` | Disable the plugin for this session and its descendants (overrides an inherited threshold from an ancestor). |

A value at or above the model's `limit.context` is refused (`must be lower than
the model limit`), since the point is to compact *earlier*. The command is silent
in the TUI; its outcome is written to the log (see below).

## How it works

The plugin has two halves: a **command** that records thresholds in plugin
storage, and a **watcher** that reacts to the session event stream. When a model
call finishes, the watcher recomputes the session's live context size; if it has
reached the effective threshold, it asks OpenCode to compact the session, and
OpenCode runs that at the next safe point.

### Measuring "how full" the session is

`Session.Info.tokens` and the `session.usage.updated` event carry **cumulative**
session usage — they keep climbing across every request and never tell you how
big the *current* context is.

The live context size is instead the prompt size of the newest model call, which
OpenCode records on each assistant message:

```
used = tokens.input + tokens.cache.read + tokens.cache.write
```

The watcher reads that from `ctx.session.context({ sessionID })` and compares it
to the effective threshold. (This is the same measure OpenCode's own tooling uses
for context occupancy.)

### Triggering compaction

When `used >= threshold`, the watcher calls `ctx.session.compact({ sessionID })`.
Compaction is admitted immediately and runs at the next safe point, and repeated
requests while one is pending merge — so the session is trimmed before it ever
nears the real limit.

### Inheritance and `off`

Thresholds live in plugin storage under `autocompact/threshold/<sessionID>` as
either `{ kind: "limit", threshold }` or `{ kind: "off" }`. The effective
threshold for a session is resolved by walking up the `parentID` chain:

- the nearest `limit` wins;
- an `off` marker anywhere on the path stops the walk and disables the plugin for
  that branch (so `/autocompact off` on a child beats a limit inherited from its
  parent);
- nothing found → the plugin stays out of the way.

Resolutions are memoised per session and invalidated whenever a command writes.

### Guards and lifecycle

- **Coalescing** — usage events are frequent; checks are coalesced per session
  (`minCheckIntervalMs`).
- **In-flight guard** — while a compaction is running, further requests for that
  session are skipped. The guard is released by the `session.compaction.ended` /
  `.failed` events, with `compactionTimeoutMs` as a backstop if those are missed
  (e.g. a reload mid-compaction).
- **Deletion** — `session.deleted` clears the session's stored threshold and
  memoised resolution.

## Configuration

Options are passed in the plugin entry's `options` object:

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch. When `false` the plugin loads but does nothing. |
| `minCheckIntervalMs` | `2000` | Coalescing window between usage-driven checks for one session. |
| `compactionTimeoutMs` | `300000` | Releases the in-flight guard if compaction events are missed. |
| `debugEvents` | `false` | Log every raw event (payload verification aid). |

### Feedback and logs

The command produces no chat output. Its result is appended to
`<data>/opencode/log/autocompact.log` under the `[autocompact]` prefix, e.g.:

```
compaction threshold set to 5k for ses_… and its children (model limit 131.1k)
compaction requested (ses_…) — used 7686 >= threshold 5000
```

## TUI

The plugin also ships a CLI (TUI) half:

- **Footer chip** — a contribution to `prompt.footer.status`, appended *after*
  OpenCode's own context indicator (the built-in readout is never replaced). It
  reads `autocompact <used>/<threshold>` for a session with a threshold, or
  `autocompact off` where the plugin was switched off. Sessions with nothing set
  show no chip at all.
- **Side panel** — `Autocompact: open side panel` (command palette) docks a
  panel named `autocompact.status` showing the mode, the threshold, whether it is
  the session's own or inherited, the live context size, and the model's limit.

Both are fed by a small RPC: the server half owns the threshold and answers
`status`; `/autocompact` emits `updated` so the chip and panel refresh the moment
you set or clear a threshold. The chip also follows the session event stream —
it refreshes on `session.usage.updated` and on both compaction edges — so the
live context number tracks each turn and drops back down after a compaction,
inline with OpenCode's own context readout. A short poll while the chip or panel
is on screen is the fallback if an event is missed.

## Development

```sh
bun install
bun test            # 38 unit tests
bun run typecheck
```

If a checkout sits outside OpenCode's watched config directories, edits may not
be picked up automatically — restart the service:

```sh
opencode2 service restart
```

## Limitations

- The threshold is validated against the model limit only when set. If you switch
  a session to a model with a smaller limit, re-run `/autocompact`.
- Every plugin location receives the event stream, so more than one instance may
  request compaction for the same session. Requests merge in OpenCode, so this is
  harmless; the in-flight guard de-duplicates within a single instance.
- Detection depends on the session emitting `session.usage.updated` and on the
  assistant `tokens` shape; enable `debugEvents` if a runtime change stops it.

## License

MIT
