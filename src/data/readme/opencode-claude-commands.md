# opencode-claude-commands

An [OpenCode](https://opencode.ai) plugin that automatically loads slash commands from `.claude/commands` and `.claude/skills` directories, making them available as native OpenCode commands with full autocomplete support.

If you have existing Claude Code commands or skills, this plugin lets you use them in OpenCode without any manual conversion.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-claude-commands"]
}
```

Or with options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-claude-commands",
      {
        "prefix": "claude-",
        "includeUserLevel": true,
        "includeSkills": true,
        "defaultAgent": "build",
        "compactCommands": true,
        "modelMap": {
          "sonnet": "anthropic/claude-sonnet-4-5"
        }
      }
    ]
  ]
}
```

## How it works

On startup, the plugin:

1. Scans for `.claude/commands/*.md` files (recursively) in your project
2. Scans for `.claude/skills/*/SKILL.md` files in your project
3. Optionally scans `~/.claude/commands/` and `~/.claude/skills/` for user-level commands
4. Converts each file to an OpenCode command and registers it via the config hook

The commands then appear in OpenCode's `/` autocomplete menu like any other native command.

### Compact mode

By default, `compactCommands` is enabled. In this mode, the chat only shows a short message like `Running /translate...` instead of dumping the full command template. The full prompt is still sent to the LLM behind the scenes via the `command.execute.before` hook.

Set `compactCommands` to `false` to show the full template text in the chat (matching native OpenCode command behavior).

## What gets converted

### Placeholders

| Claude Code      | OpenCode                    | Notes                                               |
| ---------------- | --------------------------- | --------------------------------------------------- |
| `$ARGUMENTS`     | `$ARGUMENTS`                | Compatible, no change                               |
| `$0`, `$1`, `$2` | `$1`, `$2`, `$3`            | Shifted +1 (Claude is 0-based, OpenCode is 1-based) |
| `$ARGUMENTS[0]`  | `$1`                        | Converted to OpenCode positional args               |
| `` !`cmd` ``     | `` !`cmd` ``                | Compatible, no change                               |
| ` ```! ` blocks  | Multiple `` !`cmd` `` lines | Multi-line shell blocks are expanded                |

### Frontmatter

| Claude Code field          | OpenCode mapping | Notes                                                                                             |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `description`              | `description`    | Direct mapping                                                                                    |
| `model`                    | `model`          | Shorthand names (`sonnet`, `haiku`, `opus`) are resolved to full OpenCode model IDs automatically |
| `agent`                    | `agent`          | Passed through as-is; OpenCode handles unknown agents                                             |
| `context: fork`            | `subtask: true`  | Subagent execution                                                                                |
| `allowed-tools`            | Dropped          | No OpenCode equivalent                                                                            |
| `effort`                   | Dropped          | No OpenCode equivalent                                                                            |
| `paths`                    | Dropped          | No OpenCode equivalent                                                                            |
| `disable-model-invocation` | Dropped          | No OpenCode equivalent                                                                            |
| `user-invocable`           | Dropped          | No OpenCode equivalent                                                                            |

### Model resolution

Claude Code commands often use shorthand model names like `sonnet` or `haiku`. The plugin automatically resolves these to full OpenCode model IDs using a built-in mapping of known Anthropic model families, always selecting the latest version:

| Shorthand | Resolves to                   |
| --------- | ----------------------------- |
| `opus`    | `anthropic/claude-opus-4-6`   |
| `sonnet`  | `anthropic/claude-sonnet-4-6` |
| `haiku`   | `anthropic/claude-haiku-4-5`  |

Full model IDs (containing `/`) are passed through as-is.

If a shorthand can't be resolved, the command falls back to your default model and a toast warning is shown when the command is executed.

You can override the mapping with the `modelMap` plugin option:

```json
[
  "opencode-claude-commands",
  {
    "modelMap": {
      "sonnet": "anthropic/claude-sonnet-4-5",
      "haiku": "some-other-provider/custom-model"
    }
  }
]
```

### Command naming

| Source                              | Command name     |
| ----------------------------------- | ---------------- |
| `.claude/commands/test.md`          | `/test`          |
| `.claude/commands/frontend/lint.md` | `/frontend-lint` |
| `.claude/skills/review/SKILL.md`    | `/review`        |

With the `prefix` option set to `"claude-"`:

| Source                              | Command name            |
| ----------------------------------- | ----------------------- |
| `.claude/commands/test.md`          | `/claude-test`          |
| `.claude/commands/frontend/lint.md` | `/claude-frontend-lint` |

## Options

| Option             | Type                     | Default     | Description                                                                                               |
| ------------------ | ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------- |
| `prefix`           | `string`                 | `""`        | Prefix added to all imported command names. Use this to avoid collisions with existing OpenCode commands. |
| `includeUserLevel` | `boolean`                | `true`      | Also scan `~/.claude/commands/` and `~/.claude/skills/` for user-level commands.                          |
| `includeSkills`    | `boolean`                | `true`      | Also scan `.claude/skills/*/SKILL.md` directories.                                                        |
| `defaultAgent`     | `string`                 | `"build"`   | Fallback agent used when a Claude command specifies an agent that doesn't exist in OpenCode.              |
| `compactCommands`  | `boolean`                | `true`      | Show a short message in chat instead of the full template. The full prompt is still sent to the LLM.      |
| `modelMap`         | `Record<string, string>` | `undefined` | Override model name resolution. Keys are shorthand names, values are full OpenCode model IDs.             |

## Collision handling

If a `.claude/commands` file would create a command with the same name as an existing OpenCode command, the **existing OpenCode command takes precedence**. The plugin will not overwrite it.

To avoid collisions, use the `prefix` option to namespace imported commands.

## Limitations

- Claude-specific variables like `${CLAUDE_SKILL_DIR}` and `${CLAUDE_SESSION_ID}` are left as-is in the template (they will appear as literal text)
- Claude frontmatter fields without an OpenCode equivalent (`allowed-tools`, `effort`, `paths`, etc.) are silently dropped
- Skill supporting files (templates, scripts alongside `SKILL.md`) are not automatically included — only the `SKILL.md` content is used
- The `ultrathink` keyword has no effect in OpenCode

## License

MIT
