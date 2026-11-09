# opencode-agents-dashboard

A live web dashboard for [OpenCode](https://opencode.ai) — see what your AI agents are doing, in real time, in the browser.

Built as an OpenCode **V2 plugin**. It observes the server's public event stream and tool lifecycle hooks, and serves a self-contained dashboard (vanilla JS/CSS, zero runtime dependencies beyond Node/Bun builtins):

- **Live/All rail** — default **Live** shows only active + recently-active sessions (and their subagents); **All** browses everything; hover **✕** removes a session from the dashboard, **Clear finished** prunes all stale ones (OpenCode itself is untouched)
- **Main actor + stage** — the selected session owns the main stage (newest-first timeline, reasoning peek, subagents, stats); auto-follow chases the working session until you pin another (Esc resumes)
- **Stop = real shutdown** — the topbar ⏻ Stop closes the dashboard server, frees the port and fully detaches the observer; OpenCode keeps running. The stopped page explains how to come back (reload after `opencode service restart`)
- **Rename sessions** — ✎ button on the stage renames the session in OpenCode itself (`ctx.session.update`); the rail and OpenCode's session list reflect it
- **Real lifecycle states** — derived from each session's `time.busy / time.idle / outcome`: only genuinely running sessions show "Working…", finished ones show Idle, failed ones Error
- **History on demand** — selecting a session hydrates its recent activity from the server API, so old sessions are meaningful the moment you click them
- **Live tool calls** — name, target (file, command, pattern…), live duration, error details
- **Context compaction** — dedicated timeline entries (auto vs. manual) with running / completed / failed states, driven by `session.compaction.*` events and compaction message parts
- **Native V2.2 event family** — consumes the granular `session.tool.*` / `session.text.*` / `session.reasoning.*` / `session.usage.updated` / `session.execution.*` bus events (legacy 2.x names still supported), with an auto-resubscribing event pump
- **Self-observability** — `/api/state` includes `stats`: total events handled, per-type counters, last event type/time, and pump resubscribe count — so a silent collector can never hide again
- **Subagents** — child sessions detected, nested in the rail and linked on stage
- **UI shutdown** — ⏻ Stop fully closes the dashboard server and detaches the observer; OpenCode itself is untouched. ↻ Reconnect reloads the page once the plugin is running again
- **Configurable port** — plugin options or environment variable, with auto-increment when busy
- **Auto-open** — opens the dashboard in your browser when the server starts (optional)

## Screenshot

![opencode-agents-dashboard — live view of a working session](https://github.com/fabiomatricardi/opencode-agents-dashboard/raw/main/plugins/agents-dashboard/docs/screenshot.png))

The UI follows a dark + orange "trading dashboard" aesthetic (cards, big numbers, one hot accent).

## Install

> **Requires OpenCode 2.x.** OpenCode 1.x uses a different plugin system (a singular `plugin` config key and a different hook surface); on 1.x the `plugins` key below is simply ignored — nothing crashes, but nothing starts either.

### From npm (recommended)

Let OpenCode manage the package — it downloads it into its own cache on startup, keeps it updated, and your project's `package.json` is never touched:

```sh
opencode plugin add opencode-agents-dashboard
```

This registers the plugin in your **global** config, so it runs in every project. To pass options (port, auto-open), edit that entry into the object form:

```jsonc title="~/.config/opencode/opencode.jsonc"
{
  "plugins": [
    { "package": "opencode-agents-dashboard", "options": { "port": 4590, "autoOpen": true } }
  ]
}
```

### Per project

Prefer the dashboard in one project only? Add the package to that project's `opencode.json(c)` (or `.opencode/opencode.json(c)`) instead:

```jsonc
{
  "plugins": [
    { "package": "opencode-agents-dashboard", "options": { "port": 4090 } }
  ]
}
```

### Local / development (this repo)

The plugin is already wired in [`opencode.jsonc`](../opencode.jsonc) at the repo root:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "./plugins/agents-dashboard",
      "options": { "port": 4090, "autoOpen": true }
    }
  ]
}
```

Install its dependency once (the `@opencode/plugin` SDK):

```sh
cd plugins/agents-dashboard
npm install
```

Then start OpenCode normally — the dashboard URL is printed in the log and opens in your browser.

> Tip: a `plugins/` directory sitting next to a project-root `opencode.json` is **not** auto-discovered — reference it explicitly as above, or place it under `.opencode/plugins/`, which OpenCode scans automatically.

### Any other project (local checkout)

Point the config entry at the checked-out plugin directory:

```jsonc
{
  "plugins": [
    { "package": "C:/path/to/20261105-agentsdashboard/plugins/agents-dashboard", "options": { "port": 4090 } }
  ]
}
```

Or publish it (`npm publish` in `plugins/agents-dashboard`) and use the package name:

```jsonc
{ "plugins": [{ "package": "opencode-agents-dashboard", "options": { "port": 4090 } }] }
```

### Publishing checklist

```sh
cd plugins/agents-dashboard
npm whoami        # login with `npm adduser` first if needed
npm publish --access public
```

## Options & environment

| Option   | Env override                 | Default | Meaning                                            |
| -------- | ---------------------------- | ------- | -------------------------------------------------- |
| `port`   | `AGENTS_DASHBOARD_PORT`      | `4590`  | Dashboard web server port; auto-increments if busy |
| `autoOpen` | `AGENTS_DASHBOARD_AUTO_OPEN=false` | `true` | Open the browser automatically on start        |
| *(watchdog)* | `AGENTS_DASHBOARD_IDLE_MS` | `90000` | Silence before an active session is auto-marked Idle (guards against missed idle events) |
| *(debug)* | `AGENTS_DASHBOARD_DEBUG=true` | off | Log raw event types/payloads to the server log |

Debug event payloads with `AGENTS_DASHBOARD_DEBUG=true`.

## Demo mode (no OpenCode needed)

Replays `session-example.json` through the exact same store + server the live plugin uses — great for styling and testing:

```sh
cd plugins/agents-dashboard
npm run demo          # → http://127.0.0.1:4099
```

`DEMO_PORT` and `DEMO_STEP_MS` tweak the replay speed.

There is also a quick self-test harness that boots the plugin's setup against a fake host (no OpenCode needed) and asserts the bridge, hooks and SSE path:

```sh
npm run harness
```

## How it works

```
OpenCode server process
└── plugin (src/index.ts) — Plugin.define, options, lifecycle, control plane
    ├── collector (src/collector.ts)
    │     ├── ctx.event.subscribe()  → session.*, message.part.updated, permission.*
    │     └── ctx.tool.hook(...)     → guaranteed tool start/end (name, input, status)
    ├── store (src/store.ts)         → normalized sessions, rolling activity buffers, derived states
    └── bridge (src/http.ts)         → node:http server
          ├── GET /                        → dashboard UI (public/)
          ├── GET /api/state               → JSON snapshot (initial paint)
          ├── GET /stream                  → Server-Sent Events push
          ├── GET /api/session/:id/messages   → hydrate history (ctx.session.context)
          ├── DELETE /api/session/:id        → drop a session from the dashboard view
          ├── POST /api/session/:id/rename  → rename the session in OpenCode
          ├── POST /api/shutdown[?full=1]    → stop observing; full=1 closes the server and frees the port
          └── POST /api/restart            → fresh store + collector
```

The dashboard is a **read-only observer** — it never writes to sessions. The browser reconnects automatically and falls back to polling `/api/state` if the stream drops. Stopping from the UI only detaches the observer; OpenCode itself is untouched.

## Troubleshooting

- **Port busy** — the next free port (+1…+10) is picked automatically; the final URL is printed as `[agents-dashboard] dashboard running at …`.
- **Nothing appears** — the plugin tracks sessions from the moment it loads. Check the OpenCode server log for `[agents-dashboard]` lines.
- **Browser didn't open** — open the printed URL manually, or set `autoOpen: false`.
