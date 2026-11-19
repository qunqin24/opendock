# opencode-claude-usage

An [OpenCode](https://opencode.ai) TUI plugin that shows your Claude plan usage (5-hour and weekly limits) live in the
sidebar and prompt footer, so you can see how close you are to a limit without opening Claude Code.

It is active only while a Claude Agent model is selected. Switch to any other provider and the plugin hides itself and
stops polling.

```
Claude plan
5h        ████░░░░░░ 37%  1h12m
7d        ███░░░░░░░ 34%  1d11h
extra usage on · $0.00 used
```

> **Unofficial.** This uses an undocumented Anthropic endpoint (the one behind Claude Code's `/usage` screen). It can
> change or disappear without notice. Not affiliated with or endorsed by Anthropic.

## Requirements

- macOS (credentials are read from the macOS keychain)
- OpenCode 2.3 or later
- A Claude subscription (Pro, Max, Team, …) signed in through Claude Code, used in OpenCode through the Claude Agent
  provider

## Install

Add the package to `plugins` in `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["@sharath_huddar/opencode-claude-usage"]
}
```

OpenCode installs the package from npm and reloads plugins automatically.

For a local checkout, use the path instead:

```json
{
  "plugins": ["/path/to/opencode-claude-usage"]
}
```

### Options

```json
{
  "plugins": [
    {
      "package": "@sharath_huddar/opencode-claude-usage",
      "options": { "providers": ["claude-agent"], "intervalSeconds": 300, "warnAt": 75, "criticalAt": 90 }
    }
  ]
}
```

| Option            | Default            | Meaning                                                      |
| ----------------- | ------------------ | ------------------------------------------------------------ |
| `providers`       | `["claude-agent"]` | Provider IDs whose models bill against your Claude plan       |
| `intervalSeconds` | `300` (min `60`)   | How often to refresh while active                             |
| `warnAt`          | `75`               | % at which a window turns the theme's warning colour          |
| `criticalAt`      | `90`               | % at which a window turns the theme's error colour            |

## Usage

- **Sidebar:** one row per usage window (bar, %, time to reset), plus extra-usage status.
- **Prompt footer:** compact `5h 37% 7d 34%`, shown only while the sidebar is hidden (narrow terminal, sidebar toggled
  off, or the home screen).
- **`/claude-usage`** (also in the command palette): refresh now and show details.

## Refreshing and rate limits

The usage endpoint is rate limited (HTTP 429), so the plugin keeps requests to a minimum:

- The last result is stored in OpenCode's plugin storage and shared by every TUI window and plugin reload. A new
  window or a reload shows the stored numbers and only fetches if they are older than `intervalSeconds`.
- While active, it refreshes every `intervalSeconds`, and a few seconds after a completed turn, at most once a minute.
  These limits are shared across all windows.
- `/claude-usage` uses the same once-a-minute limit, then shows the latest numbers.
- On a 429 every window waits for `Retry-After` (at least 60 s), doubling on each consecutive 429 up to 15 minutes.
  The last good numbers stay visible with `rate limited · retry HH:MM`.

The stored data is the parsed usage numbers and request timestamps only, never the token.

## How it works and security

- On every fetch, it reads the `Claude Code-credentials` item from the macOS keychain, takes the OAuth access token, and
  calls `GET https://api.anthropic.com/api/oauth/usage`.
- The token is sent only to `api.anthropic.com`. It is never written to disk, logged, stored, or shown.
- **It never refreshes the OAuth token.** Refreshing rotates the stored refresh token and can sign Claude Code out. If
  the token has expired, the plugin shows `stale — token refreshes on next Claude use`; Claude Code refreshes it the
  next time a Claude model is used.
- All response parsing lives in `parseUsage` in `src/usage.ts`. If required fields (`five_hour`, `seven_day`,
  `utilization`, `resets_at`) are missing, it shows an explicit "usage response shape changed" error instead of
  guessing.
- Usage is tracked per account, so the numbers include usage from Claude Code, claude.ai, and OpenCode.

## Development

```sh
npm install
npm run typecheck
npm run build   # compiles src/tui.tsx to dist/tui.js (Bun is a dev dependency)
```

Point `cli.json` at your checkout and rebuild after changes. The package exports the compiled `dist/tui.js`:
OpenCode's runtime JSX transform skips files under `node_modules`, so npm-installed plugins must ship compiled JSX.

## License

MIT
