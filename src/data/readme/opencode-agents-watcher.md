<p align="center">
  <picture>
    <source srcset="assets/logo-dark.svg" media="(prefers-color-scheme: dark)">
    <source srcset="assets/logo-light.svg" media="(prefers-color-scheme: light)">
    <img src="assets/logo-light.svg" alt="Agents Watcher logo">
  </picture>
</p>

<p align="center">Watch and recover every sub-agent at once.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-agents-watcher"><img alt="npm" src="https://img.shields.io/npm/v/opencode-agents-watcher?style=flat-square"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square"></a>
</p>

---

An [OpenCode](https://opencode.ai) TUI plugin that adds a live agents widget to the session sidebar. See which sub-agents are active, what they are doing, how much context they use, and how long they have been running without leaving the parent session.

Expand an agent for its model, current tool, and cost, or open the complete child session with `[view]`.

<p align="center">
  <img src="assets/opencode-agents-monitor.gif" alt="Agents Watcher sidebar tracking active and completed OpenCode sub-agents">
</p>

## Why?

Parallel work is useful, but it is easy to lose track of which child sessions are still progressing. Agents Watcher keeps active work visible, moves completed agents into an archived section, and restores useful history when the TUI starts.

The utility is designed to observe sub-agent behavior, provide guarded restart controls when an agent stops progressing or encounters a recoverable problem, and preserve an auditable record of each child session’s activity and recovery state.

## Features

- Live `thinking`, `tool`, `retry`, `done`, and `idle` states
- The latest tool call while an agent is working
- Token usage, elapsed time, model, and cost at a glance
- Expandable rows and a `[view]` action for full child-session details
- Paginated archived agents for long-running parent sessions
- Optional timeout supervision with guarded resume or replacement-session recovery

## Installation

If you have OpenCode 1.18.0 or later, install the plugin with:

```
opencode plugin add opencode-agents-watcher@0.1.0
```

For OpenCode v2:

> WIP

## Manual installation

Add to `~/.config/opencode/opencode.json` (global) or `opencode.json` (project).

If you have OpenCode 1.18.0 or later, install the plugin with:

```json
{
  "plugin": ["opencode-agents-watcher@0.1.0"]
}
```

For OpenCode v2:

```json
WIP
```

Add the absolute source path to `tui.json` globally at `~/.config/opencode/tui.json` or per project at `.opencode/tui.json`.

Restart OpenCode after changing the configuration.

## Usage

| Action | Result |
| --- | --- |
| Click `Agents` | Collapse or expand the widget |
| Click an agent row | Show or hide model, tool, and cost |
| Click `[view]` | Open the complete child session |
| Click `[restart]` | Restart an eligible busy agent through the guarded recovery path |
| Click `Archived (n)` | Show or hide completed agents |
| Click `[<]` / `[>]` | Move through archived pages |
| Run `/aw-cleanup` | Confirm and delete persisted watcher data from `.opencode/agents-watcher` |

Status markers breathe while an agent is active; `!` means retrying, and `-` means idle or done.

## Supervision

Create `.opencode/monitor.json` in the project root:

```json
{
  "enabled": true,
  "agents_timeout": "30m",
  "poll_interval": "10s",
  "timeout_mode": "busy_only",
  "restart_mode": "resume",
  "max_restarts": 2,
  "auto_restart": true,
  "confirm_first_restart": true
}
```

| Field | Meaning |
| --- | --- |
| `enabled` | Must be `true` before any restart is possible. |
| `agents_timeout` | Positive duration such as `30s`, `5m`, `30m`, or `2h`. |
| `poll_interval` | How often the supervisor checks agents; minimum `1s`. |
| `timeout_mode` | `busy_only` counts busy/retry time; `wall_clock` counts from creation. |
| `restart_mode` | `resume` prompts the same session; `new_session` creates a replacement child. |
| `max_restarts` | Maximum persisted recovery attempts per agent. |
| `auto_restart` | Enables automatic recovery. If `false`, use the manual `[restart]` action. |
| `confirm_first_restart` | Shows confirmation for manual restart actions. |

Only busy or retrying child sessions are eligible. Recent activity, question/permission blocks, idle sessions, completed sessions, cooldowns, and the restart limit prevent recovery. Supervision state is stored under `.opencode/agents-watcher/<parent-session-id>/agents.json`.

## Commands

Use `/aw-cleanup` when you want to remove all persisted watcher records for the current project. The command asks for confirmation and does not delete OpenCode sessions, source files, or any data outside `.opencode/agents-watcher`.

## How it works

- Registers through the official `sidebar_content` TUI slot.
- Tracks child sessions from session events plus an initial session-list hydration.
- Combines live session status with message parts to show activity and the latest tool.
- Hydrates completed agents lazily for historical token and elapsed-time data.
- Runs supervision on an independent timer and persists guarded recovery state.
- Keeps tracker state outside the slot component tree so TUI re-renders do not reset it.

## Greetings

This repository is inspired by [opencode-agents-monitor](https://github.com/Dqz00116/opencode-agents-monitor).
