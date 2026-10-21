# mighty-instincts

An [OpenCode](https://opencode.ai) V2 plugin that observes session activity (tool calls and prompts) into a per-project log, periodically has a cheap model distil that log into small learned "instincts," and exposes [ECC](https://github.com/affaan-m/ECC)'s instinct CLI as slash commands. Nothing becomes live automatically on the write side: `/evolve` only writes inert markdown, and the observer is off by default. On the read side, the plugin adds a small `<instincts>` system-context block to every outgoing model request by default (`inject.enabled: true`); this costs no model call of its own, since it only reads instinct files this plugin (or `/instinct-import`) already wrote. A background maintenance loop (promote, prune, decay, dedupe, evolve) keeps those files tidy without any input from you.

On the OpenCode 2 TUI it also adds a small, collapsible sidebar board summarising three sources of the user's own observation/improvement tooling, in plain language: **Learned habits** (this plugin's own instincts and observer status), **Skill notes** (the task-observer skill's open/parked backlog), and **Skill test** (skill-creator's latest benchmark result). Hosts without the sidebar can run `/board` for the same summary as plain text.

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
    "repair": true
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
| `maintenance.promote` / `.prune` / `.decay` / `.dedupe` / `.evolve` / `.repair` | Turn one maintenance step off without affecting the others. All default to `true`. |
| `board.enabled` | Turn the sidebar board and the `/board` command off entirely. |
| `board.sections.instincts` / `.observations` / `.evals` | Show or hide one block of the board (Learned habits / Skill notes / Skill test, respectively; the option names are unchanged from earlier releases). |
| `board.compact` | Start every board block collapsed to its title line only; still expandable by clicking. Does not affect the panel header. |
| `board.refreshSeconds` | How often the board state file is recomputed on a timer (it is also refreshed on plugin setup and after every observer run). |
| `board.observationsRoot` | Absolute path (or one starting with `~/`) to the task-observer skill's data directory. Defaults to `~/.local/share/opencode/task-observer`. |
| `board.evalRoots` | Array of absolute paths (or ones starting with `~/`) to search for skill-creator benchmark output. Defaults to `["~/.config/opencode/skills", "$TMPDIR/opencode"]`. |

## The board

The board is a small, read-only summary of three sources, written by the server half of the plugin to a per-project `board-state.json` file and polled every 30 seconds (or refreshed on request) by the TUI sidebar panel and by `/board`. Every block has a status circle: a solid green `●` means active and healthy, a solid amber `●` means it needs attention, and a hollow `○` means stale or no data yet. In the sidebar, the panel header and every block title are clickable (collapsing the whole panel, or just that block, down to one line); whichever state you leave them in is remembered across restarts. The header also shows the installed version. Fully expanded, the panel reads something like:

```
▾ Mighty Instincts v0.7.0
  ▾ Learned habits               ● 16
      added to prompts today          5
      used by the agent today         2
      ready to share globally         4
        run /promote to share them
      next learning run              3m
  ▾ Skill notes                  ● 398
      open                           398
      added this week                158
      last reviewed                 never
  ▾ Skill test (pr)              ● 2d
      with skill                     92%
      without                         8%
  ● active  ● needs attention  ○ stale
```

(`/board`'s plain-text version lines the same labels and values up with dots instead of spaces, since it has no layout engine to delegate to: `Learned habits ............... ● 16`. The sidebar's own right edge follows the panel's actual rendered width, which the fixed-width preview above only approximates.)

### Glossary

The board intentionally avoids ECC's own vocabulary ("promote," "prune," "evolve") in favour of plain language. What each row means:

| Row | Meaning |
| --- | --- |
| **added to prompts today** | How many times an instinct was included in a request today (`inject.enabled`). |
| **used by the agent today** | How many times an included (or still-unproven, pending) instinct's trigger actually matched something you typed today. |
| **ready to share globally** | Project instincts confident enough (>= 80%) to promote to the shared global bucket, that are not already there. `/promote` does this by hand; the maintenance loop also does it automatically once an instinct is seen in 2+ projects. |
| **next learning run** | When the background observer is next allowed to run, given `observer.runIntervalMinutes`. |
| **skill candidates** | How many deterministic, no-model-call skill outlines the maintenance loop's `evolve` step has written under `evolved/`, grouping related instincts; see "see `<path>`" to find them. |
| **awaiting first use** | Instincts the observer was not confident enough about to call "learned" yet (the "50% rule," below); they graduate to real instincts once you actually use them once. |
| **kept tidy** | What the maintenance loop did in the last 7 days: `promoted`, `archived`, `merged`, `pruned`, `candidates` (evolved outlines written), whichever of those are nonzero. |
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

## What gets written, and where

Everything lands in ECC's existing on-disk layout so `instinct-cli.py` (and anything else that reads it) sees the same data; the only additions are the bookkeeping files marked below:

```
${CLV2_HOMUNCULUS_DIR or $XDG_DATA_HOME/ecc-homunculus or ~/.local/share/ecc-homunculus}/
└── projects/<project-hash>/
    ├── observations.jsonl          # tool_start / tool_complete / user_prompt records
    ├── observations.archive/       # rotated out at 10 MB
    ├── observer.log                # plugin addition: one line per observer run
    ├── maintenance.log             # plugin addition: one line per maintenance event
    ├── .observer-state.json        # plugin addition: last run time + line count for the gate
    ├── .activity.json              # plugin addition: last-observed/applied/fired-today counters
    ├── board-state.json            # plugin addition: the board's three-block summary
    ├── evolved/<cluster-id>.md     # plugin addition: deterministic candidate-skill outlines
    └── instincts/
        ├── personal/<id>.md        # written by the observer
        ├── inherited/<id>.md       # written by `/instinct-import`
        ├── pending/<id>.md         # unproven instincts (the "50% rule"); never injected
        └── archive/<id>.md         # instincts the maintenance loop decayed below 0.4 confidence; never deleted
```

`observer.log` carries one line per run: `<iso> run: <N> written, <N> rejected, model <provider/model>`, with ` ids: <id>,<id>,...` appended when any instinct was written and ` rejected: <reason>; <reason>; ...` appended when any block was rejected. `maintenance.log` carries one line per maintenance event (`<iso> promote: ...`, `<iso> prune: ...`, `<iso> decay: ...`, `<iso> dedupe: ...`, `<iso> evolve: ...`, `<iso> repair: ...`, `<iso> pending: ...`), plus one `<iso> run: promoted N, archived N, merged N, pruned N, candidates N, repaired N` summary line per sweep, which is what the board's "kept tidy" row and the weekly `evolve` gate both read back. Every suffix and summary line is for anyone reading the files by hand; the board only ever parses a few fixed prefixes, so older log lines without the suffixes still parse the same way.

Project identity (the `<project-hash>` above, or the shared `global` bucket when there is no git project) is resolved by calling ECC's own `detect_project()` in `vendor/ecc/instinct-cli.py`, so this plugin and the CLI agree unless resolution fails, in which case a warning is logged and the shared global bucket is used.

## Commands

| Command | Does |
| --- | --- |
| `/instinct-status` | Show instinct status (project-scoped + global). |
| `/instinct-import <file\|url> [--dry-run] [--min-confidence N] [--scope project\|global]` | Import instincts from a local file or an `https://` URL. |
| `/instinct-export [--output file] [--domain d] [--min-confidence N] [--scope project\|global\|all]` | Export instincts to stdout or a file. |
| `/evolve [--generate] [--limit N]` | Cluster instincts into skill/command/agent candidates; `--generate` writes them under `evolved/`. (Separate from the maintenance loop's own, always-on `evolve` step below, which writes a simpler, deterministic candidate outline without needing `--generate`.) |
| `/promote [id] [--dry-run]` | Promote a specific instinct, or auto-promote everything that qualifies, to global scope. |
| `/instinct-projects` | List known projects and their instinct counts. |
| `/instinct-prune [--dry-run] [--max-age N]` | Delete pending instincts older than the TTL. |
| `/instinct-observe` | Run the observer right now, ignoring the enabled/interval/threshold gates. |
| `/board` | Show the board summary as plain text (Learned habits, Skill notes, Skill test). |

Every command above runs `instinct-cli.py` directly and posts its output back into the session as a synthetic message (`resume: false`); none of them start a model turn. `/instinct-import` and `/promote` pass `--force`, since typing the command is the confirmation that would otherwise come from the CLI's own `y/N` prompt.

## The `instincts` tool

The plugin also registers a tool named `instincts` that the agent can call mid-turn. It only exposes the read-only subset of the CLI: `status`, `projects`, `export` (to stdout only, no `--output`), `evolve` (preview only, no `--generate`), `promote --dry-run`, and `prune --dry-run`. It never passes `--force` and can never import, write, or delete anything.

## Observer behaviour and cost

When `observer.enabled` is `true`, every observed tool call or prompt checks whether enough time (`runIntervalMinutes`) and enough new observations (`minObservations`) have passed since the last run. When both are true (or there is nothing new to observe but an existing instinct is still missing its `summary:` field, see below), the plugin:

1. Reads the most recent observation lines (clipped per-field and capped in total size) plus the existing instinct list, so the model updates instincts instead of duplicating them. Up to 20 existing instincts with no `summary:` field (written before 0.7.0) are listed separately, with an instruction to add only that field and change nothing else.
2. Calls `ctx.generate.text({ prompt, model })` once, with no tools available to the model.
3. Parses `<instinct>...</instinct>` blocks out of the response and validates each one: id, trigger (rejected outright if it carries a leaked `confidence:`/`domain:`/`scope:`/`source:` fragment from a malformed model response), confidence, domain, `summary` (one imperative sentence, required, rejected over 160 characters, trimmed to 120), and no stray `---` in the body.
4. Checks each valid instinct against the existing personal store by trigger+summary word overlap (`maintenance.dedupe`); a close match (>= 60% of the shorter side's significant words) is merged into the existing file instead of written as a duplicate.
5. Writes anything left to `instincts/personal/`, except an instinct with confidence exactly `0.5` and no `## Evidence` section, which goes to `instincts/pending/` instead (the "50% rule": unproven until it is actually used once).
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

Each successful injection is counted in `.activity.json` (`appliedToday`, reset at UTC midnight) and shown on the board as "added to prompts today." When an included instinct's `trigger` shares at least 3 significant words (5+ letters, case-insensitive, common filler words removed) with the latest user message, that instinct's `fired` count (in its own frontmatter) is incremented, and the day's total is shown on the board as "used by the agent today." A pending instinct (the "50% rule," above) is checked for firing exactly the same way, but is never included in the injected block itself; once it fires, the maintenance loop promotes it to a real instinct. The observer never sees the injected block itself: `lib/observe.js` still strips any legacy `<instincts>...</instincts>` block it finds in prompt text (harmless now that injection no longer writes into prompt text at all, kept for defence against a residual block from before 0.7.0).

## Maintenance

A background sweep keeps the instinct stores tidy without you ever running a command. It runs right after every observer run, and otherwise at least every `maintenance.intervalHours` (default 24), guarded against overlapping with itself. Every step below is on by default and logs what it did to `maintenance.log`; any one can be turned off independently (`maintenance.promote: false`, etc.).

- **promote**: an instinct confident enough (>= 80%, the same threshold ECC's own CLI uses) whose id (or a trigger with 70%+ word overlap, so two projects that learned "the same" thing under different ids still count) appears in 2+ distinct project stores is copied to the shared global bucket. Reimplemented directly over `projects/*/instincts/personal/*.md`; never shells out to Python for this.
- **prune**: deletes files in `instincts/pending/` older than 30 days (ECC's own default pending TTL); logs a warning for ones within 7 days of expiring.
- **decay**: a personal instinct that has never fired, past 30 days old, loses 0.05 confidence per full week since its last decay; once that drops it below 0.4 it is moved (never deleted) to `instincts/archive/`.
- **dedupe**: before the observer writes a new instinct, its trigger+summary is compared against every existing personal instinct; a close match (>= 60% word overlap) gets its confidence raised instead of creating a near-duplicate file (see step 4 under "Observer behaviour" above).
- **evolve**: groups personal instincts by domain and by word overlap into clusters of 3+, and writes a deterministic candidate-skill outline (title, member ids and summaries, a suggested `SKILL.md` description, no model call) for each to `evolved/<cluster-id>.md`. Runs at most once a week, regardless of how often the sweep itself runs.
- **repair**: a one-off, idempotent cleanup for a personal instinct whose trigger carries a leaked trailing frontmatter fragment (e.g. `..., confidence: 0.8`), the shape a parser bug before 0.7.0 (or a hand-edited file) could leave behind.

### Trying it safely

Set `"maintenance": { "dryRun": true }` to see exactly what the next sweep would do without changing anything: every line it would otherwise log to `maintenance.log` is prefixed `would` instead (`would promote: ...`, `would archive: ...`, `would merge ... into ...`, and so on), with no file written, moved, or deleted. Turn it back to `false` (the default) once you are happy with what you see.

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
