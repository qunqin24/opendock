# opencode-bonus-info

A [OpenCode](https://opencode.ai) TUI plugin that adds a collapsible **Bonus Info** section to the sidebar, showing:

- **Start** — elapsed time since you opened the session in the window (resets on restart or session switch)
- **Idle** — elapsed time since the assistant's last response, plus a timestamp of when it finished

![Screenshot](docs/screenshot.png)

```
▼ Bonus Info
Start: 00:18:48 (24-08-2026 15:55)
Idle: 00:04:36 (24-08-2026 16:09)
```

## Features

- **Foldable** — click the header (▼/▶) to expand/collapse; state persists across restarts
- **Live timers** — `HH:MM:SS`, ticking every second, capped at `99:59:59`
- **Idle ≤ Start guaranteed** — responses from before you opened the session are ignored, so Idle never counts time you were not looking at it
- **Multi-window safe** — each window tracks its own session; no shared state files
- **Zero server-side components** — a single TUI plugin file, no state files, no background processes

## Install

### From npm

OpenCode installs npm plugins automatically at startup. Register the package in
`~/.config/opencode/tui.json` — the loader resolves the `./tui` export from the
package name automatically:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "@aundal/opencode-bonus-info"
  ]
}
```

### From a local file

Clone the repo into your OpenCode config directory:

```
git clone https://github.com/aundal/opencode-bonus-info.git ~/.config/opencode/github/opencode-bonus-info
```

Register the file in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "./github/opencode-bonus-info/src/bonus-info.tsx"
  ]
}
```

(Paths are relative to `~/.config/opencode`.)

Alternatively, copy `src/bonus-info.tsx` anywhere you like and reference that
path instead. Restart OpenCode to load the plugin.

## How it works

The widget resolves the current session ID from the slot props, falling back to
`api.route.current` (older versions do not deliver `session_id` to the
`sidebar_content` slot). It then finds the last completed assistant message via
`api.client`, trying multiple SDK conventions until one returns data:

1. `session.messages({ sessionID })` — legacy client, positional args
2. `session.messages({ path: { id } })` — legacy client, hey-api style
3. `v2.session.messages({ sessionID })` — SDK v2
4. `v2.session.messages({ sessionID, limit: 0 })` — SDK v2, legacy store

Responses are normalized across both envelope shapes (`data.data`, `data`, raw body).
As a final safety net, `message.updated` events carry `info.time.completed`
directly, so Idle updates even if every HTTP convention fails.

## Compatibility

Tested on OpenCode **1.18.16** (Windows). The fallback chain above exists because
the TUI plugin API surface has shifted between versions (slot props, SDK v2 vs
legacy client, and a messages endpoint that reads different stores depending on
query params). If one convention fails on your version, the next is tried — and
the event stream covers the rest.

## License

MIT
