# sidebar-git-diff

**OpenCode V2**

The sidebar groups uncommitted changes by OpenCode session name, links each filename to `/diff`, and shows the worktree, branch, and number of commits ahead of the tracked remote branch.

![OpenCode Git changes sidebar showing an expanded session, its worktree and branch status, and clickable changed files](https://raw.githubusercontent.com/timrichardson/sidebar-git-diff/main/docs/sidebar-screenshot.png)

## Install and update

The plugin targets the **OpenCode 2.3.2 terminal UI**. OpenCode V1 and the Desktop GUI are not supported.

**OpenCode snapshots are not required.** The sidebar reads Git status and groups files using recorded `write`, `edit`, and `patch` calls. Its links open the **Uncommitted** diff, which reads the Git working copy.

Add the plugin to `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json` if set), not `opencode.jsonc`. Keep any existing `plugins` entries. Use only one of the installation methods below. If you already use a local copy of the original sidebar plugin, disable or remove it from plugin discovery first to avoid a duplicate sidebar section.

### From GitHub

**Install:** Clone the repository. No npm install or build is needed.

```sh
git clone https://github.com/timrichardson/sidebar-git-diff.git "$HOME/sidebar-git-diff"
```

Add the absolute path to your clone to `plugins` in `cli.json`. Replace the example path with your own.

```json
{
  "plugins": ["/home/you/sidebar-git-diff"]
}
```

Run `/reload` in OpenCode.

**Update:** Pull the latest changes into the same clone. OpenCode does not pull GitHub changes for you.

```sh
git -C "$HOME/sidebar-git-diff" pull --ff-only
```

OpenCode watches the local plugin files and normally reloads them after the pull. If the sidebar does not refresh, run `/reload` in OpenCode.

### From npm

**Install:** Add `sidebar-git-diff@latest` to `plugins` in `cli.json`. If you used the beta, replace the `sidebar-git-diff@beta` entry. OpenCode downloads the package for you. Run `/reload` if the plugin does not appear after saving.

```json
{
  "plugins": ["sidebar-git-diff@latest"]
}
```

**Update:** To check for and install an update manually, ask OpenCode to update the configured package:

```sh
opencode plugin update sidebar-git-diff@latest
```

After the update, open a fresh OpenCode terminal UI to load the new package. In OpenCode 2.3.2, `/reload` can leave the old package running in an open TUI. You do not need to restart the background service. See [OpenCode’s plugin update documentation](https://opencode.ai/docs/plugins#manage) for other version selectors.

## Use the sidebar

Open a session. If its sidebar is hidden, use the **Toggle sidebar** command.

- Click a session heading to collapse or reopen it. Groups start expanded.
- Under each session heading, `worktree · branch (+3)` shows the worktree folder, checked-out branch, and commits ahead of the locally stored upstream. `(-)` means there is no usable remote tracking branch. `(?)` means the count is unavailable, including when using `--server`.
- Click **Collapse all** or **Expand all** next to **Git changes** to update every listed session group. The same action is available in the command palette (`Ctrl+P` by default). **Unassigned** stays visible.
- Click a filename to open OpenCode’s full-screen **Uncommitted** diff viewer. The white `[A]`, `[M]`, and `[D]` badges are not links.
- Files without a reliable match stay under **Unassigned**. A match identifies a recent recorded edit, not ownership of every line in the patch.

If the sidebar contents do not fit vertically, OpenCode adds a scrollbar. Use the mouse wheel over the sidebar or drag the scrollbar to see the rest of the list.

## Attribution and diff behavior

The plugin reads Git status from the connected OpenCode server. It checks up to 30 open session tabs and up to 100 recent messages per session. It uses completed `write`, `edit`, and `patch` calls in the same worktree. Shell edits, external changes, edits outside the scanned history, and ties can remain unassigned. The sidebar indicates when history is partial.

The filename opens the native diff viewer, not a separate preview. OpenCode 2.3.2 does not expose initial file selection to plugins. Select the file in the viewer’s file tree. The viewer uses the session’s working directory, so open it from the worktree root to review files outside that directory. `Esc` returns to the session.

The plugin is read-only. It uses the connected OpenCode server for file status and attribution. With a local OpenCode server, it reads the ahead count with `git for-each-ref`. It never fetches, pushes, or changes Git state. The count reflects the remote tracking ref as of the last fetch.

## Develop

Use Node.js 26.4 or later for the package checks.

```sh
npm ci --ignore-scripts
npm run check
```

OpenCode compiles the TSX entry point at load time. There is no separate build step. [`PROMPT.md`](PROMPT.md) is a standalone specification you can give to a model to recreate the plugin without the source.

## Automatic releases

Push to `main` to publish a new release. GitHub Actions runs the package checks first, then publishes to npm’s `latest` tag. Pull requests and pushes to other branches do not publish. You do not need to bump `package.json` or create a Git tag for subsequent releases.

The workflow reads commit messages since the last published version and applies the largest bump. These examples start from `1.0.0`:

| Commit message | Bump | New version |
| --- | --- | --- |
| `feat!: remove an old option` or a `BREAKING CHANGE:` footer | Major | `2.0.0` |
| `feat: add a sidebar filter` | Minor | `1.1.0` |
| `fix: correct file grouping`, docs-only changes, or any other commit | Patch | `1.0.1` |

Label features and breaking changes using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). If you squash a pull request, put the intended label on the squash commit. If pushes arrive close together, one release can include changes from several pushes.

In the npm package’s settings, the **GitHub Actions** trusted publisher must allow `npm publish` for owner `timrichardson`, repository `sidebar-git-diff`, and workflow `release.yml`. No GitHub npm token secret is needed.
