# opencode-model-recommender

[![CI](https://github.com/ranjithrajv/opencode-model-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/ranjithrajv/opencode-model-recommender/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-model-recommender)](https://www.npmjs.com/package/opencode-model-recommender)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

An [OpenCode](https://opencode.ai) plugin that recommends the best models on
**OpenCode Zen** (`opencode`) and **OpenCode Go** (`opencode-go`) using live
catalog pricing. Shares its sidebar building blocks with
[opencode-plugin-kit](https://github.com/ranjithrajv/opencode-plugin-kit).

## Prerequisites

- OpenCode **V2** (plugin API is beta)

## Metrics

- **Cache ratio** — cache-read price ÷ input price. Higher = cached context
  (the bulk of agent traffic) is relatively cheaper.
- **Token cost** — blended $/1M tokens: `0.7 × input + 0.3 × output`
  (agent traffic is input-heavy).
- **Session cost** — estimated cost of a representative coding session:
  400k input tokens (80% cache reads, 20% cache writes) + 50k output tokens.
  Override per call:

  ```json
  { "sort": "sessionCost", "session": { "freshInput": 200000, "cacheReadShare": 0.6, "output": 30000 } }
  ```

## Usage

Once loaded, the plugin provides:

- **`models_recommend` tool** — call with `{ sort: "cacheRatio" | "tokenCost" | "sessionCost", providers?, limit?, free?, session? }`.
- **`models_details` tool** — price breakdown for one model (defaults to the current model).
- **`/recommend-models` command** — asks the agent to run the tool and present three rankings, plus how your current model compares.
- **`/model-details` command** — price breakdown for the current model (or pass `<providerID> <modelID>`).
- **`/model-view` command** — pick which providers the sidebar picks cover (All / Zen / Go); persisted across restarts.

The sidebar widget shows the top picks, free models, and whether your current
model is already the cheapest — or how much you'd save per session by switching.

## Install

Published on [npm](https://www.npmjs.com/package/opencode-model-recommender).

**Config (recommended)** — add it to your OpenCode config (`opencode.json`, e.g.
`~/.config/opencode/opencode.json`) and it installs on startup:

```jsonc
{ "plugins": ["opencode-model-recommender"] }
```

**Manual**:

```sh
npm install opencode-model-recommender
```

**Project-local**:

```sh
cp -r opencode-model-recommender .opencode/plugins/
opencode2 service restart
```

Restart the TUI (or `opencode2 service restart`) after changing the config.

## Remove

Remove the plugin's entry from the `plugins` array in `opencode.json`.

## Extending to other providers

Edit `DEFAULT_PROVIDERS` in `index.ts` (e.g. `["opencode", "opencode-go", "openai", "anthropic"]`)
or pass `providers` per call — no code change needed for ad-hoc lookups.

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).

## Releases

Changelog entries use [CHANGELOG_TEMPLATE.md](CHANGELOG_TEMPLATE.md): bullets grouped into semantic categories (Added / Changed / Fixed …) that map 1:1 from Conventional Commit types (`feat` → Added, `fix` → Fixed, …). Breaking changes get a `### Breaking` block and a major bump.
