# opencode-title-gen

> ## ⚠️ DEPRECATED
>
> **OpenCode now has built-in session title generation.** This plugin is no longer needed.
>
> OpenCode natively includes a hidden `title` agent that automatically generates session titles
> after the first user message, using a lightweight model. Configure it in your `opencode.json`:
>
> ```jsonc
> {
>   // Use a cheap, fast model for title generation
>   "small_model": "anthropic/claude-haiku-4-5",
>
>   // Or override the title agent specifically
>   "agent": {
>     "title": {
>       "model": "github-copilot/gpt-5-mini",
>     },
>   },
> }
> ```
>
> See the [OpenCode docs](https://opencode.ai/docs/config/) for more details.
>
> **Migration**: Remove this plugin from your OpenCode config. The native title generation works out of the box.

---

[![npm version](https://img.shields.io/npm/v/opencode-title-gen?color=369eff&labelColor=black&style=flat-square)](https://www.npmjs.com/package/opencode-title-gen)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/wowuliao11/opencode-title-gen/ci.yml?label=CI&labelColor=black&style=flat-square)](https://github.com/wowuliao11/opencode-title-gen/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?labelColor=black&style=flat-square)](https://www.typescriptlang.org/)

Your OpenCode sessions are all called `New session - 2026-03-26T15:32:42.757Z`. Every single one.

This plugin fixes that. Session goes idle → AI reads the conversation → generates a meaningful title → done. Zero interaction.

---

## Installation

### For Humans

Copy and paste this prompt to your LLM agent (Claude Code, OpenCode agent, etc.):

```
Install and configure opencode-title-gen by following the instructions here:
https://raw.githubusercontent.com/wowuliao11/opencode-title-gen/main/docs/guide/installation.md
```

Or read the [Installation Guide](docs/guide/installation.md), but seriously, let an agent do it.

### For LLM Agents

Fetch the installation guide and follow it:

```bash
curl -fsSL https://raw.githubusercontent.com/wowuliao11/opencode-title-gen/main/docs/guide/installation.md
```

---

## Skip This README

We're past the era of reading docs. Just paste this into your agent:

```
Read this and set up the plugin: https://raw.githubusercontent.com/wowuliao11/opencode-title-gen/main/README.md
```

---

## Before / After

```
Before:                                        After:
├── New session - 2026-03-26T15:32:42.757Z     ├── Fix auth middleware token refresh
├── New session - 2026-03-26T14:18:03.221Z     ├── Add pagination to /api/users
├── New session - 2026-03-25T22:47:11.089Z     ├── Refactor DB connection pooling
├── New session - 2026-03-25T19:05:58.443Z     ├── Debug CI flaky test in auth.spec
└── New session - 2026-03-25T16:33:27.615Z     └── Set up ESLint v9 flat config
```

---

## Highlights

|     | Feature               | What it does                                                                   |
| :-: | :-------------------- | :----------------------------------------------------------------------------- |
| 🎯  | **Auto Title**        | Session goes idle → AI reads conversation → generates title. Zero interaction. |
| 🔄  | **Two Modes**         | `once` (default): set and forget. `continuous`: title evolves with the chat.   |
| 🧠  | **Smart Compression** | First + last assistant message per turn. Saves ~60% tokens.                    |
| 🔒  | **Race-Safe**         | Debounced. Locked per-session. No duplicate generation.                        |
| ⚡  | **Lightweight**       | 10.9kb bundled. Zero runtime dependencies. ESM only.                           |
| 🛠️  | **Configurable**      | Model, threshold, mode — all optional. Works out of the box.                   |

---

## How It Works

| Step | What happens                                                                                  |
| ---- | --------------------------------------------------------------------------------------------- |
| 1    | Listens for `session.idle` and `session.status` (type=idle) events                            |
| 2    | Counts idle events per session; triggers at threshold (default: 2)                            |
| 3    | Skips sub-sessions and sessions with custom titles (in `once` mode)                           |
| 4    | Extracts conversation (first + last assistant message — saves ~60% tokens)                    |
| 5    | Creates a temporary sub-session, prompts the model for a concise title (3–7 words, ≤60 chars) |
| 6    | Updates the session title, cleans up the sub-session                                          |

---

## Configuration

Create `~/.config/opencode/smart-title.jsonc`:

```jsonc
{
  // "once" = generate title once (default), "continuous" = update as conversation evolves
  "mode": "once",
  // Uncomment to use a specific model (default: your OpenCode default model)
  // "model": "github-copilot/claude-haiku-4.5",
}
```

| Option            | Default          | What it does                                            |
| ----------------- | ---------------- | ------------------------------------------------------- |
| `enabled`         | `true`           | Kill switch                                             |
| `debug`           | `false`          | Verbose logging                                         |
| `mode`            | `"once"`         | `"once"`: title once, `"continuous"`: title evolves     |
| `model`           | _(your default)_ | Model for title generation, `providerID/modelID` format |
| `updateThreshold` | `2`              | Generate title after N idle events per session          |
| `maxTurns`        | `10`             | Max conversation turns fed to the model                 |
| `maxCharsPerPart` | `300`            | Truncate each message part to N chars                   |
| `debounceMs`      | `1500`           | Ignore rapid-fire idle events within this window        |

> **Tip**: Use a cheap, fast model. Haiku is perfect for this. You're generating 5-word titles, not writing essays.

### Title Modes

**`once`** (default): Generate a title when the session has a default title (`New session - <timestamp>`). Once a real title is set, it stays. Best for most users.

**`continuous`**: Re-generate the title every time the idle threshold is reached. The title evolves as the conversation progresses — from "Setting up auth" to "Debugging OAuth token refresh". Best for long, multi-topic sessions.

---

## Debug

```bash
# Latest log file
tail -f ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1)

# Filter for this plugin
grep smart-title ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1)
```

Set `"debug": true` in config for verbose output.

---

## Architecture

```
src/
  index.ts           → Plugin entry point (registers hooks)
  types.ts           → SmartTitleConfig, ResolvedConfig, TitleMode
  config.ts          → JSONC config loader with defaults
  logger.ts          → Structured logger via client.app.log
  event-handler.ts   → Idle event handler: threshold, debounce, per-session lock, mode logic
  title-generator.ts → Sub-session title generation with XML prompt
  utils.ts           → extractConversation, isDefaultTitle, cleanTitle
tests/
  utils.test.ts      → 24 unit tests (vitest)
docs/
  guide/
    installation.md  → Step-by-step setup guide (for humans and agents)
```

10.9kb bundled. Zero runtime dependencies. ESM only.

---

## Development

```bash
pnpm install          # install deps
pnpm build            # TypeScript + esbuild bundle
pnpm test             # vitest
pnpm lint             # ESLint v9 flat config
pnpm format:check     # Prettier
pnpm typecheck        # strict mode (noUncheckedIndexedAccess, etc.)
```

**Tooling**: ESLint 9 + Prettier + Husky + lint-staged + commitlint (conventional commits). All pre-configured.

---

## Contributing

1. Fork → branch (`git checkout -b feat/my-feature`)
2. Make changes
3. `pnpm lint && pnpm test && pnpm build`
4. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`)
5. Open a PR

---

## License

MIT

---

> This plugin is not affiliated with the OpenCode team. Built independently because I got tired of `New session - <timestamp>` titles.
