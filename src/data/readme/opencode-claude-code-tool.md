# opencode-claude-code-tool

OpenCode plugin that exposes a **`claude_code`** tool, letting any model
delegate agentic coding work to the [Claude Code CLI](https://claude.ai/code).

## Why

Run a **cheap orchestrator model** (e.g. GLM, Qwen, GPT) for planning,
exploration, and decisions, while a **Claude model** (Sonnet / Opus / Haiku)
does the heavy execution — reading, editing, running commands, iterating —
in an isolated headless subprocess with its own tool loop.

This is different from just binding a sub-agent to the Claude model: here
Claude Code is a full **agent** (own context, tools, iteration budget), not a
single LLM call. The orchestrator stays tiny; Claude does the real work and
returns a result.

```
orchestrator (any model) ──tool call──▶ claude_code({ prompt, ... })
                                               │
                                  claude -p --output-format json \
                                    --model sonnet --permission-mode acceptEdits \
                                    --add-dir <worktree>
                                               │
                          ◀── result text + cost/duration metadata ──
```

## Install

Requires the `claude` CLI in PATH (`npm i -g @anthropic-ai/claude-code` or the
official installer) and an authenticated Claude account / `ANTHROPIC_API_KEY`.

### As an npm plugin (recommended for sharing)

Add to your `opencode.json`:

```jsonc
{
  "plugin": ["opencode-claude-code-tool"]
}
```

OpenCode installs it automatically via Bun on startup.

### From a local file

Copy `plugin.ts` into:

- `~/.config/opencode/plugins/claude-code.ts` (global), or
- `.opencode/plugins/claude-code.ts` (project-level)

Local plugin files are auto-loaded on startup — no config change needed.

## Tool: `claude_code`

| Arg | Type | Default | Description |
|-----|------|---------|-------------|
| `prompt` | string (req) | — | The task. Be specific; Claude has its own full tool loop (Edit, Bash, Read, Write) and iterates autonomously. |
| `model` | `sonnet`\|`opus`\|`haiku`\|`fable` | `sonnet` | Claude model alias. |
| `cwd` | string | session worktree | Working dir for the subprocess (scoped via `--add-dir`). |
| `systemPrompt` | string | — | Replace Claude's default system prompt. |
| `appendSystemPrompt` | string | — | Append to the default system prompt (preferred). |
| `allowedTools` | string[] | all | Restrict tools, e.g. `["Edit","Read","Bash","Write"]`. |
| `disallowedTools` | string[] | — | Deny specific tools, e.g. `["Bash(git push*)"]`. |
| `maxTurns` | number | — | Cap agentic turns; prevents runaway loops. |
| `mcpConfig` | string | — | Path/JSON for `--mcp-config` (extra MCP servers for Claude). |
| `permissionMode` | `default`\|`acceptEdits`\|`plan`\|`bypassPermissions`\|`auto`\|`dontAsk` | `bypassPermissions` | Claude `--permission-mode`. Default gives **full execution parity with opencode subagents** (edits AND bash run without prompting, matching `bash: * allow`). `plan` = read-only; `acceptEdits` = edits only (bash denied in headless). |
| `timeoutMs` | number | `600000` (10 min) | Hard timeout; raises a clear error if exceeded. |

**Returns:** Claude's final result text. Cost (USD), duration, and turn count
are attached as tool metadata.

## Enabling for sub-agents

Plugin tools are globally available. To let a specific sub-agent use it, add it
to that agent's `tools` map in `opencode.json`.

Name sub-agents by their **driving model** (the one that runs the reasoning
loop), not by the executor — the executor (Claude Code) is a tool the agent
*uses*, not its identity. So a GLM-driven apply phase that delegates coding to
Claude is `sdd-apply-glm`, not `sdd-apply-noclaude` (that suffix means "not
bound to Claude *as a model*" and becomes misleading once it calls Claude):

```jsonc
"sdd-apply-glm": {
  "description": "Implement tasks (GLM-driven, delegates coding to Claude Code)",
  "mode": "subagent",
  // no "model" → runs on the default runtime model (e.g. GLM)
  "prompt": "...",
  "tools": {
    "bash": true,
    "edit": true,
    "read": true,
    "write": true,
    "claude_code": true      // ← delegate the actual coding to Claude Code
  }
}
```

Now a GLM/Qwen orchestrator can run the apply phase and call `claude_code` to
hand the actual coding to Claude.

## Configuration (env)

| Var | Default | Description |
|-----|---------|-------------|
| `CLAUDE_BIN` | `claude` (from PATH) | Path to the Claude CLI. |
| `CLAUDE_CODE_MODEL` | `sonnet` | Default model when the tool omits `model`. |
| `CLAUDE_CODE_PERMISSION_MODE` | `bypassPermissions` | Default `--permission-mode`. |
| `CLAUDE_CODE_TIMEOUT_MS` | `600000` | Default timeout in ms. |

## Safety & permissions

The default `bypassPermissions` mode gives the Claude subprocess the **same
execution power as an opencode subagent** — opencode subagents run with
`bash: * allow`, so they can edit files AND run commands (tests, builds, etc.).
`bypassPermissions` mirrors that: the subprocess can edit and run bash without
being prompted (headless `-p` mode has no TTY to prompt anyway, so any mode
short of bypass would *deny* bash rather than ask).

The subprocess is still scoped to `cwd` (the session worktree) via `--add-dir`.

Tighten when needed:
- `permissionMode: "plan"` — read-only analysis, no edits/bash.
- `permissionMode: "acceptEdits"` — edits only; bash denied (use when you don't
  trust the subprocess to run commands).
- `allowedTools: ["Edit","Read"]` — explicit allowlist.
- `disallowedTools: ["Bash(git push*)"]` — deny specific dangerous ops while
  keeping everything else (mirrors opencode's `git push: ask` guard).

Change the global default via `CLAUDE_CODE_PERMISSION_MODE`.

The subprocess respects the caller's abort signal and the `timeoutMs` cap.

## License

MIT
