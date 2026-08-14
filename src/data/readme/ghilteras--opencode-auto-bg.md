# opencode-auto-bg

Transparent automatic backgrounding for OpenCode subagents. Zero API changes — you keep calling `task()` as usual, this plugin backgrounds your architect's children automatically.

## What it does

Three features on the `event` hook:

1. **Auto-background** (`session.created`) — when architect spawns a child subagent, this plugin polls until the child is busy, then calls `POST /experimental/session/<parentID>/background`. The parent goes idle immediately and the turn returns to the user. No more "delegating task..." hanging.

2. **Wake safety net** (`session.idle` on a child) — in ~3% of cases the native OpenCode wake fails to deliver the `<task_result>` back to the parent, or delivers it but the parent turn dies silently. This watchdog verifies the parent actually completed a turn after delivery, then re-wakes via the sync `/session/:id/message` route with the parent's previous model to preserve prompt cache.

3. **TODO-sync nudge** (`session.idle` on a TOP-LEVEL architect session) — STATE-BASED since v1.2.0: reads the real TODO via `GET /session/{id}/todo` and, if any task is still `in_progress` when the session goes idle, injects a reminder to sync it. This turns the "TODO updated at the end of every turn" rule into a mechanical trigger instead of self-discipline. Guarded: no nudge while a subagent delegation is in flight (in_progress is legit then), and no nudge if the last turn already called `todowrite` (convergence). A 2-min cooldown prevents loops.

## Install

```bash
npm install @ghilteras/opencode-auto-bg
```

## Configure

Add to your `opencode.json` or `opencode.jsonc`:

```json
{
  "plugin": ["@ghilteras/opencode-auto-bg"]
}
```

The plugin auto-detects sessions whose parent agent is `"architect"`. To target a different primary agent, set in `opencode.jsonc`:

```json
{
  "agent": {
    "config": {
      "@ghilteras/opencode-auto-bg": {
        "parentAgent": "build"
      }
    }
  }
}
```

## Requirements

- OpenCode with plugin support
- No npm dependencies (uses built-in `fetch()`)

## How it works

- `session.created` → polls child status every 200ms up to 10s. When the child becomes "busy", backgrounds the parent.
- `session.idle` on a child → watches the parent for 5 minutes. If the parent stays idle without processing the task result, sends a wake message reusing the parent's last model to preserve prompt cache.
- `session.idle` (top-level architect) → reads `/session/{id}/todo`; if any task is `in_progress` (and no child delegation is busy, and the last turn didn't already call `todowrite`), injects a synthetic nudge via /message (same model-preservation rule).

## Why?

OpenCode's native subagent delegation keeps the parent in foreground until the child completes. The built-in background API exists but has to be called manually. This plugin makes it automatic and handles edge cases the native wake misses.

## License

MIT
