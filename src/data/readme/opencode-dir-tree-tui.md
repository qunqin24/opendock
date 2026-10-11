# 🌳 opencode-dir-tree-tui

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-dir-tree-tui"><img src="https://img.shields.io/npm/v/opencode-dir-tree-tui" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/opencode-dir-tree-tui"><img src="https://img.shields.io/npm/dm/opencode-dir-tree-tui" alt="npm downloads per month"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

Browse project files, track Git changes, copy paths, and open files and folders from the [OpenCode](https://opencode.ai) terminal sidebar.

![File tree demo](assets/demo.gif)

## 📦 Install / update / remove

Requires **OpenCode ≥ 2.0**. Terminal UI (TUI) only.

```bash
opencode plugin add opencode-dir-tree-tui
```

- Update: `opencode plugin update opencode-dir-tree-tui`
- Remove: `opencode plugin remove opencode-dir-tree-tui`

If an update is not reflected, restart the TUI client, not just the server.

On V1, pin `opencode-dir-tree-tui@0.5.1` and see the [V1 guide](https://github.com/aihaipeng/opencode-dir-tree-tui/blob/v0.5.1/README.md).

## ⚙️ Settings

Run `/dirtree-sidebar` to open **Dir Tree Sidebar**. Use `Tab` / `Shift+Tab` or click to switch between **Settings** and **Ignore Rules**; `Esc` closes the panel.

| Setting | Description | Available values |
| --- | --- | --- |
| Show file tree | Show/hide the tree and its title | `on` / `off` |
| Open file | Open files with the system default app | `left-click` / `middle-click` / `right-click` / `off` |
| Copy file path | Copy absolute file paths | `left-click` / `middle-click` / `right-click` / `off` |
| Open folder | Open folders with the system default app | `left-click` / `middle-click` / `right-click` / `off` |
| Copy folder path | Copy absolute folder paths | `left-click` / `middle-click` / `right-click` / `off` |
| Expand/collapse folder | Expand/collapse folders | `left-click` / `middle-click` / `right-click` |

Preferences save automatically and survive restarts. Mouse bindings are global; visibility and ignore rules are per-project, including its subdirectory sessions. Panel collapse is temporary and per-terminal.

## 💡 Notes

### Default mouse actions

| Click target | Left-click | Middle-click | Right-click |
| --- | --- | --- | --- |
| Folder | Expand / collapse | Copy its absolute path | Open with the system default app |
| File | — | Copy its absolute path | Open with the system default app |

The terminal must forward middle-click rather than use it for paste. Copying paths over SSH requires terminal OSC 52 support.

### Git colors

| Color | Status |
| --- | --- |
| Theme accent | Folder |
| Green | Added `A`, untracked `??`, renamed `R`, or copied `C` |
| Yellow | Modified `M` or changed file type `T` |
| Red | Deleted `D` or merge conflicts such as `UU` / `AA` / `DD` |
| Gray | Git-ignored `!!`; not automatically hidden |

Changed files also show Git status badges such as `M`, `??` or `MM`.

### Ignore rules

Patterns follow `.gitignore` syntax; the `git` command must be available locally.

| Example pattern | Effect |
| --- | --- |
| `node_modules/` | Hide `node_modules` folders at any depth |
| `/dist/` | Hide only the root `dist` folder |
| `*.log` | Hide files or folders ending in `.log` at any depth |
| `!keep.log` | Place after `*.log` to show `keep.log` again |

Rules only hide tree entries; they do not change Git tracking or import `.gitignore`. A parent folder must be visible before a child can be re-included.

- The expanded tree refreshes on file changes and every 10 seconds. Rules saved in another TUI apply on refresh.
- Git features and default-app opening require the workspace path to be locally accessible.
