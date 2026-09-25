# Sortie-dogs

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

A frozen Sortie-dogs v0.10.14 build was evaluated on 23 fixed tasks.

- Official verifier PASS: 6 / 23
- Scored FAIL: 17 / 23
- Infrastructure blocked: 0 / 23
- Total estimated model cost: $15.75
- Median agent runtime: 15.2 min

The same Sortie-dogs candidate, model routes, budgets, tools, and verification
procedure were held fixed for all tasks. This is one frozen evaluation, not a
general success-rate claim.

Full methodology and per-task results: [benchmark details](docs/benchmark-v0.10.14-dev23.md)

Historical qualification references remain in [benchmark reference](docs/benchmark-reference.md).

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
  `openai/gpt-6-sol` / `medium`. The v0.10 profile also supplies its explicit
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

### Default v0.12 routes

- `dog-operator`: `openai/gpt-6-sol` / `xhigh`
- `dogs-coordinator`: `openai/gpt-6-sol` / `xhigh`
- `dog-worker-v010`: `openai/gpt-6-luna-fast` / `max`
- `dog-scout-v010`: `openai/gpt-6-luna-fast` / `max`
- `dog-reviewer-v010`: `openai/gpt-6-sol` / `xhigh`
- `dog-advisor-v010`: `openai/gpt-6-sol` / `xhigh`

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
