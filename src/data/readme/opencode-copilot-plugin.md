# opencode-copilot-plugin

[![npm version](https://img.shields.io/npm/v/opencode-copilot-plugin)](https://www.npmjs.com/package/opencode-copilot-plugin)
[![license](https://img.shields.io/npm/l/opencode-copilot-plugin)](./LICENSE)

An [OpenCode](https://opencode.ai) plugin that brings GitHub Copilot's custom instruction, prompt, skill, agent, and hook file system into OpenCode. If you already have Copilot customization files set up, they work in OpenCode with no changes.

## Install

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-copilot-plugin@latest"]
}
```

OpenCode installs npm plugins automatically at startup — no separate install step needed.

## Supported features

### Custom instructions

- **Repo-wide** — `.github/copilot-instructions.md` is injected into every session automatically.
- **Path-specific** — `.github/instructions/**/*.instructions.md` files are injected when the LLM accesses files matching their `applyTo` glob frontmatter field.
- **Global path-specific** — `~/.copilot/instructions/**/*.instructions.md` works the same as project path-specific instructions but applies across all workspaces.
- **VS Code user data** — instructions in `<vsCodeUserData>/instructions/` are also loaded as a secondary global source (see [VS Code user data](#vs-code-user-data) below).

### Prompt files

Discovers Copilot `.prompt.md` files and surfaces them as slash commands. When you invoke a command matching a prompt file name, the plugin resolves its content — inlining any referenced files and substituting argument placeholders — before sending it to the LLM.

- **Project-local** — `.github/prompts/*.prompt.md`
- **User-global** — `~/.copilot/prompts/*.prompt.md`
- **VS Code user data** — `<vsCodeUserData>/prompts/*.prompt.md` (secondary global source)
- Local prompts shadow global prompts of the same name. `~/.copilot/` prompts shadow same-named VS Code user data prompts.
- Discovery is flat — only files directly inside the prompts directory are scanned (no subdirectories).

Prompt files use the standard [Copilot prompt file format](https://code.visualstudio.com/docs/copilot/customization/prompt-files):

```markdown
---
description: Generate a pull request summary from staged changes.
tools: ['terminal']
---

Summarise the changes in `$BRANCH` as a pull request description with a short
title and bullet-point summary of what changed and why.
```

Supported frontmatter fields:

| Field | Behaviour |
| --- | --- |
| `description` | Optional. Shown in the informational header prepended to the prompt. Falls back to the filename-derived name. |
| `name` | Advisory. The filename (without `.prompt.md`) is always the canonical command name. A mismatch emits a warning. |
| `argument-hint` | Shown as a usage hint alongside the command. |
| `agent` | Informational — noted in the header, not enforced by OpenCode. |
| `model` | Informational — noted in the header, not enforced by OpenCode. |
| `tools` | Informational — noted in the header, not enforced by OpenCode. |

**Arguments:** Two placeholder syntaxes are supported, and they can be mixed in the same file:

| Syntax | Example | Notes |
| --- | --- | --- |
| VS Code style | `${input:branchName}` or `${input:branchName:main}` | The second segment is an optional placeholder hint. |
| Copilot/Crush style | `$BRANCH_NAME` | Uppercase identifier with underscores. |

Arguments are passed when invoking the command. Key/value pairs are supported (`name=value`), and a bare string is mapped to the first declared argument.

**File references:** Markdown links to local files (`[label](./path/to/file.md)`) are resolved by reading the referenced file and inlining it as a `<referenced_file path="...">` XML block. Nested references are resolved recursively up to 5 levels deep. Total resolved content is capped at 100 KB; remaining references beyond the cap are left as-is.

### Slash commands

The plugin registers two slash commands in OpenCode's command picker by symlinking stub files into `~/.config/opencode/commands/` at startup:

| Command | Description |
| --- | --- |
| `/copilot-inspect` | Displays a full report of all loaded instructions, skills, agents, prompts, hooks, and current session state. |
| `/copilot-prompt` | Lists all available Copilot prompt files, or resolves and runs one by name with argument substitution. |

Each symlink points back to the plugin's install location (`~/.cache/opencode/node_modules/opencode-copilot-plugin/commands/`), so the source of the command file is clear. If a file named `copilot-inspect.md` or `copilot-prompt.md` already exists as a regular (non-symlink) file in `~/.config/opencode/commands/`, the plugin will not overwrite it.

**Removing symlinks:** If you uninstall the plugin, remove the symlinks manually:
```bash
rm ~/.config/opencode/commands/copilot-inspect.md
rm ~/.config/opencode/commands/copilot-prompt.md
```

Both commands are also registered as tools (`copilot_prompt` and `copilot_inspect`) so the LLM can invoke them directly without a slash command.

### Skills

- **Project-local** — `.github/skills/<name>/SKILL.md`
- **User-global** — `~/.copilot/skills/<name>/SKILL.md`
- **VS Code user data** — `<vsCodeUserData>/skills/<name>/SKILL.md` (secondary global source)
- When at least one skill exists at startup, a `copilot_skill` tool is registered so the LLM can load skills on demand.
- Local skills shadow global skills of the same name. `~/.copilot/` skills shadow same-named VS Code user data skills.

### Custom agents

Discovers Copilot `.agent.md` files and registers them as a `copilot_agent` tool, letting the LLM load any agent persona on demand. Agents bring their own instructions, tool lists, model preferences, and optionally agent-scoped hooks.

- **Project-local** — `.github/agents/*.agent.md` (or `*.md`)
- **User-global** — `~/.copilot/agents/*.agent.md` (or `*.md`)
- **VS Code user data** — `<vsCodeUserData>/agents/*.agent.md` (or `*.md`) (secondary global source)
- When at least one agent exists at startup, a `copilot_agent` tool is registered.
- Local agents shadow global agents of the same name. `~/.copilot/` agents shadow same-named VS Code user data agents.
- Agents with `target: github-copilot` are skipped — they are cloud-only and cannot run locally.

Agent files use the standard [Copilot custom agent format](https://code.visualstudio.com/docs/copilot/customization/custom-agents):

```markdown
---
description: Generate an implementation plan without making code edits.
tools: ['search/codebase', 'web/fetch']
model: Claude Sonnet 4.5
handoffs:
  - label: Start Implementation
    agent: implementer
    prompt: Now implement the plan outlined above.
---

You are in planning mode. Collect context and produce a detailed implementation
plan. Do not make any code edits.
```

Supported frontmatter fields:

| Field | Behaviour |
| --- | --- |
| `description` | Required. Shown in the agent listing. |
| `name` | Advisory. The filename (without extension) is always the canonical name. |
| `argument-hint` | Shown as a usage hint in the tool listing. |
| `tools` | Informational — listed in the loaded agent content. |
| `agents` | Informational — documents which subagents the agent expects to use. |
| `model` | Informational — noted in content with a reminder that OpenCode uses the model picker. |
| `user-invocable` | `false` marks an agent as subagent-only; it still appears in the listing annotated as such. |
| `infer` | Deprecated alias for `user-invocable`. |
| `handoffs` | Rendered as a "Suggested Next Steps" section in the loaded agent content. |
| `hooks` | Agent-scoped hooks — run after global hooks, only when this agent is active. |
| `mcp-servers` | Not supported for local agents — field is ignored with a warning. |
| `target: github-copilot` | Causes the agent to be skipped entirely. |

**Agent-scoped hooks:** An agent file can define hooks directly in its frontmatter using the same hook types as standalone hook files. These hooks only run while that agent is active in a session, and they run after any global hooks of the same type. Hook keys use `command` instead of `bash` (both are accepted):

```markdown
---
description: Strict formatter agent that auto-formats after every edit.
hooks:
  PostToolUse:
    - type: command
      command: ./scripts/format-changed-files.sh
---
```

### Hooks

Executes Copilot hook scripts at key lifecycle points in each agent session. Hook scripts receive JSON on stdin and can approve, deny, or request confirmation for tool calls.

- **Project-local** — `.github/hooks/*.json`
- **User-global** — `~/.copilot/hooks/*.json`
- **VS Code user data** — `<vsCodeUserData>/hooks/*.json` (secondary global source)
- Execution order per hook type: project → `~/.copilot/` → VS Code user data.

Supported hook types:

| Hook type | When it fires |
| --- | --- |
| `sessionStart` | When a new session is created |
| `sessionEnd` | When a session is deleted |
| `userPromptSubmitted` | When a new user message is received |
| `preToolUse` | Before each tool call — can block execution |
| `postToolUse` | After each successful tool call |
| `agentStop` | When the agent finishes responding (session goes idle) |
| `errorOccurred` | When a session error occurs |

Hook configuration files use the same format as [GitHub Copilot hooks](https://docs.github.com/en/copilot/reference/hooks-configuration):

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash": "./scripts/security-check.sh",
        "cwd": ".",
        "timeoutSec": 15
      }
    ]
  }
}
```

**`preToolUse` permission decisions:** If a hook script outputs `{"permissionDecision":"deny","permissionDecisionReason":"..."}`, the tool call is blocked. If it outputs `{"permissionDecision":"ask","permissionDecisionReason":"..."}`, the agent is instructed to confirm with the user before retrying — on the next identical tool call (same tool and arguments), that specific hook is bypassed.

**Tool name mapping:** Hook scripts receive Copilot-equivalent tool names (`view` instead of `read`, `create` instead of `write`) so existing scripts work unmodified.

**Platform note:** Only `bash` commands are executed. `powershell` commands are silently skipped on macOS/Linux.

**No hot-reload:** Hook files are loaded once when the plugin initialises. Changes to hook files require an OpenCode restart to take effect.

### VS Code user data

In addition to `~/.copilot/`, the plugin also reads from the VS Code user data directory — the location where VS Code stores customizations created through its Chat Customizations editor or `Chat: New Prompt File` command.

The following directories are checked on startup (both stable and Insiders variants):

| Platform | Path |
| --- | --- |
| macOS | `~/Library/Application Support/Code/User/` |
| macOS (Insiders) | `~/Library/Application Support/Code - Insiders/User/` |
| Linux | `~/.config/Code/User/` |
| Linux (Insiders) | `~/.config/Code - Insiders/User/` |

For each base directory that exists, the plugin looks for `instructions/`, `prompts/`, `skills/`, `agents/`, and `hooks/` subdirectories. Items found there are treated as secondary global sources — `~/.copilot/` takes precedence when both locations contain an item with the same name.

### Hot-reload

Instruction files, skill directories, agent files, and prompt files are re-parsed automatically when they change on disk — no OpenCode restart required. This includes files in VS Code user data directories. Hook files are the exception — they are loaded once at startup and require a restart to pick up changes.

## License

MIT
