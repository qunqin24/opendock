# opencode-costs

**English** · [Español](README_es.md)

[![npm version](https://img.shields.io/npm/v/opencode-costs-tui.svg)](https://www.npmjs.com/package/opencode-costs-tui)
[![npm downloads](https://img.shields.io/npm/dm/opencode-costs-tui.svg)](https://www.npmjs.com/package/opencode-costs-tui)
[![license](https://img.shields.io/npm/l/opencode-costs-tui.svg)](LICENSE)

Sidebar cost panel for **OpenCode 2.x**: cost and tokens per agent for the active session **and every subagent below it**.

![opencode-costs sidebar panel](docs/images/sidebar.png)

> **Tokens instead of dollars.** OpenCode 1.x stored a dollar cost per session, so the old CLI showed the spend of the parent session and its subagents in USD. OpenCode 2.x reports `cost: 0` for subscription or free models — for example the whole `opencode-go` catalog — even though the model has a list price. The panel therefore shows dollars **when the host reports them**, and falls back to tokens for the family total, the per-session value and the percentage. It never invents a price. If you want the billed spend of a Go plan, use the quota panel.

## What it shows

- **Header**: total cost of the session family (the session plus all its descendants), with a `▾`/`▸` toggle.
- **One row per session**: cost (or tokens, when the model has no price), share of the family total and an indent that mirrors the subagent depth. Finished subagents stay listed.
- **Footer**: number of sessions in the family and aggregate input / output / reasoning tokens.
- **Live**: it re-renders on every session event OpenCode pushes, plus a 30-second safety sync.

Click the header to collapse the panel; the choice is stored in the plugin's durable state.

## Why 2.0 is a rewrite

The 1.x version was a Python CLI (`costs`) that read OpenCode's SQLite database. That broke with OpenCode 2.x for two separate reasons:

1. **The database moved.** OpenCode 1.x wrote sessions to `session`; 2.x writes new sessions to `session_v2` (messages to `session_message`). The legacy tables stop receiving rows, so the CLI kept reporting an old session and its subagents disappeared.
2. **TUI plugins changed.** In OpenCode 2.x a sidebar plugin is an **npm package** that uses the `@opencode/plugin/tui` API; local files and the old `tui.json` entries are not loaded. A menu command cannot live next to it either.

So 2.0 drops the CLI and the Python engine entirely. The panel now reads the session store of the running OpenCode: no SQLite, no external process, no second runtime. That also means **it only supports OpenCode 2.x**; `1.x` is no longer supported.


## Known limitation (OpenCode 2.4.0)

The sidebar slot is not repainted when a plugin updates its own state. The panel fetches fresh data every 10 seconds (verified), but the host only paints the new values on its next render — for example when you click the header or switch session. That is a host behaviour, not a data problem; `renderer.requestRender()` and host-store writes do not change it. Tracked upstream: https://github.com/anomalyco/opencode/issues/66252.

## Install

TUI plugins are listed in `~/.config/opencode/cli.json`, not in `opencode.jsonc`. (`opencode plugin add` registers **server** plugins, which is not what this package is.)

```json
// ~/.config/opencode/cli.json
{
  "plugins": ["opencode-costs-tui"]
}
```

Or run the installer, which patches that file for you:

```sh
curl -fsSL https://raw.githubusercontent.com/caertos/opencode-costs/main/install.sh | sh
```

Restart OpenCode (or run `/reload`). The panel appears at the top of the session sidebar.

Uninstall: remove `opencode-costs-tui` from `~/.config/opencode/cli.json` → `plugins`.

## What the numbers mean

- **Cost** comes from OpenCode's own session accounting. If the provider or model has no price configured (some free tiers, local models), the cost is `$0.00` while tokens are still reported.
- **Family** = the session you are looking at, plus every session whose `parentID` chain starts there. Subagents created by task/delegation tools are included.
- **Rows** are individual sessions, so you can see which subagent spent what. When the whole family reports `$0.00` (unpriced or free model), the value and percentage columns switch to tokens instead of showing a column of zeros.

## Requirements

- OpenCode **2.x** with the TUI plugin API (verified on 2.4.0).
- No Python, no database access, no API key: the plugin only formats data the host already has.

## Development

```sh
npm test          # pure-logic tests (node --test)
npm run build     # src/tui.tsx -> dist/tui.js (esbuild via npx)
```

`dist/` is built and committed, because OpenCode only activates packages whose TUI entrypoint is a JavaScript file.

## License

MIT
