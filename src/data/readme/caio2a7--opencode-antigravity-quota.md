# opencode-antigravity-quota

**Antigravity & Gemini usage, quota and rate limits in the OpenCode TUI sidebar — Gemini 5-hour, Gemini weekly and Argon weekly pools, themed by your OpenCode theme.**

An [OpenCode](https://opencode.ai) V2 CLI/TUI plugin that displays your Google Antigravity and Gemini CLI model quotas
and reset countdowns right next to your active session.

```
Antigravity Quota
Gemini-5h   ━━━━━━━━──────  60%
            resets in 1h 30m
Gemini-Week ━━━───────────  20%
            resets in 4d 12h
Argon       ━━━━━━━━━━━───  80%
            resets in 5d 0h
```

## Features

- Unified quota bars for **Gemini-5h** (5-hour pool), **Gemini-Week** (7-day weekly pool) and **Argon** (7-day weekly
  pool), coloured by severity (green → yellow → red).
- Supports both `used` (default) and `remaining` percentage display modes.
- Relative reset countdowns that tick without refetching; untouched buckets (`0%` used) stay on a single clean line.
- Polite polling: 120s default (60s minimum), shared across OpenCode windows, `Retry-After` support, persisted exponential
  backoff and automatic cache invalidation when the active account changes.
- `/antigravity-quota` (alias `/ag-quota`) slash command and command-palette entry to force a refresh.
- Native OpenCode **V2** plugin, strictly read-only credential handling, zero runtime dependencies.

## Requirements

- OpenCode **V2** (`@opencode/plugin` 2.x). CLI plugins are configured in `~/.config/opencode/cli.json`, not
  `opencode.json` or V1 `tui.json`.
- Signed in through `opencode-antigravity-auth`, `antigravity-cli`, [Gemini CLI](https://github.com/google-gemini/gemini-cli),
  or `ANTIGRAVITY_OAUTH_TOKEN` set.
- Linux, macOS or Windows.

## Install the OpenCode plugin

Add the package to the `plugins` array of `~/.config/opencode/cli.json` and restart the TUI:

```json
{
  "plugins": ["@caio2a7/opencode-antigravity-quota"]
}
```

With options:

```json
{
  "plugins": [
    {
      "package": "@caio2a7/opencode-antigravity-quota",
      "options": { "refreshInterval": 90, "displayMode": "remaining" }
    }
  ]
}
```

From a local checkout:

```sh
bun install
bun run build
```

Then use the absolute path of the checkout:

```json
{
  "plugins": ["/path/to/opencode-antigravity-quota"]
}
```

Restart OpenCode and open a session; the sidebar must be visible (`session.sidebar` is `auto` by default and needs a
wide terminal).

## Configuration

| Option            | Type                   | Default  | Description                                                                   |
| ----------------- | ---------------------- | -------- | ----------------------------------------------------------------------------- |
| `refreshInterval` | number                 | `120`    | Polling interval in seconds. Values below `60` are raised to `60`.            |
| `displayMode`     | `"used" \| "remaining"` | `"used"` | Show either utilization (`used`) or remaining quota (`remaining`).            |
| `showModels`      | boolean                | `true`   | Show the weekly `Argon` pool alongside `Gemini-5h` and `Gemini-Week`.         |
| `credentialsPath` | string                 | –        | Explicit credentials file location, used as-is (`~` is not expanded).         |

Invalid values fall back to the defaults.

## How it works

For Antigravity accounts, the plugin calls `POST https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary`
(discovering `cloudaicompanionProject` via `v1internal:loadCodeAssist` when absent) to read both the 5-hour and weekly
Gemini pools plus Argon in a single call, falling back to `v1internal:fetchAvailableModels` and
`v1internal:retrieveUserQuota` if needed. For Gemini CLI accounts, it calls
`POST https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota`.

Standard Gemini models (Pro, Flash, Neon, Hydrogen) report both their 5-hour (`Gemini-5h`) and 7-day weekly
(`Gemini-Week`) quota windows, while `Argon` tracks its separate 7-day weekly window.

Credentials are looked up **read-only**, in this order:

1. `ANTIGRAVITY_OAUTH_TOKEN` environment variable (optional `ANTIGRAVITY_PROJECT_ID`)
2. Explicit `credentialsPath` option (supports `antigravity-accounts.json`, `antigravity-oauth-token` and Gemini CLI JSON)
3. `${OPENCODE_CONFIG_DIR:-${XDG_CONFIG_HOME:-~/.config}/opencode}/antigravity-accounts.json` (plus `%APPDATA%\opencode\antigravity-accounts.json` on Windows)
4. `~/.gemini/antigravity-cli/antigravity-oauth-token`
5. `~/.gemini/oauth_creds.json` (Gemini CLI)

When an account only has a refresh token and no reusable fresh access token, the plugin exchanges it in memory using
Google's OAuth token endpoint (falling back to any `cachedQuota` in `antigravity-accounts.json` if OAuth client
credentials are unavailable).

### Multiple OpenCode windows

All OpenCode instances on a machine coordinate through `${XDG_CACHE_HOME:-~/.cache}/opencode-antigravity-quota/state.json`
(directory `0700`, file `0600`, written atomically) and a `fetch.lock` file (stale after 30s). Fresh snapshots are
adopted instead of refetching, failure backoff is shared, and switching the active account in `antigravity-accounts.json`
invalidates cached data from the previous account immediately.

The cache file stores only quota percentages, reset timestamps, account email, pool counts and backoff metadata — never
access or refresh tokens. Deleting it is always safe.

### Backoff

A 429 response blocks requests for `Retry-After` (capped at 1 hour) or 2m → 4m → 8m… up to 30m; network and HTTP errors
use the same schedule. While blocked, `/antigravity-quota` shows "Rate limited by Google — retrying in Xm" and the
sidebar shows a muted `rate limited · retry in Xm` line next to the last known snapshot. Repeated 401/403 responses back
off locally (up to 10 minutes) without blocking other windows.

## Privacy & security

- Tokens are sent only over HTTPS to `oauth2.googleapis.com`, `daily-cloudcode-pa.googleapis.com` and `cloudcode-pa.googleapis.com`.
- Credential files are read strictly **read-only**; tokens are never written back, logged or persisted to the plugin cache.
- Zero runtime dependencies; no telemetry, no browser scraping, no subprocesses.
- The Cloud Code quota endpoints are unofficial and may change without notice; responses are parsed defensively and
  errors surface as muted sidebar rows instead of crashing the TUI.

## Troubleshooting

| Symptom                                        | Fix                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| "Antigravity/Gemini credentials not found"     | Sign in via `opencode-antigravity-auth`, `gemini`, or set `ANTIGRAVITY_OAUTH_TOKEN`. |
| "Gemini CLI token expired"                     | Run `gemini` once so Gemini CLI refreshes its own token.                          |
| Nothing in the sidebar                         | Open a session, widen the terminal and check `session.sidebar` in `cli.json`.     |
| Numbers look stale                             | Run `/antigravity-quota` or `/ag-quota` to refresh (reuses data fresher than 30s).|
| "rate limited · retry in Xm"                   | Expected: backoff is shared across windows; raise `refreshInterval` if needed.    |

Plugin load errors are logged to `~/.local/share/opencode/log/opencode.log`.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build   # compiles dist/tui.js (also runs on npm pack)
```

## License

[MIT](LICENSE)
