# opencode-durable-goal

`opencode-durable-goal` is a lightweight persistent-goal plugin for OpenCode.

It is inspired by Codex-style durable goals, but it keeps the model simple:

- one active goal per project
- a persistent goal file on disk
- automatic continuation on `session.idle`
- `stall` vs `block` decided by the agent, not by rigid plugin heuristics
- completion criteria used as a definition of done, not as a second todo system

This is intended for people who want a Codex-inspired goal workflow inside OpenCode without adopting a heavier planning framework.

## Why this exists

OpenCode already has tools, todo support, and session persistence. What it does not natively provide is a durable goal state with a clear lifecycle:

- `active`
- `blocked`
- `complete`

This plugin adds that layer without turning OpenCode into a project-management tool.

## Core ideas

### Durable goal state

Each project stores its active goal in:

```text
.opencode/goal.json
```

That state survives session churn and context compression.

### Completion criteria, not a second todo list

When the agent creates a goal, it should also define a short structured checklist or subgoal list.

Those criteria are used for:

- clarifying the objective up front
- checking completion before `goal_complete`

They are not meant to be maintained as a separate todo system during normal work.

### Agent-judged `stall` vs `block`

The plugin does not try to infer “real progress” from file diffs or command output.

Instead:

- if the agent merely stopped early, lost momentum, or needs a different tactic, it should call `goal_stall`
- if the agent judges the goal truly cannot continue under current conditions, it should call `goal_blocked`

This avoids brittle hard-coded progress heuristics.

### Continuation is lightweight

On `session.idle`, if a goal is still `active`, the plugin injects a continuation reminder.

That reminder tells the agent to:

- continue working
- try another concrete approach before giving up
- use `goal_complete`, `goal_stall`, `goal_blocked`, or `goal_note` explicitly

### ESC abort cooldown

If the user cancels the agent by pressing ESC, the plugin detects the abort and skips the next continuation for 30 seconds. This gives the user space to regain control without being immediately pulled back into the goal loop.

After 30 seconds, normal continuation resumes automatically. No user action is needed to re-enable it.

## Tools

### `goal_create`

Create the durable goal for the current project.

**Important:** Before calling this tool, the agent must present the objective and completion criteria to the user and get explicit confirmation. Do not create a goal without user agreement.

Arguments:

- `objective`
- `completionCriteria`
- `tokenBudget` (optional)
- `maxIdleContinuations`

### `goal_get`

Read the current goal state.

### `goal_note`

Record concrete progress without changing the goal status.

### `goal_stall`

Record that the agent stalled or stopped early, but the goal should remain active.

Use this when:

- the current approach failed
- the agent needs another tactic
- work should continue

### `goal_blocked`

Mark the goal as blocked.

Use this only when the goal cannot continue under current conditions.

Examples:

- missing credentials
- required data unavailable
- external dependency down
- hardware/resource constraint makes continuation impossible

### `goal_resume`

Move a blocked or completed goal back to `active`.

### `goal_complete`

Mark the goal complete with a summary.

Before calling it, the agent should check the completion criteria one by one in its own reasoning.

### `goal_clear`

Clear the current goal file intentionally.

## Recommended workflow

1. Propose a goal — present the objective and completion criteria to the user.
2. On user confirmation, create the goal with `goal_create`.
3. Work normally.
4. Record meaningful progress with `goal_note`.
5. If the agent merely stalls, call `goal_stall` and try another method.
6. If the goal truly cannot continue, call `goal_blocked`.
7. If all completion criteria are satisfied, call `goal_complete`.

## `stall` vs `block`

Use `goal_stall` when the agent should keep trying.

Examples:

- the current edit path failed
- the test failed but another debugging route exists
- the agent stopped early and needs to resume
- the current command was the wrong approach

Use `goal_blocked` only when the goal truly cannot proceed under current conditions.

Examples:

- a required credential is missing
- the dataset or artifact is unavailable
- the external system is down
- the current hardware limit makes the task impossible without a different environment

## Example

The agent should first propose the goal to the user:

```text
I suggest creating a durable goal:
Objective: refactor the training entrypoint and verify a smoke run.
Completion criteria:
1. training script accepts the new config format
2. smoke run completes successfully
3. output artifacts are written to the expected directory

Shall I create this goal?
```

Once the user confirms, the agent calls `goal_create` with those criteria.

If the agent stops early, OpenCode will eventually inject a continuation prompt similar to:

```text
[GOAL CONTINUATION 1/8]
Goal: refactor the training entrypoint and verify a smoke run

The goal is still active. You likely stopped early or stalled.
Continue the work and prefer trying a different approach before giving up.
```

## Installation

### Local development

Place the source somewhere stable, install dependencies, then load it from your OpenCode plugins directory.

```bash
cd /path/to/opencode-durable-goal
bun install
```

```ts
export { DurableGoalPlugin as default } from "/absolute/path/to/opencode-durable-goal/src/index.ts"
```

Then place that wrapper in:

```text
~/.config/opencode/plugins/goal-local.ts
```

Restart OpenCode and confirm the goal tools appear in the tool registry.

### Install from npm

```bash
npm install opencode-durable-goal
```
or
```bash
bun add opencode-durable-goal
```

The npm package is published at [registry.npmjs.org/opencode-durable-goal](https://www.npmjs.com/package/opencode-durable-goal).

## State file example

```json
{
  "id": "goal_lx8z4c",
  "objective": "Refactor the training entrypoint and verify a smoke run.",
  "status": "active",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "updatedAt": "2026-06-01T12:10:00.000Z",
  "idleContinuations": 1,
  "maxIdleContinuations": 8,
  "completionCriteria": [
    { "text": "training script accepts the new config format", "status": "pending" },
    { "text": "smoke run completes successfully", "status": "pending" }
  ],
  "notes": [
    { "at": "2026-06-01T12:00:00.000Z", "kind": "create", "text": "Refactor the training entrypoint and verify a smoke run." }
  ]
}
```

## Limitations

- one active goal per project directory
- no multi-goal switching yet
- no archived goal history yet
- no attempt to automatically judge “real progress”

## Inspiration

This plugin is inspired by Codex-style persistent goals, but adapted to OpenCode with a more explicit, lighter-weight philosophy:

- keep state durable
- keep continuation simple
- let the agent judge `stall` vs `block`
- avoid duplicating the todo system
