# opencode-routines

[![npm](https://img.shields.io/npm/v/opencode-routines)](https://www.npmjs.com/package/opencode-routines)
[![npm downloads](https://img.shields.io/npm/dm/opencode-routines)](https://www.npmjs.com/package/opencode-routines)
[![license](https://img.shields.io/npm/l/opencode-routines)](https://github.com/EmilioEsposito/opencode-routines/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-source-black?logo=github)](https://github.com/EmilioEsposito/opencode-routines)

Claude-Code-style routines for [OpenCode](https://opencode.ai): same-session loops, same-session cron prompts, and host-backed standalone scheduled agents.

Use it for things like:

```text
/loop 5m /babysit-prs
```

```text
Create a standalone scheduled run every weekday at 9am to summarize my open PRs
```

```text
Create a same-session cron prompt for 17 * * * * to check whether CI is done
```

## Install

Add the server plugin to your OpenCode config (`~/.config/opencode/opencode.jsonc` or project-level `.opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-routines@latest"]
}
```

OpenCode installs the package from npm on next start. Use `@latest` if you want new versions on restart, or pin a version such as `"opencode-routines@0.1.9"`.

That single entry is the whole packaged experience: on load, the server plugin also installs slash commands (`/loop`, `/loops`, `/stop-loop`, `/schedule-standalone-session`) as managed OpenCode custom command files under `~/.config/opencode/commands/`, plus a discoverable `standalone-scheduled-sessions` skill under `~/.config/opencode/skill/` for investigating recurring scheduled runs. These work in **both** the terminal TUI and OpenCode Desktop. The install is idempotent and marker-guarded: only files containing the `managed-by: opencode-routines` marker are ever created or updated, so user-owned command/skill files with the marker removed are never touched. Restart OpenCode once after the first install for commands and skills to appear. Opt out with plugin options:

```jsonc
{
  "plugin": [["opencode-routines@latest", { "commands": false, "skills": false }]]
}
```

## What it provides

| Capability | Session model | Where it runs | Persistence | Primary tools / commands |
|---|---|---|---|---|
| **Loop** | Same conversation | Current OpenCode host/process | Process-scoped | `LoopCreate`, `LoopList`, `LoopDelete`, `ScheduleWakeup`, `/loop` |
| **Cron prompt** | Same conversation | Current OpenCode host/process | Session-only for now | `CronCreate`, `CronList`, `CronDelete` |
| **Standalone schedule** | Fresh standalone `opencode run` | Host scheduler: launchd, systemd, Task Scheduler, or cron | Durable | `ScheduleCreate`, `ScheduleList`, `ScheduleDelete`, `ScheduleRun`, `ScheduleLogs` |

The ambiguous `/schedule` slash command is intentionally **not** registered. Use `ScheduleCreate` for durable standalone schedules, or `/schedule-standalone-session` for TUI help.

## Discoverable skills

The plugin includes built-in skills that can be copied into a repo with `install_skill` and, for globally useful troubleshooting, installed automatically into the user's OpenCode config.

| Skill | Purpose | Install behavior |
|---|---|---|
| `standalone-scheduled-sessions` | Investigate recurring OpenCode sessions, list durable standalone schedules across all scopes, inspect logs, and safely delete jobs. | Auto-installed globally under `~/.config/opencode/skill/standalone-scheduled-sessions/SKILL.md`. |
| `scheduled-job-best-practices` | Prompt patterns for resilient non-interactive scheduled jobs. | Available via `get_skill` / `install_skill`. |

Use the `standalone-scheduled-sessions` skill when you see unexpected sessions from `opencode session list` or need to inventory `ScheduleCreate` / `schedule_job` jobs across folders.

## Same-session loops

Loops run prompts back into the current conversation.

### Fixed interval loop

```text
/loop 5m /babysit-prs
```

Equivalent tool shape:

```json
{
  "prompt": "/babysit-prs",
  "interval": "5m"
}
```

### Dynamic loop

Dynamic loops are self-paced. The first prompt fires immediately, then the model can call `ScheduleWakeup` to decide when to resume.

```text
/loop /babysit-prs
```

`ScheduleWakeup` parameters:

| Param | Type | Required | Description |
|---|---|---|---|
| `delaySeconds` | number | yes | Seconds until wake-up. Clamped to 60-3600. |
| `prompt` | string | yes | The active loop prompt to fire on wake-up. |
| `reason` | string | yes | Short explanation for the wake-up. |

Omitting `ScheduleWakeup` ends a dynamic loop.

## Same-session cron prompts

Cron prompts enqueue prompts into the current session at wall-clock times. They are not standalone processes and do not run while OpenCode is closed.

Tools:

| Tool | Description |
|---|---|
| `CronCreate` | Schedule a prompt at wall-clock times in the current session. |
| `CronList` | List active same-session cron prompts. |
| `CronDelete` | Cancel a same-session cron prompt. |

`CronCreate` parameters:

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `cron` | string | yes | — | 5-field cron in local timezone: `M H DoM Mon DoW`. |
| `prompt` | string | yes | — | Prompt to enqueue in the same session. |
| `recurring` | boolean | no | `true` | `false` makes a one-shot cron prompt. |
| `durable` | boolean | no | `false` | Accepted for Claude compatibility, but currently session-only. |

## Durable standalone schedules

Standalone schedules are independent `opencode run` processes launched by the host scheduler. They survive terminal exit and machine restarts according to the host scheduler's behavior.

Claude-aligned tools:

| Tool | Description |
|---|---|
| `ScheduleCreate` | Create a durable host-backed standalone scheduled OpenCode run. |
| `ScheduleList` | List standalone schedules. |
| `ScheduleDelete` | Delete a standalone schedule. |
| `ScheduleRun` | Run a standalone schedule immediately. |
| `ScheduleLogs` | View logs for a standalone schedule. |

Legacy compatibility tools from `opencode-scheduler` are still present: `schedule_job`, `list_jobs`, `get_job`, `update_job`, `delete_job`, `run_job`, `job_logs`, and `cleanup_global`.

## TUI slash commands

Available after the managed command files have been installed (see Install above):

| Command | Meaning |
|---|---|
| `/loop` | Start a same-session live loop. Fixed interval syntax: `5m /babysit-prs`; dynamic syntax: `/babysit-prs`. |
| `/loops` | List active loops. Selecting a loop stops it. |
| `/stop-loop` | Stop an active loop. |
| `/schedule-standalone-session` | Help entry for durable standalone schedules. |

## Storage and platform support

Standalone schedule storage remains compatible with `opencode-scheduler`:

| What | Where |
|---|---|
| Job configs | `~/.config/opencode/scheduler/scopes/<scopeId>/jobs/*.json` |
| Run records | `~/.config/opencode/scheduler/scopes/<scopeId>/runs/*.jsonl` |
| Locks | `~/.config/opencode/scheduler/scopes/<scopeId>/locks/*.json` |
| Logs | `~/.config/opencode/logs/scheduler/<scopeId>/*.log` |
| Supervisor script | `~/.config/opencode/scheduler/supervisor.pl` |

Standalone schedule backends:

| Platform | Backend |
|---|---|
| macOS | `launchd` |
| Linux with systemd | `systemd --user` |
| Linux / POSIX fallback | `cron` |
| Windows | Task Scheduler (`schtasks`) |

## Compatibility notes

- Requires OpenCode `1.17.3` or newer.
- OpenCode loads config once at startup. Restart OpenCode after changing plugin configuration.
- `CronCreate({ durable: true })` is accepted for Claude Code compatibility but currently behaves as session-only.

## Debugging

- Use `LoopList` and `CronList` for live same-session state.
- Use `ScheduleList` and `ScheduleLogs` for durable standalone schedules.
- Standalone run logs live under `~/.config/opencode/logs/scheduler/<scopeId>/`.

## Development

```bash
npm install
npm test
npm run typecheck
```

For local development, point OpenCode at this repo's built files or source path. Do not load both a local shim and the npm package at the same time, or tools may register twice.

## Publishing

This package publishes through GitHub Actions trusted publishing from
`.github/workflows/publish.yml`.

For maintainer release steps and verification, use:

- `.claude/skills/publish-package/SKILL.md`

## Credits

`opencode-routines` is a hard fork / successor of [`opencode-scheduler`](https://github.com/different-ai/opencode-scheduler) by Benjamin Shafii. The host-backed standalone scheduling implementation is derived from that project; this fork adds the routines-oriented model, same-session loops, cron prompts, and Claude-aligned tool names.

## License

[MIT](LICENSE)
