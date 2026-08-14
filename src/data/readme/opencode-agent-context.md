<div align="center">

# opencode-agent-context

**Your coding agent that actually remembers.**

[![npm version](https://img.shields.io/npm/v/opencode-agent-context?color=blue)](https://www.npmjs.com/package/opencode-agent-context)
[![CI](https://github.com/HarKro753/opencode-agent-context/actions/workflows/ci.yml/badge.svg)](https://github.com/HarKro753/opencode-agent-context/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

---

You explain a pattern to your coding agent. It understands. Next session, it's gone — you're starting over like it's day one. `opencode-agent-context` fixes that.

It gives your [OpenCode](https://opencode.ai) agent **persistent, language-aware memory** that survives across sessions, compactions, and restarts. Say it once. Your agent remembers it forever.

- 🧠 **LLM-powered extraction** — no keyword matching, actual reasoning about what's worth keeping
- 📁 **Plain markdown storage** — human-readable, version-controllable, editable by hand
- 🔍 **Language-aware injection** — TypeScript rules stay out of your Go sessions
- ⚡ **Zero config** — install and forget

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Commands](#commands)
- [Supported Languages](#supported-languages)
- [Storage Format](#storage-format)
- [Architecture](#architecture)
- [API](#api)
- [License](#license)

## Requirements

- [OpenCode](https://opencode.ai) ≥ 1.0
- Node.js ≥ 18

## Installation

Install via npm:

```bash
npm install opencode-agent-context
```

Register the plugin in your project's `opencode.json`:

```json
{
  "plugin": ["opencode-agent-context"]
}
```

For global use across all projects, add it to `~/.config/opencode/opencode.json` instead.

## Quick Start

Once installed, the plugin runs silently in the background. Just work normally:

```
You:   We should stop using default exports — they make refactoring
       way harder and auto-imports behave oddly with them.

Agent: Makes sense. I'll switch to named exports going forward.

       ✓ 1 rule saved to typescript context
```

Next session, that rule is automatically injected. No reminders needed.

For explicit control:

```
You:   /remember in Go, prefer table-driven tests

       ✓ Rule saved to go context
```

## How It Works

### Automatic extraction

When your session goes idle, the plugin spins up a **separate, throwaway LLM session** to analyze what you said. It reasons about your messages and identifies which preferences, conventions, or architectural decisions are worth persisting — then saves them automatically.

```
You:   We use Drizzle for the database layer, not Prisma.
       And always handle errors explicitly — no silent catches.

Agent: Got it.

       ✓ 2 rules saved to typescript, general context
```

The plugin then:

1. Collects your messages from the session
2. Creates a throwaway LLM session
3. Prompts: *"Analyze these messages. What rules should be persisted?"*
4. Parses the structured JSON response
5. Saves rules to `.opencode/context/*.md`
6. Deletes the throwaway session

### Context injection

On every session compaction, the plugin detects your project's active languages from file extensions and injects the relevant rules back into context. Rules tagged `general` are always included.

## Commands

Two tools are registered globally once the plugin is installed:

| Command | Description |
|---|---|
| `/remember <rule>` | Explicitly save a rule to persistent context |
| `/context` | View all saved rules, organized by language |

## Supported Languages

Language is detected automatically from file extensions in your project:

| Language | Extensions |
|---|---|
| TypeScript | `.ts` `.tsx` `.mts` `.cts` |
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` |
| Go | `.go` |
| Python | `.py` `.pyw` |
| Rust | `.rs` |
| Kotlin | `.kt` `.kts` |
| Swift | `.swift` |
| Java | `.java` |
| Ruby | `.rb` |
| C# | `.cs` |
| C / C++ | `.c` `.cpp` `.cc` `.hpp` `.h` |
| PHP | `.php` |
| Dart | `.dart` |
| Elixir | `.ex` `.exs` |
| Zig | `.zig` |
| Scala | `.scala` |

**Frameworks** are also detected: Next.js, React, Vue, Svelte, Astro, Tailwind, Prisma, Drizzle.

## Storage Format

Rules are stored as plain markdown in `.opencode/context/`:

```
.opencode/context/
  general.md      ← applies to every session
  typescript.md
  go.md
  python.md
```

Each file is human-readable and editable:

```markdown
# Typescript Rules

- Use named exports — default exports make refactoring harder.
- Use Drizzle for the database layer, not Prisma.
- Always handle errors explicitly — no silent catches.
```

Edit any file directly, commit it to your repo, or share it with your team. Changes take effect on the next session.

## Architecture

```
┌──────────────────────────────────────────┐
│  Your conversation session               │
│                                          │
│  You: "prefer named exports because..."  │
│  Agent: [works on your request]          │
│  ...session goes idle...                 │
└────────────────────┬─────────────────────┘
                     │ session.idle event
                     ▼
┌──────────────────────────────────────────┐
│  Rule extraction (throwaway session)     │
│                                          │
│  1. Collect messages from this session   │
│  2. Prompt LLM: extract rules as JSON    │
│  3. Save to .opencode/context/*.md       │
│  4. Delete throwaway session             │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│  Next session / compaction               │
│                                          │
│  Detect project languages from files     │
│  Inject relevant rules into context      │
└──────────────────────────────────────────┘
```

## API

The plugin exports its internals for programmatic use:

```typescript
import {
  detectLanguagesFromFiles,
  detectLanguageFromFilePath,
  extractRule,
  addRule,
  getAllRules,
  buildContextInjection,
  buildExtractionPrompt,
  parseExtractionResponse,
} from "opencode-agent-context";
```

Subpath exports are also available for targeted imports:

```typescript
import { detectLanguagesFromFiles } from "opencode-agent-context/detector";
import { addRule, getAllRules } from "opencode-agent-context/context-store";
import { buildContextInjection } from "opencode-agent-context/injector";
```

## License

MIT — see [LICENSE](./LICENSE).
