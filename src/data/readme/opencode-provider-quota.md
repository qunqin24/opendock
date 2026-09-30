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

### 1. Requirements

- OpenCode `>=1.18.25 <2` (the plugin uses TUI plugin slots introduced in the 1.x series).
- An OpenCode subscription login for at least one supported provider:
  OpenAI (Codex/ChatGPT) or GitHub Copilot.

### 2. Add the plugin to your OpenCode config

OpenCode configuration files are JSON or JSONC and are **merged** across
locations, so you can install the plugin globally, per project, or both.

**Global (recommended)** — `~/.config/opencode/opencode.json`, applies to all
projects:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-provider-quota@1.0.0"]
}
```

**Per project** — `opencode.json` in the project root (safe to commit):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-provider-quota@1.0.0"]
}
```

If you already have a `plugin` array (or other settings), just add the entry —
config files merge, with project config overriding the global file only for
conflicting keys.

Pin an exact version rather than using an unbounded spec. OpenCode installs
npm plugins automatically via Bun at startup and caches them in
`~/.cache/opencode/node_modules/`.

### 3. Authenticate the providers

The sidebar reads OAuth credentials that OpenCode itself stores — the plugin
never asks for or stores secrets itself. Authenticate each provider you want
to monitor:

```sh
opencode auth login
```

Select `openai` and/or `github-copilot` from the prompt (or use `/connect`
in the TUI). Credentials are stored in
`~/.local/share/opencode/auth.json` (or `$XDG_DATA_HOME/opencode/auth.json`),
which is the only file this plugin reads. Verify what is authenticated with:

```sh
opencode auth list
```

### 4. Verify the sidebar

Restart OpenCode (npm plugins install at startup). A **QUOTA** section
appears at the bottom of the TUI sidebar with one card per authenticated
provider. Cards render within a few seconds and refresh at most once per
minute; a provider without quota data shows a muted unavailable state instead
of a misleading bar.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| No **QUOTA** section in the sidebar | Check the `plugin` entry is in `~/.config/opencode/opencode.json` or the project `opencode.json`, and that the JSON parses. |
| "OAuth authentication unavailable" | Run `opencode auth login` for the provider; the card needs an `oauth` entry in `auth.json`. |
| "OAuth authentication expired" | Re-run `opencode auth login` — the plugin does not refresh tokens. |
| "quota response changed" / "upstream http ..." | The unofficial provider endpoint may have changed or rejected the request; retry later or open an issue. |
| Only one card shows | Each card requires that provider to be authenticated; the other provider is skipped silently. |

## How the package is published

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
