# opencode-billing-widget

A compact [OpenCode](https://opencode.ai) v2 TUI plugin that keeps your exact
dollar spend visible in the session sidebar:

![Billing widget in the OpenCode sidebar](https://raw.githubusercontent.com/aditya-dhage/opencode-billing-widget/main/assets/expanded.png)

Click the header to collapse it down to a one-line month summary:

![Billing widget collapsed](https://raw.githubusercontent.com/aditya-dhage/opencode-billing-widget/main/assets/collapsed.png)

```
▼ Billing
$0.42   session
$3.17   today
$11.05  week
$23.90  october
```

## Why

Most usage plugins show per-session or per-model tokens. This one answers the
question you actually ask at the end of the month: **what have I spent?** —
across all sessions and providers, in four periods at a glance:

- **session** — the current session's exact recorded cost, live
- **today** — since local midnight
- **week** — since Monday 00:00 local
- **billing month** — since the 1st of the calendar month

## Install

Add the package to the `plugins` array in your global
`~/.config/opencode/cli.json`:

```json
{
  "plugins": ["opencode-billing-widget"]
}
```

This is a TUI-only plugin, so it lives in `cli.json` (not `opencode.json`) and
stays active even when the CLI connects to a remote OpenCode server.

## Usage

| Action | How |
| --- | --- |
| Toggle the widget on/off | `/billing` or palette → "Billing: toggle widget" |
| Force a refresh | Palette → "Billing: refresh" |
| Collapse/expand | Click the `▼ Billing` header |

The toggle state persists across restarts. The widget refreshes automatically
after every finished turn and every 60 seconds.

## Where the numbers come from

- Today / week / month aggregates come from the server's
  `experimental.session.stats` endpoint — the same activity-accurate source as
  the built-in `/stats` command, so the numbers match exactly. If that endpoint
  is unavailable, the plugin falls back to summing each session's recorded
  `cost` by last-activity time.
- The current session line reads the session's live `cost` directly from the
  TUI data store, so it ticks up as you work.

Costs are the server's exact recorded dollar amounts for metered providers.
No estimates, no pricing tables, no provider restrictions.

## Compatibility

- OpenCode **v2** (developed and tested against 2.2.x; the npm-installed load
  path is verified on 2.2.0)
- OpenCode v1 is not supported

## Development

The published package ships a compiled entrypoint (`dist/tui.js`) because
OpenCode's npm plugin loader does not transpile Solid JSX the way its
local-directory plugin loader does. Rebuild after editing `src/tui.tsx`:

```sh
npm install   # once, for esbuild
npm run build
```

`prepublishOnly` runs the build automatically before `npm publish`.

## License

[MIT](LICENSE)
