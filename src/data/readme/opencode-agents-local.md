# opencode-agents-local

An [opencode](https://opencode.ai) plugin that loads `AGENTS.local.md` from your project directory into the system prompt.

Use it to inject per-project instructions that stay out of version control — ideal for personal preferences, local overrides, or machine-specific context.

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-agents-local"]
}
```

## Usage

Create an `AGENTS.local.md` in your project root:

```markdown
<!-- AGENTS.local.md -->
- Always respond in Korean
- Use pnpm instead of npm
- The dev server runs on port 4000
```

The file contents are automatically appended to the system prompt on every chat.

> **Tip**: Add `AGENTS.local.md` to your `.gitignore` — this is meant for personal, untracked instructions.

## How it works

On each chat, the plugin:

1. Looks for `AGENTS.local.md` in the working directory
2. If found and non-empty, appends its content to the system prompt
3. If missing or empty, does nothing (no errors)

## License

MIT
