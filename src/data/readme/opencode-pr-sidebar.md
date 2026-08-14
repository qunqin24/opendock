# opencode-pr-sidebar

OpenCode TUI plugin that adds a compact **PRs** section to the right sidebar.

It tracks GitHub pull request URLs mentioned in the current OpenCode session, refreshes their latest status with the GitHub CLI, and renders the newest PRs in the sidebar.

## Features

- Tracks PR URLs mentioned in user messages, assistant messages, subtask prompts, and completed tool output.
- Can filter PRs by GitHub owner.
- Shows a compact summary like `PRs (10 total, 2 approved, 3 merged)`.
- Shows newest PRs first, based on when the URL last appeared in the session.
- Shows at most 5 PRs and an overflow row like `... 5 more PRs`.
- Uses strikethrough for merged PRs.
- Opens the PR in the browser when clicking the title.

## Requirements

- OpenCode `>=1.15.10`.
- GitHub CLI (`gh`) installed and authenticated.
- macOS for clickable PR titles (`open <url>` is used). Other platforms can still render the sidebar, but click-to-open is currently best-effort.

## Install

Add this to `~/.config/opencode/tui.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-pr-sidebar"]
}
```

Then restart OpenCode.

## Configuration

Plugin options can be passed with tuple syntax:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["opencode-pr-sidebar", {
      "includeOwners": ["example-org"],
      "excludeOwners": [],
      "onlyCurrentUser": true
    }]
  ]
}
```

Options:

- `includeOwners`: optional list of GitHub owners to show. Empty or omitted means any owner.
- `excludeOwners`: optional list of GitHub owners to hide.
- `onlyCurrentUser`: defaults to `true`; when enabled, only PRs authored by the authenticated `gh` user are shown.

## Development

```bash
npm install
bun run verify
```

For local development, point `~/.config/opencode/tui.jsonc` at the local package directory:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///Users/you/path/to/opencode-pr-sidebar"]
}
```
