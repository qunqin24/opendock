# opencode-autopilot

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/opencode-autopilot?label=version)](https://www.npmjs.com/package/opencode-autopilot)

**Turn OpenCode into a self-driving coding agent.** One task queue, auto-dispatch, session lifecycle. Stop being the scheduler.

</div>

---

## What It Does

Instead of manually running tasks one by one, **opencode-autopilot** manages your backlog, picks the next task, spins up a session with context and constraints, and chains the next task when one finishes.

| Feature | What It Solves |
|---------|---|
| **Centralized backlog** | One task queue across all projects — no context switching between task lists |
| **Auto-dispatch** | Picks next task, creates session, sends prompt with constraints — no manual "what's next" decisions |
| **Completion monitoring** | Detects idle sessions, chains next task automatically |
| **Session lifecycle** | Auto-cleans stale sessions, compacts for speed, tags idle/WIP/complete |
| **Daily limits** | Configurable cap on tasks/day — prevents runaway credit burn |
| **Telemetry** | Track tasks dispatched, completed, blocked, duration, completion rate per project |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      opencode-autopilot                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Backlog]                                                      │
│     ↓ (prioritized queue)                                       │
│  [Auto-Dispatcher] (runs every 60s)                            │
│     ├─→ respects: maxConcurrent, dailyTaskLimit               │
│     ├─→ detects completed sessions                             │
│     └─→ chains: next task → new session                        │
│     ↓                                                           │
│  [Session Manager]                                             │
│     ├─→ creates isolated session context                       │
│     ├─→ injects task constraints (stay focused, no scope creep)│
│     ├─→ sends prompt to OpenCode agent                         │
│     └─→ monitors for completion/idle                          │
│     ↓                                                           │
│  [Metrics Tracker]                                             │
│     └─→ duration, completion rate, blocked tasks, cost        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Task Flow:
  /plan → backlog.json (prioritized tasks)
    ↓
  autopilot (every 60s) → ready task picked
    ↓
  creates session → sends prompt with constraints
    ↓
  agent works → marks done when idle
    ↓
  next task auto-dispatched
```

---

## Quick Start

### 1. Install

Add to your OpenCode config:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugin": ["opencode-autopilot"]
}
```

### 2. Create a backlog

Type `/plan` in any OpenCode session — the agent analyzes your project and creates a prioritized task queue:

```bash
/plan
# Creates ~/.local/share/opencode/orchestrator/backlog.json
```

### 3. Run autopilot

The orchestrator auto-dispatches tasks every 60 seconds. Monitor it:

```bash
/backlog        # See task statuses
/stats          # View telemetry (dispatched, completed, rate, duration)
/next           # Force-dispatch the next task immediately
```

That's it. The machine manages the queue. You manage planning and review.

---

## Configuration

Create `~/.local/share/opencode/orchestrator/config.json`:

```json
{
  "maxConcurrent": 2,
  "dailyTaskLimit": 10,
  "maxTasksPerPlan": 15,
  "autoDispatch": true,
  "maxSessionsPerProject": 3,
  "compactAfterMessages": 20,
  "notifications": {
    "onComplete": true,
    "onBlocked": true,
    "sound": false
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrent` | `2` | Max sessions working concurrently |
| `dailyTaskLimit` | `10` | Max tasks dispatched per calendar day (resets at midnight UTC) |
| `maxTasksPerPlan` | `15` | Max tasks a `/plan` command can create |
| `autoDispatch` | `true` | Set `false` to only dispatch via `/next` command |
| `maxSessionsPerProject` | `3` | Auto-prune excess sessions per project |
| `compactAfterMessages` | `20` | Auto-compact session context above this message count |
| `notifications.onComplete` | `true` | Notify when a task finishes |
| `notifications.onBlocked` | `true` | Notify when a task is blocked |
| `notifications.sound` | `false` | Play system sound on notifications |

---

## Task Constraints

Every dispatched task includes guardrails in the prompt to prevent scope creep:

- **Stay focused** — Do not expand scope beyond THIS task
- **No refactoring** — Only refactor if the task explicitly requires it
- **No gold-plating** — Do not add features, tests, or docs beyond spec
- **Conventional commits** — Commit with conventional message format after each functional step

These constraints are non-negotiable per task — they keep the queue moving.

---

## Telemetry & Observability

Metrics are stored at `~/.local/share/opencode/orchestrator/metrics.json` and tracked per day and per project:

```json
{
  "date": "2025-01-15",
  "summary": {
    "tasksDispatched": 8,
    "tasksCompleted": 6,
    "tasksBlocked": 1,
    "avgDurationMinutes": 12.3,
    "completionRate": 0.75
  },
  "byProject": {
    "my-web-app": {
      "dispatched": 3,
      "completed": 3,
      "blocked": 0,
      "avgDurationMinutes": 10.5
    },
    "shared-lib": {
      "dispatched": 5,
      "completed": 3,
      "blocked": 1,
      "avgDurationMinutes": 13.8
    }
  }
}
```

View the summary with `/stats`:

```
Orchestrator Metrics
────────────────────
Today:             8 tasks (6 done, 1 blocked, 1 pending)
Completion Rate:   75%
Avg Duration:      12.3 min per task
Daily Limit:       6/10 remaining

By Project:
  my-web-app      3 done, 0 blocked    ✓ on track
  shared-lib      3 done, 1 blocked    ⚠ investigate
```

Use metrics to:
- Detect slowdown patterns (avg duration creeping up)
- Monitor daily spend (are you hitting limits?)
- Identify blocked projects (tasks stuck, needing human intervention)
- Validate task estimates (is planned work taking longer than expected?)

---

## Philosophy

This plugin implements the **[Task Orchestration pattern](https://github.com/LucasSantana-Dev/ai-dev-toolkit/blob/main/patterns/task-orchestration.md)** from the AI Dev Toolkit.

**Core insight:** You should define the work and its boundaries. The machine should manage the queue.

**Without orchestration:**
```
you → decide next task → spin session → set constraints → watch → mark done → repeat
```

**With orchestration:**
```
you → define backlog via /plan → orchestrator → auto-dispatch → auto-chain → you review
```

You stay in the control loop (planning, review, unblocking), but the operational overhead vanishes. The orchestrator enforces constraints, prevents scope creep, and chains work without context loss.

---

## License

MIT

---

## Contributing

Issues and PRs welcome. This plugin uses OpenCode v1.2+ APIs — ensure compatibility when modifying session or dispatch logic.

