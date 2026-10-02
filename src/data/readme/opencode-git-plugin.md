# Git Panel

An OpenCode v2 TUI plugin that shows Git working-tree changes in the sidebar and opens file diffs in the native session panel.

## Features

- Sidebar list with `A`, `M`, and `D` badges plus per-file addition/deletion counts
- Staged files marked as `[A]`, `[M]`, or `[D]`
- Stage and unstage with the keyboard, command palette, or mouse
- Commit staged files without leaving the TUI
- Scrollable diff panel with line numbers and responsive controls
- Search with highlighted matches and next/previous navigation
- Optional persisted tree-sitter syntax highlighting
- Automatic refresh from OpenCode events and a configurable polling interval
- Safe handling of Git paths containing spaces, quotes, arrows, or newlines

The plugin runs Git through OpenCode's local shell API. It does not contact an external service.

## Screenshots

| File list | List navigation | Diff panel |
| --- | --- | --- |
| ![Git Panel sidebar showing changed files with status badges](docs/panel.png) | ![Git Panel list navigation with stage and commit controls](docs/interactive.png) | ![Git Panel diff panel with syntax highlighting and search](docs/diff.png) |

## Requirements

- OpenCode `>=2.0.0 <3`
- A Git repository as the active session directory

## Install

Install the published package with OpenCode:

```sh
opencode plugin add opencode-git-plugin
```

Git Panel is a TUI-only plugin, so `opencode plugin add` registers it in `~/.config/opencode/cli.json`. It stays active when the TUI connects to a remote server.

Restart the OpenCode TUI after installation. Verify installation with:

```sh
opencode plugin list
```

### Update

```sh
opencode plugin check
opencode plugin update
```

`check` reports whether a newer version is available; `update` installs it. Restart the TUI afterwards.

### Uninstall

```sh
opencode plugin remove opencode-git-plugin
```

### Local development

For local development, add the package directory to `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/git-changes",
      "options": { "intervalMs": 4000 }
    }
  ]
}
```

Fully quit and reopen the TUI after changing local plugin code.

Do not add the plugin to `opencode.json(c)`; that file is for server plugins and Git Panel has no server entrypoint.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `intervalMs` | `number` | `4000` | Refresh interval in milliseconds; values below `1000` are clamped. |

## Usage

### File list

- `<leader>G` (or palette: `Git Panel: Focus List`) enters list mode (yellow top/bottom border)
- `↑` / `↓` move, `Enter` opens the diff, `→` stages, `←` unstages, `c` commits staged files, `ESC` exits
- Click a row to open its diff; click the branch name to enter stage mode (every clicked file toggles staged/unstaged; branch click or `ESC` exits)
- Clicking the prompt input exits list mode so typing is never hijacked
- Staging also via palette (`Git Panel: Stage/Unstage File`)

### Diff panel

- `?` searches (yellow match highlight + match counter, `↑` / `↓` jump between matches), `ESC` clears the search, second `ESC` (or `Backspace`) closes the panel
- `s`, the `[syntax:on/off]` header button, or palette (`Git Panel: Toggle Diff Syntax Highlighting`) toggles language syntax colors; default off, persisted across restarts
- While searching, the view temporarily falls back to plain text so highlight + jump keep working
- `j` / `k` scroll in syntax mode; mouse wheel works in both modes
- Closing the panel returns to list mode
- Plain diffs are truncated after 4,000 parsed lines to keep the TUI responsive

### Commit

- Green `[c : Commit]` button (or `c`, or palette: `Git Panel: Commit Staged`), visible only while files are staged and list mode is active; prompts for a message, then commits

## States

- `Loading…` while fetching
- `Working tree clean` when there is nothing to show (header stats hidden)
- `Empty repo — no commits yet` before the first commit
- `Not a git repository` outside a repo, plus raw fetch errors

## Development

```sh
bun install
bun run check
bun run build
npm pack --dry-run
```

The published package exposes `./tui` as `dist/tui.js`, compiled by `bun run build` with the OpenTUI Solid transform. OpenCode does not compile JSX inside `node_modules`, so shipping raw `.tsx` makes the panel fail to render once installed from npm. `npm pack` and `npm publish` run the build automatically.

A local directory plugin is resolved as `<dir>/tui`, so local development loads `tui.ts` at the repository root, which re-exports `src/tui.tsx` and is compiled by OpenCode on the fly.

Any module that imports runtime values from `solid-js` (`createSignal`, `createMemo`, `onCleanup`, …) must be a `.tsx` file. For local plugins OpenCode only applies its Solid transform to `.jsx`/`.tsx` files; in a `.ts` file the import loads a second Solid instance and the UI stops updating. A test enforces this.

Before publishing, test the packed tarball rather than the working directory:

```sh
bun pm pack
mkdir -p /tmp/git-panel-smoke && cd /tmp/git-panel-smoke
bun init -y && bun add /path/to/opencode-git-plugin-<version>.tgz
```

## Publish

```sh
npm login
npm publish
```

The `prepublishOnly` script runs type checking and tests before npm publishes the package.

## License

MIT
