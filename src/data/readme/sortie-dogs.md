# Sortie-dogs

<p align="center">
  <img src="docs/assets/sortie-dogs-logo.png" alt="Sortie-dogs logo" width="640">
</p>

**An adaptive execution harness for OpenCode and Codex: preserve the goal,
implement, validate, review, and deliver without taking over your setup.**

Use your host normally. Invoke Sortie when a task needs coordinated execution and an
evidence-backed result, not more agents for their own sake.

[![GitHub Release](https://img.shields.io/github/v/release/zufall-upon/Sortie-dogs)](https://github.com/zufall-upon/Sortie-dogs/releases/latest)
[![npm](https://img.shields.io/npm/v/sortie-dogs?label=npm)](https://www.npmjs.com/package/sortie-dogs)
[![Tests](https://github.com/zufall-upon/Sortie-dogs/actions/workflows/test.yml/badge.svg)](https://github.com/zufall-upon/Sortie-dogs/actions/workflows/test.yml)
[![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-5C5CFF)](https://opencode.ai/)
[![Codex](https://img.shields.io/badge/Codex-Host_adapter-222222)](docs/codex.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/sortie-dogs)](https://www.npmjs.com/package/sortie-dogs)
[![MIT License](https://img.shields.io/npm/l/sortie-dogs)](LICENSE)

**Current release: [v0.14.9](https://github.com/zufall-upon/Sortie-dogs/releases/tag/v0.14.9)**
· [Release notes](docs/release-v0.14.9.md) · [Execution vision](docs/v0.14.0-execution-vision.md)

[When to use](#when-to-use-sortie-dogs) · [Quick start](#quick-start) · [Workflow](#mission-workflow) · [Models](#default-models) ·
[Measured results](#measured-results) · [Configuration](#configuration) · [Documentation](#documentation)

> **Beta:** the package is still stabilizing before 1.0. Both host integrations are
> implemented; Codex Missions have completed implementation, validation, correction and acceptance.
> [Host-specific execution boundaries](docs/codex.md#native-permissions-and-approval) remain explicit.

![Sortie-dogs coordinating a bounded implementation workflow](https://raw.githubusercontent.com/zufall-upon/Sortie-dogs/main/docs/assets/sortie-workflow.gif)

## Why Sortie

- **Autonomy:** retain the original request across delegation, correction, compaction and restart.
  Finish in-request work through the existing host authority instead of routine approval round trips.
- **Efficiency:** Operator recommends an initial author from the instruction and known context.
  Coordinator can implement substantial work directly or delegate remaining work as execution makes
  that useful. Continue the same unit with its edits, valid evidence and cumulative budget.
- **Visibility:** show real commands, exits, timing, model routes, review disposition and final
  acceptance. Unknown execution or cost stays unknown, not an invented success or zero.
- **Quality:** meaningful formal checks and risk-based review establish completion, not model prose.
  Worker instructions carry a concise goal, explicit constraints and completion criteria;
  the harness owns bookkeeping. [Instruction design](docs/worker-instruction-design.md).
- **Coexistence:** explicit invocation, existing authentication and host settings, one shared
  Mission lifecycle. Normal OpenCode/Codex use and user-owned files remain yours.

## When to use Sortie-dogs

Use Sortie with an existing **OpenCode V2 or Codex CLI** when a bounded coding task needs:

- The original goal and constraints retained across investigation, multi-file implementation,
  validation, review and correction.
- Either a direct author or delegated work, with edits, valid checks and cumulative budget retained
  when the author changes.
- A handoff that distinguishes actual commands, test results, unresolved issues and acceptance
  from a model's completion claim.

For example, request a bug fix with a regression test, preservation of unrelated local work, and
delivery as a reviewed PR. Define the required checks and delivery boundary in the request.

**Use the host directly** for ordinary questions or small edits that do not need this lifecycle.
Sortie is not a replacement for either host, a way to bypass native permissions, or a guarantee of
unattended completion, lower cost or better benchmark scores. Budget, model access and environment
requirements still matter. See [host setup](#quick-start) and [evidence and limitations](#measured-results)
before choosing it.

## Quick start

Choose **one host route**. Both require Node.js **22.6+** and npm; project-local installation is
recommended. OpenCode is not required for Codex, and Codex is not required for OpenCode.

### Codex

Use an existing Codex CLI signed in with **ChatGPT**. On Windows, PowerShell **7** must already be
available; POSIX uses bash. Sortie does not install Codex, start login or use a metered API fallback.

```sh
npm install --save-dev sortie-dogs@0.14.9
npx --no-install sortie-dogs codex init .
```

Restart Codex or open the project in a new chat, then invoke the installed skill explicitly:

```text
$sortie-dogs Implement and verify the requested change
```

Or run the same natural-language Mission from the terminal:

```sh
npx --no-install sortie-dogs codex mission --prompt "Implement and review the requested change"
```

`codex init` installs `.agents/skills/sortie-dogs` only; it does not edit `.opencode`.
**Do not run `sortie-dogs init` for this route.** `$sortie-dogs` is Skills syntax, not an exact
`/sortie-dogs` slash command. Leave model overrides unset to retain the role defaults.

Existing native permissions remain authoritative. An SDK application can connect its already
authorized parent-host executor; the CLI does not supply one or an interactive native approval
bridge. [Codex guide: SDK, permissions, progress, resume and manifest route](docs/codex.md).

### OpenCode

Use **OpenCode V2**. In the target project:

```sh
npm install --save-dev sortie-dogs@0.14.9
npx --no-install sortie-dogs init .
```

Completely restart OpenCode, then run:

```text
/sortie-v010 Implement and verify the requested change
```

Selecting `dog-operator` starts the same workflow. `init` registers the V2 plugin, installs Mission
assets and sets subagent depth to at least two while preserving unrelated settings. Existing
`sortie-dogs/server` bridges are reused. Internal `dogs-coordinator` / `*-v010` roles are not entrypoints.

The `v010` command, profile and configuration names remain for compatibility; they do **not** mean
v0.10 is installed. [OpenCode setup and configuration](docs/configuration.md) ·
[日本語](docs/guide-ja.md) · [简体中文](docs/guide-zh-CN.md).

## Mission workflow

```text
Known unit: User → Operator → Worker → Validation → Review / Correction → Acceptance
Direct:     User → Operator → Coordinator → Validation → Review / Correction → Acceptance
Handoff:    Coordinator → Worker (same unit, retained edits/context/checks/budget)
```

1. **Operator** saves original requirements, recommends an initial executor from already-known
   context, and owns user decisions and final acceptance. No routing-only investigation is required.
2. **Worker** investigates, implements, runs meaningful checks and performs requested Git delivery
   in the same useful unit. A known unit/check can go directly to Worker without a planning handoff.
3. **Coordinator** starts useful work, implements and validates directly when efficient, and
   delegates remaining work when useful. The Operator recommendation is advisory, not an execution lock.
4. **Review** is initially independent for high-risk changes; low-risk skips are explicit.
   Findings can be corrected and validated by the same Reviewer, followed by recorded author
   self-recheck. That is not a second independent PASS.
5. **Acceptance** compares the original request with actual source, checks and review evidence.
   Only the succeeded receipt authorizes DONE and the measured return report.

The default Mission profile is serial. Background responsiveness and status observations do not
add parallel writers, replay unknown commands or imply completion. More agents are not the goal.

Whole-request workload appears as `全体作業量 n/100（概算）`, using ordinary plans and native
work observations, not budget consumption or fixed stage shares. Calculation adds no model
request or verification; formal acceptance still owns `100/100`.
[Workload estimates, optional weights and runtime cost](docs/work-quantity-progress.md).

For **run-once / result-collection** requests, a terminal failure can be the requested result:
validate and report it without an unauthorized repair/rerun loop. Acceptance preserves the real
operation exit and `execution-failed` outcome; it never turns a failed benchmark into a successful
one. Required success checks, missing commands and active/unstarted operations still block completion.

[Mission tools and validation policy](docs/configuration.md#mission-tools) ·
[Operation efficiency](docs/mission-operation-efficiency.md) ·
[Review policy](docs/quality-first-review.md)

## Default models

- **Operator / Coordinator / Reviewer / Advisor:** GPT-6.1 Sol, `xhigh`.
- **Worker:** GPT-6.1 Terra Standard, `max` (no Fast/priority).
- **Scout / dedicated Luna Worker:** Luna Fast, `max`, unchanged.
- **OpenCode:** ordinary Worker `openai/gpt-6.1-terra#max`; management/review
  `openai/gpt-6.1-sol#xhigh`.
- **Codex:** ordinary Worker native `gpt-6.1-terra` / `max`, Standard; management/review
  `gpt-6.1-sol` / `xhigh`. The retained Luna-fast alias maps to native
  `gpt-6-luna` / `max` with separate `serviceTier: "priority"` (Fast).

Explicit host model selections remain authoritative. OpenCode routing and Codex native settings
are separate; unsupported native models fail rather than silently changing route. Codex Fast uses
subscription limits faster than Standard. Subscription USD cost and remaining allowance are not
inferred from token totals.

## Measured results

**Evidence and limitations:** these are recorded runs with fixed packages, models, tasks and
execution conditions, not a general performance guarantee or a controlled comparison with the
native hosts or other harnesses. Historical results do not measure the current release or its
current default Worker. Mission acceptance, official task scoring and leaderboard acceptance are
different outcomes; the records below keep them separate.

### Codex end-to-end completion

**Codex integration has completed real Missions on Ubuntu and Windows.** The Windows large-write
Anko trial reached final Operator acceptance after Worker validation and same-Reviewer correction:

- SDK exit **0**, `accepted: true`, Mission **completed**.
- **190/190** terminal command receipts; no unresolved command. Large generated-parser writes completed.
- Separate local replay of official tests: reward **1**, F2P **9/9**, P2P **94/94**.
- Elapsed **30m08.739s**, including cleanup; ChatGPT subscription monetary cost unavailable.

The run used native Codex models/threads with an **explicitly authorized SDK parent-host executor**.
It does not claim native Windows sandbox repair, Docker-equivalent scoring or a hosted leaderboard
submission. Its fixed development package preceded v0.13.11, which includes the changes; the
published release was not rerun or assigned that score. These are completion observations, not a
general speed or success-rate guarantee.

[Windows run and scoring](docs/codex-write-status-anko-20261007.md) ·
[Windows models/shell evidence](docs/codex-windows-luna-fast-20261007.md) ·
[Ubuntu acceptance](docs/codex-mission-acceptance-20261006.md)

### SWE-bench evaluation

#### v0.14.0 dev23 (2026-10-15 UTC)

**Official resolution: 10/23 (43.48%); Mission completion: 22/23.** One pass through the normal
OpenCode CLI + Sortie Mission path, using the fixed released v0.14.0 package.

- All 23 frozen patches were officially scored: **10 resolved, 13 unresolved**, zero empty patches,
  evaluation errors or infrastructure failures. The cost-stopped `sqlfluff__sqlfluff-2419` patch
  resolved officially, but its Mission remains incomplete; official correctness does not imply acceptance.
- Pinned public Lite dev rows; one inference attempt per task, no retries. Official grading:
  `split=dev`, `max_workers=1`, `retry_count=0`. Inference concurrency was **1** due to low host memory.
- Actual Operator/Coordinator/Reviewer model: `openai/gpt-6.1-sol#xhigh`;
  Worker: `openai/gpt-6-luna-fast#max`. Ten cases used Workers; 13 used Coordinator direct execution.
- Inference wall time **2h53m28s**; separate official grading **7m19s**.
- Known estimated inference cost **$16.76**, with one pending usage record. Separate holds:
  **$2** for unresolved usage and **$5** for implementation/supervision; these are not known expenses.
  Costs are API-equivalent estimates, not invoices; the $2/task monitor is not an exact billing cap.
- Release/runner commit `e69a3b2317a76eeea1229034f52902812ff1d580`;
  package SHA-256 `120922c31dd6d85040210d68456192b4e6aa45dc87a11451476f3ed576a68e30`.

Local evidence (generated artifacts are not committed):
`_testenv/autodev/sortie-dogs-dev23/benchmark-v0140-20261015/one-pass-summary.json`.

#### Historical v0.12.24 test300

**SWE-bench Lite test300: 170/300 (56.67%)**, fixed **v0.12.24**, one pass@1 campaign.
Nine empty patches, zero official evaluation errors, frozen predictions and trajectories for all
300 instances. Workers ran Luna Fast/max; management/review ran GPT-6 Sol/xhigh.
This is a system result, **not** a Luna-only comparison or Verified/full SWE-bench score.

Confirmed inference expense **$162.99**; separate unknown-pricing budget hold **$34.60** is not
known expense. Official local evaluation and leaderboard acceptance are separate.

[Technical report](docs/benchmarks/swebench-lite-v01224-test300-2026-09-29.md) ·
[Public predictions/logs/trajectories](https://github.com/zufall-upon/sortie-dogs-swebench-lite-20260929) ·
[Result history and conditions](docs/benchmarks/swebench-lite-history.md)

#### v0.13.1 dev23 (2026-09-30)

**8/23 (34.8%)**, versus v0.12.25's 7/23; all seven prior resolutions retained, no empty patches or
official evaluation errors. [Fixed conditions, stopped-run accounting and costs](docs/benchmarks/swebench-lite-history.md#v0131-dev23-2026-09-30).

Each score belongs to its fixed candidate. SWE-bench remains an optional measurement, not a release
gate. Different splits, budgets, models and conditions are not controlled comparisons or proof of a fix's effect.

## Configuration

**OpenCode:** project settings `.opencode/sortie-dogs-v010.json`, global settings
`~/.config/opencode/sortie-dogs-v010.json`, JSON override `SORTIE_DOGS_V010_CONFIG`.
The default Mission state is `.sortie-dogs-v010/`; generated controls are host-owned.
[Precedence, settings, global installation and stable compatibility](docs/configuration.md).

**Codex:** use `codex mission --help` or `CodexMissionSession`. Optional `--model`, `--effort`,
`--permissions`, `--trusted-pwsh` and `--resume` are explicit host choices, not OpenCode settings.
[SDK and recovery reference](docs/codex.md).

## Updates and removal

Install the desired package version and rerun **your host's** initializer:

- Codex: `npx --no-install sortie-dogs codex init .`, then restart/open a new Codex chat.
- OpenCode: `npx --no-install sortie-dogs init .`, then completely restart OpenCode.

An OpenCode config-local bridge may resolve a separate package; npm-global update alone does not
update it. [Global/update instructions](docs/configuration.md#global-availability).
The current Mission asset marker is `0.14.9-optional-kofi-v1`; the Codex skill marker is
`0.14.6-codex-skill-v1`. Installed markers alone do not prove a running host reloaded the new version.

There is no supported uninstall command. Remove the dependency and only known Sortie-owned paths;
follow the [manual removal guide](docs/uninstall.md), never delete the entire `.opencode` directory.

## Documentation

- **Usage:** [Codex guide](docs/codex.md) · [OpenCode configuration](docs/configuration.md) ·
  [日本語 OpenCodeガイド](docs/guide-ja.md) · [简体中文 OpenCode指南](docs/guide-zh-CN.md).
- **Design:** [Worker instructions](docs/worker-instruction-design.md) ·
  [Quality-first review](docs/quality-first-review.md) · [Operation efficiency](docs/mission-operation-efficiency.md).
- **Evidence:** [Codex completion](docs/codex-write-status-anko-20261007.md) ·
  [SWE-bench history](docs/benchmarks/swebench-lite-history.md) · [Historical local case study](docs/benchmark-reference.md).
- **Development:** [Testing](docs/testing.md) · [CLI testing](docs/cli-testing.md) ·
  [Windows tests](docs/windows-tests.md) · [Release routine](docs/release-batch.md).
- **Releases:** [v0.14.9](docs/release-v0.14.9.md) · [v0.14.8](docs/release-v0.14.8.md) · [v0.14.7](docs/release-v0.14.7.md) · [v0.14.6](docs/release-v0.14.6.md) · [v0.14.5](docs/release-v0.14.5.md) · [v0.14.4](docs/release-v0.14.4.md) · [v0.14.3](docs/release-v0.14.3.md) · [v0.14.2](docs/release-v0.14.2.md) · [v0.14.1](docs/release-v0.14.1.md) · [v0.14.0](docs/release-v0.14.0.md) · [v0.13.22](docs/release-v0.13.22.md) · [v0.13.21](docs/release-v0.13.21.md) · [v0.13.20](docs/release-v0.13.20.md) · [v0.13.19](docs/release-v0.13.19.md) · [v0.13.18](docs/release-v0.13.18.md) · [v0.13.17](docs/release-v0.13.17.md) · [v0.13.16](docs/release-v0.13.16.md) · [v0.13.15](docs/release-v0.13.15.md) · [v0.13.14](docs/release-v0.13.14.md) · [v0.13.13](docs/release-v0.13.13.md) · [v0.13.12](docs/release-v0.13.12.md) · [v0.13.11](docs/release-v0.13.11.md) · [v0.13.10](docs/release-v0.13.10.md) ·
  [v0.13.9](docs/release-v0.13.9.md) · [All GitHub releases](https://github.com/zufall-upon/Sortie-dogs/releases).

## Support

[GitHub Sponsors](https://github.com/sponsors/zufall-upon) — sponsorships become available
once the maintainer's Sponsors profile is approved and published.

[☕ Support development / 開発を応援する](https://ko-fi.com/zufallupon)

If you find this project useful, you can buy me a coffee. Support is entirely optional.

このプロジェクトが役に立ったら、開発を応援できます。支援は完全に任意です。

## Community

[Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md) ·
[Security policy / private reports](SECURITY.md) · [Accessibility](ACCESSIBILITY.md) ·
[Report a bug or propose a feature](https://github.com/zufall-upon/Sortie-dogs/issues/new/choose).

Licensed under [MIT](LICENSE).
