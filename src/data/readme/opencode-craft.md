# opencode-craft

[![npm version](https://img.shields.io/npm/v/opencode-craft.svg?color=10b981)](https://www.npmjs.com/package/opencode-craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://img.shields.io/npm/dm/opencode-craft.svg)](https://www.npmjs.com/package/opencode-craft)

> **Senior pair programmer, craftsmanship coach, and knowledge ledger for [OpenCode](https://opencode.ai).**

`opencode-craft` transforms OpenCode into a seasoned Principal Engineer / Technical Craft Lead sitting beside you. It builds real, working software at full velocity while actively coaching system architecture, engineering trade-offs, portfolio craftsmanship, and interview readiness.

---

## What's Included

### 1. The `craft` Agent
- **Full Velocity Pairing**: Proactively writes code, refactors, creates files, and runs tools—no passive lecturing or robotic lists.
- **Explain-as-you-Build Cadence**: Every move is framed with a 1–2 sentence intuition, cleanly executed, and linked to what senior interviewers or tech leads look for.
- **Portfolio Craftsmanship**: Prioritizes clean modular boundaries, edge case handling, performance characteristics, and self-documenting code.

### 2. Auto-Synced Knowledge Ledger (`LEARNING_PATH.md`)
Whenever OpenCode starts in a project, or a session starts or finishes, the plugin automatically extracts session queries, agent modes, and architectural decisions from OpenCode's local history and maintains a concise `LEARNING_PATH.md` right in your repository root.
- Syncs run in the background and never block session startup.
- A 5-minute freshness window skips redundant rewrites; `npx opencode-craft sync` forces an immediate update.
- Survives across sessions and branches.
- Provides persistent memory so your pair programmer always picks up where you left off.
- Includes a dedicated section for custom notes and interview talking points that persist across auto-syncs.

### 3. Built-In Skills
- **`@expand`**: Trigger deep theoretical dives into underlying mathematics (e.g. 3D covariance, quaternions), low-level memory layouts, hardware constraints (e.g. GPU rasterization, cache locality), and algorithmic complexity.
- **`@interview-angle`**: Formulates STAR-style technical justifications, contrasting alternative designs, identifying antagonistic probing questions, and flagging rookie red flags.

---

## Quick Start

### Option A: Zero-Touch Plugin (Recommended)

Add `opencode-craft` to your global or project `opencode.json` (or `~/.config/opencode/opencode.jsonc`):

```json
{
  "plugin": [
    "opencode-craft"
  ]
}
```

Restart OpenCode. That's it! 
- The `@craft` agent and skills (`@expand`, `@interview-angle`) are automatically available.
- The `LEARNING_PATH.md` ledger syncs in the background on every session.

---

### Option B: Eject to Local Markdown Files

If you prefer to inspect, modify, or version-control the agent instructions and skills directly in your project:

```bash
# Eject into current project (.opencode/)
npx opencode-craft eject

# Or eject globally into ~/.config/opencode/
npx opencode-craft eject --global
```

OpenCode's configuration hierarchy ensures local files in `.opencode/` or `~/.config/opencode/` always override default plugin behaviors, giving you 100% control over the prompt templates.

---

## Manual Ledger Sync

You can also trigger a manual ledger update at any time:

```bash
npx opencode-craft sync
```

---

## Updating

OpenCode caches installed plugins in `~/.cache/opencode/packages/` and resolves the `latest` tag **only on first install** — it never re-checks npm on later startups. After a new release, force a refresh with:

```bash
rm -rf ~/.cache/opencode/packages/opencode-craft@latest
```

The next OpenCode launch will re-resolve `opencode-craft@latest` and install the newest version.

> **During plugin development**, point OpenCode at your working tree instead to skip the cache entirely:
>
> ```json
> { "plugin": ["file:///path/to/opencode-craft"] }
> ```

---

## Architecture & Design

1. **Zero Runtime Dependencies**: Written in clean, native Node.js ESM. Runs instantly without requiring runtime compilation or heavy dependency trees.
2. **In-Memory Configuration Cascade**: Uses OpenCode's `config(cfg)` hook to register agents and skills dynamically without polluting your project directory with scaffolded files unless you explicitly `eject`.
3. **Non-Blocking Observability**: Background ledger syncs run via child processes and fail silently if unconfigured, never blocking user prompts or tool invocations.

---

## License

MIT © [Paulo Alves](https://github.com/pauloralves)
