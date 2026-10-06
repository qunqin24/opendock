# opencode-worktree-tools

**Gives the agent three tools to make, list and remove git worktrees, so parallel or risky work happens in its own checkout instead of your working tree.** It's the OpenCode counterpart of Claude Code's worktrees, and it puts them in the same place: `<repo>/.claude/worktrees/<name>`.

It stays out of the way:

- **Tools only.** Nothing is added to the system prompt, so the model reaches for a worktree when isolation actually helps, not on every task.
- **No new terminals or sessions.** The session keeps running where it is and works in the worktree by using its absolute path as the shell `workdir` and in file paths.
- **Your repo isn't edited.** `.claude/worktrees/` is ignored through `.git/info/exclude`, not `.gitignore`.
- **Nothing is lost on cleanup.** Removing a worktree refuses when it has uncommitted changes (unless `force` is set), and its branch is only deleted when it's fully merged.

## Tools

| Tool              | What it does                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `worktree_create` | Creates `.claude/worktrees/<name>` on branch `<name>`, from the current HEAD or a given `base`. |
| `worktree_list`   | Lists those worktrees with their branch and whether they have uncommitted changes.              |
| `worktree_remove` | Removes one, and deletes its branch only if it's merged.                                        |

Dependencies such as `node_modules` aren't copied into a new worktree; the agent is told to install them there if needed.

## Install

```sh
opencode plugin opencode-worktree-tools -g
```

Drop `-g` for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL https://raw.githubusercontent.com/moritzWa/opencode-worktree-tools/main/index.js \
  -o ~/.config/opencode/plugins/worktree-tools.js
```

Files in `~/.config/opencode/plugins/` load automatically. The plugin imports `@opencode-ai/plugin`, which OpenCode installs into that config folder.

## License

MIT
