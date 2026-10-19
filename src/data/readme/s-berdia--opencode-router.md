# opencode-router

[![npm version](https://img.shields.io/npm/v/@s-berdia/opencode-router)](https://www.npmjs.com/package/@s-berdia/opencode-router)
[![npm downloads](https://img.shields.io/npm/dm/@s-berdia/opencode-router)](https://www.npmjs.com/package/@s-berdia/opencode-router)
[![CI](https://github.com/s-berdia/Opencode_router/actions/workflows/ci.yml/badge.svg)](https://github.com/s-berdia/Opencode_router/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

**Switch models before you hit your [OpenCode](https://opencode.ai) limit.** Automatic
model routing and quota failover for the **Go**, **Go Plus**, and **Free** plans.

![opencode-router demo: the scorecard gives each agent a model, and the build agent moves to a free model at 85% of the shared Go allowance](docs/router-demo.gif)

[Watch the demo in full quality (MP4, 25 seconds)](docs/router-demo.mp4?raw=true)

opencode-router gives each OpenCode agent the best model for its job and for your plan.
All Go models share one usage allowance, and the router estimates how much of it you
used. When the allowance is near its limit, the router moves the agents to free models,
so your work does not stop. When the use falls again, the router moves them back.

For full step-by-step instructions, read the [usage guide](./USAGE.md). Before you use
the router, read its [known limits](./USAGE.md#11-known-limits).

## Features

- **One model per job.** The `plan` agent gets the most intelligent model that your plan
  can supply. The `build` agent gets a fast model with a high limit. The `explore` agent and
  the internal helpers (titles, summaries, compaction) get fast, low-cost models.
- **Plan-aware.** Three plan profiles: `go`, `go-plus`, and `free`. Each profile uses the
  monthly allowance of each model to calculate how many tokens the model can supply in
  5 hours.
- **Automatic failover.** The `plan`, `build`, `general`, and `explore` agents each have a
  ranked list of up to 4 models. On Go and Go Plus, the last one is a free model. At 85%
  of the shared Go allowance, or after a usage-limit error, the agents move to their free
  model. After a rate-limit or overload error of one model, the agent moves to the next
  model in its list.
- **Live apply.** The router changes the models in the running OpenCode session. You do
  not have to restart OpenCode after a refresh.
- **Clear results.** A scorecard shows each model and its scores. With `--verbose`, it
  also shows the source of each score.

## Requirements

| Item | Version or condition |
| :-- | :-- |
| OpenCode | A version that supports plugins (tested with plugin API 1.19) |
| Node.js | 20 or later, on your `PATH` (the slash commands run `node`) |
| OpenCode plan | Go, Go Plus, or no subscription (free models only) |
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
2. Add the plugin to the `plugin` list:

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["@s-berdia/opencode-router"]
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
| `/routing-plan go-plus` | Save a plan profile (`go`, `go-plus`, or `free`) and apply it immediately |
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
npx @s-berdia/opencode-router install --scope global # write slash-command files
npx @s-berdia/opencode-router@latest update          # remove OpenCode's old copy
npx @s-berdia/opencode-router --help                 # all commands and options
```

These commands work in PowerShell, CMD, Git Bash, and macOS or Linux shells.

| Option | Meaning |
| :-- | :-- |
| `--plan <go\|go-plus\|free>` | Plan profile for this run |
| `--scope <project\|global>` | Which `opencode.json` to write. Default: `project` in a project folder, else `global` |
| `--catalog <file>` | Use a different `models.json` catalog file |
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
  "privacy": { "freeModelsOk": true },
  "denyModels": ["*-preview"],
  "allowModels": [],
  "weights": { "build": { "intelligence": 0.4, "speed": 0.25, "endurance": 0.35 } },
  "scores": { "opencode-go/deepseek-v4.1-flash": { "intelligence": 82 } }
}
```

| Key | Default | Meaning |
| :-- | :-- | :-- |
| `plan` | detected from your catalog | `go`, `go-plus`, or `free` |
| `chainDepth` | 4 for agents, 3 for helpers | Number of models in each failover list, including the free model at the end. `roles.<role>.chainDepth` wins over it |
| `softThreshold` | `0.85` | Move the agents to their free model when the use of the shared Go allowance reaches this part of a window's limit (0.85 = 85%) |
| `privacy.freeModelsOk` | `true` | `false` keeps `plan`, `build`, and `general` off free models |
| `denyModels` | `[]` | Model IDs to never use. `*` and `?` wildcards are permitted |
| `allowModels` | `[]` | If not empty, use only these model IDs |
| `weights.<role>` | see `model-scores.json` | Weights for `intelligence`, `speed`, and `endurance`. Use values that add up to 1 |
| `scores.<model-id>` | see `model-scores.json` | Your own `intelligence` and `speed` values (0 to 100) |
| `roles.<role>` | see `model-scores.json` | Change `variant`, `chainDepth`, `requires`, `preferFree`, or `diversifyFamily` for one role |
| `blend` | `{ "input": 0.75, "output": 0.25, "cacheRead": 0.1 }` | Token mix used to calculate the cost of one million tokens |
| `enduranceScale` | `{ "minTokensPer5h": 0.25, "maxTokensPer5h": 40 }` | Millions of tokens per 5 hours that give an endurance score of 0 and 100 |
| `feeds` | `{ "enabled": false }` | Optional benchmark feed: `{ "enabled": true, "url": "https://...", "timeoutMs": 5000 }` |
| `updateCheck` | `true` | Once each 24 hours, ask npm for the newest router version. `false` stops the check |

The [usage guide](./USAGE.md#6-change-the-router-settings) has examples for each key.

## How scoring works

```text
score = w_intelligence * intelligence
      + w_speed        * speed
      + w_endurance    * endurance
      + plan preference
      - penalty for a model that has no entry in model-scores.json
```

- **Intelligence and speed** (0 to 100) come from, in this order: your `scores`, the
  benchmark feed (if enabled), and then name patterns in `model-scores.json`.
- **Endurance** (0 to 100) comes from your quota. The router divides the 5-hour allowance
  (20% of the monthly allowance) by the cost of one million tokens. A free model, or a
  model with no limit, gets 100.
- **Plan preference** puts the subscription models that you pay for before free models.
  The `explore` agent and the internal helpers prefer free models.
- With `--verbose`, the scorecard shows the source of each score: `override` (your
  `scores` or `model-scores.json`), `feed`, `cap` (from quota), `heuristic` (name pattern),
  or `default` (no match).

## Files that the router writes

| File | Contents |
| :-- | :-- |
| `~/.config/opencode/router/ledger.json` | Spend and tokens per model, the use of the shared Go allowance in the last 30 days, and cooldowns |
| `~/.config/opencode/router/routing-table.json` | The last routing table |
| `~/.config/opencode/router/last-apply.json` | The result of the last live apply |
| `~/.config/opencode/router/eval-report.md` | The report of the last `/routing-eval` |
| `~/.config/opencode/router/update-check.json` | The time of the last update check and the newest version on npm |
| `opencode.json` or `opencode.jsonc` (global, or the project file with `--scope project`) | `model`, `small_model`, and `agent.<role>.model` and `variant`. Comments and all other keys stay. A file with a JSON error is not changed |

If `XDG_CONFIG_HOME` is set, the router uses `$XDG_CONFIG_HOME/opencode` in place of
`~/.config/opencode`. Do not commit the `router/` folder. It contains your usage data.

## Privacy

Models with `-free` in their name can collect your prompts for training. The scorecard
marks them `free*`. To keep your main work off these models, set
`"privacy": { "freeModelsOk": false }`. To never use them, set `"denyModels": ["*-free"]`.
With either setting, the agents have no free model to move to, so they stop when the Go
allowance runs out.

Once each 24 hours, the router sends one request to `registry.npmjs.org` to get the
newest version number of the router. It sends no other data. To stop this, set
`"updateCheck": false`.

## Development

```bash
git clone https://github.com/s-berdia/Opencode_router.git
cd Opencode_router
npm install
npm run build       # compile to dist/
npm test            # run the tests
npm run typecheck   # check the types
```

To use your local build in OpenCode, put the absolute path of the folder in the `plugin`
list. Example for Windows: `"plugin": ["file:///C:/code/Opencode_router"]`. Run
`npm run build` after each change, then restart OpenCode.

## Contributing

Bug reports, model scores, and code changes are welcome. Read
[CONTRIBUTING.md](./CONTRIBUTING.md). For questions and ideas, use
[Discussions](https://github.com/s-berdia/Opencode_router/discussions).

## License

[MIT](./LICENSE)
