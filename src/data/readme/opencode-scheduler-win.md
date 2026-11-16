# opencode-scheduler-win

**Scheduled AI work inside OpenCode — as a plugin.**

This is an [OpenCode](https://opencode.ai) plugin that runs your recurring agent jobs *inside*
OpenCode itself. A scheduled run is not a detached child process with a log file: it is a
normal session in OpenCode Desktop. It shows up in the sidebar, streams its tool calls and
reply, and you can open it, read it, or continue the conversation afterwards.

> The package name still says `win` because the project started as a Windows-only
> supervisor. The plugin itself works on Windows, macOS and Linux. The Windows Task
> Scheduler backend is still shipped for jobs that must run while OpenCode is closed.

## Why a plugin instead of OS tasks

| | OS-scheduler job (old) | In-app plugin (new) |
|---|---|---|
| Run location | detached `opencode run` process | session inside OpenCode Desktop |
| Result | log file to grep | chat you can read, open and continue |
| Models / auth / MCP / agents | re-resolved by the child process | exactly the app's configuration |
| Visible activity | nothing in the UI | new `⏰` session in the sidebar |
| Setup | one Task Scheduler entry per job | install plugin once |
| Overlap protection | supervisor process | lock file shared with the app process |
| Works when OpenCode is closed | yes | no (use the legacy backend for that) |

## What you get

- **In-app scheduler.** The plugin starts a scheduler loop inside the OpenCode server. When a
  job is due it opens a session titled `⏰ <job name> · <M/D HH:MM>` and sends the job prompt
  with an optional agent/model and a "this is an unattended scheduled run" system preamble.
- **Slash commands in the Desktop command palette.** `/schedules` lists jobs and status,
  `/schedule` creates or updates a job from natural language.
- **Model tools.** `scheduler_create`, `scheduler_list`, `scheduler_get`, `scheduler_update`,
  `scheduler_delete`, `scheduler_run`, `scheduler_logs`, `scheduler_status`, so plain chat
  works: *"Schedule a job every weekday at 9am that summarizes my open PRs."*
- **Overlap + timeout guarantees.** One run per job at a time (shared lock file), optional
  `timeoutSeconds` (abort + status `timeout`, exit code `124`).
- **One-command install.** `setup` copies the plugin into `~/.config/opencode`, detects the
  Desktop build, installs the commands and prints a restart hint.

## Requirements

- OpenCode Desktop **1.14+** (tested with 1.17.11) or the OpenCode CLI/TUI 1.14+.
- Node.js 20+ only if you want to use the CLI (`setup`, `doctor`, legacy backend). The plugin
  itself runs inside OpenCode.
- No runtime npm dependencies.

## Install

```powershell
npx -y opencode-scheduler-win setup
```

If `0.2.0` is not on npm yet, install straight from the repository (same command, no publish
needed):

```powershell
npx -y github:wangyuchen5110/opencode-scheduler-win setup
```

That command:

1. copies the plugin into `~/.config/opencode/plugin/.opencode-scheduler/`,
2. writes the auto-loaded entry `~/.config/opencode/plugin/opencode-scheduler.js`,
3. installs `/schedules` and `/schedule` into `~/.config/opencode/command/`,
4. makes sure `~/.config/opencode/package.json` has `"type": "module"`,
5. detects `%LOCALAPPDATA%\Programs\@opencode-aidesktop` (or the platform equivalent) and
   prints its bundled core version.

Then **restart OpenCode Desktop**. Run `npx -y opencode-scheduler-win doctor` if the tools do
not show up.

Prefer the npm plugin mechanism? Once published you can instead add the package to
`opencode.json`:

```jsonc
{
  "plugin": ["opencode-scheduler-win"]
}
```

Uninstall: `npx -y opencode-scheduler-win teardown` (removes only the files `setup` wrote).

## Use it

Create a job in chat:

> Schedule a daily job at 9am to summarize yesterday's commits and open PRs.

Or use the command palette:

```
/schedule daily at 9am, summarize yesterday's commits and open PRs
```

List jobs:

> /schedules

Run one immediately (it opens a session right away):

> Run my daily-report job now.

Check the log, change the schedule, disable it:

> Show me the last 40 log lines for daily-report.
> Change daily-report to run at 10am on weekdays.
> Disable daily-report.

## Slash commands

| Command | What it does |
|---|---|
| `/schedules` | Lists this project's jobs plus scheduler status (read-only) |
| `/schedule <request>` | Creates or updates a job from the request using the scheduler tools |

## Tools

| Tool | Purpose |
|---|---|
| `scheduler_create` | Create a job: name, schedule (5-field cron), prompt, optional agent/model/timeout/workdir |
| `scheduler_list` | List jobs in this project (optionally all projects) with next/last run and session |
| `scheduler_get` | Details of one job |
| `scheduler_update` | Change name, schedule, prompt, agent, model, timeout or enabled |
| `scheduler_delete` | Delete a job (requires `confirm: "yes"`) |
| `scheduler_run` | Start a run now and return the new session id |
| `scheduler_logs` | Tail the job's log file |
| `scheduler_status` | Scheduler state, scope, plugin version, Desktop/CLI mode, next run |

All tools take plain strings; pass `""` for optional values you do not want to change.

## Job files

Jobs are ordinary JSON files, one per job, scoped by project directory:

```
~/.config/opencode/scheduler/scopes/<scopeId>/jobs/<slug>.json
```

```json
{
  "version": 1,
  "scopeId": "my-project-1a2b3c4d",
  "slug": "daily-report",
  "name": "Daily report",
  "schedule": "0 9 * * *",
  "prompt": "Summarize yesterday's commits and open PRs.",
  "agent": "",
  "model": "",
  "timeoutSeconds": 600,
  "enabled": true,
  "workdir": "C:\\work\\my-project",
  "createdAt": "2026-11-15T13:00:00+0800",
  "updatedAt": "2026-11-15T13:00:00+0800",
  "nextRunAt": "2026-11-16T09:00:00+0800",
  "lastRunAt": "2026-11-15T09:00:04+0800",
  "lastRunStatus": "success",
  "lastSessionId": "ses_abc123"
}
```

### Cron

Standard five fields: minute, hour, day of month, month, day of week (`0` or `7` = Sunday).
`*`, `5`, `1-5`, `*/15`, `0-30/10`, `1,15` are supported, in any field combination.

```
0 9 * * *        every day at 09:00
30 8 * * 1-5     weekdays at 08:30
*/30 * * * *     every 30 minutes
0 */6 * * *      every 6 hours on the hour
0 9 1 * *        first day of the month at 09:00
```

Times use the machine's local time zone.

## Settings

Optional `~/.config/opencode/scheduler.json` (read-only, all keys optional):

```json
{
  "enabled": true,
  "intervalMs": 20000,
  "catchUpWindowSeconds": 120,
  "titlePrefix": "⏰"
}
```

Environment variables:

| Variable | Effect |
|---|---|
| `OPENCODE_SCHEDULER_DISABLED=1` | Tools still work, the timer stays off |
| `OPENCODE_CLIENT` | Set by OpenCode itself (`desktop`, `cli`, ...); shown by `scheduler_status` |
| `OPENCODE_CONFIG_DIR` / `XDG_CONFIG_HOME` | Where the config (and scheduler data) lives |

## How it works

1. OpenCode loads the plugin with the rest of the server. It creates a scheduler engine for
   the open project directory and starts a 20-second timer (unref'd, so CLI runs still exit).
2. Every tick it reloads this project's job files. If `nextRunAt` has passed it computes the
   next occurrence *first* and persists it, so a crash cannot fire the same run twice.
3. Before starting it takes `scheduler/scopes/<scopeId>/locks/<slug>.json` with an exclusive
   create. A live holder means "already running" and the tick is skipped; a stale pid is
   taken over. The same lock is used by the legacy supervisor, so the two backends cannot
   overlap.
4. The run creates a session through the plugin's injected OpenCode client, writes the run
   status to the job file, and sends the prompt with the job's agent/model and the scheduled
   run preamble. It records duration/status/session id in `runs/<slug>.jsonl` and appends
   human-readable lines to the log.
5. If the app was closed at the scheduled minute, a run missed by more than the catch-up
   window (120 s by default) is skipped and only logged — the next occurrence is scheduled
   normally. Desktop jobs are not backfilled hours later.

Output of a scheduled run is the session itself, not a log line. Logs still exist for
debugging: `~/.config/opencode/logs/scheduler/<scopeId>/<slug>.log`.

## Limitations

- Jobs run **while OpenCode is running**, and while their project directory has a live
  OpenCode instance. Closing the app stops in-app scheduling.
- A run that needs a permission approval waits like any other session. Use an agent with the
  permissions the job needs, or keep jobs read-only.
- No retroactive catch-up beyond the catch-up window.

## Legacy backend: run while OpenCode is closed (Windows)

The original supervisor is still included for jobs that carry an `invocation` (a command and
arguments, usually `opencode run ...`):

```powershell
opencode-scheduler-win run      <job.json>   # what Task Scheduler calls; supervised run
opencode-scheduler-win install  <job.json>   # register \OpenCode\opencode-job-<scope>-<slug>
opencode-scheduler-win uninstall <job.json>  # remove those tasks
```

`install` maps the cron onto Task Scheduler (month + weekday combinations are rejected, and
two clock times become two tasks). Runs skip when the previous one is still alive, enforce
`timeoutSeconds`, force `OPENCODE_PERMISSION.question=deny`, resolve bare commands with
`where.exe` and prepend the usual Node/npm/Scoop paths to `PATH`. See
[docs/DESIGN.md](docs/DESIGN.md) and [SECURITY.md](SECURITY.md).

## Develop

```powershell
cd opencode-scheduler-win
npm test          # node --test on every unit/integration suite
npm run e2e       # real `opencode serve` smoke test in isolated XDG dirs
node bin/opencode-scheduler-win.mjs setup --dry-run
```

Architecture and interface contracts: [docs/DESIGN.md](docs/DESIGN.md). Verified OpenCode
runtime behavior: [docs/PROBE.md](docs/PROBE.md). What the end-to-end smoke test covers and how
to run it: [docs/E2E.md](docs/E2E.md).

## License

MIT
