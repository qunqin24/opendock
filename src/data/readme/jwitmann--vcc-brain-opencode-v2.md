<p>
  <img src="docs/assets/banner.jpeg" alt="VCC Brain, the self-improving context engine for coding agents">
</p>

---

### VCC Brain: The self-improving context engine for coding agents

[![npm version](https://img.shields.io/npm/v/@jwitmann/vcc-brain-helper?color=8cdb9f)](https://www.npmjs.com/package/@jwitmann/vcc-brain-helper) [![Node.js 20+](https://img.shields.io/badge/Node.js-%3E%3D20-417e3f?logo=nodedotjs&logoColor=white)](https://nodejs.org/) [![BSD-3-Clause license](https://img.shields.io/badge/License-BSD--3--Clause-22C55E)](./LICENSE) [![CI](https://github.com/jwitmann/vcc-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/jwitmann/vcc-brain/actions)

VCC Brain gives your agent a brain for documenting all their work. As the agent works, it automatically documents within this brain — specs, decisions, standards, research, lessons. Every new session starts knowing everything the last one learned.

#### Origin

Originally forked from [aerovato/operator-memory](https://github.com/aerovato/operator-memory); continued here as an independent line with deterministic context management (VCC compaction, lossless trim, recall/search recovery), cache-aware preamble refresh, and the DeepSeek Harness adapter.

#### Features

- **Complete Context Engine** — Documentation, memory, indexes, and skills within a single integrated system.
- **Automatic Documentation** — Specs, decisions, research, and more are automatically documented by the agent.
- **Transparent Memory** — Memory is stored as Markdown documents you can read, update, and delete.
- **Sharable Knowledge** — Track documents with Git and share knowledge with your team.
- **Zero Infrastructure** — No background agents, no embeddings, no vector database, no model configuration.
- **Deterministic Context Management** — Reduce what a session resends to the model through deterministic rules (never model judgment), with per-session receipts for everything it does — and compactions shaped so your rules survive them: summaries must reference Brain paths instead of paraphrasing them. Off by default and Brain-gated. [OpenCode](docs/harnesses/opencode-v2.md#context-management) · [DeepSeek](docs/harnesses/deepseek.md#context-management).
- **Cache-Aware Preamble Refresh** — Re-render the preamble mid-session when the Brain changes, timed to cold prompt-cache moments so it costs nothing. [How it works](docs/harnesses/opencode-v2.md#preamble-refresh).
- **Brain-Update Nudges** — A quiet reminder to record durable knowledge during long sessions; never an automatic writer. [How it works](docs/harnesses/opencode-v2.md#brain-updates).
- **Cross-Session Recall** — Search past sessions by keyword and restore full turns, scoped to the current project plus mutual peers (declare peers in `.vcc-brain/config.json`; sharing applies only where both sides list each other). The index is local-only with 30-day retention; title a session `[no-recall]` to opt out. [OpenCode](docs/harnesses/opencode-v2.md#cross-session-recall) · [DeepSeek](docs/harnesses/deepseek.md#cross-session-recall).

### Installation

#### Using npm (recommended)

VCC Brain is managed via the VCC Brain Helper, which also provides setup and agent instructions. Install the Helper with npm:

```sh
npm install --global @jwitmann/vcc-brain-helper
```

Or Bun:

```sh
bun add --global --minimum-release-age 0 @jwitmann/vcc-brain-helper@latest
```

`vcc-brain-helper --help` lists the user and agent commands.

Then install the VCC Brain adapter for your harness. Click each link for harness-specific information.

| Harness                                                      | Status                                             | Install                                |
| ------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------- |
| [OpenCode](docs/harnesses/opencode-v2.md)                    | 🟢 Fully Supported (V2)                            | `vcc-brain-helper install opencode`    |
| [DeepSeek Harness](docs/harnesses/deepseek.md)               | 🟢 Fully Supported                                 | `vcc-brain-helper install deepseek`    |
| [Claude Code (CLI + Desktop)](docs/harnesses/claude-code.md) | 🟡 Memory only — no compaction, recall, or status  | `vcc-brain-helper install claude-code` |
| [Codex (CLI + Desktop)](docs/harnesses/codex.md)             | 🟡 Memory only — no compaction, recall, or status  | `vcc-brain-helper install codex`       |
| [Pi](docs/harnesses/pi.md)                                   | 🟡 Memory only — no compaction or recall             | `vcc-brain-helper install pi`          |

- Tier 1 (🟢) is the full system: memory, deterministic compaction, cross-session recall, and status.
- Tier 2 (🟡) injects memory plus the setup commands only — no deterministic compaction or cross-session recall (status UI varies by adapter: Pi has a footer, Codex and Claude Code have none).

> **Note:** Tier 2 is not on a path to Tier 1. On Codex and Claude Code the ceiling is structural: compaction stays model-owned with no substitute seam, so deterministic compaction — the VCC proposition — cannot be built there; memory injection is all these adapters will ever do. On Pi the seams exist, but the maintainer does not run it, so no upgrade is planned.

#### Direct harness installs (no Helper)

##### OpenCode

Requires `v2.x` (local install live-verified on `v2.4.1`):

```sh
opencode plugin add @jwitmann/vcc-brain-opencode-v2
```

Or declare it in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@jwitmann/vcc-brain-opencode-v2"]
}
```

String and object forms can mix in one `plugins` array.

With options (all optional; per-project `.vcc-brain/config.json` overrides them):

```jsonc
// opencode.jsonc
{
  "plugins": [
    {
      "package": "@jwitmann/vcc-brain-opencode-v2",
      "options": { "vcc-brain": { "contextManagement": { "enabled": true, "ratio": 0.8 } } }
    }
  ]
}
```

From source instead: clone `https://github.com/jwitmann/vcc-brain`, build the plugin (`bun run build:opencode-v2`), and register the local path (`"package": "/abs/path/to/vcc-brain/packages/opencode-v2/dist"`) in the same object form.

##### DeepSeek Harness

Install into a profile with its native command:

```sh
dsh plugin --profile <profile-name> add @jwitmann/vcc-brain-deepseek
```

##### Pi

```sh
pi install npm:@jwitmann/vcc-brain-pi
```

#### Setup

Setup is a conversation with your agent. Run each command in a new conversation.

1. First time only: `/vcc-brain:user-init` — set up your global user partition.
2. In each new project: `/vcc-brain:project-init` — scaffold VCC Brain, migrate existing documents, and index the repo.
3. Start a new conversation and do normal work.

#### For the best long-session results

Long sessions must compact, and a plain summarizer rewrites your rules in the process. Pair VCC Brain with deterministic compaction:

- On DeepSeek Harness, install the VCC engine alongside the VCC Brain plugin — without it, compaction falls back to the host's LLM summarizer:

```sh
dsh plugin --profile <profile-name> add dsh-compaction-vcc
```

- On OpenCode, install the VCC engine alongside the VCC Brain plugin — without it, compaction falls back to the in-tree reference port plus the host's LLM summarizer, which works but is not the same (no `vccRev`/`vccConfigHash` stamping, no tunables, debug-rev header):

```sh
opencode plugin add opencode-vcc-compaction
```

- On Pi, pair VCC Brain with the third-party deterministic compactor [pi-tuck](https://github.com/galyavin/pi-tuck) — the same no-model-call idea (transcript-preserving cuts plus exact post-cut recall), maintained outside this project. No adapter wires the two together yet; someone with Pi needs to write it:

```sh
pi install npm:pi-tuck
```

When starting cold on an existing project, expect a sparse brain at first; ask the agent to write the first specifications for the modules you work on. Once those documents exist, later sessions maintain them as part of ordinary work.

<p align="center"><big><strong>New to VCC Brain? Read the <a href="docs/getting-started.md">Getting Started guide</a>.</strong></big></p>

### How VCC Brain Works

Agents excel in a single session but forget everything the moment it ends. Future sessions waste tokens re-gathering an incomplete context: re-exploring the codebase, re-learning the architecture, re-teaching decisions and corrections.

VCC Brain gives the agent a durable workspace of Markdown, kept in three places:

- `.vcc-brain/` — private project knowledge, stays on your machine
- `.vcc-brain-shared/` — project knowledge published with the repository
- `~/.vcc-brain/user/` — your personal rules and knowledge, used across projects

Every session runs the same loop:

1. **Consult** — the agent starts from your Brain: instructions, codebase index, specs, guides.
2. **Build** — the agent does normal development work, informed by that knowledge.
3. **Update** — the agent records what changed: new specs, decisions, standards, lessons.

When project truth changes, the agent updates the canonical file instead of adding a RAG database record. For more details, see [Architecture](docs/architecture.md).

<p>
  <img src="docs/assets/change-the-loop.png" alt="The memory-aware agentic loop: consult the brain, build, update the brain">
</p>

### Everyday Workflow

1. Give the agent normal development work.
2. The agent automatically consults existing knowledge: index for navigating code, specs for module contracts, guides for third-party integration details.
3. The agent automatically updates existing knowledge: When project truth changes, the relevant documents are automatically updated.
4. The next session continues from the updated knowledge.

Sometimes agents hesitate to create, consolidate, or split documents. In that case, steer the agent towards making larger architectural decisions:

- "Write a spec for this feature before implementing it."
- "Record this research so we do not repeat the investigation."
- "These two documents overlap. Consolidate them."
- "This document is too large. Split it."
- "Promote this spec to Shared so the team receives it."

### Roadmap

**VCC Brain is under active development.** More features are on the way. Each will come with an explicit on/off switch in case you prefer the vanilla VCC Brain experience.

### VS Other Memory Plugins

Snippet capture, RAG retrieval, and context compression all fail the same way.

- [Read the comparison.](docs/comparison.md)

### Learn More

- [Getting Started](docs/getting-started.md) - onboarding and usage guide: how VCC Brain works, setup, daily use, directing the agent, and reviewing the Brain. Includes the command reference.
- [Architecture](docs/architecture.md) - how partitions, catalogs, indexes, and deterministic context loading work.
- [Harness docs](docs/harnesses/) - per-harness installation, verification, commands, updates, and troubleshooting.
- [Troubleshooting](docs/troubleshooting.md) - validation, repair, and update recovery.

### License

BSD 3-Clause. See [`LICENSE`](LICENSE).
