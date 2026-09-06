# opencode-fold-diffs

**Every `write` and `edit` dumps the whole file or the whole diff into your transcript, and stays there.** This plugin folds those blocks down to their title line — `← Edit src/app.ts +12 −3 · click to expand` — and opens them again on click, or `ctrl+o` for all of them at once.

opencode already does this for the tools it considers noisy: bash output collapses to 10 lines, generic tool output to 3, both with click-to-expand. The three tools that actually fill the scrollback are the ones it leaves alone. Upstream has been asked three times — [#9089](https://github.com/anomalyco/opencode/issues/9089) (minimal diff display), [#14511](https://github.com/anomalyco/opencode/issues/14511) (a toggle keybind, like Claude Code's ctrl+o), [#19074](https://github.com/anomalyco/opencode/issues/19074) (collapse tool output) — and all three were closed without a setting. This is that setting, from outside.

## What you see

Before:

```
← Edit src/session/index.ts
│  1  import { createMemo } from "solid-js"
│  2 -  const [expanded, setExpanded] = createSignal(false)
│  3 +  const [expanded, setExpanded] = createSignal(props.open)
│  … 40 more lines
```

After:

```
← Edit src/session/index.ts +12 −3 · click to expand
```

Click the row to open it. `ctrl+o` folds or unfolds every block in the session, and sets what newly arriving blocks do — same as a verbose toggle.

## Install

```sh
opencode plugin opencode-fold-diffs -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/tannerbruhn/opencode-fold-diffs/main/index.js \
  -o ~/.config/opencode/tui-plugins/fold-diffs.js
```

Then add it to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/fold-diffs.js"]
}
```

Do not put the file in `~/.config/opencode/plugin/`. That directory is auto-discovered for *server* plugins and will load it the wrong way.

## Options

```json
"plugin": [["opencode-fold-diffs", { "lines": 3, "min_lines": 10, "key": "ctrl+f" }]]
```

| Option | Default | Meaning |
|---|---|---|
| `lines` | `0` | Lines of the body left showing when folded. `0` is the title only, and also tightens the block's padding so it occupies one row. Any positive number leaves a peek at the top. |
| `min_lines` | `6` | Blocks with fewer changed lines than this are left alone — a two-line edit is already its own summary. |
| `stats` | `true` | Append `+12 −3 · click to expand` to the title. |
| `folded` | `true` | Whether blocks start folded. `false` gives you only the toggle. |
| `key` | `"ctrl+o"` | Binding for fold/unfold-all. `ctrl+o` is unbound in opencode; Claude Code uses it for the same thing. Set to `""` for none. |

## What it does not touch

- **Permission dialogs.** The diff you approve renders in full, always. The plugin only ever walks inside the transcript scrollbox, and the permission preview is not in it.
- **Diagnostics and errors.** Only the children carrying a diff or a file body get folded, so an edit that introduced a type error still says so with the block closed.
- **Every other tool.** Bash, todos, questions and the generic fallback keep the host's own collapse behaviour. Matching is on the six BlockTool titles the file tools use (`← Edit`, `# Wrote`, `← Patched`, `# Created`, `# Deleted`, `# Moved`).

## How it works, for anyone extending it

The TUI plugin API has no slot for message parts — `sidebar_content`, `session_prompt_right`, `app`, `app_bottom` and the `home_*` slots are the whole list — so a plugin cannot render a tool part itself. It has to reach the renderables the host already made:

1. Find the transcript: the only scrollbox in the tree with `stickyScroll && stickyStart === "bottom"`. The sidebar, dialogs, autocomplete and diff viewer all have scrollboxes; none of them are sticky.
2. Find the blocks: a node whose first child's `plainText` starts with one of the six titles.
3. Fold: `maxHeight = 0` and `overflow = "hidden"` on the children carrying the bulk. Yoga accepts a zero max-height, so the body leaves layout instead of leaving a hole.
4. Toggle: assign `onMouseUp` on the block. The solid adapter sets that as a plain property, so a plugin can set it the same way — it replaces BlockTool's own handler, which is why the copy-on-select guard is reimplemented here.

Classes are matched by duck-typing (`typeof node.diff === "string"`, `content` + `filetype` for code) rather than `instanceof`, because the opentui classes are minified in the shipped binary and their names are not stable.

Blocks are re-scanned on `message.part.updated` and `message.updated`, plus a 2 s sweep that catches a session opened from history, whose parts land before any event this plugin sees.

## Status

Written against opencode 1.18.28. The tree-walking, block matching, fold/unfold
and toggle logic run green against a mock renderer tree (`node --test test/`),
and every renderable property it touches was checked against the shipped binary:
`maxHeight` and `overflow` are yoga setters, `onMouseUp` is a plain property the
solid adapter assigns the same way, `plainText` is a getter on text renderables.

What that does not cover is how it *looks*, which needs a real terminal. Worth a
pass on first run:

| Case | Expected |
|---|---|
| `edit` completes | Folds to the title with `+n −n` |
| `write` completes | Folds to the title with `n lines` |
| `apply_patch` over 3 files | Each file's block folds on its own |
| Click a folded block | Opens; click again to close |
| Select text across a block | Copy-on-select still works, no toggle |
| `ctrl+o` | Folds/unfolds all, and sets the default for new blocks |
| Edit with diagnostics | Diagnostics stay visible while folded |
| Permission dialog | Full diff, untouched |

If the title never grows its `+12 −3` suffix, solid is holding that text node and
the plugin has stopped trying to write it; everything else still works. Set
`"stats": false` to skip it.

## License

MIT
