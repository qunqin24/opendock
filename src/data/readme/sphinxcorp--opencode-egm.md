# @sphinxcorp/opencode-egm

OpenCode V2 plugin for the Elephant & Goldfish Model (EGM).

EGM helps develop ideas with context and review documents with fresh eyes. It registers:

- One primary orchestrator agent: `egm`
- Eight read-only reviewer subagents (Goldfish reviewers)
- Seven slash commands: `/egm-bootstrap`, `/egm-brainstorm`, `/egm-draft`, `/egm-drift-report`, `/egm-resolve`, `/egm-review`, `/egm-review-loop`
- Seven skills with OpenCode-specific execution instructions

## Installation

From npm:

```sh
opencode plugin add @sphinxcorp/opencode-egm
```

Or add it to your `opencode.jsonc`:

```jsonc
{
  "plugins": ["@sphinxcorp/opencode-egm"]
}
```

## Usage

Run any EGM slash command in an OpenCode session, for example:

```
/egm-review /path/to/design.md
```

The orchestrator dispatches specialized reviewers in fresh subagent sessions and writes reports to your working directory.

## Repository structure

```
index.ts              # Plugin entry point (TypeScript)
bundle/               # Agents, skills, and resources shipped with the plugin
scripts/              # Validation and maintenance helpers
AGENTS.md             # Agent-driven upstream sync workflow
upstream.lock.json    # Last synced upstream commit
```

## Development

```sh
npm install
npm run validate      # Validate bundle contents
npm run build         # Typecheck
npm test              # Registration smoke test
```

## Upstream sync

This plugin ports content from https://github.com/google/elephant-goldfish-model.
See `AGENTS.md` for the agent-driven sync workflow that fetches upstream assets,
applies OpenCode rewrites, and validates before promotion.

## Repository Root (Blueprint)

## System Overview
OpenCode V2 plugin for the Elephant & Goldfish Model (EGM). Registers one primary orchestrator agent (`egm`), eight read-only reviewer subagents, seven slash commands, and seven skills from the `bundle/` directory.

## Local Interface & Invariants
- `index.ts` — plugin entry point; `loadPersonas()`, `loadSkills()`, `splitFrontmatter()`, `headerValue()`, `reviewerPermissions()`, `orchestratorPermissions()`, `reviewerSystem()`, `orchestratorSystem()`, default `Plugin.define` export.
- `PACKAGE_ROOT`/`BUNDLE`/`GUIDE` resolve relative to the compiled entry point.

## Subdirectories & System Boundaries
- [bundle](./bundle/README.md) - Agents, skills, and shared resources.
- [scripts](./scripts/README.md) - Validation and maintenance helpers.
- [tests](./tests/README.md) - Plugin registration smoke test.
- [tests/unit](./tests/unit/README.md) - Smoke harness.

## Global Invariants
- `bundle/` is the source of truth for plugin content.
- `npm run validate` must pass before/after changes.
- VCS changes are deferred to the human user.

## Global Side Effects
- Plugin setup transforms agents, commands, and skills in the OpenCode context.

## System Verification
- Run: `npm run build && npm run validate && npm test`

## License

Apache-2.0
