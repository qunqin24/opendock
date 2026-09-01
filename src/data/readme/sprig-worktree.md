<p align="center"><img src="./assets/sprig-worktree-logo.png" alt="sprig-worktree logo" width="400"></p>

# sprig-worktree

> A sprig of your repo for worktrees — instant isolated environments for PR review, with codegraph integration.

PR-review worktrees for [opencode](https://opencode.ai). One command creates an isolated worktree with its own codegraph index and symlinks to your ignored files; one command tears it down. The LLM never touches worktree management — no tokens, no non-determinism.

## Why

Reviewing a PR in opencode today means juggling the worktree, the codegraph reindex, the symlinks to `.env` / `CLAUDE.local.md`, and the cleanup. Every step is a place to forget. This toolkit turns the whole cycle into two commands.

Inspired by the worktree + bootstrap/teardown flow of Spotify's Xirp for Claude Code, reimplemented natively for opencode.

## Install

### Option A — copy the toolkit (recommended)

Copy `.opencode/` into your project repo and commit it:

```bash
git clone https://github.com/selcukusta/sprig-worktree /tmp/sprig
cp -R /tmp/sprig/.opencode .
rm -rf /tmp/sprig
git add .opencode && git commit -m "add sprig-worktree"
```

Then run the interactive installer to write your config and the global `wt` wrapper:

```bash
.opencode/scripts/wt install
```

For non-interactive use (CI, scripted onboarding), accept the defaults:

```bash
.opencode/scripts/wt install --defaults --non-interactive
```

Flags (combinable):

| Flag | Effect |
| --- | --- |
| `--reset` | Wipe the existing config and re-prompt (interactive) or restore defaults (non-interactive). |
| `--non-interactive` | Fail if no config exists and `--defaults` is not set. |
| `--defaults` | Only with `--non-interactive`. Write schema defaults without prompting. |
| `--config <path>` | Override the config file location (default `.opencode/wt.json`). |

The global wrapper pins `wt` to your repo and `exec`s the repo copy — so `wt` works from any directory and always runs your latest committed version.

### Option B — npm

```bash
npm install --save-dev sprig-worktree
```

The package exposes `dist/plugin.js` (opencode plugin entry, default-exported) and `dist/scripts/wt` (the bash CLI). Configure your opencode `plugin` list to load it from `node_modules`. On the first opencode session inside your repo, the plugin auto-runs `wt install` to write `.opencode/wt.json` and the global `wt` shim — it finds the bundled bash at `node_modules/sprig-worktree/dist/scripts/wt` automatically, so you don't need to copy anything. After that, `wt` works from any directory via the package's `bin` entry.

> **Note on npm v11+**: this package intentionally has **no** `postinstall` script. Recent npm versions block unfamiliar postinstall scripts by default (via `npm approve-scripts`), which would leave the package unconfigured after install. Instead, the plugin auto-bootstraps on the first opencode session — no script approval needed.

### First-run behavior

The plugin detects first use inside your repo (including right after a fresh `npm install`) and runs `wt install` for you, creating `.opencode/wt.json` with the recommended defaults and writing the global `wt` shim. In a TTY session you'll see prompts — press Enter through them to accept each default. Subsequent opens load it directly. No manual bootstrap step is required unless you want to review or customize the defaults first.

## Quick start

```bash
wt new review-pr-1234
```

That single command:

1. `git fetch --prune` and `git pull --rebase` on main (configurable).
2. Fetches `pull/1234/head` from origin into a local `review/review-pr-1234` branch.
3. Creates the worktree `.git-worktrees/review-pr-1234` checked out on that branch.
4. Symlinks the ignored files from your main repo root (see `filesToLink` in [Config](#config)).
5. Runs `npm install` in the configured dirs (root + `apps/frontend` by default).
6. Runs `codegraph init && codegraph sync` with an isolated data dir.
7. Launches opencode **in the same terminal tab**, inside the worktree.

When you're done:

```bash
wt teardown review-pr-1234
```

Removes the codegraph data, symlinks, worktree, and branch. If run from inside opencode (`/wt-teardown`), the session exits itself.

## Commands

| Command | Description |
| --- | --- |
| `wt new <name>` | Create `.git-worktrees/<name>`, bootstrap it, open opencode. `<name>` must match `namePattern` (default `^review-pr-([0-9]+)$`). |
| `wt list` | List open review worktrees and their branches. |
| `wt open <name>` | Open opencode in an existing worktree. |
| `wt bootstrap [name\|path]` | Re-run symlinks + codegraph indexing. Idempotent. |
| `wt clean [name\|path]` | Remove worktree artifacts only (symlinks + codegraph data), keep the worktree and branch. |
| `wt teardown [name\|path]` | Remove worktree, branch, and codegraph data. Bare `wt teardown` tears down the worktree you're standing in. |
| `wt install [--reset] [--non-interactive] [--defaults] [--config <path>]` | Write `.opencode/wt.json`, then install the global wrapper. |
| `wt test` | Run the built-in smoke tests (throwaway repo, no side effects). |

Name-based commands work from any directory. Paths are also accepted (e.g. `wt teardown .git-worktrees/review-pr-1234`).

## Config

After install, your project has `.opencode/wt.json`:

```json
{
  "basePath": ".git-worktrees",
  "branchPrefix": "review/",
  "namePattern": "^review-pr-([0-9]+)$",
  "fetchPrune": true,
  "pullRebase": true,
  "filesToLink": [
    "CLAUDE.local.md",
    ".claude/settings.local.json",
    ".env"
  ],
  "npmInstallDirs": [
    ".",
    "apps/frontend"
  ],
  "tools": {
    "codegraph": { "enabled": true }
  }
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `basePath` | `.git-worktrees` | Directory under the repo root where worktrees are created. Must be a relative path without `..`. |
| `branchPrefix` | `review/` | Prefix for review branches. Full branch name = `${branchPrefix}${worktree-name}`. |
| `namePattern` | `^review-pr-([0-9]+)$` | Regex worktree names must match. Must contain exactly one `(...)` capture group — the captured value is used as the PR number for `pull/<n>/head`. |
| `fetchPrune` | `true` | Run `git fetch --prune origin` before creating a worktree. |
| `pullRebase` | `true` | Run `git pull --rebase` on main before creating a worktree. |
| `filesToLink` | `[CLAUDE.local.md, .claude/settings.local.json, .env]` | Repo-relative paths to symlink from the main repo into each worktree. The installer pre-detects existing files at common locations and presents them as a numbered multi-select. |
| `npmInstallDirs` | `[".", "apps/frontend"]` | Repo-relative dirs to run `npm install` in after creating a worktree. The installer pre-detects dirs containing `package.json`. |
| `tools.codegraph.enabled` | `true` | When `false`, skip codegraph init/sync/data-dir cleanup. The plugin also stops injecting `CODEGRAPH_*` env vars. |

Edit the file directly, or re-run `wt install` interactively to reprompt.

## Environment overrides

Every config field can be overridden per-invocation via `WT_*` env vars:

| Variable | Overrides |
| --- | --- |
| `WT_BASE` | `basePath` |
| `WT_BRANCH_PREFIX` | `branchPrefix` |
| `WT_NAME_PATTERN` | `namePattern` |
| `WT_FETCH_PRUNE` | `fetchPrune` (parses `true`/`false`/`yes`/`no`/`1`/`0`) |
| `WT_PULL_REBASE` | `pullRebase` |
| `WT_FILES_TO_LINK` | `filesToLink` (comma-separated) |
| `WT_NPM_DIRS` | `npmInstallDirs` (comma-separated) |
| `WT_CODEGRAPH` | `tools.codegraph.enabled` |

Plus runtime controls:

| Variable | Default | Meaning |
| --- | --- | --- |
| `WT_OPEN` | `auto` | How opencode is launched after `new`/`open`. `auto`: same tab when run from a real terminal; otherwise a new tab (iTerm2) / window (Ghostty) of the host terminal. `exec`: always same tab. `tab`: force a new tab. `none`: only print the `cd` command. |
| `WT_MAIN_ROOT` | autodetected | Skip main-repo autodetection. Set automatically by the global `wt` wrapper. |
| `WT_BIN` | — | Install target directory for `wt install` (e.g. `WT_BIN=$HOME/.local/bin wt install`). |

Precedence: **env > file > schema default**.

## How isolation works

- **CodeGraph**: every shell command and any local MCP server whose name or command contains `codegraph` gets `CODEGRAPH_PROJECT_PATH=<worktree>` and `CODEGRAPH_DATA_DIR=<worktree>/.codegraph-<name>`. Each worktree has its own index. Set `tools.codegraph.enabled = false` to disable entirely.
- **Ignored files**: paths in `filesToLink` are symlinked from the main repo into each worktree. Real files in the worktree are never overwritten; only previously created symlinks are replaced or removed.
- **Permissions**: the plugin adds an `external_directory` allow rule for the main repo root, so reads through the symlinks work inside the worktree.
- **Teardown safety**: only symlinks are deleted (never real files); branches are removed only when git allows it.

## Requirements

- [opencode](https://opencode.ai) ≥ 1.18
- git
- `jq` — required for `wt install` config writes. Install with `brew install jq`.
- CodeGraph CLI (`codegraph` on PATH) — optional when `tools.codegraph.enabled = false`
- macOS for the terminal-launch magic (iTerm2 / Ghostty / Terminal). On other OSes commands print the `cd` line instead.
- `bun` — only needed to run the plugin's unit tests, not for normal use.

## Testing

```bash
# Bash CLI integration tests (16 groups, no side effects)
wt test

# Plugin unit tests (29 tests, requires bun)
npm test
# or: bun test ./.opencode/plugins/sprig-worktree.test.ts
```

`wt test` builds a throwaway repo and exercises the full cycle — config write, install, worktree creation, symlinks, codegraph env contract, listing, clean, idempotent bootstrap, teardown. Run it after any change to the bash script.

## Troubleshooting

- **`wt: command not found`** — run `.opencode/scripts/wt install`, or invoke by its path.
- **`'jq' is required`** — install jq (`brew install jq`) and re-run `wt install`.
- **CodeGraph errors during bootstrap** — bootstrap continues without the index; fix your CodeGraph install and run `wt bootstrap <name>`.
- **No iTerm2/Ghostty tab opens** — from a normal terminal prompt, opencode deliberately runs in the same tab; a new tab (iTerm2) / window (Ghostty) is opened only when `wt` runs without a TTY and `WT_OPEN=auto`. Detection uses `TERM_PROGRAM` (`iTerm.app` / `ghostty`); anything else falls back to printing the `cd` command.
- **`git worktree add` fails with "already checked out"** — the branch is open in another worktree; pick a different branch or close that worktree first.

## For contributors

```bash
git clone https://github.com/selcukusta/sprig-worktree
cd sprig-worktree
npm install     # builds via `prepare`
npm run build   # rebuild after editing .opencode/plugins/*.ts
npm test        # bun + bash
npm pack --dry-run   # verify the published tarball
```

The package is `sprig-worktree`. The build emits `dist/plugin.js`, `dist/plugin.d.ts`, `dist/index.js` (default-export wrapper), and `dist/scripts/wt` (executable bash CLI).

## License

[MIT](LICENSE)