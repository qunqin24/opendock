# opencode-session-time

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Timestamps for your [OpenCode](https://opencode.ai) V2 sessions: a current-turn
stopwatch in the prompt footer, a `Session Timings` block in the sidebar, and a
`/time` timeline panel.

> This is a fork of
> [LazyGatto/opencode-session-time](https://github.com/LazyGatto/opencode-session-time)
> that adds last user input, last model thought, and last model reply timings, plus
> relative ages.

Small TUI plugin built on the official [`@opencode/plugin/tui`](https://opencode.ai/v2/docs/build/plugins/cli/) API.

## What you get

| Where | What |
| --- | --- |
| Prompt footer (`prompt.footer.status`) | current-turn elapsed time, `⏱ MM:SS` (or `⏱ H:MM:SS`). Starts when the first assistant step begins after the last user input and freezes when the turn completes. If that step is outside the loaded message window, it falls back to the last user input time. |
| Sidebar (`sidebar.content`) | `Session Timings` block styled like the built-in `Context`/`MCP` blocks: session start, last user input, last model thought, and last model reply. Each row shows a timestamp, relevant duration, and `x ago` age. Historical values are backfilled from the API when they are outside the loaded window. Rows are sorted oldest to newest; rows without a timestamp stay at the bottom. |
| `/time` command (session panel) | assistant turn timeline: start time, agent, model, completion time, and duration |

The sidebar block updates live on data events, and relative ages refresh every second.
The prompt-footer timer is a turn stopwatch, not a wall clock; it shows `00:00` while
waiting for the first assistant step and `—` when there is no turn.

Per-session anchors are persisted in durable storage, so a TUI restart restores the
last input, thought, and reply immediately; the API backfill covers new sessions and
other devices.

Example:

```text
Session Timings
16:27:31 started · 1d ago
17:43:12 input · 3m ago
17:43:20 thought · 2.1s · 3m ago
17:44:02 reply · 8.4s · 2m ago
```

Same-day timestamps omit the date. Older timestamps include it (`23.10, 16:27:31`).

The prompt footer shows the current-turn stopwatch:

```text
⏱ 03:12
```

## Why the sidebar and not under each message?

The plugin API exposes slots for `app`, `home.footer*`, `prompt.footer*`,
`session.composer.top`, `sidebar.*` and `session.panel` — but there is **no slot for
the per-message footer**, and no settings option for it either. Inline per-message
timestamps would need an upstream `message.footer` slot. Until then, the sidebar block
is the closest native place.

## Install

This fork is TUI-only. Install the pinned release tag from GitHub:

```bash
opencode plugin add github:ransagy/opencode-session-time#v0.2.1
```

`opencode plugin add` writes the plugin to your global CLI configuration and installs
it from GitHub. Restart the TUI after installing.

To track the development branch instead:

```bash
opencode plugin add github:ransagy/opencode-session-time#feat/session-timings
```

Requirements: OpenCode V2; `@opentui/core`, `@opentui/solid`, `solid-js` are peer
dependencies provided by the host. This is a terminal-client plugin; web and desktop
clients do not load TUI plugins.

## Notes

- `/time` shows the timeline for the session you are currently in.
- The sidebar block uses `append`, so it appears after the built-in Context/MCP panels.
- Plugin edits hot-reload: the plugin is rebuilt on reconciliation, no TUI restart needed.

## License

MIT. Original work copyright (c) 2026 LazyGatto; see [LICENSE](LICENSE).
