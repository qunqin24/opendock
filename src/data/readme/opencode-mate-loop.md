# 🧉 Mate Loop

An **Agent Loop** development workflow plugin for [opencode](https://opencode.ai). One orchestrator agent interviews you, specialist AIs plan and prompt-engineer the work, gated PREVC phases execute it, and enforcement hooks make the gates impossible to skip. All workflow state lives in a `.context/` directory inside your project.

## Install

```bash
npm install -g opencode-mate-loop   # or use npx directly
cd your-project
npx opencode-mate-loop init
```

`init` installs the agents, commands, and skill into `.opencode/`, scaffolds `.context/`, and registers the plugin in `opencode.json`. It is idempotent (existing files are skipped; `--force` overwrites `.opencode` files, never `.context`). Then fill in the TODOs in `.context/constitution.md` — conventions and default test commands.

## Use

```
/mate add password reset to the auth flow
```

**mate** (the orchestrator, also available via Tab) will:

1. **Interview you** until scope, constraints, and "done" are unambiguous.
2. **Propose a scale** — QUICK (E→V), SMALL (P→E→V), MEDIUM (P→R→E→V), LARGE (P→R→E→V→C).
3. **Plan via the planner**: `gourd-planner` decomposes into a chapter with steps (acceptance criteria + validation commands) AND authors each step's execution prompt (meta-prompting — you never write prompts).
4. **Stop for your approval** — `/mate-approve plan`.
5. **Drive the loop** — `/mate-next` advances and dispatches the crew. `/mate-status` shows where you are.

## The crew

| Agent | Role | Phases | What it does |
|-------|------|--------|--------------|
| `mate` | orchestrator | — | interviews, owns the gates, dispatches; read-only on source |
| `gourd-planner` | planner | P | decomposes the approved scope + meta-prompts every step; writes only `.context/` |
| `bombilla-coder` | coder | E, C | sole source-code writer; docs-only in C |
| `cebar-quality` | quality | R, V | reviews plans, validates with evidence; can never edit code |

The agent names live only in opencode — `.context/` artifacts always use the neutral roles (planner/coder/quality).

Each role has a dedicated skill: `mate-loop` (core methodology, loaded by everyone), `mate-planning` (decomposition + meta-prompting anatomy), `mate-coding` (execution discipline + blocked-step protocol), `mate-quality` (review checklist + evidence-based validation).

### Changing each agent's LLM model

Every agent/subagent's model is configured in its file under `.opencode/agents/` in your project. By default no `model` is set, so opencode's standard inheritance applies: `mate` uses your session's default model, and each subagent inherits the model of the agent that invoked it. To pin a specific model for one agent, add a `model` line to that agent's frontmatter:

```yaml
# .opencode/agents/cebar-quality.md
---
description: ...
mode: subagent
model: anthropic/claude-sonnet-4-5   # provider/model-id
---
```

## Enforcement (not vibes)

Agent permissions + plugin hooks (`tool.execute.before`) guarantee:

- mate, gourd-planner, cebar-quality are **read-only on source** — they can only write `.context/`.
- bombilla-coder is **hard-blocked** until the plan is approved and the loop is in an approved Execution/Confirmation step (or fixing a blocked one); in Confirmation its writes are restricted to docs (CHANGELOG.md, README.md, docs/, .context/).
- cebar-quality **cannot edit code** — a failing test is a failing verdict.
- Only **mate** records approvals (and only after you explicitly approve); only mate advances the loop.
- A blocked step (failed validation) stops `mate_advance` until a passing report is recorded.
- Loop state is re-injected on session compaction, so long sessions don't lose the loop.

## `.context/` layout

```
.context/
├── loop.json          machine state (never edit by hand)
├── constitution.md    your project's conventions + default test commands
├── decisions.md       append-only decision log
├── journal.md         append-only activity journal (auto-written)
└── chapters/<id>/
    ├── chapter.md     goal, scale, rationale
    ├── steps/         one file per step: criteria, commands, execution prompt, notes
    └── reports/       review + validation reports
```

## Development

```bash
npm install
npm test        # builds + runs node --test
```
