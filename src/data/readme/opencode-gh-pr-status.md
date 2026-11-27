# OpenCode GH PR Status

See the pull request for your current branch and its CI status in the OpenCode sidebar or prompt footer. Nothing to attach and no special fonts to install.

**Sidebar** (default):

```text
GitHub PR
#1234 open
Fix terminal layout
review needed
8 pass  1 fail  2 run
```

The three check counts use your theme's success, error and warning colors.

**Footer:**

```text
#1234
```

For an open PR, a failed check or merge conflict makes the number red; otherwise pending checks make it yellow, and all counted checks passing makes it green. A draft with no failure or pending check is muted. No-checks, merged, closed and stale results are also muted.

## Requirements

- [OpenCode](https://opencode.ai/) **2.4.1 or later in the 2.x series**. This plugin uses the v2 TUI API (`Plugin.define`, `sidebar.content` and `prompt.footer.status`). It does not support OpenCode v1 or the OpenCode desktop app.
- Git and the [GitHub CLI](https://cli.github.com/) (`gh`) in the TUI's `PATH`. Authenticate with `gh auth login` or your usual `GH_TOKEN` setup.
- A Git checkout accessible from the machine running the TUI. The plugin uses the active session's location, not a remote OpenCode server's filesystem.

## Install

Install from GitHub:

```sh
opencode plugin add github:championswimmer/opencode-gh-pr-status
```

Once published to npm, the command will be:

```sh
opencode plugin add opencode-gh-pr-status
```

## Usage

Open an OpenCode session in a branch with a GitHub PR. If the terminal is too narrow for the sidebar to appear automatically, use **Toggle sidebar** in the command palette (`Ctrl+P`).

- The plugin uses `gh pr view` in the session directory. GitHub CLI's normal remote and upstream resolution determines which PR is shown.
- Click the PR number in the footer or the PR row in the sidebar to open it with `gh pr view --web` when mouse capture is enabled. Alternatively, use **Open current branch PR on GitHub** in the command palette.
- `#1234` also carries an OpenTUI link. OpenTUI emits OSC 8 when it detects hyperlink support; whether that link can be opened directly depends on the terminal, multiplexer, and mouse settings. The plugin never prints raw escape sequences into the sidebar.
- Only checks on the PR's current head commit are shown. Check runs are grouped by workflow and job name; legacy statuses are grouped separately by context name. The latest timestamp wins, using Actions job IDs to break ties or compare runs without timestamps when available. If metadata is insufficient, an undated pending run wins over a dated result; remaining ties use the last returned entry. Checks from apps without a workflow name and with identical job names cannot always be distinguished.
- `SKIPPED` and `NEUTRAL` are omitted, not reported as passed. Cancelled, timed-out and action-required checks are failures. Pending, queued, in-progress and unrecognized outcomes are counted as running.
- A branch with no PR is normally silent. So are detached HEAD, non-Git directories, and missing or unauthenticated `gh`. After a failed refresh, the last successful PR is marked `(stale)` in the sidebar (muted in the footer) for at most 15 minutes.

### Settings

Open **GitHub PR status settings** from the command palette (`Ctrl+P`) to change settings from the TUI. Pick a row to toggle it; changes apply immediately. Settings are saved in OpenCode's plugin storage, so they persist across restarts and apply to every session and every running TUI, not just the current one.

| Setting           | Default | Meaning                                                                      |
| ----------------- | ------- | ---------------------------------------------------------------------------- |
| Show PR status    | On      | Turn the widget and all polling off or on.                                   |
| Placement         | Sidebar | Show the full status in the sidebar, or only the number below the prompt.    |
| Compact           | Off     | Sidebar only: show only the PR number, state, conflicts (if any) and counts. |
| Show “No PR” hint | Off     | Sidebar only: show a muted hint when `gh` explicitly reports no PR.          |
| Refresh interval  | 30      | Seconds between open-PR refreshes; rounded and clamped to 15–600.            |

The plugin no longer reads `options` from `cli.json`. If you configured it there earlier, those options are ignored; set them from the **GitHub PR status settings** command instead.

While the selected widget is mounted, the plugin checks the local branch every five seconds. Results are cached in memory by checkout and branch. Branches with no PR retry at most every two minutes; closed or merged PRs retry at most every five minutes. Errors back off up to 15 minutes. Polling stops when the widget unmounts and pauses on terminal blur when the terminal reports focus events.

## Development

```sh
npm ci
npm run check
```

Checks cover lint, formatting, strict types, tests and the npm package contents. `npm run build:entry` compiles `src/tui.tsx` to `dist/tui.js` without bundling the host's OpenTUI or Solid. Commit the rebuilt `dist/` when source changes so GitHub installs don't need build tools. Don't add a `build` or `prepare` script: OpenCode's Git installer treats those as a signal to prepare the checkout instead of using the shipped entry. To test a checkout, use its absolute directory as the `package` in `cli.json`.

## Release

The release workflow follows [`pi-gh-footer`](https://github.com/championswimmer/pi-gh-footer): a `vX.Y.Z` tag on `main` runs checks and publishes using npm trusted publishing. To enable npm releases, set up `opencode-gh-pr-status` on npm and configure a trusted publisher for `championswimmer/opencode-gh-pr-status`, workflow `release.yml`. If npm requires a bootstrap release, the package owner must publish the initial version first. No `NPM_TOKEN` secret is needed by the workflow. Prerelease tags publish to `next`. After publishing, the workflow creates a GitHub Release for the tag with generated release notes.

Inspired by [`pi-gh-footer`](https://github.com/championswimmer/pi-gh-footer), which adds branch PR status to the Pi footer.
