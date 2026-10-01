# Sortie-dogs

<p align="center">
  <img src="docs/assets/sortie-dogs-logo.png" alt="Sortie-dogs logo" width="640">
</p>

**A goal-preserving, adaptive execution harness for OpenCode that optimizes cost,
time, and proof without taking your setup over.**

Use OpenCode normally. Invoke Sortie only when you want scoped investigation,
implementation, validation, review, and model routing.

- **Goal invariance**: accepted outcomes and proof requirements survive delegation,
  continuation, remediation, and restart.
- **Adaptive execution**: small work stays small; additional agents and stronger
  models are used only when task shape or risk justifies them.
- **Coexistence**: Sortie activates only when selected and preserves normal
  OpenCode agents, settings, and user-owned files.
- **Cost, time, and proof**: the objective is a verified result at the lowest
  practical cost and wall time, not the largest agent count.

[![GitHub Release](https://img.shields.io/github/v/release/zufall-upon/Sortie-dogs)](https://github.com/zufall-upon/Sortie-dogs/releases/latest)
[![npm](https://img.shields.io/npm/v/sortie-dogs?label=npm)](https://www.npmjs.com/package/sortie-dogs)
[![Tests](https://github.com/zufall-upon/Sortie-dogs/actions/workflows/test.yml/badge.svg)](https://github.com/zufall-upon/Sortie-dogs/actions/workflows/test.yml)
[![OpenCode Plugin](https://img.shields.io/badge/OpenCode-Plugin-5C5CFF)](https://opencode.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/sortie-dogs)](https://www.npmjs.com/package/sortie-dogs)
[![MIT License](https://img.shields.io/npm/l/sortie-dogs)](LICENSE)

![Sortie-dogs coordinating a bounded implementation workflow](https://raw.githubusercontent.com/zufall-upon/Sortie-dogs/main/docs/assets/sortie-workflow.gif)

Guides: [日本語](docs/guide-ja.md) · [简体中文](docs/guide-zh-CN.md) ·
[Testing](docs/testing.md) · [CLI testing](docs/cli-testing.md)

## SWE-bench Lite: 170/300 (56.67%)

The fixed **Sortie-dogs v0.12.24** harness resolved **170 of 300 SWE-bench Lite test issues** in one pass@1 campaign, with 9 empty patches and no official evaluation errors. Every instance has a frozen prediction and an inference-time trajectory. The task Workers ran `openai/gpt-6-luna-fast#max`; operator, coordinator and review roles ran `openai/gpt-6-sol#xhigh`. This is a system result, **not** a Luna-only model comparison or a Verified/full SWE-bench score.

[Technical report and per-repository results](docs/benchmarks/swebench-lite-v01224-test300-2026-09-29.md) · [Public predictions, logs and trajectories](https://github.com/zufall-upon/sortie-dogs-swebench-lite-20260929)

The single official 300-instance report and frozen predictions are hash-bound in the report. Confirmed inference expense was **$162.99**; a separate **$34.60** of usage has unknown pricing and is held against the campaign cap, **not** counted as known expense. Leaderboard registration and maintainer acceptance are separate from this official local evaluation.

> **Beta:** v0.12.2 builds on the v0.10.23 execution engine. Runtime behavior,
> configuration, and generated assets may still change before 1.0.

## Quick start

Requirements: Node.js 22.6 or newer, npm, and OpenCode.

Run these commands in the target project:

```sh
npm install --save-dev sortie-dogs
npx sortie-dogs init .
```

The package retains the `v010` profile/namespace for compatibility. `init` adds the OpenCode V2 plugin and the required
two-level subagent depth to `.opencode/opencode.json(c)`, preserving existing settings:

```json
{
  "plugins": ["sortie-dogs"],
  "experimental": { "subagent_depth": 2 }
}
```

Restart OpenCode, then run:

```text
/sortie-v010 <task>
```

Selecting `dog-operator` directly starts the same workflow. `dog-operator` is the
only user-facing v0.10 authority. `dogs-coordinator` and every `*-v010` role are
internal children and must not be selected as task entry points.

`init` installs runtime assets and merges the required OpenCode settings; the `plugins` entry loads runtime enforcement and
model routing. A new session alone does not reload an updated
plugin process, so restart OpenCode after installation or upgrade.

## v0.12.0 workflow

v0.12.0 keeps Operator → Coordinator → Worker, with independent review:

- `dog-operator` states a few requirements/negative constraints and owns user decisions and final acceptance.
  The host saves the original user message verbatim.
- Hidden `dogs-coordinator` owns investigation, unit declarations, Worker/Scout/Advisor/Reviewer dispatch,
  in-request write-scope extensions, and corrections. It can read/search and run confirmation shell commands;
  source editing tools belong to Worker.
- `dog-worker-v010` implements a host-generated unit within its file/directory write scopes.
  Investigation commands need no pre-registration; formal checks retain real host-recorded results.
- High-risk changes require an independent Reviewer. Low-risk skips are explicit and recorded.
- Simple low-risk single-unit work retains Operator → Worker Fast-lane dispatch.
- Unit progress appears on the running Task without stopping Coordinator or prompting Operator.

The v0.10 profile is serial by design. The stable profile's Luna fabric and
parallel integration path are not exposed in this profile. More agents are not a
goal; preserving quality while reducing unnecessary expensive work is.

### SWE-bench evaluation

Official SWE-bench Lite `dev` results on the same 23 public instances:

| Candidate / benchmark adapter | Official resolved | Empty patches | Run conditions | Details |
| --- | ---: | ---: | --- | --- |
| v0.10.6 candidate (`859c396`) | 4 / 23 (17.4%) | 5 | Four inference slots | [Handoff](docs/swebench-handoff-2026-09-21.md) |
| Frozen v0.10.14 build | 6 / 23 (26.1%) | — | Four slots; $1.50/task | [Per-task results](docs/benchmark-v0.10.14-dev23.md) |
| v0.12.8 (`e0f8cef` adapter) | 5 / 23 (21.7%) | 9 | Four slots; budget amended across two batches; 30-minute timeout | [Campaign](docs/swebench-v0128-dev23-2026-09-26.md) |
| v0.12.8 (`84ccdf1` main adapter) | 6 / 23 (26.1%) | 2 | Fresh 23-task run; four slots; 30-minute timeout | [Main-integrated run](docs/swebench-main-84ccdf1-dev23-2026-09-26.md) |
| v0.12.15 (`0c9690d`) | 5 / 23 (21.7%) | 3 | Fresh 23-task ext4 retry; four slots; 40-minute timeout | [Campaign](docs/swebench-v01215-dev23-2026-09-27.md) |
| v0.12.16 (`9b05a34` release; `b1a6c0e` runner) | 4 / 23 (17.4%) | 5 | Fresh 23-task run; eight slots; 40-minute timeout | [Campaign](docs/swebench-v01216-dev23-2026-09-27.md) |
| v0.12.19 (`24f5386` release; matched rerun) | 8 / 23 (34.8%) | 0 | Eight slots; effective $2/instance; 40-minute timeout; one inference timeout | [Official result and provenance](docs/benchmarks/swebench-v01220-operation-observability-2026-09-28.md) |
| v0.12.20 (`628eb81` release) | 7 / 23 (30.4%) | 0 | Eight slots; effective $2/instance; 40-minute timeout | [Official result and caveat](docs/benchmarks/swebench-v01220-operation-observability-2026-09-28.md) |
| v0.12.25 (`49eb1e4` release) | 7 / 23 (30.4%) | 0 | Eight slots; $2/instance; $30 total cap; 20-minute progress check / 40-minute hard maximum | [Comparison baseline](#v0131-dev23-2026-09-30) |
| v0.13.1 (`d19e8be` release; 2026-09-30) | **8 / 23 (34.8%)** | 0 | Eight slots; $2/instance; $46 total cap; 20-minute progress check / 40-minute hard maximum; GPT-6.1 Sol + Luna Fast | [Run summary](#v0131-dev23-2026-09-30) |

Every row has 23 submitted official predictions; an empty patch counts against
the score, not as a missing evaluation. The v0.10.14 report does not separately
summarize empty patches. The v0.12.15 row is the separately approved fresh
run after an initial `/tmp` quota failure, not an additional score for that
failed attempt. Inference completion is **not** official resolution.
Budgets, runtime/adapter versions, and execution conditions changed between
campaigns, so this table is a history of observed results, not a controlled
head-to-head comparison or a general success-rate claim. The v0.10.14 run
estimated $15.75 in model cost and a 15.2-minute median agent runtime.
The v0.12.16 run is the first eight-slot inference score in this table;
five runners timed out, and this does not establish a model-quality regression
against runs with different concurrency and conditions.
The v0.12.19 row is the corrected run with an effective $2 per-instance cap;
an earlier v0.12.19 run scored 7/23 but had no effective per-instance cap and
is not a same-condition comparison. The v0.12.20 run lost the
`sqlfluff__sqlfluff-2419` resolution relative to the corrected run; this
single run-to-run difference does not establish causation.

Historical qualification references remain in [benchmark reference](docs/benchmark-reference.md).

#### v0.13.1 dev23 (2026-09-30)

One fresh pass@1 run and one official SWE-bench harness evaluation resolved
**8/23**, versus **7/23** for v0.12.25. The new resolution was
`pylint-dev__astroid-1333`; all seven previously resolved IDs were retained.
Resolved by repository: marshmallow **2/2**, pvlib **0/5**, pydicom **2/5**,
astroid **3/5**, pyvista **0/1**, sqlfluff **1/5**.

- The scored row is the user-requested fresh run after a host restart. The
  interrupted initial run is excluded from this score; the fresh run made one
  attempt per instance with no inference retry.
- The dataset revision (`6ec7bb89b9342f664a54a6e0a6ea6501d3437cc2`), public rows,
  and all 23 official evaluation image IDs match the v0.12.25 run. Both used
  `official-image-testbed` and sequential official scoring.
- Operator/Coordinator/Reviewer/Advisor defaults changed to
  `openai/gpt-6.1-sol#xhigh`. Actual task Workers remained
  `openai/gpt-6-luna-fast#max`, observed across all 23 instances. The harness and
  total budget also changed, so the extra resolution cannot be attributed to
  the model change alone.
- Inference ended with 20 normal completions, two timeouts
  (`pvlib__pvlib-python-1154`, `sqlfluff__sqlfluff-1763`) and one agent failure
  (`pvlib__pvlib-python-1854`). All patches, including stopped attempts, were
  officially scored: 23 completed evaluations, zero empty patches and zero
  official evaluation errors or infrastructure failures.
- Known estimated inference cost: **$17.73**; separate unknown-usage hold:
  **$1.98**, not counted as known expense. Inference wall time was about
  **81 minutes**, followed by **7.2 minutes** of official scoring.
- Fixed release commit: `d19e8be0d21180cc23ad2ae4b853d846a18e77bc`;
  package SHA-256: `99300ceec0c3eee4fa1f984fed50d15d58b2ff4455df0041850ecd63514b0a51`.
  OpenCode **2.0.20**, official harness **5.0.2**. Local evidence is retained in
  `_testenv/swebench-v0131-dev23-20260930-r2/result-summary.json`; generated
  predictions, databases and raw logs are not committed.

## Mission tools

1. `start_mission`: Operator supplies concise requirements; the host saves original messages and returns a Coordinator task.
2. `plan_units`: Coordinator supplies title, objective, file/directory scopes and formal checks. The host generates
   IDs, handoff, manifest, proof mapping and the ready Worker task. No proposal approval round trip.
3. `operator_next`: advance serial units. `expand_unit` or a reasoned `plan_units` correction extends/replaces
   settled execution within the original requirements and retained cumulative budget.
4. `review_mission`: generate the independent review packet from source, requirements and observed checks;
   dispatch its Reviewer task for high-risk changes or record a low-risk skip.
5. `submit_mission`: Coordinator returns a completion candidate, user-only decision, or proven external/scope/budget blocker.
6. `complete_mission`: Operator compares the original request, source and evidence, then explicitly accepts.
   Only a succeeded receipt authorizes DONE and the measured 🐾 return report.

All tool names use the `sortie_v010_` prefix. Prior proposal/plan-repair tools remain in the compatibility
implementation but are hidden from the normal v0.12 model tool list. An in-request path extension is a
Coordinator decision; changing the original requirements or increasing budget returns to Operator/user.

Durable profile state and hash-bound task references support restart and
compaction recovery without reconstructing criteria from summary prose. Stale,
foreign-root, or changed references are rejected. An optional Git lifecycle can
create one non-overwriting branch and one explicit-path commit; it never grants
arbitrary Git, force push, release, or publication authority.

## Configuration

### Profile files and precedence

The default package entry is the v0.10 profile:

- Command: `/sortie-v010`
- Primary agent: `dog-operator`
- Project settings: `.opencode/sortie-dogs-v010.json`
- Global settings: `~/.config/opencode/sortie-dogs-v010.json`
- JSON environment override: `SORTIE_DOGS_V010_CONFIG`
- Runtime state: `.sortie-dogs-v010/`
- Installed asset marker: `.opencode/sortie-dogs-v010.version`

Precedence is built-in defaults, global file, project file, environment JSON,
then plugin factory options. Unknown properties or invalid types are rejected.
Use external v0.10 role names such as `dog-operator`, `dogs-coordinator`, and
`dog-reviewer-v010` in `modelRouting`; do not also declare their stable aliases.

Example `.opencode/sortie-dogs-v010.json`:

```json
{
  "validationProfile": "balanced",
  "readOnlyTools": ["my_mcp_search"],
  "freeTierFallbackModels": ["opencode/deepseek-v4-flash-free"],
  "modelRouting": {
    "dog-operator": {
      "preferred": { "model": "provider/model", "variant": "high" }
    },
    "dogs-coordinator": {
      "preferred": { "model": "provider/model", "variant": "deep" }
    }
  },
  "modelCatalog": {
    "project": [
      { "model": "provider/model", "variants": ["high", "deep"] }
    ]
  },
  "continuation": {
    "enabled": true,
    "taskWatchdogMilliseconds": 300000
  }
}
```

Declare only models and named variants the host actually provides. Sortie does
not invent, probe, or translate variant names.

### Settings reference

- `readOnlyTools`: additional host-specific tools known not to mutate project
  files. Values accumulate across configuration layers. Unknown tools are denied
  in a bound worker session.
- `modelRouting`: preferred and ordered fallback targets by external profile role.
- `modelCatalog`: available `project` and `global` model/variant declarations.
- `freeTierFallbackModels`: ordered global last-resort model IDs. Default:
  `opencode/deepseek-v4-flash-free`; `[]` disables this fallback.
- `dedicatedWorkerModel`: canonical stable serial target, default
  `openai/gpt-6.1-sol` / `medium`. The v0.10 profile also supplies its explicit
  role routes below; do not infer the v0.10 worker route from this stable setting.
- `consultation.strategy`: fixed advisor identity, optional `required`, and
  positive `maxCallsPerCandidate`; default one call and not required.
- `consultation.sourceReview`: risk-based review with `maxCallsPerCandidate`
  default `1` and `maxArtifactBytes` default/maximum `30720`. Unavailable review
  blocks only when review is required.
- `continuation.enabled`: default `true`.
- Automatic continuation has no turn-count ceiling. The legacy positive-integer
  `continuation.maxAutoContinues` setting is accepted but ignored.
- `continuation.taskWatchdogMilliseconds`: root inactivity while an implementation
  Task is outstanding; default `300000`, valid range `10..1800000`.
- `continuation.summarizeModel`: optional explicit compaction model; omission
  reuses the latest observed root model.
- `validationProfile`: `fast`, `balanced`, or `assurance`; default `balanced`.
- `reflection`: accepted by the shared schema, but reflection writes are not
  exposed by the serial v0.10 profile. Stable reflection remains opt-in and off by
  default.

The v0.10 host owns handoff and manifest controls under
`.sortie-dogs-v010/contracts/`. Do not create a legacy root
`operation-manifest.json` for this profile and do not edit generated controls.
Delete `.sortie-dogs-v010/` only when no Sortie run is active.

### Validation policy

`validationProfile` chooses non-canonical depth:

- `fast`: static checks
- `balanced`: targeted checks
- `assurance`: related checks

Canonical proof remains canonical. Full-suite execution requires release context
or explicit risk. Workers own static, targeted, and related checks; the root owns
canonical and full-suite checks. An unchanged candidate, command, and environment
reuse the same evidence instead of spending the validation budget again.

### Default routes

- `dog-operator`: `openai/gpt-6.1-sol` / `xhigh`
- `dogs-coordinator`: `openai/gpt-6.1-sol` / `xhigh`
- `dog-worker-v010`: `openai/gpt-6-luna-fast` / `max`
- `dog-scout-v010`: `openai/gpt-6-luna-fast` / `max`
- `dog-reviewer-v010`: `openai/gpt-6.1-sol` / `xhigh`
- `dog-advisor-v010`: `openai/gpt-6.1-sol` / `xhigh`

An explicit model and variant selected in OpenCode remains authoritative for that
session. Child role defaults fill absent native settings and may be overridden by
valid profile routing. Review never silently inherits the implementation model.

## Stable compatibility profile

The earlier parallel-capable runtime remains available explicitly:

```sh
npx sortie-dogs init . --profile stable
```

Load it through a project bridge instead of the default package plugin entry:

```ts
export { SortieDogsPlugin } from "sortie-dogs/plugin/stable";
```

The stable profile uses `/sortie`, `dog-coordinator`,
`.opencode/sortie-dogs.json`, `SORTIE_DOGS_CONFIG`, and `.sortie-dogs/`. Do not
register stable and v0.10 from the same package installation path in one host.

## Global availability

Project-local installation is recommended. To expose v0.10 assets globally:

```sh
npm install --global sortie-dogs
sortie-dogs init --global --profile v010
```

Global initialization also merges `sortie-dogs` and `experimental.subagent_depth: 2` into the
global OpenCode config, preserving unrelated settings and the default agent.

## Updates and removal

After replacing the dependency, rerun initialization and restart OpenCode:

```sh
npx sortie-dogs init .
```

`init` is idempotent. It updates recognized Sortie-owned assets, records the asset
version, preserves user configuration, and stops safely on unknown ownership or
conflicting files.

There is no supported uninstall command. Remove the npm dependency separately,
then follow the [safe manual removal guide](docs/uninstall.md). Delete only known
Sortie-owned paths; never remove the whole `.opencode` directory or use broad
wildcards.

Maintainers: the [release batch guide](docs/release-batch.md) covers fixed-tarball
validation, global application, GitHub publication, and manual npm publication.
