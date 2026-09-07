# opencode-session-viewer

A local dashboard for [opencode](https://opencode.ai) that shows live session activity — messages, status, and model usage — in your browser.

## Install the plugin

No manual `npm install` needed — just reference the package in `opencode.json` (project-level) or `~/.config/opencode/opencode.json` (global) using the `[name, options]` tuple form of the `plugin` array:

```json
{
  "plugin": [["@cedricg-dev/opencode-session-viewer", { "port": 4097, "hostname": "127.0.0.1", "autoLaunch": true }]]
}
```

opencode installs npm plugins automatically via Bun at startup (cached under `~/.cache/opencode/node_modules/`), so this is the only step required. On the next opencode session, a local server starts and a dashboard tab opens automatically (unless `autoLaunch` is `false`), and a toast in the terminal shows the dashboard URL either way.

The example above has no version specifier, so it always resolves to the `latest` npm dist-tag — convenient, but it means an update can change behavior without you asking for it. For a deterministic, reproducible setup, pin an exact version instead:

```json
{
  "plugin": [["@cedricg-dev/opencode-session-viewer@0.2.3", { "port": 4097, "hostname": "127.0.0.1", "autoLaunch": true }]]
}
```

With a pinned version, opencode keeps using exactly that release until you bump the version string yourself.

Closed the tab, or running with `autoLaunch: false`? Ask opencode to open (or reopen) the dashboard — the plugin exposes an `opencode_session_viewer_dashboard_open` tool the agent can call to relaunch it in your browser. For the most reliable results:

> Open session viewer dashboard in browser

Shorter phrasings like "open the dashboard" or "reopen the dashboard" should also work, but are more likely to be confused with opencode's own session-share feature (see below) — the longer phrasing above names the plugin explicitly and is the safest bet.

(If your agent distinguishes plan/build modes, ask this in build mode — plan/read-only modes may block tool calls that have side effects, such as opening a browser tab.)

This is a different feature from opencode's own session-share ("share a session" / `session_share`), which creates a public link for one session. Say "dashboard" or "session viewer", not "share" or "link", if you specifically want this plugin's local activity view instead.

### Configuration options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `port` | `number` | `0` (OS-assigned) | Local port the dashboard server binds to. |
| `hostname` | `string` | `"127.0.0.1"` | Bind address for the local server. |
| `autoLaunch` | `boolean` | `true` | Whether to automatically open the dashboard in a browser tab on startup. Set to `false` to suppress this — the URL is still shown via a startup toast, or ask opencode to "open session viewer dashboard in browser" at any time. |

An option present with the wrong type (e.g. `port` as a string) falls back to its default rather than being coerced. Config is read once at startup and never re-read mid-run.

Setting `hostname` to a non-default, non-loopback value (e.g. `"0.0.0.0"`) exposes the dashboard to your network with no authentication — only do this deliberately.

If the configured port is invalid or already in use, the server fails to start gracefully: opencode's own startup is never blocked, but a `level:"error"` entry is logged — check opencode's logs if the dashboard doesn't come up.


