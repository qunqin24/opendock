# @heretek-ai/opencode-teamwork-v2

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
security auditor, document segment reviewer, formalization reviewer,
tournament referee, and independent victory auditor (15 total) and 7 slash commands,
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
package.json                      # npm manifest (name: @heretek-ai/opencode-teamwork-v2)
index → plugins/opencode-teamwork/index.ts   # V2 plugin, registers the 7 commands
plugins/opencode-teamwork/tools.ts           # engine tools + hooks (V2 API)
plugins/opencode-teamwork/document-review.ts # Document Review route classifier, PDF/MD ingestion, RSA bounds
plugins/opencode-teamwork/lemma.ts           # LEMMA (Lean 4) probe, classifier, verifier
plugins/opencode-teamwork/tournament.ts      # bounded massive-proof tournament & opt-in router
agents/team/*.md                  # 15 team agents (markdown, V2 frontmatter)
docs/ARTIFACTS.md                 # canonical artifact layout, topologies, schemas
lib/team.mjs                      # installer core (config dir, model map, agent files)
lib/picker.mjs                    # interactive model picker (`opencode models`)
lib/runs.mjs                      # run inspection, DAG visualization, worktree pruning
lib/doctor.mjs                    # environment diagnostic health checks
lib/timeline.mjs                  # chronological run lifecycle builder & renderer
lib/export.mjs                    # read-only run report builder (HTML / Markdown export)
bin/opencode-teamwork.mjs         # CLI: init / models / install / status / doctor / runs / inspect / timeline / export / prune
scripts/lint-prompts.mjs          # prompt linter (run in CI)
scripts/test-cost.mjs             # session tree consumption tests
scripts/test-engine.mjs           # DAG engine, security gate & worktree tests
scripts/test-doctor.mjs           # hermetic environment & CLI doctor tests
scripts/test-timeline.mjs         # timeline hermetic unit tests
postinstall.mjs                   # asks for models during npm install
```

## Engine (tools + hooks)

The run mechanics are real, not prompt prose. The plugin registers deterministic
tools (named `teamwork_*` after the `teamwork` namespace) and runtime permission hooks:

| Tool | Purpose |
| --- | --- |
| `teamwork_budget` | budget preflight: console credit derivation |
| `teamwork_route` | priority-ordered route classifier (`document-review` first and before Math/Proof, then explicit Lean 4/LEMMA, then opt-in `massive-proof`; rejects PR/code reviews, bare filenames without a supplied doc, and theorem-solving requests) |
| `teamwork_plan` | create the run dir + signed `run.manifest.json` / `plan.dag.json` / `state.json` / `costs.json` (with pre-`mkdir` tournament preflight) |
| `teamwork_document_triage` | ingest/partition a supplied document into `seg-01`..`seg-0K` + `doc-synthesis` with pre-`mkdir` bounds & path containment checks; live URLs go through the SSRF guard |
| `teamwork_document_record` | persist bounded RSA tree node outputs, `unit-report.md`, `candidate-<I>.md`, and `DOCUMENT_REVIEW_REPORT.md` |
| `teamwork_tournament` | bounded `massive-proof` tournament state machine (`estimate`, `init`, `propose`, `falsify`, `merge`, `score`, `audit`, `cancel`, `status`) |
| `teamwork_preflight` | re-check a run's named inputs, write `preflight.json` (reports, never blocks) |
| `teamwork_status` | per-task progress for the active run |
| `teamwork_resume` | tasks still open, for a restart |
| `teamwork_cost` | read real budget spend across OpenCode session tree (sentinel + workers + verifiers); snapshot updates are digest-idempotent |
| `teamwork_pitfall` | append to the pitfall registry (dynamically injected into workers) |
| `teamwork_next` | evaluates DAG dependencies, lifecycle states, and ready tasks; atomically leases each ready task (15 min) so concurrent resumes cannot dispatch duplicates; strict runs stop at `NEEDS_STRICT_WAVE` until both wave verdicts exist |
| `teamwork_task_update` | deterministic task state machine transitions (`pending` → `worker_active` → `worker_done` → `verifier_active` → `verified_pass` / `verified_fail` / `blocked`); `worker_active` needs a live `teamwork_next` claim (recorded Sentinel override) |
| `teamwork_handoff` | trusted five-section handoff writer (`handoffs/<taskId\|_run>-<role>.md` + bounded `handoffs/index.json`); continuity evidence required by `final_verify`/`next` when `requireHandoffs: "required"`, never a gate verdict |
| `teamwork_report` | trusted writer for a signed `verify/report-<taskId>.json`: caller must be `team/verifier`, descend from the run root, and name an existing task; a `PASS` needs a summary or check |
| `teamwork_security_audit` | mandatory pre-merge security gate (`verify/security-audit.json`; signed on a signed run) |
| `teamwork_victory_audit` | record the independent `team/victory-auditor` acceptance verdict, bound to the current `ORIGINAL_REQUEST.md` and `requirements.json` hashes (`verify/victory.json`); caller must descend from the run root |
| `teamwork_wave_record` | strict mode only: record one `team/falsifier` challenge (`PASS`) or `team/security-auditor` audit (`CLEAN`) per task (`verify/challenge-<task>.json` / `verify/audit-<task>.json`); trusted caller identity + session tree, sha256-bound to the verifier report (same-report write-once, changed-report replace) |
| `teamwork_final_verify` | compute the final verdict from the task reports + security audit + victory audit (plus the strict wave when enabled, and `lemma/` artifacts when in LEMMA mode), verify the signed baseline, stamp it, write signed `verify/final.json` |
| `teamwork_lemma_probe` | read-only probe for `lean`, `lake`, and the LEAP CLI (`leap`; legacy `leap-tools` accepted) on `PATH` |
| `teamwork_lemma_formalize` | LEMMA Phase 0 `problem_draft.lean` / `review_pre` → `problem.lean` and `review_final` faithfulness gate |
| `teamwork_lemma_node` | bounded lemma decomposition tree (`create`, `update`, `blueprint`, `attempt`) |
| `teamwork_lemma_verify` | execute real `lean`/`lake` verification with `sorry`/admit/axiom rejection, stamping `verify-<r>.json` |
| `teamwork_worktree` | out-of-repo git worktree provisioning, diff, merge, resolve & cleanup |

**Tool authorization.** Plugin tools are not mediated by the permission hook,
so every run-mutating `teamwork_*` tool checks the caller itself
(`authorize.ts`). The trusted session agent (`ctx.session.get`) must match the
tool/action lane and, for run-bound tools, the caller must descend from the
plan-time `rootSessionId`; a caller-supplied `agent` label is never authority.
Examples: `teamwork_plan`/`teamwork_document_triage` are sentinel/crafter lanes,
`teamwork_security_audit` is `team/security-auditor` only,
`teamwork_final_verify` is `team/verifier`/sentinel, `teamwork_lemma_node` is
`team/proof-worker`, and tournament `propose`/`falsify`/`merge`/`score` are
`proposer`/`falsifier`/`synthesizer`/`referee` respectively. Unresolved identity
fails closed for mutating tools. Read-only `teamwork_status`,
`teamwork_resume`, and `teamwork_cost` stay available to every installed
`team/*` role. See `docs/GUARDRAILS.md` for the full matrix.

**URL network policy.** `document.url` ingestion and preflight URL checks use
`url-guard.ts`: http/https only, public addresses only (loopback, private,
link-local, metadata, multicast, reserved, and IPv4-mapped IPv6 are rejected),
DNS answers are validated and the connection is pinned to them, redirects are
not followed (a `Location` is validated before refusal), and timeouts/size caps
apply. `OPENCODE_TEAMWORK_ALLOW_LOCALHOST=1` is the explicit test/development
opt-in that permits loopback only; the default is deny.

Hooks: `permission.evaluate` enforces the per-agent read-only policy **in code**
(not just in their prompts). The read-only agents (`team/verifier`,
`team/falsifier`, `team/scout`, `team/security-auditor`,
`team/segment-reviewer`, `team/formalization-reviewer`, `team/referee`,
`team/victory-auditor`) all deny the `edit` tool, so none of them can write
through it. `shell` is still available to the verifier, scout, security auditor
and victory auditor, and it can modify files; the falsifier, segment reviewer,
formalization reviewer, and referee also have `shell` denied, and the segment,
formalization, referee, and victory-auditor roles deny `webfetch` and
`subagent` as well (the verifier and security auditor deny `webfetch`). In
short: no writes through `edit` for all eight, and no `shell` writes for the
falsifier, segment reviewer, formalization reviewer, or referee. The
`team/victory-auditor` keeps `shell` (it can modify files) and is denied `edit`,
`webfetch`, and `subagent`; its independence comes from a fresh session that
inspects the delivered artifacts and runs tests itself, not from capability
isolation.
The hook also enforces network constraints: when the active run's
`constraints.network` is `denied` (read from `prompt_draft.md` or a per-task
`spec.json`), `webfetch` is denied for **every** `team/*` agent — sentinel,
workers, verifiers, reviewers and auditors alike. `shell` network access is
still honor-system: the permission layer cannot sandbox it. `session.context`
injects the active run's state + recent pitfalls into every team agent's system
prompt.

All run artifacts live under `.opencode/teamwork/<session-id>/`; see
[`docs/ARTIFACTS.md`](docs/ARTIFACTS.md) for the layout, the canonical
topologies, and the JSON schemas (`spec.json`, `plan.dag.json`, `state.json`,
`verification_report.json`). The installer copies that reference to
`<config-dir>/teamwork/ARTIFACTS.md` next to your agents.

### Completion guarantees

- `verified_pass` requires a legal lifecycle transition and PASS evidence (an inline PASS verdict or a `PASS` per-task report).
- A plan writes a signed `run.manifest.json` (the default). Verifier reports, security audit, strict-wave verdicts, victory verdict, and final verdict carry an `_auth` envelope and a `ctx.storage` digest-index entry. `final_verify`/`next` fail as `AUTH_MISSING`, `AUTH_INVALID`, `AUTH_UNKNOWN_KEY`, `AUTH_INDEX_MISSING`, or `AUTH_STALE` when an artifact is forged, copied, edited, or the signed plan/requirements/policy baseline drifts. See [`docs/adr/0005-artifact-authenticity.md`](docs/adr/0005-artifact-authenticity.md).
- `_auth` supports HMAC-SHA256 (backward-compatible `mac`) and Ed25519 (`sig`). Every new signed run pins a 128-bit `runNonce` and `runKeyId` in the manifest, so a cross-run copy or a rotated re-sign fails. With Ed25519, verification needs only the SPKI public key. `teamwork_plan` also records `trustLevel` (`local-hmac` default, `external-signer`, `human-approved`, `ci-attested`) and optional `requireWitness`; `final_verify` enforces the level, and `OPENCODE_TEAMWORK_SIGNER`/`OPENCODE_TEAMWORK_WITNESS` fail closed (`AUTH_SIGNER_UNAVAILABLE`/`AUTH_WITNESS_UNAVAILABLE`). See [`docs/adr/0008-signer-spi-and-trust-levels.md`](docs/adr/0008-signer-spi-and-trust-levels.md) and [`SECURITY.md`](SECURITY.md).
- A run completes only with a `PASS` `verify/final.json` stamped by `teamwork_final_verify`; an unstamped report needs the recorded `allowUnstamped` bypass. An unsigned legacy run returns `AUTH_LEGACY` until the recorded `allowUnsignedLegacy` bypass is passed at the completion gate; `benchmark` refuses that bypass, `victoryAudit: "skip"`, and `requireHandoffs: "skip"`.
- `teamwork_victory_audit`, `teamwork_wave_record`, and `teamwork_report` require the caller session to descend from the plan-time `rootSessionId`, so a top-level `opencode run --agent team/victory-auditor` cannot self-authorize.
- That PASS also needs a `verify/victory.json` from the independent `team/victory-auditor` reporting `VICTORY CONFIRMED` for every requirement and the current `ORIGINAL_REQUEST.md` hash, unless the plan explicitly recorded `victoryAudit: "skip"` with a non-empty `victorySkipReason` (then `final_verify` records `victory: "SKIPPED (explicit): <reason>"`). A skip without a reason is refused; the legacy no-baseline default is labelled `SKIPPED (legacy default: no requirements baseline)`.
- The security audit fails on integrity-rule violations for the run's mode, and that blocks the merge.
- Opt-in `verification: "strict"` adds exactly one `team/falsifier` challenge (`PASS`) and one `team/security-auditor` audit (`CLEAN`) per task after its verifier report. Missing, stale, or non-PASS/CLEAN verdicts block `teamwork_next` (`NEEDS_STRICT_WAVE`) and `teamwork_final_verify`; a strict PASS writes `GATE_STATUS.md` with worker/verifier/challenger/auditor rows and a `## Continuity` handoff table. The default `standard` mode is unchanged, and the wave reuses the existing agents rather than adding roles.
- `requireHandoffs: "required"` (the default for a new run with a request or requirements baseline) makes `final_verify` and `next` demand continuity handoffs derived from the plan: the assigned worker and `team/verifier` per task, `team/falsifier` + `team/security-auditor` per task in strict mode, one `team/sentinel`/`team/orchestrator` run-level handoff, and the `team/victory-auditor` run-level handoff after a confirmed victory audit. Each entry must match `handoffs/index.json` (regular non-symlink file, sha256/byte length) and cite the current report/wave/audit/victory; a changed cited artifact makes it stale. Missing pairs return `NEEDS_HANDOFFS`, stale/duplicate/unknown/tampered evidence returns `BLOCKED_BY_HANDOFFS`, and a passing gate records `handoffs` plus `evidence.handoffs` in `verify/final.json`. An explicit `requireHandoffs: "skip"` is recorded as `handoffs: "SKIPPED (explicit)"` and never reads the index; handoff prose is never a verdict.
- Planning refuses to start when blocking inputs are missing or unreachable unless `allowMissingInputs` is recorded.
- `state.json`, `costs.json`, `events.jsonl`, and `handoffs/index.json` are read-modify-written under a cross-process `<artifact>.lock` plus the in-process queue. `teamwork_next` stamps a 15-minute claim (`claim.by/at/leaseUntil`) and skips a different live claimant, so two resumed Sentinels cannot dispatch the same ready task; an expired claim is reclaimed with `previousClaimant` recorded. `worker_active` requires a live claim (a Sentinel override is recorded), and terminal states clear it. See [docs/ARTIFACTS.md](docs/ARTIFACTS.md#cross-process-lock-files-artifactlock) for the lock protocol and the NFS caveat.
- `teamwork_cost` is digest-idempotent: `costs.json` stores `appliedSnapshotDigest` plus per-session `snapshotCursors`, so applying the same usage observation twice (including a retry after a crash between the costs and snapshots writes) adds the delta once and preserves budget/bucket totals.
- Legacy topology aliases are normalised on write; an unknown topology is refused before anything is written.

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
opencode plugin add github:Heretek-AI/opencode-teamwork-v2

# then choose a model for each agent:
npx github:Heretek-AI/opencode-teamwork-v2 init
```

If `npx github:…` is unavailable, run the bundled CLI straight from the install
directory:

```sh
node ~/.config/opencode/node_modules/@heretek-ai/opencode-teamwork-v2/bin/opencode-teamwork.mjs init
```

### From npm

```sh
opencode plugin add @heretek-ai/opencode-teamwork-v2

npx @heretek-ai/opencode-teamwork-v2 init      # pick models, install agents, register plugin
npx @heretek-ai/opencode-teamwork-v2 models    # pick models only (never edits opencode.json)
npx @heretek-ai/opencode-teamwork-v2 status    # show what is installed and mapped
npx @heretek-ai/opencode-teamwork-v2 doctor    # diagnose environment health (or --json)
npx @heretek-ai/opencode-teamwork-v2 runs      # list active/past runs and spent budgets
npx @heretek-ai/opencode-teamwork-v2 inspect   # inspect latest run DAG, tasks, and audit
npx @heretek-ai/opencode-teamwork-v2 timeline  # chronological run timeline, task durations & cost
npx @heretek-ai/opencode-teamwork-v2 export    # export a run report (HTML by default, or --markdown)
npx @heretek-ai/opencode-teamwork-v2 prune     # prune completed git worktrees
```

`opencode-teamwork` and `opencode-teamwork-v2` are aliases for the same CLI. If
you are running from **inside this package's own checkout**, use the bundled
scripts (`npm run init`, `npm run models`, `npm run status`, `npm run doctor`, `npm run timeline`, `npm run runs`, `npm run inspect`, `npm run prune`) — `npx <name>` there
resolves the local package rather than the registry copy.

Agent prompt files are left untouched by default. To also adopt updated prompt
bodies (keeps your model choices, backs up the old files):

```sh
npx @heretek-ai/opencode-teamwork-v2 install --refresh
```

Non-interactive / scripted use:

```sh
npx @heretek-ai/opencode-teamwork-v2 install --all anthropic/claude-sonnet-4-5
npx @heretek-ai/opencode-teamwork-v2 install --model sentinel=deepseek/deepseek-v4-pro \
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

## First run (5 minutes)

1. Install the plugin: `opencode plugin add @heretek-ai/opencode-teamwork-v2`.

2. Assign models and install the agents. `init` writes
   `~/.config/opencode/teamwork.json`, installs all 15 agents and registers the
   plugin; `models` rewrites only the model map and the agents' `model:` lines.
   Both are safe to re-run.

   ```sh
   npx @heretek-ai/opencode-teamwork-v2 init
   npx @heretek-ai/opencode-teamwork-v2 models
   ```

3. In your project, run `/teamwork-craft`. The 9-step interview writes the
   approved spec to `.opencode/teamwork/<session-id>/prompt_draft.md`.

4. Review it, then run `/teamwork <session-id>`. Planning enforces the **spec
   presence gate**: a non-empty `prompt_draft.md` must exist. The explicit
   bypass is `skipInterview: true` on `teamwork_plan`, recorded as
   `specGate: "bypassed"`. Presence is not proof of user approval:
   `skipInterview` / `requireSpec: false` are caller-controlled and recorded,
   not an approval signature.

5. The run directory `.opencode/teamwork/<session-id>/` holds `plan.dag.json`
   (the task DAG), per-task `verify/report-<task>.json` reports, and
   `verify/final.json` — written and stamped by `teamwork_final_verify`, never
   by hand.

6. Inspect it afterwards from the project root:

   ```sh
   npx @heretek-ai/opencode-teamwork-v2 status     # install + model map
   npx @heretek-ai/opencode-teamwork-v2 timeline   # per-task timing, rounds, spend
   npx @heretek-ai/opencode-teamwork-v2 export     # HTML report (-m for Markdown)
   ```

## Run reports (`export`)

`opencode-teamwork export` turns one run into a report you can share or archive.
It only reads the run directory; it never changes run state.

```sh
npx @heretek-ai/opencode-teamwork-v2 export [<session-id>] [--session <id>] [--html | -m|--markdown] [-o <file>|-o -]
```

- **Session id:** pass it positionally (`export <session-id>`) or with
  `--session <id>`. If you omit it, the newest run under `.opencode/teamwork/`
  (most recently updated) is exported.
- **Format:** `--html` is the default. `-m` / `--markdown` writes GitHub-flavored
  Markdown instead.
- **Output:** with `-o <file>` / `--output <file>` the report goes to that file.
  Without `-o`, the report is written to
  `.opencode/teamwork/<session-id>/report.html` (or `report.md` for Markdown) and
  the **absolute** path is printed to stdout. `-o -` streams the report to stdout
  and writes no file.
- **Exit codes:** `0` on success; `1` for a missing or invalid run, or a file-write error.

Examples:

```sh
# HTML to .opencode/teamwork/<id>/report.html
opencode-teamwork export 20261012-101500-a1b2

# Markdown to .opencode/teamwork/<id>/report.md
opencode-teamwork export 20261012-101500-a1b2 -m

# Same run, named output file
opencode-teamwork export --session 20261012-101500-a1b2 -o report.html

# Stream Markdown to stdout and redirect it yourself
opencode-teamwork export -m -o - > run-report.md

# Newest run, HTML
opencode-teamwork export
```

The HTML report is a **standalone single file**: CSS is embedded, and it loads no
CDN, fonts, or scripts, so it works fully offline and is safe to attach or archive.
The Markdown report uses tables and a checklist, so it pastes cleanly into a PR
description or issue comment. Both show the summary (status, topology, duration,
budget, spend, tokens), a tasks table, the security audit, and the pitfalls. See
[`docs/ARTIFACTS.md`](docs/ARTIFACTS.md#export-report-reporthtml--reportmd) for the
format details.

## Model assignment

Each agent's model lives in the `model:` frontmatter of its markdown file. The
shipped defaults are:

- `deepseek/deepseek-v4-pro`: sentinel, orchestrator, synthesizer, verifier, falsifier, proof-worker, formalization-reviewer, security-auditor, referee
- `deepseek/deepseek-flash`: crafter, worker, proposer, scout, segment-reviewer

Change them with `opencode-teamwork init` (interactive), the flags above
(scripted), or by editing the frontmatter / `teamwork.json` directly and running
`opencode reload`.

## Publishing (maintainers)

There is **no separate "Bun registry"** — Bun installs from the npm registry, so
publishing to npm is what makes the package available to `bun add`, OpenCode, and
npm alike. Two ways to ship:

**A. GitHub only (no npm account).** Nothing to publish — users install the git
spec directly (`opencode plugin add github:Heretek-AI/opencode-teamwork-v2`). Just
tag releases:

```sh
git tag v0.3.0 && git push origin main --tags
```

**B. npm registry, without interactive login.** Create a *Granular Access Token*
(npmjs.com → Access Tokens → check **Bypass 2FA**, grant publish), then:

```sh
npm config set //registry.npmjs.org/:_authToken=TOKEN
npm whoami                       # verify
npm pack                         # inspect the tarball
npm publish --dry-run
npm publish --access public
```

For CI, this repo ships [`.github/workflows/publish.yml`](.github/workflows/publish.yml)
using **npm Trusted Publishing** (OIDC, no long-lived token). One-time setup:

1. Create the package with a first manual publish (`npm publish`, token above) —
   package settings only exist once the package exists.
2. On npmjs.com: **Package → Settings → Trusted Publisher → GitHub Actions**
   with user `Heretek-AI`, repo `opencode-teamwork-v2`, workflow `publish.yml`,
   and `npm publish` allowed.
3. Release afterwards by tagging:

   ```sh
   npm version patch        # bumps package.json + creates the vX.Y.Z tag
   git push --follow-tags   # triggers the workflow
   ```

Release tags are provenance-checked before publish:
`scripts/check-release-tag.mjs` requires the tag's commit to be an ancestor of
`origin/main`. The historical `v0.6.0` and `v0.7.0` tags are sibling release
commits with trees identical to their `main` release commits; they predate this
guard. Every future `v*` tag push must point at a commit already on `main`, and
published tags are never rewritten.

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

The 15 shipped agents are installed as markdown files under `~/.config/opencode/agents/team/`. Specialised roles are added strictly alongside the route that exercises them (never a 49-file flat roster or unused roles):

| Agent | File | Default Model | Consuming Route / Topology | Code-Enforced Deny Set (`READ_ONLY_ACTIONS`) | Purpose |
| --- | --- | --- | --- | --- | --- |
| `team/crafter` | `crafter.md` | `deepseek/deepseek-flash` | `/teamwork-craft` (all routes) | — (interactive `ask` on `edit`/`shell`) | 9-step elicitation wizard producing `prompt_draft.md` |
| `team/sentinel` | `sentinel.md` | `deepseek/deepseek-v4-pro` | `/teamwork` (all routes) | — | Main DAG coordinator, route dispatcher, worktree manager |
| `team/orchestrator` | `orchestrator.md` | `deepseek/deepseek-v4-pro` | `/team-orchestrate` (legacy v1 loop) | — | Legacy propose → falsify → synthesize → verify loop coordinator |
| `team/scout` | `scout.md` | `deepseek/deepseek-flash` | All routes (pre-plan context gathering) | `edit`, `subagent` (`shell` available, can modify files) | Read-only repository and documentation context gatherer |
| `team/worker` | `worker.md` | `deepseek/deepseek-flash` | `small-focused`, `iterative-coding`, `distributed-coding` | — (`webfetch` denied when `network: denied`) | Implementation worker operating in an isolated git worktree |
| `team/proof-worker` | `proof-worker.md` | `deepseek/deepseek-v4-pro` | `proof` (including LEMMA `lemmaMode: true`) & `massive-proof` | — | Formal and mathematical proof searcher / Lean 4 prover |
| `team/proposer` | `proposer.md` | `deepseek/deepseek-flash` | `proof`, `massive-proof`, `/team-propose` | — | Parallel candidate generator with distinct proof/coding strategies |
| `team/falsifier` | `falsifier.md` | `deepseek/deepseek-v4-pro` | `proof`, `massive-proof` (`FALSIFY_PRUNE`), `/team-falsify` | `edit`, `shell`, `subagent` | Read-only adversarial critic and tournament falser |
| `team/synthesizer` | `synthesizer.md` | `deepseek/deepseek-v4-pro` | `distributed-coding` (merge conflict), `document-review` (`doc-synthesis`), `massive-proof` (`MERGE`), `/team-synthesize` | — | Candidate merger, tournament level aggregator, and cross-segment document synthesizer |
| `team/verifier` | `verifier.md` | `deepseek/deepseek-v4-pro` | All routes (`readyForVerifier`, `teamwork_final_verify`, `/team-review`) | `edit`, `webfetch`, `subagent` (`shell` available, can modify files) | Independent verification forcing function |
| `team/security-auditor` | `security-auditor.md` | `deepseek/deepseek-v4-pro` | All routes (`READY_FOR_SECURITY_AUDIT`, `teamwork_security_audit`) | `edit`, `webfetch`, `subagent` (`shell` available, can modify files) | Mandatory pre-merge security and integrity-mode auditor |
| `team/segment-reviewer` | `segment-reviewer.md` | `deepseek/deepseek-flash` | `document-review` (`teamwork_document_triage` / `teamwork_document_record`) | `edit`, `shell`, `webfetch`, `subagent` | Strictly read-only RSA tree (`[4,2,1]`) analyst/aggregator/adjudicator for one document segment |
| `team/formalization-reviewer` | `formalization-reviewer.md` | `deepseek/deepseek-v4-pro` | `proof` with `lemmaMode: true` (`teamwork_lemma_formalize`) | `edit`, `shell`, `webfetch`, `subagent` | Strictly read-only Lean 4 formalization faithfulness reviewer (`APPROVE` / `FAITHFUL`) |
| `team/referee` | `referee.md` | `deepseek/deepseek-v4-pro` | `massive-proof` (`teamwork_tournament` `score` & `audit`) | `edit`, `shell`, `webfetch`, `subagent` | Strictly read-only tournament referee, deterministic candidate scorer, and tournament victory auditor |
| `team/victory-auditor` | `victory-auditor.md` | `deepseek/deepseek-v4-pro` | Every run (`victoryAudit: "required"`, before completion) | `edit`, `subagent`, `webfetch` (`shell` available, can modify files) | Independent fresh-session final acceptance auditor against `ORIGINAL_REQUEST.md` + `requirements.json`; records `VICTORY CONFIRMED`/`VICTORY REJECTED` via `teamwork_victory_audit` |

Model assignments live in each agent's frontmatter (`model:`); see
[Model assignment](#model-assignment) for how to set them.

**Continuity roster note.** The roles that publish handoffs (`team/worker`,
`team/proof-worker`, `team/segment-reviewer`, `team/synthesizer`,
`team/verifier`, `team/falsifier`, `team/security-auditor`,
`team/victory-auditor`, and the run-level `team/sentinel`/`team/orchestrator`)
call `teamwork_handoff`; the sentinel/orchestrator pass the run id and task id
to every child and require a handoff before it reports. A handoff is
narrative/citation evidence for the next agent, not a verdict. When the plan
records `requireHandoffs: "required"` (the default with a request/requirements
baseline), `final_verify` and `next` reject missing, stale, duplicate, unknown,
or tampered handoffs (`NEEDS_HANDOFFS` / `BLOCKED_BY_HANDOFFS`), but never parse
their prose. An explicit `requireHandoffs: "skip"` is recorded and non-gating.
The per-agent briefing under `agents/` is a context convenience that falls back
to the shared `BRIEFING.md` (see `docs/ARTIFACTS.md`).

### LEMMA (Lean 4 formal-proof route)

LEMMA is an explicit opt-in capability-gated route (`topology: "proof"`, `lemmaMode: true`) for Lean 4 proving and verification:

- **Explicit opt-in only:** `teamwork_route` checks `document-review` first, requires an explicit Lean 4 prove/formalize/verify/check request in prose, ignores instructions inside fenced code blocks, and routes unrequested `.lean` or Lean-syntax tasks to `distributed-coding` (never `proof`).
- **Pre-spending toolchain gate:** Requires user-installed **Lean 4** (`lean` and `lake` via `elan`) and the **LEAP CLI** (`leap`) on `PATH`; the legacy `leap-tools` name is also accepted. If any is missing, `teamwork_plan` refuses **before `mkdir`** (zero run files created, zero budget spent) and prints install instructions for both.
  - Install the pinned CLI with `pipx install git+https://github.com/billkunghappy/LEAP-CLI@afc016d23579d8236050a157fe6cac8f17b13096` (the `leap-tools` PyPI package does not exist). `leap lean` is the optional full Mathlib setup (~11 GB, 10–20 minutes); LEMMA verification needs only core Lean, no Mathlib.
- **Bounded verification:** Phase 0 formalization (`problem_draft.lean` → `team/formalization-reviewer` `APPROVE` → `problem.lean`), bounded lemma tree (`maxDepth <= 3`, `maxWidth <= 4`, `maxNodes <= 24`, `maxRetries <= 4`), real `lean`/`lake` execution via `teamwork_lemma_verify` rejecting `sorry`/`admit`/unauthorized `axiom` even on exit `0`, and final `FAITHFUL` check before `teamwork_final_verify`.
- **Declaration and axiom binding:** each node records its Lean `declaration` and `statement`. Before a node becomes `proved`/`disproved`, the attempt must declare that name and type (comments, strings, and syntax quotations are masked; duplicate/namespaced/`private`/`protected` declarations fail closed). The verifier then runs `#print axioms <declaration>` and records `declaration`, `declarationType`, `axiomDependencies`, and `unauthorizedAxioms`, accepting only `Classical.choice`, `propext`, `Quot.sound`, plus axioms approved once at plan time via `lemmaPolicy.allowedAxioms` (persisted in `lemma/manifest.json`). `sorryAx` is always rejected, and `#`/`logInfo`/`dbg_trace`/`trace`/`run_cmd`/`println`/`IO.`/`set_option trace` probe-hijacking attempts fail closed. Node statement/declaration metadata is immutable after a PASS; `teamwork_final_verify` re-checks stamped metadata before accepting a run.
- **Known limits:** binding compares the elaborated type text lexically (binder/negation spellings normalized), not semantic equality; the transitive-axiom allowlist is approved at plan time (`lemmaPolicy.allowedAxioms`) and persisted in `lemma/manifest.json`, never caller-supplied at verify time; and the live Lean path is not exercised on hosts without `lean`/`lake`/`leap` (the E2E test skips loudly, while stub tests cover the control flow). CI installs core Lean + the LEAP CLI (no Mathlib) so the live E2E runs on every relevant pull request.

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
  ids, read-only enforcement, signed control-plane artifacts, sanitised context
  injection, non-destructive installers) is documented in
  [`docs/GUARDRAILS.md`](docs/GUARDRAILS.md) and
  [`SECURITY.md`](SECURITY.md). Artifact authenticity is tamper-evident against
  a run-dir-only writer, but **a same-UID shell with read access to
  `opencode.db` / the plugin KV store can read a local HMAC or Ed25519 private
  key** and can call a same-UID command signer. Phase B is assessed in
  [`docs/adr/0006-artifact-trust-isolation.md`](docs/adr/0006-artifact-trust-isolation.md);
  the Phase A decision is in
  [`docs/adr/0005-artifact-authenticity.md`](docs/adr/0005-artifact-authenticity.md);
  the Ed25519 signer SPI, public-key verification, trust levels and witness are
  in [`docs/adr/0008-signer-spi-and-trust-levels.md`](docs/adr/0008-signer-spi-and-trust-levels.md).
  The `team/security-auditor` agent audits a repo with a clean context.
- Docs: <https://opencode.ai/v2/docs/build/plugins>

> **Artifact-trust boundary (ADR 0005/0006/0008):** signed control-plane
> artifacts are tamper-evident against a writer limited to the run directory.
> They are **not** protected against a same-UID shell: a local HMAC or Ed25519
> private key lives in `opencode.db` (mode `0600`, same user) or the
> environment, so a local shell can read it and mint envelopes; a same-UID
> command signer is callable by that shell too. Ed25519 makes verification
> possible with only a public key, but no in-process, zero-dependency control
> creates a different privilege domain. The hardened profile needs an
> admin/deployment change (separate UID or remote signer, plus human approval or
> an independent verifier) and is documented in
> [`SECURITY.md`](SECURITY.md). See
> [`docs/adr/0008-signer-spi-and-trust-levels.md`](docs/adr/0008-signer-spi-and-trust-levels.md),
> [`docs/adr/0006-artifact-trust-isolation.md`](docs/adr/0006-artifact-trust-isolation.md)
> and [`docs/adr/0005-artifact-authenticity.md`](docs/adr/0005-artifact-authenticity.md).

## License & attribution

MIT. Ported from [`aditya0si/OpenCode-Team`](https://github.com/aditya0si/OpenCode-Team)
by Aditya Singh; the original MIT notice is preserved in [LICENSE](LICENSE).
