# OpenCode Ledger

Run **`/ledger`** to review Git changes, get AI explanations, leave comments, and
mark changes reviewed. Press **?** for shortcuts and **q** to close.

## Install

Requires OpenCode 2.0.12 or newer, Git 2.43 or newer, and a local Git repository
with at least one commit. AI features use your configured OpenCode model provider.

```sh
git clone https://github.com/shivambaku/opencode-ledger.git
```

Add the source directory to `~/.config/opencode/cli.json`, replacing the path with
your checkout location:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-ledger/src"]
}
```

Restart OpenCode. Source loads directly with no build step. Update with `git pull`
and restart OpenCode.

## Use

Start OpenCode in the repository you want to review, then run `/ledger`.

- **B** chooses a comparison base (defaults to `main` or `origin/main`).
- **b** toggles branch + local changes / uncommitted only; **r** refreshes.
- **j / k** selects a file; **Enter** inspects it.
- **a** requests AI explanations; **Tab** shows them.
- **Space** marks a file or change block reviewed; **c** adds a block comment.

Review notes are saved in `.opencode/ledger/state.json` and excluded from Git.
AI explanations send the diff and relevant edit context to your model provider.

## Development

```sh
npm ci
npm run check
npm test
```
