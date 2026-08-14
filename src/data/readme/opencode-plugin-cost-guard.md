<div align="center">

# 💸 opencode-cost-guard

### Stop leaking money to your AI coding agent.

**opencode-plugin-cost-guard** watches your opencode sessions in real time, tames
runaway context before it costs you, alerts you the moment spend spikes, and
gives you a permanent paper trail of every dollar.

[![npm version](https://img.shields.io/npm/v/opencode-plugin-cost-guard?style=flat-square&color=blue)](https://www.npmjs.com/package/opencode-plugin-cost-guard)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/yuseferi/opencode-cost-guard/ci.yml?style=flat-square&label=CI)](https://github.com/yuseferi/opencode-cost-guard/actions)
[![OpenCode](https://img.shields.io/badge/opencode-plugin-%E2%9C%94-7c3aed?style=flat-square)](https://opencode.ai)
[![Made by](https://img.shields.io/badge/made%20by-yuseferi-181717?style=flat-square)](https://github.com/yuseferi)

</div>

---

## 🔥 Why you need this

Every message you send to a coding agent **re-reads your entire conversation
history**. That's called *cache replay* — and it's quietly the biggest line item
on your LLM bill.

Measured on a real production setup, this is what it looked like:

| Metric | Value |
|---|---|
| Cache-replay tokens vs. output tokens | **232×** |
| Share of spend from context replay | **~75%** |
| Sessions that crossed the compaction threshold | **4 / 255** |
| Total legacy spend from unbounded context | **$900+** |

Context bloat compounds silently: each new tool result, diff, and file read makes
the *next* message more expensive. Most sessions never even hit the context cap —
they just rack up replay cost along the way.

**opencode-cost-guard** is the guardrail that catches this automatically.

---

## ✨ Features

- **🛡️ Auto-config in one install** — enables opencode's compaction engine
  (`auto` + `prune`) and caps paid Claude models to a sane 120K context. Free and
  cheap models (haiku, gpt-5 family, gemini, `-fast` variants) are left alone.
  Your existing settings are always respected.
- **📡 Live session watch** — tracks cost and token usage per session as it
  happens, from real `message.updated` events (no polling, no overhead).
- **🚨 Runaway-context detection** — measures average cache replay per message.
  When a session is about to blow up, it **auto-compacts** it for you (with a
  cooldown so it never thrashes).
- **💰 Budget alerts** — desktop notifications + structured logs the moment a
  session passes your limit, or the day exceeds your total budget.
- **📊 JSONL savings reports** — a permanent, machine-readable record of every
  session's cost and tokens, plus a built-in `cost_guard_report` tool so your
  agent can answer *"how much have I spent today?"* directly.

---

## 🚀 Install

> Requires opencode. Works on macOS (desktop notifications), Linux & Windows
> (alerts still land in logs).

```bash
npm install opencode-plugin-cost-guard
```

Then add it to your config:

```jsonc
// ~/.config/opencode/opencode.json  or  ./opencode.json
{
  "plugin": [
    ["opencode-plugin-cost-guard", {
      "budgetPerSession": 25,   // alert when a session passes $25
      "budgetPerDay": 100       // alert when the day passes $100
    }]
  ]
}
```

That's it. The plugin auto-applies compaction + context caps on first load.

### Local development

```jsonc
{
  "plugin": ["file:///absolute/path/to/opencode-cost-guard/src/index.ts"]
}
```

---

## ⚙️ Options

| Option | Default | Description |
|---|---|---|
| `budgetPerSession` | `25` | Alert when one session exceeds this many USD |
| `budgetPerDay` | `100` | Alert when the day's total exceeds this many USD |
| `replayThreshold` | `110000` | Avg `cache_read` per message that triggers auto-compaction |
| `autoCompact` | `true` | Auto-compact runaway sessions |
| `compactCooldownMs` | `300000` | Min gap between auto-compactions for one session |
| `alertCooldownMs` | `900000` | Min gap between alert notifications |
| `notify` | `true` | macOS desktop notifications |
| `dataDir` | `~/.opencode/cost-guard/` | Where `report.jsonl` lives |
| `applyConfig` | `true` | Auto-apply compaction + context caps to paid models |
| `contextCap` | `120000` | Context cap applied when `applyConfig` is true |

---

## 📄 Report format

Every session and day is appended to `~/.opencode/cost-guard/report.jsonl`:

```jsonl
{"time":"2026-08-05T12:00:00Z","sessionID":"sess_01...","title":"Migrate ACU","cost":0.12,"tokens":{"input":123,"output":45,"cache_read":999,"cache_write":50},"replay_avg":999,"compacted":false}
{"time":"2026-08-05T23:59:59Z","type":"daily","day":"2026-08-05","spend":4.21}
```

Feed it to Grafana, `jq`, or any log pipeline for spend dashboards and trend analysis.

---

## ✅ Verify it works

1. Restart opencode.
2. Ask your agent: **"how much have I spent today?"** — it calls
   `cost_guard_report` and answers with real numbers.
3. After a long session, open `~/.opencode/cost-guard/report.jsonl` and look for
   records with `"compacted": true`.

---

## 🤔 FAQ

**Does it lock in my configuration?**
No. The `config` hook only sets values that are *unset* (or larger than the cap).
Anything you explicitly configured stays exactly as you set it. Opt out entirely
with `"applyConfig": false`.

**Will auto-compaction destroy context?**
Compaction summarizes the conversation to a compact continuation prompt — the
same mechanism as manually running `/compact`. It keeps ~25% of the threshold as
recent context so work-in-progress survives.

**Which models get capped?**
Paid Claude models (opus-5, opus-4-8/4-7/4-6, sonnet-5/4-6/4-5). Free and cheap
models keep their native context.

**Is it safe / does it block my agent?**
Everything is non-blocking and wrapped in error handlers. The plugin never throws
into your session — at worst it logs and moves on.

---

## 🧩 How it works under the hood

```
message.updated ──► track cost + tokens per session
        │
        ▼
avg cache_replay / message > replayThreshold?  ──► yes ──► client.session.summarize(auto)
        │
        ▼
session cost > budget? or day > budget?        ──► yes ──► desktop notification + warn log
        │
        ▼
session idle ──► append record to report.jsonl (persisted daily totals)
```

---

## 📚 Docs & community

- [OpenCode docs](https://opencode.ai/docs/plugins/) — plugin authoring guide
- [opencode-litellm](https://github.com/yuseferi/opencode-litellm) — LiteLLM proxy support
- [opencode-statusbar](https://github.com/yuseferi/opencode-statusbar) — reactive token & cost status bar

---

## 🛠️ Contributing

Small, scoped, strictly typed, non-blocking. See [CONTRIBUTING.md](CONTRIBUTING.md)
before opening a PR. Releasing is automated via GitHub Actions — tag a version,
publish to npm, done.

---

## 📜 License

[MIT](LICENSE) © 2026 [Yusef Mohamadi](https://github.com/yuseferi)
