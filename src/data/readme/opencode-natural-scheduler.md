# opencode-natural-scheduler

Natural-language scheduled tasks for [OpenCode](https://opencode.ai). Ask for a recurring or one-off task in plain language, and the plugin schedules it, then injects the task back into the session that created it.

```
You: every 20 minutes, check the invoice service error log and summarize anomalies
Agent: (calls schedule_create) Scheduled task created: task-... next run 2026-11-01 12:30
```

## Why another scheduler?

| | opencode-natural-scheduler | opencode-scheduler | opencode-cron |
|---|---|---|---|
| Create tasks by asking | Yes | Cron config | Cron config |
| Runs while OpenCode is closed | No | Yes (launchd/systemd) | No |
| Cross-platform | Yes | macOS/Linux | Yes |
| Injects into the originating session | Yes | Job-defined | Yes |
| OS daemon/timer setup | None | Required | None |

This plugin is intentionally in-process: no launchd, systemd, or Windows service. It is the simplest option when you want conversational scheduling inside a running OpenCode instance.

## Install

Add the package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-natural-scheduler"]
}
```

Or run:

```bash
opencode plugin opencode-natural-scheduler
```

Restart OpenCode after installing. The plugin starts a scheduler for each OpenCode process and elects a single leader, so multiple open windows do not fire the same task twice.

## Usage

Just describe the task and the schedule:

- `Every 20 minutes, check the invoice module error log and report anomalies.`
- `Every day at 09:00, summarize yesterday's failed jobs.`
- `Remind me in 30 minutes to review the deploy.`
- `Run this at 18:00 on weekdays: collect the daily metrics.`

The agent calls `schedule_create` with a self-contained instruction, then confirms the task id and next run time.

Management is conversational too:

- `List my scheduled tasks.`
- `Pause task-abc123.`
- `Change task-abc123 to every hour.`
- `Run task-abc123 now.`
- `Delete task-abc123.`

## Schedule types

| Type | Tool argument | Example |
|---|---|---|
| Interval | `every_minutes` | `every_minutes: 20` |
| Daily | `daily_at` | `daily_at: "09:30"` |
| Cron | `cron` | `cron: "0 9 * * 1-5"` |
| One-off | `once_at` or `once_in_minutes` | `once_in_minutes: 30` |

Cron uses five fields (`minute hour day month weekday`) in the machine's local timezone. When both day-of-month and weekday are restricted, either match counts, as in standard cron.

## Tools

The plugin registers five tools:

- `schedule_create`
- `schedule_list`
- `schedule_update`
- `schedule_delete`
- `schedule_run_now`

Tools default to the current session. Pass `session_id` to target another session, or `all: true` to list every session's tasks.

## Behavior details

- A task is bound to the session where it was created. When it fires, the plugin calls `session.promptAsync` on that session with a message starting with `[Scheduled task]`.
- If the target session is busy, the run is deferred by one minute.
- If the target session no longer exists, the task is disabled and the last error is recorded.
- One-off tasks are disabled after they fire.
- Task state, run counters, and the last error persist across restarts.
- Tasks only fire while at least one OpenCode process is running.

## Storage

Default location:

```
~/.local/share/opencode/scheduled-tasks/tasks.json
```

On Windows:

```
C:\Users\<you>\.local\share\opencode\scheduled-tasks\tasks.json
```

`leader.json` in the same directory is a short-lived lease used to avoid duplicate firing across OpenCode instances.

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `OPENCODE_SCHEDULER_DIR` | `~/.local/share/opencode/scheduled-tasks` | Store directory |
| `OPENCODE_SCHEDULER_LOCALE` | System locale | `zh` or `en`; controls tool messages and injected instructions |
| `OPENCODE_SCHEDULER_TICK_MS` | `15000` | Scheduler tick interval in milliseconds |

## Security

A scheduled task runs the instruction you asked for, with the permissions of the session that created it. Only create tasks whose instructions you trust, and review the task text when it is created.

## Development

Requires Node.js 20 or newer.

```bash
npm install
npm test
npm run check
```

The test suite uses a temporary store directory and a fast scheduler tick. It covers cron/daily parsing, task creation and management, manual runs, and the scheduler firing path.

## License

MIT
