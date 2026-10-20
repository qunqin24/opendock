# Git Autocommit Plugin for OpenCode

[![npm version](https://badge.fury.io/js/opencode-git-autocommit.svg)](https://www.npmjs.com/package/opencode-git-autocommit)

An OpenCode plugin that automatically commits changes when your coding session ends.

Requires OpenCode v2 (uses the `@opencode/plugin` v2 plugin API).

## What It Does

This plugin monitors your OpenCode session and automatically creates git commits when:

1. The session finishes a run (succeeded, failed, or interrupted)
2. There are uncommitted changes in your working directory
3. A git repository exists (or can be initialized)

Commit messages are derived from the staged diff itself, so they are deterministic and cost nothing to produce.

## Features

- **Automatic Commits** - Commits as soon as a session run reaches a terminal state
- **Diff-Derived Messages** - Build Conventional Commit subjects from the staged diff, with no model call and no guessing from conversation prose
- **Type Inference** - Picks `feat`, `fix`, `test`, `docs`, or `chore` from the change shape and the paths involved
- **Representative File** - Leads with the most meaningful path, ranking source over tests over docs over build output
- **Auto-initialize** - Automatically initializes a git repository if one doesn't exist
- **Respects .gitignore** - Git handles ignored files automatically
- **Identity Fallback** - Commits with a bot identity only when the machine has no `user.email` configured
- **Bypasses Hooks** - Uses `--no-verify` so auto-commits never block on hooks
- **Serializes Per Directory** - Queues commits per working directory so concurrent sessions can't collide

## Installation

### Via Command Line
```bash
opencode plugin add opencode-git-autocommit@latest
```

### Via Configuration
Add to your `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-git-autocommit@latest"
  ]
}
```

### Manual Installation
If you manage dependencies yourself, install the package and reference it by name:

```bash
npm install opencode-git-autocommit
```

Then add to `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-git-autocommit"
  ]
}
```

## How It Works

1. A terminal session event (`session.execution.succeeded`, `.failed`, or `.interrupted`) arrives
2. `git status --porcelain` checks for uncommitted changes; if the directory isn't a repository yet, one is initialized
3. Everything is staged with `git add .`, so new files are included in the description
4. `git diff --cached --name-status` and `--numstat` describe the staged change set
5. Paths and line deltas determine the Conventional Commit type and the file list
6. The commit is created with `--no-verify`

### Message Format

Subjects follow Conventional Commits and are capped at 72 characters:

```
<type>: <verb> <files>
```

| Situation | Example |
| --- | --- |
| Only files added | `feat: add src/brand-new.ts` |
| Mixed edits | `fix: update src/a.ts and README.md` |
| Only tests touched | `test: update src/a.test.ts` |
| Only docs touched | `docs: update README.md` |
| Only deletions | `chore: remove src/gone.ts` |
| Lockfiles / `dist/` / CI config only | `chore: update dist/index.js` |
| More than two files | `fix: update src/one.ts and 5 more files` |

Type inference is purely structural, which keeps it predictable:

- `test` - every changed path looks like a test (`*.test.*`, `__tests__/`, `spec/`)
- `docs` - every changed path looks like documentation (`*.md`, `docs/`)
- `chore` - build output, lockfiles, CI config, or deletions only
- `feat` - every changed path is newly added
- `fix` - anything else, meaning existing files were modified

Because messages come from the diff rather than the model's last sentence, they never inherit stray markup, backticks, or file paths mangled by sanitizing. If diff parsing fails for any reason, the plugin falls back to `chore: automated update` and logs the reason at debug level instead of failing the commit.

## Configuration

The plugin works out of the box with no configuration needed. Just install and it will start auto-committing.

To disable it for a project, remove its id from the plugin list:

```json
{
  "plugins": ["*", "-git-autocommit"]
}
```

## Notes

Messages describe *what changed*, not *why*. They are structural by design: deterministic, free, and unable to fail. If you want prose messages, layer a model call on top of this rather than replacing it.

## Requirements

- OpenCode v2 or later with plugin support
- Node.js (for running the plugin)
- Git installed on your system

## License

MIT