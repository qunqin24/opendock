# opencode-branch-session

> Stateless branch guard for OpenCode.
> Blocks file writes and dangerous git on protected branches; gates `git merge`
> behind a one-shot user approval.

[![npm version](https://img.shields.io/npm/v/@oldsuns/opencode-branch-session.svg)](https://www.npmjs.com/package/@oldsuns/opencode-branch-session)
[![license](https://img.shields.io/github/license/OldSuns/opencode-branch-session.svg)](./LICENSE)

[简体中文](./README.zh-CN.md) · **English**

---

## TL;DR

- On protected branches (default `main` / `master`): the agent **cannot** run
  `Edit` / `Write` etc., and almost every git subcommand is rejected. Only
  `git checkout -b <name>` / `git switch -c <name>` and a small read-only
  allowlist are permitted.
- On every branch: a global blocklist refuses `push` / `pull` / `fetch` /
  `reset --hard` / `rebase` / `cherry-pick` / `filter-branch` / `reflog` / `gc`
  / `remote add|remove|rename|set-url` / `clean -fd`.
- `git merge` (any branch) is gated behind `/finish-branch` — a user-issued
  slash command that drives a complete wrap-up (commit / merge / optional
  branch deletion). The one-shot approval token inside the flow is consumed
  by the next merge.
- The plugin is **stateless**. There is no plan file, no session, no
  persistence; every decision is made live from git.

## Why

A typical OpenCode session lets the agent edit any file on whatever branch it
happens to be on. If you forgot to switch branches, work lands on `main`. If
the agent decides to "tidy up" with `git reset --hard` or `git push --force`,
your repo state is at risk.

This plugin makes the editing rules **enforceable from outside the agent**:

1. The agent literally cannot run `Edit` / `Write` on a protected branch — the
   hook rejects the tool call before it reaches the filesystem.
2. The agent literally cannot run dangerous git commands — the hook rejects the
   bash invocation.
3. The agent literally cannot run `git merge` without a user-issued
   `/finish-branch` token.
4. The agent is *told* about the rules via a system-prompt suffix, so it picks
   correct tools by default and only hits the hard wall on mistakes.

## How it works

The plugin attaches to OpenCode at three points:

```
                ┌───────────────────────────────────────────────────────┐
   user msg ───►│  experimental.chat.system.transform                   │
                │  → injects branch-aware rules into the system prompt  │
                └───────────────────────────────────────────────────────┘
                                       │
                                       ▼
                ┌───────────────────────────────────────────────────────┐
   agent wants  │  tool.execute.before                                  │
   to call a    │  → blocks writes on protected branches                │
   tool         │  → blocks blocklist git on every branch               │
                │  → blocks non-allowlist git on protected branches     │
                │  → blocks `git merge` unless /finish-branch token set │
                └───────────────────────────────────────────────────────┘
                                       │
                                       ▼
                ┌───────────────────────────────────────────────────────┐
   user runs    │  command.execute.before                               │
 /finish-branch │  → injects wrap-up script + sets finishApproval=true  │
                │  → token consumed by the next `git merge` call        │
                └───────────────────────────────────────────────────────┘
```

The only mutable state is **one in-memory boolean** (`finishApproval`). It is
not persisted; restarting OpenCode resets it to `false`.

## Install

```bash
npm install @oldsuns/opencode-branch-session
```

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@oldsuns/opencode-branch-session", {
      "protectedBranches": ["main", "master"]
    }]
  ]
}
```

## Configuration

| Key | Type | Default | Meaning |
|---|---|---|---|
| `protectedBranches` | `string[]` | `["main", "master"]` | Branch name patterns. `*` matches any substring. Current branch matching any pattern is treated as protected. |
| `blockedGitCommands` | `string[]` | `["push", "pull", "fetch", "reset --hard", "clean -fd", "clean -fdx", "rebase", "cherry-pick", "filter-branch", "reflog expire", "reflog delete", "gc", "remote add", "remote remove", "remote rename", "remote set-url"]` | Git subcommands rejected on every branch. Glob via `*`. |
| `allowedGitCommands` | `string[]` | `[]` | Additional git subcommands permitted on protected branches, beyond the built-in read-only allowlist. |

### Built-in read-only git allowlist

Always permitted on protected branches (no config needed):

`status`, `log`, `branch`, `diff`, `show`, `stash list`, `stash show`,
`rev-parse`, `rev-list`, `ls-files`, `ls-tree`, `cat-file`, `tag -l`,
`tag --list`, `describe`, `shortlog`, `blame`, `config --get`, `config --list`,
`symbolic-ref`, `for-each-ref`, `reflog show`.

Plus `git checkout -b <name>` and `git switch -c <name>` so the agent can move
off the protected branch.

## Tool

### `branchstatus`

Read-only diagnostic. Shows whether the current branch is protected and what
the agent is permitted to do. Sample output on a protected branch:

```
Git repo:        true
HEAD branch:     main
Default branch:  main
Working tree:    clean
Protected:       yes — file writes blocked, only read-only git allowed

→ To start work, run:
      git checkout -b feat/<your-topic>
```

## Slash command

### `/finish-branch`

User-issued. Sets the in-memory `finishApproval` token to `true`. The token is
consumed (set back to `false`) by the next `git merge` invocation by the
agent. To merge twice, run `/finish-branch` twice.

The plugin will refuse any attempt by the agent to forge this approval (it is
delivered through OpenCode's slash command path, not through any tool the
agent can call).

## Typical flow

1. Agent starts on `main`. System prompt tells it: file writes are blocked,
   start by creating a working branch.
2. Agent runs `git checkout -b feat/foo`. Allowed by the read-only allowlist
   exception.
3. Agent edits, commits, etc. on `feat/foo`. All permitted.
4. When ready to merge, agent asks the user to enter `/finish-branch`
   (or `/finish-branch commit` if there are pending changes to commit).
5. User enters `/finish-branch`. Plugin injects the wrap-up script; the
   agent follows it (pre-flight, optional commit, ahead-check, asks merge
   style, runs `git merge`, asks about branch deletion).
6. Agent runs `git switch main && git merge feat/foo`. Plugin sees `merge`,
   sees the token, consumes it, lets it run.
7. Future merges require future approvals.

## Known limitations

- **Sequence parser**: bash commands are split on `;`, `&&`, `||`, `|`, `&`,
  newline. A novel construct (`eval`, here-docs, command substitution) could
  hide `git merge` from this parser. Same residual risk as any bash hook.
- **No persistence**: restarting OpenCode resets all approvals to `false`.
  This is by design — there is no concept of "approval that survives a
  restart".
- **No automatic merge**: this plugin does not run `git merge` for the agent.
  The agent runs it via bash; the plugin only allows or denies.

## License

MIT — see [`LICENSE`](./LICENSE).
