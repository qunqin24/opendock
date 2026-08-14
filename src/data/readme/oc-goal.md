<div align="right">

[English](./README.md) | [中文](./README.zh.md)

</div>

# oc-goal

Adds **Goal Mode** to [opencode](https://opencode.ai), modeled after OpenAI Codex's thread goals (`/goal`).

Set a goal, and the agent automatically starts a new turn after every turn ends, keeping up the work until the objective is verifiably complete, the token budget is exhausted, or you pause it manually.

## How it works (aligned with Codex)

- **State machine**: `active` → `complete` (declared by the model) / `blocked` (same blocker for 3 consecutive goal turns) / `paused` (user pause or Esc interrupt) / `budget_limited` (token budget exhausted) / `usage_limited` (API rate limit). Anything other than `active` stops automatic continuation.
- **Loop engine**: listens for the `session.status` idle event → if the goal is still active, automatically starts a new turn with a hidden synthetic message. The message contains the objective, token usage/remaining, and the Completion audit + Blocked audit instructions (ported from Codex's `continuation.md`).
- **Model tools**: `create_goal` / `get_goal` / `update_goal` (update only accepts `complete`/`blocked`; pause/resume/budget are controlled by the user or system, same as Codex).
- **Budget accounting**: incrementally accumulates `(input - cache.read) + output + reasoning` per assistant message; crossing the budget flips status to `budget_limited` and injects a one-time wrap-up notice (soft stop, the turn is not hard-killed).
- **Loop safety**: turn errors → `blocked`; API rate limits → `usage_limited`; Esc interrupt → `paused`.
- State is persisted to `~/.local/share/opencode/oc-goal/<project-id>.json` and survives restarts and compaction (the goal is injected into the compaction summary context).

## Installation

Add the plugin to your global `~/.config/opencode/opencode.json` (or a project-level `opencode.json`) — opencode installs it automatically, no manual download needed:

```json
{
  "plugin": ["oc-goal"]
}
```

Alternative (from source): clone this repo, run `npm install`, then reference the file directly:

```json
{
  "plugin": ["file:///absolute/path/oc-goal/src/index.ts"]
}
```

You can also copy or symlink `src/index.ts` to `~/.config/opencode/plugins/goal.ts` (make sure `@opencode-ai/plugin` is resolvable).

## Usage

```
/goal <objective>     Set a goal and start working on it immediately (replaces any existing goal)
/goal                 Show current goal status (status also works)
/goal pause           Pause automatic continuation
/goal resume          Resume (from paused/blocked/usage_limited)
/goal budget 500000   Set a token budget
/goal budget none     Remove the budget
/goal clear           Clear the goal
```

While a goal is active:

- After every turn, the agent automatically continues until the model calls `update_goal` to declare `complete` (requires passing the completion audit) or `blocked` (requires the same blocker for 3 consecutive turns).
- Pressing Esc to interrupt any turn automatically pauses the goal; use `/goal resume` to continue.
- When the budget is exhausted, continuation stops automatically and you're prompted to raise it with `/goal budget <n>` and then `/goal resume`.

## Development

```sh
npm run typecheck
```
