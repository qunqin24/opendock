# OpenCode Provider Quota

A local-first OpenCode quota sidebar for OpenAI and GitHub Copilot.

> **Version 2.x targets OpenCode v2** (`>=2.0.28 <3`). For OpenCode v1
> (`>=1.18.25 <2`) use `opencode-provider-quota@1.0.0`.

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
  under `spend_control.individual_limit`. That budget renders as the bar.

Timestamps from OpenAI are epoch seconds. Percentages from all providers are
read on a 0-100 scale and never rescaled, so a 1% remainder is never mistaken
for a full quota.

## Architecture

The package is a standard OpenCode v2 plugin with a server entry and a CLI
(TUI) entry:

- `opencode-provider-quota` (server) resolves the active OpenAI and GitHub
  Copilot OAuth connections through OpenCode's integration API, queries the
  provider endpoints, and exposes display-safe snapshots through the
  `lmasaya.opencode-provider-quota` RPC.
- `opencode-provider-quota/tui` renders the **QUOTA** section in the sidebar
  (`sidebar.content` slot) by calling that RPC once a minute.

Credentials stay inside the server process. They are never sent to the TUI,
which also makes the sidebar work against a remote OpenCode server.

## Security Model

- Reads credentials only through OpenCode's integration API
  (`ctx.integration.connection`); it does not read `auth.json`, the database,
  or any other file.
- Has no repository-local configuration, shell execution, telemetry, persistence, dependency updates, or provider URL overrides.
- Sends each credential only to its fixed HTTPS provider endpoint.
- Rejects redirects, uses a 10-second deadline, caps responses at 64 KiB, and keeps quota results only in memory.
- Polls each provider at most once per minute and coalesces concurrent requests.
- Does not refresh or write OAuth credentials. Reconnect the provider in OpenCode when a token expires.

OpenAI and Copilot use unofficial subscription endpoints that can change without notice.

## Installation

### 1. Requirements

- OpenCode `>=2.0.28 <3`.
- A subscription login for at least one supported provider: OpenAI
  (Codex/ChatGPT) or GitHub Copilot.

### 2. Add the plugin to your OpenCode config

Add the package to `plugins` in your global `~/.config/opencode/opencode.jsonc`
(applies to every project) or a project `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-provider-quota@2.0.0"]
}
```

Plugin arrays from all config files are applied together, so just add the
entry to an existing `plugins` list. Pin an exact version rather than using an
unbounded spec: OpenCode installs npm plugins at startup and does not change
exact versions afterwards.

Alternatively, install it from the CLI:

```sh
opencode plugin add opencode-provider-quota@2.0.0
```

The CLI part loads automatically from the same entry; you do not need to add
the package to `cli.json`.

### 3. Connect the providers

Connect each provider in OpenCode (`/connect` in the TUI). Check the result
with:

```sh
opencode plugin list
```

### 4. Verify the sidebar

Restart OpenCode. A **QUOTA** section appears at the bottom of the sidebar with
one card per provider. Cards render within a few seconds and refresh at most
once per minute; a provider without quota data shows a muted unavailable state
instead of a misleading bar.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| No **QUOTA** section in the sidebar | Run `opencode plugin list` and check `lmasaya.opencode-provider-quota` is listed; check the `plugins` entry parses. |
| "OAuth authentication unavailable" | Connect the provider with `/connect`; the card needs an OAuth connection (API keys are not supported). |
| "OAuth authentication expired" | Reconnect the provider in OpenCode; the plugin does not refresh tokens. |
| "quota response changed" / "upstream http ..." | The unofficial provider endpoint may have changed or rejected the request; retry later or open an issue. |
| "quota refresh failed" | The TUI could not reach the plugin's RPC; check `opencode service status` and `~/.local/share/opencode/log/opencode.log`. |

## How the package is published

The published package is only `package.json` and `dist/`. OpenCode provides
`@opencode/plugin`, `@opentui/*` and `solid-js` to plugins at runtime, so they
are declared as optional peer dependencies rather than vendored.

## Development

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm test
mise exec -- npm run test:ui
```

The UI regression test uses Bun (pinned in `mise.toml`) and OpenTUI's real
test renderer against `dist/tui.js`. It mocks the quota RPC and verifies
delayed cards, percentage bars, the error state, that refreshes do not
duplicate cards, and timer cleanup. Run `mise install` first to provision the
test runtime.

## Releasing

```sh
npm version <patch|minor|major>
npm run build
npm publish
git push --follow-tags
```

`files` in `package.json` restricts the published tarball to `dist/`,
`package.json`, `README.md`, and `LICENSE`.
