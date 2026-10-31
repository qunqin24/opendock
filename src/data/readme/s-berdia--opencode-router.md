# opencode-router

[![npm version](https://img.shields.io/npm/v/@s-berdia/opencode-router)](https://www.npmjs.com/package/@s-berdia/opencode-router)
[![npm downloads](https://img.shields.io/npm/dm/@s-berdia/opencode-router)](https://www.npmjs.com/package/@s-berdia/opencode-router)
[![CI](https://github.com/s-berdia/Opencode_router/actions/workflows/ci.yml/badge.svg)](https://github.com/s-berdia/Opencode_router/actions/workflows/ci.yml)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange)](#development-status)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> **Early development.** opencode-router is under active development. Expect breaking
> changes, incomplete model/provider support, and bugs. Issues and pull requests are very
> welcome — see [Contributing](#contributing). Do not rely on it for production-critical
> work yet.

**Switch models before you hit your [OpenCode](https://opencode.ai) limit.** Automatic
model routing and quota failover for the **Go**, **Go Plus**, **Go Teams**, and **Free**
plans.

![opencode-router demo: the scorecard gives each agent a model, and the build agent moves to a free model at 85% of the shared Go allowance](docs/router-demo.gif)

[Watch the demo in full quality (MP4, 25 seconds)](docs/router-demo.mp4?raw=true)

opencode-router gives each OpenCode agent the best model for its job and for your plan.
All Go models share one usage allowance, and the router estimates how much of it you
used. When the allowance is near its limit, the router moves the agents to free models,
so your work does not stop. When the use falls again, the router moves them back.

For full step-by-step instructions, read the [usage guide](./USAGE.md). Before you use
the router, read its [known limits](./USAGE.md#11-known-limits).

## Development status

opencode-router is **alpha software**. The Go allowance rules, provider APIs, model
catalog, and cap tables change often, and this project has known gaps and bugs. The
configuration format and routing behavior can change between releases.

Please help make it better:

- [Report a bug](https://github.com/s-berdia/Opencode_router/issues/new?template=bug_report.yml)
  with your OpenCode version, provider/plan, and a short log or status output.
- [Request a model score](https://github.com/s-berdia/Opencode_router/issues/new?template=model_score.yml)
  or send a pull request with a source.
- Ask questions and share ideas in [Discussions](https://github.com/s-berdia/Opencode_router/discussions).
- Pick up a [`good first issue`](https://github.com/s-berdia/Opencode_router/labels/good%20first%20issue)
  if you want to contribute code. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## Features

- **One model per job.** The `plan` agent gets the most intelligent model that your plan
  can supply. The `build` agent gets a fast model with a high limit. The `explore` agent and
  the internal helpers (titles, summaries, compaction) get fast, low-cost models.
- **Plan-aware.** Four plan profiles: `go`, `go-plus`, `go-teams`, and `free`. Each
  profile uses the monthly cap of each model to calculate how many tokens the model can
  supply in 5 hours, and each profile can reach a different set of models (see below).
  Caps are fetched from the Go docs on refresh/status, with a cached fallback.
- **Automatic failover.** The `plan`, `build`, `general`, and `explore` agents each have a
  ranked list of up to 4 models. On Go, Go Plus, and Go Teams, the last one is a free
  model. At 85% of the shared Go allowance, or after a usage-limit error, the agents move
  to the next usable model: a metered Zen model when `zenPaid` is on, or the free model.
  After a rate-limit or overload error of one model, the agent moves to the next model in
  its list.
- **Live apply.** The router changes the models in the running OpenCode session. You do
  not have to restart OpenCode after a refresh.
- **Clear results.** A scorecard shows each model and its scores. With `--verbose`, it
  also shows the source of each score.

## Plan tiers

| Plan | Models the router may use |
| :-- | :-- |
| `free` | `opencode/*` models with `free: true` only |
| `go` | every `opencode-go/*` model, plus `opencode/*` $0 models |
| `go-plus` | Go Plus caps, plus `opencode/*` $0 models |
| `go-teams` | Go Teams caps, plus `opencode/*` $0 models |

The router never puts a paid `opencode/*` model in a chain unless you set
`"zenPaid": true`. Go Plus and Go Teams are Go tiers, not Zen credit; paid Zen is a
separate Console balance. Paid Zen models are metered per token and do not use the shared
Go allowance; the scorecard shows them as `paid` with `metered` in the allowance columns.

The router cannot tell Go from Go Plus or Go Teams from the catalog; it assumes `go`.
Set `plan` to `go-plus` or `go-teams` if you subscribe to those tiers.

All Go models share one usage allowance. Each step adds its token cost divided by that
model's monthly cap, so a $15-cap model consumes the meter four times faster per dollar
than a $60-cap model. The 5-hour window starts with the first Go request; weekly and
monthly repeat on the console's reset timestamps. Reaching 100% in a window blocks every
paid Go model; unlimited Go free models still work. The caps and data policies are
fetched from the [Go docs](https://opencode.ai/v2/docs/console/go) during `refresh`,
`status`, `plan`, and `eval`, and cached in `router/go-caps.json`.

## Requirements

| Item | Version or condition |
| :-- | :-- |
| OpenCode | OpenCode 2 (plugin API 2.x; tested with 2.2) |
| Node.js | 20 or later, on your `PATH` (the slash commands run the router CLI) |
| OpenCode plan | Go, Go Plus, Go Teams, or no subscription (free models only) |
| Model catalog | Start OpenCode one time before you install. OpenCode then writes `~/.cache/opencode/models.json`. |

## Quick start

If you have the OpenCode command-line tool, run this command. Then close OpenCode, start
it again, and go to step 4.

```bash
opencode plugin @s-berdia/opencode-router --global
```

If you do not have the command-line tool, edit the config file:

1. Open your global OpenCode config file in a text editor:
   - Windows: `C:\Users\<your-user-name>\.config\opencode\opencode.json`
   - macOS and Linux: `~/.config/opencode/opencode.json`

   If the file does not exist, make it. If you have `opencode.jsonc`, use that file.
2. Add the plugin to the `plugins` list:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": ["@s-berdia/opencode-router"]
   }
   ```

3. Save the file. Close OpenCode and start it again.
4. In the OpenCode prompt, type this command and push Enter:

   ```text
   /refresh-routing
   ```

5. Read the scorecard. It shows the model for each agent.

The router now selects models automatically. You do not have to do more.

OpenCode does not update plugins automatically. When a new version of the router is
available, the router shows a note. Then type `/routing-update` and restart OpenCode.
See [Update the router](./USAGE.md#12-update-the-router).

## Commands

### In OpenCode

| Command | What it does |
| :-- | :-- |
| `/refresh-routing` | Calculate the routing table again, apply it, and show the scorecard |
| `/routing-status` | Show the model in use for each agent (after failover) and the estimated use of the Go allowance |
| `/routing-plan go-plus` | Save a plan profile (`go`, `go-plus`, `go-teams`, or `free`) and apply it immediately |
| `/routing-eval` | Send one test prompt to the `build` models and write a report |
| `/routing-update` | Look for a newer version and remove the old copy that OpenCode keeps. Then restart OpenCode |

### In a terminal

The package also has a command-line tool. Use it for scripts, CI, or scheduled jobs.

```bash
npx @s-berdia/opencode-router refresh --dry-run      # show the scorecard, write nothing
npx @s-berdia/opencode-router refresh --plan go      # calculate and write opencode.json
npx @s-berdia/opencode-router status                 # models in use and quota use
npx @s-berdia/opencode-router plan go-plus           # save the plan profile and rebuild
npx @s-berdia/opencode-router cat                    # catalog file, date, model count
npx @s-berdia/opencode-router install --scope global # prepare the config and commands folder
npx --prefer-online @s-berdia/opencode-router@latest update # remove OpenCode's old copy
npx @s-berdia/opencode-router --help                 # all commands and options
```

These commands work in PowerShell, CMD, Git Bash, and macOS or Linux shells.

| Option | Meaning |
| :-- | :-- |
| `--plan <go\|go-plus\|go-teams\|free>` | Plan profile for this run |
| `--scope <project\|global>` | Which `opencode.json` to write. Default: `project` in a project folder, else `global` |
| `--catalog <file>` | Use a different `models.json` catalog file |
| `--offline` | Do not fetch the Go cap table; use the cached/bundled copy |
| `--dry-run` | Do not write `opencode.json` |
| `--no-apply` | Write `opencode.json`, but do not send the change to a running server |
| `--json` | Print JSON, not a table |
| `--verbose` | Show the source of each score in the scorecard |

## Configuration

The router works with no configuration. To change its behavior, make a file named
`router.config.json`:

- Global (all projects): `~/.config/opencode/router.config.json`
- One project: `<project>/.opencode/router.config.json`

Values in the project file replace values in the global file. If a file has a JSON error
or a value that is not valid, the router ignores it and shows a note in the scorecard.

```json
{
  "plan": "go",
  "softThreshold": 0.85,
  "privacy": { "freeModelsOk": true, "trainingOk": true },
  "zenPaid": false,
  "denyModels": ["*-preview"],
  "allowModels": [],
  "caps": { "fetch": true, "ttlHours": 24 },
  "allowance": { "weekStart": "2026-10-25T23:57:00Z", "monthStart": "2026-10-26T19:57:00Z" },
  "weights": { "build": { "intelligence": 0.4, "speed": 0.25, "endurance": 0.35 } },
  "scores": { "opencode-go/deepseek-v4.1-flash": { "intelligence": 82 } }
}
```

| Key | Default | Meaning |
| :-- | :-- | :-- |
| `plan` | `go` when Go models are present | `go`, `go-plus`, `go-teams`, or `free`. The paid tier is not detectable from the catalog; set it yourself |
| `mode` | `auto` | How the router picks per message: `auto` (router picks, a manual pick in the UI wins for the session), `failover` (router moves agents only after limit errors), or `off` (no per-message changes) |
| `chainDepth` | 4 for agents, 3 for helpers | Number of models in each failover list, including the free model at the end. `roles.<role>.chainDepth` wins over it |
| `softThreshold` | `0.85` | Move the agents to their free model when the use of the shared Go allowance reaches this part of a window's limit (0.85 = 85%; the Go limit is 100%) |
| `privacy.freeModelsOk` | `true` | `false` keeps `plan`, `build`, and `general` off free models |
| `privacy.trainingOk` | `true` | `false` also excludes paid models that train on request data, such as Muse Spark Contributor |
| `zenPaid` | `false` | `true` allows paid `opencode/*` Zen models. Go Plus/Teams do not include Zen credit |
| `caps.fetch` | `true` | Fetch the Go monthly caps/data policies from the docs |
| `caps.ttlHours` | `24` | Use the cached cap table for this many hours |
| `caps.url` | Go docs URL | A different page with the same pricing tables |
| `allowance.weekStart`, `allowance.monthStart` | first recorded step | ISO starts from the console, for exact weekly/monthly resets |
| `denyModels` | `[]` | Model IDs to never use. `*` and `?` wildcards are permitted |
| `allowModels` | `[]` | If not empty, use only these model IDs |
| `weights.<role>` | see `model-scores.json` | Weights for `intelligence`, `speed`, `endurance`, and `reliability`. Use values that add up to 1 |
| `scores.<model-id>` | see `model-scores.json` | Your own `intelligence` and `speed` values (0 to 100). These are pins: they always win over the generated snapshot |
| `roles.<role>` | see `model-scores.json` | Change `variant`, `chainDepth`, `requires`, `preferFree`, or `diversifyFamily` for one role |
| `blend` | `{ "input": 0.75, "output": 0.25, "cacheRead": 0.1 }` | Token mix used for the endurance estimate; the allowance ledger prices each token kind from the catalog instead |
| `enduranceScale` | `{ "minTokensPer5h": 0.25, "maxTokensPer5h": 40 }` | Millions of tokens per 5 hours that give an endurance score of 0 and 100 |
| `feeds` | `{ "enabled": false }` | Optional benchmark feed: `{ "enabled": true, "url": "https://...", "timeoutMs": 5000 }` |
| `updateCheck` | `true` | Once each 24 hours, ask npm for the newest router version. `false` stops the check |

The [usage guide](./USAGE.md#6-change-the-router-settings) has examples for each key.

## How scoring works

```text
score = w_intelligence * intelligence
      + w_speed        * speed
      + w_endurance    * endurance
      + w_reliability  * reliability
      + plan preference
      - penalty for a model that has no entry in model-scores.json
```

- **Intelligence and speed** (0 to 100) come from, in this order: your `scores`
  pins, the generated benchmark snapshot in `model-scores.json`, an optional
  benchmark feed, and then name patterns. The committed snapshot is generated
  from Artificial Analysis data published through OpenRouter. See
  [how the router selects models](./docs/model-selection.md).
- **Reliability** (0 to 100) is seven-day uptime from OpenCode's public status
  page. A model the page does not follow gets a neutral prior, not a penalty.
- **Endurance** (0 to 100) comes from your quota. The router divides the 5-hour allowance
  (20% of the monthly cap) by the cost of one million tokens. A free model, or a model
  with no limit, gets 100. The caps are fetched from the Go docs, so a cap change
  immediately changes the score and the routing eligibility.
- **Plan preference** puts the subscription models included in your plan before metered
  paid models, and both before free models. The `explore` agent and the internal helpers
  prefer free models. See [plan tiers](#plan-tiers).
- With `--verbose`, the scorecard shows the source of each score: `override` (your
  `scores` or an explicit `model-scores.json` override), `benchmark` (generated
  intelligence), `table` (a committed speed or reliability value), `feed`, `cap` (from
  quota), `heuristic` (name pattern), `status` (measured uptime), or `default` (no match).

## Files that the router writes

| File | Contents |
| :-- | :-- |
| `~/.config/opencode/router/ledger.json` | Spend and tokens per model, the shared Go allowance buckets and window starts, and cooldowns |
| `~/.config/opencode/router/go-caps.json` | The fetched Go monthly caps and data policies |
| `~/.config/opencode/router/routing-table.json` | The last routing table |
| `~/.config/opencode/router/last-apply.json` | The result of the last live apply |
| `~/.config/opencode/router/eval-report.md` | The report of the last `/routing-eval` |
| `~/.config/opencode/router/update-check.json` | The time of the last update check and the newest version on npm |
| `~/.config/opencode/router/hud.json` | The active mode, the sessions with a manual pick, and the model of the last message per session (read by the terminal widget) |
| `~/.config/opencode/router/live-models.json` | The model ids the running OpenCode server last reported, so CLI commands do not route to a model that was removed |
| `opencode.json` or `opencode.jsonc` (global, or the project file with `--scope project`) | `model`, `small_model`, and `agent.<role>.model` and `variant`. Comments and all other keys stay. A file with a JSON error is not changed |

If `XDG_CONFIG_HOME` is set, the router uses `$XDG_CONFIG_HOME/opencode` in place of
`~/.config/opencode`. Do not commit the `router/` folder. It contains your usage data.

## Privacy

Free models are not all the same: DeepSeek V4.1 Flash Free and GLM-5.3-Flash Free are
zero-retention, Beam Free retains data for 30 days, and MiMo, Nemotron, Flint, and Big
Pickle may collect data. The scorecard marks free models `free*` and shows a **Data
policy** note when an active model trains on request data. To keep your main work off all
free models, set `"privacy": { "freeModelsOk": false }`. To exclude paid training models
too (for example Muse Spark Contributor), set `"privacy": { "trainingOk": false }`. To
never use a specific model, use `denyModels`. With either privacy setting, the agents may
have no free fallback, so they stop when the Go allowance runs out.

During `refresh`, `status`, `plan`, and `eval`, and once per day from the plugin, the
router fetches the public Go docs page to read the monthly caps and data policies. It
sends no prompts or account data. To stop this, set `"caps": { "fetch": false }` or use
`--offline`; the cached/bundled table then applies.

Once each 24 hours, the router also sends one request to `registry.npmjs.org` to get the
newest version number of the router. To stop this, set `"updateCheck": false`.

## Development

```bash
git clone https://github.com/s-berdia/Opencode_router.git
cd Opencode_router
npm install
npm run build       # compile to dist/
npm test            # run the tests
npm run typecheck   # check the types
```

To use your local build in OpenCode, put the absolute path of the folder in the `plugins`
list. Example for Windows: `"plugins": ["file:///C:/code/Opencode_router"]`. Run
`npm run build` after each change, then restart OpenCode.

## Contributing

This project is early and actively looking for contributors. Bug reports, model scores,
documentation fixes, and code changes are all welcome. Read
[CONTRIBUTING.md](./CONTRIBUTING.md) for the setup and the rules. For questions and ideas,
use [Discussions](https://github.com/s-berdia/Opencode_router/discussions). If you find a
bug, please include the output of `opencode-router status` and the relevant lines from
`~/.local/share/opencode/log/opencode.log`.

## License

[MIT](./LICENSE)
