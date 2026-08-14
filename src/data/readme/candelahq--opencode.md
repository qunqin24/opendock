# @candelahq/opencode

> OpenCode plugin for Candela — real-time AI cost tracking, budget guardrails, and spending intelligence.

**@candelahq/opencode** connects your [OpenCode](https://opencode.ai) coding agent to [Candela](https://candelahq.com), providing live spending visibility, proactive budget warnings, cost-aware model routing, and rich analytics — all inside your terminal.

---

## ⚡ Features

- 💰 **Real-Time Cost Tracking** — Per-response cost deltas, session totals, and 24h spend in your status bar and sidebar
- 📊 **Budget Monitoring** — Threshold toasts at 80/90/100%, budget pacing forecast, reset countdown
- 🔀 **Smart Model Routing** — Opt-in suggestions to swap to cheaper models when budget is tight
- 📏 **Context Window Gauge** — Token usage tracking with compaction warnings at 80%+
- 🎯 **Daily Cost Goals** — Set spending targets, track progress with visual pacing
- 🛑 **Session Cost Caps** — Per-session spending limits with 80%/100% warnings
- 📈 **Cost Forecasting** — Extrapolate session cost based on current call rate
- 🔇 **Quiet Mode** — Suppress info toasts, keep warnings and errors
- 🏷️ **Session Tagging** — Tag sessions by activity (auto-detects git branch)
- 📂 **Repo Attribution** — Auto-tracks costs per git repository
- 📜 **Session History** — Browse past sessions with cost, duration, and tool usage
- ⏰ **Time-of-Day Patterns** — Discover when you spend the most
- 🛠️ **Tool Cost Breakdown** — See which tools cost the most per call
- 📝 **Git Commit Annotation** — Embed cost metadata in commit messages
- 📦 **Export** — JSON + CSV export of session data
- 🗄️ **Local Analytics** — JSONL event log with 90-day auto-rotation and 10MB cap

---

## 📦 Installation

```bash
npm install @candelahq/opencode
```

Add to your OpenCode config (`~/.config/opencode/config.json`):

```json
{
  "plugins": ["@candelahq/opencode"]
}
```

---

## 🚀 Quick Start

1. Start Candela: `candela start`
2. Add the plugin to your OpenCode config (see above)
3. Open OpenCode — look for 🕯️ in your status bar
4. Type `/cost` to see your first spending report

## ⚙️ Configuration

Zero-config when running Candela locally. All settings support environment variable overrides.

### Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `CANDELA_PROXY_URL` | String | `http://localhost:8181` | Candela proxy URL |
| `CANDELA_CONFIG` | String | — | Path to Candela config YAML (for port discovery) |
| `CANDELA_SMART_ROUTING` | Boolean | `false` | Enable cost-conscious model routing |
| `CANDELA_ROUTING_THRESHOLD` | Float (0–1) | `0.7` | Budget fraction to trigger routing |
| `CANDELA_ROUTING_SAVINGS_THRESHOLD` | Float (0–1) | `0.5` | Min savings to suggest model swap |
| `CANDELA_DAILY_GOAL` | Number (USD) | — | Daily spending target |
| `CANDELA_QUIET` | Boolean | `false` | Suppress info-level toasts |
| `CANDELA_SESSION_CAP` | Number (USD) | — | Per-session cost alert threshold |

### Settings File

Persistent settings at `~/.config/opencode/candela-settings.json`.

Resolution priority: **env vars > settings file > defaults**.

---

## 💻 Slash Commands

| Command | Aliases | Description |
| :--- | :--- | :--- |
| `/cost` | `/spend` | Session cost + 24h total breakdown |
| `/budget` | `/remaining` | Budget remaining, grants, reset time |
| `/models` | — | Top models by spend and call count |
| `/dashboard` | `/dash` | Open Candela web dashboard |
| `/export` | `/dump` | Export session data to JSON + CSV |
| `/goal` | — | Set or view daily cost goal |
| `/quiet` | `/shh` | Toggle quiet mode |
| `/tag` | `/label` | Tag session for cost attribution |
| `/cap` | — | Set per-session cost cap |
| `/history` | `/sessions` | Browse recent sessions |
| `/patterns` | `/when` | Time-of-day cost analysis |
| `/annotate` | `/commit-cost` | Git commit cost metadata |
| `/tools` | `/tool-cost` | Tool cost breakdown |

---

## 🖥️ Sidebar

The sidebar dashboard shows:

```
📊 $4.20 · 24h
🗄️ Cache hit rate: 72%
🏷️ feat/context-gauge
⚡ Session: $1.80 · 12 calls
📈 Forecast: ~$3.30 if 10 more calls
📏 Context: 45k tokens 🟩 ~35%
🎯 Goal: $4.20/$20 🟩 21%
⏱️ Budget exhausted by 4:30 PM
  claude-sonnet: $2.10 (8 calls)
  gpt-4o: $1.30 (4 calls)
```

---

## 📊 Intelligence Layer

- **Cost Streaks** — Track consecutive under-budget days
- **Anomaly Detection** — Alert when session cost is 2x+ your average
- **Budget Pacing** — Estimate budget exhaustion time from hourly burn rate
- **Model Efficiency** — Score models by cost-per-call vs effectiveness
- **Weekly Digest** — Week-over-week spending comparison
- **Time Patterns** — Morning vs afternoon vs evening vs night cost analysis

---

## 🛠️ Requirements

- **OpenCode** with `@opencode-ai/plugin` support
- **Candela** proxy running (default: `http://localhost:8181`)

---

## 📄 License

[Apache-2.0](LICENSE)
