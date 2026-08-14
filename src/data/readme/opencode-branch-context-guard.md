# OpenCode Branch Context Guard

A tiny OpenCode TUI plugin that keeps Git context drift and AI-generated changes visible while coding.

OpenCode already shows your current branch. This plugin focuses on whether the branch context changed during the current AI Coding session.

## What It Does

- Remembers the branch context when a session starts.
- Warns when the current branch changes during that session.
- Shows the number of files changed by the current session.
- Optionally shows additions and deletions when available.
- Stays silent when there is nothing important to report.

Example states:

```text
feature branch + clean
-> nothing

feature branch + session changes
-> 3 files · +42 -7

branch changed
-> warning: branch changed
```

## Scope

This is a read-only safety indicator, not a Git management tool. It does not create, switch, delete, commit, push, pull, merge, rebase, or stash branches. It also does not claim to know whether the user or the Agent changed the branch.

## Installation

Verified with OpenCode `1.18.16`. Add the npm package to your global or project TUI configuration, then restart OpenCode:

Package: [opencode-branch-context-guard on npm](https://www.npmjs.com/package/opencode-branch-context-guard)

`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-branch-context-guard"]
}
```

For a project-only installation, create `.opencode/tui.json` with the same configuration. OpenCode installs npm TUI plugins and their dependencies automatically at startup. Users configure only the package name; internally, the package exposes OpenCode's required `./tui` entrypoint.

For local development, configure `tui.json` with a `file://` URL to `tui.mjs`; `npm run deploy:atdd` creates this configuration for the dedicated ATDD fixture.

## Behavior

- The first effective branch switch after a user prompt displays `branch changed`.
- Further switches before the next user prompt display `branch changed ×N`.
- The next user prompt accepts the current branch as the new baseline and clears the branch warning.
- File summaries use muted text for file counts, the active theme's diff-added color for `+N`, and its diff-removed color for `-N`.

## Development

```bash
npm install
npm run typecheck
npm test
npm run deploy:atdd
```

`deploy:atdd` configures the dedicated sibling fixture `../branch-context-guard-atdd` to load this repository's `tui.mjs` entrypoint directly. Set `OPENCODE_ATDD_DIR` to deploy to another dedicated target. The target is generated runtime configuration, not a second source tree; do not edit its `.opencode/tui.json` manually.

See [`docs/mission.md`](docs/mission.md), [`docs/tech-stack.md`](docs/tech-stack.md), [`docs/roadmap.md`](docs/roadmap.md), and [`docs/manual-atdd.md`](docs/manual-atdd.md) for product context, technical design, roadmap, and acceptance testing.

See [`docs/changelog.md`](docs/changelog.md) for release notes.

## Release Verification

Before creating a GitHub Release, push the version tag to run Windows CI, then verify the published npm package loads by name in a real OpenCode TUI after clearing its package cache. See [`docs/tech-stack.md`](docs/tech-stack.md) and [`docs/manual-atdd.md`](docs/manual-atdd.md) for the required checks.

## License

[MIT](LICENSE)
