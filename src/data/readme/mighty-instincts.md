# mighty-instincts

An [OpenCode](https://opencode.ai) V2 plugin that observes session activity (tool calls and prompts) into a per-project log, distils it into small learned "instincts," and exposes [ECC](https://github.com/affaan-m/ECC)'s instinct CLI as slash commands.

On by default: the maintenance sweep (`promote`, `prune`, `decay`, `dedupe`, `evolve`, `repair`, `cleanupProjects`, all `true` in `MAINTENANCE_DEFAULTS`) keeps instinct files tidy with no input from you, and prompt injection (`inject.enabled: true`) adds a small `<instincts>` block to every outgoing model request, built fresh from whatever instinct files already exist, at no cost in model calls. Off by default: the observer itself (`observer.enabled: false`, the one background step that actually calls a model and writes new instincts) and the scheduled skill-review backlog check (`review.enabled: false`; `/skill-review` still runs one on demand regardless). Nothing the `evolve` step proposes ever becomes a real skill, command, agent, or AGENTS.md rule by itself either (`prune.auto: false` too): it only ever *proposes* a candidate, and installing, rejecting, or archiving one is always a command you type.

## Install

> `opencode-instincts` was this package's previous name. If your `opencode.json` still references it, replace it with `mighty-instincts`.

Add the plugin to your `opencode.json`, project-local or global at `~/.config/opencode/opencode.json`:

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
    { "package": "mighty-instincts", "options": { "observer": { "enabled": true, "model": "anthropic/claude-haiku-4-5" } } }
  ]
}
```

Restart OpenCode. Requires Python 3 on `PATH` (the plugin runs ECC's vendored `instinct-cli.py` as a subprocess; nothing else is installed). When Python cannot be found or the project cannot otherwise be resolved, this plugin logs a warning and falls back to the shared global instinct bucket instead of failing; the board's Health block also flags it ("python not found: habits are saved to the shared global bucket; set the python option"). On the OpenCode 2 TUI the sidebar board (`mighty-instincts/tui`) loads alongside the server plugin automatically; no extra configuration is needed.

A typo or a wrong-typed option is always reported, not silently dropped: `validateOptions` warns about each unknown key (with a spelling suggestion for a likely typo) or wrongly-typed known key, both to the console and to the board's Health block.

## Options

All options are optional; this is `mergeOptions({})` from `lib/plugin.js`, the real computed defaults (same tree as `DEFAULT_OPTIONS`, also exported):

```json
{
  "disabled": false,
  "python": "python3",
  "observePrompts": true,
  "ignoreTools": ["todowrite", "todoread", "question", "instincts"],
  "ignoreAgents": [],
  "observer": { "enabled": false, "runIntervalMinutes": 15, "minObservations": 40, "maxAnalysisLines": 300, "maxAnalysisBytes": 32768, "notify": true },
  "inject": { "enabled": true, "max": 5, "minConfidence": 0.8, "exclude": [] },
  "board": { "enabled": true, "sections": { "instincts": true, "observations": true, "evals": true }, "refreshSeconds": 30, "observationsRoot": null, "evalRoots": null, "compact": false },
  "maintenance": { "intervalHours": 24, "dryRun": false, "promote": true, "prune": true, "decay": true, "dedupe": true, "evolve": true, "repair": true, "cleanupProjects": true },
  "review": { "enabled": false, "cadenceDays": 7, "sliceSize": 10, "cooldownHours": 24, "timeoutMinutes": 90, "startupDelaySeconds": 120, "pollMinutes": 15, "model": null, "agent": null, "externalDirectories": [] },
  "evolve": { "targets": { "skill": null, "command": null, "agent": null, "rule": null } },
  "prune": { "unusedDays": 30, "auto": false }
}
```

Two keys are omitted above because JSON cannot carry `undefined`: `dataDir` (default unset) and `observer.model` (default unset; required before the observer actually runs).

| Option | Description |
| --- | --- |
| `disabled` | Skip registering everything (hooks, commands, tool, board, maintenance). |
| `dataDir` | Absolute path for ECC's data directory instead of the default; relative values are ignored with a warning. |
| `python` | Python interpreter to run `instinct-cli.py` with. |
| `observePrompts` | Record user prompt text (scrubbed, clipped) as `user_prompt` observations. |
| `ignoreTools` / `ignoreAgents` | Tool names / agent names to never observe. |
| `observer.*` | Background distillation run: model requirement, backoff, zero-write damper, notify rule. See [docs/observer.md](docs/observer.md). |
| `inject.*` | Prompt injection: block size, confidence floor, exclude list. See [docs/instinct.md](docs/instinct.md). |
| `maintenance.*` | The always-on sweep's own steps and their on/off switches, plus `dryRun` and `intervalHours`. See [docs/maintenance.md](docs/maintenance.md). |
| `review.*` | Scheduled task-observer backlog review. See [docs/skill-review.md](docs/skill-review.md). |
| `evolve.targets.*` | Overrides for where `/evolve ... install` writes a candidate (skill/command/agent directory, or the rule file in place of AGENTS.md). See [docs/evolve.md](docs/evolve.md). |
| `prune.unusedDays` / `.auto` | How long an installed, unused candidate is flagged before (opt-in) auto-archiving. See [docs/evolve.md](docs/evolve.md). |
| `board.*` | Sidebar panel and `/board` on/off, which sections show, refresh cadence, and the task-observer/skill-eval search roots. See [docs/board.md](docs/board.md). |

The default `ignoreTools` list keeps the plugin from observing its own tool and the host's own todo/question tools; `ignoreAgents` is empty by default, so every agent (including subagents) is observed unless you add one.

To turn the observer and the scheduled skill review on together:

```json
{
  "observer": { "enabled": true, "model": "anthropic/claude-haiku-4-5" },
  "review": { "enabled": true, "model": "anthropic/claude-haiku-4-5" }
}
```

Set `"maintenance": { "dryRun": true }` to see exactly what the next sweep would do without changing anything: every line it would otherwise log is prefixed `would` instead, with nothing written, moved, or deleted. `/maintain --dry-run` gets the same preview on demand.

## Commands

| Command | Does |
| --- | --- |
| `/board` | Show the instinct board summary as plain text. See [docs/board.md](docs/board.md). |
| `/evolve [...]` | Dashboard, detail, install, reject, archive, 'now', 'clusters', and 'purge' (move the drafts it does not list aside) for evolve candidates (run with no arguments for the grammar's own dashboard). See [docs/evolve.md](docs/evolve.md). |
| `/instinct [...]` | ECC instinct status, per-habit feedback (keep/wrong/mute/unmute), the observer's on/off switch, doctor, and why (what got injected). Run with no arguments, or 'help', for the full verb list. See [docs/instinct.md](docs/instinct.md). |
| `/maintain [...]` | Run the maintenance sweep now (promote/prune/decay/evolve/repair/cleanup); `--dry-run` previews every step; `prune [--dry-run]` runs only the pending-instinct prune. See [docs/maintenance.md](docs/maintenance.md). |
| `/promote [--yes]` | Preview (default) or run (`--yes`) promoting project-scoped instincts that qualify to global scope. See [docs/maintenance.md](docs/maintenance.md). |
| `/skill-review [...]` | Run the task-observer backlog review now (headless session); `status`, `install [n\|all]`, and `undo` manage staged skill updates. See [docs/skill-review.md](docs/skill-review.md). |

Eleven hyphenated commands remain registered for one release as deprecated aliases that forward their old argv shape into the grammar above, each prefixing its reply with a deprecation notice: `/evolve-list`, `/evolve-show`, `/evolve-install`, `/evolve-reject`, and `/evolve-archive` forward into `/evolve`; `/instinct-status`, `/instinct-import`, `/instinct-export`, and `/instinct-projects` forward into `/instinct`; `/instinct-observe` forwards into `/instinct observe`; `/instinct-prune` forwards into `/maintain prune`.

The plugin also registers a model-callable `instincts` tool, a read-only subset of the CLI the agent can call mid-turn: status, projects, export, evolve preview, promote (dry-run only), and prune (dry-run only); it never writes, imports, deletes, or passes `--force`. Its status answer opens with the version the session runs (`plugin: mighty-instincts@<version>`, the form `opencode.json` pins, so a stale session shows against the pin).

On the OpenCode 2 TUI, typing `/evolve` with no arguments is meant to open a pick-a-candidate / pick-an-action / confirm dialog instead of the text dashboard, so a human never has to type an id or a number by hand; typed arguments (`/evolve 2 install`) still go straight to the server command unchanged. Whether the TUI layer or the server command wins the shared `/evolve` name could not be confirmed without a live host; if the host routes the name to the server command instead, the text dashboard appears. See [docs/evolve.md](docs/evolve.md).

Every command above posts its reply back into the session as a synthetic message with `resume: true`, so it surfaces immediately instead of waiting for the next turn; none of them start a model turn. The background observer's own notify message (after an unprompted run nobody is necessarily watching for) keeps `resume: false` instead.

## The board

On the OpenCode 2 TUI, a small, collapsible sidebar panel summarises three sources in plain language: Learned habits (this plugin's own instincts and observer status), Skill notes (the task-observer skill's open backlog), and Skill test (skill-creator's latest benchmark result), plus a Health block whenever something needs attention. Hosts without the sidebar, or anyone who wants the same facts in the chat, can run `/board` instead. The panel header names the installed version:

```
▾ Mighty Instincts v0.11.1
  ▾ Learned habits               ● 16
```

`/board`'s own chat reply says the same facts in prose instead:

```
● Learned habits   29 total, 10 in prompts, 3 used today (14 this week)
```

Both read the exact same `board-state.json` and the same glyph rules, so the two are never out of step on what a given state means; they just say it differently. Run `/board` for the text version; see [docs/board.md](docs/board.md) for every row, glyph, hint, and the Health block.

## Privacy

- Observations contain scrubbed tool inputs/outputs and prompt text (the same credential-redaction pattern ECC's shell hook uses), clipped to a few thousand characters each.
- Everything stays on disk under the data directory (see [docs/data-layout.md](docs/data-layout.md)). This plugin talks to a model in two places: the one `generate.text` call per observer run (on whichever model `observer.model` names), and the headless session `/skill-review` spawns (on `review.model`, or the host's own default model when that is unset). Prompt injection and the maintenance loop never call a model.
- Only instincts (small learned patterns), never raw observations, can be exported with `/instinct export`.
- The board state file contains only counts, dates, and short status strings (no observation or finding text).
- `/instinct mute`/`wrong`/`observer on|off` are the only settings persisted outside `opencode.json`, in a small per-project `.settings.json` next to the observation log (see [docs/data-layout.md](docs/data-layout.md)); nothing in it is sent anywhere either.

## Development

- `npm test` runs the smoke suite (`smoke-test.mjs`) under both `node` and `bun`, exercising the library modules directly against real temp data directories, with no plugin host involved.
- `npm run check` (`scripts/check.sh`) is the one gate `.githooks/pre-commit`, `scripts/release.sh`, and CI all run through, in order: `syntax` (`node --check` on every tracked `.js`/`.mjs` file), `smoke` (the same two-runtime suite `npm test` runs), `dashes` (no em dash or en dash in tracked source, docs, or config files, proven against its own self-test fixture first), and `skeleton` (diffs the release/check/hook scripts against the sibling plugin repo that shares this exact skeleton, skipped with a notice when that sibling cannot be found).
- `npm run hooks` installs the fast pre-commit hook (`git config core.hooksPath .githooks`), which runs only the `syntax` and `dashes` stages against the staged blobs, so a partially staged file is judged on what is actually about to be committed.
- `scripts/sync-skeleton.sh --check`/`--apply` keeps that shared skeleton in sync with the sibling repo (resolved from `--sibling`, then `$MIGHTY_SIBLING_DIR`, then a `mighty-*` directory next to this repo or under `~/dev`); `--apply` copies this repo's own skeleton files onto the sibling with the package name swapped, and never commits anything itself.
- `scripts/release.sh <version>` gates a release on, in order: the current branch being `main` with `HEAD` matching `origin/main` after a fetch, a clean tree apart from `package.json`, `scripts/check.sh` passing in full, then `npm version`, commit, tag, push, and polling both the pushed commit's CI run and npm's published version before reporting success.

## Learn more

Each page below starts with one sentence naming what it covers, and links back to this README.

- [docs/board.md](docs/board.md): the sidebar panel and `/board`, every row, glyph, hint, and the Health block.
- [docs/observer.md](docs/observer.md): the background distillation run, its gates, backoff, and the model requirement.
- [docs/evolve.md](docs/evolve.md): the candidate lifecycle, the `/evolve` grammar, the TUI picker, install locations, usage tracking, and pruning.
- [docs/instinct.md](docs/instinct.md): the `/instinct` verbs, `.settings.json`, muting, doctor, and prompt injection.
- [docs/maintenance.md](docs/maintenance.md): the background sweep's steps and numbers, `/maintain`, and `/promote`.
- [docs/skill-review.md](docs/skill-review.md): the scheduled review, its permissions, staging, and `/skill-review`.
- [docs/data-layout.md](docs/data-layout.md): every file this plugin writes, with its path.
- [docs/ecc.md](docs/ecc.md): how this plugin's implementation differs from upstream ECC.

## Attribution

The instinct model, CLI, and observer prompt are from [affaan-m/ECC](https://github.com/affaan-m/ECC), vendored verbatim at commit `ef648e01899ba3e8dc6371642deaaf64b4477775` (MIT License; see `NOTICE`). `vendor/ecc/instinct-cli.py` (status/import/export/evolve/promote/projects/prune) is used unmodified, so instincts written by this plugin are fully compatible with ECC's own tooling. See [docs/ecc.md](docs/ecc.md) for exactly how this plugin's implementation differs.

## Licence

MIT. See `LICENSE`.
