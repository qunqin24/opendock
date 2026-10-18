# opencode-teamwork-v2

An **OpenCode V2 port** of [`opencode-teamwork`](https://github.com/aditya0si/OpenCode-Team) —
Antigravity-style multi-agent orchestration for OpenCode.

The original package only implements the **OpenCode V1 plugin API**, so it fails
to load on OpenCode V2:

```
failed to load plugin
PluginModule.LoadError: Plugin must export a default definition with an id and
an effect or setup function. (cause: SchemaError(Expected object at ["default"]))
```

This repo is the ported, V2-native version: the original 10 agents plus a
security auditor (11 total) and 7 slash commands,
rewritten for the V2 plugin + agent APIs. Verified against **OpenCode `v2.0.26`**.

## What changed (V1 → V2)

| Original (V1) | This port (V2) |
| --- | --- |
| Default export = async plugin function returning a `config` hook | Default export = `{ id, setup }` definition (exactly what `Plugin.define({...})` returns) |
| `config` hook injects 10 agents | **Not possible in a V2 plugin** — the `AgentEditor` has no `add`. Agents are installed as markdown files: `agents/team/*.md` |
| `config` hook injects 7 commands | Registered by the plugin via `ctx.command.transform(...)` → `editor.add(...)` |
| Commands used `{{ ... }}` handlebars + `agent:` frontmatter | V2 has neither; `$ARGUMENTS` substitution in the plugin, agent switching via `ctx.session.switchAgent(...)` |
| Agent perms `edit/bash/webfetch/task` | V2 `permissions` array: `edit/shell/webfetch/subagent` |

## Layout

```
package.json                      # npm manifest (name: opencode-teamwork-v2)
index → plugins/opencode-teamwork/index.ts   # V2 plugin, registers the 7 commands
plugins/opencode-teamwork/tools.ts           # engine tools + hooks (V2 API)
agents/team/*.md                  # 11 team agents (markdown, V2 frontmatter)
docs/ARTIFACTS.md                 # canonical artifact layout, topologies, schemas
lib/team.mjs                      # installer core (config dir, model map, agent files)
lib/picker.mjs                    # interactive model picker (`opencode models`)
lib/runs.mjs                      # run inspection, DAG visualization, worktree pruning
lib/doctor.mjs                    # environment diagnostic health checks
bin/opencode-teamwork.mjs         # CLI: init / models / install / status / doctor / runs / inspect / prune
scripts/lint-prompts.mjs          # prompt linter (run in CI)
scripts/test-cost.mjs             # session tree consumption tests
scripts/test-engine.mjs           # DAG engine, security gate & worktree tests
scripts/test-doctor.mjs           # hermetic environment & CLI doctor tests
postinstall.mjs                   # asks for models during npm install
```

## Engine (tools + hooks)

The run mechanics are real, not prompt prose. The plugin registers deterministic
tools (named `teamwork_*` after the `teamwork` namespace) and runtime permission hooks:

| Tool | Purpose |
| --- | --- |
| `teamwork_budget` | budget preflight: console credit derivation |
| `teamwork_plan` | create the run dir + `plan.dag.json` / `state.json` / `costs.json` |
| `teamwork_status` | per-task progress for the active run |
| `teamwork_resume` | tasks still open, for a restart |
| `teamwork_cost` | read real budget spend across OpenCode session tree (sentinel + workers + verifiers) |
| `teamwork_pitfall` | append to the pitfall registry (dynamically injected into workers) |
| `teamwork_next` | evaluates DAG dependencies, lifecycle states, and ready tasks |
| `teamwork_task_update` | deterministic task state machine transitions (`pending` → `worker_active` → `worker_done` → `verifier_active` → `verified_pass` / `verified_fail` / `blocked`) |
| `teamwork_security_audit` | mandatory pre-merge security gate (`verify/security-audit.json`) |
| `teamwork_worktree` | out-of-repo git worktree provisioning, diff, merge, resolve & cleanup |

Hooks: `permission.evaluate` enforces the read-only guarantee for the verifier,
falsifier, scout and security auditor **in code** (not just in their prompts),
enforces network constraints (`constraints.network: denied`), and
`session.context` injects the active run's state + recent pitfalls into every team
agent's system prompt.

All run artifacts live under `.opencode/teamwork/<session-id>/`; see
[`docs/ARTIFACTS.md`](docs/ARTIFACTS.md) for the layout, the canonical
topologies, and the JSON schemas (`spec.json`, `plan.dag.json`, `state.json`,
`verification_report.json`). The installer copies that reference to
`<config-dir>/teamwork/ARTIFACTS.md` next to your agents.

## Install

> **About the install prompt.** OpenCode installs plugins with **Bun**, and Bun
> blocks dependency lifecycle scripts (`postinstall`) by default. The interactive
> model prompt therefore may not appear during `opencode plugin add`, but the
> agents are still created — the plugin self-heals them on load with the DeepSeek
> defaults. To choose models, run the `init` command below. (`postinstall` does
> fire for a plain `npm install`, and is intentionally skipped under `npx` /
> `npm exec` so the `init` run doesn't prompt twice.)

### From GitHub (no npm account needed)

```sh
opencode plugin add github:sorcnr/opencode-teamwork-v2

# then choose a model for each agent:
npx github:sorcnr/opencode-teamwork-v2 init
```

If `npx github:…` is unavailable, run the bundled CLI straight from the install
directory:

```sh
node ~/.config/opencode/node_modules/opencode-teamwork-v2/bin/opencode-teamwork.mjs init
```

### From npm

```sh
opencode plugin add opencode-teamwork-v2

npx opencode-teamwork-v2 init      # pick models, install agents, register plugin
npx opencode-teamwork-v2 models    # pick models only (never edits opencode.json)
npx opencode-teamwork-v2 status    # show what is installed and mapped
npx opencode-teamwork-v2 doctor    # diagnose environment health (or --json)
npx opencode-teamwork-v2 runs      # list active/past runs and spent budgets
npx opencode-teamwork-v2 inspect   # inspect latest run DAG, tasks, and audit
npx opencode-teamwork-v2 prune     # prune completed git worktrees
```

`opencode-teamwork` and `opencode-teamwork-v2` are aliases for the same CLI. If
you are running from **inside this package's own checkout**, use the bundled
scripts (`npm run init`, `npm run models`, `npm run status`, `npm run doctor`, `npm run runs`, `npm run inspect`, `npm run prune`) — `npx <name>` there
resolves the local package rather than the registry copy.

Agent prompt files are left untouched by default. To also adopt updated prompt
bodies (keeps your model choices, backs up the old files):

```sh
npx opencode-teamwork-v2 install --refresh
```

Non-interactive / scripted use:

```sh
npx opencode-teamwork-v2 install --all anthropic/claude-sonnet-4-5
npx opencode-teamwork-v2 install --model sentinel=deepseek/deepseek-v4-pro \
                                 --model scout=deepseek/deepseek-flash
```

The chosen mapping is stored in `~/.config/opencode/teamwork.json`. Existing
agent files are never overwritten wholesale — only their `model:` line is
rewritten — and a one-time backup of touched files lands in
`~/.config/opencode/.opencode-teamwork-backup/<timestamp>/`.

The plugin also self-heals: if the agent files are missing when the plugin
loads (e.g. the install prompt was skipped), it recreates them from the packaged
defaults without touching files that already exist.

### Manually (no npm)

1. Copy the pieces into your global OpenCode config directory:

   ```sh
   CFG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
   mkdir -p "$CFG/agents/team" "$CFG/plugins"
   cp -r agents/team/*.md "$CFG/agents/team/"
   cp -r plugins/opencode-teamwork "$CFG/plugins/"
   ```

2. Add the plugin to `$CFG/opencode.json`:

   ```jsonc
   {
     "$schema": "https://opencode.ai/config.json",
     "plugins": [
       "/absolute/path/to/.config/opencode/plugins/opencode-teamwork"
     ]
   }
   ```

   Relative paths work too if your setup resolves them against the config
   directory; an absolute path is the least surprising.

3. Reload (or restart) OpenCode, then verify:

   ```sh
   opencode plugin list        # opencode-teamwork  local  .../plugins/opencode-teamwork/index.ts
   opencode debug agents       # should list team/sentinel, team/worker, ...
   ```

   To activate without a restart: `opencode reload`.

## Model assignment

Each agent's model lives in the `model:` frontmatter of its markdown file. The
shipped defaults are:

- `deepseek/deepseek-v4-pro`: sentinel, orchestrator, synthesizer, verifier, falsifier, proof-worker
- `deepseek/deepseek-flash`: crafter, worker, proposer, scout

Change them with `opencode-teamwork init` (interactive), the flags above
(scripted), or by editing the frontmatter / `teamwork.json` directly and running
`opencode reload`.

## Publishing (maintainers)

There is **no separate "Bun registry"** — Bun installs from the npm registry, so
publishing to npm is what makes the package available to `bun add`, OpenCode, and
npm alike. Two ways to ship:

**A. GitHub only (no npm account).** Nothing to publish — users install the git
spec directly (`opencode plugin add github:sorcnr/opencode-teamwork-v2`). Just
tag releases:

```sh
git tag v0.3.0 && git push origin main --tags
```

**B. npm registry, without interactive login.** Create a *Granular Access Token*
(npmjs.com → Access Tokens → check **Bypass 2FA**, grant publish), then:

```sh
npm config set //registry.npmjs.org/:_authToken=TOKEN
npm whoami                       # verify
npm pack                         # inspect the 19-file tarball
npm publish --dry-run
npm publish --access public
```

For CI, this repo ships [`.github/workflows/publish.yml`](.github/workflows/publish.yml)
using **npm Trusted Publishing** (OIDC, no long-lived token). One-time setup:

1. Create the package with a first manual publish (`npm publish`, token above) —
   package settings only exist once the package exists.
2. On npmjs.com: **Package → Settings → Trusted Publisher → GitHub Actions**
   with user `sorcnr`, repo `opencode-teamwork-v2`, workflow `publish.yml`,
   and `npm publish` allowed.
3. Release afterwards by tagging:

   ```sh
   npm version patch        # bumps package.json + creates the vX.Y.Z tag
   git push --follow-tags   # triggers the workflow
   ```

Note that npm is restricting bypass-2FA tokens from January 2027, so Trusted
Publishing is the durable option.

`files` in `package.json` is a whitelist (`agents`, `plugins`, `lib`, `bin`,
`docs`, `postinstall.mjs`, `README.md`, `LICENSE`), so tests and scratch dirs
never ship. The runtime has **zero dependencies**; `postinstall` uses only Node
built-ins.

## Commands

| Command | Agent | Purpose |
| --- | --- | --- |
| `/teamwork` | `team/sentinel` | Main dispatcher — loads a spec, provisions a worktree, builds the DAG, dispatches workers + verifiers, merges |
| `/teamwork-craft` | `team/crafter` | 9-step elicitation wizard that produces `prompt_draft.md` |
| `/team-orchestrate` | `team/orchestrator` | Legacy v1 propose/falsify/synthesize/verify loop |
| `/team-propose` | `team/orchestrator` | Run only the propose step |
| `/team-falsify` | `team/orchestrator` | Run only the falsifier step |
| `/team-synthesize` | `team/orchestrator` | Run only the synthesizer step |
| `/team-review` | `team/orchestrator` | Run the verifier on the current artifact |

## Agents

`team/crafter`, `team/sentinel`, `team/worker`, `team/proof-worker`,
`team/verifier`, `team/orchestrator`, `team/proposer`, `team/falsifier`,
`team/synthesizer`, `team/scout`.

Model assignments live in each agent's frontmatter (`model:`); see
[Model assignment](#model-assignment) for how to set them.

## Notes

- The plugin is intentionally **dependency-free at runtime** — it does not import
  `@opencode/plugin`, so the loader never needs to resolve `node_modules` for it.
  The exported object shape is identical to `Plugin.define({ id, setup })`.
- V2 agents cannot be created by a plugin, so the plugin only registers commands,
  ships the `teamwork_*` engine tools, and (in the npm package) recreates any
  missing `team/*.md` agent files from the packaged defaults on load. If you
  prefer no plugin at all, move the 7 command definitions into markdown files
  under `~/.config/opencode/commands/` (V2 discovers them natively).
- Prompt invariants (one artifact root, one topology enum, no stale references,
  no blocking `effect: ask` in parallel agents) are enforced by
  `scripts/lint-prompts.mjs` — run `npm run lint:prompts`. CI runs it whenever
  agents, the plugin or docs change.
- **Security:** the guardrail model (path containment, server-derived session
  ids, read-only enforcement, sanitised context injection, non-destructive
  installers) is documented in [`docs/GUARDRAILS.md`](docs/GUARDRAILS.md). The
  `team/security-auditor` agent audits a repo read-only with a clean context.
- Docs: <https://opencode.ai/v2/docs/build/plugins>

## License & attribution

MIT. Ported from [`aditya0si/OpenCode-Team`](https://github.com/aditya0si/OpenCode-Team)
by Aditya Singh; the original MIT notice is preserved in [LICENSE](LICENSE).
