# opencode-instincts

An [OpenCode](https://opencode.ai) V2 plugin that observes session activity (tool calls and prompts) into a per-project log, periodically has a cheap model distil that log into small learned "instincts," and exposes [ECC](https://github.com/affaan-m/ECC)'s instinct CLI as slash commands. Nothing becomes live on its own: `/evolve` only writes inert markdown, the observer is off by default, and the plugin never injects instincts into a prompt.

## Install

Add the plugin to your `opencode.json` (project or global at `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-instincts"]
}
```

To set options, use the object form instead of the bare string:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-instincts",
      "options": {
        "observer": { "enabled": true, "model": "anthropic/claude-haiku-4-5" }
      }
    }
  ]
}
```

Restart OpenCode. Requires Python 3 on `PATH` (the plugin runs ECC's vendored `instinct-cli.py` as a subprocess; nothing else is installed).

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
  }
}
```

| Option | Description |
| --- | --- |
| `disabled` | Skip registering everything (hooks, commands, tool). |
| `dataDir` | Absolute path to use instead of the default ECC data directory; relative values are ignored with a warning. Maps to `CLV2_HOMUNCULUS_DIR` for the vendored CLI. |
| `python` | Python interpreter to run `instinct-cli.py` with. |
| `observePrompts` | Record user prompt text (scrubbed, clipped to 2000 chars) as `user_prompt` observations. |
| `ignoreTools` / `ignoreAgents` | Tool names / agent names to never observe. |
| `observer.enabled` | Turn on the background distillation run described below. |
| `observer.model` | `"provider/model"` to run `generate.text` with. When unset, the host's default model is used (and a one-time warning is logged). |
| `observer.runIntervalMinutes` / `observer.minObservations` | Minimum time and minimum new observation count between automatic runs. |
| `observer.maxAnalysisLines` | How many of the most recent observation lines to show the model per run. |
| `observer.notify` | Post a synthetic summary message into the triggering session after a background run. |

## What gets written, and where

Everything lands in ECC's existing on-disk layout so `instinct-cli.py` (and anything else that reads it) sees the same data; the only additions are the two bookkeeping files marked below:

```
${CLV2_HOMUNCULUS_DIR or $XDG_DATA_HOME/ecc-homunculus or ~/.local/share/ecc-homunculus}/
└── projects/<project-hash>/
    ├── observations.jsonl          # tool_start / tool_complete / user_prompt records
    ├── observations.archive/       # rotated out at 10 MB
    ├── observer.log                # plugin addition: one line per observer run
    ├── .observer-state.json        # plugin addition: last run time + line count for the gate
    └── instincts/
        ├── personal/<id>.md        # written by the observer
        └── inherited/<id>.md       # written by `/instinct-import`
```

Project identity (the `<project-hash>` above, or the shared `global` bucket when there is no git project) is resolved by calling ECC's own `detect_project()` in `vendor/ecc/instinct-cli.py`, so this plugin and the CLI agree unless resolution fails, in which case a warning is logged and the shared global bucket is used.

## Commands

| Command | Does |
| --- | --- |
| `/instinct-status` | Show instinct status (project-scoped + global). |
| `/instinct-import <file\|url> [--dry-run] [--min-confidence N] [--scope project\|global]` | Import instincts from a local file or an `https://` URL. |
| `/instinct-export [--output file] [--domain d] [--min-confidence N] [--scope project\|global\|all]` | Export instincts to stdout or a file. |
| `/evolve [--generate] [--limit N]` | Cluster instincts into skill/command/agent candidates; `--generate` writes them under `evolved/`. |
| `/promote [id] [--dry-run]` | Promote a specific instinct, or auto-promote everything that qualifies, to global scope. |
| `/instinct-projects` | List known projects and their instinct counts. |
| `/instinct-prune [--dry-run] [--max-age N]` | Delete pending instincts older than the TTL. |
| `/instinct-observe` | Run the observer right now, ignoring the enabled/interval/threshold gates. |

Every command runs `instinct-cli.py` directly and posts its output back into the session as a synthetic message (`resume: false`); none of them start a model turn. `/instinct-import` and `/promote` pass `--force`, since typing the command is the confirmation that would otherwise come from the CLI's own `y/N` prompt.

## The `instincts` tool

The plugin also registers a tool named `instincts` that the agent can call mid-turn. It only exposes the read-only subset of the CLI: `status`, `projects`, `export` (to stdout only, no `--output`), `evolve` (preview only, no `--generate`), `promote --dry-run`, and `prune --dry-run`. It never passes `--force` and can never import, write, or delete anything.

## Observer behaviour and cost

When `observer.enabled` is `true`, every observed tool call or prompt checks whether enough time (`runIntervalMinutes`) and enough new observations (`minObservations`) have passed since the last run. When both are true, the plugin:

1. Reads the most recent observation lines (clipped per-field and capped in total size) plus the existing instinct list, so the model updates instincts instead of duplicating them.
2. Calls `ctx.generate.text({ prompt, model })` once, with no tools available to the model.
3. Parses `<instinct>...</instinct>` blocks out of the response, validates each one (id, trigger, confidence, domain, no stray `---` in the body), and writes the valid ones to `instincts/personal/`.
4. Logs the result to `observer.log` and, if `observer.notify` is true, posts a summary into the session.

This is at most one `generate.text` call per interval, on whatever model you set in `observer.model`. `/instinct-observe` runs the same logic on demand, bypassing the enabled/interval/threshold gates (it still needs a model, from `observer.model` or the host default).

## Privacy

- Observations contain scrubbed tool inputs/outputs and prompt text (the same credential-redaction pattern ECC's shell hook uses), clipped to a few thousand characters each.
- Everything stays on disk under the data directory above. Nothing is sent anywhere except the one `generate.text` call per observer run, which goes to whichever model you configured.
- Only instincts (small learned patterns), never raw observations, can be exported with `/instinct-export`.

## How this differs from ECC

ECC's `continuous-learning-v2` skill is built for Claude Code: a bash hook (`observe.sh`) appends observations on every `PreToolUse`/`PostToolUse` event, and a separate daemon (`observer-loop.sh`) periodically spawns a real Claude Code sub-agent (with `Read`/`Write` tools) that analyzes observations and writes instinct files itself.

OpenCode has no hook-daemon model and `ctx.generate.text` has no tools, so this plugin:

- Observes through OpenCode's own `tool.hook`/`session.hook("prompt")` instead of a shell script.
- Runs the observer in-process, as a single `generate.text` call triggered from inside the plugin (no daemon, no separate process to start or supervise). Since the model has no tools, the plugin itself parses the model's markdown output and writes the instinct files.
- Installs nothing beyond the plugin itself: no hooks are added to any Claude Code `settings.json`, no scripts are copied anywhere.

`vendor/ecc/instinct-cli.py` (status/import/export/evolve/promote/projects/prune) is used unmodified, so instincts written by this plugin are fully compatible with ECC's own tooling.

## Attribution

The instinct model, CLI, and observer prompt are from [affaan-m/ECC](https://github.com/affaan-m/ECC), vendored verbatim at commit `ef648e01899ba3e8dc6371642deaaf64b4477775` under `vendor/ecc/` (MIT License; see `NOTICE`).

## Licence

MIT. See `LICENSE`.
