# opencode-agent-hooks

OpenCode plugin that runs a project's Claude Code or Codex hook configs unmodified. If your repo already guards, formats, and gates through `.claude/settings.json` (or the same schema in `.codex/hooks.json`), this plugin makes those hooks fire inside OpenCode too — same commands, same stdin JSON, same exit-code semantics.

## Use

Add the plugin to a project's `opencode.json`, or to `~/.config/opencode/opencode.json` to enable it everywhere:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@monks1975/opencode-agent-hooks@1.0.1"]
}
```

OpenCode installs it on startup. No `npm install` in the project, no other setup. If the project also carries a copy of this plugin in `.opencode/plugins/`, remove it — otherwise every hook runs twice.

## Config sources

Lowest precedence first; hook arrays are concatenated (later files add hooks, they don't replace):

1. `~/.claude/settings.json` (honours `$CLAUDE_CONFIG_DIR`)
2. `<project>/.claude/settings.json`
3. `<project>/.claude/settings.local.json`
4. `<project>/.opencode/hooks.json` (same schema; OpenCode-only extras live here)

If neither project `.claude` file defines hooks, `<project>/.codex/hooks.json` is read in their place. It is a fallback, not an additional source: a project carrying both configs would otherwise run every hook twice.

## Event mapping

| Claude event | OpenCode hook | Notes |
| --- | --- | --- |
| `PreToolUse` | `tool.execute.before` | block (exit 2 / `permissionDecision:"deny"`), `updatedInput` |
| `PostToolUse` | `tool.execute.after` | exit-2 stderr and `additionalContext` append to the tool output; `updatedToolOutput` replaces it |
| `Stop` | `session.idle` event | soft re-prompt loop, see deviations |
| `UserPromptSubmit` | `chat.message` | stdout / `additionalContext` injected as a text part |
| `SessionStart` | `session.created` event | context buffered, delivered with the first message |
| `PreCompact` | `experimental.session.compacting` | context only |

Matched hooks run in parallel with identical commands deduplicated, as under Claude Code. Tool names are normalized to Claude's (`bash` -> `Bash`, `mcp__*` passes through), so matchers like `Write|Edit` work as written.

## What hooks receive

Each command gets the full Claude-schema payload on stdin: `session_id`, `cwd`, `hook_event_name`, `tool_name`, snake_case `tool_input` (OpenCode's `filePath` becomes `file_path`), `tool_response` on PostToolUse, `stop_hook_active` on Stop, `prompt` on UserPromptSubmit. Scripts doing `jq -r '.tool_input.file_path'` work unmodified. `transcript_path` is present but always empty; transcript synthesis is not implemented.

The JSON output protocol is honoured: `hookSpecificOutput.permissionDecision` (+ reason), `updatedInput`, `updatedToolOutput`, `additionalContext`, legacy `decision`/`reason`, and `continue`/`stopReason`.

## Deviations from Claude Code

Forced by OpenCode's model, and documented in the source header:

- `session.idle` fires after the agent goes idle, so Stop hooks cannot hard-block. A failing Stop hook re-prompts the session with its stderr instead. Re-entry rounds set `stop_hook_active: true`, exactly like Claude; a per-session round cap is the backstop for hooks that ignore the flag.
- `permissionDecision: "ask"` and `"allow"` are no-ops: OpenCode's own permission flow has already run and cannot be re-opened or bypassed from a plugin.
- `continue: false` cannot abort a session. It blocks (PreToolUse), appends the `stopReason` (PostToolUse), or suppresses the re-prompt chain (Stop).
- UserPromptSubmit blocking throws from `chat.message`, which OpenCode does not document as a reject channel. Context injection, the common case, is unaffected.

## failClosed

By default a hook that crashes or times out is ignored (fail-open), matching Claude's non-blocking errors. For security guards that is the wrong default. Mark a hook `"failClosed": true` in `.opencode/hooks.json` and executor errors become a PreToolUse deny. Re-declaring the identical command string there merges the flag via dedup instead of running the hook twice.

## Requirements

- macOS or Linux: commands run via `bash -c` with process-group timeout kills.
- Hook timeouts are per-command, in seconds, from the config (`"timeout": 60`).

## Development

```
node --test src/index.test.ts
```

Node 23+ runs the TypeScript directly; Node 22.6+ needs `--experimental-strip-types`. The suite drives the plugin through its exported entry point with throwaway project fixtures; no build step and no dependencies.

## License

MIT
