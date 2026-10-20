# opencode-claude-quota

**Claude Code usage, quota and rate limits in the OpenCode TUI sidebar — 5-hour session, weekly, per-model and per-surface limits, themed by your OpenCode theme.**

[![npm version](https://img.shields.io/npm/v/opencode-claude-quota.svg)](https://www.npmjs.com/package/opencode-claude-quota)
[![npm downloads](https://img.shields.io/npm/dm/opencode-claude-quota.svg)](https://www.npmjs.com/package/opencode-claude-quota)
[![CI](https://github.com/Caio2a7/opencode-claude-quota/actions/workflows/ci.yml/badge.svg)](https://github.com/Caio2a7/opencode-claude-quota/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/opencode-claude-quota.svg)](LICENSE)
[![platforms](https://img.shields.io/badge/platform-linux%20%7C%20macOS%20%7C%20windows-lightgrey.svg)](#requirements)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2-blue.svg)](https://opencode.ai)

An [OpenCode](https://opencode.ai) V2 CLI/TUI plugin that shows your Claude subscription's 5-hour session and weekly
limits, per-model weekly caps, weekly usage by surface and extra paid usage, right next to your session.

```
Claude Quota
5h     ━━━━━━━━━──────  51%
       resets in 1h 10m
Week   ━───────────────   6%
       resets in 1d 22h
This week
Claude Code            86%
Chats                   7%
Cowork                  7%
updated 12s ago
```

## Features

- 5-hour session and weekly usage bars, coloured by severity (green → yellow → red).
- Per-model weekly limits (Opus, Sonnet) when your plan reports them.
- Weekly usage breakdown by surface (Claude Code, Chats, Cowork, …) and extra usage when enabled.
- Relative reset times that tick without refetching; stale data stays visible with a `(stale)` marker on errors.
- Polite polling: 120s default (60s minimum), shared across OpenCode windows, `Retry-After` support and persisted
  exponential backoff; a refresh after a finished turn only fetches when the data is older than 60s.
- `/claude-quota` slash command (and command-palette entry) to force a refresh.
- Native OpenCode **V2** plugin, strictly read-only credential handling, zero runtime dependencies.

## Requirements

- OpenCode **V2** (`@opencode/plugin` 2.x). CLI plugins are configured in `~/.config/opencode/cli.json`, not
  `opencode.json` or V1 `tui.json`.
- A Claude Pro/Max subscription, signed in through [Claude Code](https://claude.com/claude-code) (`claude` login) or
  `CLAUDE_CODE_OAUTH_TOKEN` set.
- Linux, macOS or Windows.

## Install the OpenCode plugin

Add the package to the `plugins` array of `~/.config/opencode/cli.json` and restart the TUI:

```json
{
  "plugins": ["opencode-claude-quota"]
}
```

With options:

```json
{
  "plugins": [
    {
      "package": "opencode-claude-quota",
      "options": { "refreshInterval": 90, "showBreakdown": false }
    }
  ]
}
```

From a local checkout:

```sh
bun install
```

Then use the absolute path of the checkout:

```json
{
  "plugins": ["/path/to/opencode-claude-quota"]
}
```

Restart OpenCode and open a session; the sidebar must be visible (`session.sidebar` is `auto` by default and needs a
wide terminal).

## Configuration

| Option            | Type    | Default | Description                                                         |
| ----------------- | ------- | ------- | ------------------------------------------------------------------- |
| `refreshInterval` | number  | `120`   | Polling interval in seconds. Values below `60` are raised to `60`.  |
| `showBreakdown`   | boolean | `true`  | Show the "This week" usage-by-surface rows (0% rows are skipped).   |
| `showModels`      | boolean | `true`  | Show per-model weekly windows (Opus, Sonnet) when present.          |
| `credentialsPath` | string  | –       | Credentials file location, used as-is (`~` is not expanded).        |

Invalid values fall back to the defaults.

## How it works

The plugin calls `GET https://api.anthropic.com/api/oauth/usage` with your Claude Code OAuth token, the same data
behind Claude Code's `/usage` screen. A single poller is shared per TUI instance, not per render.

**Requests identify as Claude Code.** They are sent with `User-Agent: claude-code/<installed version>` (taken from
`claude --version`, falling back to `claude-code/2.1.287` when Claude Code cannot be run). Anthropic heavily
rate-limits other user agents on this undocumented endpoint, answering HTTP 429 even at one request per minute. This
may stop working at any time. Only your own usage data is requested, with your own token.

Credentials are looked up **read-only**, in this order:

1. `CLAUDE_CODE_OAUTH_TOKEN` environment variable
2. `~/.claude/.credentials.json` (or `credentialsPath`, or `$CLAUDE_CONFIG_DIR/.credentials.json`)
3. macOS Keychain (`Claude Code-credentials`), on macOS only and only when the credentials file is missing; macOS
   may show a keychain access prompt the first time.

### Multiple OpenCode windows

The usage endpoint has a tight rate limit, so all OpenCode instances on a machine coordinate through a small cache
file: `${XDG_CACHE_HOME:-~/.cache}/opencode-claude-quota/state.json` (directory `0700`, file `0600`, written
atomically). Fresh data is adopted from it instead of fetching, a `fetch.lock` file (stale after 30s) lets a single
instance make the request, and the failure backoff is stored there too. N windows therefore make about one request per
interval, and a new window renders immediately from the cache.

The file contains the usage snapshot (percentages, reset times, breakdown, extra usage), when it was fetched, the
backoff deadline, the consecutive failure count and the last error. It never contains the token. Deleting it is
always safe; a missing or corrupt file is treated as empty.

### Backoff

Persisted for every instance: a 429 blocks requests for `Retry-After` (capped at 1 hour) or, without that header,
2m, 4m, 8m… up to 30m; network and HTTP errors use the same 2m → 30m schedule. A success resets it. While blocked,
`/claude-quota` shows "Rate limited by Anthropic — retrying in Xm" and the sidebar shows a muted
"rate limited · retry in Xm" line next to the last known data. Repeated "token rejected" (401/403) responses back off
per instance (up to 10 minutes) without blocking other windows, and missing credentials keep the normal interval so a
fresh `claude` login is picked up quickly.

## Privacy & security

- The token is sent only to `api.anthropic.com` over HTTPS and never leaves your machine otherwise.
- The token is never written, logged or cached to disk, and **never refreshed**: if it expired, run `claude` once.
- No cookie scraping, no browser sessions, no telemetry. Subprocesses use fixed argument lists, `shell: false` and a
  short timeout: `claude --version` (3 s timeout, once per TUI process) to read the installed Claude Code version for
  the user agent, and `security` (5 s timeout, macOS only) when reading the Keychain fallback.
- Zero runtime dependencies.
- The usage endpoint is **undocumented and unofficial**; it may change or disappear without notice. The plugin parses
  it defensively and shows a muted message instead of failing.
- v0.1.0 was published manually; releases from v0.1.1 onward are published from GitHub Actions via npm trusted
  publishing (OIDC) with provenance.

See [SECURITY.md](SECURITY.md) to report a vulnerability.

## Troubleshooting

| Symptom                                   | Fix                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| "Claude Code credentials not found"       | Run `claude` and log in, or set `CLAUDE_CODE_OAUTH_TOKEN`.                  |
| "token expired"                           | Run `claude` once so Claude Code refreshes its own token.                   |
| Nothing in the sidebar                    | Open a session, widen the terminal and check `session.sidebar` in `cli.json`. |
| Numbers look stale                        | Run `/claude-quota`; it reuses data fresher than 30s and respects any block. |
| "rate limited · retry in Xm"              | Expected: the plugin waits it out for all windows; raise `refreshInterval`. |

Plugin load errors are logged to `~/.local/share/opencode/log/opencode.log`.

## Why not the V1 plugins?

OpenCode V1 usage plugins target the old TUI plugin API and do not load on V2. This plugin is built on
`@opencode/plugin/tui` and the V2 slot system, and keeps credential access read-only.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build   # compiles dist/tui.js (also runs on npm pack)
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Related

- [OpenCode](https://opencode.ai) — the open-source AI coding agent.
- [opencode-system-monitor](https://github.com/Caio2a7/opencode-system-monitor) — live CPU, RAM, disk, NVIDIA GPU, VRAM
  and swap usage bars in the OpenCode sidebar, by the same author.

## License

[MIT](LICENSE)
