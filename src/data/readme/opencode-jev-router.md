# Jev router for OpenCode

`JevRouterPlugin` provides three tools: `JevAgent` picks a subagent and model/thinking pair with Jev and returns a routing-only decision; `JevExecute` routes and executes in a child session with Jev's selected agent, model, and thinking variant; `JevCreditBudget` shows or reconciles the local monthly credit estimate. `JevExecute` coexists with OpenCode's built-in `task` tool and returns a decision/authority header plus the child result. Pure routing logic lives in `router.ts`; OpenCode wiring lives in `plugin.ts`; child-session execution lives in `execute.ts`.

## Install

### npm installation (recommended)

From your project directory, generate the router config, starter subagents, and routing skill:

```sh
npx opencode-jev-router init
```

Use `npx opencode-jev-router init --global` for setup under `~/.config/opencode/` instead. Existing files are preserved, so running setup again is safe. The starter agents are basic role prompts; review and customize them for your project. Setup reads an existing router config and only generates recognized starter agents at their default paths.

Add the package to the `plugin` array in `opencode.json` (merge with your existing configuration):

```json
{ "$schema": "https://opencode.ai/config.json", "plugin": ["opencode-jev-router"] }
```

OpenCode installs the npm plugin and its dependencies. You do not need to copy its source files or locate OpenCode's package cache. Review `.opencode/jev-router/config.json` so its model IDs and thinking levels match your connected providers. Set `TYPESAFE_API_KEY` in the environment of the process launching OpenCode, then quit and restart OpenCode.

The example uses GitHub Copilot and OpenCode models; it is a preference catalog, not a requirement to use those providers. Replace it with your own supported models as needed. API keys and provider authentication are configured separately.

### Local source installation

Keep the six runtime files together **outside** the auto-discovered plugin directory, and place only a small entry file inside that directory:

```sh
mkdir -p .opencode/plugins .opencode/jev-router
cp /path/to/opencode-jev-router/index.ts /path/to/opencode-jev-router/plugin.ts /path/to/opencode-jev-router/router.ts /path/to/opencode-jev-router/runtime.ts /path/to/opencode-jev-router/execute.ts /path/to/opencode-jev-router/credit-budget.ts .opencode/jev-router/
# local plugins needing npm deps also need .opencode/package.json: { "dependencies": { "@opencode-ai/plugin": "^1.18.0" } }
```

Create `.opencode/plugins/jev-router.ts` containing:

```ts
export { default } from '../jev-router/index.ts';
```

Helper modules export ordinary functions; placing them in the plugin directory can cause OpenCode to load those functions as plugins. `index.ts` exports only the plugin. Programmatic consumers can import helpers from `opencode-jev-router/api` or individual subpaths such as `opencode-jev-router/router` and `opencode-jev-router/credit-budget`.

Run setup from the source checkout to initialize another project without npm publication:

```sh
# Run with the target project as your current directory:
node /path/to/opencode-jev-router/cli.js init
```

Or copy the routing skill manually:

```sh
mkdir -p .opencode/skills
cp -r /path/to/opencode-jev-router/skills/jev-router .opencode/skills/
```

Global equivalents: `~/.config/opencode/plugins/` and `~/.config/opencode/jev-router/config.json`.

For manual setup, copy the example config from the source checkout (the init command already does this):

```sh
mkdir -p .opencode/jev-router
cp -n /path/to/opencode-jev-router/config.example.json .opencode/jev-router/config.json
```

Lookup order is `JEV_ROUTER_CONFIG` (explicit file) → `<project>/.opencode/jev-router/config.json` → `~/.config/opencode/jev-router/config.json`. Agent definition paths in `config.json` are relative to the config file's directory, e.g. `../agents/Explore.md` resolves to `.opencode/agents/Explore.md`. The `init` command creates starter definitions for the example config; customize those or provide your own definitions in `~/.config/opencode/agents/` globally or `.opencode/agents/` per project.

Call `JevExecute` to auto-select and execute all three fields:

```json
{ "prompt": "Find the authentication entry points. Read only.", "description": "Find authentication entry points" }
```

Optional `agent`, `model` and `thinking` fields are hard constraints and must exactly match `config.json`. Full explicit constraints bypass inference. Execution is uncapped.

`JevExecute` creates a child session using the selected agent and model, and sends the selected thinking variant (Jev `off` maps to OpenCode `none`). Its header includes `[via=v1+variant]` when the server echoes the selected variant; `[via=v1]` means variant enforcement could not be verified. `JevAgent` remains available for dry runs; if you use its result with built-in `task`, that tool runs the subagent's configured default model, so model and effort remain advisory.

Before routing, the tool intersects your configured catalog with the models the running OpenCode instance actually serves (`runtime.ts`). Selections can therefore never name a disconnected provider or an unsupported thinking level; an empty intersection fails fast with a diagnostic instead of failing later inside `task`.

`JevExecute` is uncapped by default; the child session may use tools until the model completes.

## API keys — put them in the app, not in this package

Never put keys in `config.json` or commit them. The router resolves at runtime:

- Routing (Jev `systemone` call, `router.ts: jevApiKey`): `TYPESAFE_API_KEY`. Endpoint is `https://api.typesafe.ai/v1/systemone` and the model is `jev-latest` (constants `JEV_API_URL`/`JEV_MODEL` in `router.ts`).
- Execution models (the `models[]` in `config.json`): these are OpenCode providers. Model IDs in `config.json` must match what the connected providers offer (see `runtime.ts`: the tool intersects the configured catalog with the running instance's connected models before routing).

The plugin reads `process.env.TYPESAFE_API_KEY`; it does not load `.env` or `.env.local` itself. If you store the key in an environment file, your launcher must load it before starting OpenCode. This repo holds only code and example configuration.

Note: unlike the old Pi version, there is no local model-registry filtering — the runtime compatibility filter uses the connected models exposed by OpenCode before offering Jev its choices.

## Configuration

- `models` lists exact provider/model IDs, tiers, strengths/weaknesses, `thinking.supported` + `thinking.default`, routing hints, nullable `benchmarks.artificialAnalysis` (`null` = unknown). `routing.escalateTo` is advisory only. At runtime the list is filtered to connected providers and advertised thinking variants, so keep it as the full preference set rather than trimming it per machine.
- `agents` names existing OpenCode subagents. The plugin reads `.opencode/agent/*.md` and `.opencode/agents/*.md` (project, then their global equivalents) and refuses missing, disabled (`disable: true`), or shadowed definitions. The singular folder is checked first within each scope; config definition paths must point at the discovered file.
- `timeoutMs` (100–120000) bounds the Jev request only.
- No fallback by default. Add `"fallback": {"agent":"Explore","model":"...","thinking":"..."}` to allow one on Jev failure. Caller constraints still win; cancellation never falls back.

### Estimated GitHub AI-credit budget

Credit tracking is local and opt-in. It does not call GitHub and does not need a GitHub token. To enable a 24,000-credit monthly target, add a `creditBudget` object and an empirically calibrated `estimatedCreditsPerTask` for each `github-copilot/*` model in your config:

Add `"creditBudget": {"monthlyLimit": 24000, "preferEconomyWhenRemainingBelow": 6000}` to your config, and add `"estimatedCreditsPerTask": <your measured average>` to every `github-copilot/*` model. Do not use a guessed value. When budget tracking is enabled, each estimate must be a positive number; it is a flat estimate per launched task, not a verified GitHub rate. Compare estimates with Copilot settings and tune them. The router reserves the configured estimate before prompting the child session, excludes GitHub models whose estimate would exceed the remaining allowance, and rejects an explicitly constrained GitHub model if it cannot fit. Non-GitHub choices remain available. `JevAgent` only recommends and does not reserve credits; use `JevExecute` for ledgered execution.

The local ledger defaults to `~/.config/opencode/jev-router/credit-usage.json` and resets by UTC calendar month. Set `JEV_ROUTER_CREDIT_LEDGER` to use a different ledger file. Run `JevCreditBudget` to inspect it; call `JevCreditBudget` with `reportedUsage` set to the current month-to-date number shown in Copilot settings to reconcile estimates. This replaces that month's local estimate. Activity outside Jev is not automatically included, so reconcile periodically. The ceiling is enforced against the local estimate, not GitHub's authoritative total.

## Checks

```sh
npm install
npm test
```

Tests run on Node 22.18+ with native TypeScript support (older Node 22 releases may need `--experimental-strip-types`). HTTP is mocked; nothing hits paid Jev or launches a real subagent.

## Publishing updates

Run `npm test` and `npm pack --dry-run` before publishing. For a first release, log in with `npm login` and publish an available version with `npm publish --access public`. A registry 404 does not guarantee a previously unpublished name or version can be reused.

For later releases, bump the version with `npm version patch` (or `minor`/`major` as appropriate) and publish again. `npm version` also creates a Git commit and tag by default. After a successful publish, push the version commit and tag with `git push origin main --follow-tags`. Pushing to GitHub does not update npm; each published version is a separate snapshot. Users can pin a release in OpenCode with `"plugin": ["opencode-jev-router@0.3.1"]` and change that version when ready to upgrade. Restart OpenCode after changing the plugin configuration.

README changes on GitHub do not update the README included in an already-published npm version; those changes ship with the next release.
