# OpenCode File Browser

An explorer, editor and git panel for the OpenCode TUI. One plugin, no extra
terminal: browse the project, edit with syntax colours, review a diff and
commit without leaving the session.

[![npm](https://img.shields.io/npm/v/opencode-file-browser?style=flat-square)](https://www.npmjs.com/package/opencode-file-browser)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

![Editor with tabs, line numbers and the changes panel](https://arthurrogado.github.io/opencode-file-browser/screenshots/editor.png)

## Install

```sh
opencode plugin add opencode-file-browser@latest
```

Restart OpenCode (or run `/reload`). The plugin is registered in
`~/.config/opencode/cli.json`.

For local development point that entry at a checkout instead:

```jsonc
{ "plugins": ["/absolute/path/to/opencode-file-browser"] }
```

## What it does

- **Explorer** — expand folders in place or navigate into them (file-manager
  style), search by name or content, hidden files, branch and change count.
- **Editor** — tabs, line numbers, syntax colours while editing, `Enter` for a
  new line, `Ctrl+F` to find inside the file, `Ctrl+S` to save, scrollbar and
  mouse cursor placement.
- **Changes** — stage, unstage, discard, commit, pull, push, branches and
  history. `Enter` opens a unified diff; `F4` jumps to the real file.
- **Preferences** — `F2`: simple mode, line numbers, wrap, folder behaviour,
  panel preview, changes panel, hidden files, mouse, search target,
  case-sensitive search and confirmation prompts.
- **Safe with big files** — up to 2 000 lines are rendered; huge logs show a
  metadata placeholder instead of freezing the TUI.

## Screenshots

| Diff per change | Content search | Preferences |
|---|---|---|
| ![Unified diff](https://arthurrogado.github.io/opencode-file-browser/screenshots/diff.png) | ![Content search](https://arthurrogado.github.io/opencode-file-browser/screenshots/search.png) | ![Preferences](https://arthurrogado.github.io/opencode-file-browser/screenshots/settings.png) |

## Keys

| Key | Action |
|---|---|
| `Ctrl+X F` / `/files` | open or close the browser |
| `Ctrl+X O` | open a file by path (`~`, absolute or relative) |
| `↑ ↓` `j k` | move in the list |
| `→` / `Enter` | open a file or expand a folder |
| `←` | collapse a folder |
| `Shift+Enter` | collapse the tree |
| `Tab` / `Shift+Tab` | cycle panes / return to the explorer |
| `Ctrl+F` / `/` | focus search (while editing: find in file) |
| `Ctrl+E` | name ↔ content search |
| `Ctrl+S` / `Ctrl+W` | save / close tab |
| `Ctrl+←` `Ctrl+→` | previous / next tab |
| `e` / `F4` | preview ↔ editor |
| `m` | Markdown rendered ↔ source |
| `F1` / `F2` | all shortcuts / preferences |
| `F3` / `Ctrl+G` | focus the changes panel |
| `F5` | reload tree, file and git status |
| `F10` | item actions (same menu as right click) |
| `r` / `h` / `f` | reload / hidden files / fullscreen |
| `Esc` | leave editor → clear search → close |

While the changes panel is focused: `a` stage, `u` unstage, `d` discard,
`c` commit (`Ctrl+Enter` confirms), `l` pull, `p` push, `g` history,
`b` branches, `R` refresh.

Mouse: click to open, click tabs to switch, middle click to close, wheel to
scroll, drag the divider to resize, right click for actions.

## Limits

| | |
|---|---|
| Viewer | first 2 000 lines; metadata placeholder above 20 000 lines or 2 MiB |
| Editor | read-only above 5 000 lines or 512 KiB |
| Content search | 12 hits per file, 300 total |
| Binary files | reported with their size, never rendered |

## Development

```sh
npm install
npm run typecheck
npm run bundle        # src/**/*.tsx -> dist/**/*.js
./test/e2e.sh         # 32 assertions in a real TUI (tmux + git fixture)
./test/e2e-extra.sh   # 11 more: colours, help, hidden files, paths, menus
```

`dist/` is committed: OpenCode loads the pre-compiled entrypoint.

## Links

- [GitHub](https://github.com/arthurrogado/opencode-file-browser)
- [npm](https://www.npmjs.com/package/opencode-file-browser)
- [Project page](https://arthurrogado.github.io/opencode-file-browser/)
- [Issues](https://github.com/arthurrogado/opencode-file-browser/issues)

MIT.
