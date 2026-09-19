# Opencode Total Session Cost Tracker 💰

[![npm version](https://img.shields.io/npm/v/opencode-total-session-cost.svg?logo=npm&color=CB3837)](https://www.npmjs.com/package/opencode-total-session-cost)
[![npm downloads](https://img.shields.io/npm/dm/opencode-total-session-cost.svg?logo=npm&color=51a822)](https://www.npmjs.com/package/opencode-total-session-cost)
[![npm provenance](https://img.shields.io/badge/provenance-signed-blue?logo=sigstore&color=007ec6)](https://www.npmjs.com/package/opencode-total-session-cost)
[![CI Status](https://github.com/StayPirate/opencode-total-session-cost/actions/workflows/ci.yml/badge.svg)](https://github.com/StayPirate/opencode-total-session-cost/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/StayPirate/opencode-total-session-cost)
[![GitHub stars](https://img.shields.io/github/stars/StayPirate/opencode-total-session-cost.svg?style=flat&logo=github&color=007ec6)](https://github.com/StayPirate/opencode-total-session-cost/stargazers)

A real-time, lightweight plugin for [Opencode](https://opencode.im) that tracks and displays the **actual cumulative cost** of your active session, including all background tasks, sub-agents, and child sessions.

## Why this plugin?
By default, Opencode only displays the cost of your active main session. However, any background tasks or specialized sub-agents (like `explore`, `coder`, or custom test executors) invoked during your conversation run in their own child sub-sessions, keeping their costs hidden.

Without tracking these sub-sessions, you might see a main session cost of a few cents, while the background agents have spent significantly more.

**This plugin solves that.** It automatically aggregates the costs of your main session and all its nested child tasks, displaying your **real, total spending** in real-time directly inside the main session.

## Features
- **Sidebar-Independent**: The cost indicator stays visible even when the Opencode sidebar is closed.
- **Recursive Sub-Agent Tracking**: Automatically detects and sums up the costs of all child tasks spawned during your session.
- **Detailed Cost Breakdown**: Offers a `/total_cost` slash command to show a detailed popup separating your active session cost from child task and sub-agent costs.
- **Session List Cost View**: Offers a `/sessions_cost` command that opens a dialog with the sessions of the last 7 days grouped by day, showing the total cost (including sub-agents) of each session and of each day.
- **Provider & Model Breakdown**: Displays the exact costs accumulated per model across all session hierarchy levels.
- **Mouse Click Interaction**: Left-clicking on the cost bar in the prompt header right panel triggers the same detailed breakdown popup, while right-clicking opens the session costs list.

## Installation
Install it globally with:
```bash
opencode plugin opencode-total-session-cost -g
```

## Cost categories
The breakdown separates costs into three buckets:
- **Session**: the cost of the active/root session.
- **Task**: child sessions spawned through the Task tool by the `explore` and `general` agents.
- **Sub-agent**: any other child session.

Example `/total_cost` output:
```
By session
Session:   $0.12
Task:      $0.34
Sub-agent: $0.08
---------------
Total:     $0.54

By provider/model
anthropic/claude-sonnet-4: $0.40
openai/gpt-5:              $0.14
------------------------------
Total:                     $0.54
```

## Session list costs
Run `/sessions_cost` (or `/session_costs`) to open a centered, read-only dialog with
the sessions of the last 7 days grouped by day. Each day header shows the total of its
sessions and each session row shows its recursive total (session plus every child
sub-session). Use the up/down arrows to move the selection and `enter` to open a
session; `esc` closes the dialog.

```
Session Costs                                  last 7 days
Today                                              $0.54
  Refactor the parser                              $0.41
  Add integration tests                            $0.13
Wed Sep 16 2026                                    $0.22
  Fix flaky test                                    $0.22
```

## How it works
The plugin runs inside Opencode's TUI framework, recursively fetching session data:
1. It reads the core cost of your active session.
2. It recursively queries all child sub-sessions spawned by sub-agents.
3. It displays the combined sum dynamically in the TUI.

## Development
```bash
npm install
npm run typecheck
npm test
```

## License
MIT
