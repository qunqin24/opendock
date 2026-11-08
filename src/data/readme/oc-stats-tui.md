<div align="center">

# oc-stats

**Your OpenCode usage, cost and latency — live in the sidebar, detailed on demand.**

The built-in `opencode stats` gives you totals. **oc-stats** adds what it cannot: a live
per-session spend panel, per-project and per-session breakdowns, and model latency with
p50/p95/p99 — all inside the TUI.
No telemetry. No account. No database writes.

[![OpenCode 2.2.5+](https://img.shields.io/badge/opencode-2.2.5%2B-9a83e6?style=flat-square)](https://opencode.ai)
[![npm](https://img.shields.io/npm/v/oc-stats-tui?style=flat-square&color=7fd88f)](https://www.npmjs.com/package/oc-stats-tui)
[![License: MIT](https://img.shields.io/badge/license-MIT-f5a742?style=flat-square)](LICENSE)
[![No telemetry](https://img.shields.io/badge/telemetry-none-f7768e?style=flat-square)](#privacy)

<img src="https://raw.githubusercontent.com/rbhgaston/oc-stats/main/docs/sidebar.svg" alt="The oc-stats Stats panel in the right-hand session sidebar" width="100%">

</div>

## Install

```bash
opencode plugin add oc-stats-tui
```

Reload OpenCode (`/reload`), then type:

```bash
/oc_stats
```

> Requires OpenCode **2.2.5+**. `oc-stats-tui` is a TUI plugin, so the CLI adds it to
> `~/.config/opencode/cli.json`.

<details>
<summary><b>Install from source</b></summary>

```bash
git clone https://github.com/rbhgaston/oc-stats.git ~/.config/opencode/plugins/oc-stats
```

Add it to `plugins` in `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["./plugins/oc-stats"]
}
```

</details>

## Why oc-stats?

| | |
| --- | --- |
| 💸 **Know what a session costs** | Cost, billed input, output and cached tokens — plus a spend bar split by output, input and cache. |
| 🔎 **Find what is expensive** | Per-project and per-session cost, cache savings and the models that eat your budget. |
| ⚡ **Find what is slow** | TTFT, model-call latency, full step latency and output tokens/sec, with p50/p95/p99. |
| 📈 **See the trend** | Daily heatmap, sparkline and a comparison with the previous period. |
| 🔒 **Trust the numbers** | Local-only. Talks to your OpenCode server, nothing else. |

### How it compares

| | `opencode stats` | **oc-stats** |
| --- | :---: | :---: |
| Totals and daily activity heatmap | ✅ | ✅ |
| Live sidebar while you work | — | ✅ |
| Session spend split (output / input / cache) | — | ✅ |
| Per-project and per-session breakdown | — | ✅ |
| Cost, cache hit and cache savings | `--cost` | ✅ |
| TTFT, p50/p95/p99 latency and output tok/s | — | ✅ |
| Click a row to open the session | — | ✅ |
| TUI dialog with tabs and ranges | — | ✅ |
| Local-only, no telemetry | ✅ | ✅ |

## The sidebar

The sidebar is ordered from local to global, so the number you care about is always first:

- **Session** — cost, billed input, output, cached tokens (count and percentage) and a
  spend bar split by output, billed input and cached tokens.
- **Project** — the current project's cost for the selected range.
- **Range** — cost with the change against the previous range, total tokens and cache hit,
  tool calls and error rate, streak, sessions and a daily-steps sparkline.

Ranges: `24h`, `7d`, `30d`, `90d`, `all`.

Click `Stats` to fold or unfold the panel, click the underlined range in the **Range** header
to cycle it, or click `open /oc_stats` for the full dashboard.

## The dashboard

<img src="https://raw.githubusercontent.com/rbhgaston/oc-stats/main/docs/preview.svg" alt="The oc-stats /oc_stats dialog showing the Overview tab" width="100%">

`/oc_stats` opens a centered, clickable dialog with three tabs.

### Overview

- Cost, input/output/reasoning tokens, cache read/write, cached input % and cache savings.
- Sessions, subagents, prompts, steps, active days and streak.
- A heatmap you can switch between **cost**, **tokens** and **steps**.
- Daily sparkline, top models and previous-period comparison.
- Long model names: hover a row for its full name, or click it to pin the name while you
  compare rows.

### Projects

- Sortable project table: sessions, cost, tokens, average cost per session, wall time,
  p50 call latency and last activity.
- Click a project to fold or unfold its sessions.
- Expand a session for wall/busy/idle time, prompts, steps, tools and errors, token split,
  cost, cache savings, TTFT, call latency, output speed, slowest calls and subagents.
- Open the selected session with `o` or the `open session` line.

### Performance

- TTFT, model-call duration, full step duration, output tokens/sec and tool duration.
- Per-project comparison table.
- Slowest model and tool calls, with the wait/execution split.
- Session time split: wall, busy and idle.

## Keys

| key | action |
| --- | --- |
| `1` / `2` / `3` | Overview / Projects / Performance |
| `tab` / `shift+tab` | next / previous tab |
| `↑` `↓` | move in Projects, scroll elsewhere |
| `enter` / `space` | fold or unfold the selected project/session |
| `←` / `→` | collapse / expand |
| `o` | open the selected session |
| `[` / `]` | previous / next range |
| `c` | cycle heatmap metric (cost / tokens / steps) |
| `r` | refresh |
| `esc` | close |

Tabs, ranges, metric options, project headers, session rows and sort headers are clickable.
The mouse wheel scrolls the content.

## Privacy

`oc-stats` talks only to the OpenCode server it is attached to, using the same client the TUI
uses. It has no analytics, sends nothing anywhere else, and never reads or writes the database
directly.

It reads:

- `experimental.session.stats` — totals, per-model usage, tool reliability and daily activity
- `project.list` — project names and paths
- `session.list` — per-session cost and token totals
- `message.list` — completed assistant calls, TTFT, step durations and tool calls
- `model.list` — token prices for cache savings and the spend split

Project names, session titles, model names and paths stay in your terminal. Messages are fetched
lazily for sessions touched in the selected range, four requests at a time, and only completed
assistant calls are counted.

The only thing stored is your view preference (active tab, range and heatmap metric) in
OpenCode's plugin storage.

## FAQ

<details>
<summary><b>Why is cached larger than input?</b></summary>

`Input` is the **billed** input only. Cache reads are reported separately, so a long session
can show far more cached tokens than fresh input. The **Spend** bar weights each bucket by the
model's price, so it shows what you actually paid for output, input and cache.

</details>

<details>
<summary><b>Does it show my OpenRouter credit?</b></summary>

No. `oc-stats` is about usage, cost and latency. Account limits live in the quota plugin.

</details>

<details>
<summary><b>Does it work with a remote server?</b></summary>

Yes. TUI plugins are configured in `cli.json` and stay active when the TUI is connected to a
remote OpenCode server.

</details>

<details>
<summary><b>How are the numbers calculated?</b></summary>

- **TTFT** = `time.streamed − time.created`.
- **Model call duration** = time until the model hands off to its first tool call.
- **Step duration** = the full assistant step, including tool calls.
- Percentiles exclude calls over 10 minutes so idle gaps do not distort them.
- **Cache savings** estimate what cached tokens would have cost at the full input rate.
- The **spend split** uses the current catalog prices, then scales to the session's reported
  cost so the total stays exact.

</details>

## Development

```bash
git clone https://github.com/rbhgaston/oc-stats.git ~/.config/opencode/plugins/oc-stats
cd ~/.config/opencode/plugins/oc-stats
npm install
npm run typecheck
```

Edit the source, then run `/reload` in OpenCode to pick up the changes.

| file | role |
| --- | --- |
| `tui.tsx` | command, dialog, tabs and interaction |
| `sidebar.tsx` | the compact Stats panel in the session sidebar |
| `data.ts` | OpenCode API reads and aggregation |
| `format.ts` | display formatting |
| `docs/` | README previews and their generator |

Issues and pull requests are welcome at
[github.com/rbhgaston/oc-stats](https://github.com/rbhgaston/oc-stats).

## License

MIT. See [LICENSE](LICENSE).
