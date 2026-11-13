# opencode-windows-scheduler

> Local-first orchestration for AI agent jobs in OpenCode v2 — cron, DAG pipelines, matrix fan-out, quality gates and observability. Free and open source (MIT).

[![CI](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![license](https://img.shields.io/npm/l/opencode-windows-scheduler.svg)](LICENSE)
[![node](https://img.shields.io/node/v/opencode-windows-scheduler.svg)](package.json)

Русская версия: [README.ru.md](README.ru.md).

---

## Why

Most schedulers for AI agents are cron wrappers: they run a prompt on a timer and write a log file. This plugin treats agent jobs as **workflows**:

- **DAG pipelines** — a job waits for its dependencies, chains on success/error.
- **Matrix builds** — one template, N repositories, parallel or sequential, with concurrency limits and per-workspace overrides.
- **Quality gates** — a job is marked successful only if `npm test` (or any command) passes.
- **Observability** — SQLite history, metrics, logs, and a local web dashboard.
- **Runs without OpenCode open** - jobs are registered with the native OS scheduler (Windows Task Scheduler, launchd, crontab) and survive reboots.

Everything runs on your machine. No SaaS, no telemetry, no accounts.

![Local web dashboard: matrix builds, DAG graph, metrics and run history](docs/dashboard.png)

Want to see it without installing OpenCode? `node scripts/demo-dashboard.mjs` starts the dashboard with demo data at http://localhost:4380.

## Features

| Area | What you get |
|---|---|
| Scheduling | cron expressions, native OS scheduler (Windows / macOS / Linux), timezone-free local time, pause/resume |
| Reliability | lock-file no-overlap protection, timeouts with hard kill, retries with delay, crash recovery |
| Quality | Quality Gate command, before/after hooks, per-task allowed/denied tool lists |
| Orchestration | `dependsOn` DAG, `nextTaskOnSuccess` / `nextTaskOnError` chains, matrix fan-out (parallel/sequential, `continue`/`stop`, concurrency, per-workspace overrides, aggregator task) |
| Triggers | cron, file change (chokidar), MCP events |
| Multi-repo | workspaces with path validation, per-workspace runs, matrix over one parent task |
| Observability | SQLite history (success / error / timeout / partial / running), metrics (duration, tokens, cost), per-task logs, local web dashboard with 14-day analytics, history retention (age and size limits) and CSV/JSON export |
| Operations | dry-run preview, export/import JSON, templates, webhook notifications, settings |
| Interfaces | OpenCode GUI panel, web dashboard, 12 agent tools, built-in agent skill |

## Install

Requires OpenCode v2 and Node.js 20+.

```bash
npm install -g opencode-windows-scheduler
```

Add the plugin to `opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-windows-scheduler"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` disables the built-in OpenCode scheduler so the agent does not confuse built-in job tools with this plugin's tools. Restart OpenCode after changing the config.

From source:

```bash
git clone https://github.com/DeadSno/opencode-windows-scheduler.git
cd opencode-windows-scheduler
npm install
npm run build && npm run build:gui
```

## Agent tools

The agent gets the full feature set — 12 tools covering scheduling, pipelines, operations and observability:

| Tool | Arguments | What it does |
|---|---|---|
| `schedule_task` | `name`, `schedule`, `prompt`, optional `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType`, `mcpEvent`, `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `matrix` | Registers a job with the OS scheduler (cron, file or MCP-event trigger) |
| `list_tasks` | — | Returns jobs with schedule, status, next run, chains, workspace and matrix summary |
| `update_task` | `name` + any field to change | Partial update; omitted fields keep their values, empty values clear them, `matrix: null` removes the matrix |
| `delete_task` | `name` | Deletes a job (a matrix parent deletes clones and aggregator) |
| `run_task_now` | `name` | Runs a job immediately (matrix parent starts the fan-out) |
| `pause_task` | `name` | Pauses a job (matrix parent pauses every clone) |
| `resume_task` | `name` | Resumes a paused job |
| `get_history` | `taskName?`, `status?`, `limit?` | Recent runs with duration, tokens, cost, model, quality gate and hooks |
| `get_task_logs` | `name`, `lines?` | Tail of the run log |
| `dry_run` | `name?` | Simulates a pipeline (or every task): order, DAG, matrix fan-out, estimates |
| `manage_workspaces` | `action`, `id?`, `name?`, `path?`, `color?` | Multi-repo workspaces: list, add, update, delete |
| `matrix_control` | `action`, `name?` | Matrix results, cancel pending clones, clean up orphans |

`schedule_task` also accepts the full matrix configuration (`workspaceIds`, `strategy`, `failureMode`, `aggregation`, `concurrency`, `overrides`, `createAggregator`).

## Agent skill

The plugin registers a built-in skill, `scheduled-job-best-practices`, so the agent loads guidance only when it is relevant: cron design, self-contained prompts, Quality Gates, matrix concurrency, DAG rules and post-incident diagnosis. No manual `.opencode/skills` setup is needed. The skill ships with `references/recipes.md` — seven copy-ready configurations.

## Matrix builds

```jsonc
{
  "name": "deploy",
  "schedule": "0 3 * * *",
  "prompt": "Build, test and deploy",
  "matrix": {
    "workspaceIds": ["frontend-id", "backend-id", "mobile-id"],
    "strategy": "parallel",
    "failureMode": "continue",
    "aggregation": "summary",
    "concurrency": 2,
    "createAggregator": true,
    "overrides": {
      "mobile-id": { "qualityGate": "npm run test:mobile" }
    }
  }
}
```

Each workspace gets a clone named `<parent>-matrix-<workspace>`. The parent never runs itself: it aggregates clone results into `success`, `error` or `partial`. Clones stay in sync with the parent when you edit it; running clones are never touched.

## GUI and dashboard

The OpenCode sidebar shows jobs, history, logs, dry-run, templates, import/export, concurrency limit and matrix grouping. The local web dashboard adds per-workspace summaries, matrix tabs, a pipeline view and metrics.

```bash
npm run build:gui   # produces gui-experimental.cjs
```

## How it works

```
src/
  index.ts              plugin lifecycle, agent tools, RPC
  gui.tsx               OpenCode sidebar panel
  server.ts             local web dashboard
  core/
    scheduler/          Windows / Linux / macOS backends
    matrix.ts           fan-out, aggregation, sync, cancel
    record-history.ts   history, retries, chains, matrix continuation
    dry-run.ts          pipeline simulation
    lock.ts             no-overlap protection
    file-watcher.ts     chokidar triggers
  db/                   SQLite: tasks, history, metrics, settings
  task-transfer.ts      export / import / validation
```

Job wrappers run `opencode run` in the task working directory, so project MCP servers are picked up automatically.

## Development

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # 17 test suites, 500+ checks
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — process model, modules, backends, data model.
- [docs/FEATURES.md](docs/FEATURES.md) — full feature catalog with examples.
- [docs/MIGRATION.md](docs/MIGRATION.md) — moving from cron, systemd, launchd or Task Scheduler.

## Roadmap

- [ROADMAP.md](ROADMAP.md) — sprint history and next sprints.
- [ROADMAP-STRATEGY.md](ROADMAP-STRATEGY.md) — positioning and 6-month plan.

## License

[MIT](LICENSE).
