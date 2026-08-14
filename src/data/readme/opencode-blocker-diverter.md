# Blocker Diverter

> OpenCode plugin for autonomous overnight sessions — intercept blockers, continue work, review in the morning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/opencode-blocker-diverter.svg)](https://www.npmjs.com/package/opencode-blocker-diverter)

## Problem

AI coding agents get chatty. They stop to ask questions about framework choices, naming conventions, deployment strategies. This breaks the "autonomous overnight run" workflow.

**You want:** Start a task at 5pm, walk away, return at 9am to completed work.  
**Reality:** Agent stopped at 6:03pm asking "Should I use Zod or Yup for validation?"

## Solution

**Blocker Diverter** intercepts questions and confirmations:

- **Hard blockers** (architecture, security, destructive actions) → logged to `BLOCKERS.md` for morning review
- **Soft questions** (naming, formatting, minor preferences) → answered with sensible defaults
- **Agent keeps working** on independent tasks while blocked items wait for human review

## Features

- 🚫 **Tool-based interface** — AI agents actively call `blocker` tool to log questions
- 🤖 **Structured context** — Requires task reference, file paths, and progress details
- 📝 **Markdown blocker log** — Morning-friendly format in `BLOCKERS.md`
- ⚙️ **Configurable via commands** — `/blockers.on`, `/blockers.off`, `/blockers.status`, `/blockers.list`
- 🔥 **Deduplication** — Prevents blocker spam via cooldown mechanism
- 🛑 **Auto-disable** — Turns off when user sends message, cancels, or interrupts AI
- 🔄 **Retry mechanism** — Queues failed writes for later retry

## Quick Start

### Installation (one-liner, no manual config edits)

```bash
# In your project root
npm install opencode-blocker-diverter
```

That's it. The `postinstall` script automatically:

1. **Patches `opencode.jsonc`** (or `opencode.json`) in your project root to add `"./node_modules/opencode-blocker-diverter"` to `plugin` — creates the file if neither exists.
2. **Patches `.opencode/tui.jsonc`** (or `.opencode/tui.json`) to add `"../node_modules/opencode-blocker-diverter"` so Ctrl+P/TUI commands load.
3. Seeds `.opencode/blocker-diverter.json` — default config (edit freely).
4. Seeds `.opencode/commands/blockers.*.md` — slash-command templates.

Then **restart OpenCode** and the plugin is active.

> **No global `~/.config/opencode/` edits.** Registration happens only in your project's
> own `opencode.jsonc`, which is the correct approach for OpenCode 1.4+.

> **Existing files are never overwritten.** Re-running `npm install` is fully idempotent.
> If `opencode.jsonc` already exists, only the `"plugin"` array is patched — all other
> settings are preserved.

### Toggle autonomous mode

Use the command palette (`Ctrl+P`) or the keyboard shortcut `Ctrl+B`:

```
Blocker Diverter: Toggle   →  Ctrl+B  (or /blockers.toggle)
Blocker Diverter: Enable   →  /blockers.on
Blocker Diverter: Disable  →  /blockers.off
Blocker Diverter: Status   →  /blockers.status
Blocker Diverter: List     →  /blockers.list
```

Both the **Ctrl+P command palette** and **slash commands** (`/blockers.*`) are available for all entries above. Autonomous mode is **OFF by default** — activate it with `Ctrl+B` or `/blockers.on` before starting an autonomous session.
When enabled you'll see: "✅ Blocker diverter enabled for this session".

**The plugin automatically disables when you:**
- Send any manual message to the AI
- Cancel an AI response (Ctrl+C or abort button)
- Interrupt active AI generation

When auto-disabled, you'll see: "🛑 Blocker diverter auto-disabled (user input detected)"

<details>
<summary><strong>Local development install</strong></summary>

```bash
# Clone and link for development
git clone https://github.com/Nikro/opencode-blocker-diverter.git
cd opencode-blocker-diverter
bun install
bun run build

# In your consuming project:
npm link /path/to/opencode-blocker-diverter
```

</details>

## Ship Checklist (Quick Verification)

Run these after `npm install opencode-blocker-diverter` in a target project:

1. `opencode.jsonc` contains `"./node_modules/opencode-blocker-diverter"` under `plugin`.
2. `.opencode/tui.jsonc` contains `"../node_modules/opencode-blocker-diverter"` under `plugin`.
3. `.opencode/commands/` includes `blockers.on/off/status/list/clarify`.
4. Restart OpenCode, then verify `Ctrl+P` shows `Blocker Diverter:*` commands.
5. Run `/blockers.status`, then `/blockers.on`, and confirm toast + status changes.

## Configuration

The plugin works out-of-the-box with sensible defaults. Most users will never need to configure anything manually — just use the `/blockers.*` commands.

<details>
<summary><strong>Advanced: Configuration File</strong> (optional)</summary>

If needed, create `.opencode/blocker-diverter.json` in your project:

```json
{
  "enabled": true,
  "defaultDivertBlockers": false,
  "blockersFile": "BLOCKERS.md",
  "maxBlockersPerRun": 50,
  "cooldownMs": 30000,
  "maxReprompts": 5,
  "repromptWindowMs": 300000,
  "completionMarker": "BLOCKER_DIVERTER_DONE!",
  "promptTimeoutMs": 30000
}
```

**Key settings:**
- `blockersFile` — Where to log blockers (default: `BLOCKERS.md`)
- `maxBlockersPerRun` — Safety limit to prevent runaway logging (default: 50)
- `cooldownMs` — Milliseconds to deduplicate identical blockers (default: 30000)
- `maxReprompts` — Max continuation prompts before stopping (default: 5)
- `completionMarker` — Phrase agent says when finished (default: `BLOCKER_DIVERTER_DONE!`)

</details>

## How It Works

When autonomous mode is enabled (via `Ctrl+B`, `/blockers.on`, or setting `defaultDivertBlockers: true` in config), the plugin:

1. Adds instructions to the AI's system prompt about using the `blocker` tool
2. Provides the AI with a `blocker` tool it can call when stuck
3. Monitors session events to auto-disable on user interaction

When the AI encounters a blocking decision:

1. AI calls `blocker` tool with question, category, and structured context
2. Plugin validates, deduplicates (cooldown), and logs to `BLOCKERS.md`
3. Plugin responds: "Great, blocker registered, move on!"
4. AI continues with independent tasks

If AI tries to stop prematurely:
- Plugin injects "continue" prompt if blockers remain unresolved
- Rate-limited to prevent infinite loops (max 5 reprompts per 5 minutes)

AI signals true completion by saying: `"BLOCKER_DIVERTER_DONE!"`

## Blocker Log Format

Blockers are logged to `BLOCKERS.md` in a structured markdown format:

```markdown
## Blocker #1771161981594-ses_abc123-5db59e
**Timestamp:** 2026-02-15T14:32:10.594Z  
**Session:** ses_abc123-def456  
**Category:** architecture

### Question
Which authentication framework should I use for the user login system?

### Context
Task: #3 "Implement user authentication"  
Action: Setting up JWT token validation middleware  
Files: src/middleware/auth.ts:45, src/config/jwt.ts  
Progress: Created auth middleware skeleton, installed jsonwebtoken package  
Blocker: Need to decide between RS256 (asymmetric) vs HS256 (symmetric) signing

### Additional Info
Blocks Progress: Yes

---
```

<details>
<summary><strong>Customizing the Format</strong></summary>

You can customize the blocker log format per-project by creating `.opencode/BLOCKERS.template.md`:

```markdown
## Blocker #{{id}}
**Time:** {{timestamp}}  
**Session:** {{sessionId}}  
**Category:** {{category}}

### Question
{{question}}

### Context
{{context}}

{{optionsSection}}
{{chosenSection}}

### Additional Info
Blocks Progress: {{blocksProgress}}

---
```

**Available variables:**
- `{{id}}` — Unique blocker identifier
- `{{timestamp}}` — ISO 8601 timestamp
- `{{sessionId}}` — OpenCode session ID
- `{{category}}` — Blocker category (architecture, security, etc.)
- `{{question}}` — The blocking question
- `{{context}}` — Structured context (task, action, files, progress)
- `{{blocksProgress}}` — "Yes" or "No"
- `{{optionsSection}}` — Auto-generated options list (if present)
- `{{chosenSection}}` — Auto-generated chosen option + reasoning (if present)

If no custom template exists, the plugin uses a sensible default format.

</details>

## Contributing

Contributions welcome! Please read [.specify/memory/constitution.md](.specify/memory/constitution.md) for development standards.

<details>
<summary><strong>Local Development Setup</strong></summary>

```bash
# Clone and setup
git clone https://github.com/Nikro/opencode-blocker-diverter.git
cd opencode-blocker-diverter
bun install

# Run tests
bun test              # Run all tests
bun test --coverage   # With coverage report
bun test --watch      # Watch mode

# Code quality
bun run typecheck     # TypeScript check
```

### Key Development Principles
- **Modular architecture** — 300-400 lines per module, 500-line hard limit
- **Test-driven development** — tests before implementation
- **TypeScript strict mode** — no `any` types
- **Performance first** — async operations, caching, debouncing
- **Security conscious** — validate inputs, sanitize outputs

See [AGENTS.md](AGENTS.md) for full development guide.

### Publishing

This package uses **Trusted Publishing** (OIDC) via GitHub Actions for secure automated releases.

See [PUBLISHING.md](PUBLISHING.md) for complete publishing workflow and security setup.

</details>

## License

MIT © 2026

## Acknowledgments

- [OpenCode](https://opencode.ai) — extensible AI coding agent
- Community plugin examples and patterns
- Contributors and testers

---

**Status**: ✅ Stable | **Version**: 0.2.9
