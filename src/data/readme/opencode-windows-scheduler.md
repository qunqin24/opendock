# opencode-windows-scheduler

> OpenCode v2 plugin for scheduling and orchestrating AI agent jobs — cron, one-shot runs, DAG pipelines, matrix builds, quality gates, SQLite history and a local web dashboard. Runs on Windows, macOS and Linux. Free and open source (MIT).

[![CI](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![npm downloads](https://img.shields.io/npm/dm/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![license](https://img.shields.io/npm/l/opencode-windows-scheduler.svg)](LICENSE)
[![node](https://img.shields.io/node/v/opencode-windows-scheduler.svg)](package.json)

Русская версия: [docs/README.ru.md](docs/README.ru.md).

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
| Scheduling | cron expressions, one-shot runs via `runAt` / `delaySeconds`, native OS scheduler (Windows / macOS / Linux), timezone-free local time, pause/resume, session continuity (`new` / `reuse` / `last` with `sessionMaxRuns` cleanup) |
| Reliability | lock-file no-overlap protection, timeouts with hard kill, retries with delay, crash recovery |
| Quality | Quality Gate command, before/after hooks, per-task allowed/denied tool lists |
| Orchestration | `dependsOn` DAG, `nextTaskOnSuccess` / `nextTaskOnError` chains, matrix fan-out (parallel/sequential, `continue`/`stop`, concurrency, per-workspace overrides, aggregator task) |
| Triggers | cron, one-shot (`triggerType: "once"`), file change (chokidar), MCP events, incoming webhooks (`POST /api/hooks/:task` with HMAC) |
| Multi-repo | workspaces with path validation, per-workspace runs, matrix over one parent task |
| Observability | SQLite history (success / error / timeout / partial / running), metrics (duration, tokens, cost), JSONL run logs with `/api/logs`, Prometheus `/metrics`, OTLP export, per-task logs, local web dashboard with 14-day analytics, history retention and CSV/JSON export |
| Operations | dry-run preview, export/import JSON, templates, multi-channel notifications (webhook, Telegram, native OS toasts), quiet hours, digest, encrypted secrets (`${secret:NAME}`), audit log, settings |
| Interfaces | OpenCode GUI panel, web dashboard, 24 agent tools, built-in agent skill |

## Install

Requires OpenCode v2 and Node.js 20+.

```bash
opencode plugin add opencode-windows-scheduler
```

Or add the plugin to `opencode.jsonc` manually:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-windows-scheduler"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` disables the built-in OpenCode scheduler so the agent does not confuse built-in job tools with this plugin's tools. Restart OpenCode after changing the config.

Alternatively, install globally with npm:

```bash
npm install -g opencode-windows-scheduler
```

From source:

```bash
git clone https://github.com/DeadSno/opencode-windows-scheduler.git
cd opencode-windows-scheduler
npm install
npm run build && npm run build:gui
```

## Agent tools

The agent gets the full feature set — 22 tools covering scheduling, pipelines, operations, observability and administration:

| Tool | Arguments | What it does |
|---|---|---|
| `schedule_task` | `name`, `prompt`, `schedule` for cron or `runAt` / `delaySeconds` for one-shot, optional `session` / `sessionMaxRuns`, `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType`, `mcpEvent`, `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `matrix` | Registers a job with the OS scheduler (cron, one-shot, file or MCP-event trigger) |
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
| `matrix_control` | `action`, `name?` | Matrix results, cancel pending clones, clean up orphans, preview clones |
| `get_metrics` | — | Aggregate runs, successes and failures |
| `get_analytics` | `days?`, `topLimit?` | Period report: counts, success rate, duration, tokens, cost, top tasks |
| `manage_settings` | `action`, `maxConcurrent?`, `winterMode?`, `notifications?`, `history?` | Read/update global settings (concurrency, notifications, retention) |
| `manage_templates` | `action`, template fields | List, save or delete reusable task templates |
| `manage_profiles` | `action`, `name?`, `port?` | List, create, switch or delete isolated profiles |
| `transfer_tasks` | `action`, `data?` | Export all tasks to JSON or import them back |
| `send_notification` | `action` (`test`/`digest`), `channel?` (`all`/`webhook`/`telegram`/`native`) | Test the notification channels or send the digest |
| `get_dashboard_info` | — | Dashboard port/URL, platform, title, active profile |
| `cleanup_history` | `retentionDays?`, `maxRecords?` | Delete old history by age and/or record cap |
| `emit_event` | `eventName`, `payload?` | Start tasks subscribed to an MCP event |

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
    telegram.ts         Telegram Bot API delivery
    native-notify.ts    Windows Toast / macOS / Linux notifications
  db/                   SQLite: tasks, history, metrics, settings
  task-transfer.ts      export / import / validation
```

Job wrappers run `opencode run` in the task working directory, so project MCP servers are picked up automatically.

## Development

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # 29 test suites, 500+ checks
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — process model, modules, backends, data model.
- [docs/FEATURES.md](docs/FEATURES.md) — full feature catalog with examples.
- [docs/MIGRATION.md](docs/MIGRATION.md) — moving from cron, systemd, launchd or Task Scheduler.
- [CROSS_PLATFORM.md](CROSS_PLATFORM.md) — Windows / macOS / Linux differences and backends.

## FAQ

**Does it work when OpenCode is closed?**
Yes. Jobs are registered with the native OS scheduler, so they run without an open OpenCode window.

**Which platforms are supported?**
Windows (Task Scheduler), macOS (launchd) and Linux (crontab). Backend differences are documented in [CROSS_PLATFORM.md](CROSS_PLATFORM.md).

**Where does my data go?**
Nowhere. History, logs, metrics and settings are stored locally in SQLite. No telemetry, no accounts, no cloud.

**How do I get Telegram notifications?**
Create a bot with [@BotFather](https://t.me/BotFather), copy the token, send the bot a message and read `chat_id` from `getUpdates` (or use a group/channel ID). Paste both in the sidebar panel or run `manage_settings` with `notifications.telegram` (`enabled`, `botToken`, `chatId`, optional `parseMode`). To keep secrets out of `settings.json`, set `OPENCODE_SCHEDULER_TELEGRAM_BOT_TOKEN` and `OPENCODE_SCHEDULER_TELEGRAM_CHAT_ID` instead — environment values are used when the fields are empty. Use `send_notification` with `channel: "telegram"` to verify.

**Do I need an extra package for desktop notifications?**
No. Windows Toast (PowerShell/WinRT), macOS Notification Center (`osascript`) and Linux `notify-send` are called directly, so `node-notifier` is not required. Enable them with `notifications.native.enabled`.

**Can I silence notifications at night?**
Yes. Set `notifications.quietHours` (`enabled`, `from`, `to` in `HH:MM`). During the window successful and `partial` runs are suppressed, while failures and timeouts are always delivered.

**How do I store secrets?**
Use `manage_secrets` (or the «🔐 Секреты» panel in the sidebar) to create an encrypted secret. Secrets are stored in `<PLUGIN_DIR>/secrets.json` with AES-256-GCM and a key file (`secrets.key`, rights 0600). In task `env`, reference a secret as `${secret:NAME}` — the value is substituted at run time and masked in logs, history and audit. The secret name can also be set via `manage_settings` → `notifications.telegram.botToken` left empty and `OPENCODE_SCHEDULER_TELEGRAM_BOT_TOKEN` env var instead.

**Can I see who changed what?**
Yes. The audit log (`get_audit_log` tool, «📜 Журнал аудита» panel, `GET /api/audit`) records every mutation — task create/update/delete/run, settings, templates, profiles, workspaces, secrets, import, history cleanup — with actor (mcp/gui/http), source, timestamp and redacted details. Retention defaults to 90 days / 10 000 records.

**How is this different from `experimental.schedules`?**
The built-in scheduler runs jobs while OpenCode is open. This plugin uses the native OS scheduler and adds DAG pipelines, matrix builds, quality gates, webhooks and observability.

**Can jobs run in other repositories?**
Yes. Workspaces point at project paths, and a matrix build runs one template across several workspaces at once.

## Roadmap

- [ROADMAP.md](ROADMAP.md) — sprint history and next sprints.
- [ROADMAP-STRATEGY.md](ROADMAP-STRATEGY.md) — positioning and 6-month plan.

## License

[MIT](LICENSE).
