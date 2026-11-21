# opencode-github-pr

[![npm](https://img.shields.io/npm/v/opencode-github-pr)](https://www.npmjs.com/package/opencode-github-pr)
[![CI](https://github.com/987poiuytrewq/opencode-github-pr/actions/workflows/ci.yml/badge.svg)](https://github.com/987poiuytrewq/opencode-github-pr/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A GitHub pull request dashboard for the [OpenCode](https://opencode.ai) V2 sidebar. See your PRs for the current
repository, their CI, review and merge status, and jump straight to the right page on GitHub, without leaving OpenCode.

<img src="https://raw.githubusercontent.com/987poiuytrewq/opencode-github-pr/main/demo/demo.gif" alt="The PR dashboard in the OpenCode sidebar, paging through PRs and changing filters" width="552" />

## Features

- **PR list in the sidebar** for the repository of the active session, refreshed automatically.
- **Status at a glance:** mergeability, CI checks, reviews and unresolved review comments on every row.
- **Click-through to GitHub:** each part of a row opens the matching GitHub page (overview, checks, files or merge
  status).
- **Filters:** show PRs for the current branch, authored by you, assigned to you, or all of them, and choose open,
  closed or all states.
- **Follows your theme:** colours come from your active OpenCode theme, and every colour and icon can be overridden.
- **Nerd Font or plain Unicode icons**, so it looks right whether or not your terminal font has Nerd Font glyphs.
- **Works with GitHub.com and GitHub Enterprise Server**, over HTTPS or SSH remotes, including linked Git worktrees.

## Requirements

- OpenCode **2.0.20 or later** (V2 plugin API).
- [Bun](https://bun.sh), if installing from source.
- A GitHub token, or the [GitHub CLI](https://cli.github.com) signed in with `gh auth login`. See
  [Authentication](#authentication).
- A terminal font that supports Nerd Font glyphs, or set `iconStyle` to `"unicode"` to use standard Unicode symbols.

## Install from npm

Add the package name to the `plugins` array in your OpenCode config, either globally at
`~/.config/opencode/opencode.json` or in a project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-github-pr"]
}
```

Run `/reload` in the TUI. OpenCode installs the package from npm and the **Pull Requests** panel appears in the session
sidebar.

To pass [options](#configuration), keep the plugin registered in `opencode.json` and add a matching entry to the
global CLI config at `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-github-pr",
      "options": {
        "iconStyle": "unicode"
      }
    }
  ]
}
```

## Install from source

1. Clone the repository and install its dependencies:

   ```bash
   git clone https://github.com/987poiuytrewq/opencode-github-pr.git
   cd opencode-github-pr
   bun install
   ```

   The install also builds the package's TUI entrypoint. The npm artifact ships this precompiled JavaScript so
   OpenCode's isolated plugin cache can resolve the OpenTUI JSX runtime through the host's shared runtime modules.

2. Add the clone's absolute path to the `plugins` array in your OpenCode config. Use the global config at
   `~/.config/opencode/opencode.json` to get the dashboard in every project, or a project's `opencode.json` for just
   that project:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       {
         "package": "/absolute/path/to/opencode-github-pr"
       }
     ]
   }
   ```

3. Run `/reload` in the TUI. The **Pull Requests** panel appears in the session sidebar.

However you install it, register the package in `opencode.json` so its server part is available. Put TUI
[options](#configuration) in the global `cli.json` entry for the same package. The CLI loads the TUI part from the
server's plugin list, including when it is connected to a remote server.

## Authentication

The plugin looks for a token in this order:

1. `GITHUB_TOKEN`
2. `GH_TOKEN`
3. `GITHUB_PERSONAL_ACCESS_TOKEN`
4. `gh auth token` (for the Enterprise host when [`GITHUB_ENTERPRISE_URL`](#github-enterprise-server) is set)

If you already use the GitHub CLI, `gh auth login` is all you need. Environment variables must be set where the
OpenCode server process starts; a token exported in a different shell won't be seen.

The token only needs read access. The dashboard doesn't change anything on GitHub.

| Token type | What it needs |
| --- | --- |
| `gh auth login` | The default scopes are enough. |
| Classic personal access token | `repo` for private repositories; no scope for public ones. |
| Fine-grained personal access token | Read access to **Pull requests** and **Commit statuses** on the repositories you use. |

## Using the dashboard

The dashboard shows PRs for the repository the active session is working in. It finds the repository from the Git
remotes: `origin` first, then any other remote that points at GitHub (or your Enterprise host).

### Reading a row

Each PR takes two lines. The first has a PR icon and the title. The second has the PR number, the lines added
and removed, and on the right, the unresolved comment count, review status and check status.

| Element | Meaning | Click opens |
| --- | --- | --- |
| PR icon | Green: ready to merge (including `HAS_HOOKS` when reviews are approved or not required). Red: merge conflict or changes requested. Yellow: blocked, behind, unstable or review required. Grey: draft, closed or unknown. Your theme's info colour: merged ([use GitHub's purple](#colours) instead). | Merge status panel |
| Title | The PR title, shortened to fit the sidebar. | PR overview |
| `#128` | PR number. | PR overview |
| `+42 -7` | Lines added and removed. | Files changed |
| Comment icon and count | Unresolved review threads. Hidden when there are none. | Files changed |
| Review icon | Green: approved. Red: changes requested. Yellow: review requested. Grey: commented. | PR overview |
| Check dot | Green: passing. Red: failing. Yellow: pending. Grey: neutral or skipped. | Checks |

When reviews or checks are in more than one state, each state gets its own icon with a count, for example three green
dots and one red dot for three passing checks and one failing.

On older GitHub Enterprise Server versions that report `mergeStateStatus` or `reviewDecision` as unknown GraphQL fields,
the dashboard retries once without those fields and continues with the remaining PR data. It does not retry unrelated
GraphQL errors, including other `422` responses.

### Filters

The two labels at the top right of the panel are filters. Click one to cycle through its values.

| Filter | Values | Default |
| --- | --- | --- |
| Scope | `branch` (PRs from the current branch), `author` (opened by you), `assignee` (assigned to you), `all` | `author` |
| Status | `open`, `closed` (closed or merged), `all` | `open` |

You can change the defaults with [`defaultScope` and `defaultStatusFilter`](#configuration).

### Pages

The panel shows five PRs at a time, most recently updated first. When there are more, use the arrows at the bottom
of the panel to page through them. The counter between the arrows shows the current page and the total, for example
`2 of 7`. Change the number per page with [`pageSize`](#configuration).

### Commands

These commands are available as slash commands and in the command palette, under **PR Dashboard**:

| Slash command | Palette title | What it does |
| --- | --- | --- |
| `/pr-refresh` | PRs: Refresh dashboard | Reloads the PR list now. |
| `/pr-open` | PRs: Open selected in browser | Opens the PR you last clicked, or the first PR in the list. |

### Refreshing

The list refreshes when OpenCode starts, each time a session goes idle (for example after the agent finishes a task),
and every 60 seconds while a session is open. Use `/pr-refresh` to reload it on demand. Change the interval with
[`refreshIntervalMs`](#configuration).

### How PRs are loaded

The filters are applied by GitHub, so the dashboard only downloads PRs that match them:

- `all` and `branch` use the repository's PR list, so new PRs appear on the next refresh.
- `author` and `assignee` use GitHub search. Search can take a short while to index a new PR, so a PR you've just
  opened may appear a refresh or two later. To bridge that delay, the dashboard also checks a small number of the
  repository's newest PRs and adds matching ones that search hasn't returned yet. Set `recentPRsLimit` to `0` to disable
  this supplement. GitHub search also returns at most 1,000 PRs; when you reach that limit, the panel says so.

PRs load in batches. The first batch holds four pages' worth (20 PRs with the default page size). Moving to another
page starts loading the next batch in the background, so paging stays quick. If you reach the last loaded page
before the next batch arrives, the panel moves on as soon as it does. Changing a filter loads that filter's first
batch. Use [`pageSize` and `pagesPerBatch`](#configuration) to change how much is loaded at a time.

## Configuration

Pass options in the matching plugin entry's `options` object in the global
`~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`). CLI config is global, so these options apply
to all projects. Every option is optional. For a source installation, use the clone's absolute path as the `package`
value:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-github-pr",
      "options": {
        "pageSize": 8,
        "refreshIntervalMs": 30000,
        "recentPRsLimit": 5,
        "defaultScope": "all",
        "defaultStatusFilter": "open",
        "spacing": {
          "iconToCount": 0,
          "sameTypeGroups": 0,
          "differentTypeGroups": 1
        },
        "showSingleStatusCount": false
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Set to `false` to turn the dashboard off without uninstalling it. |
| `pageSize` | `5` | PRs shown per page. |
| `pagesPerBatch` | `4` | Pages of PRs to load from GitHub at a time, so each batch is `pageSize × pagesPerBatch` PRs. The minimum is `4`; lower values are raised to it. See [How PRs are loaded](#how-prs-are-loaded). |
| `refreshIntervalMs` | `60000` | How often the list refreshes while a session is open, in milliseconds. |
| `requestTimeoutMs` | `15000` | How long to wait for a GitHub request before giving up, in milliseconds. |
| `recentPRsLimit` | `5` | For `author` and `assignee` scopes, check up to this many newest repository PRs to fill search-index gaps. Set to `0` to disable; values above `100` are capped. |
| `defaultScope` | `"author"` | Scope filter at startup: `branch`, `author`, `assignee` or `all`. |
| `defaultStatusFilter` | `"open"` | Status filter at startup: `open`, `closed` or `all`. |
| `iconStyle` | `"nerd"` | Icon set: `"nerd"` for Nerd Font glyphs, or `"unicode"` for standard Unicode symbols that work in any font. See [Icons](#icons). |
| `colors` | Theme | Colour overrides. See [Colours](#colours). |
| `icons` | From `iconStyle` | Overrides for individual icons. See [Icons](#icons). |
| `spacing` | See below | Gaps, in terminal cells, between an indicator's icon and count, between same-type groups, and between comment/review/check types. Each gap is clamped to `0`–`4`. |
| `showSingleStatusCount` | `false` | Show counts for review and check badges even when there is only one status group. |

`spacing` accepts `iconToCount`, `sameTypeGroups` and `differentTypeGroups`. Its defaults are `0`, `0` and `1`,
respectively. For example, set `iconToCount` to `1` to put one cell between each status icon and its count.

Most numeric options must be positive numbers. `recentPRsLimit` accepts `0` through `100`, and spacing gaps accept
`0` through `4`; invalid values fall back to their defaults.

### Colours

By default, colours come from your active OpenCode theme. Override any of them with a colour string such as
`"#a371f7"`:

| Key | Used for | Default theme token |
| --- | --- | --- |
| `panelAlt` | Background of each row's second line | Raised background |
| `text` | PR titles and the panel heading | Text |
| `muted` | Secondary text, neutral states | Muted text |
| `accent` | Hovered filters and page arrows | Primary action text |
| `success` | Passing checks, approvals, mergeable PRs, additions | Success text |
| `warning` | Pending checks, requested reviews, warnings | Warning text |
| `error` | Failing checks, requested changes, conflicts, deletions, errors | Error text |
| `draft` | Draft PR icon | Muted text |
| `merged` | Merged PR icon | Info text |

To show merged PRs in GitHub's purple instead of your theme's info colour, set `merged` to `"#a371f7"` (GitHub's dark
theme) or `"#8250df"` (GitHub's light theme). Colour and icon overrides go inside the plugin entry's `options` in
`cli.json`, next to the other options:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-github-pr",
      "options": {
        "colors": {
          "merged": "#a371f7"
        }
      }
    }
  ]
}
```

### Icons

`iconStyle` picks the icon set. Nerd Font glyphs are the default; set `"unicode"` if your terminal font doesn't have
them. Set it in the matching plugin entry's `options` in `cli.json`:

```json
{
  "options": {
    "iconStyle": "unicode"
  }
}
```

| Key | Nerd Font (default) | Unicode | Used for |
| --- | --- | --- | --- |
| `openPR` | `U+E726` | `•` | Open PRs |
| `closedPR` | `U+E726` | `•` | Closed PRs |
| `draftPR` | `U+E726` | `•` | Draft PRs |
| `mergedPR` | `U+E727` | `•` | Merged PRs |
| `review` | `U+F4FF` | `✓` | Review status |
| `openComment` | `U+F017A` | `■` | Unresolved review threads |
| `check` | `●` | `●` | CI check status |
| `scope` | `U+F4D7` | *(none)* | Icon before the filter labels |
| `loading` | `U+F051F` | `…` | Loading messages |
| `info` | `U+F129` | `ℹ` | Informational messages |
| `error` | `U+E654` | `⚠` | Error messages |
| `previousPage` | `U+EB6F` | `◀` | Previous page arrow |
| `nextPage` | `U+EB70` | `▶` | Next page arrow |

To change individual icons, set them in `icons`. These override the chosen style. An empty string hides an icon;
whitespace-only values are ignored.

#### Plain-text icons

If neither set suits your font, replace every icon with ASCII characters:

```json
{
  "options": {
    "icons": {
      "openPR": "o",
      "closedPR": "c",
      "draftPR": "d",
      "mergedPR": "m",
      "review": "R",
      "openComment": "C",
      "check": "*",
      "scope": "@",
      "loading": "...",
      "info": "i",
      "error": "!",
      "previousPage": "<",
      "nextPage": ">"
    }
  }
}
```

## GitHub Enterprise Server

Set `GITHUB_ENTERPRISE_URL` where the OpenCode server starts:

```bash
export GITHUB_ENTERPRISE_URL="https://github.example.com"
```

Use the server URL or its `/api/v3` URL; it must be HTTPS. The plugin then recognises remotes on that host, uses its
APIs, and asks `gh auth token` for that host's token. While it is set, github.com remotes aren't recognised. Leave it
unset for GitHub.com.

## Troubleshooting

| You see | What to do |
| --- | --- |
| No **Pull Requests** panel | Check that the package is registered in `opencode.json` and that `enabled` isn't `false`, then reload OpenCode. If you installed from source, check that `bun install` has run in the clone. Plugin load errors are written to `~/.local/share/opencode/log/opencode.log`. |
| Plugin options or colour overrides have no effect | Put the options in the matching plugin entry in the global `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`), not in `opencode.json`, then run `/reload` in the TUI. For a source install, the `package` path in `cli.json` must point to the same clone registered in `opencode.json`. |
| Icons show as boxes or question marks | Your terminal font doesn't have Nerd Font glyphs. Set `iconStyle` to `"unicode"`, install a Nerd Font, or use [plain-text icons](#plain-text-icons). |
| **No GitHub repo** | The session's directory isn't a Git repository with a GitHub remote. Add a remote, or open a session in the right project. For Enterprise, check `GITHUB_ENTERPRISE_URL`. |
| **GitHub sign-in failed** | No valid token was found. Run `gh auth login`, or set `GITHUB_TOKEN` where the OpenCode server starts. |
| **Permission denied** or **Repo not found** | Your token can't read this repository. Check its scopes or fine-grained permissions, and SSO authorisation for organisation repositories. |
| **Rate limit exceeded** | GitHub's API limit has been reached. The panel shows when you can try again. Raise `refreshIntervalMs` and avoid paging forward unnecessarily to use less quota. |
| **Request timed out** or **Cannot reach GitHub** | Check your connection or proxy. On slow networks, raise `requestTimeoutMs`. |
| **No matching PRs** | No PRs match the current filters. Click the scope or status label to widen them. Under `author` or `assignee`, a PR opened moments ago may not be in GitHub's search index yet; it appears on a later refresh. |
| **GitHub search is limited to 1,000 matching PRs** | The `author` and `assignee` filters use GitHub search, which returns at most 1,000 PRs. Switch the status filter to `open` or the scope to `all` to see older PRs. |
| `branch` scope is empty | The current branch has no PR, or the session is in detached HEAD. |

## Releasing

Releases are published to npm by GitHub Actions after a GitHub Release is published. To make a release:

1. Set the `version` in `package.json` to the release version and merge that change to `main`.
2. Create and publish a GitHub Release with the matching `v`-prefixed tag (for example, package version `0.2.0` uses
   tag `v0.2.0`).
3. The release workflow verifies the tag and package version, runs the full CI suite, then publishes to npm with
   provenance. Prereleases are not published.

The repository's npm package must be configured for **trusted publishing** on npmjs.com to use GitHub Actions as the
publisher, with repository `987poiuytrewq/opencode-github-pr`, workflow `release.yml`, and environment `npm`. The
workflow's `npm` environment can also be configured with required reviewers to gate publication.

## Development

```bash
bun install
make opencode
```

`make opencode` starts OpenCode on this checkout with the plugin loaded from it, using a temporary config so your own
OpenCode config isn't changed. It uses `GH_TOKEN`, `GITHUB_TOKEN` or `GITHUB_PERSONAL_ACCESS_TOKEN` if set, otherwise
`gh auth token`.

### Project layout

| Path | Contents |
| --- | --- |
| `plugins/pr-dashboard.ts` | Server part: plugin registration. |
| `plugins/pr-dashboard.tui.tsx` | TUI part: sidebar slot, commands and refresh scheduling. |
| `plugins/app/` | Solid UI components, options and theme handling. |
| `plugins/domain/` | Pure logic: filters, status rollups, formatting and messages. |
| `plugins/infra/` | Git remote detection, Octokit client and GitHub queries. |
| `tests/` | Unit, integration and end-to-end tests. |
| `demo/` | Demo recording script and fixtures. |

### Tests

| Command | Runs |
| --- | --- |
| `make test` | Everything below. |
| `make format-check` | Formatting, and checks that the first JSON example in this README is strict JSON. |
| `make typecheck` | TypeScript. |
| `make test-unit` | Unit tests. |
| `make test-integration` | Integration tests. |
| `make test-e2e` | End-to-end tests against a real OpenCode TUI in tmux. |

The end-to-end tests need `tmux` and the OpenCode CLI. `make ci-tools` installs version `2.0.20` by default; override it
with `OPENCODE_VERSION` to install another version. To run against an already installed binary, use:

```bash
make test-e2e OPENCODE_BIN=/path/to/opencode
```

CI runs the full test suite against the latest stable patch from each current OpenCode V2 minor line: `2.0.32`,
`2.1.4`, `2.2.7` and `2.3.2`. OpenCode V1 and older patch releases are not covered by this matrix. Update the matrix
in `.github/workflows/ci.yml` as new V2 minor lines are released.

### Recording the demo

```bash
make demo
```

This records the real OpenCode TUI with fictional PR data, then writes `demo/demo.cast` and `demo/demo.gif`. It needs
`asciinema`, `agg`, `tmux`, Bun and the OpenCode CLI. It runs in a temporary repository and home directory with GitHub
access turned off, so it doesn't touch your config or make network requests. Replay it with
`asciinema play demo/demo.cast`.

## License

[MIT](LICENSE)
