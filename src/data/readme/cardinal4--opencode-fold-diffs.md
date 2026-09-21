# opencode-fold-diffs

**Every `write` and `edit` dumps the whole file or the whole diff into your transcript, and stays there.** This plugin folds those blocks down to their header line — `# Wrote 40 lines · click to expand  src/app.ts` — and opens them again on click, or with a fold/unfold-all key if you configure one.

This branch targets **OpenCode V2** (the `@opencode/cli` 2.x line, `opencode v2.0.x`). The V1 plugin implementation does not run in V2; see [Migrating from V1](#migrating-from-v1).

## What V2 already folds

V2 tightened the transcript on its own, and this plugin deliberately leaves those parts alone:

- `read` / `glob` / `grep` calls fold into a one-line exploration group (`Explored — 3 reads, 2 searches`), click to expand.
- A bash **command** is trimmed to two lines and its **output** to ten, both click to expand.

The tools V2 still renders in full are exactly the ones that fill the scrollback: `write`, `edit`, `apply_patch`. Upstream has been asked three times — [#9089](https://github.com/anomalyco/opencode/issues/9089) (minimal diff display), [#14511](https://github.com/anomalyco/opencode/issues/14511) (a toggle keybind, like Claude Code's `ctrl+o`), [#19074](https://github.com/anomalyco/opencode/issues/19074) (collapse tool output) — and all three were closed without a setting. This is that setting, from outside.

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
← Edit +12 −3 · click to expand  src/session/index.ts
```

Click the row to open it. If you set the `key` option, that binding folds or unfolds every block in the session and sets what newly arriving blocks do — same as a verbose toggle. By default there is no binding, so OpenCode's own shortcuts (including `ctrl+o`) are left alone.

## Install

```sh
opencode plugin add @cardinal4/opencode-fold-diffs
```

Then list it in your CLI config so the terminal loads the TUI entrypoint. Add it to `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["@cardinal4/opencode-fold-diffs"]
}
```

This package is TUI-only (it has no server entrypoint), so configure it in `cli.json`. CLI-only plugins also stay active when the terminal connects to a remote server.

With options:

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

Restart OpenCode afterwards; plugins load at startup.

### From a local checkout

Clone this repository and point the plugin entry at the checkout. The package ships a server entry (`index.js`) and a TUI entry (`tui.js`); OpenCode discovers a plugin directory by its server entry and loads the `tui` entry beside it, so the plugin shows up by id instead of as an anonymous entry.

```json
{
  "plugins": ["/home/me/projects_l/opencode-fold-diffs"]
}
```

## Options

```json
"plugins": [["@cardinal4/opencode-fold-diffs", { "lines": 3, "min_lines": 10, "key": "ctrl+f" }]]
```

| Option | Default | Meaning |
|---|---|---|
| `lines` | `0` | Lines of the body left showing when folded. `0` is the header only, and also tightens the block's padding so it occupies one row. Any positive number leaves a peek at the top. |
| `min_lines` | `6` | Blocks with fewer changed lines than this are left alone — a two-line edit is already its own summary. |
| `stats` | `true` | Append `+12 −3 · click to expand` to the header. |
| `folded` | `true` | Whether blocks start folded. `false` gives you only the toggle. |
| `key` | `""` | Optional binding for fold/unfold-all. Empty by default so no OpenCode shortcut is overridden; set e.g. `"ctrl+shift+d"` to opt in. |
| `bash` | `false` | Fold long bash commands too. Off by default on V2 because the host already trims them to two lines. |
| `bash_lines` | `1` | Rows of the command left showing when folded. `1` keeps the line that says what the thing was. |
| `dump` | `""` | Where **Fold diffs: diagnose** writes its tree dump. `""` means `/tmp/opencode-fold-diffs-tree.txt`; `false` disables the dump. |

> `ctrl+o` belongs to OpenCode's **Open recent sessions and projects** (`open.menu`), so this plugin does not bind it. Choose an unused key for the `key` option.

## What it does not touch

- **Permission dialogs.** The diff you approve renders in full, always. The plugin only ever walks inside the transcript scrollbox, and the permission preview is not in it.
- **Diagnostics and errors.** Only the children carrying a diff or a file body get folded, so an edit that introduced a type error still says so with the block closed.
- **Bash output, and the click that expands it.** Only the *command* is ever folded, and only when `bash` is enabled; the output keeps the host's ten-line collapse. The block's own click handler belongs to the host, so the plugin attaches to the command text instead and calls `stopPropagation()`: clicking the command folds the command, clicking anywhere else in the block does exactly what it did before.
- **Todos, questions, and the generic fallback.** They keep the host's own collapse behaviour.

## How it works, for anyone extending it

The V2 TUI plugin API (`@opencode/plugin/tui`) has no slot for message parts, so a plugin cannot render a tool block itself. It has to reach the renderables the host already made:

1. **Find the transcript.** The only scrollbox in the tree with `stickyScroll && stickyStart === "bottom"`. The sidebar, dialogs, autocomplete and diff viewer all have scrollboxes; none of them are sticky.
2. **Find the blocks.** A V2 `BlockTool` renders its header first as a row box whose first two children are the label text (`# Wrote`, `← Edit`, `← Patched`, `# Created`, `# Deleted`) and the path value. File blocks are matched on that label; a bash block carries no header, so it is found by shape — a child whose first grandchild is the `$ `-prefixed command.
3. **Fold.** Set `visible = false` on the children carrying the bulk. That sets Yoga `display: none`, so the body leaves layout instead of leaving a hole. A zero `max-height` alone is not enough — the box collapses to zero rows but OpenTUI still paints the diff. A positive `lines` value keeps the first body visible and uses `maxHeight` for it instead. The block's own chrome (`gap`, `paddingTop`, `paddingBottom` of 1) is tightened to zero so a folded block occupies one row.
4. **Toggle.** Assign `onMouseUp` on the block. The solid adapter sets that as a plain property, so a plugin can set it the same way — it replaces `BlockTool`'s own handler, which is why the copy-on-select guard is reimplemented here. For a bash block the host's handler is the output toggle and must be preserved, so the handler goes on the command text with `stopPropagation()` instead.
5. **Restate the header.** The stats suffix is appended to the label text node, not the path. If solid will not let go of that node the plugin stops trying and folds without the suffix.

Renderable classes are matched by duck-typing (`typeof node.diff === "string"`, `content` + `filetype` for code) rather than `instanceof`, because the opentui classes are minified in the shipped binary and their names are not stable.

Blocks are re-scanned on `message.part.updated` and `message.updated`, plus a 2 s sweep that catches a session opened from history, whose parts land before any event this plugin sees.

## Migrating from V1

V1 plugin implementations do not run in V2. This branch made these changes:

- Entrypoint is a `{ id, setup(context) }` definition (`Plugin.define()` is an identity helper, so the shape is the same). `setup` returns the cleanup function instead of `api.lifecycle.onDispose`.
- `api.renderer` → `context.renderer`; `api.route.current.name` → `context.ui.router.current().type`; `api.event.on` → `context.data.on`; `api.ui.toast` → `context.ui.toast.show`; `api.keymap.registerLayer` → `context.keymap.layer`.
- Tool headers are no longer one string. V1 rendered `"← Edit src/app.ts"`; V2 renders a label node plus a path node, so detection and the stats suffix target the label.
- `bash` defaults to `false`, because V2 now trims long commands to two lines itself.
- Config moves from `tui.json` to `cli.json` (or `opencode.json(c)`).

## Testing

1. Restart so the plugin loads: `opencode service restart`, then relaunch the TUI.
2. Confirm it loaded: `/plugins` should list `opencode-fold-diffs` by id, and `Ctrl+P` → **Fold / unfold file diffs** should be in the palette.
3. Ask the agent for a small edit. The block should render as a single header row, `← Edit +2 −1 · click to expand  path`. Click it to open, click again to close.
4. If you configured a `key`, press it to fold or unfold every block in the session. Otherwise use the palette command **Fold / unfold file diffs**.
5. If nothing folds, run `Ctrl+P` → **Fold diffs: diagnose**. The toast reports what the plugin can see:

| Result | Meaning |
|---|---|
| `transcript: not found` | No session view is open, so there is nothing to fold. |
| `transcript: yes · blocks: 0` | The transcript was found but no file blocks matched — the host render tree differs from what this plugin expects. |
| `transcript: yes · blocks: N · folded: N` | Detection and folding ran; if the blocks still look expanded, the fold did not take on the renderables. |
| `stats: off` | Folding works but the header could not be restated (Solid owns the label node). |

## Status

Written against **opencode v2.0.10 / v2.0.11**. The tree-walking, block matching, fold/unfold and toggle logic run green against a mock renderer tree shaped like V2's (`node --test`), and the fold was checked against a real transcript: `visible = false` (Yoga `display: none`) is what actually hides a body, not `maxHeight`.

Edits with fewer than `min_lines` changed lines (default 6) are left expanded on purpose — a one-line change is already its own summary. Set `min_lines: 0` to fold every file block.

## License

MIT
