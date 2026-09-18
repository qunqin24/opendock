# opencode-usage-report

[![npm version](https://img.shields.io/npm/v/opencode-usage-report)](https://www.npmjs.com/package/opencode-usage-report)
[![CI](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml/badge.svg)](https://github.com/kaanchinar/opencode-usage-report/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/opencode-usage-report)](./LICENSE)

An [opencode](https://opencode.ai) plugin that adds a `/usage` command (and a
`usage_report` tool) showing the quota windows (5-hour, weekly, monthly) of your
inference subscriptions — currently **Kimi Code** (`kimi-for-coding`) and
**OpenCode Go** (`opencode-go`). It fetches from each provider's API, caches
results on disk, and can fall back to a local estimate when the API is
unreachable. It also emits background low-quota warnings in the TUI.

## Features

- `/usage` command and `usage_report` tool for on-demand quota reports, with
  JSON and single-provider filtering.
- TUI sidebar panel with live progress bars, `NN%` usage, and reset countdowns
  for each quota window.
- On-disk caching with a configurable TTL, plus `--refresh` to bypass it.
- Local fallback estimate when the provider API is unreachable and no cache
  exists.
- Background low-quota TUI warnings on startup and `session.idle`.
- Privacy-first: API keys are never logged, cached, or rendered.

## Install

### Server plugin (`/usage` command + warnings)

Add the plugin to `opencode.json` / `opencode.jsonc` and restart opencode:

```jsonc
{
  "plugin": ["opencode-usage-report"]
}
```

Credentials are read from the same places your other opencode providers already
use (see [Data sources & privacy](#data-sources--privacy)). Optionally pass
options in the tuple form:

```jsonc
{
  "plugin": [["opencode-usage-report", { "thresholdPercent": 75 }]]
}
```

### TUI sidebar panel

Add the plugin to `tui.json` and restart opencode:

```jsonc
{
  "plugin": ["opencode-usage-report"]
}
```

Use the bare package name — opencode resolves the `./tui` entrypoint from the
package `exports` on its own. (`opencode-usage-report/tui` is **not** a valid
spec and will silently not load.)

For local development, point the configs at the source instead:

```jsonc
// opencode.json
{ "plugin": ["file:///abs/path/to/opencode-usage-report/src/index.ts"] }
// tui.json
{ "plugin": ["file:///abs/path/to/opencode-usage-report/src/tui.tsx"] }
```

The panel renders under opencode's native Context block in the session sidebar
(order 150) and shows a colored progress bar per quota window, `NN%`, and a
live reset countdown — refreshed every 60s, on `session.idle`, and on demand via
the `Usage: refresh now` command (default binding `ctrl+shift+u`). It reuses the
same cache/fallback pipeline as the command; stale results are marked `(stale)`
and local estimates `(est)`.

TUI options (tuple form): `providers`, `cacheTtlSeconds`, `thresholdPercent`,
`refreshIntervalSeconds` (default `60`), `barWidth` (default `14`).


## Commands

- `/usage` — show every configured provider's quota windows.
- `/usage kimi-for-coding` — filter to a single provider. The argument must match a
  registered provider id **exactly** (`kimi-for-coding` or `opencode-go`); an
  unknown id (e.g. `/usage kimi`) returns a helpful error listing the known ids.
- `/usage --json` — emit the raw `ProviderReport[]` JSON.
- `/usage --refresh` — bypass the on-disk cache and fetch live.

The command simply calls the `usage_report` tool with those arguments, so the
tool can also be invoked directly by an agent.

## Options

| Option             | Type       | Default | Meaning                                                        |
| ------------------ | ---------- | ------- | -------------------------------------------------------------- |
| `thresholdPercent` | `number`   | `80`    | Warn when a window is at/above this percent used.              |
| `cacheTtlSeconds`  | `number`   | `120`   | How long a cached API result is considered fresh.              |
| `providers`        | `string[] \| null` | `null` | Providers to report; `null` = every registered adapter. |
| `fallback`         | `boolean`  | `true`  | Use a local estimate when the API fails and no cache exists.   |

Malformed option values are ignored and the defaults are kept.

## Warnings

On startup and again on `session.idle` (both throttled to at most once every 10
minutes, sharing the same timer), the plugin checks the cached reports. Any
window at or above `thresholdPercent`, or whose
status is `rate-limited` / `frozen`, produces a TUI toast. A warning fires once
per window until that window resets; it re-arms after usage drops below
`thresholdPercent - 10`. Toast failures (headless/server mode) are swallowed.

## Data sources & privacy

- Credential resolution order: `OPENCODE_USAGE_<ID>_KEY` env override, then
  `~/.local/share/opencode/auth.json` (`type: "api"` `.key`, or `type: "oauth"`
  `.access`). `$OPENCODE_DATA_HOME` overrides the data directory.
- APIs: `https://api.kimi.com/coding/v1/usages` and
  `https://opencode.ai/zen/go/v1/usage` (custom `User-Agent` is required by the
  latter).
- Cache and state live in `<data-home>/usage-report/` (TTL cache, session id,
  warn state).
- Local fallback reads `opencode.db` read-only.
- **API keys are never logged, cached, or rendered.** Adapter errors are
  sanitized (key substrings replaced with `<redacted>`) before they reach any
  output, and the live smoke script never prints credentials.

## Extending

New providers are trivial:

1. Implement `ProviderAdapter` (`src/types.ts`) — an `id`, `displayName`, and
   `fetch(cred, opts)` returning `{ windows, extras? }`.
2. Register it in `src/providers/index.ts` (`adapters` array).
3. Add fixture-driven tests under `test/`.

Reference endpoints for future adapters (not built in v1):

- **Gemini**: `cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`
  (requires Google OAuth).
- **Claude**: `api.anthropic.com/api/oauth/usage` (requires
  `anthropic-beta: oauth-2025-04-20`, the claude-code User-Agent, and
  `~/.claude/.credentials.json`).
- **Codex**: the ChatGPT backend usage endpoint.

## Development

```sh
npm test                          # vitest, no network
npm run typecheck                 # tsc --noEmit
npm run smoke -- --yes-live       # manual live check (real keys; opt-in)
```

## License

MIT © [Kaan Chinar](https://github.com/kaanchinar)
