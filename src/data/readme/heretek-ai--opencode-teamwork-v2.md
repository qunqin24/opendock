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
rewritten for the V2 plugin + agent APIs. Verified against **OpenCode 2.4.1**.
`package.json` declares an **optional** peer range `@opencode/plugin: ^2.4` (optional so
the package stays dependency-free), and `setup` warns when `ctx.app.version` is outside
the verified 2.4 pair.

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
plugins/opencode-teamwork/safe-fs.mjs        # shared bounded read + pinned/detective write containment (ADR 0004/0010/0013)
agents/team/*.md                  # 15 team agents (markdown, V2 frontmatter)
docs/ARTIFACTS.md                 # canonical artifact layout, topologies, schemas
lib/team.mjs                      # installer core (config dir, model map, agent files)
lib/picker.mjs                    # interactive model picker (`opencode models`)
lib/runs.mjs                      # run inspection, DAG visualization, worktree pruning
lib/doctor.mjs                    # environment diagnostic health checks
lib/timeline.mjs                  # chronological run lifecycle builder & renderer
lib/export.mjs                    # read-only run report builder (HTML / Markdown export)
lib/approve.mjs                   # authenticated prompt-approval producer/verifier (`approve …`)
bin/opencode-teamwork.mjs         # CLI: init / models / install / status / doctor / runs / inspect / timeline / export / prune / approve
scripts/lint-prompts.mjs          # prompt linter (run in CI)
scripts/test-cost.mjs             # session tree consumption tests
scripts/test-engine.mjs           # DAG engine, security gate & worktree tests
scripts/test-approval.mjs         # authenticated prompt-approval parity (print + TUI)
scripts/test-doctor.mjs           # hermetic environment & CLI doctor tests
scripts/test-timeline.mjs         # timeline hermetic unit tests
postinstall.mjs                   # asks for models during npm install
```

## Engine (tools + hooks)

The run mechanics are real, not prompt prose. The plugin registers deterministic
tools and runtime permission hooks. Each registration carries
`options: { namespace: "teamwork", codemode: false }`: OpenCode's effective id is
`namespace + "_" + name` (`packages/core/src/tool/runtime.ts`), so the model sees
direct `teamwork_*` tools (the same ids the agents and command templates call)
rather than Code Mode-only `teamwork.plan` entries. The table below lists the
exposed ids:

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
| `teamwork_cost` | read real spend across the OpenCode session tree (sentinel + workers + verifiers) against the **advisory** run budget (warns at 80%; only massive-proof tournaments enforce the threshold); snapshot updates are digest-idempotent |
| `teamwork_pitfall` | append to the pitfall registry (dynamically injected into workers) |
| `teamwork_next` | evaluates DAG dependencies, lifecycle states, and ready tasks; atomically leases each ready task (5 min + 5 min grace on claim protocol 2) with a monotonic fence so concurrent resumes cannot dispatch duplicates; a stale claim is reclaimed only when the side-effect fingerprint is unchanged, otherwise `needs-inspection`; strict runs stop at `NEEDS_STRICT_WAVE` until both wave verdicts exist |
| `teamwork_task_update` | deterministic task state machine transitions (`pending` → `worker_active` → `worker_done` → `verifier_active` → `verified_pass` / `verified_fail` / `blocked`); every protocol-2 transition enforces the claim fence/ownership (`STALE_FENCE`, `CLAIM_OWNED_BY_OTHER`, `CLAIM_EXPIRED`), a reasoned Sentinel override is recorded, and terminal states release the claim |
| `teamwork_recover` | explicit crash recovery for a claim: `heartbeat`, `inspect` (single-use hashed 10-minute token), `release`, `block`, `requeue`, `adopt` (clean committed branch → `worker_done`, no new commit), `discard` (force+confirm); never auto-commits |
| `teamwork_handoff` | trusted five-section handoff writer (`handoffs/<taskId\|_run>-<role>.md` + bounded `handoffs/index.json`); continuity evidence required by `final_verify`/`next` when `requireHandoffs: "required"`, never a gate verdict |
| `teamwork_report` | trusted writer for a signed `verify/report-<taskId>.json`: caller must be `team/verifier`, descend from the run root, and name an existing task; a `PASS` needs a summary or check |
| `teamwork_security_audit` | mandatory pre-merge security gate (`verify/security-audit.json`; signed on a signed run) |
| `teamwork_victory_audit` | record the independent `team/victory-auditor` acceptance verdict, bound to the current `ORIGINAL_REQUEST.md` and `requirements.json` hashes (`verify/victory.json`); caller must descend from the run root |
| `teamwork_evidence` | write one bounded evidence artifact under `verify/evidence/<name>` (64 KiB, 32 files) through the pinned run writer; returns `{path, sha256, bytes}` so `teamwork_wave_record` can cite it. Bytes, not a verdict |
| `teamwork_wave_record` | strict mode only: record one `team/falsifier` challenge (`PASS`) or `team/security-auditor` audit (`CLEAN`) per task (`verify/challenge-<task>.json` / `verify/audit-<task>.json`); trusted caller identity + session tree, sha256-bound to the verifier report (same-report write-once, changed-report replace) |
| `teamwork_final_verify` | compute the final verdict from the task reports + security audit + victory audit (plus the strict wave when enabled, and `lemma/` artifacts when in LEMMA mode), verify the signed baseline, stamp it, write signed `verify/final.json` |
| `teamwork_lemma_probe` | read-only probe for `lean`, `lake`, and the LEAP CLI (`leap`; legacy `leap-tools` accepted) on `PATH` |
| `teamwork_lemma_formalize` | LEMMA Phase 0 `problem_draft.lean` / `review_pre` → `problem.lean` and `review_final` faithfulness gate |
| `teamwork_lemma_node` | bounded lemma decomposition tree (`create`, `update`, `blueprint`, `attempt`) |
| `teamwork_lemma_verify` | execute real `lean`/`lake` verification with `sorry`/admit/axiom rejection, stamping `verify-<r>.json` |
| `teamwork_worktree` | out-of-repo git worktree provisioning, diff, merge, resolve & cleanup; `setup` records the claim baseline and renews it, `diff` returns HEAD/baseSha/diffHash, `merge` refuses `BRANCH_MOVED`, `cleanup` refuses a live claim, and a foreign run host refuses destructive actions unless explicitly allowed |

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
`url-guard.mjs`: http/https only, public addresses only (loopback, private,
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
through it. `shell` is still available to the verifier, falsifier, scout,
security auditor and victory auditor, and it can modify files; the segment
reviewer, formalization reviewer, and referee also have `shell` denied, and the
segment, formalization, referee, and victory-auditor roles deny `webfetch` and
`subagent` as well (the verifier and security auditor deny `webfetch`). In
short: no writes through `edit` for all eight, and no `shell` for the segment
reviewer, formalization reviewer, or referee; the falsifier uses `shell` only
to run empirical tests and must not edit through it. The
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
`verification_report.json`). The Step 0 survey writes `PROJECT.md` (architecture
and Feature Inventory) and `SCOPE.md`; the dual-track suite writes
`TEST_INFRA.md` and, only after the E2E suite is green, `TEST_READY.md`;
`DEAD_ENDS.md` records repeated dead ends. Open verifier issues live in the
`state.json` `feedbackLog` ledger. A blocking dependency probe writes
`PREREQUISITES.md` at the repository root before any run directory exists. The
installer copies that reference to
`<config-dir>/teamwork/ARTIFACTS.md` next to your agents.

### Completion guarantees

- `verified_pass` requires a legal lifecycle transition and PASS evidence (an inline PASS verdict or a `PASS` per-task report).
- A plan writes a signed `run.manifest.json` (the default). Verifier reports, security audit, strict-wave verdicts, victory verdict, and final verdict carry an `_auth` envelope and a `ctx.storage` digest-index entry. `final_verify`/`next` fail as `AUTH_MISSING`, `AUTH_INVALID`, `AUTH_UNKNOWN_KEY`, `AUTH_INDEX_MISSING`, or `AUTH_STALE` when an artifact is forged, copied, edited, or the signed plan/requirements/policy baseline drifts. See [`docs/adr/0005-artifact-authenticity.md`](docs/adr/0005-artifact-authenticity.md).
- `_auth` supports HMAC-SHA256 (backward-compatible `mac`) and Ed25519 (`sig`). Every new signed run pins a 128-bit `runNonce` and `runKeyId` in the manifest, so a cross-run copy or a rotated re-sign fails. With Ed25519, verification needs only the SPKI public key. `teamwork_plan` also records `trustLevel` (`local-hmac` default, `external-signer`, `human-approved`, `ci-attested`) and optional `requireWitness`; `final_verify` enforces the level, and `OPENCODE_TEAMWORK_SIGNER`/`OPENCODE_TEAMWORK_WITNESS` fail closed (`AUTH_SIGNER_UNAVAILABLE`/`AUTH_WITNESS_UNAVAILABLE`). 0.14.0 signs witness receipts (`OPENCODE_TEAMWORK_WITNESS_PUBLIC_KEY`) so a forged KV record is `AUTH_INVALID`, labels an optional receipt `unverified` without that key, and adds signer protocol v2 plus `opencode-teamwork approve signer` when `OPENCODE_TEAMWORK_SIGNER_APPROVAL_DIR` is set; since 0.19.3 a required witness fails closed when no witness key is configured. `human-approved`/`ci-attested` require an Ed25519 approval from `OPENCODE_TEAMWORK_APPROVAL_DIR`, signed by a key distinct from the run key and bound to the **exact bytes of `prompt_draft.md`** plus the run id and a one-use nonce (0.11.0; manifest version 3). The plan verifies it before any `mkdir`, `final_verify` re-hashes the draft, and a re-plan cannot change the binding. The plugin/command signer refuses `approvals/` paths (`AUTH_APPROVAL_SCOPE`). See [`docs/adr/0011-authenticated-prompt-approval.md`](docs/adr/0011-authenticated-prompt-approval.md), [`docs/adr/0008-signer-spi-and-trust-levels.md`](docs/adr/0008-signer-spi-and-trust-levels.md) and [`SECURITY.md`](SECURITY.md).
- A run completes only with a `PASS` `verify/final.json` stamped by `teamwork_final_verify`; an unstamped report needs the recorded `allowUnstamped` bypass. An unsigned legacy run returns `AUTH_LEGACY` until the recorded `allowUnsignedLegacy` bypass is passed at the completion gate; `benchmark` refuses that bypass, `victoryAudit: "skip"`, and `requireHandoffs: "skip"`.
- `teamwork_victory_audit`, `teamwork_wave_record`, and `teamwork_report` require the caller session to descend from the plan-time `rootSessionId`, so a top-level `opencode run --agent team/victory-auditor` cannot self-authorize.
- That PASS also needs a `verify/victory.json` from the independent `team/victory-auditor` reporting `VICTORY CONFIRMED` for every requirement and the current `ORIGINAL_REQUEST.md` hash, unless the plan explicitly recorded `victoryAudit: "skip"` with a non-empty `victorySkipReason` (then `final_verify` records `victory: "SKIPPED (explicit): <reason>"`). A skip without a reason is refused; the legacy no-baseline default is labelled `SKIPPED (legacy default: no requirements baseline)`.
- `small-focused` is a refinement loop (up to **32** rounds), not one shot. Every verifier FAIL adds an open issue to the `state.json` `feedbackLog` ledger; the next round must address every open entry; a PASS resolves them; an entry is never silently dropped. The loop stops only at 0 open issues, 0 edits, an empty ledger, and an independent re-run of the tests. A small-focused run gets at most **2** victory audits: after a second `VICTORY REJECTED` (or a block/deadlock/budget stop) the Sentinel enters the terminal non-victory state and records `interrupted.md` (the engine writes it on an AbortSignal); the engine refuses a third audit. The Sentinel reports the open issues and never records `VICTORY CONFIRMED`.
- The security audit fails on integrity-rule violations for the run's mode, and that blocks the merge.
- **`distributed-coding` defaults to `verification: "strict"`**: one `team/verifier` reviewer report, plus one `team/falsifier` challenger (`PASS`) and one `team/security-auditor` forensic auditor (`CLEAN`) per task. Passing `verification: "standard"` is an explicit, recorded opt-out. Missing, stale, or non-PASS/CLEAN verdicts block `teamwork_next` (`NEEDS_STRICT_WAVE`) and `teamwork_final_verify`; a strict PASS writes `GATE_STATUS.md` with worker/verifier/challenger/auditor rows and a `## Continuity` handoff table. The wave reuses the existing agents rather than adding roles.
- `requireHandoffs: "required"` (the default for a new run with a request or requirements baseline) makes `final_verify` and `next` demand continuity handoffs derived from the plan: the assigned worker and `team/verifier` per task, `team/falsifier` + `team/security-auditor` per task in strict mode, one `team/sentinel`/`team/orchestrator` run-level handoff, and the `team/victory-auditor` run-level handoff after a confirmed victory audit. Each entry must match `handoffs/index.json` (regular non-symlink file, sha256/byte length) and cite the current report/wave/audit/victory; a changed cited artifact makes it stale. Missing pairs return `NEEDS_HANDOFFS`, stale/duplicate/unknown/tampered evidence returns `BLOCKED_BY_HANDOFFS`, and a passing gate records `handoffs` plus `evidence.handoffs` in `verify/final.json`. An explicit `requireHandoffs: "skip"` is recorded as `handoffs: "SKIPPED (explicit)"` and never reads the index; handoff prose is never a verdict.
- Planning refuses to start when blocking inputs are missing or unreachable unless `allowMissingInputs` is recorded.
- Run-artifact writes are contained on Linux by a pinned directory descriptor ([ADR 0010](docs/adr/0010-pinned-fd-write-containment.md)): the target parent is opened once and every create, mkdir, rename, lstat and append is relative to `/proc/self/fd/<dirfd>`, so a directory swapped for a symlink cannot redirect bytes outside the run. Each write uses a random `O_EXCL` temp, `fsync`, a rename under the pin, and a post-rename inode check; appends refuse `nlink !== 1` (a hard link at `events.jsonl` cannot modify outside bytes); the lock file is created inside the same pinned directory. Linux without `/proc/self/fd` fails closed for writes. **macOS and Windows are detective-only** (path-based atomic write plus a post-write check; a transient reverted swap can be missed): 0.13.0 pins the run root and every existing ancestor `(dev, ino)`, re-checks them before the mutation and in the post-check (`identity-changed`), and records the run-root identity in the signed manifest. A detected write is a report about an event that already happened, not a prevented one, and it is not rolled back. `OPENCODE_TEAMWORK_REQUIRE_PINNED_WRITES=1` (or plan `requirePinnedWrites`) refuses control-plane writes on a non-pinned host (`containment-mode`). The run-root `mkdir` is still path-based, and a same-UID ptrace is outside the boundary. See [ADR 0013](docs/adr/0013-containment-parity-and-the-detective-boundary.md).
- `state.json`, `costs.json`, `events.jsonl`, and `handoffs/index.json` are read-modify-written under a cross-process `<artifact>.lock` plus the in-process queue. Locks publish atomically (unique `wx` temp + hard link, cached `mkdir` fallback), age from the filesystem mtime, and reclaim via a single-winner quarantine rename; a lock from another host is never guessed at. Claim protocol 2 (new runs; absent = 0.9.0 legacy) stamps a 5-minute lease + 5-minute grace, a monotonic fence, a heartbeat and a side-effect baseline. `teamwork_next` returns the fence and never silently reclaims a stale claim whose worktree/artifact fingerprint changed or is unknown; that task becomes `needs-inspection` and requires `teamwork_recover` (inspect → adopt/requeue/block/release). Every `teamwork_task_update` transition enforces the fence and claim ownership, and a reason is required for a Sentinel override. Verifier reports are bound to the round/fence/branch head, so a moved branch refuses `verified_pass`/merge with `BRANCH_MOVED`. See [docs/ARTIFACTS.md](docs/ARTIFACTS.md#cross-process-lock-files-artifactlock) and [ADR 0009](docs/adr/0009-claim-protocol-and-crash-recovery.md).
- `teamwork_cost` is digest-idempotent: `costs.json` stores `appliedSnapshotDigest` plus per-session `snapshotCursors`, so applying the same usage observation twice (including a retry after a crash between the costs and snapshots writes) adds the delta once and preserves budget/bucket totals.
- **The run budget is advisory outside the massive-proof tournament.** `teamwork_cost` warns at 80% of a positive `budgetUsd`, returns `shouldHalt: true` and the explicit `thresholdPct: 80`, and the Sentinel is expected to halt non-essential workers and ask the user. A standard run is not gated: `teamwork_next` still leases ready tasks, `teamwork_task_update` still starts a round, and `teamwork_final_verify` still evaluates the recorded evidence. Only `teamwork_tournament` and `teamwork_next`'s tournament branch enforce the threshold, halting with `BUDGET_HALTED` and a `PRESENT_PARTIAL` report. `budgetUsd: 0` is an explicit no-budget run: usage reports 0% and no threshold can be reached.
- Legacy topology aliases are normalised on write; an unknown topology is refused before anything is written.

## Install

> **About the install prompt.** OpenCode installs plugins with **Bun**, and Bun
> blocks dependency lifecycle scripts (`postinstall`) by default, so the
> interactive model prompt and the agent files may be skipped. Run the `init`
> command below: it installs all 15 agents and writes the model map. On load the
> plugin only verifies the agent files and warns (by filename) when any are
> missing — it cannot install them mid-session because OpenCode has already read
> its config. (`postinstall` does fire for a plain `npm install`, and is
> intentionally skipped under `npx` / `npm exec` so the `init` run doesn't prompt
> twice.)

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
npx @heretek-ai/opencode-teamwork-v2 approve request --session <id>  # show the draft binding
npx @heretek-ai/opencode-teamwork-v2 approve sign --request <file> --draft <path> --key <path>
npx @heretek-ai/opencode-teamwork-v2 approve verify --session <id>   # re-run the plan-time checks
npx @heretek-ai/opencode-teamwork-v2 approve signer --session <id> --path <relPath> --digest <64hex>
```

`approve signer` produces the signer-protocol-v2 approval under
`OPENCODE_TEAMWORK_SIGNER_APPROVAL_DIR` (or `--out`); the plugin never reads it.

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

`init` and the postinstall hook are the only writers of agent files. On load the
plugin only **verifies** them and warns (by filename, without failing the load)
when any are missing: OpenCode's config-agent plugin has already read its
documents by then, so a write during plugin `setup` would not appear until a
restart. Re-run `init` (or reinstall) and restart to repair a partial install.

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

   For `trustLevel: "human-approved"` / `"ci-attested"`, produce an
   authenticated approval **before** the plan, from a process that holds the
   approver key and writes outside the repo/run:

   ```sh
   # inspect what will be signed (writes nothing trusted)
   opencode-teamwork approve request --session <session-id> --approver uid:alice

   # sign the exact draft bytes with the Ed25519 approver key
   opencode-teamwork approve sign --request request.json \
     --draft .opencode/teamwork/<session-id>/prompt_draft.md \
     --key ~/.config/opencode/approver.pem --approver uid:alice --ttl 24h

   # re-run the plan-time checks at any time
   opencode-teamwork approve verify --session <session-id>
   ```

   `approve sign` refuses a draft that still contains `[OPEN:` unless
   `--allow-open` records the gaps (the plan then refuses that approval), and
   asks the operator to retype the first 8 hex characters of the draft digest
   and the word `approve`. The approval binds the draft, the run id, and a
   one-use nonce; it does **not** prove a human read the draft (see
   [`SECURITY.md`](SECURITY.md)).

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

## Offline verification (`verify`)

`opencode-teamwork verify` recomputes a run's named relations from the bytes in
one run directory plus a public key. It needs no plugin, no database and no
`ctx.storage`, and never writes into the run. Without `--rerun` it never
executes a reported check; with `--rerun` it re-executes the signed
`verify/rerun.json` in a disposable worktree (0.16.0).

```sh
# Ed25519: only the public key is needed
opencode-teamwork verify --session <id> --public-key <base64url|@file> --json

# Verify an archived copy directly
opencode-teamwork verify --run-dir /path/to/run --public-key @run-pubkey.txt

# HMAC run: the secret is required (an HMAC verifier is also a signer)
opencode-teamwork verify --session <id> --hmac-key <b64url> --hmac-key-id <id>

# Optional: branch head/diff and rollback snapshot
opencode-teamwork verify --session <id> --public-key ... --repo . --require-git
opencode-teamwork verify --session <id> --public-key ... --require-index snapshot.json

# 0.16.0: re-execute recorded command evidence at the report's commit
opencode-teamwork verify --run-dir /path/to/run --public-key ... \
  --rerun --repo /path/to/clean-checkout [--timeout 300] [--keep-worktree]

# 0.18.0: verify a CI attestation signed by a key the run does not hold
opencode-teamwork verify --run-dir /path/to/run --public-key ... \
  --attestation-public-key @ci-attestation.pub [--attestation-issuer <issuer>]

# Fetch the issuer JWKS over HTTPS at verification time
opencode-teamwork verify --run-dir /path/to/run --public-key ... \
  --fetch-jwks https://token.actions.githubusercontent.com
```

`--fetch-jwks <issuer>` fetches `/.well-known/openid-configuration` and then
its `jwks_uri`. Both URLs must be `https:`, carry no credentials, resolve only
to public addresses, and return a non-redirect 2xx; one 10 s deadline spans
discovery, DNS validation and the JWKS fetch, and bodies are capped at 512 KiB.
Loopback, private, link-local, and
cloud-metadata issuers are refused on this network path; for an intranet
issuer, or an offline copy, use `--oidc-jwks <file>`.

Under a plan that recorded `requiredProvenance: "command"`, a PASS report must
carry at least one programmatic check with an argv-only `command`, an exit code,
an untruncated output digest and a `headSha`; the engine writes a signed
`verify/rerun.json`. `verify` without `--rerun` reports that claim as
`provenance: claimed` and returns `UNKNOWN` (exit 2) — never `PASS`.
`--rerun` creates a detached worktree at the report's commit, runs the argv with
no shell and a minimal environment, enforces the recorded timeout, and compares
the exit code and stdout+stderr digest. Before any worktree is created it
requires the manifest, `verify/rerun.json` and every report the record names to
authenticate, and the rerun record to match the report projection; otherwise it
emits `RERUN_UNTRUSTED` and executes nothing. A changed digest is
`output-digest-mismatch`, a non-zero exit is `command-failed`, a missing binary
is exit 2 `command-unavailable`, a timeout is `command-timeout`, and a shell line
or escaping `cwd` is `command-refused`. The source checkout is hashed before and
after; the worktree is removed unless `--keep-worktree`. `declared` runs keep the
0.15 behaviour.

**`--rerun` executes code.** The commands come from a signed file, but a
signature proves who recorded them, not that they are safe. A detached worktree
is a checkout, not a sandbox: the recorded process runs with your UID and can
reach the rest of the machine. Run `--rerun` only against evidence you are
willing to execute, and prefer a disposable container or VM for untrusted runs.
`--rerun` is refused together with `--allow-unsigned`; re-execution requires an
authenticated manifest and reports.

A manifest `trustLevel` of `human-approved` or `ci-attested` is reported as
`trust:approval` / `AUTH_APPROVAL_UNVERIFIED` (`UNKNOWN`), because offline
verification has no approval enforcement. `requireWitness` without a usable
receipt is `trust:witness` / `AUTH_WITNESS_UNVERIFIED` (`UNKNOWN`) offline. At
completion, since 0.19.3 `final_verify` fails closed (`AUTH_WITNESS_UNVERIFIED`)
when `requireWitness: true` has no configured witness public key instead of
accepting an `unverified` receipt; an optional witness without a key is still
recorded as `unverified`. The JSON `trust` object carries `runTrustLevel`,
`approval.status` and `witness.status`.

Since 0.18.0 a plan can set `attestationPolicy: "optional" | "required"`. A CI
job runs `.github/workflows/attest.yml` (or `scripts/attest-sign.mjs`) under a
separate Ed25519 key and writes `verify/ci/attestation.json`, binding the run
nonce, plan hash, prompt hash, report commit and every command's argv/exit/output
digest. `final_verify` refuses a `required` run without a valid attestation
(`AUTH_ATTESTATION_MISSING/STALE/UNTRUSTED/COMMIT_MISMATCH/REPLAY`), and `verify`
reports `attestation.status` plus `attested: true` with
`--attestation-public-key`; without that key a present attestation is `UNKNOWN`
(exit 2), never `PASS`. The attestation key must differ from `runKeyId`.

> **Experimental in 0.19.3.** CI attestation is not a working control until
> OIDC JWKS verification, commit binding and expiry handling are fixed.
> `attestationPolicy: "required"` may refuse a run, but it is not independent
> assurance yet. See [ADR 0018](docs/adr/0018-ci-attestation.md).

The signed `run.manifest.json` is the anchor: its `runNonce`, `runKeyId` and
algorithm are covered by the envelope, and every other artifact is pinned to
them. The verifier recomputes victory `evidenceDigests`, audit `ruleChecks` and
`reviewedDigests`, report→worker-handoff bindings, wave `cites` (`sha256` and
byte length), every handoff index entry's auth/body/header/cites, and the final
verdict's report/audit/requirements digests. It also names the four
`INCONSISTENT_*` contradictions.

Exit codes: `0` verified, `1` fail, `2` unverifiable (no key, unsigned legacy,
HMAC without a secret, required git/index unavailable), `3` usage.
`--fail-on-warning` promotes a warning to exit 1, and `--allow-unsigned`
analyses a legacy run that has no `run.manifest.json` without ever upgrading it
to `PASS`; it is refused with `--rerun`. When a manifest is present, signed or
not, `--allow-unsigned` has no effect: a missing artifact envelope is `FAIL`, as
is a missing handoff-index envelope on a run whose manifest requires signed
handoffs. `--json` is the stable machine report; the human table is rendered
from it.

**Honest limit.** A verifier holding only the public key and a read-only copy can
recompute every byte digest, citation, branch binding and cross-artifact
relation; it still cannot prove an observation, a consistently authored false
report passes every check, and a whole-run rollback to an earlier signed set is
undetectable without a snapshot or witness. Re-execution narrows this: a false
PASS under `command` must survive `--rerun`. A CI attestation narrows it again:
the declared commands ran at the recorded commit under a separate identity. It
does not prove the suite is meaningful or that a test was not edited in the same
commit, and a CI principal reachable by the agent's UID is not a boundary. See
[ADR 0015](docs/adr/0015-offline-verification.md),
[ADR 0016](docs/adr/0016-re-executable-verification.md),
[ADR 0018](docs/adr/0018-ci-attestation.md) and
[`docs/ARTIFACTS.md`](docs/ARTIFACTS.md#offline-verification-opencode-teamwork-verify).

## Runtime integration tests

The engine contract is tested against the real host, not only against a shim:

| Layer | What it proves |
| --- | --- |
| L0 | `npm test`: engine logic, crypto envelopes, containment primitives, catalog, verifier, security |
| L1 | The plugin loads in OpenCode 2.4.1 (in memory and from a local directory): 27 `teamwork_*` tools, `codemode:false`, schemas, 7 commands, permission hook, storage namespacing, agent decoding, result shape |
| L2 | Real sessions and KV: plan/manifest v5, claims and recovery, handoff→report→victory binding, approvals |
| L3 | Full workflows in real git worktrees: standard and strict gates, victory rejection and resume, limits, a two-process claim race, and the verifier CLI |

The 153-case L0 parity/audit suite is a separate `l0-parity` check; it is not
part of `npm test`. `pack-t4` builds and installs the npm tarball and loads it
through the real host. `runtime-l1` installs the pinned `@opencode/cli@2.4.1`
and fails unless the process E2E runs (118 pass, 1 skip, 0 fail). See
[`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md) for the gate list.

```sh
npm test                 # L0, no dependencies beyond Node

cd tests/runtime
bun install --frozen-lockfile
bun run test             # L1-L3, exact @opencode/*@2.4.1
```

The harness is dev-only: `tests/runtime/` is excluded from the tarball, its
dependencies live in its own `package.json`, and the shipped package stays
dependency-free. Assertions are made on tool results and run artifacts
(`state.json`, `run.manifest.json`, `verify/*`, `handoffs/index.json`,
`events.jsonl`, exit codes), never on model prose. The tool catalog is pinned as
a golden so a host change cannot silently rename or hide a tool. No model is
called by the default suite.

The audited host contract, the 2.4.1 drift list and the boundaries no harness can
cross are in [`docs/OPENCODE-COMPATIBILITY.md`](docs/OPENCODE-COMPATIBILITY.md)
and [ADR 0017](docs/adr/0017-opencode-plugin-contract-and-test-strategy.md).

## Known open work

Tracked in GitHub issues:

- [#38](https://github.com/Heretek-AI/opencode-teamwork-v2/issues/38) L4 live-model opt-in suite (harness and workflow exist; live runs remain opt-in)
- [#40](https://github.com/Heretek-AI/opencode-teamwork-v2/issues/40) apply and verify the admin hardening runbook on a real host
- [#48](https://github.com/Heretek-AI/opencode-teamwork-v2/issues/48) remaining Document Review and PDF corpus runs
- [#51](https://github.com/Heretek-AI/opencode-teamwork-v2/issues/51) document-review visual audit (per-page PNGs / `view_file`)
- [#52](https://github.com/Heretek-AI/opencode-teamwork-v2/issues/52) per-dispatch model override

0.19.2 shipped the critical `verify --rerun`/`--allow-unsigned` false-PASS fix
recorded in [GHSA-jf59-xgq8-hjmv](https://github.com/Heretek-AI/opencode-teamwork-v2/security/advisories/GHSA-jf59-xgq8-hjmv),
together with attestation input validation, fail-closed trust/evidence, and the
Sonar/packaging checks. 0.19.3 adds the verifier-completeness (C-1) and central
signed-run legacy-downgrade (H-1) fixes, rerun output-digest binding (M-1),
`requireWitness` fail-closed behavior (M-4), and release-pipeline hardening
(C-2); CI attestation is explicitly experimental until JWKS, commit and expiry
handling are fixed. A new advisory is required for the 0.19.2 verifier defects;
GHSA-jf59-xgq8-hjmv covers the earlier `--rerun` defect and is not reused. The
earlier matrix (#39, #41–#47) is implemented and closed.

> **Breaking for signed LEMMA, tournament and document-review runs.** Those
> writers still emit plain JSON/text without `_auth` envelopes, so
> `final_verify` now refuses `PASS` (`LEMMA_EVIDENCE_UNSIGNED`,
> `TOURNAMENT_EVIDENCE_UNSIGNED`, `DOCUMENT_REVIEW_EVIDENCE_UNSIGNED`) until
> route-evidence signing lands in Phase 2. Explicit `allowUnsignedLegacy` runs
> keep the historical behaviour. The alternative — an authenticated verdict
> over unauthenticated evidence — is worse.

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
npm publish --dry-run heretek-ai-opencode-teamwork-v2-<version>.tgz
npm publish --access public heretek-ai-opencode-teamwork-v2-<version>.tgz
```

Publish the packed tarball, not the directory: a directory publish can run
repository lifecycle code. Release checks reject a repository `.npmrc` and a
`publishConfig` entry that could redirect the registry, access or tag.

For CI, this repo ships [`.github/workflows/publish.yml`](.github/workflows/publish.yml)
using **npm Trusted Publishing** (OIDC, no long-lived token). One-time setup:

1. Create the package with a first manual publish (`npm publish`, token above) —
   package settings only exist once the package exists.
2. On npmjs.com: **Package → Settings → Trusted Publisher → GitHub Actions**
   with user `Heretek-AI`, repo `opencode-teamwork-v2`, workflow `publish.yml`,
   and `npm publish` allowed.
3. Release afterwards by bumping **both** package versions and the changelog in
   one commit, then tagging that commit (full steps in
   [`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md)):

   ```sh
   npm version patch --no-git-tag-version  # then bump plugins/opencode-teamwork/package.json
   # add the ## [X.Y.Z] section to CHANGELOG.md, commit, then:
   git tag "v$(node -p "require('./package.json').version")"
   git push --follow-tags   # triggers the workflow
   ```

   `scripts/check-release-consistency.mjs` refuses a tag whose name does not
   match the package version and a release whose two package versions or
   changelog heading disagree.

Release tags are provenance-checked before publish:
`scripts/check-release-tag.mjs` requires the tag's commit to be an ancestor of
`origin/main`. The runbook additionally requires a new release tag to point at
the current tip of `main`; ancestry alone is not sufficient. The historical
`v0.6.0` and `v0.7.0` tags are sibling release
commits with trees identical to their `main` release commits; they predate this
guard. Every future `v*` tag push must point at a commit already on `main`, and
published tags are never rewritten.

The complete gate list, the tag-only publish boundary, the dry-run path and the
admin-owned ruleset settings are in
[`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md). CI runs the 153-case parity
suite as a distinct `l0-parity` job, the packed-tarball install as `pack-t4`,
release consistency as `release-consistency`, and the full runtime suite with
the pinned `@opencode/cli@2.4.1` in `runtime-l1`. The process E2E is expected to
run; that job fails unless the only skip is the L4 live spec.

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

`/team-orchestrate`, `/team-propose`, `/team-falsify`, `/team-synthesize`, and
`/team-review` are legacy v1 commands kept for compatibility; `/teamwork` is the
supported entrypoint for new runs.

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
| `team/falsifier` | `falsifier.md` | `deepseek/deepseek-v4-pro` | `proof`, `massive-proof` (`FALSIFY_PRUNE`), `distributed-coding` (strict wave), `/team-falsify` | `edit`, `subagent` (`shell` available, can modify files) | Adversarial critic and empirical challenger |
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
- **Pre-spending toolchain gate:** Requires user-installed **Lean 4** (`lean` and `lake` via `elan`) and the **LEAP CLI** (`leap`) on `PATH`; the legacy `leap-tools` name is also accepted. If any is missing or unusable, `teamwork_plan` refuses **before `mkdir`** (zero run files created, zero budget spent), writes `PREREQUISITES.md` at the repository root recording the `MISSING`/`OUTAGE` probe verdict (the file is only written on failure; `READY` is not written), and prints install instructions for both; `leap doctor --offline` reports the same verdicts, except that a `LEAN_PROJECT_DIR`-only failure (no local Lake project) is a warning and does not block.
  - Install the pinned CLI with `pipx install git+https://github.com/billkunghappy/LEAP-CLI@afc016d23579d8236050a157fe6cac8f17b13096` (the `leap-tools` PyPI package does not exist). `leap lean` is the optional full Mathlib setup (~11 GB, 10–20 minutes); LEMMA verification needs only core Lean, no Mathlib.
- **Bounded verification:** Phase 0 formalization (`problem_draft.lean` → `team/formalization-reviewer` `APPROVE` → `problem.lean`), bounded lemma tree (`maxDepth <= 3`, `maxWidth <= 4`, `maxNodes <= 24`, `maxRetries <= 4`), real `lean`/`lake` execution via `teamwork_lemma_verify` rejecting `sorry`/`admit`/unauthorized `axiom` even on exit `0`, and final `FAITHFUL` check before `teamwork_final_verify`.
- **Declaration and axiom binding:** each node records its Lean `declaration` and `statement`. Before a node becomes `proved`/`disproved`, the attempt must declare that name and type (comments, strings, and syntax quotations are masked; duplicate/namespaced/`private`/`protected` declarations fail closed). The verifier then runs `#print axioms <declaration>` and records `declaration`, `declarationType`, `axiomDependencies`, and `unauthorizedAxioms`, accepting only `Classical.choice`, `propext`, `Quot.sound`, plus axioms approved once at plan time via `lemmaPolicy.allowedAxioms` (persisted in `lemma/manifest.json`). `sorryAx` is always rejected, and `#`/`logInfo`/`dbg_trace`/`trace`/`run_cmd`/`println`/`IO.`/`set_option trace` probe-hijacking attempts fail closed. Node statement/declaration metadata is immutable after a PASS; `teamwork_final_verify` re-checks stamped metadata before accepting a run.
- **Known limits:** binding compares the elaborated type text lexically (binder/negation spellings normalized), not semantic equality; the transitive-axiom allowlist is approved at plan time (`lemmaPolicy.allowedAxioms`) and persisted in `lemma/manifest.json`, never caller-supplied at verify time; and the live Lean path is not exercised on hosts without `lean`/`lake`/`leap` (the E2E test skips loudly, while stub tests cover the control flow). CI installs core Lean + the LEAP CLI (no Mathlib) so the live E2E runs on every relevant pull request.

## Prerequisites and troubleshooting

Both capability-gated routes check their tools **before** creating a run and, on
failure, write `PREREQUISITES.md` at the repository root recording the probe
verdict (`MISSING` or `OUTAGE`) instead of spending budget. The artifact is only
written when the probe fails; `READY` is not written.

**PDF document review.** PDF ingestion needs Python 3 with `pypdfium2` and
`Pillow` on `PATH`:

```sh
python3 -m pip install pypdfium2 Pillow
python3 -c "import pypdfium2, PIL; print('ok')"
```

A failed probe is `MISSING` (not installed) or `OUTAGE` (installed but
unusable). Plain-text and Markdown review need neither. `READY` means the probe
ran, not that every page was extracted: check `extractionStatus` in
`document-review/manifest.json` and the gap report in `DOCUMENT_TEXT_MAP.md`
rather than assuming missing text is absent from the source.

**LEMMA (Lean 4).** Requires `lean` and `lake` (via `elan`) plus the LEAP CLI
(`leap`; legacy `leap-tools` is accepted):

```sh
elan toolchain install stable
pipx install git+https://github.com/billkunghappy/LEAP-CLI@afc016d23579d8236050a157fe6cac8f17b13096
leap doctor --offline
```

A missing tool refuses the plan before `mkdir`; install it and re-run. The probe
runs `leap doctor --offline`, so it needs no network and does not download
Mathlib. Its verdicts are `READY`, `WARN`, `MISSING`, or `OUTAGE` (`OUTAGE`
means installed but not usable). A `LEAN_PROJECT_DIR`-only failure means there
is no local Lake project: core Lean and the LEAP CLI are still usable, so it is
a warning and does not block. `leap lean` (Mathlib, ~11 GB) is optional and not
needed for LEMMA verification.

`PREREQUISITES.md` is a diagnostic record: deleting or editing it does not
install anything, and `READY` does not prove the toolchain will succeed on
every input.

## High-assurance deployment

The default package is tamper-evident against a writer limited to the run
directory; it is not a boundary against a shell running as the same UID as
OpenCode. If you need a real privilege boundary, the administrator-only path is
documented separately:

- [`docs/ADMIN-HARDENING.md`](docs/ADMIN-HARDENING.md) — a Linux runbook for a
  separate signer UID, a `0700` key directory, a root-owned signer, a systemd
  socket service, audit rules and SELinux labels. Every step has a proof, a
  rollback and an honest limit.
- [`docs/SIGNER-PROTOCOL.md`](docs/SIGNER-PROTOCOL.md) — the v2 signer contract
  that turns a command signer from an oracle into a policy-enforcing signer.
  0.14.0 sends v2 (with `runId` and a derived `approvalRef`) when
  `OPENCODE_TEAMWORK_SIGNER_APPROVAL_DIR` is set, and the exact v1 request
  otherwise. A Rust reference signer is in [`signer/`](signer/) but is **not
  shipped in the npm package**: review it, build it, install it, and own its
  policy. A version mismatch fails closed with `AUTH_SIGNER_UNAVAILABLE`.
- [`scripts/hardening-check.sh`](scripts/hardening-check.sh) — a read-only
  Linux verifier that prints `PASS`/`FAIL`/`UNKNOWN` per probe. It never
  modifies the host; `UNKNOWN` is not a pass.

These are deployment changes, not plugin features. They do not make the plugin,
the prompts or the model trustworthy, and none of the steps is executed
automatically. `opencode-teamwork doctor --security --require-hardened` remains
the plugin-side posture check.

## Notes

- The plugin is intentionally **dependency-free at runtime** — it does not import
  `@opencode/plugin`, so the loader never needs to resolve `node_modules` for it.
  The exported object shape is identical to `Plugin.define({ id, setup })`.
- V2 agents cannot be created by a plugin, so the plugin only registers commands,
  ships the `teamwork_*` engine tools, and verifies (never writes) the `team/*.md`
  agent files on load; `init`/postinstall install them. If you
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
