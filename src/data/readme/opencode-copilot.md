# OpenCopilot

[![npm version](https://img.shields.io/npm/v/opencode-copilot)](https://www.npmjs.com/package/opencode-copilot)

An [OpenCode](https://opencode.ai) plugin that adapts `.github/` GitHub Copilot
customizations to work natively in OpenCode — zero configuration required.

Agents, skills, and instructions that you have set up for GitHub Copilot (VS Code extension,
CLI, or GitHub.com) will work in OpenCode automatically, as if they were configured for
OpenCode from the start.

> **Monorepo users**: Run the install command from the specific sub-project root where you
> want OpenCopilot to be available (e.g., `cd packages/my-app && npx opencode-copilot install`).

---

## Installation

Install with a single command:

```bash
npx opencode-copilot install
```

This will:
1. Download the latest `opencopilot.ts` from [GitHub Releases](https://github.com/SumanthAkula/opencopilot/releases/latest)
2. Place it at `.opencode/plugins/opencopilot.ts` in the current directory
3. Create (or update) `.opencode/package.json` with the required dependencies

That's it. Start an OpenCode session and the plugin will auto-discover your `.github/` files.

**Verify it loaded** — look for this line in startup output:

```
[opencopilot] Loaded: N instruction files, M agents, K skills from .github/
```

### Force-overwrite / update

To update to the latest version or overwrite an existing installation without prompting:

```bash
npx opencode-copilot install --force
```

### Direct download (no npm/npx)

If you prefer not to use npm/npx, download directly with curl:

```bash
curl -fsSL https://github.com/SumanthAkula/opencopilot/releases/latest/download/opencopilot.ts \
  -o .opencode/plugins/opencopilot.ts
```

You will also need to ensure `.opencode/package.json` contains the required dependencies:

```json
{
  "dependencies": {
    "@opencode-ai/plugin": "latest",
    "js-yaml": "^4.1.0"
  }
}
```

---

## Supported Copilot File Types

### Repository-Wide Instructions

**File**: `.github/copilot-instructions.md`

Injected automatically into every OpenCode agent's system prompt. No frontmatter needed.

```markdown
You are a helpful assistant for a TypeScript project.
Always prefer functional programming patterns.
```

### Path-Specific Instructions

**Pattern**: `.github/instructions/**/*.instructions.md`

Injected when the current session has recently edited files matching the `applyTo` glob.

```markdown
---
applyTo: "**/*.ts,**/*.tsx"
---

Always use `const` over `let`. Prefer `interface` over `type`.
```

| Frontmatter field | Required | Default | Notes |
|---|---|---|---|
| `applyTo` | No | `**/*` (all files) | Comma-separated glob patterns |
| `excludeAgent` | No | null | Parsed but not used in OpenCode |

### Custom Agents

**Pattern**: `.github/agents/*.md` or `.github/agents/*.agent.md`

Registered as OpenCode subagents — available via `@agent-name` in chat.

```markdown
---
description: Performs security audits and identifies vulnerabilities
tools:
  - read
  - search
---

You are a security expert. Focus on identifying potential security issues...
```

| Frontmatter field | Required | Default | Notes |
|---|---|---|---|
| `description` | **Yes** | — | File skipped if missing |
| `name` | No | filename | Display name |
| `model` | No | inherit | See model normalization below |
| `tools` | No | all | Empty list = deny all |
| `user-invocable` | No | `true` | `false` → hidden from `@` menu |
| `target` | No | null | Parsed, not used for filtering |

**Tool aliases** (Copilot → OpenCode):

| Copilot alias | OpenCode permission |
|---|---|
| `read` | `read` |
| `edit`, `write` | `edit` |
| `execute`, `shell`, `bash` | `bash` |
| `search` | `glob`, `grep` |
| `web` | `webfetch`, `websearch` |
| `agent`, `task` | `task` |
| `todo` | `todowrite` |

**Model normalization**: Short model names are mapped to `provider/model-id` format.
Known models include `gpt-4o`, `gpt-4.1`, `claude-3.5-sonnet`, `claude-sonnet-4`,
`gemini-2.5-pro`, `llama-3.1-405b`, `mistral-large`, and 20+ others.
For models with a recognizable prefix (`gpt-`, `claude-`, `gemini-`, `llama-`, `mistral-`),
the provider is inferred automatically. Fully unknown models are omitted with a warning.

**`disable-model-invocation` field**: Agents with `disable-model-invocation: true` are
registered as `hidden: true` in OpenCode, removing them from the `@` autocomplete menu.
This takes precedence over the `user-invocable` field.

### Prompt Files

**Pattern**: `.github/prompts/**/*.prompt.md`

Automatically converted to globally-scoped instructions and injected into every OpenCode
session (equivalent to `applyTo: "**/*"`). Both `mode: instruction` and `mode: assistant`
are supported and treated identically in v1.

```markdown
---
mode: instruction
description: Code review checklist
---

Review all PR changes for security vulnerabilities...
```

| Frontmatter field | Required | Default | Notes |
|---|---|---|---|
| `mode` | No | `null` → treated as `instruction` | `"instruction"` or `"assistant"` |
| `description` | No | null | Informational only |

### Hook Files

**Pattern**: `.github/hooks/**/*.json`

Lifecycle hooks are scanned and registered as OpenCode plugin event listeners.
In v1, hooks are recognized and logged; shell script execution is not supported.

```json
{
  "event": "onChatStart",
  "script": "echo 'Chat started'",
  "description": "Runs when a new chat session begins"
}
```

| JSON field | Required | Notes |
|---|---|---|
| `event` | **Yes** | `"onChatStart"`, `"onFileSave"`, `"onCodeReview"` |
| `script` | No | Logged but not executed in v1 |
| `description` | No | Informational only |

**Event mappings**:

| Copilot event | OpenCode equivalent | Action |
|---|---|---|
| `onChatStart` | Session startup | Message logged |
| `onFileSave` | `file.watcher.updated` | Handled by existing event hook |
| `onCodeReview` | N/A | Warning logged (not supported) |

### Skills

**Pattern**: `.github/skills/<name>/SKILL.md`

Made available via the OpenCode `skill` tool. The plugin injects an `<available_skills>`
listing into the system prompt so agents can discover them.

```markdown
---
name: git-release
description: Create consistent releases and changelogs
---

## What I do
Draft release notes from merged PRs and propose a version bump.
```

| Frontmatter field | Required | Notes |
|---|---|---|
| `name` | **Yes** | Must match `^[a-z0-9]+(-[a-z0-9]+)*$` and match directory name |
| `description` | **Yes** | Used in skill listing |
| `license` | No | Passthrough |
| `allowed-tools` | No | Parsed but not used (see Known Gaps) |

---

## Copilot → OpenCode Mapping Table

| Copilot concept | OpenCode equivalent | Status |
|---|---|---|
| `.github/copilot-instructions.md` | System prompt injection | ✅ Supported |
| `.github/instructions/*.instructions.md` | System prompt (path-filtered) | ✅ Supported |
| `.github/agents/*.md` | OpenCode subagents via `config` hook | ✅ Supported |
| `.github/skills/*/SKILL.md` | OpenCode `skill` tool listing | ✅ Supported |
| `AGENTS.md` (repo root / subdirs) | Native OpenCode support | ✅ Native (no plugin needed) |
| `CLAUDE.md` (repo root) | Native OpenCode support | ✅ Native (no plugin needed) |
| `.github/prompts/*.prompt.md` | System prompt injection (global, `applyTo: "**/*"`) | ✅ Supported |
| `.github/hooks/*.json` | OpenCode plugin events (v1: logged, script not executed) | ✅ Supported |
| Agent `mcp-servers` field | OpenCode `mcp` config | ⚠️ See Known Gaps |
| Skill `allowed-tools` field | No equivalent | ⚠️ See Known Gaps |
| Agent `disable-model-invocation` | `hidden: true` in OpenCode agent config | ✅ Supported |
| Unknown model names | Dynamic inference + KNOWN_MODELS map | ✅ Supported |
| Org/enterprise-level instructions | Out of scope | ❌ Not supported |

---

## Known Gaps

| Feature | Status | Notes |
|---|---|---|
| `.github/prompts/*.prompt.md` | ✅ **Supported** (v1) | Converted to global instructions (`applyTo: "**/*"`); injected into every session |
| `.github/hooks/*.json` (lifecycle hooks) | ✅ **Supported** (v1) | Hooks are recognized and logged; `onFileSave` bridges to `file.watcher.updated`; script execution not supported in v1 |
| Agent `disable-model-invocation` | ✅ **Supported** | Maps to `hidden: true` in OpenCode agent config; takes precedence over `user-invocable` |
| Unknown model names | ✅ **Supported** | 20+ models in KNOWN_MODELS; dynamic prefix inference for `gpt-`, `claude-`, `gemini-`, `llama-`, `mistral-` prefixes |
| Agent `mcp-servers` field | Ignored | Configure MCP servers in `opencode.json` directly |
| Skill `allowed-tools` | Ignored | No per-skill tool permission in OpenCode skills API |
| Hook `script` execution | Not supported (v1) | Scripts in `.github/hooks/*.json` are logged but not executed; implement as OpenCode plugin hooks for full script support |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No startup log line | Plugin file not found or syntax error | Check `.opencode/plugins/opencopilot.ts` exists |
| "0 instruction files" | `.github/copilot-instructions.md` missing or empty | Verify file exists and has content |
| Agent not in `@` autocomplete | Agent file missing `description` frontmatter | Add `description:` to the agent's frontmatter |
| Agent name collision warning | Agent name matches a built-in OpenCode agent | Plugin auto-suffixes with `-copilot`; use `@agent-name-copilot` |
| Skill not discovered | `name` field doesn't match directory name | Ensure `name: my-skill` in `.github/skills/my-skill/SKILL.md` |
| Instructions not applied | `applyTo` glob too narrow | Try `applyTo: "**/*"` or verify glob syntax |
| Model warning logged | Copilot model name not in mapping table | Update `KNOWN_MODELS` in `src/mapper.ts` |

---

## Architecture

The plugin is structured as follows:

```
src/
├── types.ts         # Data model: CopilotInstructionFile, CopilotAgentDefinition, CopilotSkill,
│                    #   CopilotPromptFile, CopilotHookDefinition, PluginCache
├── parser.ts        # YAML frontmatter parser
├── glob-matcher.ts  # applyTo glob evaluation
├── scanner.ts       # .github/ directory scanner (instructions, agents, skills, prompts, hooks)
├── mapper.ts        # Copilot → OpenCode field mapping + KNOWN_MODELS + normalizeModel()
└── index.ts         # Public re-exports

.opencode/plugins/
└── opencopilot.ts   # Plugin entry point (hooks wiring)
```

**Key OpenCode hooks used**:
- `config` — register Copilot agent definitions as OpenCode agents
- `experimental.chat.system.transform` — inject instructions and skill listings
- `tool.execute.before` — intercept skill tool calls for `.github/skills/`
- `event` — cache invalidation on file changes, recent-file tracking

---

## License

MIT
