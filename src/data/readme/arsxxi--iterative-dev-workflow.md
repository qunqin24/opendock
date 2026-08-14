<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/yamadaaa.png">
    <img src="assets/yamadaaa.png" width="350" alt="Iterative Dev Workflow">
  </picture>
</p>

<h1 align="center">Iterative Dev Workflow</h1>

<p align="center">
  <em>Structure your AI agent's development process.</em>
</p>

<p align="center">
  <sub>METHODOLOGY &amp; PROMPT DESIGN</sub>
</p>

<p align="center">
  <a href="https://github.com/haniladjamba">
    <img src="https://github.com/haniladjamba.png" width="64" height="64" style="border-radius:50%" alt="Hani Ladjamba"/>
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://github.com/tiwowtimothy">
    <img src="https://github.com/tiwowtimothy.png" width="64" height="64" style="border-radius:50%" alt="Timothy Tiwow"/>
  </a>
</p>
<p align="center">
  <a href="https://github.com/haniladjamba"><b>Hani Ladjamba</b></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://github.com/tiwowtimothy"><b>Timothy Tiwow</b></a>
</p>

---

Stop shipping features that break production. Stop rewriting the same architecture three times. Stop wondering why your AI agent keeps over-engineering simple tasks.

Iterative Dev Workflow gives your AI agent a structured development process — from understanding the task to reflecting on what went wrong.

## Before / after

You give your AI agent a vague task like "build user authentication." Without a structure, it writes code, asks no questions, and delivers something that doesn't match what you needed.

With Iterative Dev Workflow:

```
/kickoff
  → Agent asks: what platform? what stack? what's the project name?
  → You answer
  → Agent confirms understanding, sets up .workflow/<slug>/00-context.md

/phase-1
  → Agent explores codebase, identifies gaps, asks the right questions

/phase-2-step-1
  → Agent proposes 5 different approaches (Architecture, UI/UX, Data Model, etc.)

/phase-2-step-2
  → Agent analyzes trade-offs and sensitivity points for each approach

/phase-2-step-3
  → You define Quality Attributes (e.g. Performance, Maintainability)
  → Agent scores each design against your criteria

/phase-2-step-4
  → You choose the best design
  → Agent creates System Context Diagram (Mermaid.js)

/phase-2-step-5
  → Agent creates User Journey Diagram (Mermaid.js)

/phase-3
  → Agent writes implementation plan — avoiding overengineering

/phase-4
  → Agent reflects: what went well, what could be better
```

You stay in control. The agent never skips ahead.

## Install

### Claude Code

```
/plugin marketplace add arsxxi/iterative-dev-workflow
/plugin install iterative-dev-workflow@arsxxi-iterative-dev-workflow
```

### Codex

```bash
codex plugin marketplace add arsxxi/iterative-dev-workflow
codex plugin add iterative-dev-workflow@arsxxi-iterative-dev-workflow
```

### OpenCode

```bash
npm install -g @arsxxi/iterative-dev-workflow
```

On install, a `postinstall` script copies the commands into `~/.config/opencode/commands/`
automatically. Restart OpenCode and type `/` to see them.

If commands still don't show up (some package managers or environments skip lifecycle scripts,
or your OpenCode version doesn't pick them up automatically), run the installer manually:

```bash
npx --package=@arsxxi/iterative-dev-workflow iterative-dev-workflow-install
```

Or, as a guaranteed last resort, copy the `commands/` folder from this repo directly into
`~/.config/opencode/commands/` (global) or `.opencode/commands/` inside your project yourself -
these are plain markdown files, no build step required.

Then add to your `opencode.json` (this enables the AGENTS.md system-prompt injection feature,
separate from command registration):

```json
{ "plugin": ["@arsxxi/iterative-dev-workflow"] }
```

### Kilo Code

Kilo Code is a VS Code extension, so there is no plugin marketplace command — the commands are
installed as files. Easiest path, available in every project:

```bash
npm install -g @arsxxi/iterative-dev-workflow
npx --package=@arsxxi/iterative-dev-workflow iterative-dev-workflow-install-kilo
```

This copies the 10 commands into `~/.config/kilo/commands/` and the methodology into
`~/.config/kilo/rules/`. Reload the Kilo Code extension, then type `/` to see them.

To load the methodology into the system prompt, add the rules glob to
`~/.config/kilo/kilo.jsonc`:

```json
{ "instructions": ["~/.config/kilo/rules/*.md"] }
```

For a single project instead of globally, copy `.kilo/commands/` and `.kilo/rules/` from this
repo into your project root and point `kilo.jsonc` at the rules:

```json
{ "instructions": [".kilo/rules/*.md"] }
```

Older Kilo Code builds read `.kilocode/workflows/` and `.kilocode/rules/` instead. Both paths are
shipped in this repo, so either version works — newer builds migrate the legacy path on startup.

### Antigravity CLI

```bash
agy plugin install https://github.com/arsxxi/iterative-dev-workflow
```

## Commands

| # | Command | Description |
|---|---------|-------------|
| 0 | `/kickoff` | Start a new project — asks what to build, platform/stack, project name |
| 1 | `/phase-1` | Analyze: understand task, explore codebase, identify gaps |
| 2.1 | `/phase-2-step-1` | Solution Proposal: create minimum 5 designs |
| 2.2 | `/phase-2-step-2` | ATAM: assess trade-offs and sensitivity points |
| 2.3 | `/phase-2-step-3` | Quality Attribute: weighted scoring assessment |
| 2.4 | `/phase-2-step-4` | High-Fidelity Design: System Context Diagram (Mermaid.js) |
| 2.5 | `/phase-2-step-5` | User Journey: User Journey Diagram (Mermaid.js) |
| 3 | `/phase-3` | Implementation Plan: write comprehensive plan |
| 4 | `/phase-4` | Postmortem: reflect and improve |
| — | `/session-transcript` | Record verbatim conversation to project root as `aichat-<slug>.md` |

## Output Location

All phase outputs are written to `.workflow/<slug>/`:

```
.workflow/<slug>/
├── 00-context.md      # platform, description, existing services
├── 01-analyze.md     # Phase 1
├── 02-propose.md     # Phase 2 Step 1
├── 02-atam.md        # Phase 2 Step 2
├── 02-qa.md          # Phase 2 Step 3
├── 02-hifi.md        # Phase 2 Step 4 (System Context Diagram)
├── 02-journey.md     # Phase 2 Step 5 (User Journey Diagram)
├── 03-implement.md    # Phase 3
└── 04-postmortem.md   # Phase 4
```

Session transcripts are saved directly to the **project root** as `aichat-<slug>.md` (or `aichat.md` if no project name was provided).

## Hard Constraints

- **AVOID overengineering.** PREFER simple, low-complexity implementations.
- **AVOID jargon.** Use plain language that states actual intent.
- **Never skip phases.** Design must be approved before implementation begins.
- **Iterative, not waterfall.** If a problem surfaces in a later phase, circle back to fix it there.

## Workflow Flow

```
/kickoff
  └── /phase-1
        └── /phase-2-step-1
              └── /phase-2-step-2
                    └── /phase-2-step-3  (may loop back to /phase-2-step-1)
                          └── /phase-2-step-4
                                └── /phase-2-step-5
                                      └── /phase-3
                                            └── /phase-4
```

## Development

The source of truth is `commands/*.md` (10 files) and `skills/workflow-methodology/SKILL.md`. After editing these, run:

```bash
bash scripts/sync-platforms.sh
```

This syncs to:
- `.opencode/commands/` — OpenCode command definitions
- `.agents/skills/` — Antigravity/Codex skill definitions
- `.kilo/commands/` + `.kilo/rules/` — Kilo Code commands and methodology rule
- `.kilocode/workflows/` + `.kilocode/rules/` — same payload on Kilo Code's legacy paths
- `AGENTS.md` — cross-platform instruction file

The Kilo Code targets are the only ones that aren't a verbatim copy: Kilo has no `argument-hint`
frontmatter key and doesn't substitute `$ARGUMENTS`, so `scripts/build-kilo.mjs` rewrites the
frontmatter and prepends a short note explaining where the argument comes from. The command body
itself is copied unchanged.

## FAQ

**Does every project need all phases?**

No. The workflow is modular. Use only what the task needs — but don't skip backward. Each phase has a clear prerequisite chain.

**What if the design doesn't support implementation?**

Stop. Tell the user clearly. Circle back to Phase 2. Do not silently work around a design flaw in the plan.

**How do I choose a project name?**

Use a short, lowercase identifier with hyphens (e.g. `user-auth`, `article-quality-widget`, `payment-flow`). It's used as the project folder name under `.workflow/<slug>/`, so it stays filesystem-safe.

**What's the difference between Phase 2 Step 4 and Step 5?**

Step 4 creates a System Context Diagram — shows how the solution fits within the whole app. Step 5 creates a User Journey Diagram — shows how the user interacts with the system.

## License

[MIT](LICENSE)
