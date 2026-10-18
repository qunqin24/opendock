# opencode-goal

Persistent, host-verified goal mode for [OpenCode 2](https://opencode.ai). Describe what you want, let the bundled **write-goal** interview turn it into a structured contract, and the plugin keeps the session working until the host — not the model — proves every criterion.

> **Status: released (`v0.5.0`).** Engine, verification and TUI are built and tested end to end against OpenCode 2.0.22 with a scripted model, and each release is proven from its own installed git tag. CLEO integrates as an optional first-class citizen (`/goal cleo`). See [docs/HANDOFF.md](docs/HANDOFF.md).

## Why another goal plugin

Most goal loops let the model declare itself done. Research and user reports say that is the main failure: agents claim success that the files do not support. Here the worker can only **claim**; the plugin then runs the contract's checks itself, an independent read-only verifier must quote the files for anything a command cannot check, and the plugin re-reads those quotes. A failed claim goes back to the worker as a structured verdict and the loop continues.

| | |
|---|---|
| Structured contract | `goal.yaml`: outcome, binary criteria with real checks, invariants, protected test files, non-goals, plan, assumptions, optional budget |
| Host-verified completion | command / file / contains / absent / diff checks run by the plugin; verifier with quote re-reading; owner sign-off criteria |
| Honest loop | progress measured by worktree change, stall and blocker detection, zero-token waits, budget wrap-up, Esc pauses |
| Compaction-proof | the contract is rendered into every request, never kept only in history |
| Live TUI | sidebar card, status pill, banner when you are needed, toasts and desktop notifications |
| No model turns for status | `/goal` commands run as plugin code |

## Install

Requires OpenCode **2.0.22 or later** (OpenCode 1.x plugins and this plugin are not compatible). The package is **`@cleocode/goal`** ("CLEO Goal"); its bin is `cleo-goal`, with `ocg` ("open cleo goal") as an alias. The bin runs on plain Node 22.14+, no Bun needed.

Register the plugin for one project (writes only `<project>/.opencode/opencode.json`, key `plugins`; idempotent):

```bash
npm i -g @cleocode/goal
cd your-project
cleo-goal install --project          # --dry-run to preview, --json for a machine reply
```

With [CLEO](https://github.com/kryptobaseddev/cleo), `cleo goal install --harness opencode` runs the same step, and `cleo doctor goal-runtime` reports the installed version.

Or install it for every project through OpenCode itself (this writes the user-global config):

```bash
opencode plugin add "@cleocode/goal@<version>"
opencode reload
opencode plugin list        # opencode-goal should be listed
```

Pin a version. A git tag still works as a spec: `github:kryptobaseddev/opencode-goal#v<version>`.

### The `cleo-goal` bin

| Command | Does |
|---|---|
| `cleo-goal --version` | prints `cleo-goal <version>` |
| `cleo-goal status --json` | the live goal (else the newest finished one, else `status: "none"`) as JSON with `schemaVersion: 1`; exits 0 whenever the project was readable |
| `cleo-goal install --project [--spec <npm-or-git spec>] [--json] [--dry-run]` | adds this plugin to `.opencode/opencode.json`; replies `{schemaVersion, action: installed\|already-present\|updated\|dry-run, file, spec, plugins}`; exit 1 `{schemaVersion, error}`, exit 2 usage |
| `cleo-goal tick` | the Stop-hook tick CLEO's dispatcher runs: harness Stop JSON on stdin, JSON only on stdout |
| `cleo-goal claim --summary <text> [--evidence C1=<note> ...]` | records a claim from a harness with no OCG tools |

## Quick start

```
/goal new make the checkout test suite pass on Node 24
```

The **write-goal** skill inspects the repository (commands, failing tests, baseline), asks you only the decisions it cannot look up — a few rounds of selectable options with a recommended answer — writes `.opencode/goals/<slug>/goal.yaml`, validates it, shows you the exact contract, and asks to start. Choose **Start goal now**.

Or write a contract yourself and run `/goal start <slug>`.

## The contract

```yaml
schema: goal/v1
id: node24-checkout
title: Checkout suite passes on Node 24
intent:
  verbatim: "make the checkout test suite pass on Node 24"
outcome: npm run test:checkout exits 0 under Node 24
non_goals: [Upgrading other packages]
criteria:
  - id: C1
    statement: WHEN the checkout suite runs on Node 24 THE suite SHALL exit 0
    check: {kind: command, run: "npx -y node@24 node_modules/.bin/jest checkout", live: true}
  - id: C2
    statement: 'No deprecated Buffer() constructor calls remain in src/checkout'
    check: {kind: absent, pattern: "new Buffer\\(", paths: [src/checkout]}
  - id: C3
    statement: MIGRATION.md explains each behaviour change
    essential: false
    check: {kind: verifier, ask: "Does MIGRATION.md explain every behaviour change made for Node 24?"}
invariants:
  - id: I1
    statement: The full suite SHALL CONTINUE TO pass on Node 22
    check: {kind: command, run: "npm test"}
protect: ["test/**"]
plan:
  - {id: S1, title: Reproduce the failures on Node 24}
  - {id: S2, title: Fix them, proves: [C1, C2], depends_on: [S1]}
```

Check kinds: `command` (exit code / output expectations, timeout, repeated runs, `live` re-runs after file changes) · `file` · `contains` · `absent` (no match may remain) · `diff` (paths unchanged since start) · `verifier` (independent read-only judge that must quote files) · `human` (your sign-off). Optional: `scope`, `constraints`, `assumptions`, `budget {turns, wall, tokens, cost_usd}`, `stop`, `autonomy`, `verification {mode, max_rejections}`. Full reference: [skills/write-goal/references/goal-schema.md](skills/write-goal/references/goal-schema.md).

## Commands

| Command | Does |
|---|---|
| `/goal new <words>` | run the write-goal interview (an admission probe surfaces existing/similar goals first) |
| `/goal start <slug>` [acknowledge-supersede] | rehearse every command check, then lock and run |
| `/goal` · `/goal status` | full status dialog |
| `/goal pause` · `/goal resume` | stop / continue the loop (resume resets the stall and failure counters) |
| `/goal verify` | run the completion checks now |
| `/goal amend` · `/goal amend confirm` | propose / re-lock an owner-edited contract (generation-bound audit trail) |
| `/goal archive` | demote a finished goal to `.opencode/goals-archive/` (never deleted; the registry still answers "was this ever a goal?") |
| `/goal approve C3` · `/goal reject C3 <why>` | sign off on a `human` criterion |
| `/goal abort` | stop the run for good (ledger and evidence stay) |
| `/goal validate <slug>` · `/goal list [all]` | check a contract · list live (+archived) goals; a machine-level registry also lists goals across projects |
| `/goal cleo` · `/goal cleo install\|init\|sync` | probe the CLEO CLI and this project's `.cleo` workspace (initialized / uninitialized / CLI absent); `install`/`init` run the exact documented command **only on your explicit choice** (never silent, never sudo); `sync [<slug>] T123[@sha] …` records genuine per-gate CLEO evidence and completes the linked tasks through the CLI |
| `/goal help` | the agent-forward guide: commands, tool split, storage, mid-run rules |

The same actions are in the command palette under **Goal**.

## What the model gets

Tools (only `goal_*`, visible by name): `goal_status`, `goal_progress` (step + one-line note + next action), `goal_claim` (evidence per criterion, then end the turn), `goal_block` (stable key; three in a row stops the goal), `goal_flag` (a criterion is contradictory, impossible or unsafe), `goal_wait` (resume after N seconds without spending tokens), `goal_validate`, `goal_inventory` (every contract in this project: drafts, live/stopped/complete, archives), `goal_manage` (pause/resume/verify/attach/abort/archive on an exact target), `goal_recover_divergence` (a disk contract that differs from its lock), `goal_propose_amendment` · `goal_resolve_amendment` · `goal_review` (staged contract changes and owner reviews), `goal_start` (only right after you chose **Start goal now**). The verifier alone has `goal_verdict`.

While a goal runs the model cannot edit the contract, files under `.opencode/goals/`, or protected paths, and questions to you are deferred (configurable per goal).

## Where things are kept

`.opencode/goals/<slug>/`: `goal.yaml` (yours), `context.md` and `decisions.jsonl` (from the interview), `run.json`, `ledger.jsonl` (every transition), `evidence/<run>/` (contract snapshot, rehearsal baseline, every verdict, verifier transcripts, amendment records). Finished goals live on in `.opencode/goals-archive/<slug>/` (demoted, never deleted). A machine-level index at `~/.local/share/opencode/goal-registry.json` (override with `OCGOAL_REGISTRY`) lists goals across projects and survives archiving. Consider ignoring `run.json`, `ledger.jsonl` and `evidence/` in git.

## Plugin options

Use the object form in your OpenCode config to change defaults:

```jsonc
{ "plugins": [{ "package": "github:kryptobaseddev/opencode-goal#v0.5.0", "options": { "stallTurns": 4, "cooldownMs": 3000 } }] }
```

`backstopTurns` (200, only when the contract has no turn budget) · `cooldownMs` (1500) · `stallTurns` (3) · `recoveryAt` (2) · `blockerRepeats` (3) · `maxPromptFailures` (3) · `verifierAgent` ("goal-verifier") · `verifierTimeoutMs` (240000) · `liveChecks` (true) · `launchApprovalMs` (600000).

## Development

`bun install && bun test` — the end-to-end suite starts an isolated `opencode serve` with a scripted model, so it never touches your config or sessions. See [AGENTS.md](AGENTS.md) and [docs/HANDOFF.md](docs/HANDOFF.md).

## License

MIT
