# Epic Visual Git (`epic-visual-git`)

**Epic Visual Git** is an interactive Git control panel for [OpenCode](https://opencode.ai) — pick branches, fetch, pull, stage,
commit, merge, and push from a dialog-driven GUI in the OpenCode TUI.

> Made by [PrudentDev](https://PrudentDev.com) — software engineering, done prudently.

## Features

**OpenCode Desktop**: a **Git panel** in the session side region (open via the `/git` slash command, the command
palette, or the side-panel **+** menu).
**OpenCode TUI**: `/git` opens a dialog-driven control panel (also in the command palette), plus a live
`⎇ branch ↑1 ±3` footer badge.

- Panel / panel dialogs cover:
  - **Status** — branch, upstream, ahead/behind counts, porcelain file list
  - **Diff** — click any changed file in the desktop panel for an inline colored diff
    (additions green, deletions red; untracked files render as all-added)
  - **Stage / unstage** — *Stage all* / *Unstage all*, or hover any file row for its own **+ stage** / **− unstage**
    button (`git add -- <file>` / `git restore --staged -- <file>`); on a conflicted file **+** marks it resolved
  - **Not a repository?** The panel says so in plain words and offers a one-tap *Initialize repository* (`git init`) —
    nothing is modified, and nothing leaves the machine until you add a remote and push
  - **Commit** — message prompt, optional auto-stage, then an optional one-tap *Push now?*
  - **Push** — safe by default; publishes with `git push -u origin <branch>` when there is no upstream
  - **Pull** — *Fast forward only* (safe default), *Rebase*, or *Merge*, with a plain-language hint for each
  - **Fetch** — `git fetch --all --prune --tags`
  - **Branches** — searchable picker (local + remote), track remote branches on checkout, create new branches,
    explicit *discard changes* confirmation before anything destructive
  - **Merge** — pick any branch to merge into the current one. Conflicts are surfaced in-panel: conflicted files
    turn red with a `UU` mark and a ⚠ conflict counter, the banner explains the resolve-and-commit path, and an
    **Abort** button cancels a conflicted merge, revert, or apply and restores the prior state
  - **History** — the last 15 commits on a timeline; click any commit to expand it: per-file
    `+added / −removed` stats, **Apply to branch** (cherry-pick `-n`: the commit's changes land on your current
    branch as *pending* changes — nothing is committed, so you can diff and adjust first), **Undo commit**
    (`git revert` — a new commit that reverses it), and **Checkout** per file (that file's version from the
    commit lands as a pending change)
  - **Log** — the last 15 commits, right in a dialog
- Live footer badge: `⎇ main ↑1 ±3` (branch, ahead, dirty count), refreshed via RPC events.
- Everything runs through a versioned **RPC contract** (`git-control`) — the git commands execute in the
  OpenCode **server** at the project location, so the panel also works when the TUI connects to a remote server.

## Install

### OpenCode Desktop

The GUI part is the prebuilt bundle in `dist/`. Make sure the global `~/.config/opencode/opencode.json(c)` lists it:

```jsonc
{ "plugins": ["./plugins/epic-visual-git"] } // or the published package name
```

(Desktop loads GUI parts only from `opencode.json(c)`, not from `cli.json`.)

### OpenCode TUI (terminal)

The server and TUI parts load from the global plugins directory or any `plugins` entry; no build needed.

### From npm (once published)

```jsonc
// ~/.config/opencode/opencode.json
{ "plugins": ["epic-visual-git"] }
```

or `opencode plugin add epic-visual-git`.

### From source (global)

Drop this directory into `~/.config/opencode/plugins/epic-visual-git/` — OpenCode discovers it globally for every project:

```text
~/.config/opencode/plugins/epic-visual-git/
```

If you change sources, rebuild the desktop bundle: `npm install && npm run build` (`vite build --watch` reloads
the GUI live).

## Use as an RPC from other plugins or clients

```ts
import { OpenCode } from "@opencode/client"
import { GitControl } from "epic-visual-git/rpc"

const git = OpenCode.make({ baseUrl: "http://localhost:4096" }).rpc(GitControl)
const status = await git.status()
await git.commit({ message: "feat: ship it", stageAll: true })
```

## Safety

The plugin never uses `--force-push`, never rewrites history, and never pushes to a branch other than the
current one. `--discard-changes` is only ever sent after an explicit click on the red *Force* button.
Undo (revert) and apply (cherry-pick) only ever *add* commits or working-tree changes — history is never
rewritten. Both need a clean working tree, so nothing you are working on can be swallowed by them; destructive
buttons additionally use a two-step confirm. Merge conflicts never trap you: the operation stays open in the
panel until you resolve + commit, or undo it entirely with *Abort*.

## Contributing

Issues and PRs are welcome. Please open them against the repository linked in `package.json`.

## Credits & license

Created and contributed by **[PrudentDev](https://PrudentDev.com)**. MIT licensed — see [LICENSE](LICENSE).
