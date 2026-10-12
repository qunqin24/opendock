# opencode-session-time

[![npm version](https://img.shields.io/npm/v/opencode-session-time)](https://www.npmjs.com/package/opencode-session-time)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Timestamps for your [OpenCode](https://opencode.ai) V2 sessions: wall clock in the prompt footer,
`Session` block in the sidebar (started / last answer), and a `/time` timeline panel.

Small TUI plugin built on the official [`@opencode/plugin/tui`](https://opencode.ai/v2/docs/build/plugins/cli/) API.

## What you get

| Where | What |
| --- | --- |
| Prompt footer (`prompt.footer.status`) | wall clock, `DD.MM, HH:mm`, refreshes every 30s |
| Sidebar (`sidebar.content`) | `Session` block styled like the built-in `Context`/`MCP` blocks: `<date, time> started` and `<date, time> last answer` |
| `/time` command (session panel) | per-turn timeline: start time, agent, model, completion time |

Both timestamps update live: the plugin re-renders on data events (so `last answer`
appears as soon as a model reply lands).

## Why the sidebar and not under each message?

The plugin API exposes slots for `app`, `home.footer*`, `prompt.footer*`,
`session.composer.top`, `sidebar.*` and `session.panel` — but there is **no slot for
the per-message footer**, and no settings option for it either. Inline per-message
timestamps would need an upstream `message.footer` slot. Until then, the sidebar block
is the closest native place.

## Install

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-session-time"]
}
```

Or install it explicitly:

```bash
npm i -g opencode-session-time
```

Requirements: OpenCode V2; `@opentui/core`, `@opentui/solid`, `solid-js` are peer
dependencies provided by the host.

## Notes

- Format is `DD.MM, HH:mm` — tweak `fmt()` in `src/tui.tsx` to taste.
- Plugin edits hot-reload: the plugin is rebuilt on reconciliation, no TUI restart needed.
- `/time` shows the timeline for the session you are currently in.

## License

MIT
