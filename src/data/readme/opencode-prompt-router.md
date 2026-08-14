# opencode-prompt-router

An OpenCode plugin that automatically matches user prompts to relevant skills (SKILL.md files) using TF-IDF text scoring. When a user sends a message, the router scores all discovered skills and injects a preamble instructing the AI to load the best matches.

## How it works

1. **Discovery** -- Recursively finds `SKILL.md` files in `~/.agents/skills/`, `~/.claude/skills/`, and `<workdir>/.opencode/skills/`
2. **Parsing** -- Extracts YAML frontmatter (`name`, `description`, `tags`) from each skill file
3. **Enrichment** -- Auto-derives tags from skill body content for skills without explicit tags
4. **Scoring** -- Two-stage TF-IDF scoring:
   - **Stage 1:** Weighted field matching (name ×3, tags ×2, description ×1) with suppressor filtering and IDF floor
   - **Stage 2:** Body scan bonus for borderline matches
5. **Routing** -- Returns top N matches above the minimum score, formatted as a preamble prepended to the user's message

## Setup

```bash
bun install
```

Add to your `opencode.json`:

```json
{
  "plugin": [
    ["opencode-prompt-router", { "minScore": 15, "debug": true }]
  ]
}
```

Or using a GitHub reference directly:

```json
{
  "plugin": [
    ["github:anderssv/opencode-prompt-router", { "minScore": 15, "debug": true }]
  ]
}
```

> **Note:** Using a GitHub reference in the `plugin` array means OpenCode runs
> `bun install` at startup for each workspace. On the Desktop version this can
> add noticeable load time. If that's a problem, install via a `package.json`
> in `~/.config/opencode/` and use a one-line shim in `~/.config/opencode/plugins/`
> instead:
>
> ```json
> // ~/.config/opencode/package.json
> { "dependencies": { "opencode-prompt-router": "github:anderssv/opencode-prompt-router" } }
> ```
> ```ts
> // ~/.config/opencode/plugins/prompt-router.ts
> import type { Plugin } from "@opencode-ai/plugin";
> import { PromptRouter as _PromptRouter } from "opencode-prompt-router";
> export const PromptRouter: Plugin = (ctx) => _PromptRouter(ctx, { debug: true });
> ```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `minScore` | 15 | Minimum TF-IDF score to surface a skill |
| `maxPromptLength` | 500 | Prompts longer than this are skipped |
| `debug` | false | Enable visible preamble output and detailed logging |

Set `PROMPT_ROUTER_DEBUG=1` as an alternative to enable debug mode via environment variable.

All matches are logged to `~/prompt-router.log`.

## Testing

```bash
bun test
```

Tests include unit tests for each module, precision regression tests against real skill corpora, and approval-based false-positive tests.

## Inspiration

This project was inspired by [The Prompt Router — a 47ms keyword classifier for context selection](https://wiki.totto.org/blog/2026/04/28/the-prompt-router--a-47ms-keyword-classifier-for-context-selection/).

## Project structure

```
index.ts              Plugin entry point (hooks into chat.message)
core/
  tokenizer.ts        Text tokenization + basic stemming
  parser.ts           YAML frontmatter parser for SKILL.md
  discovery.ts        Recursive SKILL.md file finder
  cache.ts            Mtime-based skill cache
  corpus.ts           IDF index builder
  enrich.ts           Auto-derives tags from body content
  scorer.ts           Two-stage TF-IDF scoring
  router.ts           Orchestrator: discover → score → format
  config.ts           Default weights, suppressors, thresholds
  types.ts            Type definitions
tests/
  *.test.ts           Unit and regression tests
  fixtures/skills/    Fixture SKILL.md files
  approvals/          Approval test snapshots
```
