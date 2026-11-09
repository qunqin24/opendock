# opencode-fold-diffs

> Unofficial OpenCode V2 fork of [opencode-fold-diffs](https://github.com/tannerbruhn/opencode-fold-diffs) by Tanner Bruhn. Install this version on OpenCode V2; use the upstream package on V1.

OpenCode already collapses read/search groups and trims bash output, but it leaves `write`, `edit` and `apply_patch` blocks fully expanded — the blocks that fill the transcript and makes it hard to navigate.

This plugin folds them to one header line and opens them again on click.

## What you see

The plugin can fold four kinds of content — three file-changing tool blocks plus the optional bash command:

| OpenCode tool | Header in the transcript | What the block contains |
|---|---|---|
| `write` | `# Wrote 35 lines · click to expand` | The complete contents of a written file. |
| `edit` | `← Edit +12 −3 · click to expand` | A unified diff for an existing file. |
| `apply_patch` | `← Patched +8 −2 · click to expand` (plus `# Created`, `# Deleted` and `# Moved` for add/delete/move patches) | One or more patches, often across several files. |
| `bash` (optional) | The `$ command` line | Only the command folds, and only with `bash: true`; the output is left to OpenCode. |

The line/diff count and “click to expand” suffix are added by this plugin, so they disappear when `stats: false`. For Bash there is no stats suffix: only the command can fold, and the Bash output is never touched.

Click the header to open the block. Set the optional `key` option to add a shortcut that folds or unfolds every block at once.

A `write` block, an `edit` block and an optional `bash` command, all folded:

![Folded write, edit and bash blocks](docs/folded-write-edit-bash.png)

Clicking the edit opens the whole diff while the write block above stays folded:

![Expanded edit block showing the diff](docs/expanded-edit-diff.png)

## Install

```sh
opencode plugin add @cardinal4/opencode-fold-diffs
```

Or add it manually to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["@cardinal4/opencode-fold-diffs"]
}
```

Use one or the other, then restart OpenCode.

## Options

Put options on the same plugin entry that lists the package:

```json
{
  "plugins": [
    {
      "package": "@cardinal4/opencode-fold-diffs",
      "options": {
        "lines": 3,
        "min_lines": 10,
        "key": "ctrl+f"
      }
    }
  ]
}
```

| Option | Default | Meaning |
|---|---|---|
| `lines` | `0` | Lines of the body left visible when folded. `0` is the header only; a positive number leaves a peek. |
| `min_lines` | `6` | Leave blocks with fewer changed lines expanded. Set `0` to fold every file block. |
| `stats` | `true` | Append the line or diff count and “click to expand” to the header. |
| `folded` | `true` | Whether new blocks start folded. `false` gives you only the toggle. |
| `key` | `""` | Optional shortcut for fold/unfold-all. Empty by default so no OpenCode shortcut is overridden. |
| `bash` | `false` | Also fold long bash commands. Off by default because OpenCode already trims them. |
| `bash_lines` | `1` | Rows of the command left visible when bash folding is on. Does not affect the output. |

## What stays untouched

- **Small changes.** Blocks below `min_lines` stay expanded on purpose; a two-line edit is already its own summary.
- **Permission dialogs and diagnostics.** The diff you approve renders in full, and errors from an edit stay visible while the block is folded.
- **Other tools.** `read`, `glob`, `grep`, todos, questions and the generic fallback keep OpenCode's behaviour.
- **Bash output.** Only the command can fold when `bash` is enabled; the output and its “earlier lines” summary are untouched.

## Troubleshooting

After restarting, `/plugins` should list `opencode-fold-diffs`, and `Ctrl+P` should show **Fold / unfold file diffs**.

If blocks do not fold, run **Fold diffs: diagnose** from the command palette. The toast reports whether the transcript and blocks were found; include that output in a bug report. Its optional dump can contain prompts or tool output — redact it before sharing, or set `dump: false` to skip it.

## Development

```sh
node --test
```

To try a checkout, point a local `opencode.json` plugin entry at this directory and restart OpenCode.

## License

MIT
