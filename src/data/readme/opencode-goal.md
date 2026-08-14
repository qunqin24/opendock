# opencode-goal

[![npm version](https://img.shields.io/npm/v/opencode-goal?color=cb3837)](https://www.npmjs.com/package/opencode-goal)
[![CI](https://github.com/mirsella/opencode-goal/actions/workflows/ci.yml/badge.svg)](https://github.com/mirsella/opencode-goal/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/opencode-goal)](https://www.npmjs.com/package/opencode-goal)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

OpenCode server plugin that adds Codex-style `/goal` behavior for long-running tasks.

## Commands

- `/goal`: show the current goal or `Usage: /goal <objective>` if none exists.
- `/goal <objective>`: set or replace the active goal without resetting its elapsed-time stats.
- `/goal append <text>`: append text to the active goal without resetting its elapsed-time stats.
- `/goal pause`: pause auto-continuation.
- `/goal resume`: resume auto-continuation.
- `/goal clear`: remove the goal.

Active goals auto-continue when the session becomes idle. The continuation prompt is based on Codex's goal prompt with all token and budget handling removed.

## Tool

The plugin exposes `update_goal({ status: "complete" })` only while at least one active goal exists, so inactive sessions do not carry extra tool context.

## State

Goal state is saved to disk per session and restored when the OpenCode process restarts. By default it is stored under `$XDG_STATE_HOME/opencode-goal` or `~/.local/state/opencode-goal`; set `OPENCODE_GOAL_STATE_FILE` to override the state file path. Only wall-clock active time is tracked. Token usage and token budgets are intentionally not tracked or mentioned.

## Install

Add the npm plugin to your OpenCode config:

```jsonc
"plugin": [
  "opencode-goal",
]
```

Restart OpenCode after installing. OpenCode installs npm plugins automatically at startup.

## Checks

```sh
bun install
bun test
bunx tsc --noEmit
```

## Known Gaps

- OpenCode server plugins do not expose Codex's replace-confirmation menu, so `/goal <objective>` replaces immediately.
- Plan-mode suppression is best effort because plugin events do not always expose the active mode.
- Continuation prompt injection uses OpenCode's experimental message transform hook.
