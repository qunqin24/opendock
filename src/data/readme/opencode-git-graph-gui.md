# OpenCode Git Graph

Browse a repository's Git history as an interactive graph, inspect commits and
diffs, and run common Git actions from **OpenCode Desktop**.

> **Compatibility:** OpenCode Desktop V2 only. The V2 GUI plugin API is
> experimental and may change between OpenCode releases.

![OpenCode Git Graph showing branches, commits, and repository actions](docs/assets/git-graph.png)

## Features

- Visualize local and remote branches, merges, tags, and the current `HEAD`.
- Search commit messages or hashes, filter by branch, and load more history.
- Inspect commit details, changed files, per-file diffs, and full commit patches.
- View syntax-highlighted diffs for common programming languages.
- Check working-tree status and recover from cherry-pick or revert conflicts.
- Refresh repository data or fetch all configured remotes.
- Check out branches or commits; cherry-pick, revert, reset, push, and pull.

Git history browsing is read-only. Git write actions run only when explicitly
requested and are confirmed in the UI. Checkout does not overwrite local
changes, push never forces, and pull is fast-forward only.

## Requirements

- OpenCode Desktop V2 with the GUI plugin support enabled.
- Git installed and available on the `PATH` used by OpenCode.
- Node.js `22.12` or newer (required by the package).

## Install

Add the plugin to your **global** OpenCode configuration. Desktop loads GUI
plugins from `opencode.json` or `opencode.jsonc` in your OpenCode config folder
(usually `~/.config/opencode/`):

```json
{
  "plugins": ["opencode-git-graph-gui"]
}
```

If the file already has a `plugins` list, add the package name to that list and
keep the other settings. Then reload OpenCode's configuration or restart
Desktop, open a session, and launch **Git Graph** from the side-panel `+` menu or
the command palette (`Git Graph: Open panel`, `⌘⇧G` on macOS / `Ctrl+Shift+G` on
Windows and Linux).

To check that OpenCode detects the plugin, run:

```bash
opencode plugin list
```

On macOS, if the `opencode` command is not on your `PATH`, you can use the CLI
bundled with the Desktop app:

```bash
/Applications/OpenCode.app/Contents/Resources/opencode-cli plugin list
```

## Safety and scope

- Every write action requires confirmation. Destructive actions, including hard
  reset and aborting a cherry-pick or revert, show an additional warning.
- The plugin never forces a checkout over local changes or force-pushes.
- Pull uses fast-forward-only mode. Diverged branches are left unchanged.
- Branch deletion, merge, rebase, stash, tag management, and remote
  configuration are not currently supported.
- Fetch does not prune stale remote-tracking branches.

## Development

```bash
git clone https://github.com/fozzeuh/opencode-gitgui.git
cd opencode-gitgui
npm ci
npm run check
```

For local development, build the GUI bundle and point the global OpenCode
configuration at the repository directory instead of the npm package:

```bash
npm run build
```

```json
{
  "plugins": ["/absolute/path/to/opencode-gitgui"]
}
```

Run `npm run dev` to rebuild the GUI bundle when files change. `npm run check`
runs type checking, linting, tests, and the production build.

## Links

- [npm package](https://www.npmjs.com/package/opencode-git-graph-gui)
- [Changelog](docs/changelog.md)
- [Report a bug](https://github.com/fozzeuh/opencode-gitgui/issues)
- [MIT License](LICENSE)
