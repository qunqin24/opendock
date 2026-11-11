# Jobs for OpenCode

Run prompts, slash commands and reminders on cron, interval and one-off schedules, inside OpenCode, with run history
and unattended permissions.

Unofficial; not affiliated with OpenCode or Anomaly.

## Requirements

- OpenCode `>=2.2.3 <2.3.0`, tested on 2.2.3, 2.2.4, 2.2.5 and 2.2.6. Outside that range the plugin does not start, unless
  you set `allowUntestedHost`.
- macOS or Linux.
- **Jobs run while OpenCode is running.** Nothing runs while the OpenCode service is stopped, and nothing runs after a
  reboot until a client opens a project again.

## Install

```sh
opencode plugin add github:joe-broadhead/opencode-jobs#v0.0.0
```

Run `opencode reload`, or restart OpenCode, then run `/jobs-status`.

`opencode plugin add opencode-jobs` (unscoped) installs a different, unrelated systemd plugin.

Each release has its own tag, and a Git install does not update by itself. To move to a newer release, remove the old entry with `opencode plugin remove github:joe-broadhead/opencode-jobs#v0.0.0`, then add the new tag with `opencode plugin add github:joe-broadhead/opencode-jobs#v<version>`.

The install takes the GitHub release tag. Its commit carries the built `dist/`, so the install runs no build.
A new release is a new tag: install it with its own `#v<version>` spec.

## Use

| Command | What it does |
| --- | --- |
| `/jobs-status` | Posts the report: the runner, the jobs, the next five runs, the last ten runs, failures, the agents that need the block, and the next step. |
| `/jobs-pause` | Pauses every job at once, or resumes them: nothing new starts and a run in flight is interrupted. |
| `/jobs-run <id>` | Runs a job now, without waiting for its next slot. |
| `/jobs-approve <id>` | Approves a script job again after its source, its manifest or a tool's class changed. |
| `/jobs`, or "Jobs: Status" in the command palette | Opens the same report in a dialog. `r` refreshes and `Esc` closes it; the palette command "Jobs: Pause or resume every job" stops or restarts every job, and asks first. |

The model has fourteen `jobs_*` tools: `jobs_status`, `jobs_list`, `jobs_get` and `jobs_history` read, `jobs_pause` and
`jobs_pause_all` pause, `jobs_create`, `jobs_update`, `jobs_delete`, `jobs_run_now`, `jobs_resume`, `jobs_extend`,
`jobs_approve` and `jobs_run_script` change a job or run a script. The default `access: "all"` allows every tool;
`ask-changes` asks for changes except pauses, and `read-only` denies changes. `jobs_history` returns run summaries and
script results; `jobs_get` also returns a script run's capped result. A failed run is retried for its slot by `policy.retries`, and `notify` posts a run's
outcome into a session as job output.

A job is one of four things:

- a **prompt** the job's agent runs in a fresh session;
- a **command**, such as `/morning`, run in that session;
- a **reminder**, posted into a session you name with no model turn;
- a **script**, a confined program that calls named plugin tools and no model. Its approval covers its source, tools and
  declared files and is re-checked every slot; changes can require `/jobs-approve`.

A script is the no-model path: `uses` names the tools it can reach, it cannot ask, and the record keeps only what each call did.
A job may also declare files it reads and writes, so a script can keep state between runs:

```yaml
name: Keep last week's bookmarks
schedule: { cron: "0 8 * * *", tz: Europe/Amsterdam }
agent: build
action:
  type: script
  script:
    uses:
      - x.posts.get_users_me
      - x.posts.get_users_bookmarks
    files:
      bookmarks:
        path: bookmarks.json
        mode: readwrite
        format: json
    code: |
      const me = await tools.x.posts.get_users_me({});
      const state = files.bookmarks ?? { items: [] };
      const known = new Set((state.items ?? []).map((item) => item.id));
      const page = await tools.x.posts.get_users_bookmarks({ id: me.data?.id, max_results: 100 });
      const fresh = (page.data ?? []).filter((item) => !known.has(item.id));
      await files.write("bookmarks", { items: [...fresh, ...(state.items ?? [])] });
      return { added: fresh.length };
```

The manifest is read as `<plugin id>.<method>`, split at the last dot, so `utilities.tools.time_now` is
`tools.utilities.tools.time_now`. A `readwrite` file is snapshotted before the run and written after it, atomically and
only on success. A file outside the project needs both a `scriptFilesRoots` entry and an `external_directory` allow in
the agent's permissions, for example
`{ "action": "external_directory", "resource": "/srv/evidence/*", "effect": "allow" }`; a deny is honoured at approval
and at every run. [Scripting](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/scripting.md) has the
approval flow, the two routes (family methods and `host:<tool id>`), the file policy, the limits, and the full
bookmarks walkthrough with the daily cadence.

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

**Every tool is allowed by default.** OpenCode's base rule allows everything, and Jobs adds no grant of its own: its
block follows the `access` option, and everything a job actually does comes from the agent it names.

The `access` option picks the block the plugin inserts after each agent's base rule:

| `access` | Jobs' own tools | A script |
| --- | --- | --- |
| `all` (default) | allowed, like every other plugin's tools | approved automatically; the digest and the audit record are still kept |
| `ask-changes` | the four reads and the two pauses are allowed; every change asks | an all-read script with no file writes is approved automatically; anything else asks once per version |
| `read-only` | the four reads are allowed; every change is denied | an all-read script with no file writes is allowed; anything else is denied |

There are three ways to restrict it:

1. **`access`.** Set it in `opencode.json` to `"ask-changes"` or `"read-only"`; the block above changes with it.
2. **Agent-level rules.** Point a job at an agent whose own rules are narrow. The read-only profile to start from:

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
   everything, and the later rule wins. The rules after it are the profile: reading, searching and the plugin's own
   reads, and nothing that writes. Add a rule only when a job needs it, and add it to that agent alone. An agent that
   does not deny by default no longer refuses a job; `/jobs-status` shows it as a warning, with the block to paste,
   because such an agent's runs can use every tool it can.

3. **Per-tool rules.** Name an exact action such as `jobs_create`, `jobs_run_now` or `x_read`, and allow, ask or deny
   it. A later rule wins, so a per-tool `allow` follows a broader `ask`.

A job whose agent the host no longer lists — which a plugin update can cause — is refused with `JOBS_AGENT_MISSING`;
`/jobs-status` names it and says how to bring it back.

**What runs unattended.** A run never asks: an `ask` with nobody present becomes a `deny`. With `access: "all"`, a
script job is approved without a prompt, and with `ask-changes` an all-read script is; the digest, the resolved tools
and the declared files are recorded in each case, so the audit shows what was approved and when. The plugin has **two**
`evaluate` hooks: one on a session it created for a run, and the tools RPC's on one of its own script calls in flight.
Neither ever turns a deny into anything, and neither touches a session it did not create.

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
      "package": "github:joe-broadhead/opencode-jobs#v0.0.0",
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
  "plugins": [{ "package": "github:joe-broadhead/opencode-jobs#v0.0.0", "options": { "concurrency": 2 } }],
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
| `JOBS_AGENT_UNGUARDED` | The job's agent does not deny by default. Its jobs still run; review its permissions or paste the read-only block `/jobs-status` prints. |
| `JOBS_AGENT_MISSING` | OpenCode no longer lists the job's agent here, which can happen after a plugin update. Run `opencode reload` in a terminal, or restart OpenCode; the next slot runs once it is back. |
| `JOBS_SCRIPT_FILE_PATH` | A declared file's path is outside the job's directory and `scriptFilesRoots`, contains `..`, a symlink, a special file, `.git`, or OpenCode's own config or data. Fix the path; the file is never opened. |
| `JOBS_SCRIPT_FILE_INVALID` | A declared JSON file is not valid JSON, or a text file was given a non-string value. Fix the file or the write. |
| `JOBS_SCRIPT_FILE_TOO_LARGE` | A declared file, or a write to it, is over its `maxBytes`. Raise the cap, or keep the file smaller. |
| `JOBS_SCRIPT_FILE_CONFLICT` | A declared write target changed on disk after the run read it. Nothing is written; let the next run read it. |
| `JOBS_SCRIPT_FILE_MODE` | The script wrote a file declared `read`. Declare it `write` or `readwrite`, then approve again. |
| `JOBS_SCRIPT_BODY_IGNORED` | A script job file has a non-empty markdown body, which a script has no prompt to use. Remove the body or move it into the code. |
| `JOBS_SCRIPT_LIMIT` | The script hit one of its limits: calls, memory, output or wall clock. Raise `maxCalls`, `maxMemoryMb`, `maxOutputBytes` or the policy timeout, or make the script smaller. |
| `JOBS_SCRIPT_FAILED` | The script threw, or a call failed. Read the run record's error, fix the script or its tool, then approve it again if the code changed. |
| `JOBS_SCRIPT_INTERRUPTED` | The run was interrupted (the kill switch, a shutdown, or a replaced leader). Run it again with `jobs_run_now`, or wait for its next slot. |
| `JOBS_SCRIPT_HOST_TOOL` | A `host:` entry names OpenCode's own shell, file, network or task tool. A script reaches MCP servers and plugin tools only. Remove it. |
| `JOBS_SCRIPT_FAMILY_TOOL` | A `host:` entry names a tool a loaded plugin serves through its tools RPC. Use `<plugin id>.<method>`, so its shaping and budgets apply. |
| `JOBS_SCRIPT_DENIED` | The job's agent denies a tool the script's manifest names. A session allow beats an agent deny, so the script is refused rather than granted it. Remove the deny rule for that tool, or point the job at an agent that allows it. |
| `JOBS_SCRIPT_UNKNOWN_TOOL` | A manifest entry is not a method the plugin's tools RPC describes, or a tool the host lists. Use `<plugin id>.<method>` or `host:<tool id>`, then approve the script again. |
| `JOBS_SCRIPT_UNAPPROVED` | The script's source, its manifest or a tool's class changed since it was approved, so the slot was skipped. Approve it again with the `jobs_approve` tool or `/jobs-approve <job>`. |
| `JOBS_SCRIPT_REVOKED` | The script's agent now denies one of its tools, so every run is skipped until that changes. Remove the deny rule, or point the job at an agent that allows the tool, then approve it again. |
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
| OpenCode: untested | OpenCode is not 2.2.3, 2.2.4, 2.2.5 or 2.2.6. Inside `>=2.2.3 <2.3.0` the plugin runs normally; outside it, it runs only because `allowUntestedHost` is set. |
| `/jobs` is missing | The plugin did not start. Run `/plugins` to see the error. |
| `OPTIONS_INVALID` | An option is unknown or has a wrong value. The message names the option and the accepted values. |
| `HOST_UNTESTED` | Your OpenCode is outside `>=2.2.3 <2.3.0`, so the plugin did not start. Use OpenCode `>=2.2.3 <2.3.0`, or set `"allowUntestedHost": true` to run anyway. |
| `SKILLS_INVALID` | The jobs skill's file is missing or its front matter does not name it, so OpenCode does not list the skill. Next step: Reinstall the plugin. |
| `STATUS_UNAVAILABLE` | The status could not be read, or the plugin is not running. Follow the next step in the message. |

## What this is not

- **Not a shell or cron replacement.** Core is adding shell schedules; when they land, use those for a shell command. A
  job runs an agent under that agent's permissions.
- **Not an OS scheduler.** Nothing runs while OpenCode is closed.
- **Not a workflow engine.** A job may start a durable, multi-step `wfl` workflow; it does not implement one.
- **Not a timer.** Utilities' project timers are polled with `utilities_timer_check`; a job happens by itself.

## Uninstall

1. Pause first if a job is mid-run: `/jobs-pause`.
2. Remove the plugin: `opencode plugin remove github:joe-broadhead/opencode-jobs#v0.0.0`, then `opencode reload`.
3. Remove the agent block you copied into `opencode.json`, or the job agent's Markdown file.

The plugin's storage stays in OpenCode's own database; removing the plugin does not delete it.

## Known limits

- **Runs happen only while OpenCode runs.** Nothing runs while OpenCode is closed. A slot due in that time runs when OpenCode next starts if it is no later than the job's `maxLate` (one hour by default); a later slot is skipped as expired.
- **Scripts have fixed limits by default.** A script runs in a QuickJS VM with 64 MB of memory, 100 tool calls and 64 KB of output. A job can raise each one up to the maximum in [docs/scripting.md](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/scripting.md).
- **A changed declared file is re-approved under `all`.** The run record names the script's digest, but not yet the declared-file set (its paths, modes and caps), so the record alone does not show which file declaration a run used.
- **Declared files are read on the host.** Each one is read up to its size limit, before the VM starts, and that memory is outside `memoryMb`.
- **A restore can fail.** When a file cannot be put back after a failed commit, its run records `rollback_failed` and the error names the kept original, which a person must restore by hand.
- **An agent without the default rules still runs its jobs.** Status warns with `JOBS_AGENT_UNGUARDED` and the block to paste; nothing blocks the run.
- Updates are not automatic for a Git install, and `opencode plugin update` and `opencode plugin check` do not work on one: to move to a newer release, remove the old entry and add the new tag.

## Links

- [Configuration](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/configuration.md)
- [Architecture](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/architecture.md)
- [Scripting](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/scripting.md)
- [Jelly](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/docs/jelly.md)
- [Contributing](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/CONTRIBUTING.md)
- [Security](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/SECURITY.md)
- [Changelog](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/CHANGELOG.md)
- [MIT license](https://github.com/joe-broadhead/opencode-jobs/blob/HEAD/LICENSE)
