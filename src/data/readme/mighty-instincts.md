# mighty-instincts

An [OpenCode](https://opencode.ai) V2 plugin that observes session activity (tool calls and prompts) into a per-project log, periodically has a cheap model distil that log into small learned "instincts," and exposes [ECC](https://github.com/affaan-m/ECC)'s instinct CLI as slash commands. Nothing becomes live automatically on the write side: the maintenance loop only ever *proposes* a candidate skill/command/agent/rule from related instincts (see "From habits to skills" below), and installing, rejecting, or archiving one is always a command you type; the observer is off by default too. On the read side, the plugin adds a small `<instincts>` system-context block to every outgoing model request by default (`inject.enabled: true`); this costs no model call of its own, since it only reads instinct files this plugin (or `/instinct-import`) already wrote. A background maintenance loop (promote, prune, decay, dedupe, evolve) keeps those files tidy without any input from you.

On the OpenCode 2 TUI it also adds a small, collapsible sidebar board summarising three sources of the user's own observation/improvement tooling, in plain language: **Learned habits** (this plugin's own instincts and observer status), **Skill notes** (the task-observer skill's open/parked backlog), and **Skill test** (skill-creator's latest benchmark result). Hosts without the sidebar can run `/board` for a short, explanatory chat summary of the same three sources instead.

## Install

> `opencode-instincts` was this package's previous name. If your `opencode.json` still references it, replace it with `mighty-instincts`.

Add the plugin to your `opencode.json` (project or global at `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["mighty-instincts"]
}
```

To set options, use the object form instead of the bare string:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "mighty-instincts",
      "options": {
        "observer": { "enabled": true, "model": "anthropic/claude-haiku-4-5" }
      }
    }
  ]
}
```

Restart OpenCode. Requires Python 3 on `PATH` (the plugin runs ECC's vendored `instinct-cli.py` as a subprocess; nothing else is installed). On the OpenCode 2 TUI the sidebar board (`mighty-instincts/tui`) loads alongside the server plugin automatically; no extra configuration is needed.

### Options

All options are optional; defaults shown:

```json
{
  "disabled": false,
  "dataDir": null,
  "python": "python3",
  "observePrompts": true,
  "ignoreTools": ["todowrite", "todoread", "question", "instincts"],
  "ignoreAgents": [],
  "observer": {
    "enabled": false,
    "model": null,
    "runIntervalMinutes": 5,
    "minObservations": 20,
    "maxAnalysisLines": 300,
    "notify": true
  },
  "inject": {
    "enabled": true,
    "max": 5,
    "minConfidence": 0.8,
    "exclude": []
  },
  "maintenance": {
    "intervalHours": 24,
    "dryRun": false,
    "promote": true,
    "prune": true,
    "decay": true,
    "dedupe": true,
    "evolve": true,
    "repair": true,
    "cleanupProjects": true
  },
  "evolve": {
    "targets": { "skill": null, "command": null, "agent": null, "rule": null }
  },
  "prune": {
    "unusedDays": 30,
    "auto": false
  },
  "board": {
    "enabled": true,
    "sections": { "instincts": true, "observations": true, "evals": true },
    "refreshSeconds": 30,
    "observationsRoot": null,
    "evalRoots": null,
    "compact": false
  }
}
```

| Option | Description |
| --- | --- |
| `disabled` | Skip registering everything (hooks, commands, tool, board, maintenance). |
| `dataDir` | Absolute path to use instead of the default ECC data directory; relative values are ignored with a warning. Maps to `CLV2_HOMUNCULUS_DIR` for the vendored CLI. |
| `python` | Python interpreter to run `instinct-cli.py` with. |
| `observePrompts` | Record user prompt text (scrubbed, clipped to 2000 chars) as `user_prompt` observations. |
| `ignoreTools` / `ignoreAgents` | Tool names / agent names to never observe. |
| `observer.enabled` | Turn on the background distillation run described below. |
| `observer.model` | `"provider/model"` to run `generate.text` with. When unset, the host's default model is used (and a one-time warning is logged). |
| `observer.runIntervalMinutes` / `observer.minObservations` | Minimum time and minimum new observation count between automatic runs. |
| `observer.maxAnalysisLines` | How many of the most recent observation lines to show the model per run. |
| `observer.notify` | Post a synthetic summary message into the triggering session after a background run. |
| `inject.enabled` | Add a small `<instincts>` system-context block (one summary line per eligible instinct) to every outgoing model request. On by default; set to `false` to turn it off entirely. |
| `inject.max` | Maximum number of instincts included per request, highest confidence first. |
| `inject.minConfidence` | Minimum confidence an instinct needs to be eligible for injection. |
| `inject.exclude` | Array of instinct ids to never inject, even if they otherwise qualify. |
| `maintenance.intervalHours` | How often the maintenance sweep runs on its own timer (it also always runs right after an observer run). |
| `maintenance.dryRun` | Log what every enabled step *would* do (`would promote: ...`, `would prune: ...`, ...) instead of changing anything. See "Trying it safely" below. |
| `maintenance.promote` / `.prune` / `.decay` / `.dedupe` / `.evolve` / `.repair` / `.cleanupProjects` | Turn one maintenance step off without affecting the others. All default to `true`. |
| `evolve.targets.skill` / `.command` / `.agent` | Absolute directory to install candidates of that kind into, overriding the real `~/.config/opencode/skills` / `commands` / `agents`. A skill installs to `<dir>/<suggested_name>/SKILL.md`; a command or agent to `<dir>/<suggested_name>.md`. |
| `evolve.targets.rule` | Absolute file to append rule candidates to, overriding the project's own `AGENTS.md`. |
| `prune.unusedDays` | How many days of zero use (lib/usage.js's usage.json) before an installed candidate is flagged as unused. Also the window `/evolve-list` uses for reporting hand-written, never-generated assets. |
| `prune.auto` | When `true`, an unused installed candidate is archived and its installed file removed (only when it still carries the `generated_by: mighty-instincts` marker) instead of merely flagged. Off by default, like every other automatic write/delete this plugin can do. |
| `board.enabled` | Turn the sidebar board and the `/board` command off entirely. |
| `board.sections.instincts` / `.observations` / `.evals` | Show or hide one block of the board (Learned habits / Skill notes / Skill test, respectively; the option names are unchanged from earlier releases). |
| `board.compact` | Start every board block collapsed to its title line only; still expandable by clicking. Does not affect the panel header. |
| `board.refreshSeconds` | How often the board state file is recomputed on a timer (it is also refreshed on plugin setup and after every observer run). |
| `board.observationsRoot` | Absolute path (or one starting with `~/`) to the task-observer skill's data directory. Defaults to `~/.local/share/opencode/task-observer`. |
| `board.evalRoots` | Array of absolute paths (or ones starting with `~/`) to search for skill-creator benchmark output, in priority order: the first root with any benchmark.json at all wins outright (its own newest file), and only a root beyond the first has smoke-test/fixture-looking paths filtered out before that. Defaults to `["~/.config/opencode/skills", "$TMPDIR/opencode"]`. |

## The board

The board is a small, read-only summary of three sources, written by the server half of the plugin to a per-project `board-state.json` file and polled every 30 seconds (or refreshed on request) by the TUI sidebar panel and by `/board`. Every block has a status circle: a solid green `●` means active and healthy, a solid amber `●` means it needs attention, and a hollow `○` means stale or no data yet. In the sidebar, the panel header and every block title are clickable (collapsing the whole panel, or just that block, down to one line); whichever state you leave them in is remembered across restarts. The header also shows the installed version. Fully expanded, the panel reads something like:

```
▾ Mighty Instincts v0.8.2
  ▾ Learned habits               ● 16
      habits in prompts               6
      used today / this week      2 / 9
      ready to share globally         4
        run /promote to share them
      next learning run            in 3m
      skill candidates                 2
        run /evolve-list
      installed from habits            1
  ▾ Skill notes                  ● 398
      open                           398
      added this week                158
      last reviewed                 never
  ▾ Skill test (pr)              ● 2d
      with skill                     92%
      without                         8%
  ● active  ● needs attention  ○ stale
```

`/board` does not reproduce this layout: it replies in the chat as a short, explanatory summary instead (a circle and a padded label, then each block's key facts on one headline line, then a sentence or two of plain-language context underneath), since a table of dot-aligned rows reads awkwardly copied into a chat message. Both read from the exact same `board-state.json` and the same glyph/availability rules (`lib/board-text.js`), so the two are never out of step on what a given state actually means; they just say it differently. It reads something like:

```
● Learned habits   29 total, 10 in prompts, 3 used today (14 this week)
  Habits are patterns learned from your activity; one counts as used once per prompt you type in a top-level session whose wording shares 3 or more significant words with the habit's trigger; subagent and background sessions are not counted.
  Used today: absolute-node-path-when-shell-lacks-node (1x): Use the absolute Homebrew node path for all node calls.
              fff-grep-anchor-fallback-to-read (1x): Read the named file directly with a windowed Read.
  Next learning run after 14 more events (6 so far). 10 ready: /promote.

● Skill notes      467 open, 167 this week, never reviewed: review overdue.

○ Skill test (pr)  no measurable difference last run (100% vs 100%, 4d ago).

● active  ● needs attention  ○ stale
```

The "Used today:" list reads "Most used today:" instead whenever two listed habits fired a different number of times (nothing to rank when every count is 1), is capped at 5, and each summary is clipped at a word boundary at 100 characters (this reply has no 36-column sidebar budget to justify a hard character cut). "Next learning run" reads one of three ways: `ready`, `in <duration>` (still waiting on the interval), or `after N more events (M so far)` (the interval has elapsed, but not enough has been observed yet). "Skill test" reads "no measurable difference" (and a stale, hollow glyph) whenever the pass-rate difference between the two runs is smaller than 5 points, or negative.

### Glossary

The board intentionally avoids ECC's own vocabulary ("promote," "prune," "evolve") in favour of plain language. What each row means:

| Row | Meaning |
| --- | --- |
| **habits in prompts** | How many instincts qualify for injection right now (confidence >= `inject.minConfidence`, not excluded, not pending). A live eligibility count, not a per-day tally; it can go up or down between refreshes as instincts are learned, decayed, or promoted. |
| **used today / this week** | How many times an included (or still-unproven, pending) instinct's trigger actually matched something you typed today, and the same total summed over the last 7 days. |
| **ready to share globally** | Project instincts that look confident enough (>= 80%) to promote to the shared global bucket, that are not already there. `/promote` does this by hand; the maintenance loop also does it automatically, via either of its own two qualification paths (see "promote" under Maintenance below) - this row is a quick confidence-only estimate of both combined, not a reimplementation of either path's full rule. |
| **next learning run** | When the background observer is next allowed to run: `ready` once both `observer.runIntervalMinutes` has elapsed since the last run *and* `observer.minObservations` has piled up since; `in <duration>` while only the interval is still outstanding; or `after N more events (M so far)` once the interval has elapsed but there just has not been enough new activity yet (there is no fixed time to count down to in that case, but there is a concrete number of events still needed). |
| **skill candidates** | How many candidates (lib/maintain.js's weekly `evolve` step proposes them, grouping related instincts) are still waiting on a decision; run `/evolve-list` to see them, and `/evolve-install` / `/evolve-reject` to decide. |
| **installed from habits** | How many candidates you have installed as a real skill, command, agent, or AGENTS.md rule via `/evolve-install`. |
| **unused candidates** | How many installed candidates have had zero uses in `prune.unusedDays` days (default 30); see "From habits to skills" below. |
| **awaiting first use** | Instincts the observer was not confident enough about to call "learned" yet (the "50% rule," below); they graduate to real instincts once you actually use them once. |
| **kept tidy** | What the maintenance loop did in the last 7 days: `promoted`, `archived`, `merged`, `pruned`, `candidates` (evolved outlines written), `repaired`, `cleaned` (stale project entries archived), whichever of those are nonzero. |
| **open** / **added this week** / **last reviewed** | The task-observer skill's own open backlog, how much is new this week, and when it was last reviewed by a human. |
| **with skill** / **without** | The two pass rates skill-creator's latest benchmark compared. |

### Where the board state lives

```
${CLV2_HOMUNCULUS_DIR or $XDG_DATA_HOME/ecc-homunculus or ~/.local/share/ecc-homunculus}/
├── board-pointer-<sha256(project directory)[0:12]>.json   # points at the file below
└── projects/<project-hash>/
    └── board-state.json
```

The TUI half knows the real project directory (`ctx.location.directory`) but not `<project-hash>` (ECC's own git-remote hash, resolved by a python subprocess the server half already runs). So the server half also writes a small pointer file, named only from a hash of the real directory path, holding the absolute path of the real state file. Both halves resolve the pointer file's own location the same way (the ECC data directory default chain above), so the TUI never needs to run python itself.

## Automatic skill review

The task-observer skill (installed separately; see its own SKILL.md) keeps an open backlog of observations about every other installed skill, meant to be reviewed on a cadence with its own `references/weekly-review.md` procedure. `review.enabled` (off by default, like every other automatic action this plugin can take) lets this plugin run that procedure for you: once the backlog is due, it spawns a headless OpenCode session (`ctx.session.create` + `ctx.session.prompt`, the same v2 API the board and observer use) that loads the task-observer skill and works through a bounded slice of the oldest open observations, then tracks that session through to completion. `/skill-review` triggers one run on demand (ignoring the cadence and cooldown, but not a review already in progress), independent of `review.enabled`; `/skill-review status` reports the open count, last review date, whether a run is due, and any in-flight session id.

| Option | Description |
| --- | --- |
| `review.enabled` | Turn the scheduled review on. `/skill-review` works either way. |
| `review.cadenceDays` | Minimum days since the last review before another one is due. |
| `review.sliceSize` | How many of the oldest open observations (by id, plus anything that restates one of them) one review run is scoped to. |
| `review.cooldownHours` | Minimum time between attempts, independent of the cadence (covers a run that was skipped or failed quickly). |
| `review.timeoutMinutes` | How long a lock (and the spawned session itself) is allowed to run before it is considered stale, replaceable by the next attempt, and interrupted. |
| `review.startupDelaySeconds` | How long after plugin setup the first scheduled check runs. |
| `review.pollMinutes` | How often the scheduled check re-runs after that first one. |
| `review.model` | `"provider/model"` for the spawned session. When unset, the host's default model is used. |
| `review.agent` | Agent name for the spawned session. When unset, the host's default agent is used. |
| `review.externalDirectories` | Extra absolute paths (or ones starting with `~/`) the spawned session may read from outside the task-observer workspace, beyond `~/.config/opencode` and `~/.cache/opencode/npm` (always allowed, so the session can load skills and plugin code). |

The lock (`review-lock.json`) and the append-only attempt log (`review-runs.log`) both live under `<task-observer root>/skill-observations/.mighty-instincts/`, next to (never inside) the skill's own `skill-observations/` state, since several OpenCode instances on the same machine can share that workspace: the lock is created with an exclusive write, so whichever instance wins the race blocks every other one until it finishes or its `timeoutMinutes` elapses.

The spawned session's permissions are last-match-wins, OpenCode 2's own resolution order: editing is denied everywhere except inside the task-observer workspace; reading outside the workspace is denied everywhere except `~/.config/opencode`, `~/.cache/opencode/npm`, and anything listed in `review.externalDirectories`; shell is allowed outright, since the review procedure runs bash snippets and a headless session has nobody to answer an "ask" permission prompt. The edit deny and the prompt's own instructions are what actually keep the review inside the workspace; shell can still write elsewhere through means an edit permission does not cover.

```json
{
  "review": {
    "enabled": true,
    "model": "anthropic/claude-haiku-4-5",
    "cadenceDays": 7
  }
}
```

## What gets written, and where

Everything lands in ECC's existing on-disk layout so `instinct-cli.py` (and anything else that reads it) sees the same data; the only additions are the bookkeeping files marked below:

```
${CLV2_HOMUNCULUS_DIR or $XDG_DATA_HOME/ecc-homunculus or ~/.local/share/ecc-homunculus}/
├── projects/<project-hash>/
│   ├── observations.jsonl          # tool_start / tool_complete / user_prompt records
│   ├── observations.archive/       # rotated out at 10 MB
│   ├── observer.log                # plugin addition: one line per observer run
│   ├── maintenance.log             # plugin addition: one line per maintenance event
│   ├── .observer-state.json        # plugin addition: last run time + line count for the gate
│   ├── .activity.json              # plugin addition: last-observed/applied/fired-today/fired-this-week counters
│   ├── fired-misses.log            # plugin addition: near-miss (1-2 shared word) fired-match log, capped at 200 lines
│   ├── board-state.json            # plugin addition: the board's three-block summary
│   ├── usage.json                  # plugin addition: skill/command/agent usage counts (see "From habits to skills")
│   ├── evolved/<cluster-id>.md     # plugin addition: candidates proposed/installed/archived by the evolve lifecycle
│   └── instincts/
│       ├── personal/<id>.md        # written by the observer
│       ├── inherited/<id>.md       # written by `/instinct-import`
│       ├── pending/<id>.md         # unproven instincts (the "50% rule"); never injected
│       └── archive/<id>.md         # instincts the maintenance loop decayed below 0.4 confidence; never deleted
└── archive/projects/<project-hash>/  # plugin addition: `cleanupProjects` archives a stale, zero-instinct project dir here (root gone, or under a temp dir); never deleted
```

`observer.log` carries one line per run: `<iso> run: <N> written, <N> rejected, model <provider/model>`, with ` ids: <id>,<id>,...` appended when any instinct was written and ` rejected: <reason>; <reason>; ...` appended when any block was rejected. `maintenance.log` carries one line per maintenance event (`<iso> promote: ...`, `<iso> prune: ...`, `<iso> decay: ...`, `<iso> dedupe: ...`, `<iso> evolve: ...`, `<iso> repair: ...`, `<iso> pending: ...`, `<iso> cleanup: ...`), plus one `<iso> run: promoted N, archived N, merged N, pruned N, candidates N, repaired N, cleaned N` summary line per sweep, which is what the board's "kept tidy" row and the weekly `evolve` / daily `cleanupProjects` gates both read back. Every suffix and summary line is for anyone reading the files by hand; the board only ever parses a few fixed prefixes, so older log lines without the suffixes still parse the same way.

Project identity (the `<project-hash>` above, or the shared `global` bucket when there is no git project) is resolved by calling ECC's own `detect_project()` in `vendor/ecc/instinct-cli.py`, so this plugin and the CLI agree unless resolution fails, in which case a warning is logged and the shared global bucket is used.

## Commands

| Command | Does |
| --- | --- |
| `/instinct-status` | Show instinct status (project-scoped + global). |
| `/instinct-import <file\|url> [--dry-run] [--min-confidence N] [--scope project\|global]` | Import instincts from a local file or an `https://` URL. |
| `/instinct-export [--output file] [--domain d] [--min-confidence N] [--scope project\|global\|all]` | Export instincts to stdout or a file. |
| `/evolve [--generate] [--limit N]` | Without `--generate`: a deterministic preview (no model call, no `instinct-cli.py`) of the top instinct clusters (member ids, average confidence, a "why" naming the words they share, a suggested form sized by cluster: rule < command < skill), ending with a hint to add `--generate`. With `--generate`: delegates to `instinct-cli.py`'s own evolve implementation, which writes skill/command/agent candidates under `evolved/`. (Separate from the maintenance loop's own, always-on `evolve` step below, which proposes candidates through the lifecycle described in "From habits to skills" instead.) |
| `/evolve-list [id]` | List every candidate (proposed/installed/archived) with its kind, member count, usage, and age, plus which installed candidates and which hand-written (never-generated) skills/commands/agents look unused. With an id, shows that one candidate's full detail instead. |
| `/evolve-show <id>` | Read-only detail for one candidate (kind, target path, members, full body). Never installs or changes anything. |
| `/evolve-install <id> [--yes]` | Without `--yes`: previews the candidate (same detail as `/evolve-show`) and stops. With `--yes`: installs it as a real skill, command, agent, or AGENTS.md rule. Refuses if the target is a symlink, or already exists and was not written by this plugin for this exact candidate. |
| `/evolve-reject <id> [reason]` | Archive a proposed candidate without installing it. |
| `/evolve-archive <id>` | Archive a candidate; for an installed one, also removes the file it installed, but only if ownership and content still match exactly what was installed. |
| `/promote [id] [--dry-run]` | Promote a specific instinct, or auto-promote everything that qualifies, to global scope. |
| `/instinct-projects` | List known projects and their instinct counts. |
| `/instinct-prune [--dry-run] [--max-age N]` | Delete pending instincts older than the TTL. |
| `/instinct-observe` | Run the observer right now, ignoring the enabled/interval/threshold gates. |
| `/board` | Show the board as a short, explanatory chat summary (Learned habits, Skill notes, Skill test); see "The board" above. |
| `/skill-review [status]` | Run the task-observer backlog review now in a headless session, ignoring the cadence and cooldown (but not a review already in progress). With `status`: report the open count, last review date, whether a run is due, and any in-flight session id. See "Automatic skill review" above. |

Every command above posts its reply back into the session as a synthetic message with `resume: true`, so it surfaces immediately instead of waiting for the next turn (you just typed the command, so you are sitting right there for the reply); none of them start a model turn. The background observer's own notify message (after an unprompted run nobody is necessarily watching for) keeps `resume: false` instead. `/instinct-import` and `/promote` pass `--force`, since typing the command is the confirmation that would otherwise come from the CLI's own `y/N` prompt.

## The `instincts` tool

The plugin also registers a tool named `instincts` that the agent can call mid-turn. It only exposes the read-only subset of the CLI: `status`, `projects`, `export` (to stdout only, no `--output`), `evolve` (preview only, no `--generate`), `promote --dry-run`, and `prune --dry-run`. It never passes `--force` and can never import, write, or delete anything.

## Observer behaviour and cost

When `observer.enabled` is `true`, every observed tool call or prompt checks whether enough time (`runIntervalMinutes`) and enough new observations (`minObservations`) have passed since the last run. When both are true (or there is nothing new to observe but an existing instinct is still missing its `summary:` field, see below), the plugin:

1. Reads the most recent observation lines (clipped per-field and capped in total size) plus the existing instinct list, so the model updates instincts instead of duplicating them. Up to 20 existing instincts with no `summary:` field (written before 0.7.0) are listed separately, with an instruction to add only that field and change nothing else.
2. Calls `ctx.generate.text({ prompt, model })` once, with no tools available to the model.
3. Parses `<instinct>...</instinct>` blocks out of the response and validates each one: id, trigger (rejected outright if it carries a leaked `confidence:`/`domain:`/`scope:`/`source:` fragment from a malformed model response), confidence, domain, `summary` (one imperative sentence, required, rejected over 160 characters, trimmed to 120), and no stray `---` in the body.
4. Checks each valid instinct against the existing personal store on trigger-vs-trigger OR summary-vs-summary significant-word overlap (`maintenance.dedupe`); a close match (>= 60% of the shorter side's words on either field, or >= 45% on either field when both instincts also share the same domain) is merged into the existing file instead of written as a duplicate.
5. Writes anything left to `instincts/personal/`, except an instinct with confidence `<= 0.5`, which goes to `instincts/pending/` instead (the "50% rule": unproven until it is actually used once), regardless of whether the body carries a `## Evidence` section. An instinct that has already graduated (fired at least once) is never demoted back to pending just because a later run resubmits it with a lower confidence.
6. Logs the result to `observer.log`, runs the maintenance sweep (below), refreshes the board state, and, if `observer.notify` is true, posts a summary into the session.

This is at most one `generate.text` call per interval, on whatever model you set in `observer.model`. `/instinct-observe` runs the same logic on demand, bypassing the enabled/interval/threshold gates (it still needs a model, from `observer.model` or the host default).

## Prompt injection

When `inject.enabled` is `true` (the default), every outgoing model request is checked against this project's instincts plus the shared global bucket. Up to `inject.max` instincts (default 5) meeting `inject.minConfidence` (default 0.8), excluding any id listed in `inject.exclude`, are added as one more system-context entry:

```
<instincts> learned habits for this project
- <one-line summary of what to do>
...
</instincts>
```

This runs on `ctx.session.hook("context", ...)`, not `"prompt"`: it only ever appends to the request's own `system` array, right before the model sees it, and never edits the user's prompt text or message history. Because of that there is no cadence to configure and nothing to track between requests; every request gets a block built fresh from whatever instinct files exist right now. The whole block is kept under 1200 characters, dropping the lowest-confidence entries first if it would not otherwise fit. No model call is involved: this only reads instinct files already on disk. Injection is skipped when the latest user message in the request carries `opencode_loop_v2` or `ulw` metadata (a loop/ultrawork re-prompt, not a fresh request), or when the project has no instincts at all. A trigger that still contains a stray `confidence:`/`domain:`/`scope:`/`source:` (frontmatter that leaked into the field) is treated as malformed and skipped, with a one-time warning logged.

Each line's summary is the instinct's own `summary:` frontmatter field (one imperative sentence, at most 120 characters); for an instinct written before 0.7.0 with no `summary:` of its own, it falls back to the first sentence of the `## Action` section, clipped to 120 characters.

Each successful injection is counted in `.activity.json` (`appliedToday`, reset at UTC midnight), tracked for its own sake rather than shown on the board directly: the board's "habits in prompts" row is a live eligibility count (how many instincts qualify right now), not this per-day tally. When an included instinct's `trigger` shares at least 3 significant words (5+ letters, case-insensitive, common filler words removed) with the latest user message, that instinct's `fired` count (in its own frontmatter) is incremented, the day's total and a rolling 7-day total are both kept in `.activity.json`, and shown on the board as "used today / this week." A pending instinct (the "50% rule," above) is checked for firing exactly the same way, but is never included in the injected block itself; once it fires, the maintenance loop promotes it to a real instinct. A candidate that shares 1 or 2 significant words (just under the 3-word threshold, so it never actually fires) is logged instead to `fired-misses.log` (id, shared-word count, the words themselves; capped at 200 lines), for tuning that threshold later; nothing in this plugin ever reads that log back. The observer never sees the injected block itself: `lib/observe.js` still strips any legacy `<instincts>...</instincts>` block it finds in prompt text (harmless now that injection no longer writes into prompt text at all, kept for defence against a residual block from before 0.7.0).

## Maintenance

A background sweep keeps the instinct stores tidy without you ever running a command. It runs right after every observer run, and otherwise at least every `maintenance.intervalHours` (default 24), guarded against overlapping with itself. Every step below is on by default and logs what it did to `maintenance.log`; any one can be turned off independently (`maintenance.promote: false`, etc.).

- **promote**: either of two independent qualification paths copies an instinct to the shared global bucket, whichever one it clears first: (1) cross-project corroboration, ECC's own rule - confident enough (>= 80%, the same threshold ECC's own CLI uses) and whose id (or a trigger with 70%+ word overlap, so two projects that learned "the same" thing under different ids still count) appears in 2+ distinct project stores; or (2) proven on its own, no corroboration needed - confidence >= 90% and fired >= 3 times, in a single project. Reimplemented directly over `projects/*/instincts/personal/*.md`; never shells out to Python for this. `maintenance.log` records which path qualified.
- **prune**: deletes files in `instincts/pending/` older than 30 days (ECC's own default pending TTL); logs a warning for ones within 7 days of expiring.
- **decay**: a personal instinct that has never fired, past 30 days old, loses 0.05 confidence per full week since its last decay; once that drops it below 0.4 it is moved (never deleted) to `instincts/archive/`.
- **dedupe**: before the observer writes a new instinct, it is compared against every existing personal instinct on trigger-vs-trigger OR summary-vs-summary word overlap; a close match (>= 60% on either field, or >= 45% on either field when both also share the same domain) gets its confidence raised instead of creating a near-duplicate file (see step 4 under "Observer behaviour" above).
- **evolve**: groups personal instincts by domain and by word overlap into clusters of 3+, and proposes (or updates) one candidate per cluster under `evolved/<cluster-id>.md` (no model call). Runs at most once a week, regardless of how often the sweep itself runs. See "From habits to skills" below for the full lifecycle, including the one step this maintenance loop never takes on its own: actually installing one.
- **repair**: a one-off, idempotent cleanup pass over the personal store: cleans a trigger carrying a leaked trailing frontmatter fragment (e.g. `..., confidence: 0.8`), the shape a parser bug before 0.7.0 (or a hand-edited file) could leave behind; and moves a personal instinct with confidence `<= 0.5` that has never fired into `instincts/pending/`, the "50% rule" (above) applied retroactively to anything that landed in personal before that rule covered it.
- **cleanupProjects**: runs at most once a day. For every entry in ECC's own projects registry (`projects.json`) whose root no longer exists, or lives under the OS temp directory, and which has 0 instincts of its own, the registry entry is removed and its project directory is archived (never deleted outright) to `archive/projects/<id>/`.

### Trying it safely

Set `"maintenance": { "dryRun": true }` to see exactly what the next sweep would do without changing anything: every line it would otherwise log to `maintenance.log` is prefixed `would` instead (`would promote: ...`, `would archive: ...`, `would merge ... into ...`, and so on), with no file written, moved, or deleted. Turn it back to `false` (the default) once you are happy with what you see.

## From habits to skills

Nothing this plugin learns ever becomes a real skill, command, agent, or AGENTS.md rule by itself. The weekly `evolve` maintenance step (above) only ever *proposes* a candidate; everything past that point is a one-step command you type.

### Lifecycle

A candidate moves through exactly three statuses, stored right on the candidate file itself (`evolved/<cluster-id>.md`, frontmatter `status:`):

1. **proposed** - the weekly evolve step wrote (or updated) it. Nothing outside `evolved/` exists yet.
2. **installed** - `/evolve-install <id>` copied its drafted artefact to a real location. `installed_at` is stamped.
3. **archived** - either rejected before ever being installed (`/evolve-reject`, with an optional reason) or removed after being installed (`/evolve-archive`). An archived candidate blocks its own cluster from ever being re-proposed.

Re-running the weekly evolve step never duplicates a candidate: if the freshly computed cluster's members overlap an existing candidate's own members by 70% or more, that candidate's `members` list is refreshed in place instead of a second candidate being written for "the same" cluster.

### What gets proposed

Each cluster of 3+ related instincts (the same clustering the maintenance loop's `evolve` step always used) is proposed as one of four kinds, chosen from the cluster's own size and content, no model call:

| Cluster | Kind |
| --- | --- |
| 3 members | **rule**: a 1-3 line AGENTS.md snippet, one bullet per member. |
| 4-5 members, summaries read as run/check/verify/test/lint/build/scan steps | **command**: a `commands/<name>.md` draft (`description:` frontmatter, then the steps). |
| 4-5 members, otherwise | **skill**: a full `SKILL.md` draft (`name:`/`description:` frontmatter, member summaries as `## Rules`). |
| 6+ members | **skill**. |
| any size, if a member mentions delegation or a specialist role | **agent**: an agent markdown draft (`description:`/`mode: subagent` frontmatter, member summaries as responsibilities). This overrides every size rule above. |

### The commands

| Command | Does |
| --- | --- |
| `/evolve-list [id]` | Without an id: every candidate (any status) with kind, member count, usage, and age, plus a report of unused installed candidates and unused hand-written assets. With an id: the same single-candidate detail `/evolve-show` renders. Changes nothing either way. |
| `/evolve-show <id>` | Read-only alias for one candidate's detail: kind, target path, members, and its full drafted body. Works on any status. Changes nothing. |
| `/evolve-install <id>` | Without `--yes`: previews the exact same detail `/evolve-show` renders, then stops with "Re-run with --yes to install." and writes nothing. With `--yes`: copies the candidate's drafted body to its real location (below), status -> `installed`. Refuses outright if the target is a symlink, or already exists and was not written by this plugin for this exact candidate (see "Install locations and markers" below). Ends with "Restart OpenCode to load it." |
| `/evolve-reject <id> [reason]` | status -> `archived`, with an optional reason. Only a `proposed` candidate can be rejected; an installed one goes through `/evolve-archive` instead. |
| `/evolve-archive <id>` | status -> `archived`. For an installed candidate, also removes the file (or AGENTS.md snippet) it installed, but only when `/evolve-install` can still prove it owns that exact, unchanged content (below); a symlinked, hand-edited, or otherwise-owned file is left in place with a note instead. |

`/evolve-install` is deliberately two steps: typing an id alone never writes anything, so there is always a look-before-you-leap preview (what it is, where it would go, every member instinct behind it, and its full body) before the one `--yes` re-run that actually installs it.

### Install locations and markers

| Kind | Default location | Override |
| --- | --- | --- |
| skill | `~/.config/opencode/skills/<suggested_name>/SKILL.md` | `evolve.targets.skill` (an absolute directory) |
| command | `~/.config/opencode/commands/<suggested_name>.md` | `evolve.targets.command` |
| agent | `~/.config/opencode/agents/<suggested_name>.md` | `evolve.targets.agent` |
| rule | `<project root>/AGENTS.md`, appended under `## Learned rules (mighty-instincts)` | `evolve.targets.rule` (an absolute file) |

Every `evolve.targets.*` override must be absolute once `~` is expanded; a relative value is rejected (with a one-time warning naming which target) and the real default location is used instead, the same defensive rule `dataDir` already follows.

Every file `/evolve-install` writes carries three identifying fields in its own frontmatter: `generated_by: mighty-instincts`, `candidate_id: <this candidate's id>`, and `project_id: <the project that installed it>`, plus `members: [<member instinct ids>]`. A rule's AGENTS.md snippet carries the same `candidate_id`/`project_id` pair instead, on a bracketing pair of HTML comments (`<!-- generated_by: mighty-instincts candidate_id: ... project_id: ... -->` before the snippet, `<!-- /generated_by: mighty-instincts candidate_id: ... -->` after it), so removing one candidate's rule can never eat into a neighbouring one's, or into text you wrote yourself under that heading. `/evolve-install` also records a sha256 `installed_hash` of exactly what it wrote.

Before touching anything, `/evolve-install` and `/evolve-archive` both check *all* of: the target is not a symlink; its frontmatter (or, for a rule, its start marker) carries this exact `candidate_id` and `project_id`, not merely the marker text somewhere in its prose, and not another candidate's or another project's marker (two projects can easily share one `evolve.targets.skill` directory, e.g. the real default `~/.config/opencode/skills`, without this check they could silently overwrite or delete each other's installs); and, for `/evolve-archive` only, that the file's content still hashes to its own recorded `installed_hash` (otherwise a human has edited it since, and it is left alone). Any mismatch refuses the write (install) or leaves the file in place with a note (archive); the file is never silently clobbered or deleted.

### Usage tracking

`<project data dir>/usage.json` counts every skill/command/agent actually used, generated by this plugin or not: the `skill` tool's own calls by `input.id` (or `input.name`, another field name seen across hosts), slash commands by name whenever a prompt starts with `/`, and subagent spawns (the `subagent`/`task` tool) by `input.agent` (or `input.subagent_type`). This depends on the host naming its tools and input fields one of those ways; a host that names them differently will simply never register usage for that kind, which is why pruning (below) treats a kind's entirely-empty usage bucket as "the signal looks dead," not as proof every installed candidate of that kind is unused. `/evolve-list` and the board read an installed candidate's own usage back by its `suggested_name`.

### Feedback

Whenever an installed candidate's `suggested_name` is actually used, every one of its member instincts gets its `fired` count bumped (the same counter prompt injection bumps on a real trigger match), wherever that member lives (project personal, inherited, or the shared global bucket). A member that has fired at least once is exempt from the maintenance loop's `decay` step, so the habits behind a useful artefact never decay just because people now reach for the artefact instead of the injected instinct directly.

### Pruning (report-only by default)

The weekly evolve step also runs `pruneCandidates`: any *installed* candidate with zero uses in `prune.unusedDays` days (default 30, and only once it has been installed at least that long) is flagged, never touched, unless `prune.auto` is explicitly turned on, in which case it is archived and its installed file removed (the same ownership- and hash-gated removal `/evolve-archive` does). Even in auto mode, a kind whose usage bucket is entirely empty is never auto-archived (see "Usage tracking" above: an all-empty bucket most likely means a dead signal, not genuine disuse), and every candidate is handled in its own try/catch, so one failure is logged and skipped rather than aborting the rest of the sweep. Rule candidates are never flagged this way: an AGENTS.md line has no runtime "it was used" signal to measure. `/evolve-list` separately reports hand-written assets (skills/commands/agents that never carried the `generated_by` marker in the first place) with zero uses in the same window, under "unused (not generated)" - these are never archived or removed, automatically or otherwise, since this plugin did not write them.

## Privacy

- Observations contain scrubbed tool inputs/outputs and prompt text (the same credential-redaction pattern ECC's shell hook uses), clipped to a few thousand characters each.
- Everything stays on disk under the data directory above. Nothing is sent anywhere except the one `generate.text` call per observer run, which goes to whichever model you configured. Prompt injection and the maintenance loop never call a model.
- Only instincts (small learned patterns), never raw observations, can be exported with `/instinct-export`.
- The board state file contains only counts, dates, and short status strings (no observation or finding text).

## How this differs from ECC

ECC's `continuous-learning-v2` skill is built for Claude Code: a bash hook (`observe.sh`) appends observations on every `PreToolUse`/`PostToolUse` event, and a separate daemon (`observer-loop.sh`) periodically spawns a real Claude Code sub-agent (with `Read`/`Write` tools) that analyzes observations and writes instinct files itself.

OpenCode has no hook-daemon model and `ctx.generate.text` has no tools, so this plugin:

- Observes through OpenCode's own `tool.hook`/`session.hook("prompt")` instead of a shell script.
- Injects through `session.hook("context")` instead of editing prompt text, and runs its own maintenance sweep (promote/prune/decay/dedupe/evolve/repair) in-process on a timer, instead of relying on someone to run the CLI's equivalent commands by hand.
- Runs the observer in-process, as a single `generate.text` call triggered from inside the plugin (no daemon, no separate process to start or supervise). Since the model has no tools, the plugin itself parses the model's markdown output and writes the instinct files.
- Installs nothing beyond the plugin itself: no hooks are added to any Claude Code `settings.json`, no scripts are copied anywhere.

`vendor/ecc/instinct-cli.py` (status/import/export/evolve/promote/projects/prune) is used unmodified, so instincts written by this plugin are fully compatible with ECC's own tooling.

## Attribution

The instinct model, CLI, and observer prompt are from [affaan-m/ECC](https://github.com/affaan-m/ECC), vendored verbatim at commit `ef648e01899ba3e8dc6371642deaaf64b4477775` (MIT License; see `NOTICE`).

## Licence

MIT. See `LICENSE`.
