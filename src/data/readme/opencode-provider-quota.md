# OpenCode Provider Quota

A local-first OpenCode quota sidebar for OpenAI and GitHub Copilot.

## Sidebar

Each provider card shows:

- Remaining percentage for the current subscription windows.
- Reset time, expressed relatively while it is near.
- A safe unavailable/error state when quota data is not supplied.
- A clear source label: these are unofficial subscription endpoints, not API billing or API rate-limit data.

### OpenAI quota sources

OpenAI reports quota differently per plan, so both shapes are read:

- Consumer/Codex plans expose `rate_limit.primary_window` and `secondary_window`
  as 5h and weekly windows.
- Business/enterprise plans leave those null and instead expose a credit budget
  under `spend_control.individual_limit`. That budget renders as the bar, with
  the absolute balance shown beneath it.

Timestamps from OpenAI are epoch seconds. Percentages from all providers are
read on a 0-100 scale and never rescaled, so a 1% remainder is never mistaken
for a full quota. The absolute credit balance is computed but not rendered in
the sidebar; the bar and reset time are the only quota UI.

## Security Model

- Reads only the matching OAuth entry from OpenCode's global `auth.json`.
- Has no repository-local configuration, shell execution, telemetry, persistence, dependency updates, or provider URL overrides.
- Sends each credential only to its fixed HTTPS provider endpoint.
- Rejects redirects, uses a 10-second deadline, caps responses at 64 KiB, and keeps quota results only in memory.
- Polls each provider at most once per minute and coalesces concurrent requests.
- Does not refresh or write OAuth credentials. Reauthenticate with OpenCode when a token expires.

OpenAI and Copilot use unofficial subscription endpoints that can change without notice.

## Installation

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-provider-quota@x.y.z"]
}
```

Pin an exact version rather than using an unbounded spec. OpenCode installs
npm plugins automatically via Bun at startup and caches them in
`~/.cache/opencode/`.

The published package is only `package.json` and `dist/` — no `node_modules`.
OpenCode embeds `@opentui/*` and `solid-js` in its own binary and provides
them to plugins, so they are declared as optional peer dependencies rather
than vendored.

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
mise exec -- npm run test:ui
```

The UI regression test uses Bun (pinned in `mise.toml`) and OpenTUI's real
test renderer against `dist/tui.js`. It supplies synthetic credentials and
mocked provider responses, verifies delayed cards and percentage bars, checks
refreshes do not duplicate cards, and checks timer cleanup. Run `mise install`
first to provision the test runtime.

## Releasing

```sh
npm version <patch|minor|major>
npm run build
npm publish
git push --follow-tags
```

`files` in `package.json` restricts the published tarball to `dist/`,
`package.json`, `README.md`, and `LICENSE`.
