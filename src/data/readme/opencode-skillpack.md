# opencode-skillpack

> **The standard library for OpenCode agents.** 73 human-reviewed, instructions-only skills in a single npm package. Zero git cloning. Zero disk pollution. Native progressive disclosure (~1.5k tokens).

[![Test Suite](https://img.shields.io/badge/tests-9%20passed%20(301%20assertions)-brightgreen)](file:///home/aawej/projects/opencode-agent-skills/test/catalog.test.ts) [![Typecheck](https://img.shields.io/badge/typescript-clean-blue)](file:///home/aawej/projects/opencode-agent-skills/tsconfig.json) [![Skills](https://img.shields.io/badge/skills-73%20bundled-purple)](file:///home/aawej/projects/opencode-agent-skills/catalog.json) [![License](https://img.shields.io/badge/license-MIT-green)](file:///home/aawej/projects/opencode-agent-skills/LICENSE)

## Installation

### Option A: Agent-Assisted Installation (Recommended)

Copy and paste this prompt directly to your OpenCode agent:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/atpaawej/opencode-skillpack/main/install.md to install and configure the opencode-skillpack plugin for my OpenCode setup.
```

*(Or if you are working directly inside this cloned repository: `Read ./install.md and install the opencode-skillpack plugin for me.`)*

*Your agent will read the guide, check whether you prefer a project-scoped (`./opencode.json`) or global (`~/.config/opencode/opencode.json`) setup, register the plugin safely without touching other configuration, and verify installation with self-diagnostics.*

### Option B: Manual 10-Second Install

Add `"opencode-skillpack"` to the `plugins` array in your `opencode.json` (either project-root `./opencode.json` or global `~/.config/opencode/opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-skillpack"
  ]
}
```

That is the entire setup. Restart your session and the full catalog is instantly available.

## Why This Exists: The Three Big Traps of Agent Skills

Skills are cheap to write, hard to curate, and easy to mess up. In practice, developers face three traps:

1. **The Empty Shelf**: Running OpenCode with no skills leaves the agent guessing on testing practices, interface boundaries, and modern design principles. It hallucinates obsolete patterns and cuts corners.
2. **The 2,000-File Dump**: Some plugins clone thousands of unvetted community repositories into your `~/.config/opencode/skills/` directory, polluting your filesystem with abandoned scripts and conflicting IDs.
3. **Context Window Starvation**: Dumping complete markdown instructions upfront burns tens of thousands of tokens before you even type your first prompt.

**`opencode-skillpack` takes the curated path**: exactly 73 battle-tested skills from engineering leaders (Matt Pocock, Emil Kowalski, Supabase, Prisma, Corey Haines, and Anthropic). Shipped inside a clean npm package, loaded in memory via OpenCode domain transforms, and kept strictly on-demand.

## Three Questions You Should Ask Before Installing

### 1. "Will 73 skills eat up my context window and cost me money?"

**No.** OpenCode uses native progressive disclosure. When your session boots, OpenCode only injects a lightweight Skill Index containing each skill's name and single-line trigger description. Across all 73 skills, this index costs only **~1,500 tokens**. The full markdown instructions and checklists are loaded on-demand **only when the agent actually calls the skill**.

### 2. "Will this overwrite my custom local skills?"

**Never.** At startup, the plugin inspects OpenCode's registry. If you already have a skill with the same ID (for example, your own custom `tdd` or `code-review` in `.opencode/skills/`), **our plugin steps aside, logs a skip notice, and respects your local files**. Your code always wins unless you explicitly set `"override": true`.

### 3. "Does this download untrusted binaries or execute hidden scripts?"

**No.** Every skill in this pack adheres to a strict **instructions-only** discipline. They are pure markdown workflows, architectural decision trees, and code review checklists. Skills requiring external daemons, network services, or global CLI binaries are quarantined or excluded by default ([ADR 0002](docs/adr/0002-vendored-skills-are-reviewed-and-pinned.md)).

## What's in the Pack

The pack ships with **73 curated, instructions-only skills** covering day-to-day software engineering, UI design, motion, databases, and product growth:

### Personal Workflows & Productivity (atpaawej/skills) (3 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `software-factory` | Scaffold, configure, and operate an autonomous, issue-driven software factory for any repository. Sets up token-scrubbed AFK implementation workflows, dependency-aware queue... | [atpaawej/skills](https://github.com/atpaawej/skills) |
| `clarity` | Distill a tangled thought, stuck decision, or messy artifact into what is actually happening, the crux, hidden assumptions, and the... | [atpaawej/skills](https://github.com/atpaawej/skills) |
| `persuasion` | Persuasion science from cognitive psychology and behavioral economics. Use to write pitches and offers, reframe pricing or choices, handle objections,... | [atpaawej/skills](https://github.com/atpaawej/skills) |

### Engineering & Architecture (Matt Pocock) (38 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `ask-matt` | Ask which skill or flow fits your situation. A router over the skills in this repo. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `code-review` | Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `codebase-design` | Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `diagnosing-bugs` | Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `domain-modeling` | Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grill-with-docs` | A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `implement-spec` | Implement the result of /to-spec and /to-tickets in code. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `implement` | Implement a piece of work based on a spec or set of tickets. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `improve-codebase-architecture` | Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `pr` | Use when writing a PR body. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `prototype` | Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `research` | Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `retro` | Conduct a retrospective on a coding session. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `setup-matt-pocock-skills` | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `tdd` | Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `to-spec` | Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `to-tickets` | Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `triage` | Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `wayfinder` | Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `wizard` | Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `chief-of-staff` | Pursue a long-running goal in a single session by co-ordinating subagents. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `claude-handoff` | Hand the current conversation off to a fresh background agent that picks up the work immediately. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `loop-me` | Grill me about specs for the workflows I want to build, within this workspace. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `setup-ts-deep-modules` | Wire dependency-cruiser into a TypeScript repo so each package is a deep module, with implementation hidden in subfolders and reachable... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `writing-beats` | Writing, exploit; assemble raw material into a journey of beats, grounding each term before a beat leans on it. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `writing-fragments` | Writing, explore: mine raw fragments, no structure yet. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `writing-shape` | Writing, exploit: shape raw material into an article, paragraph by paragraph. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `git-guardrails-claude-code` | Set up Claude Code hooks to block dangerous git commands (push, reset --hard, clean, branch -D, etc.) before they execute.... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `migrate-to-shoehorn` | Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests,... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `scaffold-exercises` | Create exercise directory structures with sections, problems, solutions, and explainers that pass linting. Use when user wants to scaffold exercises,... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `setup-pre-commit` | Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grill-me` | A relentless interview to sharpen a plan or design. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `grilling` | Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or... | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `handoff` | Compact the current conversation into a handoff document for another agent to pick up. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `teach` | Teach the user a new skill or concept, within this workspace. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `to-questionnaire` | Turn a decision you can't fully answer into a questionnaire for someone else to fill in. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `wait-what` | Stop. That last message did not land: re-pitch it. | [mattpocock/skills](https://github.com/mattpocock/skills) |
| `writing-for-agents` | Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md. | [mattpocock/skills](https://github.com/mattpocock/skills) |

### UI, Motion & Animation (Emil Kowalski) (21 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `animate` | Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `animate-expo` | Build animations in React Native and Expo, making the decisions in the order that determines whether they feel right —... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `animation-performance` | Keep web animations inside the frame budget — animate composite-only properties, keep motion off the main thread when the page... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `animation-vocabulary` | Reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `apple-design` | Apple's approach to interface design and fluid, physical motion, translated for the web. Use when building or reviewing gesture-driven UI,... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `ask-emil` | Ask which skill or flow fits your situation. A router over the skills in this repo. | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `ask-sonner` | Guide to Sonner, the React toast library — install and wire up the Toaster, pick the right toast() call, promise... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `better-typography` | Sets and reviews how text renders, from the type scale and spacing to font features, wrapping, truncation and punctuation. | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `break-ui` | Try to break a piece of UI by feeding it worst-case data — long names, unbreakable emails, one-letter names, missing... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `choreograph` | Coordinate several elements that animate together — decide what moves, in what order, how much they overlap, and what stays... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `emil-design-eng` | This skill encodes Emil Kowalski's philosophy on UI polish, component design, animation decisions, and the invisible details that make software... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `find-animation-opportunities` | Search a codebase or UI for places that don't animate but should, and reject everything that shouldn't. Read-only; it proposes... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `gestures` | Build drag, swipe, and sheet interactions that track the finger 1:1 and stay interruptible. Use when building or fixing anything... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `improve-animations` | Survey a codebase's animation and motion code as a senior motion advisor, then produce a prioritized audit and self-contained implementation... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `learn-taste` | Turn a session's design corrections into rules, with their why, in DESIGN.md, a project skill, or a lint check. | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `mobile-native` | Make a web app feel native on a phone — the small CSS and meta-tag fixes that separate "a website... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `pick-ui-library` | Pick the right library for a given frontend task from a curated, opinionated list — numbers, OTP inputs, charts, command... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `prototype-variants` | Build multiple genuinely different versions of a UI piece you describe, rendered behind a visual picker so you can flip... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `remove-animations` | Find the animations an interface doesn't need and remove them — motion on keyboard actions, high-frequency surfaces, functional data, and... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `review-animations` | Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy. Default to flagging;... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |
| `write-swift` | How to write modern Swift well — modeling with value types, Swift 6 data-race safety and approachable concurrency (@concurrent, main-actor-by-default,... | [emilkowalski/skills](https://github.com/emilkowalski/skills) |

### Frontend & Aesthetic Direction (Anthropic) (1 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `frontend-design` | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography,... | [anthropics/skills](https://github.com/anthropics/skills) |

### Database Architecture (Supabase & Prisma) (2 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `supabase-postgres-best-practices` | Postgres best practices maintained by Supabase, for Postgres running anywhere. Load this skill BEFORE writing or changing anything that lives... | [supabase/agent-skills](https://github.com/supabase/agent-skills) |
| `prisma-client-api` | Prisma Client API reference covering model queries, filters, operators, and client methods. Use when writing database queries, using CRUD operations,... | [prisma/skills](https://github.com/prisma/skills) |

### Growth, Marketing & SEO (Corey Haines) (7 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `copywriting` | When the user wants to write, rewrite, or improve marketing copy for any page, including homepage, landing pages, pricing pages,... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `seo-audit` | When the user wants to audit, review, or diagnose SEO issues on their site. Also use when the user mentions... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `programmatic-seo` | When the user wants to create SEO-driven pages at scale using templates and data. Also use when the user mentions... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `cro` | When the user wants to optimize, improve, or increase conversions on any marketing page or form — including homepage, landing... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `marketing-psychology` | When the user wants to apply psychological principles, mental models, or behavioral science to marketing. Also use when the user... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `content-strategy` | When the user wants to plan a content strategy, decide what content to create, or figure out what topics to... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `cold-email` | Write and run B2B cold outbound that gets replies, from cold emails and follow-ups to sending setup, LinkedIn, multichannel cadences,... | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |

### Self-Diagnostics (1 skills)

| Skill ID | Description | Source |
| :--- | :--- | :--- |
| `skillpack-selftest` | Verify that the skillpack plugin is installed and its skills are loading correctly. Use when the user asks whether skillpack... | First-party |

## How It Works Under the Hood

On load, the plugin reads `catalog.json` from its own package, then registers each skill through OpenCode's domain transform API (`ctx.skill.transform`), pointing at the real `SKILL.md` on disk:

- **Real Filesystem Paths ([ADR 0001](docs/adr/0001-register-skills-at-real-paths.md))**: Skills are registered with their actual path inside the installed package. Relative references work, `<skill_files>` lists companion docs, and standard file-reading tools resolve seamlessly.
- **Zero Disk Pollution**: Nothing is copied to `~/.config/opencode/skills/` or your git working tree. If you remove the plugin from `opencode.json`, everything vanishes cleanly.
- **Safe Execution**: Bundled skills are reviewed, pinned to specific commit SHAs, and covered by permissive licenses (MIT / Apache-2.0).

## Configuration Options

Customize skill loading in `opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-skillpack",
      "options": {
        "only": ["tdd", "clarity", "diagnosing-bugs"], // Load only specific skills
        "override": false,                               // Set true to overwrite matching local skill IDs
        "allowRequires": false                           // Also load skills that require external CLI tools
      }
    }
  ]
}
```

## Permissions (Frictionless Approval)

OpenCode asks for user confirmation on the first use of any skill. Because every bundled skill in this pack is reviewed and instructions-only, you can pre-approve the pack with an allow rule in `opencode.json`:

```jsonc
{
  "policies": [
    { "action": "skill.use", "resource": "skillpack-*", "effect": "allow" }
  ]
}
```

## Development & Verification

Run the test suite and verify parser integrity:

```bash
npm install
bun test          # 9 unit tests validating all 73 skills (301 assertions)
npx tsc --noEmit  # Strict TypeScript compilation against @opencode/plugin
```

To test the pack in your own OpenCode session, ask the agent to run the diagnostic skill:

```text
Run the skillpack-selftest skill.
```

## Architecture & Decisions

- [install.md](install.md) — Step-by-step agent installation instructions.
- [docs/skills-sh.md](docs/skills-sh.md) — Comprehensive research on the skills.sh registry, install rankings, and `modern-web-guidance` teardown.
- [docs/adr/0001-register-skills-at-real-paths.md](docs/adr/0001-register-skills-at-real-paths.md) — Architecture decision: in-memory transforms with real package filesystem paths.
- [docs/adr/0002-vendored-skills-are-reviewed-and-pinned.md](docs/adr/0002-vendored-skills-are-reviewed-and-pinned.md) — Trust model: pinned commit SHAs, human review, instructions-only.
- [GLOSSARY.md](GLOSSARY.md) — Canonical domain vocabulary (Skill, Catalog, Bundle, Registry).

## License

MIT License — see [LICENSE](LICENSE) for details. Bundled upstream skills retain their respective MIT and Apache-2.0 notices.
