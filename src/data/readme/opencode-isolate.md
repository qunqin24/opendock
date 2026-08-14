# opencode-isolate

[日本語版 README](./README.ja.md)

An OpenCode plugin that isolates agent work into a git worktree, without leaving your session.

Ask the agent to start working on a branch, and the rest of the conversation continues in an independent working directory under `.worktrees/<branch>/`. Your main checkout, including any uncommitted changes you have there, stays untouched.

## Why

When an agent edits files directly in your checkout, its changes mix with yours: you cannot review them separately, switching branches conflicts with your open editor, and a failed experiment leaves debris behind. Git worktrees solve this by giving each branch its own directory, but managing them by hand (creating, ignoring, navigating) is tedious enough that few people bother.

This plugin makes the isolation a single sentence. The session you are already in simply continues inside the worktree: no new terminal, no new session, no lost conversation context.

## What it does

The plugin provides one tool, `worktree_start`. When the agent calls it with a branch name, the tool:

1. Creates a git worktree at `.worktrees/<branch>/` under the repository root. The branch is created if it does not exist, and reused if it does.
2. Appends `.worktrees/` to `.git/info/exclude`, so worktrees never show up in `git status`. Your shared `.gitignore` is left alone.
3. Switches the current session's working directory to the worktree. Every file edit and shell command from that point on runs inside the isolated directory.

The tool is idempotent: calling it again with the same branch name reuses the existing worktree and simply switches the session there. When the work is merged, remove the directory with `git worktree remove`.

## Installation

Add the package name to the `plugin` array in your `opencode.json`. OpenCode installs it automatically on startup.

```json
{
  "plugin": ["opencode-isolate"]
}
```

## Usage

In an OpenCode session, ask for isolated work with a branch name:

```text
Use worktree_start to work on the 123-fix-login-bug branch
```

The agent creates the worktree, the session moves there, and you continue the conversation as usual. Meanwhile your original checkout remains exactly as you left it.

## Limitations

The session switch works by updating OpenCode's local session database, which is an internal detail of OpenCode rather than a public API. A future OpenCode release could change this schema; if the switch stops working, please file an issue.

## Development

This project uses [Bun](https://bun.sh). Run the tests with:

```sh
bun test
```

## License

MIT License. See [LICENSE](./LICENSE) for details.
