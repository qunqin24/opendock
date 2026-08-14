# opencode-skill-hush

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/opencode-skill-hush)](https://www.npmjs.com/package/opencode-skill-hush)

OpenCode plugin that suppresses verbose skill content and command template display in the TUI.

Instead of dumping 100+ lines of `<skill_content>` into the conversation when an agent loads a skill, it shows a one-line placeholder. The skill content still reaches the LLM context -- only the TUI display is shortened.

## Before / After

**Skill load -- Before:**

```
Loaded skill: bmad-advanced-elicitation

<skill_content name="bmad-advanced-elicitation">
# Skill: bmad-advanced-elicitation

# Advanced Elicitation
**Goal:** Push the LLM to reconsider, refine, and improve its recent output.
...
Base directory for this skill: /Users/katops/git/.agents/skills/...
</skill_content>
```

**Skill load -- After:**

```
skill: bmad-advanced-elicitation
[Skill "bmad-advanced-elicitation" loaded]
```

**Command template -- Before:**

```
/commit
feat: add new feature (multi-line resolved template...)
```

**Command template -- After:**

```
/commit
[Command: commit]
```

## Installation

### Global (recommended)

```bash
npm install -g opencode-skill-hush
```

### Or as a local plugin

Clone the repo and reference it directly in `opencode.json`:

```json
{
  "plugin": ["/path/to/opencode-skill-hush/dist/index.js"]
}
```

## Configuration

Add to your `opencode.json`:

```json
{
  "plugin": [
    ["opencode-skill-hush", {
      "suppressSkills": true,
      "suppressCommands": true,
      "showLineCount": false
    }]
  ]
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `suppressSkills` | `boolean` | `true` | Replace skill tool content with placeholder |
| `suppressCommands` | `boolean` | `true` | Replace command templates with placeholder |
| `showLineCount` | `boolean` | `false` | Append line count to skill placeholder |

Restart opencode after changing config.

## Structure

```
opencode-skill-hush/
├── src/
│   ├── index.ts            # Plugin entry, exports ContentHushPlugin
│   └── hooks/
│       ├── skill.ts        # tool.execute.after handler
│       ├── command.ts      # command.execute.before handler
│       ├── chat.ts         # chat.message handler
│       └── __tests__/      # Unit tests (vitest)
├── package.json
├── tsconfig.json
└── AGENTS.md
```

## How it works

Three hooks, one plugin:

| Hook | Target | What it does |
|------|--------|-------------|
| `tool.execute.after` | `skill` tool | Replaces `output.title` and `output.output` with a minimal placeholder. The tool has already finished, so the LLM context is unaffected. |
| `command.execute.before` | slash commands | Replaces `output.parts` with a single `[Command: {name}]` text part before it renders. |
| `chat.message` | TUI chat messages | Detects command templates in chat text parts and replaces them with `[Command: {heading}]`. Matches if the text contains a `<skill_content>` tag (regardless of H2 structure), or starts with an H1 heading (`#`) that has a `/` prefix and includes H2 sections (`##`). Minimum 50 chars. Catches templates that arrive via `chat.message` rather than `command.execute.before`. |

## Development

```bash
npm install
npm run typecheck
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

## Security

Report vulnerabilities via [SECURITY.md](SECURITY.md).

## License

MIT License. See [LICENSE](LICENSE).
