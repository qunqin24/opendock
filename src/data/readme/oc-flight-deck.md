# ✈ Flight Deck

**Live session telemetry for your OpenCode terminal.**

Your agent is spending money right now. Most of the time you find out afterwards.

Flight Deck puts the numbers where you're already looking — a quiet sidebar that
shows which model is running, what it's costing, how full the context is, and
whether your caching is actually working.

```
✈ FLIGHT DECK
─────────────────
status     ⠹ running
agent      orchestrator
model      deepseek-v4.1-flash · high
branch     main
cost       $0.226
total      $0.247 · 2 subagents
project    $1.48 · 12 sessions
tokens     533k in · 91k out
cache      98% hit · 32M read
context    ██░░░░░░░░ 18%
elapsed    2h 14m
tps        106 tok/s
spark      ▁▃▂▅█▄▃▂
```

## Install

```jsonc
// opencode.jsonc
{
  "plugins": ["oc-flight-deck"]
}
```

Restart OpenCode. That's the whole setup — no config file, no options, nothing to
learn. The panel appears beside an open session and starts reading.

## What you're looking at

| Row | Why it's there |
| --- | --- |
| `caution` | **The annunciator.** Silent unless something stopped moving. |
| `status` | A spinner while it works, a circle while it's waiting on you. |
| `agent` | Which agent you're actually talking to. |
| `model` | The model *and its variant* - `high` behaves differently. |
| `branch` | Which branch you're about to commit to. |
| `cost` | This conversation, plus its subagents once any have run. |
| `project` | Every session in this **project** — matched by the host's project id, so worktrees count together. |
| `tokens` | Input and output, cumulative. |
| `cache` | Hit rate first, because that's the number that explains the bill. |
| `context` | A gauge of how full the window is. |
| `perms` | What is waiting for approval, not just how many. |
| `elapsed` | How long you've been at it. |
| `tps` | Output tokens per second, measured from the last completed turn. |
| `spark` | Recent turn sizes as a shape. Available, off by default. |
| `reasoning` | Reasoning tokens, when the model emits them. Available, off by default. |
| `turns` | How many prompts you have sent this session. Available, off by default. |
| `total` | The family total and subagent count on a row of its own. Adding it makes `cost` show the session figure alone. Available, off by default. |

`project` matches on the host's **project id**, not on a directory, so a worktree
counts as part of the same project. A host that reports no project id leaves
nothing to match on, and the row then totals every session that host knows about.

### `caution` is the one row that isn't session state

Everything else here reacts to events. **A hang emits none** - no completion, no
error, nothing - so every observable thing about a hang is the *absence* of a
signal. Catching it needs a clock instead of a listener.

It stays completely silent unless something has stopped moving, so it costs
nothing on a healthy session. When it does speak it reports what it saw, never
what it means: `shell running 8m41s`, not "stuck". A ten-minute build is not a
hang.

| It fires when | Threshold |
| --- | --- |
| a tool has a start time and no completion | watch at 3m, caution at 7m |
| a shell is still running after its tool call returned | watch at 3m, caution at 7m |
| the same call repeats with identical input | caution at 3 |
| the same call fails with identical input | caution at 3 |
| a running session stops producing anything | watch at 10m, caution at 20m |

The thresholds are calibrated, not guessed. Measured over **54,218 real settled
tool calls**, **307** (0.57%) ran longer than three minutes — and **200 of those
are on the exempt list**, so with it **0.20%** of calls light the row. `subagent`
alone accounts for 152 of them at a p99 of 14.2 minutes: a delegated agent
running a quarter of an hour is working as designed. Without the list the row
lights up on every delegation, and you would learn to ignore it.

The percentages move as that history grows; the exemption ratio is the point.

The toast is **off by default**. The rail is the signal; a notification is an
interruption.

### `cost` now carries the subagents

Subagents run as **separate sessions**, and a session's own cost does not include
them. On the session this was built against, the parent reported `$0.2246` while
the true spend was `$0.2447` - **9% low on money, and 54% low on input tokens**.

Rather than spend two rows on a number and its own superset, `cost` shows the
family total and the count that explains it:

```
cost      $0.245 · 2 subagents
```

**Add `total` to `sidebar.rows` and `cost` goes back to the session figure
alone** — the merge only happens when nothing else on the rail already shows it.
So "one money row or two" is decided by your rows list, not by another setting to
find.

The row is deliberately short. An earlier version also printed the delta
(`+ $0.020`), which pushed the row to 40 columns and made it **wrap** in a normal
sidebar. It was true information that did not earn its width, and a row that
wraps costs more than a row that says less.

### `cache` is the row that surprises people

A 98% hit rate is why millions of tokens can cost cents. The moment that number
drops, your bill doesn't.

### Every selected row stays on the rail

Each field named in `sidebar.rows` renders exactly one row, in order. When the
host has nothing to show yet, the row shows the `sidebar.placeholder` value
(default `"—"`) in the same label column as a live row — so `cache` is visible
before the first cache hit, and the rail keeps a stable shape instead of
growing rows as the session produces data.

```jsonc
{
  "sidebar": {
    "persist": true, // the default: stable rows with a placeholder
    "placeholder": "—"
  }
}
```

Set `"persist": false` to restore omission: rows with no data are then left out
entirely, which is also how a narrow rail stays shortest.

## Configuration

**You don't need any.** Install it and the panel works. But every knob is
available in a commented JSONC file.

Copy [`flight-deck.example.jsonc`](./flight-deck.example.jsonc) to
`flight-deck.jsonc` at your project root, or to `.opencode/flight-deck.jsonc`,
then edit. Comments and trailing commas are fine.

```jsonc
{
  // Tick rate in ms. The spinner has ten frames, so 100 turns it once a
  // second. 0 turns the timer off entirely.
  "refresh": 100,

  "sidebar": {
    "enabled": true,
    "lines": ["✈ FLIGHT DECK", "─────────────────"],
    // Any rows, any order. Delete whatever you don't want.
    "rows": [
      "caution", "status", "agent", "model", "branch", "cost", "project",
      "tokens", "cache", "context", "perms", "elapsed", "tps"
    ]
  },

  "caution": {
    // The annunciator. Silent unless something stopped moving.
    "enabled": true,
    "toolWatchSeconds": 180,
    "toolCautionSeconds": 420,
    "turnWatchSeconds": 600,
    "turnCautionSeconds": 1200,
    "repeatThreshold": 3,
    // Tools that are slow by nature, so slow is not an anomaly for them.
    "exemptTools": ["question", "task", "subagent", "agent", "delegate", "delegate_many", "delegate_task"],
    // Off by default: the rail is the signal, a toast is an interruption.
    "toast": false
  },

  "footer": {
    // Off by default — the sidebar already carries the data.
    "enabled": false,
    "text": "Flight Deck"
  }
}
```

The example file documents every row and every option inline. A typo is never
fatal: the bad value is ignored, the default comes back, and you get a one-time
toast naming the key to fix.

## It reads. It writes one number.

Flight Deck shows what OpenCode already knows.

- **No network calls.** Nothing is fetched, nothing is sent.
- **No telemetry.** Nothing is collected or phoned home.
- **Nothing on disk.** The one thing it writes is an animation counter in the
  host's in-memory plugin state, so the spinner and `elapsed` keep moving
  between turns. It is scoped to this plugin and dies with the TUI; it is never
  persisted, and `"refresh": 0` removes even that.
- **No polling of your session** — cost, tokens, and permissions update from the
  host's own events. The timer only re-reads state the host already holds in
  memory, and only so the clock-derived rows keep moving.
- **Theme-native.** Every line uses your active theme's text tokens, so it blends
  with whatever look you already run.

Delete the plugin and the stock sidebar is back, exactly as it was.

## Uninstall

Remove the entry from `opencode.jsonc`, restart, done. Delete your
`flight-deck.jsonc` too if you made one.

## Development

```sh
bun install
bun run check
```

`bun run check` typechecks and runs the suite, including headless OpenTUI render
tests that mount the panel in a real renderer and assert the exact characters
that come out. A guard test parses the shipped example config and asserts it
still matches the real defaults, and a schema test validates that parsed
example against the shipped schema — defaults, types, and allowed values —
so the documentation can't drift from the code on either side.

To load the plugin **from this checkout** while working on it, add it to the
`opencode.jsonc` of the project you run OpenCode in. A `plugins` entry is a
package specifier, not a file path — a bare path is ignored silently — so the
checkout has to be named as a git file URL:

```jsonc
{
  "plugins": ["git+file:///absolute/path/to/oc-flight-deck"]
}
```

That installs a **copy, not a symlink**, so re-run the install after editing the
checkout. This file is deliberately **not** committed: if the plugin is also
installed globally, declaring it in both places registers the same plugin id
twice and the host's plugin list shows one of them as failed.

Built on the official
[OpenCode V2 CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli).

## Compatibility

Built against `@opencode/plugin` `2.0.2`; pin a host version you've tested.

Requires OpenCode V2 (`opencode2`). Building from source needs Bun 1.4+ or
Node 22+.

## License

MIT © 2026 nathwn12 — free to use, modify, and share.
