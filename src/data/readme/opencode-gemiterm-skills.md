<!-- 
  SEO description: AI agent skills for Google Gemini — list, search, export Gemini chats and run 
  structured debates with Gemini. Works with OpenCode, Claude Code, and any skill-compatible AI agent.
  Keywords: Gemini CLI, gemiterm, AI agent skills, Google Gemini terminal, Gemini chat export, 
  AI debate, multi-turn debate, terminal AI, agent skills, Gemini terminal
-->

<div align="center">

# opencode-gemiterm-skills

**Gemini terminal skills for AI agents — chat export, search & AI-powered debates**

[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-blue?link=https://opencode.ai)](https://opencode.ai)
[![npm version](https://img.shields.io/npm/v/opencode-gemiterm-skills?label=npm)](https://www.npmjs.com/package/opencode-gemiterm-skills)
[![MIT License](https://img.shields.io/badge/License-MIT-green?link=LICENSE)](LICENSE)

[Quick Start](#quick-start) · [Skills](#bundled-skills) · [Examples](#examples) · [Requirements](#requirements) · [Contributing](CONTRIBUTING.md)

</div>

---

Bring the power of [Google Gemini](https://gemini.google.com) directly into your AI agent sessions. This package bundles two skills — **gemiterm** and **debate-with-gemini** — so any compatible agent can search your Gemini chats, export conversation history, and run structured multi-turn debates with Gemini to validate ideas before you commit to code.

Works with [OpenCode](https://opencode.ai), and any agent that supports the `skill` tool or can invoke CLI-installed skills via `bunx`/`npx`.

## Bundled skills

| Skill | What it does |
|-------|-------------|
| **gemiterm** | Search, list, export, and manage your Google Gemini chat history from the terminal. |
| **debate-with-gemini** | Run structured multi-turn technical debates with Gemini AI — perfect for validating architecture decisions, trade-offs, and design choices. |

Both skills are loaded on demand. Metadata (name + description) is pre-loaded at session start; the full skill body loads only when the agent decides it's relevant — zero overhead when not in use.

## Quick start

```bash
# Install via skills.sh
npx skills add expert-vision-software/opencode-gemiterm-skills [--skill debate-with-gemini --skill gemiterm]

# Or with bunx
bunx opencode-gemiterm-skills install [--scope global]

# Or with npx
npx opencode-gemiterm-skills install [--scope global]

```

That's it — skills are available immediately.

## Examples

### 🔍 Search and export Gemini chats

> **You:** "Find my Gemini chats about React Server Components and export them."

Agent loads the `gemiterm` skill, searches your Gemini history, and exports matches:

```
Found 3 matching chats. Exported all to ./exports/ — here's a summary of each…
```

### 📦 Bulk export for offline analysis

> **You:** "Export all my recent Gemini chats so I can grep through them."

Agent lists and exports chats in parallel:

```
Exported 18 chats to ./gemini-exports/ in Markdown. Search with: grep -r "topic" ./gemini-exports/
```

### 🗣️ Structured debate with Gemini

> **You:** "Debate Gemini for/against using SQLite as the primary database for a SaaS app. Context: docs/arch.md. 5 turns."

Agent reads your context, seeds a new Gemini chat with the opposing stance, and runs 5 rounds of autonomous back-and-forth:

```
Debate complete (5 turns). Gemini argued FOR SQLite (simplicity, zero-config).
I argued AGAINST (concurrency limits, no network access, scaling ceiling).
Key agreements: fine for prototyping, migrate to Postgres before 100+ concurrent users.
```

### 🔄 Continue a previous debate

> **You:** "Continue that SQLite debate for 3 more turns. Here's the chat_id: c_abc123."

Agent picks up exactly where the last round left off:

```
Resumed debate on chat c_abc123. Ran 3 additional turns.
Gemini conceded on the replication point but raised WAL-mode mitigations.
```

## Requirements

| Component | Notes |
|-----------|-------|
| **[gemiterm](https://github.com/Expert-Vision-Software/gemiterm) CLI** | Must be installed and authenticated. Both skills depend on it. |
| **Google Account** | Required for gemini web. Expiring cookie is stored locally only. |

## Installation

### CLI install (any agent)

```bash
# Install via skills.sh
npx skills add expert-vision-software/opencode-gemiterm-skills [--skill debate-with-gemini --skill gemiterm]

# Via bunx
bunx opencode-gemiterm-skills install

# Via npx
npx opencode-gemiterm-skills install
```

### OpenCode plugin

Add to your `opencode.json`:

```json
{
  "plugins": ["opencode-gemiterm-skills"]
}
```

## Why this plugin?

- **No context switching** — access your Gemini conversations without leaving your agent.
- **Zero-config debates** — let your agent argue both sides of a technical decision with real Gemini responses.
- **Portable chat data** — export Gemini history to Markdown for grep, archival, or feeding into other tools.
- **Lightweight** — pure skill bundle, no runtime dependencies, loads on demand.

## Acknowledgments

- [OpenCode](https://opencode.ai) — plugin architecture and skill loader
- [gemiterm](https://github.com/Expert-Vision-Software/gemiterm) — underlying Gemini CLI

---

<div align="center">

**[📦 Install from npm](https://www.npmjs.com/package/opencode-gemiterm-skills)** · **[🤝 Contribute](CONTRIBUTING.md)** · **[📄 License](LICENSE)**

</div>
