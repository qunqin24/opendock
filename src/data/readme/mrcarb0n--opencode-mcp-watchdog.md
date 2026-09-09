# opencode-mcp-watchdog

[![npm version](https://img.shields.io/npm/v/@mrcarb0n/opencode-mcp-watchdog.svg)](https://www.npmjs.com/package/@mrcarb0n/opencode-mcp-watchdog)

Opencode plugin: on every startup it checks all configured MCP servers via
opencode's own API, reconnects the failed ones, and shows a TUI toast summary.
No sidecar processes — opencode core keeps owning MCP lifecycles.

## Install

Via config (npm):

```json
{ "plugin": ["@mrcarb0n/opencode-mcp-watchdog"] }
```

Restart opencode — Bun installs it automatically. ~8s after launch, if
anything needs attention you get a toast like:

```
MCP watchdog (startup)
14/15 connected · failed: github (spawn npx ENOENT…) · disabled: git
```

All-green startups stay quiet. Reconnects run sequentially (parallel
`npx` spawns thundering-herd the registry into probe timeouts). If the
status probe itself times out, the toast says `showing last-known`
instead of presenting stale data as fresh. Unknown states are listed
under `other: name (status)`.

Local alternative (build first, then copy the bundle):

```bash
npm run build
cp dist/index.js ~/.config/opencode/plugins/mcp-watchdog.js
```

## Tool

`mcp_watchdog` with one arg:

- `status` — list every server with state (`✓ connected`, `✗ failed`, `○ disabled`, `⚠ needs_auth`)
- `reconnect` — reconnect failed servers now (always runs, bypasses the cooldown), report what recovered plus the reason for each still-failing server

## Triggers

| Trigger            | Behavior                                                                            |
| ------------------ | ----------------------------------------------------------------------------------- |
| Startup (+8s)      | check + heal, toasts only if something recovered/failed                             |
| `server.connected` | check + heal + toast (15s cooldown from run end; concurrent triggers share one run) |
| `session.error`    | silent heal, toasts only if something recovered/failed                              |

Servers reporting `needs_auth` / `needs_client_registration` are listed, never
retried. Outside the TUI (`serve`/`web`/headless) the summary is logged
(`mcp-watchdog` service, `info` level) instead of toasted and the
tool keeps working.

## Development

Requires Node.js 18+.

```bash
npm install    # install dependencies
npm run build  # compile src/ to dist/
npm test       # build + run test suite
npm run check  # typecheck without emitting
npm run lint   # eslint
npm run format # prettier check
```

Push single commits to `main` with
[conventional commit](https://www.conventionalcommits.org/) messages —
release-please accumulates them into a release PR, and merging it publishes
the next version automatically.
