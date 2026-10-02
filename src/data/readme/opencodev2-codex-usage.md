# opencodev2-codex-usage

Independent OpenCode V2 sidebar plugin that shows Codex 5-hour and weekly usage in the CLI and TUI.

[![npm version](https://img.shields.io/npm/v/opencodev2-codex-usage.svg)](https://www.npmjs.com/package/opencodev2-codex-usage)
[![license: MIT](https://img.shields.io/npm/l/opencodev2-codex-usage.svg)](./LICENSE)
[![node >= 26.4.0](https://img.shields.io/node/v/opencodev2-codex-usage.svg)](./package.json)
[![checks](https://img.shields.io/badge/checks-lint%20typecheck%20test%20format-blue.svg)](#development)

<p align="center">
    <img src="https://raw.githubusercontent.com/jn-s3s/opencodev2-codex-usage/main/docs/screenshot.png" width="200" alt="Codex usage sidebar in OpenCode TUI" sty-/>
</p>

No Bun runtime. No browser cookie, login UI or credential install step.

## Contents

- [opencodev2-codex-usage](#opencodev2-codex-usage)
    - [Contents](#contents)
    - [Features](#features)
    - [Requirements](#requirements)
    - [Install](#install)
        - [Local development install](#local-development-install)
    - [Authentication](#authentication)
    - [How it works](#how-it-works)
    - [Configuration](#configuration)
    - [Privacy and security](#privacy-and-security)
    - [Troubleshooting](#troubleshooting)
    - [Development](#development)
    - [Dependency advisory](#dependency-advisory)
    - [Contributing](#contributing)
    - [Security](#security)
    - [Changelog](#changelog)
    - [License](#license)

## Features

- Shows Codex 5-hour and weekly usage as compact sidebar meters.
- Shows reset countdowns such as `1h 30m to reset` or `1d to reset`.
- Shows the plan label when the usage response includes a valid `plan_type`.
- Shows an optional `Until` date from the subscriptions lookup.
- Polls in the background and keeps the last good values when a refresh fails.
- Never prints tokens, account IDs, response bodies or raw network errors.

## Requirements

- Node.js `>=26.4.0`. This is the minimum needed by `@opentui/core 0.5.12`.
- OpenCode V2 CLI with TUI sidebar support.
- Codex CLI installed and signed in with `codex login`.
- A readable Codex `auth.json` file. See [Authentication](#authentication).

## Install

Add the package to the global OpenCode V2 CLI config at `~/.config/opencode/cli.json`. On Windows use the matching OpenCode config directory:

```json
{ "plugins": ["opencodev2-codex-usage"] }
```

The object form is also supported:

```json
{ "plugins": [{ "package": "opencodev2-codex-usage" }] }
```

Notes:

- Use the bare package name for CLI registration. Both `.` and `./tui` resolve to `dist/tui.js`, but the bare name is the documented entry.
- This is a CLI and TUI plugin. Do not place it in `~/.config/opencode/plugins`, which is for server plugins.
- Restart OpenCode after install or after config changes.
- The module does no file reads or network calls on import. Polling starts only when OpenCode calls `setup`.

### Local development install

For a local checkout on Windows, first build, then point OpenCode at the built directory:

```powershell
npm run build
```

```json
{ "plugins": ["<checkout>/opencodev2-codex-usage/dist"] }
```

Replace `<checkout>` with the absolute path to your local clone. On Windows use forward slashes, for example `C:/src/opencodev2-codex-usage/dist`.

Rebuild and restart OpenCode after source changes. Pointing a local entry at the package root did not load the sidebar in manual testing. Loading by published npm package name still needs an end to end test before release.

## Authentication

Sign in separately with the Codex CLI:

```powershell
codex login
```

At runtime the plugin reads and parses `auth.json` from an absolute `CODEX_HOME` directory or, by default, `~/.codex`.

| Variable     | Default    | Notes                                                            |
| ------------ | ---------- | ---------------------------------------------------------------- |
| `CODEX_HOME` | `~/.codex` | Must be an absolute path when set. Relative values are rejected. |

Behavior:

- Uses only `tokens.access_token` and `tokens.account_id` from the parsed file.
- Does not use other fields for auth, refresh or requests, including any refresh token.
- Never writes credentials.
- Cannot read keychain-only credentials.
- An expired token shows `Codex sign-in expired`. Sign in again with `codex login`.

Tests use synthetic credentials and fake responses only. They never read your real Codex login or contact live endpoints.

## How it works

1. On `setup` the plugin registers a `sidebar.content` slot.
2. Every two minutes it calls `GET https://chatgpt.com/backend-api/wham/usage` with Bearer and `ChatGPT-Account-Id` headers.
3. After a successful usage call it makes an optional `GET https://chatgpt.com/backend-api/subscriptions?account_id=<encoded ID>` with the same headers.
4. Countdown text refreshes every 30 seconds. Data is marked stale after five minutes.
5. Windows are matched by `limit_window_seconds` (`18000` for 5-hour and `604800` for weekly), never by position or by primary and secondary names.
6. Each percent is percent left (`100 - used_percent`), clamped to `0-100`. Missing windows render as unavailable.
7. On HTTP `429` the plugin retries at most once for a short `Retry-After`, then uses a bounded cooldown. Later errors keep the last successful values with a safe status note.

Both endpoints are fixed HTTPS origins. They are private and undocumented and may change without notice. Redirects are not followed, especially cross-origin redirects. Request timeouts and response and auth file size limits apply.

## Configuration

There are no plugin options. The only runtime input is `CODEX_HOME` for credential lookup. Poll intervals are fixed in code:

| Behavior          | Interval                                     |
| ----------------- | -------------------------------------------- |
| Usage refresh     | Every 2 minutes                              |
| Countdown repaint | Every 30 seconds                             |
| Stale marker      | After 5 minutes without a successful refresh |

## Privacy and security

- Only `access_token` and `account_id` are read from `auth.json`.
- The subscription request includes your account ID in its URL query. The usage request sends it as a header.
- No secrets, response bodies or raw network errors are shown in the sidebar or logs.
- Auth file reads are size capped. HTTP bodies are size capped and content type checked.
- Lookup failures for `active_until` never block usage and never discard usage results.
- See [SECURITY.md](./SECURITY.md) for how to report a vulnerability.

## Troubleshooting

| Symptom                                     | Likely cause                                                                      | Fix                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Sign in with Codex CLI`                    | Missing or unreadable `auth.json`, bad JSON, missing tokens or oversized file     | Run `codex login`, check `CODEX_HOME` is absolute, check file permissions |
| `Codex sign-in expired`                     | HTTP 401 or bad auth redirect                                                     | Run `codex login` again                                                   |
| `Rate limited · retry in Xm`                | HTTP 429 from the usage endpoint                                                  | Wait for the cooldown, avoid manual refresh loops                         |
| `Unavailable`                               | Network, timeout, bad status, bad JSON or capped body                             | Check network access to `chatgpt.com`, retry later                        |
| `Reset unavailable` or `Weekly unavailable` | Missing window in the provider payload                                            | Wait for the next refresh, provider payloads vary                         |
| `(stale)`                                   | No successful refresh for over 5 minutes                                          | Check network and auth, restart OpenCode if it persists                   |
| Sidebar does not appear                     | Wrong config file, server plugin folder used, missing restart or unpublished name | Use `cli.json`, use the bare package name, restart OpenCode               |
| Local checkout does not load                | Plugin pointed at source root instead of `dist`                                   | Run `npm run build` and point the entry at the `dist` directory           |

Enable OpenCode debug logs first. Do not paste tokens, `auth.json` contents or full response bodies in issues.

## Development

Use this order for a clean checkout:

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

Use `npm pack` instead of `npm pack --dry-run` when you want the tarball. The build must complete before packing or publishing. There are no `prepack`, `prepare`, `postinstall` or publish lifecycle scripts that create `dist/tui.js` automatically. Registry consumers install the prebuilt package.

| Script                 | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `npm run build`        | Bundle `src/tui.tsx` to `dist/tui.js` with esbuild      |
| `npm run typecheck`    | Strict `tsc --noEmit` check                             |
| `npm test`             | Run `vitest run tests` with synthetic fixtures only     |
| `npm run lint`         | Run `oxlint`                                            |
| `npm run lint:fix`     | Run `oxlint --fix`                                      |
| `npm run format`       | Format with Prettier                                    |
| `npm run format:check` | Check formatting with Prettier                          |
| `npm run check`        | Run lint, typecheck, format check and tests in one step |

Node 26 is required. The repo pins LF line endings, spaces for indent and a final newline. See [.editorconfig](./.editorconfig) and [.prettierrc.json](./.prettierrc.json).

## Dependency advisory

`npm audit --omit=dev` currently reports a low severity `GHSA-4x5r-pxfx-6jf8` advisory on `@babel/core@7.28.0` pinned transitively by `@opentui/solid@0.5.12`. Version `@opentui/solid@0.5.14` still pins that version. A local npm override would not fix the published package for consumers. This needs an upstream dependency fix. Do not assume the published package has zero advisories.

## Contributing

Small fixes and doc improvements are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, checks and pull request guidance.

## Security

Do not open a public issue for a suspected vulnerability. See [SECURITY.md](./SECURITY.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes. The published package also ships `README.md`, `LICENSE` and `CHANGELOG.md`.

## License

MIT. See [LICENSE](./LICENSE).
