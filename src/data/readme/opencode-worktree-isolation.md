# opencode-worktree-isolation

![CI](https://github.com/earneet/opencode-worktree-isolation/actions/workflows/ci.yml/badge.svg)

> Eliminate path drift in [opencode](https://opencode.ai) with tool-layer worktree interception.

## The Problem

When an AI coding agent works on a task in your repository, it needs to write files in the right place. Without isolation, parallel agents stomp on each other's changes. With git worktrees, each agent gets its own working directory — but existing solutions either spawn separate processes (losing conversation context) or rely on the agent remembering to `cd` (path drift).

**Path drift** is when the agent thinks it's writing to the worktree but actually writes to the repo root — or vice versa. It's the #1 frustration with worktree-based workflows.

## The Solution

This plugin uses opencode's `tool.execute.before` hook to **transparently rewrite file paths** at the tool layer. When a session is bound to a worktree, every `write`/`edit`/`read`/`glob`/`grep`/`bash` call is automatically routed to the worktree directory. The agent doesn't need to remember anything — the plugin handles it.

### Dual-Layer Defense

1. **System prompt (primary)**: When a session enters a worktree, the plugin injects an authoritative system prompt telling the agent its working directory has changed. The agent naturally generates worktree-relative paths.

2. **Path rewriting (safety net)**: If the agent occasionally generates a repo-root path out of habit, the `tool.execute.before` hook silently rewrites it to the worktree. The agent never notices.

This combines the best of both worlds: the agent's primary behavior is correct (it knows it's in a worktree), and the rare mistakes are caught by hard enforcement.

## Installation

### Requirements

- [opencode](https://opencode.ai) v1.18+
- git 2.5+
- Node.js 20+ or Bun

### Setup

**Option A: Git URL (recommended — auto-installs on opencode startup)**

Add the plugin to your `opencode.json` (project-level or global `~/.config/opencode/opencode.json`):

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugin": [
        "opencode-worktree-isolation@git+https://github.com/earneet/opencode-worktree-isolation.git"
    ]
}
```

opencode automatically clones the repo and installs dependencies on startup. No manual steps needed.

**Option B: Local clone**

```bash
git clone https://github.com/earneet/opencode-worktree-isolation.git
cd opencode-worktree-isolation
npm install
```

Then register with an absolute path:

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugin": [
        "/absolute/path/to/opencode-worktree-isolation/dist/index.js"
    ]
}
```

## Usage

### Create a worktree

Ask the agent to call `worktree_prepare`, or use it directly:

```
worktree_prepare(title="fix authentication bug")
```

This creates a git worktree, binds the current session to it, and from this point on, all file operations are routed to the worktree.

### Work normally

After `worktree_prepare`, just use file tools as usual. Writes, edits, reads, globs, greps, and bash commands all land in the worktree automatically. The agent knows it's in the worktree (via system prompt) and generates correct paths.

### Merge your work

When the task is complete and you want to integrate the changes back:

```
worktree_merge(action="preview")   // review the merge plan (target branch, commits, diff)
worktree_merge(action="apply")     // merge + auto-cleanup + unbind
```

`worktree_merge` merges the worktree's branch into the main checkout's current branch, then automatically removes the worktree, deletes the branch, and unbinds the session. Any uncommitted changes in the worktree are auto-committed first (so no work is lost). If the merge hits conflicts, it aborts safely and leaves the repo clean.

After merging, the session is unbound and file operations target the repo root again. Use `worktree_cleanup` instead when you want to discard a worktree without merging.

### Clean up

When the task is done:

```
worktree_cleanup(action="preview")                    // see what's ready to clean
worktree_cleanup(action="apply", branch="wt/fix-auth") // remove a specific worktree
worktree_cleanup(action="apply")                       // remove all merged worktrees
```

Cleanup only removes worktrees whose branches are merged into the base branch (unless `force=true`).

### Escape Hatches (strict modes only)

When `strictWrites=true` is enabled, all main-checkout writes without a binding are blocked. Two escape hatches let the agent (or you) write repo-level config/docs without entering a worktree:

**Permanent whitelist** (sidecar config, no expiry):
```json
{ "mainWriteWhitelist": ["AGENTS.md", "docs/**/*.md", ".github/workflows/*.yml"] }
```
Dangerous patterns (`*`, `/`, `.`, `.git`, `**`) are auto-rejected with an stderr warning.

**Temporary allow** (per-call, TTL + audit):
```
worktree_allow(action="add", path="README.md", reason="update docs header", ttlMinutes=30)
worktree_allow(action="list")
worktree_allow(action="clear")
```
Each `add` is audited to `<state-dir>/<projectId>.audit.jsonl` with type `allow_add`. Dangerous paths (`.git`, repo root, `*`) are rejected.

## Configuration

Optional sidecar config at `.opencode/worktree-workflow.json` in your repo root:

```json
{
    "branchPrefix": "wt/",
    "baseBranch": null,
    "worktreeRoot": null,
    "protectedBranches": [],
    "sync": {
        "copyFiles": [".env"],
        "symlinkDirs": ["node_modules"]
    },
    "hooks": {
        "postCreate": ["npm install"],
        "preDelete": []
    },
    "stateLocation": "external",
    "strictWrites": false,
    "strictGitOps": false,
    "mainWriteWhitelist": [],
    "allowlistTtlMinutes": 60,
    "sessionStartNudge": false
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `branchPrefix` | `"wt/"` | Prefix for generated branch names |
| `baseBranch` | `null` (auto-detect) | Base branch for new worktrees |
| `worktreeRoot` | `~/.local/share/opencode/worktree` | Root directory for worktrees. Supports `$REPO`, `$HOME` |
| `protectedBranches` | `[]` | Branches that cleanup will never remove (also used by `strictGitOps`) |
| `sync.copyFiles` | `[]` | Files to copy from repo root into new worktrees |
| `sync.symlinkDirs` | `[]` | Directories to symlink (junction on Windows). Safely removed before `git worktree remove` to prevent junction-following recursive delete. |
| `hooks.postCreate` | `[]` | Shell commands to run after worktree creation |
| `hooks.preDelete` | `[]` | Shell commands to run before worktree removal |
| `stateLocation` | `"external"` | Where to store session bindings. `"external"` = `~/.local/share/opencode/worktree-workflow/` (single file per project). `"git-common"` = `<git-common-dir>/worktree-isolation/` (one file per session, shares state across all linked worktrees). |
| `strictWrites` | `false` | When `true`, Write/Edit to the main checkout without an active worktree binding is blocked. Read is always allowed. |
| `strictGitOps` | `false` | When `true`, blocks `git push/merge/rebase/pull` on protected branches, `git checkout` to protected branches inside a worktree, and `git branch -d/-D`. |
| `mainWriteWhitelist` | `[]` | Glob patterns (relative to repo root) for paths that can always be written to the main checkout without a worktree binding. Dangerous patterns (`*`, `/`, `.`, `.git`, `**`) are auto-rejected with an stderr warning. |
| `allowlistTtlMinutes` | `60` | Default TTL (minutes) for entries added via `worktree_allow`. |
| `sessionStartNudge` | `false` | Inject a discipline prompt at session start even when no binding exists (useful with strict modes). |

### Strict Mode

By default, the plugin is **opt-in**: sessions without a worktree binding behave exactly as if the plugin weren't installed. This preserves backward compatibility.

Enable strict modes when you want to enforce worktree discipline:

```json
{
    "strictWrites": true,
    "strictGitOps": true,
    "protectedBranches": ["master", "main", "release/*"]
}
```

**`strictWrites=true`** — Write/Edit tools targeting the main checkout without a binding throw an error. The agent must call `worktree_prepare` first, or the path must match `mainWriteWhitelist`, or a temporary `worktree_allow` entry must cover it. Read is never blocked.

**`strictGitOps=true`** — The bash hook recognizes (via regex) `git push`, `git merge`, `git rebase`, `git pull`, `git checkout`, `git switch`, `git branch -d/-D` and blocks operations on protected branches. `master` and `main` are always treated as protected (hardcoded safety net), plus any branches in `protectedBranches`.

> ⚠️ **Known limitation**: only commands starting directly with `git` are recognized. Compound commands like `cd x && git merge` bypass the check. This matches zcode-worktree-guard's behavior and is documented as "raising the bar" rather than absolute defense.

## How It Works

### Interception Rules

When a session is bound to a worktree (path `W`, repo root `R`):

| Tool | Behavior |
|------|----------|
| `write` / `edit` / `read` | Absolute paths under `R` are rewritten to `W`. Paths under `R/.git` are blocked. |
| `glob` / `grep` | Missing `path` is set to `W`. Paths under `R` are rewritten to `W`. |
| `bash` | Missing `workdir` is set to `W`. Repo-root paths in the command string are replaced with `W`. |
| `task` (subagents) | Subagent sessions inherit the binding via parent-chain traversal. |

### Subagent Inheritance

When a bound session spawns subagents via `task()`, the subagent's session automatically inherits the worktree binding. This is done via lazy parent-chain traversal: on the subagent's first tool call, the plugin walks the `parentID` chain to find an ancestor with a binding, then copies that binding to the subagent.

### Windows Support

- Path comparisons are case-insensitive with separator normalization
- `symlinkDirs` uses junctions on Windows (no admin privileges needed)
- Hooks run via `cmd /d /c` on Windows, `bash -c` elsewhere

## Limitations

- **No TUI indicator**: opencode 1.18's plugin API doesn't support dynamic session title/metadata updates, so the worktree branch isn't visible in the status bar. The agent's responses will mention the worktree context.
- **One worktree per session, many sessions per repo**: A single session can be bound to one worktree at a time, but multiple sessions can run in parallel against different worktrees of the same repo. The plugin guards against dangling references: cleanup/merge refuse to delete a worktree that's still bound by another session.
- **Bash path replacement is string-based**: Complex command strings with unusual path formats (8.3 short names, mixed separators) may not be fully rewritten. The plugin blocks commands where residual repo-root paths are detected after replacement.
- **`strictGitOps` is regex-based**: Only commands starting directly with `git` are recognized. Compound commands like `cd x && git merge` bypass the check. This is documented as "raising the bar" rather than absolute defense (matches zcode-worktree-guard's behavior).
- **`git-common` state location**: Requires `git rev-parse --git-common-dir` to succeed. Bare repos and unusual worktree configurations may fail; fall back to `"external"` if so.
- **Audit log contains absolute paths**: The audit jsonl records paths as-is (including local usernames like `C:/Users/jane/...`). Redact manually before sharing.

## Testing

The plugin ships with a test suite using Node's built-in test runner (zero extra dependencies):

```bash
npm install
npm test
```

- **Unit tests** (`test/unit.test.js`): path normalization/containment/rewriting, branch-name validation (option/path-traversal injection), slugify, and the `applyInterception` logic for every intercepted tool (write/edit/read/glob/grep/bash), including `.git` blocking and bash repo-root replacement.
- **Integration tests** (`test/lifecycle.test.js`): full lifecycle against a real temporary git repo — prepare → interception → merge preview/apply → cleanup — with state and worktree directories isolated via `OC_WT_STATE_DIR` / `OC_WT_ROOT` env vars.

## TypeScript

The plugin source is written in TypeScript (`src/`) and compiled to `dist/` via `tsc`. The `prepare` npm lifecycle hook auto-builds on `npm install`, so git URL consumers get the compiled output automatically. For local clone users, run `npm run build` after installing.

Type checking (without emitting): `npm run typecheck`.

## Design

See [docs/design.md](docs/design.md) for the full design document, including contract evidence, interception rule derivation, and the probe-based methodology used to verify the opencode plugin runtime contract.

## License

MIT
