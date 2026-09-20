<div align="center">

# ✈️ oc-flight-deck

**Live session telemetry for your OpenCode terminal.**
*The numbers where you're already looking — because your agent is spending money right now.*

![npm](https://img.shields.io/npm/v/oc-flight-deck) ![license](https://img.shields.io/badge/license-MIT-blue) ![opencode](https://img.shields.io/badge/opencode-V2-compatible-8A2BE2) ![node](https://img.shields.io/badge/node-%E2%89%A522-green)

</div>

---

## ⚡ Quick start

```jsonc
// opencode.jsonc
{ "plugins": ["oc-flight-deck"] }
```

> **That's the whole setup.** No config file, no options, nothing to learn. The panel appears beside an open session and starts reading.

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

| Row | Why it's there |
|---|---|
| `caution` | **The annunciator** — silent unless something stopped moving |
| `cost` | This conversation **plus its subagents** — the family total, and the count that explains it |
| `cache` | Hit rate first — the number that explains the bill |
| `context` | How full the window is |
| `tps` | Output tokens in the last 60 s, subagents included; hides when idle |
| `project` | All sessions in this project — worktrees count together |

**Extras, off by default:** `spark` · `reasoning` · `turns` · `total` · `guard` — add any to `sidebar.rows`.

---

## 🚨 `caution` — calibrated, not guessed

A hang emits no events — its only signature is *absence*. So `caution` watches a clock, stays silent on healthy sessions, and when it speaks it reports what it saw, never what it means: `shell running 8m41s`, not "stuck".

> Measured over **54,218 real settled tool calls**: 0.57% ran past three minutes — with the exempt list, **0.20%** light the row. A ten-minute build is not a hang.

**Why cost carries the subagents:** subagents run as separate sessions; a session's own cost excludes them. On the session this was built against: reported `$0.2246`, true spend `$0.2447` — **9% low on money, 54% low on tokens.** One money row tells the truth.

---

## ⚙️ Configure

Tune the rail from `opencode.jsonc` — `sidebar.rows` picks the rows, `labelWidth` fits your terminal. Start from `flight-deck.example.jsonc`; `flight-deck.schema.json` validates it.

---

<div align="center">

Built against `@opencode/plugin` 2.0.10 · Node ≥ 22 / Bun ≥ 1.4 · OpenCode V2

**MIT © 2026 nathwn12** · For OpenCode. Free.

</div>
