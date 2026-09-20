# opencode-ledger

Experimental code review agent and TUI review ledger plugin for OpenCode.

> Note: opencode-ledger is an independent project and is not built by, affiliated with, or endorsed by the OpenCode team.

## Requirements

- OpenCode 1.18.23 or newer
- Git 2.43 or newer on `PATH` for branch comparisons
- A git repository to review

## Install

Add Ledger to your OpenCode TUI config:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@shivambaku/opencode-ledger"]
}
```

Use one of these config locations:

- `~/.config/opencode/tui.json` for all projects
- `.opencode/tui.json` inside one project

Restart OpenCode after changing config. OpenCode installs npm plugins automatically on startup.

Open Ledger from the command palette or with `/ledger`. Press `?` inside Ledger for help.

## How it works

Ledger lists changed files, lets you inspect each diff hunk, asks your OpenCode model for explanations, and tracks which blocks you have approved locally.

Ledger opens in **Branch vs main** mode by default. It shows the net committed changes from the common ancestor of main and your branch to `HEAD`, equivalent to:

```sh
git diff main...HEAD
```

Uncommitted edits, staged changes, and untracked files are excluded from this view. File contents are read from the same commit as the diff, so local edits cannot change the displayed context. Changes made only on main are not included.

Press `b` to switch between **Branch vs main** and **Uncommitted**. The header shows the active branch and comparison base, or `Uncommitted`. Every newly opened Ledger starts in branch mode.

- Local `main` is preferred; `origin/main` is used only if local main is absent. Ledger does not fetch or update either ref. Fetch/update your base yourself when needed.
- If neither ref exists, Ledger shows an error instead of falling back to uncommitted changes. An empty branch comparison stays empty, including when reviewing main itself.
- Branch refs are checked every two seconds while branch mode is open. Press `r` to explicitly refresh either view.
- Approvals, comments, and explanations are separate for each branch/base and for the uncommitted view. Unchanged hunks retain their reviews as the branch advances. Existing uncommitted reviews remain available.
- `m` generates a message for the selected changeset: a squash-commit message in branch mode, or a commit message for local changes in uncommitted mode.
- `e` opens the working-copy file, not a historical checkout. Local edits may mean its line numbers differ from the reviewed commit.
- The session-prompt `ledger local` count continues to refer to uncommitted files needing approval.

## Important keys

- `b`: toggle branch vs main / uncommitted changes
- `r`: refresh the selected Git comparison
- `j` / `k`: move selection or diff cursor
- `J` / `K`: next or previous block
- `n` / `N`: next or previous block
- `]` / `[`: next or previous file
- `enter`: open file diff or switch explanation focus
- `space`: approve selected file or active block
- `a`: analyze selected file
- `A`: analyze all pending files
- `tab`: show or hide explanation
- `c`: add or edit block comment
- `m`: generate commit message
- `esc`: back
- `q`: close Ledger

## Privacy and storage

- Ledger stores local review state in `.opencode/ledger/state.json` inside the reviewed repository.
- Ledger writes `.opencode/.gitignore` with `/ledger/` so its state is not committed by default.
- AI analysis sends the selected Git diff and relevant prior OpenCode edit context to your configured OpenCode model provider.
- Analysis sessions are temporary and are deleted after analysis finishes or is stopped.
- Set `LEDGER_DEBUG=1` to keep analysis request and response payloads under `.opencode/ledger/debug` for troubleshooting.

## Troubleshooting

- If Ledger does not appear, restart OpenCode and check that `@shivambaku/opencode-ledger` is listed in your `tui.json` `plugin` array.
- If you already have plugins configured, add `@shivambaku/opencode-ledger` to the existing `plugin` array instead of replacing it.
- If branch mode has no files, check that the branch has committed changes since it diverged from main. Press `b` to review local changes instead.
- If the comparison base is missing, create local `main` or fetch `origin/main`, then press `r`. Shallow clones may need more history to find the common ancestor.
- Branch comparisons run Git locally and require the reviewed checkout to be accessible to the TUI process.

## Local development

Use a local source path in your OpenCode TUI config:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///absolute/path/to/opencode-ledger/src/tui.tsx"]
}
```

Replace `/absolute/path/to/opencode-ledger` with the absolute path to your checkout. Restart OpenCode after changing the config.

Run `npm run check` for TypeScript validation and `npm test` for Git-fixture regression tests (Node.js 22 or newer). Tests use temporary repositories and do not modify the project checkout.
