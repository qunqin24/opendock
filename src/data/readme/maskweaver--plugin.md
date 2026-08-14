# 🎭 Maskweaver: Expert Persona Framework for OpenCode

<div align="center">

<img src="docs/images/hero.png" width="800" alt="Maskweaver Hero Image">

> **The npm for AI personas** — Level up your OpenCode assistant with expert personalities

[![GitHub Release](https://img.shields.io/github/v/release/ulgerang/maskweaver?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/ulgerang/maskweaver/releases)
[![License](https://img.shields.io/badge/license-MIT-white?labelColor=black&style=flat-square)](LICENSE)
[![npm](https://img.shields.io/npm/v/maskweaver?color=ff6b35&labelColor=black&style=flat-square)](https://www.npmjs.com/package/maskweaver)

[English](README.md) | [한국어](README.ko.md)

</div>

---

## 🔌 OpenCode Plugin

**Maskweaver is a handy plugin for [OpenCode](https://github.com/sst/opencode).**

While it can be used as a standalone library, it works great with OpenCode to add expert personas to your coding workflow:
- **Expert Personas (Masks)**: Standardized YAML profiles for legendary developers.
- **Smart Delegation**: Multi-agent workflows optimized for OpenCode.
- **Project Memory**: Hybrid semantic search for your entire codebase.
- **🆕 Weave Workflow**: Phase-driven development with AI self-verification.
- **🔗 GDC Integration**: Graph-Driven Codebase support for enhanced research and design-time verification gates.

---

## Why Maskweaver?

You're stuck debugging a race condition. Wouldn't it be great if **Linus Torvalds** could review your code?

```typescript
// Instead of generic AI response...
"You have a potential race condition in your code."

// Get Linus-level insight:
"This is stupid. You're not even using memory barriers. Read the 
assembly - the compiler reordered your loads. Use smp_rmb() or 
better yet, redesign this without the stupid lock."
```

**Maskweaver makes this real.** It gives AI assistants expert personas (masks) with deep domain knowledge and distinct thinking styles.

---

## Installation

### For Humans

Copy and paste this prompt to your LLM agent (Claude Code, AmpCode, Cursor, etc.):

```
Install and configure maskweaver by following the instructions here:
https://raw.githubusercontent.com/ulgerang/maskweaver/master/docs/installation.md
```

Or read the [Installation Guide](docs/installation.md) directly—but **we strongly recommend letting an agent handle it. Humans make mistakes.**

### For LLM Agents

Fetch the installation guide and follow it:

```bash
curl -s https://raw.githubusercontent.com/ulgerang/maskweaver/master/docs/installation.md
```

### Quick Install

```bash
# npm
npm install maskweaver

# bun
bun add maskweaver
```

### OpenCode Plugin Setup

Add to your OpenCode config - that's it!

**Global** (`~/.config/opencode/opencode.json`):
```json
{
  "plugin": ["maskweaver"]
}
```

**Or per-project** (`opencode.json` in project root):
```json
{
  "plugin": ["maskweaver"]
}
```

> Note: OpenCode installs npm packages by name. Use `maskweaver` (not `maskweaver/plugin`).

OpenCode automatically installs the plugin to `~/.cache/opencode/node_modules/` on startup.

**Windows:** `%USERPROFILE%\.config\opencode\opencode.json`

### Completion Sound (Optional)

Maskweaver can play a notification sound when generation finishes (`session.idle`).

Create `.opencode/maskweaver.json` (project) or `~/.config/opencode/maskweaver.json` (global):

```jsonc
{
  "notifications": {
    "completionSound": {
      "enabled": true
    }
  }
}
```

Turn it off:

```jsonc
{
  "notifications": {
    "completionSound": {
      "enabled": false
    }
  }
}
```

### Checking Installed Version

Multiple ways to verify your Maskweaver version:

```bash
# CLI (terminal)
maskweaver --version
# or
maskweaver -V

# npm
npm list maskweaver

# In OpenCode chat
# Use the maskweaver_status tool or type:
/weave-help
```

```typescript
// Programmatic (Node.js / TypeScript)
import { VERSION } from 'maskweaver';
console.log(VERSION); // "0.7.29"
```

---

## Quick Start

### First Use

```bash
# In your AI assistant chat:
@maskweaver Use Linus Torvalds mask to review this C code

# Or delegate to dummy-humans:
@dummy-human Linus mask: review my multithreading code
@dummy-flash Find all files with "unsafe" in them
@dummy-premium Design microservices architecture for this monolith
```

---

## Features

### 🎭 Expert Personas (Masks)

Apply legendary developer personalities to your AI assistant:

```yaml
# masks/software-engineering/linus-torvalds.yaml
profile:
  name: Linus Torvalds
  expertise:
    - Kernel-level systems programming
    - Performance optimization
    - Memory management and concurrency
  
  thinkingStyle: |
    Bottom-up, pragmatic. Starts with code, not theory.
    Ruthlessly eliminates complexity.
```

**Current Masks:**
- 🐧 **Linus Torvalds** - Systems, C, Linux, performance
- 🏗️ **Martin Fowler** - Architecture, refactoring, patterns
- 🧪 **Kent Beck** - TDD, XP, testing
- 🧠 **Andrew Ng** - ML/AI systems
- ⚛️ **Dan Abramov** - React, frontend architecture

### 🤖 Dummy-Human System

Smart subagents for cost-efficient multi-agent workflows:

| Agent | Model Tier | Cost | Best For |
|-------|-----------|------|----------|
| `@dummy-flash` | Fast | 💰 | File search, summaries, simple tasks |
| `@dummy-human` | Balanced | 💰💰 | Code writing, reviews, general work |
| `@dummy-premium` | Powerful | 💰💰💰 | Architecture, complex debugging |

### 🧵 Weave Workflow

**Phase-Driven Development** — "AI verifies, Human validates"

Weave is Maskweaver's flagship workflow. It breaks work into testable phases, auto-selects expert masks, and provides structured verification before handoff.

#### Commands

| Command | Description |
|---------|-------------|
| `/weave-init` | Initialize Weave (once per repo) |
| `/weave-prepare [docs]` | Generate research + spec + plan in one step (auto-split if oversized) |
| `/weave-refine-plan` | Apply structured plan notes (`tasks/plan-notes.md`) to active plan |
| `/weave-approve` | Explicit human approval gate before implementation |
| `/weave-craft [P#]` | Prepare phase execution context and guidance |
| `/build` | Autonomous build loop (`action=run/status/stop/list/resume/sync`) |
| `/weave-verify` | Run build/test verification (auto-detect) |
| `/weave-worktree ...` | Manage git worktrees for parallel work |
| `/weave-status` | View project progress and stats |
| `/weave-agents` | Sync agent files or init config (`sync=true` / `init=true`) |
| `/weave-troubleshoot` | Search global knowledge (`record=true` to save a solution) |
| `/weave-archive` | Archive the verified active change |
| `/weave-help` | Show documentation |

> Tip: In OpenCode chat, use the visible slash commands such as `/weave-prepare` and `/build`; they map to the underlying `weave command=...` tool calls.

#### Workflow

```
0. INIT (once): /weave-init
       ↓
1. PLAN: /weave-prepare docs/
    - Generates research + spec + phase plan (auto-splits if oversized)
       ↓
2. REFINE (optional): /weave-refine-plan
    - apply annotation notes from tasks/plan-notes.md
       ↓
3. APPROVAL GATE: /weave-approve
    - required before craft execution
       ↓
4. CRAFT: /weave-craft
     - Generates an execution plan and next actions
     - Implement/verify changes, then finalize with approve
     - Use `/weave-verify` anytime for build/test checks
       ↓
5. HANDOFF: You validate UX/intent and move to next phase
```

#### Multi-Layer AI Verification

Before handing off to you, AI runs these verification layers:

| Layer | Type | Tool |
|-------|------|------|
| 1️⃣ TypeCheck | Build | `tsc --noEmit` |
| 2️⃣ Lint | Build | `eslint` |
| 3️⃣ Build | Build | `npm run build` |
| 4️⃣ Unit Tests | Test | `jest` / `vitest` |
| 5️⃣ E2E Tests | Test | **Playwright** |
| 6️⃣ Screenshot | Visual | Playwright / browser capture |
| 7️⃣ API Check | API | `fetch` health checks |
| 8️⃣ A11y | Accessibility | `axe-core` |
| 0️⃣ GDC Check | Design | `gdc check --machine` |

#### GDC Integration (Graph-Driven Codebase)

Weave integrates with [GDC](https://github.com/ulgerang/gdc) (Graph-Driven Codebase) to enhance research quality and add design-time verification gates:

**Research Enhancement:**
- Automatic `.gdc` workspace detection
- `weave init` probe chain (`version`/`sync`/`check`/`stats`) for quick integration health check
- GDC `stats`, `graph`, and `check` results embedded in `tasks/research.md`
- Dependency blast radius analysis from graph edges
- Candidate reuse nodes matched against feature keywords
- New report sections: `GDC Node Coverage`, `Dependency Blast Radius`, `Existing Spec vs Implementation Drift`, `Candidate Reuse Nodes`

**Execution Enhancements:**
- `weave craft` can generate node context files via `gdc extract` and link them in `tasks/todo.md`
- `weave status` includes GDC node/check metrics (`total/implemented/tested`, issue summary)
- `weave worktree create` can bootstrap `.gdc/config.yaml` and `.gdc/nodes/**` (without `.gdc/graph.db`)

**Pre-Verify Gate:**
When GDC is detected, `weave verify` and `weave flow` automatically run:
1. `gdc sync --machine` - Sync specs with implementation
2. `gdc check --machine` - Validate spec/implementation alignment

Blocking errors from GDC check will halt verification (configurable via `strictVerify` mode).

**Configuration** (`maskweaver.config.json`):
```json
{
  "gdc": {
    "enabled": "auto",
    "strictVerify": false,
    "autoSyncOnPrepare": true,
    "extractContext": {
      "withImpl": true,
      "withTests": true,
      "withCallers": true
    }
  }
}
```

- `enabled`: `true` | `false` | `"auto"` (default: auto-detect from `.gdc` directory)
- `strictVerify`: If `true`, GDC check failures block verification; if `false`, continues with warning
- `autoSyncOnPrepare`: Run `gdc sync` during `weave prepare`
- `extractContext`: Controls `gdc extract` evidence flags during `weave craft`

#### Autonomous Mask Selection

The AI automatically picks the best expert for each task:

| Task Type | Auto-Selected Mask |
|-----------|-------------------|
| Architecture/Design | 🏗️ Martin Fowler |
| Testing/TDD | 🧪 Kent Beck |
| React/Frontend | ⚛️ Dan Abramov |
| Performance/Systems | 🐧 Linus Torvalds |
| ML/AI | 🧠 Andrew Ng |

#### Global Knowledge Base (Cross-Project RAG)

Troubleshooting solutions are stored globally and shared across all projects:

```
Error occurs → Search ~/.maskweaver/knowledge.sqlite
    ├── Found → Apply solution → Retry
    └── Not found → Fix manually → Record solution for future
```

### 🧠 Memory System

Remember past conversations, decisions, and mask effectiveness:

```typescript
import { memory } from 'maskweaver';

// Index your project knowledge
await memory.indexFile('./docs/architecture.md', embedFn);

// Semantic search with multiple providers:
const results = await memory.hybridSearch(
  'How does authentication work?',
  embedding,
  { limit: 5, minScore: 0.7 }
);
```

**Embedding Providers:**
- 🦙 **Ollama** - Local, private (bge-m3, nomic-embed)
- 🤖 **OpenAI** - text-embedding-3-large
- 🚀 **VoyageAI** - Code-specialized embeddings!
- 🔀 **OpenRouter** - Access to multiple providers
- 📝 **Text-only** - No embeddings, pure FTS5

### 🗂️ Context System

Track long-running features with file associations:

```bash
# Start a feature
@context start name="oauth-login" goal="Implement OAuth2 flow"

# Add files to feature context
@context add file="src/auth/oauth.ts"

# Check status
@context status

# Mark as done
@context done
```

### 🔄 Retrospect System

Evaluate mask effectiveness after each session:

```typescript
{
  "trigger": "session_end",
  "masksUsed": [
    {
      "name": "linus-torvalds",
      "task": "Review multithreading code",
      "effectiveness": 9.5
    }
  ],
  "wellDone": ["Found 3 critical race conditions"],
  "lessons": ["Linus mask excels at concurrency reviews"]
}
```

---

## 📦 Package Structure

Maskweaver is a single npm package with modular exports:

```typescript
// Default export - OpenCode plugin
import maskweaver from 'maskweaver';

// Named exports - module namespaces
import { core, memory, context, retrospect, verify, weave } from 'maskweaver';

// Subpath imports - direct module access
import { hybridSearch } from 'maskweaver/memory';
import { createFeature } from 'maskweaver/context';
import { MaskLoader } from 'maskweaver/core';
import { WeaveOrchestrator, GlobalKnowledge } from 'maskweaver/weave';
```

**Modules:**
- `maskweaver/core` - Mask loading, validation (YAML/JSON)
- `maskweaver/memory` - Embeddings + vector search (5 providers)
- `maskweaver/context` - Feature-based work tracking
- `maskweaver/verify` - Cross-mask code review
- `maskweaver/retrospect` - Session effectiveness analysis
- `maskweaver/weave` - Phase-driven development workflow
- `maskweaver/gdc` - GDC (Graph-Driven Codebase) integration utilities
- `maskweaver/plugin` - OpenCode plugin entry point

---

## 🧵 Weave Usage Guide

### Step 0: Initialize (Once)

```bash
/weave-init
```

### Step 1: Create a Plan

Generate research + spec + plan in one command:

```bash
/weave-prepare docs/
```

Then approve the plan:

```bash
/weave-approve
```

The AI will:
1. Read all documents in the path
2. Search memory for similar past projects
3. Ask clarifying questions if needed
4. Present a **Phase Plan** for your approval

Example output:
```markdown
## 📋 Execution Plan

### Vision
Build a modern emotion diary app with AI-powered insights

### Phases
| Phase | Name | Done When | Est. Time |
|-------|------|-----------|-----------|
| P1 | Emotion Selection UI | User can select emotions | 2-3h |
| P2 | Data Persistence | Emotions saved to storage | 2-3h |
| P3 | History View | User can view past entries | 2-3h |

Is this plan okay? Let me know if changes are needed.
```

### Step 2: Approve the Plan (Required)

```bash
/weave-approve
```

### Step 3: Craft a Phase (Auto-select if omitted)

Start with the first phase:

```bash
/weave-craft
```

`/weave-craft` returns execution context for the phase. Implement changes, then rerun `/weave-craft` if you want to refresh the plan view.

### Step 4: Continue Implementation

```txt
weave command=craft phaseId="P1"
weave command=verify
```

Autonomous build loop:

```txt
weave command=build action=run phaseIds="P1,P2"
```

### Step 5: Finalize the Phase

```txt
weave command=verify
weave command=approve
```

### Step 6: Handoff & Validate

When all verifications pass:

```markdown
## ✅ Phase P1 Verification Complete!

### 🤖 AI Test Results
| Test | Result |
|------|--------|
| Build | ✅ Success |
| Unit Tests | ✅ 15/15 |
| Lint | ✅ Passed |

### 🎭 Masks Used
- Kent Beck (testing)
- Dan Abramov (React components)

### 🔗 Access
http://localhost:5173

### 👤 Human Validation (Only you can judge)
- [ ] Does it feel right?
- [ ] Is the UX good?
- [ ] Is this what you wanted?

**[Approve]** **[Request Changes]** **[Later]**
```

### Step 6: Check Status Anytime

```bash
/weave-status
```

Output:
```markdown
## 📊 Weave Progress

**Project**: Emotion Diary App
**Progress**: 40%

[████████░░░░░░░░░░░░] 2/5

### Phases
✅ **P1**: Emotion Selection UI (2.5h) [kent-beck, dan-abramov]
🔄 **P2**: Data Persistence
⏳ **P3**: History View
⏳ **P4**: Statistics
⏳ **P5**: Theme Settings

### Global Knowledge Stats
- Total troubleshooting records: 47
- Used in this project: 3
- Newly recorded: 1
```

---

## 🎭 Creating Masks

Masks are simple YAML files:

```yaml
# masks/my-expert.yaml
metadata:
  id: my-expert
  version: '1.0'
  language: en

profile:
  name: Ada Lovelace
  tagline: Pioneer of Computing - First Programmer
  
  expertise:
    - Algorithm design
    - Mathematical thinking
    - Analytical engines
  
  thinkingStyle: |
    Combines mathematical rigor with poetic imagination.
    Sees patterns others miss.

behavior:
  systemPrompt: |
    You are Ada Lovelace, the first computer programmer.
    
    You see algorithms as poetry - elegant, precise, beautiful.
    You think in terms of mathematical transformations and 
    logical flows.
  
  communicationStyle:
    tone: thoughtful
    verbosity: moderate
    technicalDepth: expert

usage:
  suitableFor:
    - Algorithm design and optimization
    - Mathematical problem-solving
    - Pattern recognition in code
```

---

## 🌍 Multilingual

Infrastructure ready for:
- 🇺🇸 English
- 🇰🇷 Korean
- 🇨🇳 Chinese *(coming soon)*
- 🇯🇵 Japanese *(coming soon)*

Masks can have multiple language versions:
```
masks/
├── linus-torvalds.en.yaml
├── linus-torvalds.ko.yaml
└── linus-torvalds.zh.yaml
```

---

## 🤝 Contributing

We need your help!

### Add a Mask

Create a YAML file in `masks/` and submit a PR:
- ✅ Real expertise (domain knowledge)
- ✅ Distinct personality (thinking style)
- ✅ Clear use cases (when to use)
- ✅ Examples (expected behavior)

### Report Bugs

Open an issue with:
1. What you tried
2. What happened
3. What you expected

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📄 License

MIT - See [LICENSE](LICENSE)

---

<p align="center">
  <sub>Crafted with 🎭 by <a href="https://github.com/ulgerang">ULJI SOFT</a></sub>
</p>
