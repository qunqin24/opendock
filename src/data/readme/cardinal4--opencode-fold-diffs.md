# opencode-fold-diffs

> [!NOTE]
> **Unofficial OpenCode V2 port of [Tanner Bruhn](https://github.com/tannerbruhn)'s [`opencode-fold-diffs`](https://github.com/tannerbruhn/opencode-fold-diffs) (npm: `opencode-fold-diffs`) — the OpenCode V1 plugin.** This fork — [`cardin/opencode-fold-diffs`](https://github.com/cardin/opencode-fold-diffs), published as [`@cardinal4/opencode-fold-diffs`](https://www.npmjs.com/package/@cardinal4/opencode-fold-diffs) — ports it to **OpenCode V2** (`@opencode/cli` 2.x, `opencode v2.0.x`). Install this fork on V2, upstream on V1. Tanner has not reviewed or endorsed it; report bugs here, not upstream.

**Every `write`, `edit` and `apply_patch` dumps the whole file or the whole diff into your transcript, and stays there.** This plugin folds those blocks down to their header line — `# Wrote 40 lines · click to expand  src/app.ts` — and opens them again on click, or with a fold/unfold-all key if you configure one.

V2 already collapses the tools it considers noisy: `read` / `glob` / `grep` fold into a one-line exploration group (`Explored: 3 reads, 2 searches`), and a bash **command** trims to two lines with its **output** to ten, all click-to-expand. The three tools that actually fill the scrollback — `write`, `edit`, `apply_patch` — are the ones it leaves alone. Upstream has been asked three times — [#9089](https://github.com/anomalyco/opencode/issues/9089) (minimal diff display), [#14511](https://github.com/anomalyco/opencode/issues/14511) (a toggle keybind, like Claude Code's `ctrl+o`), [#19074](https://github.com/anomalyco/opencode/issues/19074) (collapse tool output) — and all three were closed without a setting. This is that setting, from outside.

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

This plugin's behavior is TUI-only (its server entry is a no-op that exists so OpenCode can discover it by id), so configure it in `cli.json`. TUI plugins also stay active when the terminal connects to a remote server.

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
"plugins": [{ "package": "@cardinal4/opencode-fold-diffs", "options": { "lines": 3, "min_lines": 10, "key": "ctrl+f" } }]
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

1. **Find the transcript.** The scrollbox with `stickyScroll && stickyStart === "bottom"`. The sidebar, dialogs, autocomplete and diff viewer all have scrollboxes; none of them are sticky. The one other sticky scrollbox in V2 is the shell output viewer, which is a dialog and is skipped by its `shell-output-scroll` id.
2. **Find the blocks.** A V2 `BlockTool` renders its header first as a row box whose first two children are the label text (`# Wrote`, `← Edit`, `← Patched`, `# Created`, `# Deleted`) and the path value. File blocks are matched on that label; a bash block carries no header, so it is found by shape — a child whose first grandchild is the `$ `-prefixed command.
3. **Fold.** Set `visible = false` on the children carrying the bulk. That sets Yoga `display: none`, so the body leaves layout instead of leaving a hole. A zero `max-height` alone is not enough — the box collapses to zero rows but OpenTUI still paints the diff. A positive `lines` value keeps the first body visible and uses `maxHeight` for it instead. The block's own chrome (`gap`, `paddingTop`, `paddingBottom` of 1) is tightened to zero so a folded block occupies one row.
4. **Toggle.** Assign `onMouseUp` on the block. The solid adapter sets that as a plain property, so a plugin can set it the same way — it replaces `BlockTool`'s own handler, which is why the copy-on-select guard is reimplemented here. For a bash block the host's handler is the output toggle and must be preserved, so the handler goes on the command text with `stopPropagation()` instead.
5. **Restate the header.** The stats suffix is appended to the label text node, not the path. If solid will not let go of that node the plugin stops trying and folds without the suffix.

Renderable classes are matched by duck-typing (`typeof node.diff === "string"` for a diff, `typeof node.content === "string"` for a written file) rather than `instanceof`, because the opentui classes are minified in the shipped binary and their names are not stable. `filetype` is deliberately not required: it was dropped in 2.0.16 and restored in 2.0.27, and keying off it silently stopped write blocks from folding.

Blocks are re-scanned on V2's `session.message.content.updated`, `session.tool.success` and `session.tool.failed`, plus `session.step.ended` and `session.execution.succeeded` (`session.shell.ended` joins them when `bash` folding is on). A 2 s sweep catches a session opened from history, whose parts land before any event this plugin sees.

## Status

Written against **opencode v2.0.24** and re-checked against **v2.0.27**; the `session.*` events it listens to exist from v2.0.10 on, so an older V2 install gets the fix without upgrading. The tree-walking, block matching, fold/unfold and toggle logic run green against a mock renderer tree shaped like V2's (`node --test`), and the fold was checked against a real transcript: `visible = false` (Yoga `display: none`) is what actually hides a body, not `maxHeight`.

To confirm it loaded, restart (`opencode service restart`) and check `/plugins` lists `opencode-fold-diffs` and `Ctrl+P` → **Fold / unfold file diffs** is in the palette. If nothing folds, run **Fold diffs: diagnose** — the toast reports what the plugin can see:

| Result | Meaning |
|---|---|
| `transcript: not found` | No session view is open, so there is nothing to fold. |
| `transcript: yes · blocks: 0` | The transcript was found but no file blocks matched — the host render tree differs from what this plugin expects. |
| `transcript: yes · blocks: N · folded: N` | Detection and folding ran; if the blocks still look expanded, the fold did not take on the renderables. |
| `stats: off` | Folding works but the header could not be restated (Solid owns the label node). |

Edits with fewer than `min_lines` changed lines (default 6) are left expanded on purpose — a one-line change is already its own summary. Set `min_lines: 0` to fold every file block.

## V2 port notes

The port follows V2's new plugin API and render tree, so the V1 code could not be reused:

- Entrypoint is a `{ id, setup(context) }` definition; `setup` returns the cleanup function instead of `api.lifecycle.onDispose`.
- `api.renderer` → `context.renderer`, `api.route.current.name` → `context.ui.router.current().type`, `api.event.on` → `context.data.on`, `api.ui.toast` → `context.ui.toast.show`, `api.keymap.registerLayer` → `context.keymap.layer` (called straight from `setup` on 2.0.23+, from an `app`-slot component before that).
- Event names are V2's `session.*` events; `message.updated` / `message.part.updated` are legacy schemas that never fire.
- Tool headers are a label node plus a path node, so detection and the stats suffix target the label.
- `bash` defaults to `false` because V2 trims long commands itself, and config moves from `tui.json` to `cli.json`.

## License

MIT
