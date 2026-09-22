# opencode-ledger

A terminal code-review plugin for OpenCode. Browse Git changes, get AI explanations, add comments, and track which changes you have reviewed.

Ledger is an independent, experimental project and is not affiliated with the OpenCode team.

## Requirements

- OpenCode V2, version 2.0.12 or newer
- Git 2.43 or newer on `PATH`
- A local Git checkout with at least one commit, accessible to the terminal running OpenCode
- A configured OpenCode model provider for AI explanations and commit messages

## Install

Add Ledger to `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@shivambaku/opencode-ledger"]
}
```

If you already have plugins configured, append Ledger to the existing `plugins` array. Keep your other settings.

Restart OpenCode. It installs the plugin automatically. OpenCode's CLI configuration applies to all projects.

## Your first review

1. Start OpenCode in the repository you want to review.
2. Run `/ledger`, or select **Ledger** from the command palette.
3. Press **B** (`Shift+B`) to choose a comparison base if you want something other than `main`.
4. Select a file with `j` / `k`, then press `Enter` to inspect its changes.
5. Press `a` for AI explanations and `Tab` to show them. Use `J` / `K` to move between change blocks.
6. Press `Space` to mark a block reviewed, or `c` to leave a comment. Outside inspect mode, `Space` marks the selected file reviewed.

Press `?` for the full keyboard reference, `Esc` to go back, and `q` to close Ledger.

## Choose what to review

Ledger starts in **Branch + local** mode: changes on your branch since its common ancestor with the base, combined with staged, unstaged, and non-ignored untracked changes. Changes that cancel each other out are omitted.

The default base is local `main`, falling back to `origin/main`. Press **B** to open a searchable picker of local and remote-tracking branches. The selected base appears in the header and stays selected through refreshes and view changes until you close Ledger. Reopening Ledger starts with the default base again.

Press **b** to switch to **Uncommitted Only**, which shows staged, unstaged, and untracked changes. Choosing a base with **B** returns to the branch comparison. Press **r** to refresh; branch comparisons also refresh automatically.

Each branch/base comparison and the uncommitted view have separate approvals, comments, and explanations. Switching bases stops pending analysis. Selecting a base changes the comparison without checking out a branch or fetching remote updates.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `B` | Choose the comparison base branch |
| `b` | Toggle branch + local / uncommitted only |
| `r` | Refresh changes |
| `j` / `k` | Move the selection or diff cursor |
| `]` / `[` | Next / previous file |
| `J` / `K` or `n` / `N` | Next / previous change block |
| `Enter` | Inspect a file or switch explanation focus |
| `Space` | Toggle approval for the selected file or active block |
| `a` / `A` | Analyze the selected file / all pending files |
| `Tab` | Show or hide explanations |
| `c` | Add or edit a block comment |
| `y` / `Y` | Copy the active diff block / unresolved comments |
| `m` | Generate and copy a commit message for the current comparison |
| `e` | Open the working-copy file in your editor |
| `x` | Stop analysis |
| `?` | Show help |
| `Esc` / `q` | Go back / close Ledger |

## Storage and AI

Review state is saved locally in `.opencode/ledger/state.json`. Ledger adds `/ledger/` to `.opencode/.gitignore` to keep that state out of commits.

AI analysis sends the selected diff and relevant prior OpenCode edit context to your configured model provider. Temporary analysis sessions are removed when analysis finishes or is stopped. Approvals and comments are local review notes; they do not stage or commit changes.

## Troubleshooting

- **Ledger does not appear:** check the `plugins` entry in your global `cli.json`, restart OpenCode, and inspect `/plugins` for errors.
- **The base is missing or has no common ancestor:** press **B** and choose another branch. Fetch remote branches or more history if needed, then reopen the picker.
- **The comparison is empty:** press `r` to refresh, `B` to check the base, or `b` to inspect uncommitted changes separately.
- **Analysis fails:** check your OpenCode provider/model configuration. For diagnostics, start OpenCode with `LEDGER_DEBUG=1`; request and response payloads are saved under `.opencode/ledger/debug`.

## Local development

Clone this repository and run `npm install`. Point OpenCode at the checkout's `src` directory:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["file:///absolute/path/to/opencode-ledger/src"]
}
```

Replace the path with your checkout location and restart OpenCode. Use the local entry instead of the npm entry while developing.

Run `npm run check` for TypeScript validation and `npm test` for tests (Node.js 22 or newer). Git tests use temporary repositories.
