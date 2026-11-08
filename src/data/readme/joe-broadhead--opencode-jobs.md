# Jobs for OpenCode

Run prompts, slash commands and reminders on cron, interval and one-off schedules, inside OpenCode, with run history
and unattended permissions.

Unofficial; not affiliated with OpenCode or Anomaly.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4 and 2.2.5. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- **Jobs run while OpenCode is running.** Nothing runs while the OpenCode service is stopped, and nothing runs after a
  reboot until a client opens a project again.

## Install

```sh
opencode plugin add @joe-broadhead/opencode-jobs
```

Run `opencode reload`, or restart OpenCode, then run `/jobs-status`.

`opencode plugin add opencode-jobs` (unscoped) installs a different, unrelated systemd plugin.

**Update** with `opencode plugin update @joe-broadhead/opencode-jobs`, then run `opencode reload`.

## Use

| Command | What it does |
| --- | --- |
| `/jobs-status` | Posts the report: the runner, the jobs, the next five runs, the last ten runs, failures, the agents that need the block, and the next step. |
| `/jobs-pause` | Pauses every job at once, or resumes them: nothing new starts and a run in flight is interrupted. |
| `/jobs-run <id>` | Runs a job now, without waiting for its next slot. |
| `/jobs`, or "Jobs: Status" in the command palette | Opens the same report in a dialog. `r` refreshes and `Esc` closes it; the palette command "Jobs: Pause or resume every job" stops or restarts every job, and asks first. |

The model has twelve `jobs_*` tools: `jobs_status`, `jobs_list`, `jobs_get` and `jobs_history` read, `jobs_pause` and
`jobs_pause_all` pause, and `jobs_create`, `jobs_update`, `jobs_delete`, `jobs_run_now`, `jobs_resume` and
`jobs_extend` change a job. Pausing every job runs without asking, because it only stops work; every other change asks
for approval, and the prompt is the yes. `jobs_history` is the only surface that returns what a run said. A failed run
is retried for its slot by `policy.retries`, and `notify` posts a run's outcome into a session as job output.

A job is one of three things:

- a **prompt** the job's agent runs in a fresh session;
- a **command**, such as `/morning`, run in that session;
- a **reminder**, posted into a session you name with no model turn.

A job that belongs to a project is a Markdown file in `.opencode/jobs/`, so it is reviewed and committed like any other
file:

```markdown
---
name: Morning brief
cron: "0 7 * * 1-5"
tz: Europe/London
agent: jobs
---
Summarise yesterday's work and today's calendar in five lines.
```

The body is the prompt. [Configuration](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/configuration.md)
covers every field, and [the morning example](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/examples/morning.md)
is a full file to copy.

## Permissions

This plugin ships no agent profile of its own and inserts no grant into any agent. It inserts one block of *rules that
ask*: after each agent's base rule, `jobs_*` asks, and the four reads and the two pauses are allowed. Everything a job
may actually do comes from the agent the job names.

The read-only profile to start from, pasted into `opencode.json`:

```json
{
  "agents": {
    "jobs": {
      "permissions": [
        { "action": "*", "resource": "*", "effect": "deny" },
        { "action": "read", "resource": "*", "effect": "allow" },
        { "action": "glob", "resource": "*", "effect": "allow" },
        { "action": "grep", "resource": "*", "effect": "allow" },
        { "action": "list", "resource": "*", "effect": "allow" },
        { "action": "jobs_status", "resource": "*", "effect": "allow" },
        { "action": "jobs_list", "resource": "*", "effect": "allow" },
        { "action": "jobs_get", "resource": "*", "effect": "allow" },
        { "action": "jobs_history", "resource": "*", "effect": "allow" },
        { "action": "jobs_pause", "resource": "*", "effect": "allow" }
      ]
    }
  }
}
```

The first rule denies everything, because an agent's own rules are applied after OpenCode's base rule that allows
everything, and the later rule wins. The rules after it are the profile: reading, searching and the plugin's own reads,
and nothing that writes. Add a rule only when a job needs it, and add it to that agent alone.

| What | Default rule |
| --- | --- |
| `jobs_status`, `jobs_list`, `jobs_get`, `jobs_history` | allowed |
| `jobs_pause`, `jobs_pause_all` | allowed: pausing only stops work |
| `jobs_create`, `jobs_update`, `jobs_delete`, `jobs_run_now`, `jobs_resume`, `jobs_extend` | **ask**, and the prompt is the yes |
| anything a job's own run does | the agent's rules; a run never asks |

A job whose agent does not deny by default is refused with `JOBS_AGENT_UNGUARDED`, and `/jobs-status` prints the block
to paste for that agent. A job whose agent the host no longer lists — which a plugin update can cause — is refused with
`JOBS_AGENT_MISSING`; `/jobs-status` names it and says how to bring it back.

A run never asks. If a tool the agent asks about is called inside a job's session, the plugin denies it with
`JOBS_UNATTENDED` and the run carries on, so a job can never sit waiting for an approval nobody is there to give. The plugin has **two** `evaluate` hooks: this one, on a session it created for a run, and the tools RPC's, on one of its own script calls in flight. Neither ever turns a deny into anything, and neither touches a session it did not create.

A job may only narrow its agent's rules: its `allow` list holds deny rules, never a grant. A job that asks for one is
refused with `JOBS_ALLOW_WIDENS`.

[Configuration](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/configuration.md#permissions) explains
each rule and the recipes that add one action for one agent.

## Configure

Set options with the object form of the plugin entry. Every option is optional.

```json
{
  "plugins": [
    {
      "package": "@joe-broadhead/opencode-jobs",
      "options": { "enabled": true, "concurrency": 2, "keepAliveMinutes": 20 }
    }
  ]
}
```

`enabled` turns the runner off without unloading the plugin. `concurrency` bounds how many runs are in flight at once.
`keepAliveMinutes` is how often the plugin touches its location to keep jobs running: it must stay below your
`experimental.location_idle_timeout`, so it takes 1 to 59, and 20 minutes is below the default of 60.
[docs/configuration.md](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/configuration.md) lists every
option, the job file format and every error.

## Organisation rollout

Put the plugin entry in the system config: `/Library/Application Support/opencode/opencode.json` on macOS, or
`/etc/opencode/opencode.json` on Linux.

```json
{
  "plugins": [{ "package": "@joe-broadhead/opencode-jobs", "options": { "concurrency": 2 } }],
  "experimental": { "location_idle_timeout": "60 minutes" }
}
```

Add the read-only agent block from [Permissions](#permissions) to the same config, so every member has it before their
first job. A user's own top-level `permissions` still apply, and a `deny` there always wins.

## Troubleshooting

Run `/jobs-status` first. Its last line is the next step.

| Status or error | What to do |
| --- | --- |
| Jobs: none yet | Nothing is scheduled. |
| The status says the plugin is disabled | The option `enabled` is `false`. Set it to `true`, or remove it, then restart OpenCode. |
| The status says every job is paused | `/jobs-pause` or `jobs_pause_all` was used. Run `/jobs-pause` again; the slots that fell due meanwhile run once, as a late run, or are recorded as missed. |
| The Runner row says it stopped | The location was unloaded, or the service restarted. Open a project to load it again: the missed slot runs once within the catch-up window. Set `experimental.location_idle_timeout` above `keepAliveMinutes` if it keeps happening. |
| Agents without default rules | A job's agent does not deny by default. Paste the block `/jobs-status` prints for that agent. |
| Agents OpenCode no longer lists | A plugin update can leave OpenCode's running plugin with a stale agent list, so jobs that name a configuration agent do not run. Run `opencode reload` in a terminal, or restart OpenCode; jobs resume on their own. |
| `JOBS_AGENT_UNGUARDED` | The job's agent does not deny by default, so the job is refused rather than run into prompts. Paste the block `/jobs-status` prints. |
| `JOBS_AGENT_MISSING` | OpenCode no longer lists the job's agent here, which can happen after a plugin update. Run `opencode reload` in a terminal, or restart OpenCode; the next slot runs once it is back. |
| `JOBS_UNATTENDED` | A run tried a tool its agent asks about. Nothing waits: the call was denied. A read the job needs goes in its agent's own `permissions`; a write belongs with a person, not a run. |
| `JOBS_ALLOW_WIDENS` | A job's `allow` list holds an `allow` entry. Move the grant to the job agent's own `permissions`. |
| `JOBS_INVALID_SCHEDULE` | The schedule names two kinds or none, or the cron expression, interval or zone is wrong. The message names the field. |
| `JOBS_INVALID_JOB` | A field other than the schedule is missing or wrong, or the job is defined by a file and a tool tried to change it. |
| `JOBS_INVALID_FILE` | A job file cannot be read or parsed. The message names the file and the line. |
| `JOBS_TARGET_MISSING` | No job, session or agent with that id. Run `jobs_list` to see the jobs there are. |
| `JOBS_DISABLED` | The job is paused. Resume it with the `jobs_resume` tool, or resume every job with `/jobs-pause`. |
| `JOBS_EXPIRED` | The job has no slot left. Extend it with `jobs_extend`, or create a new one. |
| `JOBS_TIMEOUT` | A run took longer than its timeout and was interrupted. It counts toward the pause after five failures. |
| `JOBS_AGENTS_UNKNOWN` | OpenCode could not list its agents, so nothing ran. Restart OpenCode, then run `/jobs-status`. |
| `JOBS_STORAGE_VERSION` | The job store was written by a newer version of the plugin. Update the plugin, or clear its storage. |
| `JOBS_UNCHECKED` | A tool that changes something was called with no tool call behind it. Call it from a session, never from a script. |
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4 or 2.2.5. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. |
| `/jobs` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |

## What this is not

- **Not a shell or cron replacement.** Core is adding shell schedules; when they land, use those for a shell command. A
  job runs an agent under that agent's permissions.
- **Not an OS scheduler.** Nothing runs while OpenCode is closed.
- **Not a workflow engine.** A job may start a durable, multi-step `wfl` workflow; it does not implement one.
- **Not a timer.** Utilities' project timers are polled with `utilities_timer_check`; a job happens by itself.

## Uninstall

1. Pause first if a job is mid-run: `/jobs-pause`.
2. Remove the plugin: `opencode plugin remove @joe-broadhead/opencode-jobs`, then `opencode reload`.
3. Remove the agent block you copied into `opencode.json`, or the job agent's Markdown file.

The plugin's storage stays in OpenCode's own database; removing the plugin does not delete it.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/scripting.md)
- [Jelly](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/jelly.md)
- [Contributing](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/LICENSE)
