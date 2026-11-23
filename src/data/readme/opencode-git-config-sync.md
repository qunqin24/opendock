# opencode-git-config-sync

Keep your global [opencode](https://opencode.ai) config in sync across machines with plain git, and always see
whether it is in sync, right in the TUI.

- **Live status** in the status bar (`cfg ↑1 ↓0 ●3`) and the session sidebar (changed files with line counts).
- **Outdated warning** when commits have waited more than 24h to be pushed or pulled, or uncommitted files are older
  than 24h: the status turns red, the sidebar shows `❗ OUTDATED!`, and a toast stays until you dismiss it (at most
  once a day per machine).
- **`/config-sync`**: commit (with a message you confirm), `pull --rebase`, update submodules, push. If the rebase does
  not apply cleanly it is aborted and left for you to resolve.
- **`/config-sync-setup`**: turn the config folder into a repo and push it, or adopt an existing remote on a new
  machine.
- **Your git, your host**: GitHub, GitLab, self-hosted, anything git can reach. No tokens, no `gh`, no hidden clone:
  the config folder itself is the repository.

## Install

Add the plugin to the global `cli.json` (`~/.config/opencode/cli.json`):

```json
{
  "plugins": ["opencode-git-config-sync"]
}
```

opencode installs the plugin once and does not update `cli.json` plugins automatically. Run `opencode plugin update`
to get the latest version. To pin a version instead, add it to the name; a pinned plugin stays on that version until
you change the number:

```json
{
  "plugins": ["opencode-git-config-sync@0.3.0"]
}
```

It is a TUI-only plugin. Since `cli.json` lives in the config folder, the plugin syncs to your other machines along
with everything else.

Requirements: `git` on `PATH`, and credentials that work without a prompt (an SSH key, or a credential helper for
HTTPS). The plugin never asks for passwords; git fails with an error instead.

## Commands

| Command                | What it does                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `/config-sync`         | Stage all changes, commit (asks for a message, with a proposed one), pull --rebase, push. Cancelling leaves the changes staged. The result toast reports how many commits were pushed and pulled. |
| `/config-sync-fetch`   | Force a `git fetch` now (ignoring the fetch interval) and refresh the status, so the ahead/behind counts reflect the remote. |
| `/config-sync-refresh` | Refresh the status now, and show the outdated warning again if it applies.               |
| `/config-sync-setup`   | Set up the config folder: **Start new** or **Pull existing config**.                     |

All of them are also in the command palette under **Config sync**.

### Setup

- **Start new** (first machine): runs `git init`, adds a `.gitignore` for machine-local files (`service.json`,
  `*.local.json(c)`, `.env*`, `*.pem`, `*.key`, `node_modules/`, OS junk), commits, and pushes to the URL you enter. The remote must be empty.
- **Pull existing config** (every other machine): fetches the remote and checks it out. Local files that the remote
  also has (there will be some, at least `cli.json`) are moved to `.config-sync-backup-<date>/` first, so you can merge
  anything you want to keep. The backup folder is ignored by git.

If a setup step fails (wrong URL, missing credentials, push rejected, checkout conflict), the setup is undone: the new
`.git` is removed, and the `.gitignore` or the backed-up files are restored, so you can simply run it again.

If the config folder is not a repository, the plugin suggests setup once a day.

### Commit message

The commit dialog takes a multi-line message: Enter starts a new line, Ctrl+S commits, and Tab moves to the
**Commit** / **Cancel** buttons, where Enter chooses. Esc cancels.

### Possible secrets

Before a commit (`/config-sync` and **Start new**), the staged changes are checked for things that look like secrets:
file names (`.env*`, `*.pem`, `*.key`, SSH keys, `auth.json`), private keys, common token formats (OpenAI, GitHub,
GitLab, Slack, AWS), and `apiKey` / `token` / `secret` / `pass` / `password` keys set to a literal value. Values that
reference `{env:…}` or `{file:…}` are fine. On a match, a warning lists them with **Cancel** focused; only
**Ignore and continue** goes on. It is a heuristic: keep secrets out of the folder, or in ignored files.

## How it works

- The status refreshes when files in the config folder change (recursive file watcher), after every model turn, and
  every 5 minutes.
- It runs `git fetch` at most once per hour (`fetchMinutes`), so commits to pull show up before they count as outdated. It never pulls or pushes on its own. `/config-sync-fetch` forces a fetch at any time.
  The background fetch never prompts: ssh runs in batch mode (keeping your `core.sshCommand`), and the fetch gives up
  after 60s, so an unknown host key or a passphrase prompt can't hang the status.
- Submodules are updated (`git submodule update --init --recursive`) after a pull.
- A submodule that moved to a new commit counts as a change: `/config-sync` commits the new pointer like any other
  file.
- A submodule checked out at a commit that is not on its remote yet is red and marked `not pushed`, and `/config-sync`
  refuses to run until you push the submodule: once that pointer is pushed, the submodule update fails on your other
  machines. If the pointer is already committed in the config repo, the sidebar adds a `❗↑ <path> not pushed` row for it.
  (The push itself also uses `--recurse-submodules=check` as a last line of defense.) Detection uses the submodule's
  remote-tracking branches without fetching, so a commit someone else pushed shows as unpushed until you fetch there.
- Uncommitted work inside a submodule is never committed or pushed, and does not count as an uncommitted file; the
  sidebar lists such submodules in red. `/config-sync` asks whether to ignore it and sync the rest, or cancel.
- Per-machine settings: keep them in git-ignored files such as `*.local.json`.

## Reading the status

The plugin adds a compact summary to the status bar (footer) and a detail block to the session sidebar.
Everything below uses the default `label` of `cfg`; change it with the `label` option.

### Status bar (footer)

Format: `<label> <signs>`, e.g. `cfg ↑1 ↓0 ●3`, `cfg ✓`, or `❗ cfg ↑2 ↓0 ●1` when outdated.

| Sign | Meaning |
| ---- | ------- |
| `↑N` | N commits on the local branch that the remote does not have yet (to push). |
| `↓N` | N commits on the remote that the local branch does not have yet (to pull). |
| `●N` | N uncommitted changed files (including submodule pointer moves). |
| `✓`  | Everything in sync: no commits to push or pull and no changed files. |
| `❗ ` | Prefix (red) when the status is *outdated* (see below); the whole status turns red. |
| `not synced` | Shown instead of the signs when the config folder is not a git repository. |

### Sidebar

Top to bottom:

- `❗ OUTDATED!` (red) — shown only when outdated.
- `Config ↑N to push · ↓N to pull` — commits to push/pull; or `Config in sync ✓` when there are none and no changed files or submodule issues.
- `N uncommitted` — number of changed files (shown only when there are some).
- Changed-file rows: `  <code> <path> <line counts>`, where `<code>` is git's short status (`M` modified, `A` added, `D` deleted, `??` untracked, `R` renamed, …) and the line counts are `+N −M` (or `bin` for a binary file, empty for a submodule). Rows are red when the file is a submodule that needs action, muted otherwise. A row whose submodule pointer is not pushed yet also gets a ` not pushed` suffix.
- Submodule rows that need action but are not a change by themselves:
  - `m ` (red) — uncommitted work inside the submodule.
  - `↑ ` (red) — the submodule is checked out at a commit that is not on any of its remote branches (not pushed).
  - `❗↑ ` (red) — an already-committed pointer to such an unpushed commit; the `❗` is two cells wide so the row stays aligned with the others.
  - These rows also carry a ` not pushed` note when the pointer is unpushed.
- `  … N more files changed` — shown when more than `maxFiles` files changed.
- Outdated reasons are the same as for the status bar (below).

### Outdated (red)

A status is outdated when either of these is older than `staleHours` (default 24h):

- a commit waiting to be pushed or pulled, or
- an uncommitted file.

When outdated, the status bar turns red with an `❗ ` prefix, the sidebar shows `❗ OUTDATED!`, and a toast appears once per day per machine until you dismiss it. `/config-sync-refresh` shows the warning again.

## Security model

The remote must be trusted like code: your opencode config can load plugins, start MCP servers and set permissions,
so whoever can push to the config repo can run code on every machine after its next `/config-sync`. Keep it private,
limit who can push, and keep `git` up to date (submodules are cloned from the URLs in the repo's `.gitmodules`).

The plugin itself never pulls on its own, refuses remote paths that would leave the config folder during setup
(and fetches with `transfer.fsckObjects`), hides credentials embedded in URLs in its error messages, and shows control
characters in file names and git output as `�`.

## Options

```json
{
  "plugins": [
    {
      "package": "opencode-git-config-sync",
      "options": {
        "repo": "~/.config/opencode",
        "staleHours": 24,
        "refreshMinutes": 5,
        "fetchMinutes": 60,
        "maxFiles": 3,
        "label": "cfg"
      }
    }
  ]
}
```

| Option           | Default                              | Meaning                                                    |
| ---------------- | ------------------------------------ | ---------------------------------------------------------- |
| `repo`           | `OPENCODE_CONFIG_DIR`, else XDG path | The config folder to track.                                |
| `staleHours`     | `24`                                 | Age after which changes count as outdated.                 |
| `refreshMinutes` | `5`                                  | Fallback refresh interval.                                 |
| `fetchMinutes`   | `60`                                 | Minimum time between background `git fetch` runs.          |
| `maxFiles`       | `3`                                  | Changed files listed in the sidebar.                       |
| `label`          | `cfg`                                | Status bar label.                                          |

## Compared to other sync plugins

There are several config sync tools for opencode. This one is deliberately small:

- [`opencode-synced`](https://github.com/iHildy/opencode-synced) and its forks sync config, secrets, sessions and
  prompt history through a separate clone on GitHub, auto-sync at startup and support per-machine override merging.
  Choose it if you want all of that. On opencode V2 its sync runs through an agent tool, and it shows no live status.
- [`opencode-github-sync`](https://github.com/doomsday616/opencode-github-sync) syncs config, data and sessions through
  GitHub with a plugin and a CLI.
- [`opencode-sync-config`](https://github.com/guilhermelowa/opencode-sync-config) also uses the config folder as the
  repo, but commits and pushes automatically on exit.
- Standalone tools such as [`GareArc/opencode-sync`](https://github.com/GareArc/opencode-sync) and
  [`theseyan/opencode-sync`](https://github.com/theseyan/opencode-sync) work outside opencode.

`opencode-git-config-sync` never commits or pushes without you, works with any git host, and keeps the state visible
all the time.

## Development

The checks run with [bun](https://bun.sh): `bun install`, then `bun run check` (type check and tests). Without a local
bun, `./scripts/docker.sh` runs the same in the bun image CI uses (pass a command to run something else, e.g.
`./scripts/docker.sh bun test test/git.test.ts`).

- `test/git.test.ts` drives real git repositories in a temp folder (a bare repo stands in for the remote): status,
  submodules, sync, rebase conflicts, and setup including its undo.
- `test/tui.test.tsx` runs the plugin against a fake opencode context and renders the sidebar and status bar with
  opentui's test renderer, checking the text and colors, and the `/config-sync` dialogs.

- `test/dist.test.ts` checks that the committed `dist/tui.js` matches `src` and imports only modules opencode provides.

opencode loads `dist/tui.js`, built by `bun run build` (part of `bun run check`). It is committed, so a git checkout
(e.g. a submodule in your config folder) works without a build step: rebuild and commit it with every change to `src`.
The plugin ships compiled JavaScript because opencode's Solid JSX transform skips `.tsx` files installed under
`node_modules` ([anomalyco/opencode#39986](https://github.com/anomalyco/opencode/issues/39986)); such a plugin loads
its own copy of solid-js and its status never updates.

`npm publish` runs the checks first (`prepublishOnly`).

## License

[Apache-2.0](LICENSE)
