# Sortie-dogs

**Give OpenCode a task; get a bounded, validated implementation loop instead of an open-ended agent run.**

> **Project status: Experimental / unsupported.** No stability, compatibility,
> or support guarantees are provided. Mk2A2 remains the canonical internal workflow.

[![npm](https://img.shields.io/npm/v/sortie-dogs)](https://www.npmjs.com/package/sortie-dogs)
[![license](https://img.shields.io/npm/l/sortie-dogs)](LICENSE)
[![Node.js](https://img.shields.io/node/v/sortie-dogs)](https://www.npmjs.com/package/sortie-dogs)

![Sortie-dogs coordinating a bounded implementation workflow](https://raw.githubusercontent.com/zufall-upon/Sortie-dogs/main/docs/assets/sortie-workflow.gif)

Sortie-dogs is an opt-in OpenCode orchestration plugin. It turns a task into a
scoped plan, optional evidence gathering, one bounded implementation unit, canonical
validation, and evidence-backed completion—while preserving standard OpenCode
agents and settings.

Requirements: Node.js 22.6 or newer, npm, and OpenCode.

Guides: [日本語](docs/guide-ja.md) · [简体中文](docs/guide-zh-CN.md) · [CLI testing](docs/cli-testing.md)

Release: [v0.5.12](https://github.com/zufall-upon/Sortie-dogs/releases/tag/v0.5.12)

## Quick start

Install the public npm package in the project and generate the project-local
OpenCode runtime files:

```sh
npm install --save-dev sortie-dogs
npx sortie-dogs init .
```

Alternatively, install the CLI globally and initialize OpenCode's global
configuration:

```sh
npm install --global sortie-dogs
sortie-dogs init --global
```

This installs the canonical runtime assets in OpenCode's global configuration,
so `dog-coordinator` can be selected from other projects without project-local
initialization. Global initialization and project-local initialization are
separate: `sortie-dogs init .` still writes runtime files only into that
project. Project-local configuration and the plugin bridge below remain
available when a project needs its own settings or dependency.

Installing the runtime assets does not load the plugin, and without the plugin
every role runs on whichever model the caller happened to use. Add the package
to the `plugin` array of the OpenCode configuration the agents run under —
`~/.config/opencode/opencode.json` for the global assets, or the project's
`.opencode/opencode.json`:

```json
{
  "plugin": ["sortie-dogs"]
}
```

Restart OpenCode afterwards. A `plugin` entry must name the package, not a
subpath: `sortie-dogs/plugin` is an import specifier, not a plugin specifier.

`dog-coordinator` defaults to `openai/gpt-5.6-terra` with the `high` variant; `dog-scout` defaults to
`openai/gpt-5.6-luna`. To pin either role to another model, save this
as `.opencode/sortie-dogs.json`:

```json
{
  "modelRouting": {
    "dog-coordinator": {
      "preferred": { "model": "provider/model" }
    },
    "dog-scout": {
      "preferred": { "model": "provider/model" }
    }
  },
  "modelCatalog": {
    "project": [{ "model": "provider/model" }]
  }
}
```

Replace `provider/model` with a model available to you.

A project that depends on the package can load it from
`.opencode/plugins/sortie-dogs.ts` instead of the `plugin` array:

```ts
export { SortieDogsPlugin } from "sortie-dogs/plugin";
```

OpenCode discovers that file automatically. Export the plugin and nothing else:
OpenCode calls every runtime export of a plugin module as a plugin factory, so
one extra export disables the whole module. Restart OpenCode, then start a task:

```text
/sortie <task>
```

Selecting `dog-coordinator` directly also activates the workflow.

## The write gate

The write gate is opt-in per project. Without `operation-manifest.json` in the
project root, the plugin stays passive and never denies a tool call. Creating
that file is how a project opts in, so the coordinator can always create it.

```json
{
  "version": "0.1.0",
  "task_id": "add-requested-behavior",
  "read": ["src/feature.ts", "test/feature.test.ts"],
  "write": ["src/feature.ts", "test/feature.test.ts"],
  "validation": ["npm test"]
}
```

- `write` lists the only paths a bound worker may change. A listed directory
  covers the files under it; every other entry is an exact path.
- `validation` lists the exact commands a bound worker may run. Build and test
  commands cannot be classified by path, so a command is allowed only when it
  matches a declared entry exactly. Anything else is denied as unclassified.
- `read` documents the intended reading scope; reads are never blocked.

`dog-coordinator` owns this file. A worker binds to it once per candidate with
`sortie_bind_write_gate`, and only after the coordinator's handoff has been
inspected. Coordinator sessions are never gated.

Both documents are schema-checked before inspection and binding, and every object
rejects unknown properties. A rejection always names the failing document, the
exact JSON pointer, and the failing rule, for example
`Defects: handoff /state/blocked/0 schema_type`, so the coordinator repairs that
pointer instead of resending an unchanged document. Check a handoff before
dispatch with the read-only `sortie_check_contract` tool, which reports the same
defects without inspecting or binding, or with `sortie-dogs lint <handoff.json>
--manifest <operation-manifest.json>`. The two most common defects are a
`state.blocked` list of strings instead of `{ reason, needed }` objects, and an
operation manifest that declares anything other than `version`, `task_id`,
`read`, `write`, and `validation`.

Optional settings in `.opencode/sortie-dogs.json`:

```json
{
  "operationManifestPath": "operation-manifest.json",
  "handoffPaths": ["handoff.json"],
  "readOnlyTools": ["my_mcp_search"],
  "dedicatedWorkerModel": { "model": "provider/model", "variant": "deep" },
  "continuation": { "enabled": true, "maxAutoContinues": 10 },
  "reflection": {
    "enabled": false,
    "layers": { "run": true, "project": true, "global": false }
  }
}
```

The same schema may be saved globally as
`~/.config/opencode/sortie-dogs.json` (on Windows,
`%USERPROFILE%\.config\opencode\sortie-dogs.json`). Precedence is built-in
defaults, global file, project file, `SORTIE_DOGS_CONFIG`, then plugin factory
options. OpenCode plugin normalization may omit factory options, so use the
global file for durable global settings.

- `operationManifestPath` moves the manifest; the path is project-relative.
- `handoffPaths` lists the handoff files the plugin inspects. A worker can only
  bind after one of these files passes inspection, so an empty list disables
  binding entirely. Relative entries are also candidate-relative in a nested
  repository: a child candidate may use its own `handoff.json` while OpenCode is
  opened at the parent workspace. For operational work the coordinator creates
  that valid handoff before dispatch and sends its exact absolute path; the
  binding child must use the built-in Read tool on it immediately before bind.
  New coordinator contracts are emitted under the candidate-relative
  `.sortie-dogs/contracts/` directory as `handoff.<id>.json` and
  `<id>.operation-manifest.json`. The directory is ignored by this repository's
  `.gitignore`; legacy root/scoped paths and configured custom paths remain
  readable and preflight-compatible, but are never moved or deleted.
  Remove the directory only when no Sortie run is active.
- `readOnlyTools` adds host-specific tool names that never change files, such as
  MCP tools. Unknown tools are denied for a bound session by default.
- `dedicatedWorkerModel` selects the single model every worker role resolves to.
  It defaults to `openai/gpt-5.6-luna` with variant `max`; declare your own when
  that model is unavailable or when you want a different worker effort. Worker
  roles always resolve to this one target and cannot be routed per role.
- `continuation` bounds the batch loop. After a terminal unit and its checkpoint,
  `dog-coordinator` calls `sortie_compact_and_continue`, which compacts the run
  and resumes the same root session on the next independent unit. Only a root
  `dog-coordinator` session is ever resumed: a child session is never promoted and
  another coordinator is never adopted. Set `enabled` to `false` to keep every
  batch manual, lower `maxAutoContinues` (default and maximum `10`) to change the
  ceiling, and set `summarizeModel` to override the latest coordinator
  model used for compaction. Normal OpenCode auto-compaction keeps the
  host's auto-continue behavior; Sortie suppresses it only while its own
  explicitly queued rollover owns the resume.
  Every terminal root-coordinator response that does not resume another unit
  compacts without auto-continuing, so completed tool output is not carried into
  the next user request.
- `reflection` is an opt-in process-prevention companion for an activated root
  `dog-coordinator`. It is disabled by default. Run and project layers default
  to enabled after opt-in; the cross-project global storage layer remains
  disabled unless explicitly enabled. Child and non-coordinator sessions fail
  closed, and `SORTIE_REFLECTION=0` is an immediate kill switch. The coordinator
  evaluates it only after a resolved blocker/review defect and at a terminal
  unit, with a maximum of three records per run; routine bugs and external
  failures are never journaled.

## Why Sortie-dogs

- **Focused when invited, invisible otherwise.** Activate it with `/sortie` or
  select `dog-coordinator`; ordinary OpenCode sessions remain unchanged.
- **Evidence gathering without arbitrary dispatch ceilings.** A bounded scout resolves
  each concrete manifest, validation, or ownership gap whenever it appears; unchanged
  requests are not repeated.
- **Writes stay inside the assignment.** Exact source or operation manifests
  gate edits and handoffs.
- **Autonomous sequential implementation.** A normal request may use as many sequential
  workers as its accepted scope requires. Concurrent fan-out still needs the explicit
  parallel contract.
- **Runtime overlap protection.** Active equal or ancestor write scopes are rejected
  before mutation, and full validation waits until every parallel unit joins.
- **Evidence before completion.** Canonical validation, risk-based review, and
  terminal evidence gate coordinator-owned completion and commits.
- **Long work can recover.** Restart recovery and bounded compaction continue
  from retained handoff context rather than silently starting over.

## Example run

An illustrative low-risk run stays bounded and reports its gates:

```text
You: /sortie Add the requested behavior
dog-coordinator: manifest confirmed
dog-scout: skipped — no concrete evidence gap
dog-worker: implementation complete
validation: npm test — PASS
review: skipped — low risk
dog-coordinator: completion evidence accepted
```

## The workflow

1. **Brief and plan** — `dog-coordinator` turns the request into acceptance
   criteria, a write manifest, and validation requirements.
2. **Optional scout** — one bounded, read-only investigation runs only for a
   concrete pre-worker evidence gap.
3. **Dedicated worker** — the dedicated worker implements only the approved
   manifest and also owns scoped remediation or blocker resolution.
4. **Canonical validation** — the declared test or build command must produce
   acceptable evidence.
5. **Risk-based review** — high-risk candidates receive independent review;
   low-risk candidates can skip that extra pass after validation.
6. **Coordinator completion** — only the coordinator closes the loop and owns
   any commit after manifest, validation, review, and evidence gates pass.
7. **Bounded continuation** — restart recovery and compaction handoffs preserve
   progress; repeated batches remain bounded rather than becoming endless
   delegation.

## A visual walkthrough

### Control complexity

![Bounded roles and gates containing orchestration complexity](https://raw.githubusercontent.com/zufall-upon/Sortie-dogs/main/docs/assets/sortie-complexity.png)

The coordinator keeps investigation, implementation, validation, and review in
separate roles. Manifest gates keep their writes bounded even as the project
gets more complex.

### Finish with evidence

![Validated work reaching coordinator-owned completion](https://raw.githubusercontent.com/zufall-upon/Sortie-dogs/main/docs/assets/sortie-complete.png)

Validation and risk-based review happen before coordinator-owned completion, so
the result returns with a concise record of what changed and how it was checked.

## Scope and session guarantees

The plugin is passive by default. It activates a session only when a message
uses `/sortie` or the selected agent is `dog-coordinator`. It validates exact
write scope through source or operation manifests and rejects invalid worker
handoffs. Standard OpenCode agents, roles, settings, and unrelated sessions are
preserved.

On `session.idle`, the final handoff is checked and the session is released. A
`session.deleted` event also releases it. A later request must activate the
workflow again.

One host defect is repaired in place. A subagent result is built from the last
text part of the child's final message, so a reasoning model that closes its
turn with an empty text part returns an empty result and the coordinator
re-dispatches work the worker already finished. When a completed `task` result
is empty, Sortie-dogs restores the last real assistant text from that child
session. Non-empty results, other tools, and unreadable child sessions are left
untouched.

## Model routing

Default routes split work by required capability and repeated-context cost.
Sortie-dogs keeps retrieval on Luna, coordinator routing on Terra, and independent
review on Sol unless the host declares another target.

`dog-coordinator` defaults to `openai/gpt-5.6-terra` with the `high` variant. Coordinator quality controls
planning and forward progress, so Terra High is the default balance between capability and cost.
Project or global `modelRouting` can override
this default. If the host proves Terra unavailable,
the existing availability policy uses a configured free-tier fallback when present
and otherwise preserves the session model.

`dog-scout` defaults to `openai/gpt-5.6-luna` with the `high` variant, since
gathering bounded evidence is retrieval rather than reasoning and that tier is
where the curve gives the most per unit of cost. Nobody selects a model for a
session the loop spawns, which is why delegated roles carry defaults and the
coordinator does not. Project-local routing can override this default.

The `implementation`, `remediation`, `blocker-resolution`, and `dog-worker`
roles always use the dedicated worker target, `openai/gpt-5.6-luna` with the
`max` variant. Worker effort stays at the top of that model's range while review
effort stays above it on a stronger model, which is what mandatory source review
is for. Declare `dedicatedWorkerModel` as `openai/gpt-5.6-sol` when you would
rather pay for the stronger worker model up front; that target stays in the
built-in catalog for exactly this reason. `modelRouting`
cannot replace those routes, and only `dedicatedWorkerModel` moves them. For other explicitly
routed roles, resolution is deterministic: Sortie-dogs tries the preferred
target, then ordered fallbacks. Roles without either a built-in default or an
explicit route keep OpenCode's already selected model.

`dog-reviewer` and `dog-advisor` must never inherit the caller's model, because
review and strategy lose their value when they run on the model that produced
the candidate. Both default to `anthropic/claude-opus-5` when the catalog
declares it, and otherwise fall back to `openai/gpt-5.6-sol` with the `xhigh`
variant. That fallback stays on the stronger model rather than matching the
worker target, because review has to be able to reject work the worker just
produced. A host that redeclares
`dedicatedWorkerModel` keeps that target as its first fallback, since such a
host may not serve the shipped model at all. Nothing here requires a particular
vendor: both roles stay fully configurable, so declare whichever model you can
actually serve.

```json
{
  "modelRouting": {
    "dog-coordinator": {
      "preferred": { "model": "openai/gpt-5.6-luna", "variant": "max" }
    },
    "dog-scout": {
      "preferred": { "model": "openai/gpt-5.6-luna", "variant": "high" }
    },
    "dog-reviewer": {
      "preferred": { "model": "anthropic/claude-opus-5" },
      "fallback": [{ "model": "openai/gpt-5.6-sol", "variant": "xhigh" }]
    },
    "dog-advisor": {
      "preferred": { "model": "openai/gpt-5.6-sol", "variant": "xhigh" }
    }
  },
  "modelCatalog": {
    "project": [
      { "model": "openai/gpt-5.6-sol", "variants": ["medium", "xhigh"] },
      { "model": "openai/gpt-5.6-luna", "variants": ["max", "high"] },
      { "model": "anthropic/claude-opus-5" }
    ]
  }
}
```

Save project configuration as `.opencode/sortie-dogs.json`. `modelCatalog`
declares provider models and named variants that are actually available;
Sortie-dogs does not invent, probe, or translate variants. The built-in catalog
intentionally omits `anthropic/claude-opus-5`, so the preferred consultation
model applies only after you declare it. Resolution tries the preferred target
and then its fallbacks, rejecting an explicitly routed role when no candidate
appears in the catalog.

`dog-advisor` accepts bounded Strategy or SourceReview consultation from the
coordinator. `dog-reviewer` independently checks high-risk candidates after
canonical validation. Neither role implements, stages, commits, or acts as a
user-facing worker.

## Updates and migration

After replacing the dependency with a newer release asset, run:

```sh
npx sortie-dogs init .
```

`init` is idempotent. It updates files owned by Sortie-dogs, migrates recognized
older runtime files, and records the installed version in
`.opencode/sortie-dogs.version`. Conflicting or unrecognized files remain
untouched and initialization stops safely. User-owned configuration—including
`.opencode/sortie-dogs.json`—and standard OpenCode files are preserved.

## Safe manual removal

There is no supported Sortie-dogs uninstall command. Remove the npm dependency
separately, then follow the [safe manual removal guide](docs/uninstall.md) to
delete only Sortie-dogs-owned runtime files without affecting user files or
standard OpenCode agents.
