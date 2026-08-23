# opencode-claude-code-hooks

Run existing Claude Code command guardrails in OpenCode without copying their commands or settings.

## Install

Add the package to the OpenCode plugin array.

```json
{
  "plugin": ["opencode-claude-code-hooks"]
}
```

OpenCode installs the package when it starts. The plugin reads these Claude files at every tool call.

- `~/.claude/settings.json`
- `<git-root>/.claude/settings.json`
- `<git-root>/.claude/settings.local.json`

## Preserved behavior

- `PreToolUse` and `PostToolUse` command hooks
- Claude matcher names such as `Bash`, `Edit`, and `Write`
- exit code 2 blocking
- structured deny results
- full `updatedInput` replacement
- post-tool feedback and `additionalContext`
- the Claude default command timeout of 600 seconds
- `CLAUDE_PROJECT_DIR` set to the Git project root

Settings are read at runtime, so editing a Claude hook does not require reinstalling this plugin.

## Decision order

OpenCode runs `tool.execute.before` before its native permission check. The
permission matcher then sees the final arguments, including any `updatedInput`
returned by a Claude hook.

1. Matching Claude `PreToolUse` command hooks run.
2. Exit code 2 or a structured deny stops the call.
3. A structured `updatedInput` replaces the tool arguments.
4. OpenCode applies its own permission rules to those final arguments.
5. The tool runs only if both gates permit it.

A Claude hook allow or ask result cannot override an OpenCode deny. An OpenCode
allow cannot override a Claude hook deny.

Hook commands themselves run before OpenCode asks about the requested tool.
Treat commands from project `.claude/settings.json` as executable code and only
use this plugin in repositories whose hook configuration you trust.

## Honest limits

- `Stop` cannot preserve Claude timing with OpenCode's current stable plugin API
- prompt, agent, HTTP, async, and conditional `if` handlers stay manual
- allow and ask results do not bypass OpenCode permissions
- malformed source settings are ignored so they do not break OpenCode startup

For a dry-run report before installation, use the compatibility route in [dsh-movein](https://github.com/sjh9714/dsh-movein).

```sh
npx claude-to-opencode --hooks-only
npx claude-to-opencode --hooks-only --apply
```

## Verification

The test suite runs real hook child processes and checks blocking, input replacement, project-root discovery, and post-tool feedback on Linux, macOS, and Windows.

```sh
npm ci
npm test
```

## License

MIT
