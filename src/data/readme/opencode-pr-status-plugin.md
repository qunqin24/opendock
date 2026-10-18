# opencode-pr-status-plugin

[![CI](https://github.com/Snakeblack/opencode-pr-status-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/Snakeblack/opencode-pr-status-plugin/actions/workflows/ci.yml)

An [OpenCode V2](https://opencode.ai/v2) TUI plugin: a sidebar panel with your
open pull requests and their aggregated CI state, read through the local
[`gh`](https://cli.github.com/) CLI — no browser, no context switch.

Created with the [ospec-workflow](https://github.com/Snakeblack/ospec-workflow) harness by [Snakeblack](https://github.com/Snakeblack).

## What it shows

- Your own open pull requests (`gh pr list --author @me`): state mark, number,
  title and head branch.
- The aggregated CI state per pull request, as a distinct shape per state so it
  reads without colour: `◐` running, `●` green, `✖` failed, `○` none.
- Stacked pull requests grouped under their root: when one PR's base branch is
  another PR's head branch, the chain is indented base to tip under the root.
- A refresh every 30 seconds while the panel is open; a failed refresh keeps the
  last good list.

## Requirements

- OpenCode V2 (see [Supported hosts](#supported-hosts)).
- `gh` installed and authenticated (`gh auth login`). Every GitHub read goes
  through `gh`; the plugin never handles tokens itself.
- A project directory that is a GitHub repository.

## Install

Add the package to your `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-pr-status-plugin"]
}
```

OpenCode installs missing package plugins in the background. You can also
install it explicitly:

```sh
opencode plugin add opencode-pr-status-plugin
```

CLI-only setups (a `cli.json` beside the config) can list the package there
instead:

```json
{
  "plugins": ["opencode-pr-status-plugin"]
}
```

## Usage

Open the TUI in a GitHub project and look at the sidebar: the panel renders your
open pull requests as `● #123 Title` with the branch line under each row. Long
titles are clipped to one line; drafts are marked `(draft)`.

Failures are explicit and never take the TUI down: `gh` missing or
unauthenticated, offline, rate-limited, and projects without a git remote each
show their own message, and a temporary failure keeps the last good list.

## How it works

- One `gh pr list --state open --limit 50 --author @me` call per refresh, with
  the JSON fields the panel needs.
- No credentials, no direct GitHub API calls, no persisted state: everything is
  read through `gh` and kept in memory.
- Pull-request titles and branch names are normalized once at the boundary
  before rendering, so platform text never reaches the renderer raw.

## Supported hosts

OpenCode **V2** is supported. The package declares `@opencode/plugin ^2.0.32`
and is tested against OpenCode 2.0.32; `@opentui/core` / `@opentui/solid`
(>= 0.5.17) and `solid-js` (>= 1.9.0) are provided by the host. OpenCode V1 is
not supported.

## Versioning

[SemVer](https://semver.org/): patch for fixes, minor for new panel
functionality that keeps the host contract, major for a breaking change to the
host contract — the `opencode-pr-status-plugin` and
`opencode-pr-status-plugin/tui` entrypoints, or the supported host range.

## Known advisories

`npm audit` reports critical advisories in `seroval`, reached through the
host-provided stack (`@opencode/plugin` → `@opentui/solid` → `solid-js`). There
is no fixed upstream release yet. The plugin itself makes no network calls and
handles no credentials, so that code is not exercised by this plugin; the
advisory will be revisited when upstream ships a fix.

## License

MIT with the [Commons Clause](https://commonsclause.com/) License Condition
v1.0: use, modify and redistribute freely, but do not sell the plugin as that
condition defines it. See [LICENSE](LICENSE).

## Development

```sh
npm ci
npm run lint
npm run typecheck
npm test
```

Releases: bump `version` in `package.json`, commit, and create a GitHub release
with tag `v<version>`. The `publish` workflow re-runs the checks and publishes
to npm with provenance; it requires an `NPM_TOKEN` repository secret (a granular
npm token with publish rights).
