# opencode-gitwt

OpenCode adapter for `gitwt`. It exposes the shared worktree core as agent tools:
https://github.com/voischev/gitwt

Requires Node.js 22.14+ and Git. Supports OpenCode V1 (1.19.3+) and V2 (2.2.5+).

## Use in OpenCode

For **OpenCode V2**, add to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-gitwt@latest"]
}
```

For **V1**, use `"plugin": ["opencode-gitwt@latest"]` instead. Restart OpenCode
after installation. Both versions expose the same four gitwt tools.

Ask the agent in chat, for example:

> Create a worktree on branch feature/login from main, fix the login issue there,
> and run the tests. Keep the worktree for review.

The agent calls `gitwt_create` with `{"branch":"feature/login","base":"main"}`.
Use the returned `worktreePath` as the cwd for commands and as the base for
absolute paths in file operations. Continue in the same session; approve access
to that directory if OpenCode asks. `gitwt_cd` only returns the path and does not
change the session directory. Use `gitwt_list` to inspect copies and
`gitwt_remove` only on explicit request when the worktree is no longer in use.

## Tools

- `gitwt_create` creates and verifies a worktree.
- `gitwt_list` shows registered worktrees with optional status.
- `gitwt_cd` resolves a branch or full path without changing cwd.
- `gitwt_remove` removes a worktree explicitly, optionally with `force`.

## Configuration

The plugin uses plain JSON: `.gitwt.json` in the project
and `~/.config/gitwt/config.json` globally. Options include `remote`, `base`,
`prefix`, `worktreeDir`, and `hooks`. See the core repository for details.

For the standalone `gitwt` command, run `npm install -g @voischev/gitwt`.
Move existing settings to these paths and remove comments and trailing commas.

## Why use it with OpenCode V2?

V2 already has native worktree tools, setup commands, and session moves.
Use gitwt when you want:

- **One workflow across agents:** the same standalone CLI, Node API, and JSON
  contract in OpenCode, Codex, Claude Code, and scripts.
- **Named branches from a fresh remote base:** gitwt fetches the selected base
  and verifies path, branch, and commit before setup. V2's built-in Git strategy
  creates a detached checkout from a local ref or HEAD, without fetching.
- **Per-worktree lifecycle hooks:** saved `postCreate` and `preRemove` commands;
  teardown failure blocks removal through gitwt, even with `--force`.

Prefer native V2 features for integrated UI navigation and actual session moves.
Native removal does not run gitwt's teardown hooks: remove gitwt-managed copies
through `gitwt_remove` or the CLI when those hooks matter.

Comparison verified against OpenCode V2.2.5's built-in Git strategy:
https://github.com/anomalyco/opencode/blob/v2.2.5/packages/core/src/worktree.ts
