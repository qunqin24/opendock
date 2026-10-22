# REEVE

**A self-owned multi-agent orchestration layer on opencode v2.**

REEVE does three things, and together they are the name:

| What it does | Historical meaning of "reeve" |
|---|---|
| Dispatch work to specialist agents | to assign work |
| Keep its own ledger of child tasks — who is running, who died | to keep accounts |
| Verify the artifacts itself instead of trusting a subagent's report | to inspect the work |

(shire reeve → sheriff: the official who supervises and keeps the accounts.)

[中文说明](README.zh-CN.md)

## Why it exists

The controlled side moved from **opencode v1 + `oh-my-openagent` (omo)** to
**openchamber + opencode v2**, and **omo fails to load on v2; upstream has
declined to port it** (issue #9389). Rather than fork it, REEVE splits the job
into four layers with their own licenses:

```
proxy layer     cross-provider fallback        GATE (in-process, ours)   in the plugin; no binary, no separate service
orchestration   dispatch discipline, 4 phases  prompts + agent files    v2 already provides the mechanism
ledger layer    ledger / silent death / concurrency   this repo's plugin   the eight things v2 lacks
review layer    independent diff review        rules from OCR (Apache-2.0)   no tool to install
```

## What to read

> This project is written for an execution agent starting from zero. Read
> [docs/PLAN.md](docs/PLAN.md) first (components and ownership, step 0→5, hard
> gates), then [docs/HANDOFF.md](docs/HANDOFF.md) §15 (execution protocol).
> Before writing plugin code read
> [docs/research/opencode-v2-plugin-api.md](docs/research/opencode-v2-plugin-api.md) —
> the measured v2.0.32 plugin API map.

| I want to… | Read |
|---|---|
| start working | [docs/PLAN.md](docs/PLAN.md) |
| write a plugin | [docs/research/opencode-v2-plugin-api.md](docs/research/opencode-v2-plugin-api.md) |
| understand the whole design | [docs/HANDOFF.md](docs/HANDOFF.md) |
| see what is done | [docs/PROGRESS.md](docs/PROGRESS.md) |
| check first-hand evidence | [docs/research/orchestration-stack-verdict.md](docs/research/orchestration-stack-verdict.md) (archived, partly superseded) |
| import outside material | [NOTICE.md](NOTICE.md) (license boundaries) |

> **The public tree does not contain `docs/`.** GitHub `main` and the npm
> package ship code, config, README and license texts only. The development
> records and `.zcode/` drafts stay in the development repo and are cut by
> `bash scripts/publish-repo.sh` during export, so they never enter public
> history. References such as "§6.11" below point into that local record.

## Status (2026-10-19 evening)

**Steps 0–6 are complete and were accepted end-to-end on a real EL7 host**
(staging with an isolated `HOME`; the production v1 engine was untouched).

| Step | Output | Real-host acceptance |
|---|---|---|
| 0 | plan / API map / HANDOFF errata | — |
| 1 | 8 agents in `agents/*.md` (7 subagents marked `hidden`) | ✅ permission gates, independent review, multiple rounds; only `foreman` is visible |
| 2 | `plugin/` ledger layer (**140** tests) | ✅ concurrency queue / wall-clock interrupt / cross-restart reconcile / ledger round-trip / roster injected into the `subagent` tool description / proxy self-hosting / chain hot reload (≤4 s) / stats cross-check |
| 3 | `skills/review/` review layer | ✅ real diff, line numbers, structured output |
| 4 | GATE proxy layer (in-process: routing / fallback / ledger / catalog) | ✅ real-host acceptance: free lane 200, fault-injection downgrade to paid, per-session stickiness, ≤5 s hot reload, paid direct call unchanged |
| 5 | `extensions/reeve/` console (chain editor + stats + ledger) | ✅ installed in openchamber 2.3.3, rendered, ledger read through the host file bridge; edit → save → runtime rules hot-reload → "applied" |
| 6.7 | the whole system inside the plugin package | ✅ agents and skills registered by the plugin; only `opencode.jsonc` remains in the config dir |
| 6.8 | endpoint bootstrap | ✅ the config holds a single plugin line; the plugin writes `providers.reeve` itself (additive, backed up, comments preserved) |
| 6 | `config/` engine sample + foreground visibility + sync semantics | ✅ see [docs/PROGRESS.md](docs/PROGRESS.md) §6 |
| 6.6 | pure plugin form: proxy self-hosted, slim config | ✅ fetch/start/reuse/guard all in the plugin; fresh-EL7 simulation |
| 6.11 | visual console: chain edit + stats | ✅ EL7: reorder + add fallback → save → runtime `routing_rules` change, snapshot `appliedAt` advances; stats cross-checked against `logs.db` |
| 6.12 | release chain: four CI gates + OIDC npm publish + public-tree export | ✅ `@bd7pil/reeve@0.1.1` published by CI with SLSA provenance; EL7 loaded the registry form |

> ⚠️ **One must-read**: a bare `opencode run` without `--model` / `--agent`
> silently bypasses REEVE — the client supplies a default model and the server
> uses it. Add `"model": "reeve/pro"` to the engine config to make the default
> session take the tier (measured).

**Four unknowns were settled by measurement**: opencode v2 ignores the model
name in the response body; the real v2 plugin API shape (`codemode:false` is
the tool-visibility switch, storage keys are `plugin:<hex(id)>:` …); the three
agent visibility switches (`mode` / `hidden` / `disabled`); and that the v2
provider transport hook can replace requests.

**Still open** (reported honestly, not claimed as passing): the false-positive
rate of the review subagent — collect two weeks of data with the default
"severity does not block".

## Install

**Plugin (engine side)** — one line from the npm registry; the engine fetches
it into its global npm cache, no checkout needed:

```jsonc
// $HOME/.config/opencode/opencode.json
{ "model": "reeve/pro", "plugins": ["@bd7pil/reeve"] }
```

`plugins` entries go through `npm-package-arg`: package name, version, tag, git
spec or absolute path. The directory form is the one measured on EL7; the
registry form uses the same path. Full config is in
[plugin/README.md](plugin/README.md).

**Panel extension** (`extensions/reeve/`) uses the host's own mechanism:
path, public zip, or git branch. Only the git form self-updates. Release via
`.github/workflows/reeve-extension.yml` (manual dispatch):

- `reeve.zip` → release asset; pin `reeve-<version>`, channel `reeve-latest`
  (`https://github.com/BD7PIL/reeve/releases/download/reeve-latest/reeve.zip`)
- `extensions/reeve` → mirrored to the `reeve` branch by `git subtree split`
  (`https://github.com/BD7PIL/reeve#reeve`, self-updating)

**`provision.json`** (plugin package root, shipped in the npm tarball) is the
installation contract read by an assembler such as ocrc: plugin spec and
directory fallback, the extension zip, the config paths that get synced, and
post-install checks. **There are no binary artifacts**: the GATE proxy layer is
plain JS inside the plugin, so installation is exactly the two steps above.

## CI and release

All in `.github/workflows/`, all offline (no provider traffic):

| Action | Trigger | What it does |
|---|---|---|
| CI | push `main` / PR | plugin tests (ubuntu node 22 + 24, windows node 24) · coverage hard floor (`scripts/coverage-baseline.json`, only ratchets up) · npm pack content assertions (license texts present, `docs/` and secrets absent) · extension gate + byte-identical rebuild · engine config sample · public-tree gate |
| Release (normal path) | `bash scripts/publish-repo.sh --tag` | export public tree → tag `v<plugin version>` on that commit → CI publishes with OIDC (SLSA provenance) |
| Release (manual) | push tag `v<version>` or dispatch the workflow | tag↔version check → version not published → tests → pack assertions → `npm publish --access public --provenance` |

**Release credentials: npm Trusted Publishing (OIDC) — no npm secret in the
repository.** `npm trust` requires the package to exist, so 0.1.0 was published
manually; from 0.1.1 on everything is published by CI with provenance. Adding a
repository secret `NPM_TOKEN` switches the workflow to token mode without code
changes.

## Naming

```
brand          REEVE
machine id     reeve
repository     github.com/BD7PIL/reeve (public tree: no docs/ or .zcode/)
npm package    @bd7pil/reeve        plugin (MIT)
extension      extensions/reeve     panel.id = reeve
ledger         ~/.reeve/ledger.json
config         ~/.config/opencode/reeve.jsonc (user) / .opencode/reeve.jsonc (project)
tag            plugin v<ver>; extension reeve-<ver> / reeve-latest
release asset  reeve.zip
```

## License

This repository's own code is MIT. Two pieces of outside material must carry
their notices:

- the ledger implementation adapted from **`oh-my-opencode-slim` (MIT)** → its
  `LICENSE` travels with it
- the rule documents adapted from **`alibaba/open-code-review` (Apache-2.0)** →
  its `NOTICE` / `LICENSE` travel with them

**No code or prompt literal from `oh-my-openagent` may ever be introduced** —
it is SUL-1.0, non-relicensable, permanently. See [NOTICE.md](NOTICE.md).
