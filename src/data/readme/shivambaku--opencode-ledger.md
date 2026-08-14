# opencode-ledger

Experimental code review agent and TUI review ledger plugin for OpenCode.

> Note: opencode-ledger is an independent project and is not built by, affiliated with, or endorsed by the OpenCode team.

## Requirements

- OpenCode
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

## Important keys

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
- AI analysis sends the current Git diff and relevant prior OpenCode edit context to your configured OpenCode model provider.
- Analysis sessions are temporary and are deleted after analysis finishes or is stopped.
- Set `LEDGER_DEBUG=1` to keep analysis request and response payloads under `.opencode/ledger/debug` for troubleshooting.

## Troubleshooting

- If Ledger does not appear, restart OpenCode and check that `@shivambaku/opencode-ledger` is listed in your `tui.json` `plugin` array.
- If you already have plugins configured, add `@shivambaku/opencode-ledger` to the existing `plugin` array instead of replacing it.
- If analysis has no files to show, make sure OpenCode is running inside a git repository with local changes.

## Local development

Use a local source path in your OpenCode TUI config:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///Users/you/opencode-plugins/opencode-ledger/src/tui.tsx"]
}
```

Replace `/Users/you` with your actual path. Restart OpenCode after changing the config.
