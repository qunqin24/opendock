<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/solomemory-ai/.github/main/brand/logo-mark-white-transparent.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/solomemory-ai/.github/main/brand/logo-mark-black-transparent.png">
  <img src="https://raw.githubusercontent.com/solomemory-ai/.github/main/brand/logo-mark-black-transparent.png" alt="Solo Memory" width="120">
</picture>

# Solo Memory for OpenCode

[![npm version](https://img.shields.io/npm/v/oc-solomemory?color=blue&label=stable)](https://www.npmjs.com/package/oc-solomemory)
[![npm dev version](https://img.shields.io/npm/v/oc-solomemory-dev?color=orange&label=dev)](https://www.npmjs.com/package/oc-solomemory-dev)
[![npm downloads](https://img.shields.io/npm/dm/oc-solomemory)](https://www.npmjs.com/package/oc-solomemory)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Persistent memory plugin for [OpenCode](https://opencode.ai). Your AI agent remembers across sessions and projects.

[Solo Memory](https://solomemory.com) gives your coding agent long-term memory — preferences you've shared, decisions you've made, context from past sessions. It all carries forward automatically.

---

## Install

Get your API key at [solomemory.com](https://solomemory.com), then:

```bash
npx oc-solomemory@latest install --api-key=your-key
```

Restart OpenCode. Done.

## What It Does

- **Remembers context** — Your preferences, project decisions, and past conversations are injected into every new session
- **Syncs conversations** — Sessions are synced to Solo Memory, building knowledge over time
- **Scopes memory** — Memories are organized by user, project, repo, and branch
- **Keyword detection** — Say "remember this" and it saves to memory
- **Codebase indexing** — Run `/solomemory-init` to memorize your project structure

## How It Works

```
You start a session
  → Plugin fetches your profile + relevant memories
  → Agent has full context from day one

You work with the agent
  → Session syncs to Solo Memory when idle

Next session
  → Agent already knows what you discussed
```

### Memory Scopes

| Scope       | What it remembers                    | Example                             |
| ----------- | ------------------------------------ | ----------------------------------- |
| **User**    | Your preferences across all projects | "Prefers TypeScript strict mode"    |
| **Project** | Project-specific context             | "Uses Bun, not Node"                |
| **Repo**    | Repository knowledge                 | "Auth uses JWT with refresh tokens" |
| **Branch**  | Branch-specific work                 | "Working on dark mode feature"      |

## Configuration

See [docs/CONFIG.md](docs/CONFIG.md) for advanced options.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

[AGPL-3.0](LICENSE)
