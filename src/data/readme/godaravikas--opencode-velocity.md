# opencode-velocity

![opencode-velocity](docs/images/opencode-velocity.jpeg)

[![npm](https://img.shields.io/npm/v/@godaravikas/opencode-velocity)](https://www.npmjs.com/package/@godaravikas/opencode-velocity)
[![npm downloads](https://img.shields.io/npm/dm/@godaravikas/opencode-velocity)](https://www.npmjs.com/package/@godaravikas/opencode-velocity)
[![Tests](https://img.shields.io/github/actions/workflow/status/godaravikas/opencode-velocity/ci.yml?label=tests)](https://github.com/godaravikas/opencode-velocity/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Supercharge your OpenCode workflow with complete visibility into AI usage, effort, and project costs.

## Requirements

**OpenCode >= v1.18.16**


## Installation

> **Important:** This is a **TUI plugin**. It must be added to `tui.json`, not `opencode.json`.

Create or edit `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@godaravikas/opencode-velocity"]
}
```

OpenCode installs it automatically via Bun at startup. Fully restart OpenCode after changing the configuration.

## Usage

Type `/velocity` in the OpenCode TUI. Press **Esc** to return to chat, or press **`d`** to download a self-contained detailed HTML report in the current project directory.

### Key bindings

| Key | Action |
|-----|--------|
| `Scroll` | Use mouse scroll through the report to move up or down |
| `Click` | Open the selected project only by clicking on it |
| `Esc` | Close the report and return to the same session in OpenCode |
| `d` | Download the HTML report in current directory|
| `c` | Configure the dollars-per-credit rate |

## Preview

### TUI

Project overview with averages, model usage, tool calls, and parent sessions with indented subagent sessions:

```text
Velocity Report v0.1.0                  c: configure credits ($0.0100/credit) · d: download · Esc: close
────────────────────────────────────────────────────────────────────────────────────────────────────

SUMMARY — all projects
Projects 4 · Sessions 17 · User Turns 42 · Messages 150
Total tokens: 1.20M
  input 620.0K · output 280.0K · reasoning 90.0K
  cache read 180.0K · cache write 30.0K
Total credits: 1,234
Total spent: $12.34

AVERAGES
METRIC                  VALUE       METRIC                  VALUE
Tokens / session        70.6K       Credits / message       8
Credits / session       73          Tokens / project         300.0K
Messages / session      8.8         Credits / project        309
Tokens / message        8.0K        Sessions / project      4.3

MODELS USED
MODEL                         MSGS    TOKENS       COST
anthropic/claude-sonnet-4-5  92       720.0K       $8.40
openai/gpt-5                 38       310.0K       $3.10
anthropic/claude-haiku-4-5   20       170.0K       $0.84

TOOL CALLS
bash                     ████████████████████████████████████████ 42
read                     ██████████████████████████                 28
edit                     ███████████████                            16
grep                     █████████                                    9

PROJECTS (4)
  TITLE                                     TOKENS        IN / OUT          CACHE R/W           COST    CREDITS  EFFORT   LAST ACTIVITY
  storefront-web
    /home/dev/code/storefront-web
    9 sessions · 24 user turns · 86 messages · 420.0K tokens · 420 credits · spent: $4.20 · effort: 2.1h · last activity: 2026-08-28 14:20
      Fix checkout flow                   210.0K        110.0K / 45.0K   40.0K / 15.0K      $2.10    210      48m      2026-08-28 14:20
        ↳ Explore payment provider         80.0K         42.0K / 18.0K   16.0K /  6.0K      $0.80     80      21m      2026-08-28 13:55
      Add product filters                  120.0K         60.0K / 27.0K   20.0K /  7.0K      $1.20    120      32m      2026-08-27 10:05
```

### HTML report

The downloaded report presents the same data as a responsive, self-contained HTML dashboard:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      VELOCITY REPORT                                          │
│                       Generated: Friday, August 28, 2026 at 2:20 PM                           │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

SUMMARY
┌──────────┬──────────┬────────────┬──────────┬──────────────┬───────────────┬──────────────┐
│ Projects │ Sessions │ User Turns │ Messages │ Total tokens │ Total credits │ Total spent  │
│    4     │    17    │     42     │   150    │    1.20M     │     1,234     │    $12.34    │
└──────────┴──────────┴────────────┴──────────┴──────────────┴───────────────┴──────────────┘

AVERAGES
┌────────────────┬──────────────┬──────────────────┬──────────────┬─────────────────┐
│ Tokens/session │ Credits/session │ Messages/session │ Tokens/message │ Credits/message │
│     70.6K      │       73        │       8.8        │     8.0K       │        8        │
└────────────────┴──────────────┴──────────────────┴──────────────┴─────────────────┘

CHARTS
  Tokens by project          Cost by project          Token usage by model       Tool calls


PROJECTS
┌─ storefront-web ────────────────────────────────────────────────────────────────────────────┐
│ /home/dev/code/storefront-web                 Last activity: 2026-08-28 14:20                │
│ Sessions 9 · User Turns 24 · Messages 86 · Tokens 420.0K · Total credits 420 · Total spent │
│ $4.20 · Effort 2.1 h                                                                         │
│                                                                                              │
│ By model                                  Tool calls                                         │
│ Model                         Msgs Tokens Cost  Tool                         Calls            │
│ anthropic/claude-sonnet-4-5    52  300.0K $3.60  bash                           18            │
│ openai/gpt-5                   20   80.0K $0.80  read                           12            │
│                                                                                              │
│ Sessions                                                                                     │
│ Session                    Turns Replies In / Out       Reasoning Cache R/W Tools Credits   │
│ Fix checkout flow              8      16  110K / 45K       18K     40K / 15K   22     210    │
│ ↳ Explore payment provider    3       6   42K / 18K        7K     16K /  6K    8      80    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

The downloaded HTML report includes summary cards, project and model charts, grouped provider/model token usage, tool-call breakdowns, and full session details.

## How it works

- The native `/velocity` reads all discovered OpenCode projects and sessions and display the report. When you exit, you’ll return to the same session. 
- The local opencode SQLite database is used for reporting.
- Parent sessions and subagent sessions are shown separately. Subagent rows are indented beneath their parent where the relationship is available.
- Project and top-level session counts include parent sessions only. User Turns also sum parent sessions only; token, cost, message, model, and tool totals include subagent activity.
- Reports count only projects having at least one session; projects with no sessions are excluded from the project count.
- The HTML report is self-contained and can be opened offline after it is downloaded.
- Credit conversion defaults to `$0.01 = 1 credit` and can be changed with `c` in the dashboard or `--dollars-per-credit` in the TUI.

### How effort is calculated

Effort measures elapsed time spent handling user turns. It is calculated from
per-message Unix timestamps in milliseconds:

```text
turn effort = min(max(0, last assistant end - user message start), 30 minutes)
session effort = sum of all turn effort values
```

- A turn starts at the user's message.
- A turn ends at the last assistant message before the next user message.
- Using the last assistant message includes the complete agent loop, including intermediate tool-call responses.
- Negative or incomplete intervals are ignored.
- Each turn is capped at 30 minutes (`1,800` seconds) to avoid counting long idle periods when a session is resumed later.
- Project effort is the sum of all session effort, including subagent sessions.
- The calculation requires per-message timestamps. Reports show `—` when the selected data source does not provide enough timestamps.

For example, if a user message is created at `10:00:00` and the final assistant
response completes at `10:02:10`, the turn contributes `130` seconds. If that response takes 45 minutes to complete, the turn contributes a maximum of `1,800` seconds — though it is highly unlikely an agent would remain silent for that long.

Effort is displayed as rounded minutes for individual
sessions, and displayed as hours for project summaries.

## How to upgrade

Clear the plugin cache and OpenCode will fetch the latest version automatically on next startup:

```bash
rm -rf ~/.cache/opencode/packages/@godaravikas
```

## Contributing

Source code: [github.com/godaravikas/opencode-velocity](https://github.com/godaravikas/opencode-velocity)

Issues and pull requests are welcome.

## License

MIT — see [LICENSE](./LICENSE)

---
