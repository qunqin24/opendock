# Darling Data — opencode plugins

A collection of [opencode](https://opencode.ai) plugins from
[Darling Data](https://erikdarling.com): the Claude Code collection, ported —
subagent guards and limits, open asks, a fleet view, a usage budget, session
resume, and the SQL Server query-plan skill — as one npm-installed package.

Install it in `opencode.json`:

```json
{ "$schema": "https://opencode.ai/config.json", "plugin": ["opencode-darling-data"] }
```

Options arrive via the tuple form, namespaced per sub-plugin. A `disabled`
list turns a sub-plugin off entirely:

```json
["opencode-darling-data", {
  "disabled": ["budget"],
  "fence": { "guard_force_push": true, "protected_branches": ["main", "master", "dev"] },
  "wall":  { "warnMinutes": 45, "limitMinutes": 60 }
}]
```

Each sub-plugin reads only its own namespace (`fence`, `wall`, `asks`,
`fleet`, `budget`, `resume`); the `disabled` list uses the same names.
Option parsing is lenient, as in the Claude collection: list options accept
arrays or comma/newline-separated strings; booleans fall back to their
defaults on anything else. The tuple form reaches the plugin as documented
(verified on opencode 1.18.35); there is no separate options file. The
package ships TypeScript source, which opencode loads directly — no build
step.

At startup the plugin copies its skill folder into `~/.config/opencode/skills/`
and its commands (`/asks`, `/fleet`, `/resume-sessions`) into
`~/.config/opencode/commands/` — folders opencode already reads — skipping
files whose content already matches. opencode may scan skills and commands
before the plugin runs, so on a fresh install they appear from the second
launch. Throughout, `~/.config/opencode` is `XDG_CONFIG_HOME/opencode` when
that variable is set.

## Sub-plugins

### `fence`

Stops the mistakes an unattended agent makes that cannot be taken back.
Ported from the Claude Code plugin `subagent-fence`.

For the main session and every subagent it refuses four things. A force-push.
A push to a protected branch. A git command that skips the repository's hooks.
Killing processes by name (`pkill`, `killall`, `taskkill /IM`,
`Stop-Process -Name`), because a name match can kill another session's
processes.

Three more guards are off until you set them. One bans folders: nothing reads,
writes or enters them. One keeps a subagent from editing a plain git checkout,
or running a changing git command there, so it works in its own worktree. One
stops a subagent reading a big text file whole instead of by offset and limit.

| Option | Default | What it does |
| :- | :- | :- |
| `guard_force_push` | on | Refuse `--force`, `--force-with-lease`, `-f` and `+refspec` pushes |
| `guard_protected_branches` | on | Refuse a push that targets a protected branch |
| `protected_branches` | `main`, `master`, `dev` | The branch names a push cannot target |
| `guard_no_verify` | on | Refuse the git flag that skips hooks |
| `guard_kill_by_name` | on | Refuse killing processes by name |
| `banned_paths` | none | Folders that nothing reads, writes or enters |
| `guard_shared_checkout` | off | Keep subagents out of plain git checkouts |
| `shared_checkout_root` | empty | Limit that guard to checkouts under this folder. Empty detects a plain checkout anywhere: a folder whose `.git` is a directory, where a linked worktree has a `.git` file |
| `read_limit_bytes` | 0 (off) | Refuse a subagent's `read` of a text file over this size when it gives no `limit` |

### `wall`

A wall-clock limit for subagents. Ported from the Claude Code plugin
`subagent-wall`.

After a warning time, a subagent is told to finish up. After the limit, it
can only run `git` and `gh` commands and write `.md` or `.txt` files. It
commits, reports and ends instead of running on. It also nudges a subagent
that has a lot of context but no edited file to stop exploring and make the
change — every subagent, because opencode sessions do not expose the agent
type the Claude version's `codeAgentTypes` option filtered on. The main
session is never limited.

| Option | Default | What it does |
| :- | :- | :- |
| `warnMinutes` | 45 | Minutes before a subagent is told to finish up. 0 turns the warning off. |
| `limitMinutes` | 60 | Minutes before it is held to `git`, `gh` and note writes. 0 turns the limit off. |
| `noEditNudgeK` | 100 | Thousands of context tokens before the no-edit nudge. 0 turns it off. |

### `asks`

Keeps the questions the agent asks you from scrolling away. Ported from the
Claude Code plugin `open-asks`.

Every time a reply asks you something or leaves a decision to you, the agent
records it, with its recommended answer. The agent gets `ask_add`,
`ask_resolve` and `ask_list` tools. You get `/asks`, which lists the open ones
with their ids and recommended answers; answer in chat and the agent marks the
ask resolved. Asks are saved per session, so a resumed session still has
them.

opencode has no status band above the prompt. The degradation: a toast when
an ask is added, the `/asks` command, and the saved registry.

No options.

### `fleet`

A view of your subagents, on demand. Ported from the Claude Code plugin
`subagent-band`.

`/fleet` shows every subagent of the session — short id, running or done,
age, context tokens and cost, finished ones included. The agent gets the same
view as a cheap `subagent_vitals` tool, so it does not have to read output
files to check progress. Cost comes from the `cost` field opencode puts on
each assistant message; a list-price estimate, not your bill.

The band's live rows became the command and the tool, on demand.

No options.

### `budget`

Watches your token spend against configured 5-hour and 7-day budgets. Ported
from the Claude Code plugin `usage-budget`.

opencode emits no rate-limit events, so instead of percent-of-plan this
watches token deltas: assistant-message token totals are accumulated per
message id — a streaming message is counted once, not per update — into
persistent rolling 5-hour and 7-day windows, written to
`~/.config/opencode/darling-data/budget.json` (the latest figures per window:
budget, used, percent, window start, plus the pace figures when the pace
warning is active). Both windows are off until you set a budget for them.

A toast tells you each time a window crosses a percent. Past a higher
percent, the model is also told, so it can stop starting optional work and
write its handoff. Past the last one, new subagents are refused until enough
of the window has rolled past for spend to fall back under it.

It also checks pace. When the 7-day spend runs `paceMargin` or more points
ahead of the share of the window that has passed (70% of budget spent with
60% of the window gone), you get a toast with the usage, the elapsed share
and the UTC time it lifts if spend stays flat, again each time the gap grows
by another margin — and new subagent spawns are refused until that lift
time. Without a 7-day budget set, the pace check is skipped.

| Option | Default | What it does |
| :- | :- | :- |
| `budget5h` | 0 (off) | Token budget for the 5-hour window. 0 turns the window off. |
| `budget7d` | 0 (off) | Token budget for the 7-day window. 0 turns the window off. |
| `warnPercents` | `70, 85, 95` | Percents of budget that raise a toast, once each per window. |
| `tellModelAtPercent` | 85 | From here the model is told as well. 0 never tells it. |
| `spawnGatePercent` | 95 | A new subagent is refused when either window is at or past this percent of budget. 0 turns the refusal off. |
| `paceMargin` | 10 | Points the 7-day spend may run ahead of the elapsed share of the window before the pace warning. 0 turns the pace check off. |

### `resume`

Brings interrupted sessions back after a crash, a reboot or a closed terminal.
Ported from the Claude Code plugin `seat-resume`.

The plugin writes one small file per interactive session — id, directory,
title, started and last-active times — and marks it when the session ends.
opencode's session storage has no pid files, so liveness is a heartbeat:
while a session is alive the plugin touches its entry once a minute, and an
entry with no end marker whose last touch is stale counts as interrupted.
`/resume-sessions` lists the sessions that died or were interrupted in the
last 72 hours, with the command that reopens each. `-Launch` reopens all of
them in terminal tabs, in their original directories. Sessions that ended
cleanly stay closed.

| Option | Default | What it does |
| :- | :- | :- |
| `registry_dir` | `~/.config/opencode/darling-data/sessions-registry` | Where the per-session files go |
| `resume_script` | the bundled `scripts/resume-sessions.ps1` | The PowerShell script `/resume-sessions` runs |
| `powershell` | `pwsh` | The program that runs it (`powershell` for Windows PowerShell 5.1) |
| `terminal` | `wezterm` | `wezterm` or `windows-terminal`: where `-Launch` reopens sessions |

## `query-plan-analysis`

Teaches the agent to read a SQL Server execution plan and say what is actually
slow, and why. The skill is copied verbatim from the Claude Code plugin
`sqlserver-query-plans`: `SKILL.md`, the `extract.py` plan digest, and the
reference notes.

Point the agent at a `.sqlplan` file and ask. The skill is model-invoked — you
do not need to call it explicitly. It requires Python 3 (standard library
only); without it the skill degrades to a documented `grep`-based fallback
and says plainly what it cannot determine.

The plugin copies the skill folder to `~/.config/opencode/skills/` at startup.
opencode may scan skills before the plugin runs, so on a fresh install the
skill appears from the second launch. After that the copy follows package
updates.

## Not ported

- **`model-allowlist`**: opencode has no tier aliases — every model is a
  pinned `provider/model` id, so the plugin's core rule (refuse pins, ask for
  the alias) has nothing to check, and opencode itself errors on an unknown
  model id.
- The pi plugins from the Claude collection map to their equivalents here:
  `pi-session-resume` → `resume`, `pi-subagent-watchdog` → `fleet` and
  `budget`, `pi-subagent-guardrails` → `wall`.

## Windows note

`resume` is Windows only. The bundled script is PowerShell and runs under
PowerShell 5.1 or pwsh; set the `powershell` option to `powershell` when pwsh
is not on PATH. `-Launch` reopens sessions in [WezTerm](https://wezterm.org)
or Windows Terminal.

## License

MIT
