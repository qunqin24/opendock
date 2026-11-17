# opencode-windows-scheduler

> OpenCode V1 (≥ 1.18.29) and V2 plugin for scheduling and orchestrating AI agent jobs — cron, one-shot runs, DAG pipelines, matrix builds, quality gates, SQLite history and a local web dashboard. Runs on Windows, macOS and Linux. Free and open source (MIT).

[![CI](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/opencode-windows-scheduler/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![npm downloads](https://img.shields.io/npm/dm/opencode-windows-scheduler.svg)](https://www.npmjs.com/package/opencode-windows-scheduler)
[![license](https://img.shields.io/npm/l/opencode-windows-scheduler.svg)](LICENSE)
[![node](https://img.shields.io/node/v/opencode-windows-scheduler.svg)](package.json)

Translations: [Russian](docs/README.ru.md) · [中文](docs/README.zh.md).

---

## Quickstart

1. Install the plugin (see [Install](#install)) and restart OpenCode.
2. Ask the agent to schedule your first job — one call is enough:

   > Schedule a task "morning-report" that runs every day at 09:00 with the prompt: "Summarize yesterday's git commits and write the report to ~/reports/".

3. Open the dashboard to watch it run: the agent prints the URL when the task is created (default `http://localhost:4380`), or ask for it later with the `get_dashboard_info` tool. Prefer a preview without installing anything? `node scripts/demo-dashboard.mjs` starts a demo dashboard at `http://localhost:4380`.

## Why

Most schedulers for AI agents are cron wrappers: they run a prompt on a timer and write a log file. This plugin treats agent jobs as **workflows**:

- **DAG pipelines** — a job waits for its dependencies, chains on success/error.
- **Matrix builds** — one template, N repositories, parallel or sequential, with concurrency limits and per-workspace overrides.
- **Quality gates** — a job is marked successful only if `npm test` (or any command) passes.
- **Observability** — SQLite history, metrics, logs, and a local web dashboard.
- **Runs without OpenCode open** - cron and one-shot jobs are registered with the native OS scheduler (Windows Task Scheduler, launchd, crontab) and survive reboots. File, git and MCP-event triggers are watched inside the plugin process, so they need OpenCode running.

Everything runs on your machine. No SaaS, no telemetry, no accounts.

![Local web dashboard: matrix builds, DAG graph, metrics and run history](docs/dashboard.png)

Want to see it without installing OpenCode? `node scripts/demo-dashboard.mjs` starts the dashboard with demo data at http://localhost:4380.

## Features

| Area | What you get |
|---|---|
| Scheduling | cron expressions, one-shot runs via `runAt` / `delaySeconds`, native OS scheduler (Windows / macOS / Linux), IANA timezones (native where possible, minute-poll + gate otherwise), pause/resume, session continuity (`new` / `reuse` / `last` with `sessionMaxRuns` cleanup) |
| Reliability | lock-file no-overlap protection, timeouts with hard kill, retries with delay, crash recovery |
| Quality | Quality Gate command, before/after hooks, per-task allowed/denied tool lists |
| Orchestration | `dependsOn` DAG, `nextTaskOnSuccess` / `nextTaskOnError` chains, matrix fan-out (parallel/sequential, `continue`/`stop`, concurrency, per-workspace overrides, aggregator task) |
| Triggers | cron, one-shot (`triggerType: "once"`), git commits (`triggerType: "git"`, branch/path/ignore filters), file change (chokidar, with glob masks `watchGlobs`/`watchIgnore`), MCP events, incoming webhooks (`POST /api/hooks/:task` with HMAC) |
| Multi-repo | workspaces with path validation, per-workspace runs, matrix over one parent task |
| Observability | SQLite history (success / error / timeout / partial / running), metrics (duration, tokens, cost), JSONL run logs with `/api/logs`, Prometheus `/metrics`, OTLP export, per-task logs, local web dashboard with 14-day analytics, history retention and CSV/JSON export |
| Operations | dry-run preview, export/import JSON, templates, multi-channel notifications (webhook, Telegram, native OS toasts), quiet hours, digest, encrypted secrets (`${secret:NAME}`), audit log, settings |
| Interfaces | OpenCode GUI panel, web dashboard, 25 agent tools, built-in agent skill |

### Language

The interface ships in Russian (default), English and Simplified Chinese. The language
selector sits in the scheduler panel header (🌐 Auto / Русский / English / 中文) and is
also available through the `manage_settings` tool (`action: "update"`, `locale: "zh"`).
`locale: "auto"` (the "Auto" option) follows the OpenCode interface language: the panel
reacts to language changes immediately, and the resolved locale is sent to the server so
notifications, digests and the dashboard use the same language. The switch applies
without a restart. Dashboard localization is still being rolled out: some client-side
strings remain Russian for now. Agent tool descriptions and schemas stay English by
design, and diagnostics printed to the console stay Russian.

Catalogs live in `locales/ru.json`, `locales/en.json` and `locales/zh.json`; every key
must exist in all three, otherwise CI fails.

Documentation is separate from the interface locale: the English docs are the primary
source, with Russian (`docs/README.ru.md`) and Simplified Chinese (`docs/README.zh.md`,
`docs/FEATURES.zh.md`, `docs/FAQ.zh.md`, `docs/SAVINGS.zh.md`,
`docs/CROSS_PLATFORM.zh.md`) translations. Translations may lag behind the English
originals.

## Install

Requires OpenCode V1 ≥ 1.18.29 or V2, and Node.js 22.22+ (node:sqlite and chokidar 6 require Node.js 22.22+). See [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) for version support and the V1/V2 surface (GUI and RPC are V2-only; TUI works on both).

The config key differs between lines:

| OpenCode line | Key in `opencode.jsonc` |
|---|---|
| V1 (`1.18.29`–`1.19.x`) | `"plugin": ["opencode-windows-scheduler"]` |
| V2 (`≥ 2.2.7`) | `"plugins": ["opencode-windows-scheduler"]` |

Use the key of your line; there is no need to add both. On V2 the CLI does it for you:

```bash
opencode plugin add opencode-windows-scheduler
```

V1 — manual config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-windows-scheduler"]
}
```

V2 — equivalent manual config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-windows-scheduler"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` disables the built-in OpenCode scheduler so the agent does not confuse built-in job tools with this plugin's tools. Restart OpenCode after changing the config. The TUI panel is part of the same package (`exports["./tui"]`), so it is enabled by the same entry on both lines.

From source:

```bash
git clone https://github.com/DeadSno/opencode-windows-scheduler.git
cd opencode-windows-scheduler
npm install
npm run build && npm run build:gui
```

## Agent tools

The agent gets the full feature set — 26 tools covering scheduling, pipelines, operations, observability and administration:

| Tool | Arguments | What it does |
|---|---|---|
| `schedule_task` | `name`, `prompt`, `schedule` for cron or `runAt` / `delaySeconds` for one-shot, optional `session` / `sessionMaxRuns`, `timeoutSeconds`, `model`, `priority`, `beforeScript`, `afterScript`, `qualityGate`, `dependsOn`, `retryCount`, `retryDelay`, `nextTaskOnSuccess`, `nextTaskOnError`, `triggerType` (`cron`/`file`/`git`/`mcp-event`/`once`), `mcpEvent`, `watchPath`, `watchGlobs`, `watchIgnore`, `gitBranch`, `gitPaths`, `gitIgnore`, `gitPollSeconds`, `activeDays`, `windowPolicy` (`skip`/`postpone`/`run`), `workingDirectory`, `workspaceId`, `allowedTools`, `deniedTools`, `legacyShell`, `matrix` | Registers a job with the OS scheduler (cron, one-shot, file, git or MCP-event trigger) |
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
| `manage_local_ai` | `action` (`get`/`update`/`test`), `mode?`, `baseUrl?`, `model?`, `timeoutMs?`, `fallback?`, `confidenceThreshold?`, `shadow?` | Read, update or test the local triage assistant; `test` sends one synthetic notification and reports latency and verdict |
| `manage_templates` | `action`, template fields | List, save or delete reusable task templates |
| `manage_profiles` | `action`, `name?`, `port?` | List, create, switch or delete isolated profiles |
| `transfer_tasks` | `action`, `data?` | Export all tasks to JSON or import them back |
| `send_notification` | `action` (`test`/`digest`), `channel?` (`all`/`webhook`/`telegram`/`native`) | Test the notification channels or send the digest |
| `get_dashboard_info` | — | Dashboard port/URL, platform, title, active profile |
| `cleanup_history` | `retentionDays?`, `maxRecords?` | Delete old history by age and/or record cap |
| `manage_secrets` | `action`, `name?`, `value?` | Create, list or delete AES-256-GCM encrypted secrets used in task `env` |
| `get_audit_log` | `action?`, `target?`, `actor?`, `since?`, `until?`, `limit?` | Mutation audit journal: who changed what, when and via which interface |
| `emit_event` | `eventName`, `payload?` | Start tasks subscribed to an MCP event |

`schedule_task` also accepts the full matrix configuration (`workspaceIds`, `strategy`, `failureMode`, `aggregation`, `concurrency`, `overrides`, `createAggregator`).

## Permissions

Agent jobs run with `opencode run --auto`, so their tool policy must be explicit. The global `permissions.defaultPolicy` setting (GUI → Settings, or `manage_settings`) chooses the baseline:

| Policy | Allowed by default | Denied by default |
|---|---|---|
| `hybrid` (default) | read, edit, glob, grep, subagent, skill, webfetch, websearch | shell, question |
| `secure` | read, glob, grep, skill | edit, shell, question, webfetch, websearch, subagent |
| `legacy` | all ten actions | — |

`deniedTools` always wins. A non-empty `allowedTools` is an allowlist: it denies every action that is not listed, and can explicitly re-enable an action denied by the policy (for example `shell`). `legacyShell: true` re-enables `shell` only under `hybrid`, for tasks migrated from older versions.

Blocked actions are written to the audit journal as `tool.blocked` with `reason: "default-policy"` and a `hint`, and each run logs the active policy.

Recommended pattern: keep `git commit`/`push`, builds and tests outside the agent, in `qualityGate` or `afterScript` (the wrapper runs them with `bash -c`), and leave the agent with `read`/`edit`. Most jobs then need no `shell` at all.

## Agent skill

The plugin registers a built-in skill, `scheduled-job-best-practices`, so the agent loads guidance only when it is relevant: cron design, self-contained prompts, Quality Gates, matrix concurrency, DAG rules and post-incident diagnosis. No manual `.opencode/skills` setup is needed. The skill ships with `references/recipes.md` — eight copy-ready configurations.

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

### Logon mode (Windows)

Tasks are **interactive only** by default: Task Scheduler starts them only while the user who created them is logged on, with the normal profile, drives and saved credentials. Pass `runWhenLoggedOff: true` to run a job without a logged-on user (`schtasks /ru SYSTEM`). Such a task runs in session 0 — no user profile, mapped drives, network shares or saved credentials — so jobs that need your environment may fail; test them with `dry_run` first. On Linux crontab already runs without a login, and a macOS launchd agent runs only inside a user session.

## Development

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # 58 test suites, 600+ checks
npm run test:en      # same suites with the English locale
```

`npm run test:en` sets `OPENCODE_SCHEDULER_LOCALE=en` for every suite; the variable is a
service hook, not a user setting.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — process model, modules, backends, data model.
- [docs/CONCEPT.md](docs/CONCEPT.md) — north-star concept: verifiable local-first orchestration (in Russian).
- [docs/FEATURES.md](docs/FEATURES.md) — full feature catalog with examples.
- [docs/FAQ.md](docs/FAQ.md) — recovery scenarios, webhook replay, operational answers.
- [docs/MIGRATION.md](docs/MIGRATION.md) — moving from cron, systemd, launchd or Task Scheduler.
- [docs/SAVINGS.md](docs/SAVINGS.md) — how the "Saved $" estimate is calculated.
- [CROSS_PLATFORM.md](CROSS_PLATFORM.md) — Windows / macOS / Linux differences and backends.

Translations: [Русский](docs/README.ru.md) · [中文](docs/README.zh.md).

## FAQ

**Does it work when OpenCode is closed?**
Yes, for cron and one-shot jobs. They are registered with the native OS scheduler, so they run without an open OpenCode window.

File (`file`), git (`git`) and MCP-event (`mcp-event`) triggers are watched by the plugin process (chokidar / git polling / the MCP event bus), so OpenCode must be running for those triggers to fire.

| Trigger | Runs without OpenCode? | Mechanism |
|---|---|---|
| `cron` | ✅ Yes | Native OS scheduler (Task Scheduler / launchd / crontab) |
| `once` | ✅ Yes | Native OS scheduler, one-shot registration |
| `file` | ❌ No | chokidar watcher inside the plugin process |
| `git` | ❌ No | Git polling inside the plugin process |
| `mcp-event` | ❌ No | MCP event bus inside the plugin process |
| `webhook` (`/api/hooks/:name`) | ❌ No | HTTP server inside the plugin process |

**Do jobs run when nobody is logged on?**
On Windows, only if you opt in with `runWhenLoggedOff: true`: the task is then registered as `schtasks /ru SYSTEM` and runs in session 0 without your profile, mapped drives or saved credentials. The default is interactive only — the job runs while the user is logged on. Linux crontab always runs without a login; a macOS launchd agent runs only inside a user session.

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
Use `manage_secrets` (or the **🔐 Secrets** panel in the sidebar) to create an encrypted secret. Secrets are stored in `<PLUGIN_DIR>/secrets.json` with AES-256-GCM and a key file (`secrets.key`; mode 0600 on POSIX, an ACL granting only the current Windows user on Windows). In task `env`, reference a secret as `${secret:NAME}` — the value is substituted at run time and masked in logs, history and audit. The secret name can also be set via `manage_settings` → `notifications.telegram.botToken` left empty and `OPENCODE_SCHEDULER_TELEGRAM_BOT_TOKEN` env var instead.

**Can I see who changed what?**
Yes. The audit log (`get_audit_log` tool, **Audit log** panel, `GET /api/audit`) records every mutation — task create/update/delete/run, settings, templates, profiles, workspaces, secrets, import, history cleanup — with actor (mcp/gui/http), source, timestamp and redacted details. Retention defaults to 90 days / 10 000 records.

**How is this different from `experimental.schedules`?**
The built-in scheduler runs jobs while OpenCode is open. This plugin uses the native OS scheduler and adds DAG pipelines, matrix builds, quality gates, webhooks and observability.

**Can jobs run in other repositories?**
Yes. Workspaces point at project paths, and a matrix build runs one template across several workspaces at once.

## Roadmap

- [ROADMAP.md](ROADMAP.md) — sprint history and next sprints.
- [ROADMAP-STRATEGY.md](ROADMAP-STRATEGY.md) — positioning and 6-month plan.

## License

[MIT](LICENSE).
