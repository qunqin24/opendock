# @toninho09/opencode-wakeup

Schedule a future prompt back into the current opencode session.

[![npm](https://img.shields.io/npm/v/%40toninho09%2Fopencode-wakeup?style=flat-square)](https://www.npmjs.com/package/@toninho09/opencode-wakeup)
[![npm downloads](https://img.shields.io/npm/dm/%40toninho09%2Fopencode-wakeup?style=flat-square)](https://www.npmjs.com/package/@toninho09/opencode-wakeup)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

Use `wakeup_after` or `wakeup_at` to tell opencode to wake itself up after a delay or at a specific time. When the timer fires the plugin sends a prompt back into the same session, so opencode can resume work — checking a deploy, retrying a build, polling an external process, or anything else that needs a future nudge.

---

## Install

```sh
npm install @toninho09/opencode-wakeup
```

Add the server plugin to `opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@toninho09/opencode-wakeup"]
}
```

For the **Wakeups sidebar panel**, also add the TUI plugin to `tui.json` (or `tui.jsonc`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@toninho09/opencode-wakeup"]
}
```

Restart opencode after editing either config file.

> **Note**
> If you only configure `opencode.json` the tools work but the sidebar panel is not shown.
> If you only configure `tui.json` the sidebar loads but nothing schedules or fires wakeups.
> Configure both for the full experience.

---

## What you get

- Four scheduling tools available to the model: `wakeup_after`, `wakeup_at`, `wakeup_list`, `wakeup_cancel`
- A **Wakeups** panel in the session sidebar (requires TUI plugin)
- Countdown display with target time, short ID, and message preview
- Wakeups survive an opencode restart — pending timers are rehydrated automatically
- Multiple concurrent opencode instances are safe; each instance owns its own session files

---

## Tools

### `wakeup_after`

Schedule a wakeup relative to now.

| Argument | Type | Required | Description |
|---|---|---|---|
| `seconds` | number | yes | Delay from now in seconds |
| `message` | string | no | Prompt to send when the wakeup fires |

Returns JSON with `status`, `id`, `sessionID`, `runAt`, `delaySeconds`, and `message`.

### `wakeup_at`

Schedule a wakeup at a specific date/time.

| Argument | Type | Required | Description |
|---|---|---|---|
| `datetime` | string | yes | Target date/time. Prefer ISO 8601 (e.g. `2026-06-10T15:30:00-03:00`) |
| `message` | string | no | Prompt to send when the wakeup fires |

Bare ISO dates such as `2026-06-10` are interpreted as **local midnight**, not UTC midnight.
The datetime must be in the future. Invalid or past dates are rejected.

Returns the same shape as `wakeup_after`.

### `wakeup_list`

List currently scheduled wakeups.

| Argument | Type | Required | Description |
|---|---|---|---|
| `allSessions` | boolean | no | When `true`, list wakeups across all sessions this plugin instance knows about |

By default only wakeups for the current session are returned. Triggered, cancelled, and failed wakeups are excluded.

Returns `{ "count": number, "wakeups": [...] }`.

### `wakeup_cancel`

Cancel a pending wakeup.

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Wakeup ID returned by a scheduling tool |

Cancelling an unknown or already-fired wakeup returns `status: "not_found"`.

---

## Return format

Scheduling and listing return wakeup objects in this shape:

```json
{
  "status": "scheduled",
  "id": "wakeup_...",
  "sessionID": "...",
  "runAt": "2026-06-10T18:30:00.000Z",
  "delaySeconds": 60,
  "message": "Check the deploy"
}
```

`wakeup_list` wraps results in:

```json
{
  "count": 1,
  "wakeups": [...]
}
```

---

## TUI sidebar panel

The TUI plugin registers a **Wakeups** panel in the session sidebar. It polls the active session's state file every second and shows:

- Countdown to each scheduled wakeup
- Target date/time
- Short wakeup ID
- Message preview

No wakeup data appears in the sidebar if no wakeups are currently scheduled for the session.

---

## How it works

Wakeups are persisted to a per-session JSON file under the system temp directory. This means:

- **Restart recovery** — when opencode restarts the server plugin rehydrates scheduled wakeups the first time it sees a session. Future wakeups are re-armed; already-overdue wakeups fire promptly.
- **Multi-instance safe** — each opencode instance fully owns its session files. Concurrent instances can never read or overwrite each other's wakeups.
- **No database** — the only runtime state is the per-session JSON file; nothing to set up.

When a wakeup fires, the plugin calls `client.session.prompt(...)` with the configured message so opencode actually resumes the session.

Long delays (beyond ~24 days) are handled by re-arming timers in chunks, so `wakeup_at` works for any future date supported by JavaScript's `Date`.

---

## Manual / local setup

To use the local package path instead of the npm package, build first:

```sh
bun install
bun run build
```

Then reference the local path in your config files:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./path/to/opencode-wakeup"]
}
```

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./path/to/opencode-wakeup"]
}
```

---

## Development

```sh
bun install
bun run typecheck
bun run build
bun run test
npm pack --dry-run
```

The package ships `dist/index.js` for the server plugin and `dist/tui.tsx` for the TUI plugin. Shipping the TSX source is intentional — the OpenTUI runtime loads it with the required TSX transform support.

---

## License

MIT

---

> @toninho09/opencode-wakeup is not built by the OpenCode team and is not affiliated with OpenCode.
