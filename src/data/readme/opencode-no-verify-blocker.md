# opencode-no-verify-blocker

An [OpenCode](https://opencode.ai) plugin that prevents AI agents from bypassing project pre-commit hooks via `git commit --no-verify` or `git commit -n`.

When the agent runs a bash tool call that looks like a `git commit` (or `git commit-tree`) with one of the forbidden flags, the plugin throws an error and the command never executes. The agent sees the error message and re-generates a clean command.

## Usage

Add the plugin to your `opencode.json` (project) **or** `~/.config/opencode/opencode.json` (global):

```jsonc
{
  "plugin": ["opencode-no-verify-blocker"],
}
```

With a custom error message (e.g. pointing to your project's AGENTS.md):

```jsonc
{
  "plugin": [
    [
      "opencode-no-verify-blocker",
      {
        "customMessage": "This project requires all commits to pass pre-commit hooks. See AGENTS.md.",
      },
    ],
  ],
}
```

## Detection

The plugin blocks both the long flag (`--no-verify`) and the short flag (`-n`, including merged forms like `-nm`). Detection only fires when the command looks like a `git commit` or `git commit-tree` — other commands (e.g. `echo -n`, `git push -n`) are not affected.

| Pattern                              | Detected?    |
| ------------------------------------ | ------------ |
| `git commit --no-verify -m "x"`      | yes          |
| `git commit -n -m "x"`               | yes          |
| `git commit -nm "x"` (merged flags)  | yes          |
| `git -C /repo commit -n`             | yes          |
| `git --git-dir=/repo/.git commit -n` | yes          |
| `git commit-tree --no-verify HEAD`   | yes          |
| `/usr/bin/git commit -n`             | yes          |
| `cd /tmp && git commit -n`           | yes          |
| `git commit -m "x"`                  | no (allowed) |
| `git push origin main`               | no (allowed) |
| `echo -n hi`                         | no (allowed) |
| `git log --grep=commit`              | no (allowed) |

## API

### `NoVerifyBlocker` / `noVerifyBlocker` (named exports)

```ts
import { NoVerifyBlocker } from "opencode-no-verify-blocker";
```

### `default` (default export)

```ts
import noVerifyBlocker from "opencode-no-verify-blocker";
```

All three are the same plugin function; pick whichever style your loader prefers.

### Options

| Option          | Type     | Default           | Description                                                                                               |
| --------------- | -------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| `customMessage` | `string` | (English default) | Error message thrown when a forbidden flag is detected. Use this to point users to project-specific docs. |

## How it works

The plugin registers a `tool.execute.before` hook. For every `bash` tool call:

1. Skip if the tool is not `bash`.
2. Skip if `args.command` is missing or empty.
3. If the command does **not** look like `git commit` / `git commit-tree`, allow it.
4. Otherwise, scan the command for `--no-verify` or short flag `-n` (in merged or standalone form).
5. If found, throw an error. Otherwise, allow it.

Detection uses a conservative whitespace tokenizer — we don't parse shell, which means we may flag commands inside unexecuted `echo` strings. False positives are tolerable (the user can rephrase), false negatives (missed `--no-verify`) are not.

## Known limitations

- **OpenCode issue #31680**: `output.args` in-place mutation does not work in OpenCode 1.17.7 / 1.17.8, so this plugin can only `throw`, not silently strip the forbidden flag. If you want the agent to commit anyway, the agent must regenerate the command without the flag.
- **OpenCode issue #6862**: the first message in a new session may not trigger `tool.execute.before`. If the first command is somehow bypassed, send a follow-up message and retry.
- **Shell parsing**: we do not parse quotes, escapes, subshells, or variables. A command like `git commit -m "$(echo --no-verify)"` will not be detected (and arguably shouldn't be, since it would still run the pre-commit hook).
- **Plugin SDK version**: requires `@opencode-ai/plugin >= 1.0.0` as a peer dependency.

## Why?

AI agents (especially when iterating on CI failures or linter errors) frequently add `--no-verify` to speed up the loop. This bypasses the project's quality gate. `opencode-no-verify-blocker` enforces that **nobody — including the AI — can skip pre-commit hooks**, while still letting the agent see the error and recover on the next iteration.

## License

MIT
