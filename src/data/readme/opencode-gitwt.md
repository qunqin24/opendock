# opencode-gitwt

OpenCode adapter for `gitwt`. It exposes the shared worktree core as agent tools:
https://github.com/voischev/gitwt

Requires Node.js 22.14+ and Git. Supports OpenCode 1.19.3–<2.

## Use in OpenCode

Add the plugin to your project's `opencode.json`, then restart OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-gitwt@latest"]
}
```

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

The plugin uses the shared gitwt configuration: `.gitwt.jsonc` in the project
and `~/.config/gitwt/config.jsonc` globally. Options include `remote`, `base`,
`prefix`, `worktreeDir`, and `hooks`. See the core repository for details.

For the standalone `gitwt` command, run `npm install -g @voischev/gitwt`.
Upgrading from 0.1.x: move `.opencode/gitwt.jsonc` to `.gitwt.jsonc` and global
settings from `~/.config/opencode/gitwt.jsonc` to `~/.config/gitwt/config.jsonc`.

## Development

GitHub is the primary repository; SourceCraft is a mirror. Releases publish to
npm from GitHub with `NPM_TOKEN`.

Run `npm ci --ignore-scripts`, `npm run check`, and `npm test`.
