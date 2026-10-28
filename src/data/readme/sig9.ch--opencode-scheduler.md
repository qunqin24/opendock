# @sig9.ch/opencode-scheduler

Run OpenCode agents on a schedule. Describe a recurring task once; it executes autonomously, even when you are away.

> **This is a fork** of [`different-ai/opencode-scheduler`](https://github.com/different-ai/opencode-scheduler) (v1.3.0). It is ported to the OpenCode v2 plugin API and focused on Linux. Changes from the original:
>
> - **OpenCode v2 plugin API**: `Plugin.define` + tool transforms instead of the v1 plugin function; job scopes come from the plugin's location directory instead of the server's `process.cwd()`.
> - **Rewritten supervisor** in dependency-free Node (was perl): used for manual runs too, with no-overlap locking, SIGTERM->SIGKILL timeout escalation, job metadata, and append-only run history for every run. The log tail can no longer be truncated by a race between the child's output pipe and the supervisor's exit.
> - **Fixed systemd timer generation**: the 1.x generator emitted an invalid leading `*` weekday in `OnCalendar` specs, which systemd rejected; units now order after `network-online.target`, keep `Persistent=true` catch-up, and carry a `TimeoutStartSec` backstop.
> - **v2 run flags**: scheduled runs use `--auto` for non-interactive permission handling (v1's `OPENCODE_PERMISSION` env hack no longer exists); dead v1 invocation snapshots and v1-only flags are migrated in place on first load.
> - **Native skill**: `scheduled-job-best-practices` is registered through the skill registry instead of being copied into repos by `get_skill`/`install_skill` tools (both removed, along with `get_version`).
> - **Linux only** (systemd `--user`, cron fallback): the launchd and Windows Task Scheduler backends were dropped.
> - **Simpler surface**: 8 tools, JSON-Schema inputs with real arrays for `files`, no shell string interpolation anywhere.

```
Schedule a daily job at 9am to search Facebook Marketplace for posters under $100 and send the top 5 deals to my Telegram
```

This is an [OpenCode](https://opencode.ai) **v2** plugin (a fork of `different-ai/opencode-scheduler`, ported to the v2 plugin API and Linux-only). It schedules `opencode run` prompts with your OS scheduler: systemd `--user` timers, with cron as a fallback.

## Install

```sh
opencode plugin add @sig9.ch/opencode-scheduler
```

Or add it to your `opencode.json(c)` manually:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@sig9.ch/opencode-scheduler"]
}
```

Or load a local checkout by path:

```jsonc
{
  "plugins": ["/path/to/opencode-scheduler"]
}
```

Linux only. Requires a systemd user session (normal on desktop Linux); falls back to `crontab` when systemd `--user` is unavailable. A `node` (or `bun`) binary is used for run supervision; without one, jobs still run but unsupervised (no overlap protection, metadata, or timeout).

## How it works

1. You describe what you want scheduled; the plugin writes a job file (JSON) scoped to your working directory.
2. It installs a systemd user timer (or cron entry) that runs a small supervisor script at each tick.
3. The supervisor runs `opencode run` in the job's working directory, appends output to the job log, updates job metadata, and records run history.
4. Jobs pick up the `opencode.json`, MCP servers, and skills configured in their working directory.

Manual triggers (`run_job`) go through the same supervisor, so scheduled and manual runs behave identically.

### Reliability guarantees

- **No overlap**: a live run holds a lock; the next tick is skipped and logged instead of piling on. systemd additionally never starts a oneshot service twice.
- **Catch-up**: timers are `Persistent=true`; a tick missed while the machine was off runs at the next opportunity. (The cron fallback does not replay missed runs.)
- **Network-aware**: services order after `network-online.target`.
- **Optional timeout**: `timeoutSeconds` SIGTERMs the run's whole process group, then SIGKILLs after a grace period; systemd holds a `TimeoutStartSec` backstop.
- **Non-interactive**: scheduled runs pass `--auto`, which auto-approves any permission not explicitly denied. Deny rules in your config always stay enforced. Jobs never block on a prompt.
- **Clean environment**: `OPENCODE_*` variables from your interactive session are not inherited by scheduled runs.

## Tools

| Tool | Description |
|------|-------------|
| `schedule_job` | Create a job (name, cron schedule, prompt, options) |
| `list_jobs` | List jobs in this workspace (`allScopes` for everywhere) |
| `get_job` | Job details and last-run status |
| `update_job` | Update schedule/prompt/options; empty string clears an optional field |
| `delete_job` | Remove a job's scheduler units and definition (logs are kept) |
| `run_job` | Trigger a job now (fire-and-forget) |
| `job_logs` | Tail a job's log |
| `cleanup_global` | Remove all scheduler artifacts everywhere (dry-run by default, `confirm: true` to execute) |

## Run options

`schedule_job` / `update_job` map directly onto `opencode run` flags:

| Field | Flag | Notes |
|-------|------|-------|
| `prompt` | (positional) | Required. Tip: start it with `@scheduled-job-best-practices` |
| `model` | `--model` | `provider/model[#variant]` |
| `agent` | `--agent` | |
| `title` | `--title` | |
| `format` | `--format` | `default` or `json` |
| `files` | `--file` | One flag per entry |
| `session` / `continue` | `--session` / `--continue` | Resume a session |
| `autoApprove` | `--auto` | Default `true`; set `false` only if something answers prompts |
| `serverUrl` | `--server` | Run against a remote OpenCode server |
| `timeoutSeconds` | | Supervisor hard limit; `0` disables |
| `workdir` | | Defaults to the workspace the job was created in |

Jobs are scoped by `workdir`: storage, logs, and unit names are isolated per project, so same-named jobs in different projects never collide.

## Cron syntax

Standard 5-field expressions, with `*`, lists, ranges, and steps:

| Expression | Meaning |
|------------|---------|
| `0 9 * * *` | Daily at 9:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `30 8 * * 1` | Mondays at 8:30 AM |
| `*/15 9-17 * * *` | Every 15 minutes between 9:00 and 17:59 |

## Storage

| What | Where |
|------|-------|
| Job definitions (per scope) | `~/.config/opencode/scheduler/scopes/<scopeId>/jobs/*.json` |
| Run history (per scope) | `~/.config/opencode/scheduler/scopes/<scopeId>/runs/*.jsonl` |
| Locks (per scope) | `~/.config/opencode/scheduler/scopes/<scopeId>/locks/*.json` |
| Logs (per scope) | `~/.config/opencode/logs/scheduler/<scopeId>/*.log` |
| Supervisor script | `~/.config/opencode/scheduler/supervisor.js` |
| Skill file | `~/.config/opencode/scheduler/skills/scheduled-job-best-practices/SKILL.md` |
| systemd units | `~/.config/systemd/user/opencode-job-<scopeId>-<slug>.{service,timer}` |

### Plugin configuration

`~/.config/opencode/opencode-scheduler.json` can set environment variables for scheduled runs (applied after the `OPENCODE_*` scrub, so it is also how you pass `OPENCODE_*` vars to jobs):

```json
{
  "env": {
    "set": { "OPENCODE_API_KEY": "sk-..." }
  }
}
```

## Built-in skill

The plugin registers the `scheduled-job-best-practices` skill natively, so `@scheduled-job-best-practices` works at the top of any job prompt (including inside scheduled runs). It covers idempotency, runtime date computation, preflight checks, and a status output contract.

## Migrating from the 1.x plugin

On first load the plugin migrates existing jobs in place:

- Invocations snapshotted with v1-only flags (`--dangerously-skip-permissions`, `--attach`, `--port`, `--share`, `--variant`, `--command`) are rebuilt from the job's prompt; `--dangerously-skip-permissions` is mapped to `--auto`.
- Scheduler units are reinstalled to use the Node supervisor instead of the retired `supervisor.pl`.
- Unit names, scopes, logs, and history are unchanged.

Because timers are `Persistent=true`, reinstalling a job whose schedule was missed fires one catch-up run right after migration. Subsequent reloads change nothing and trigger nothing.

The old `supervisor.pl` is left in place and is simply no longer referenced; you can delete it.

## Troubleshooting

- **Job not running**: `systemctl --user list-timers | grep opencode`, then `journalctl --user` and the job's log (`job_logs` tool).
- **`opencode` not found in scheduled runs**: the plugin records an absolute path at schedule time; if you moved your OpenCode install, re-save the job (`update_job`) or set `OPENCODE_SCHEDULER_OPENCODE_PATH`.
- **Supervisor runtime**: resolved when the job is installed; override with `OPENCODE_SCHEDULER_NODE_PATH`.

## Releasing

Publishing happens from CI with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no npm token) and [staged publishing](https://docs.npmjs.com/staged-publishing): every release requires a maintainer's 2FA approval before it goes live.

1. Bump `version` in `package.json` and commit to `master`.
2. Tag it with the matching version: `git tag v2.0.1 && git push origin master --tags`.
3. The `Publish` workflow typechecks, verifies the tag matches `package.json`, and stages the package.
4. Approve the staged version with 2FA: npmjs.com -> Staged Packages -> Approve (or `npm stage approve <stage-id>`). Only then does the version become publicly installable.

Provenance attestations are generated automatically for these publishes.

## License

MIT
