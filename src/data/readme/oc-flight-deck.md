# oc-flight-deck

**See live cost, tokens, and context for every OpenCode session, right in your sidebar.**

## Install

Add the entry to the `plugins` array in your `opencode.jsonc`, then restart OpenCode:

```json
{ "plugins": ["oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git#c564b5a8cc9bf9bb9d3ad73132ba792a183379b3"] }
```

The panel renders beside your next open session with defaults and no config file.
You need OpenCode `2.0.30` already installed, on Node 22+ or Bun 1.4+.

### Or let your AI install it

```text
Install the oc-flight-deck plugin: add "oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git#c564b5a8cc9bf9bb9d3ad73132ba792a183379b3" to the plugins array in my opencode.jsonc, restart OpenCode, then open a session and confirm the telemetry panel renders in the sidebar. Report which rows you see.
```

### Offline or pinned

Prefer the stability track: replace the entry with the tagged npm release, currently `0.19.2`:

```json
{ "plugins": ["oc-flight-deck@0.19.2"] }
```

The registry is the slow track (tagged releases only); the git entry above is the fast track (every commit installable). To pin any other commit, swap the characters after `#` for that commit's full sha.

## Use it

Open a session and read the rail: `cost` covers the conversation plus its subagents, `project` covers every session in the project, and `elapsed` survives restarts because it recomputes from recorded turn spans.

Copy the session id: add `"ses"` to `sidebar.rows` in `~/.config/opencode/flight-deck.jsonc`, then click the `session` row and the full id lands on your clipboard.

Watch your quota: add `"go"` to `sidebar.rows` to see 5-hour, weekly, and monthly usage dials read from your own credential store.

Silence it: set `"notifications": { "enabled": false }` in the same file to switch off every toast with one key.

## What you get

- One money row that includes subagent spend, rolled up through the host's session links
- A stable rail: every row draws a real zero until the host reports data, so the panel never jumps
- Elapsed time that survives restarts, recomputed from the host's recorded turn spans
- Average generation speed over the session or the whole family — settled turns where the host stamps them, the active clock where it does not — with the realtime estimate from the host's streaming events (`rt`), the mean time to first token on the `both` line (`1.2s ttft`, steps observed while the plugin runs), or both figures on one line, via `sidebar.tps.display`
- An opt-in watchdog row that stays silent until a tool or turn stops moving
- Every toast silenced per kind or altogether through one `notifications` section

## Requirements

- OpenCode `2.0.30`
- Node `>=22` or Bun `>=1.4.0`

## Links

- Repository: https://github.com/nathwn12/oc-flight-deck
- Package: https://www.npmjs.com/package/oc-flight-deck
- Issues: https://github.com/nathwn12/oc-flight-deck/issues
- OpenCode V2 plugin API: https://opencode.ai/v2/docs/build/plugins/cli
