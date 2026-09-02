<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/scionwood-mark-dark.svg">
    <img src="./assets/scionwood-mark-light.svg" alt="scionwood" width="110">
  </picture>
</p>

<h1 align="center">scionwood</h1>

<p align="center">
  Worktrees for <a href="https://opencode.ai">opencode</a> that pull down code you didn't write — each with its own index.
</p>

<p align="center">
  <img src="./assets/demo.gif" width="860"
       alt="Fetching pull request 1 into an isolated worktree with its own codegraph index, confirming it holds the PR's commit, then teardown refusing to discard an uncommitted change until --force is passed">
</p>

---

In grafting, *scionwood* is the cuttings you take from another tree to join onto
your own. That is what this does with a pull request.

```bash
wt new audit --pr 1234    # isolated worktree, own index, your .env linked, deps installed
wt teardown audit         # gone — and it won't let you lose uncommitted work
```

Not only pull requests:

```bash
wt new spike-auth               # branch from the default branch
wt new hotfix --from v2.1.0     # from a tag
wt new theirs --branch feat-x   # track a remote branch
```

## When you'd reach for this

**You need to review a pull request without disturbing what you're working on.**
`wt new review --pr 1234` checks that PR out in a directory of its own, with its
own code index, while your branch and your uncommitted changes stay exactly where
they were. No stash, no `git checkout`, no losing your place.

**Something urgent lands while you're mid-change.** `wt new hotfix --from main`
gives you a clean tree in seconds, and you go back to the first one by changing
directory.

**You want a coding agent working somewhere that isn't your main checkout.** Each
worktree is indexed separately, so what the agent searches is the code actually in
front of it rather than whatever your main branch happens to hold.

**You want it gone afterwards, completely.** `wt teardown` removes the directory,
the branch and the tool data — and refuses if that would throw away work you have
not committed.

Git can already do most of this. What it cannot do is remember your `.env`,
install your dependencies, index the tree, and refuse to delete your work.

## Why this one

Several worktree plugins exist for opencode. Four things this one does that they
do not:

**1. Worktrees for code you didn't write.** `--pr 1234` fetches the pull request
itself. Every other plugin branches from your local HEAD. `prRef` makes the same
flow work on GitLab, Gitea and Bitbucket.

**2. Each worktree gets its own tools.** A `tools` entry gives a worktree its own
code index, its own docker compose project, its own anything — six lines of
config, no code. `wt` runs each tool's setup in the worktree, exports its
environment to every shell and matching MCP server there, and removes its data on
teardown. See [docs/extending.md](docs/extending.md).

**3. Zero tokens.** The plugin never invokes the model. It registers no tool,
injects nothing into any prompt, and ships no slash commands — its whole surface
is three non-model hooks that set environment variables and a permission rule.
Other plugins hand the agent a `worktree_create` tool and spend model tokens on
every decision. A test enforces this.

**4. It refuses to destroy your work.** `wt teardown` checks for uncommitted
changes and unmerged commits and stops, instead of discarding them.

### What the others do better

[opencode-worktree](https://github.com/kdcokenny/opencode-worktree) has
cross-platform terminal spawning, auto-commit on delete, and tmux/cmux
integration. [open-trees](https://github.com/0xSero/open-trees) keeps a cross-repo
session registry. Both let the agent drive worktrees, which is the right choice if
that is what you want. This one is macOS-first and deliberately user-driven.

Inspired by the worktree + bootstrap/teardown flow of Spotify's Xirp for Claude
Code, reimplemented natively for opencode.

## Install

Three steps, once per machine. Run them from anywhere — no need to be in a
project yet.

**1. Install it.**

```bash
npm install -g scionwood
```

**2. Tell opencode to load the plugin.** Open your global opencode config —
`~/.config/opencode/opencode.json`, or `opencode.jsonc` if that is the one you
have — and add `"scionwood"` to the `plugin` array.

If you already have plugins, add it alongside them:

```json
{
  "plugin": [
    "some-plugin-you-already-had",
    "scionwood"
  ]
}
```

If the file has no `plugin` key yet, add the whole line:

```json
{
  "plugin": ["scionwood"]
}
```

This is what gives each worktree its own code index and its own environment.
The `wt` command works without it; the isolation does not.

**3. Check it worked.**

```bash
wt --version
```

That's it. `wt new my-worktree` works right now, with no config at all.

From here on, run `wt` **inside the project you want a worktree for** — it works
out which repository you are in the same way `git` does. Only `wt --version`
works anywhere.

### What `wt new` does

It creates the worktree, links your ignored files into it, runs your setup hook,
indexes it — and then **launches opencode inside it**. On a Mac that is the same
terminal tab you typed the command in. Pass `--no-open` if you just want the
worktree.

### Where worktrees live, and keeping git quiet

Worktrees are created in `.git-worktrees/` inside your repo, so git sees an
untracked directory there. The first time `wt` creates it, it adds the path to
`.git/info/exclude` — git's local ignore file, which lives in your clone and is
never committed, so nobody else is affected. If your `.gitignore` already covers
the directory, `wt` changes nothing.

If you would rather your whole team share the rule, add it to `.gitignore`
yourself and `wt` will stay out of it entirely:

```gitignore
.git-worktrees/
```

The same applies if you point `basePath` somewhere else — ignore whatever path
you chose.

### Tailoring one repository

Only when a repo needs its own settings — run this **inside that repository**:

```bash
cd ~/code/my-project
wt init
```

That writes `.opencode/wt.json` and two hook scripts, then explains what is worth
editing and why. Most repositories never need it.

<details>
<summary>Installing into one project instead of globally</summary>

```bash
npm install --save-dev scionwood
npx wt install     # puts the global `wt` command in place
```

and add `"plugin": ["scionwood"]` to that project's `opencode.json`.

`wt install` also writes `~/.config/wt/config.json`, where you can put defaults
that apply to every repository. It will not put a second `wt` on your PATH if
npm already put one there.
</details>

<details>
<summary>Requirements</summary>

- [opencode](https://opencode.ai) — for the plugin half; the `wt` CLI works alone
- git, and `jq` (`brew install jq`)
- macOS for the terminal-launching behaviour; elsewhere `wt new` prints the `cd`
  line instead
- a code indexer such as [CodeGraph](https://github.com/) is optional — a tool
  whose binary is missing is skipped with a warning
</details>

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

Removes the codegraph data, symlinks, worktree, and branch — but only after checking that you are not about to lose anything. If the worktree has uncommitted changes, or the branch has commits that are not merged, teardown refuses and tells you what it found. Pass `--force` to discard them anyway.

## Commands

| Command | Description |
| --- | --- |
| `wt new <name> [--pr N \| --branch <ref> \| --from <ref>] [--no-open]` | Create `.git-worktrees/<name>`, bootstrap it, open opencode. With no source flag it branches from the repo's default branch. `wt new --pr N` auto-names the worktree `pr-N`. |
| `wt config [--layers]` | Print the effective config, and where each layer came from. |
| `wt init [--force]` | Write `<repo>/.opencode/wt.json`. |
| `wt list` | List open review worktrees and their branches. |
| `wt open <name>` | Open opencode in an existing worktree. |
| `wt bootstrap [name\|path]` | Re-run symlinks + codegraph indexing. Idempotent. |
| `wt clean [name\|path]` | Remove worktree artifacts only (symlinks + codegraph data), keep the worktree and branch. |
| `wt teardown [name\|path] [--force]` | Remove worktree, branch, and codegraph data. Refuses if the worktree is dirty or the branch has unmerged commits; `--force` discards them. Bare `wt teardown` tears down the worktree you're standing in. |
| `wt install [--config-home <dir>]` | Machine setup, once: the global `wt` command and `~/.config/wt/config.json`. Never writes into a repository. |
| `wt test` | Run the built-in smoke tests (throwaway repo, no side effects). |
| `wt --version` | Show the version and which `wt` you are running. |

Name-based commands work from any directory, and bare commands work from anywhere inside a worktree, including its subdirectories. Paths are also accepted (e.g. `wt teardown .git-worktrees/review-pr-1234`).

### Zero tokens

The plugin never invokes the model. It registers no tool, injects nothing into any
prompt, and ships no slash commands — its whole surface is three non-model hooks
(`config`, `shell.env`, `event`) that set environment variables and a permission rule.

Worktree management is a command you run. Other opencode worktree plugins hand the
agent a `worktree_create` tool and spend model tokens on every decision; this one
cannot, because it never had the tool. A test enforces it.

## Config

Six keys. Everything optional — with no config at all, `wt new spike-auth` works.

```json
{
  "basePath": ".git-worktrees",
  "branchPrefix": "wt/",
  "prRef": "pull/{n}/head",
  "filesToLink": ["CLAUDE.local.md", ".claude/settings.local.json", ".env"],
  "hooks": {
    "postCreate": ".opencode/hooks/post-create.sh",
    "preTeardown": ".opencode/hooks/pre-teardown.sh"
  },
  "tools": {
    "codegraph": {
      "detect": "codegraph",
      "dataDir": ".codegraph",
      "setup": "codegraph init -i && codegraph sync"
    }
  }
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `basePath` | `.git-worktrees` | Directory under the repo root where worktrees are created. |
| `branchPrefix` | `wt/` | Branch name = `${branchPrefix}${worktree-name}`. |
| `prRef` | `pull/{n}/head` | Ref that `--pr N` fetches. GitLab: `merge-requests/{n}/head`. |
| `filesToLink` | `[CLAUDE.local.md, .claude/settings.local.json, .env]` | Repo-relative paths symlinked from the main repo into each worktree. |
| `hooks.postCreate` | — | Script or command run in a new worktree. |
| `hooks.preTeardown` | — | Script or command run before a worktree is removed. |
| `tools` | codegraph | Per-worktree tooling. See [docs/extending.md](docs/extending.md). |

Placeholders usable in `tools` values: `{name}`, `{worktree}`, `{mainRoot}`,
`{branch}`, `{dataDir}`.

### Where config comes from

Four layers, lowest precedence first:

```
built-in defaults
  ← ~/.config/wt/config.json      your defaults, every repo, not in git
    ← <repo>/.opencode/wt.json    this project, committed, optional
      ← WT_* env vars             this invocation
```

`wt config` prints the effective result; `wt config --layers` also shows which
file each layer came from.

**Merge rules.** Maps merge by key, arrays union preserving order. A `!`-prefixed
name removes something you inherited — an array entry or a map key:

Your global config:

```json
{ "filesToLink": ["CLAUDE.local.md", ".env"] }
```

A repository's config:

```json
{ "filesToLink": [".env.test", "!.env"], "tools": { "!codegraph": true } }
```

Effective result: `filesToLink` is `["CLAUDE.local.md", ".env.test"]`, and the
built-in `codegraph` tool is removed. So a repo can add to what you inherited,
and drop what it does not want, without restating the rest.

## Environment overrides

| Variable | Overrides |
| --- | --- |
| `WT_BASE` | `basePath` |
| `WT_BRANCH_PREFIX` | `branchPrefix` |
| `WT_PR_REF` | `prRef` |
| `WT_FILES_TO_LINK` | `filesToLink` (comma-separated) |

Plus runtime controls:

| Variable | Default | Meaning |
| --- | --- | --- |
| `WT_OPEN` | `auto` | How opencode is launched after `new`/`open`. `auto`: same tab from a real terminal, otherwise a new tab (iTerm2) / window (Ghostty). `exec`: always same tab. `tab`: force new tab. `none`: print the `cd` line only. |
| `WT_MAIN_ROOT` | autodetected | Act on this repository instead of the one containing your current directory. |
| `WT_CONFIG_HOME` | `~/.config` | Where the global config and trust record live. |
| `WT_BIN` | — | Install target directory for `wt install`. |

Precedence: **env > repo file > global file > built-in default**.


## How isolation works

- **Tools**: each `tools` entry's `env` is exported around its `setup`/`teardown`, injected into every shell command in the worktree, and injected into any local MCP server whose name or command matches the tool key. The shipped `codegraph` entry uses this to give each worktree its own index. Remove it with `"tools": { "!codegraph": true }`, or add your own — see [docs/extending.md](docs/extending.md).
- **Ignored files**: paths in `filesToLink` are symlinked from the main repo into each worktree. Real files in the worktree are never overwritten; only previously created symlinks are replaced or removed.
- **Permissions**: the plugin adds an `external_directory` allow rule for the main repo root, so reads through the symlinks work inside the worktree.
- **Teardown safety**: only symlinks are deleted (never real files); branches are removed only when git allows it.

## Testing

```bash
# Bash CLI integration tests (37 groups, no side effects)
wt test

# Plugin unit tests (42 tests, requires bun)
npm test
# or: bun test ./.opencode/plugins/scionwood.test.ts
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
git clone https://github.com/selcukusta/scionwood
cd scionwood
npm install     # dev dependencies
npm run build   # dist/ is built here, and again automatically on pack/publish
npm test        # bun + bash
npm pack --dry-run   # verify the published tarball

vhs assets/demo.tape # re-render the README demo after changing CLI output
```

The package is `scionwood`. The build emits `dist/plugin.js`, `dist/plugin.d.ts`, `dist/index.js` (default-export wrapper), and `dist/scripts/wt` (executable bash CLI).

## License

[MIT](LICENSE)