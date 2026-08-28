# opencode-browser-tools

[![npm version](https://img.shields.io/npm/v/opencode-browser-tools.svg)](https://www.npmjs.com/package/opencode-browser-tools)

An [opencode](https://opencode.ai) plugin that wraps [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) — Vercel's fast native Rust browser-automation CLI — so opencode can launch a real browser, inspect pages, interact with the UI, and **validate UI things** (element state, text, counts, accessibility, console/runtime errors, screenshots).

Once installed, opencode gets a set of `browser_*` tools plus the official `agent_browser_*` MCP tools.

## Install

### 1. Install the agent-browser binary (one time)

The plugin shells out to the `agent-browser` CLI, which must be on `PATH`.

```sh
npm install -g agent-browser
agent-browser install   # downloads Chrome for Testing (first run only)
```

By default the plugin **auto-installs** the CLI (and Chrome) in the background the first time a browser tool is called if the binary is missing. Set the `autoInstall` option to `false` to disable that.

### 2. Add the plugin to opencode

**Local file** — copy `agent-browser.ts` into your project's plugin directory:

```
.opencode/plugins/agent-browser.ts
```

**npm** — published as [`opencode-browser-tools`](https://www.npmjs.com/package/opencode-browser-tools). Add it to `opencode.json` — opencode auto-installs it with Bun at startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-browser-tools"]
}
```

**Tupled options** (e.g. npm or a local path):

```json
{
  "plugin": [
    [
      "opencode-browser-tools",
      { "autoInstall": true, "enableMcp": true, "mcpTools": "core", "defaultSession": "dev" }
    ]
  ]
}
```

Restart opencode after changing plugin config.

## Options

| Option          | Default | Description                                                              |
| --------------- | ------- | ------------------------------------------------------------------------ |
| `autoInstall`   | `true`  | Auto-install `agent-browser` (+ Chrome) in the background when missing.   |
| `installCommand`| `["npm","install","-g","agent-browser"]` | Command used for auto-install. |
| `enableMcp`     | `true`  | Register the official `agent-browser` MCP server (`agent_browser_*` typed tools). Skipped if the CLI isn't installed. |
| `mcpTools`      | `all`   | MCP tools profile (`core`, `network`, `state`, `debug`, `tabs`, `react`, `mobile`, `all`, or comma-separated). |
| `defaultSession`| (none)  | agent-browser session used when a tool isn't given an explicit `session`. |

## Tools

All tools accept an optional `session` argument to isolate browser state.

| Tool | Purpose |
| ---- | ------- |
| `browser_open` | Launch the browser / navigate to a URL. |
| `browser_snapshot` | Accessibility tree with stable `@e1`/`@e2` refs — the main way to inspect a page. |
| `browser_read` | Clean agent-friendly text of a URL or the active tab. |
| `browser_wait` | Wait for a selector, text, URL glob, or time. |
| `browser_click` / `browser_type` / `browser_fill` | Interact by `@eN` ref or CSS selector. |
| `browser_press` / `browser_select` / `browser_set_checked` / `browser_hover` | Keys, dropdowns, checkboxes, hovers. |
| `browser_get_url` / `browser_get_title` | Current page URL / title. |
| `browser_get_text` / `browser_get_html` / `browser_get_value` / `browser_get_attribute` | Read element content. |
| `browser_count` | Count matching selector (great for assertions). |
| `browser_state` | JSON: visibility, enabled, checked, count for an element. |
| `browser_screenshot` | Screenshot the page (optionally full-page); the image is attached so opencode can see it. |
| `browser_a11y` | axe-core accessibility audit with violations + fix links. |
| `browser_console` / `browser_errors` | Console messages / uncaught JS errors from the page (JSON). |
| `browser_cookies` | Cookies for the active page (JSON) — confirm session/auth state. |
| `browser_storage_local` / `browser_storage_session` | localStorage / sessionStorage (JSON). |
| `browser_network_requests` | Captured network requests (JSON, optional `filter`). |
| `browser_network_route` / `browser_network_unroute` | Intercept requests — abort (block) or mock a response body. |
| `browser_eval` | Run arbitrary JS in the page for custom assertions. |
| `browser_close` | Close the browser / all sessions. |

During every session, the plugin injects a short set of **workflow rules** into the agent's context:
re-snapshot after any navigation or page change (refs go stale), prefer the structured `browser_*`
tools over raw bash, use the `--json`-backed tools for assertions, and be aware that `browser_close`
may destroy cookies/session state for that session.

## Example workflow

```
open https://localhost:3000
snapshot                                    # get @e1, @e2, ... refs
state(".nav a")                             # assert nav links are visible/enabled
fill("#email", "test@example.com")
click("@e5")                                # submit button
wait --text "Welcome"
browser_get_text(".toast")
errors                                      # check for uncaught JS errors
a11y                                        # validate accessibility
screenshot                                  # visually inspect
```

## Notes

- Snapshots/refs go stale after the page changes — take a fresh `browser_snapshot` before interacting.
- `browser_console`, `browser_errors`, cookie, storage, and network tools return JSON (`--json`) for reliable assertions.
- `browser_close` ends a browser session and may destroy its cookies/localStorage, requiring a fresh login afterwards.
- `browser_screenshot` embeds the image as a data URL; opencode downsizes very large captures automatically.
- The MCP server (`agent-browser mcp`) registers only when the CLI binary is present at startup. If the CLI was auto-installed mid-session, restart opencode to pick up the `agent_browser_*` MCP tools.