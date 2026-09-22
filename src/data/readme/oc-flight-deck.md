<div align="center">

# ✈️ oc-flight-deck

**Live session telemetry for your OpenCode terminal.**
*The numbers where you're already looking — because your agent is spending money right now.*

![npm](https://img.shields.io/npm/v/oc-flight-deck) ![license](https://img.shields.io/badge/license-MIT-blue) ![opencode](https://img.shields.io/badge/opencode-V2-compatible-8A2BE2) ![node](https://img.shields.io/badge/node-%E2%89%A522-green)

</div>

---

## ⚡ Quick start

Add the plugin to your `opencode.jsonc`:

```jsonc
// opencode.jsonc
{ "plugins": ["oc-flight-deck"] }
```

Restart OpenCode. **That's the whole setup.** No config file, no options, nothing to learn. The panel appears beside an open session and starts reading.

---

## 📊 The panel

```text
✈ FLIGHT DECK
──────────────────────────────
status     ⠹ running
agent      orchestrator
model      deepseek-v4.1-flash · high
branch     main
cost       $0.245 · 2 subagents
tokens     533k in · 91k out
cache      98% hit · 32M read
context    ██░░░░░░░░ 18%
elapsed    2h 14m
tps        18 tok/s
```

Every row is read from the open session at render time — except `caution`, which watches a clock rather than events (a hang emits none), and the opt-in `guard` row, which is polled from the local guard RPC.

| Row | What it shows |
|---|---|
| `caution` | **The annunciator** — silent unless something stopped moving |
| `status` | A spinner while anything is working, a circle while it's idle |
| `agent` | Which agent you're actually talking to |
| `model` | The model **and its variant** — `high` behaves differently |
| `branch` | The branch you're about to commit to |
| `cost` | This conversation **plus its subagents**, and the count that explains it; with `total` on the rail, the session figure alone |
| `total` | The family total and subagent count on a row of its own · **off by default** |
| `project` | Every session in this project, not just the one on screen |
| `tokens` | Input and output, cumulative |
| `cache` | Hit rate first — the number that explains the bill — then cache reads |
| `context` | A gauge of how full the window is |
| `perms` | What is waiting for approval, not just how many |
| `elapsed` | How long you've been at it |
| `tps` | Current speed: output tokens in the last 60 s, divided by that window, subagents included. Idle longer than the window and it hides — the `status` row already says `idle`. On a host that exposes no per-message timestamps it falls back to the lifetime average, which does not hide while idle and reads lower than a peak per-turn rate. Fixed at 60 s, not configurable |
| `spark` | Recent turn sizes as a shape · **off by default** |
| `reasoning` | Reasoning tokens, when the model emits them · **off by default** |
| `turns` | How many prompts you've sent this session · **off by default** |
| `guard` | Harness status from oc-harness-guard · **off by default** |

`project` matches on the host's **project id**, not on a directory, so a worktree counts as part of the same project. A host that reports no project id leaves nothing to match on, and the row then totals every session that host knows about.

The rows marked **off by default** are available but not in the default rail: add any of them to `sidebar.rows`.

Every field named in `sidebar.rows` renders exactly one row, in order. With `sidebar.persist` (the default), a row with no data yet shows the `sidebar.placeholder` value (default `—`) in the same label column as a live row — so the rail keeps a stable shape instead of growing rows as the session produces data. Set `"persist": false` to restore omission: rows with no data are left out entirely.

The `guard` row only appears when oc-harness-guard is installed and answering; without it the row stays on the placeholder. Flight Deck never installs or requires the other plugin — each side works alone.

---

## 🚨 `caution` — calibrated, not guessed

A hang emits no events — its only signature is *absence*. So `caution` watches a clock, stays silent on healthy sessions, and when it speaks it reports what it saw, never what it means: `shell running 8m41s`, not "stuck".

> Measured over **54,218 real settled tool calls**: 0.57% ran past three minutes — with the exempt list, **0.20%** light the row. A ten-minute build is not a hang.

**Why cost carries the subagents:** subagents run as separate sessions; a session's own cost excludes them. On the session this was built against: reported `$0.2246`, true spend `$0.2447` — **9% low on money, 54% low on tokens.** One money row tells the truth.

| It fires when | Threshold | Config |
|---|---|---|
| a tool has a start time and no completion | watch at 3m, caution at 7m | `toolWatchSeconds` / `toolCautionSeconds` |
| a shell is still running after its tool call returned | watch at 3m, caution at 7m | `toolWatchSeconds` / `toolCautionSeconds` |
| the same call repeats with identical input | caution at 3 | `repeatThreshold` |
| the same call fails with identical input | caution at 3 | `repeatThreshold` |
| a running session stops producing anything | watch at 10m, caution at 20m | `turnWatchSeconds` / `turnCautionSeconds` |

The toast is **off by default**. The rail is the signal; a notification is an interruption.

---

## ⚙️ Configure

**You don't need any.** Install it and the panel works. But every knob is available in a commented JSONC file.

Copy [`flight-deck.example.jsonc`](./flight-deck.example.jsonc) to `~/.config/opencode/flight-deck.jsonc`, then edit. Comments and trailing commas are fine. `flight-deck.schema.json` validates it.

There is **one** config file, global to your user, so the same values apply to every project. Flight Deck does not read a `flight-deck.jsonc` from a project root or from a project's `.opencode/` directory — a copy left there configures nothing. If `$XDG_CONFIG_HOME` holds an absolute path, the config path is `$XDG_CONFIG_HOME/opencode/flight-deck.jsonc` instead; a relative value is ignored, so the lookup cannot resolve against the host's working directory. A `.json` name works too; the `.jsonc` name is tried first.

The file is optional, and a missing file is normal and silent: with no file at all you get exactly the defaults the example file writes out.

> **Upgrading from 0.4.0 — the config file moved.** The per-project search is gone. A `flight-deck.jsonc` in a project root or in `.opencode/` is no longer read; move it to `~/.config/opencode/flight-deck.jsonc` (or the `$XDG_CONFIG_HOME` path above) to keep your settings.

`sidebar.rows` picks the rows and their order; `layout.labelWidth` fits your terminal. Everything else lives in the example file, documented inline — a typo is never fatal: the bad value is ignored, the default comes back, and you get a one-time toast naming the key to fix.

```jsonc
// ~/.config/opencode/flight-deck.jsonc
{
  "refresh": 100,
  "sidebar": {
    "rows": [
      "caution", "status", "agent", "model", "branch", "cost", "project",
      "tokens", "cache", "context", "perms", "elapsed", "tps"
    ]
  },
  "caution": { "toast": false }
}
```

---

## 🔒 It reads. It writes one number — two with `guard` on.

Flight Deck shows what OpenCode already knows.

- **No network calls while the opt-in `guard` row stays off.** Nothing is fetched, nothing is sent. With `guard` enabled, the panel polls the local guard RPC — same machine, no telemetry — about every ten seconds, plus right away when the rendered session changes.
- **No telemetry.** Nothing is collected or phoned home.
- **Nothing on disk.** The one thing it normally writes is an animation counter in the host's in-memory plugin state, so the spinner and `elapsed` keep moving between turns. It is scoped to this plugin and dies with the TUI; it is never persisted, and `"refresh": 0` removes even that. With `guard` enabled there is a second in-memory write — that row's polled status — and `"refresh": 0` does not remove it; dropping `guard` from `sidebar.rows` does.
- **No polling of your session while `guard` stays off.** Cost, tokens, and permissions update from the host's own events. The timer only re-reads state the host already holds in memory, so the clock-derived rows keep moving.
- **Theme-native.** Every line uses your active theme's text tokens, so it blends with whatever look you already run.

Delete the plugin and the stock sidebar is back, exactly as it was.

---

## 🧹 Uninstall

Remove the entry from `opencode.jsonc`, restart, done. Delete your `~/.config/opencode/flight-deck.jsonc` too if you made one.

---

## 🛠 Development

```sh
bun install
bun run check
```

`bun run check` typechecks and runs the suite, including headless OpenTUI render tests that mount the panel in a real renderer and assert the exact characters that come out. A guard test parses the shipped example config and asserts it still matches the real defaults, and a schema test validates that parsed example against the shipped schema — defaults, types, and allowed values — so the documentation can't drift from the code on either side.

To load the plugin **from this checkout** while working on it, add it to the `opencode.jsonc` of the project you run OpenCode in. A `plugins` entry is a package specifier, not a file path — a bare path is ignored silently — so the checkout has to be named as a git file URL:

```jsonc
{
  "plugins": ["git+file:///absolute/path/to/oc-flight-deck"]
}
```

That installs a **copy, not a symlink**, so re-run the install after editing the checkout. This file is deliberately **not** committed: if the plugin is also installed globally, declaring it in both places registers the same plugin id twice and the host's plugin list shows one of them as failed.

Built on the official [OpenCode V2 CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli).

---

## 🧭 Compatibility

| | |
|---|---|
| Built against | `@opencode/plugin` `2.0.12` — pin a host version you've tested |
| Host | OpenCode V2 (`opencode2`) |
| Building from source | Node ≥ 22 or Bun ≥ 1.4 |
| Writes | In-memory counters only — the animation tick, plus the `guard` row's polled status when `guard` is on; nothing to disk |

---

<div align="center">

Built against `@opencode/plugin` 2.0.12 · Node ≥ 22 / Bun ≥ 1.4 · OpenCode V2

**MIT © 2026 nathwn12** · For OpenCode. Free.

</div>
