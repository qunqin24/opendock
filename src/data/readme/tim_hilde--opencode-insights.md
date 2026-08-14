# opencode-insights

A native opencode plugin that generates usage insights reports from your session history.

Registers a `/insights` slash command that:

- Reads sessions from opencode's SQLite database
- Extracts per-session facets via LLM (with caching)
- Runs 7 aggregate analysis prompts + an at-a-glance synthesis
- Generates a self-contained HTML report + diffable `insights.json`

## The report

`/insights` produces a single self-contained HTML file — no server, no build step, just open it in a browser. It loads light by default with an **opt-in dark mode**, every section is **collapsible** for quick skimming, and **Export insights.json** downloads the underlying data so you can diff reports over time.

[![OpenCode Insights example report](docs/sample-report.png)](docs/sample-report.html)

> The image above is a static preview. For the interactive version — collapsible sections, dark-mode toggle, and JSON export — open [`docs/sample-report.html`](docs/sample-report.html) in a browser, or [preview it online](https://htmlpreview.github.io/?https://github.com/tim-hilde/opencode-insights/blob/main/docs/sample-report.html). The data shown is an illustrative example.

## Installation

> **Runtime:** Requires [Bun](https://bun.sh). The `engines.node` field in `package.json` is npm registry metadata only — the plugin uses `bun:sqlite` and cannot run under plain Node.js.

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["@tim_hilde/opencode-insights@1.0.0"]
}
```

## Usage

In the opencode TUI:

```
/insights                                       # current project only (default)
/insights --all                                 # analyze every project
/insights --days 7
/insights --force
/insights --model anthropic/claude-haiku-4-5
/insights --output ~/Desktop/my-insights.html
```

> By default `/insights` analyzes **only the current project's** sessions. Pass `--all` to include every project in your opencode history. Scoping to the current project also limits how much unrelated session content is fed to the analysis model.

## Configuration

On the first run, the plugin creates `~/.config/opencode/insights.json` with defaults:

```json
{
  "model": "anthropic/claude-haiku-4-5",
  "days": 30,
  "concurrency": 4
}
```

Edit this file to change the defaults for every `/insights` run.

| Field | Default | What it does |
|---|---|---|
| `model` | `anthropic/claude-haiku-4-5` | LLM used for all analysis calls. Format: `providerID/modelID`. Haiku-class models are recommended — they're fast, cheap, and sufficient for JSON extraction. Use a smarter model if you want richer analysis at higher cost. |
| `days` | `30` | How many days of session history to include. |
| `concurrency` | `4` | Max parallel LLM calls during per-session facet extraction. Increase to speed up the first run, decrease if you're hitting rate limits. |

Argument flags override config file values for a single run:

```
/insights --days 7              # override days
/insights --model anthropic/claude-sonnet-4-5  # use a smarter model this run
/insights --force               # re-analyze all sessions, ignoring cache
```

## How it works

1. **Extract** — reads sessions from `opencode.db` (current project + last 30 days by default; use `--all` for every project), filters out sub-agent sessions and `[insights]` sessions
2. **Facet extraction** — per-session LLM call extracting: goal, outcome, satisfaction, friction (cached to `~/.local/share/opencode/insights/facets/`)
3. **Aggregate analysis** — 8 prompts: project areas, interaction style, agent performance, friction, suggestions, tool health, horizon
4. **At-a-Glance synthesis** — final summary with split fault attribution (agent vs user-side)
5. **Report generation** — self-contained HTML + machine-readable `insights.json` for tracking over time

## Development

```bash
bun install
bun test
bun run scripts/smoke-db.ts  # LLM-free validation against real DB
```

## Attribution

This plugin ports and extends [opencode-usage](https://github.com/rchardx/opencode-usage) by rchardx (MIT License).

Prompt improvements are based on Claude Code's `/insights` system prompts as documented by [Piebald-AI/claude-code-system-prompts](https://github.com/Piebald-AI/claude-code-system-prompts).
