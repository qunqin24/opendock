# pr-sidebar

[![check](https://github.com/karczews/opencode-pr-sidebar/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/karczews/opencode-pr-sidebar/actions/workflows/check.yml?query=branch%3Amain)
[![npm](https://img.shields.io/npm/v/opencode2-pr-sidebar)](https://www.npmjs.com/package/opencode2-pr-sidebar)

Current-branch GitHub pull request card for the OpenCode TUI sidebar.

It shows the pull request for the working directory's current branch: lifecycle,
review, checks, merge readiness, and activity at a glance. The card is read-only,
uses your authenticated GitHub CLI, and makes no model calls. The full behavior
contract lives in
[`openspec/specs/pr-sidebar/spec.md`](openspec/specs/pr-sidebar/spec.md).

![Pull request card demo](docs/assets/card.gif)

## Requirements

- OpenCode v2 with TUI plugin support (`>= 2.2.6`; uses the V2
  `Plugin.define({ setup })` TUI API).
- `git` and an authenticated `gh` (`gh auth login`) on the TUI process's `PATH`.

## Install

### From npm (recommended)

<!-- x-release-please-start-version -->
```sh
opencode plugin add opencode2-pr-sidebar
# pin a published version if you prefer:
opencode plugin add opencode2-pr-sidebar@0.2.0
```
<!-- x-release-please-end -->

Update later with `opencode plugin update opencode2-pr-sidebar`.

### From GitHub

<!-- x-release-please-start-version -->
```sh
opencode plugin add github:karczews/opencode-pr-sidebar
# pin a release tag if you prefer:
opencode plugin add 'github:karczews/opencode-pr-sidebar#v0.2.0'
```
<!-- x-release-please-end -->

Either way, this is a TUI-only plugin — `plugin add` records it in
`~/.config/opencode/cli.json` automatically (not `opencode.json`). Verify with
`opencode plugin list`.

Restart OpenCode. The Plugins dialog shows `pr-sidebar` once it loads.

### From a local checkout

Add the directory to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-pr-sidebar"]
}
```

A local path is a config entry, not an `opencode plugin add` target. See
[`docs/plugin-distribution.md`](docs/plugin-distribution.md) for packaging
notes.

## Walkthrough

1. Open a repository checkout whose current branch has a pull request.
2. The card appears in the sidebar, expanded:

   ```
   +-------------------------------------------+
   | ▼ Pull Request                            |
   | #42 Fix login  (click #42 to open)        |
   | feature -> main                           |
   | Open                                      |
   | Review: Approved                          |
   | Ready to merge                            |
   | Checks: 3 passed / 1 failed / 2 pending   |
   | +120 / -30 / 8 files                      |
   | 4 unresolved / 12 total comments          |
   | Updated 2h ago                            |
   | Checked 1m ago                            |
   | [ Refresh ] [ Copy URL ] [ Open ]         |
   +-------------------------------------------+
   ```

3. Click the PR number or `Open` to launch the pull request in your browser. When no
   browser launcher is available, a toast shows the full URL so you can open it
   manually.
4. Use `Copy URL` to put the full URL on the clipboard.
5. Use `Refresh` to update immediately; otherwise the card keeps itself current.
6. Click the header to collapse or expand the card. `ctrl+p` exposes the same
   actions as `PR: Open on GitHub`, `PR: Copy URL`, and `PR: Refresh status`.

If the branch has no pull request, the card stays hidden. A failed first lookup
shows a short error, and a failed refresh keeps the last good data marked
`STALE`.
