# @andre-barbosa/opencode-commit

OpenCode plugin that generates **Conventional Commits** messages or split commit plans from uncommitted git changes using a model you choose.

Run `/commit` in the OpenCode TUI to get a suggested message like `feat(auth): add oauth login flow` — copy it and commit manually.

## Features

- `/commit` slash command (suggest only, no auto-commit)
- Copy the generated message or plan to the system clipboard from the result dialog
- Request a fresh suggestion with the same input
- Split commit planning with `/commit split` and `/commit split <folder...>`
- Dedicated model for commit message generation
- Conventional Commits format enforced (`feat(scope): ...`, `fix(scope): ...`, etc.)
- Optional hint: `/commit emphasize breaking API change`
- Uses staged diffs, unstaged diffs, non-ignored untracked filenames, branch name, and recent commit subjects for context

## Requirements

- [OpenCode](https://opencode.ai/) with plugin support
- A git repository with uncommitted changes

## Installation

### Configure the plugin

**Local development** (this repo):

Build the plugin first:

```bash
npm run build
```

Create or edit `.opencode/tui.json` (or a top-level `tui.json`) in the project where you want to use `/commit`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "file:///C:/absolute/path/to/opencode-commit",
      {
        "model": "opencode-go/deepseek-v4-flash",
        "maxDiffChars": 12000
      }
    ]
  ]
}
```

**From npm:**

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["@andre-barbosa/opencode-commit", { "model": "opencode-go/deepseek-v4-flash" }]
  ]
}
```

See [tui.example.json](tui.example.json) for a full example.

Run `opencode models` to list available models.
Restart OpenCode after editing config.
When testing local changes, run `npm run build` again before restarting OpenCode.

`/commit` is a TUI slash command. Invoke it from the command palette (`Ctrl+Shift+P`) or by typing `/` in the prompt and selecting **commit**. You can then enter an optional hint or `split [folder...]`.

## Usage

1. Make changes in a git repository. Staging is optional.
2. Open OpenCode in the project.
3. Run the **commit** slash command (`/commit`).
4. Choose an action from the result dialog:
   - **Copy message to clipboard**
   - **Request new message** to generate another suggestion
   - **Close**
5. Paste the copied message into `git commit -m "feat(scope): ..."`.

Optional extra instruction:

Run `/commit`, then enter:

```text
focus on test coverage improvements
```

Split commit planning:

Run `/commit`, then enter:

```text
split
```

This suggests one commit message per changed top-level folder. Files in the repo root are grouped under `root`.

```text
split apps/web packages/api
```

This suggests one commit message for each requested folder with changes under that path.

Split mode only suggests a plan. It does not stage files and does not create commits. You can copy the plan to the clipboard or request a new plan from the result dialog.

## Plugin options

When loading the plugin as a tuple `[name, options]`:

| Option | Default | Description |
| --- | --- | --- |
| `model` | required | Model to use in `provider/model-id` format |
| `maxDiffChars` | `12000` | Max tracked diff characters sent across staged and unstaged diffs |

## Change scope

`/commit` analyzes:

- Staged tracked changes from `git diff --staged`
- Unstaged tracked changes from `git diff`
- Changed-file metadata from `git diff --name-status`
- Non-ignored untracked filenames from `git ls-files --others --exclude-standard`

It does not read untracked file contents and does not ask Git for ignored files.

## Commit message format

Generated messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): short imperative description

- optional bullet body
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.

## Project layout

```
opencode-commit/
├── src/                  # plugin source
│   ├── tui.ts            # TUI slash command and result actions
│   ├── clipboard.ts      # system clipboard helper
│   └── index.ts          # server no-op entrypoint
├── tui.example.json      # example TUI plugin config
└── README.md
```

## License

MIT
