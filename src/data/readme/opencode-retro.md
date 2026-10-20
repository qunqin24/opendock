# opencode-retro

**Retrospectives for coding agents.** An [OpenCode](https://opencode.ai) v2 plugin that turns session friction — reverts, loops, abandoned tasks, user corrections — into concrete changes to your harness: skills, instructions, tools, code.

Agents don't learn from their own sessions. The only way to find out where they struggled is to read the log, and nobody reads the log. `opencode-retro` reads it for you and comes back with proposals.

> **Status: concept / name reserved.** Nothing to install yet. See [Roadmap](#roadmap).

## The problem

Every session, an agent walks into the same walls:

- a skill says "run the linter" — the project doesn't use one; the agent runs it, rewrites 40 files, realises its mistake, reverts everything;
- the same failing command is retried four times with no change in between;
- a task from the plan is quietly dropped as "not possible right now";
- the user says "no, we don't do it that way here" for the third week in a row;
- a tool that would have saved 20 steps simply isn't there.

All of that is in the log. None of it makes it into the next session.

## What it does

Two loops, deliberately separated.

### 1. Capture loop — automatic, every session

The plugin keeps a lightweight **shadow log** of every tool call and prompt (`.opencode/retro/sessions/<id>.jsonl`). No LLM involved, just appends. This makes the plugin independent of session compaction — the raw trajectory is always available.

Cheap deterministic **anchor detectors** mark suspicious windows in the trajectory:

| Anchor | Signal |
|---|---|
| revert | agent undid its own edits (`git checkout`, reverse edit) within N steps |
| repeat | same command / same output with no file changes in between |
| skill→failure | a skill was invoked, followed by a failure or revert |
| abandon | a planned task marked skipped / "couldn't" |
| correction | user prompt contradicts the agent's previous action |

On `session.idle` a **separate extraction session** with a clean context (not the working agent — it would defend its own decisions) gets a compressed projection of the log (tool outputs trimmed, prompts and answers in full) plus the anchors, and answers one question:

> *If this session were run again, what should change so it goes shorter and straighter?*

The output is a list of **lessons** written to `.opencode/retro/lessons/`.

### 2. Integration loop — on demand, `/retro`

When you run `/retro`, lessons are walked one by one, highest score first:

```
Lesson 7 / 12                                        score 48 · seen in 3 sessions

  The `lint` skill runs eslint --fix, but this project has no lint config
  and no lint script. The agent ran it, modified 40 files and reverted.

  evidence   sessions a81f (steps 41–58), c204 (12–19), e77b (88–101)
  proposal   .opencode/skills/lint/SKILL.md — add a precondition:
             skip and report if no lint config is present in the repo.
  ask        Is the linter really unused here? If so, should the skill
             be removed from this project instead?

  [a]ccept  [e]dit  [r]eject  [l]ater
```

Accept applies the diff. Reject is remembered so the lesson isn't proposed again. One `git diff` at the end for review.

A lesson's proposal is a *suggestion*, not a schema. Typical targets:

- **skill** — fix or extend a `SKILL.md` with how the task is actually done here
- **instruction** — a fact or constraint for `AGENTS.md`
- **tool** — a request to the human: "X is missing; without it sessions A, B, C each lost ~N steps"
- **refactor** — a codebase change so the trap is removed, with rationale, never auto-applied
- **other** — doesn't fit; the human decides

## Lesson format

```yaml
id: lint-skill-no-config
statement: The `lint` skill assumes eslint; this project has no linter.
evidence:
  - session: a81f
    steps: [41, 58]
  - session: c204
    steps: [12, 19]
cost: 34          # steps consumed by the problem, summed over sessions
recurrence: 3     # independent sessions where it showed up
confidence: 0.9
proposal:         # optional
  target: .opencode/skills/lint/SKILL.md
  change: |
    Before running: check for a lint config (eslint.config.*, .eslintrc*)
    and a `lint` script in package.json. If absent, do not run; report.
ask: Is the linter really unused here? Remove the skill from this project?
status: new       # new | accepted | rejected | later
```

Score = `cost × recurrence × confidence`. Lessons are scoped to the workspace. A cap (default 30) keeps the list short — low-score lessons are archived, not deleted. Recurrence matters more than one expensive incident: a lesson that shows up in three sessions *will* show up in the fourth.

## What this is not

- **Not a memory plugin.** Memory plugins build a knowledge base the agent has to remember to query. `opencode-retro` edits the artifacts the harness already reads (`SKILL.md`, `AGENTS.md`). Knowledge that lives in a skill doesn't need to be recalled.
- **Not a loop breaker.** Loop detectors stop the agent *now*. This plugin makes sure the loop doesn't happen *next time*. Use both.
- **Not a golden-path harvester.** Most self-improving-skills tools capture what *worked*. This captures what *didn't*, which is where the cheap wins are.

## Project vs global

Everything is project-scoped by default. A lesson becomes a *candidate* for global scope only when its evidence has no project-specific files, configs or dependencies in it, and it has recurred in at least two different workspaces. Promotion is a separate `/retro` proposal showing evidence from both.

## Roadmap

| Level | What the plugin does | Human does |
|---|---|---|
| **L0** | capture + extract lessons | reads `lessons/` by hand |
| **L1** | `/retro` proposes diffs | accepts / rejects one by one ← *v1 target* |
| **L2** | high-confidence lessons confirmed ≥2× are applied to a branch automatically | reviews the batch |
| **L3** | skills/instructions applied without review | sees only `tool` and `refactor` requests |

Promotion between levels is driven by the plugin's own accept/reject statistics — it earns autonomy, it isn't granted.

## Design decisions

- **Separate extraction session.** The working agent is the worst judge of its own session.
- **Shadow log, not session history.** Compaction can't eat what we already wrote down.
- **Friction over success.** Reverts, repeats and corrections are rarer and higher-signal than "this went fine".
- **Artifacts over memory.** Change what the harness reads; don't add a thing to remember.
- **Human gate first.** Autonomy is a later level with its own evidence.

## Requirements

- OpenCode **v2** (`@opencode/plugin` ≥ 2.0)
- a model for the extraction session (any; a cheap one is fine)

## License

MIT
