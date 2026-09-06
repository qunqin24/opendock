# Sibyl-System

[![npm version](https://img.shields.io/npm/v/sibyl-system.svg)](https://www.npmjs.com/package/sibyl-system) ![license MIT](https://img.shields.io/badge/license-MIT-green.svg)

A standalone [opencode](https://opencode.ai) plugin with two capabilities:

- **`sibyl_consult`** — a three-voter review council (MELCHIOR / BALTHASAR / CASPER)
  that audits an artifact against a goal and returns a **fail-closed 2/3 verdict**.
- **`sibyl_swarm`** — a lightweight workflow swarm: an ARCHITECT persona plans a
  dependency-ordered task graph, deterministic workers execute it in waves, and
  the result is aggregated into a verdict.

Zero coupling to team-mode or fleet orchestration: no `team_*` tools, no
cross-agent message bus. Everything runs through plain opencode child sessions.

## Install

Register the published npm package by name (opencode resolves it from npm):

```jsonc
{
  "plugin": ["sibyl-system"]
}
```

Alternatively, register a local checkout by path. One registration line in
`~/.config/opencode/opencode.jsonc`
(Windows: `%USERPROFILE%\.config\opencode\opencode.jsonc`). This is a
**documented example only** — the plugin never edits your config:

```jsonc
{
  "plugin": [
    [
      "/abs/path/to/sibyl-system/src/index.ts",
      {
        "options": {
          "modelPool": {
            "default": { "providerID": "your-provider", "modelID": "your-model" }
          }
        }
      }
    ]
  ]
}
```

Registering the TS entry directly is supported (opencode transpiles plugin
sources with Bun). The `options` object is the **only** config surface — there
are no other config files (the `SIBYL_STATE_FILE` env var exists solely as a
test/CI isolation seam, see State).

Invalid options never crash the host: the plugin prints
`[sibyl] SIBYL plugin DISABLED — fix options (no sibyl_* tools registered)` to
stderr, registers nothing, and returns empty hooks.

## Tools

| Tool | Arguments | Behavior |
|------|-----------|----------|
| `sibyl_consult` | `{ artifact, goal }` | `artifact` is a file path or inline multi-line text (≤ 256 KiB). The three councilors audit it in parallel; each reply is parsed into a verdict (one in-session JSON-only repair shot per voter). Returns the tally, merged reasons/must-fix, run id, and per-voter reply file paths. |
| `sibyl_swarm` | `{ artifact, goal, judge? }` | ARCHITECT decomposes goal + artifact into a strict-JSON workflow schema; workers are minted deterministically and dispatched in dependency waves; drafts land in the run's space dir. Verdict: `APPROVE` / `REJECT` / `EXHAUSTED`. With `judge: true`, one extra judge pass may replace the derived verdict — an unrecognized or failed judge reply keeps the derived one. |
| `sibyl_status` | `{ runId? }` | Read-only. Lists all recorded runs (newest last), or shows one run's full record and space dir. |

## Options

All keys optional; a type error or a missing required entry (such as
`modelPool.default`) disables the plugin with per-field `[sibyl] config error: …`
lines. Unknown keys are ignored for forward-compatibility — so a typo'd option
key runs on defaults.

| Key | Default | Meaning |
|-----|---------|---------|
| `modelPool` | `{ default: { providerID: "", modelID: "" } }` | Named `{providerID, modelID}` slots. The `default` entry is **required**. Empty-string provider/model is a sentinel meaning "host default". Resolution per persona: caller override slot → persona's own slot (`melchior`/`balthasar`/`casper`/`architect`) → `pool.default`; a missing named slot is never fatal. |
| `voters` | all `"default"` | `{ MELCHIOR, BALTHASAR, CASPER }` → pool slot names, letting each councilor run on a different model. |
| `swarm` | all `"default"` | `{ judge, pro, con }` → pool slot names for the swarm roles. |
| `maxRounds` | `4` | Swarm round budget (wave cycles). Integer 1–16. |
| `timeoutMs` | `240000` | Per-child-session timeout (create + prompt share the budget). Integer ≥ 1. |
| `concurrencyK` | `4` | Cap on parallel workers per wave (also capped by the schema's own `concurrency`). Integer 1–8. |
| `staggerMs` | `2000` | Delay between worker launches within a wave, to avoid rate-limit bursts. Integer ≥ 0. |

## State layout

- **Runs file**: `<repo>/.state/sibyl/runs.json` — one record per run (id, kind,
  status, verdict tally, operator notes). Written atomically (tmp + rename).
- **Per-run space**: `~/.sibyl/spaces/<runId>/` (Windows: `%USERPROFILE%\.sibyl\spaces`) — full voter replies
  (`MELCHIOR.md`, …) for consults, worker drafts (`<workerId>.draft.md`) for swarms.
- **Test seam**: `SIBYL_STATE_FILE` env var overrides the runs-file path.
- `load()` never throws: a missing or corrupt file recovers to an empty list
  (with a stderr warning); malformed individual entries are dropped, not fatal.

## Fail-closed policy

Plainly stated:

- Approval needs **≥ 2 of 3 approvals and zero error/missing votes**.
  Anything else — including 2A + 1 error or 2A + 1 missing — is **REJECT**.
- Error votes, missing votes, and malformed verdicts all count against approval.
- A reply that still doesn't parse after its single repair shot becomes a
  0-confidence REJECT ballot with reason `verdict-unparseable: …`.
- There is no lenient mode, by design.

## Security notes

- Consult/swarm send the artifact text to your configured model pool providers.
- The plugin writes only under its state paths: the runs file and the per-run space.
- Voter/worker turns run with `bash`, `edit`, and `write` disabled per prompt.

## Architecture (`src/`)

Dependencies point downward only:

```
index.ts            plugin entry: parse options → share one RunStore + client
                    adapter → register the three tools
├── engine/         runPersona(): create + prompt one child session through a
│                   structural client seam; per-stage timeouts; never throws —
│                   every failure is a structured PersonaRunResult
├── verdict/        strict JSON verdict contract: fence-tolerant extraction →
│                   validation → exactly one repair → fail-closed REJECT
├── council/        councilor personas + tallyVotes (majority2of3 default,
│                   unanimous exported); pure aggregation, zero IO
├── state/          RunStore: atomic RMW runs.json, per-run space dirs
├── swarm/          planner (ARCHITECT schema) → minter (deterministic worker
│                   roster) → dispatcher (dependency waves, stagger,
│                   suspend-on-rate-limit, resume) → aggregate (report +
│                   verdict derivation; full drafts never inlined)
├── personas.ts     registry: 3 councilors + ARCHITECT, model slots
├── options.ts      zod v4 schema + parseOptions (never throws)
└── tools/          sibyl_consult / sibyl_swarm / sibyl_status glue + shared
                    helpers (model-slot chain, artifact reader)
```

## vs. swarm

This is **not** the oh-my-openagent swarm. It has no `team_*` tools, no
cross-agent message bus, and no fleet-orchestration dependency of any kind —
it is a clean-room implementation (~2.1K lines of product code, comments excluded) that happens to
share the problem space. `sibyl_swarm` is a single tool call driving a
PLAN→MINT→DISPATCH→AGGREGATE pipeline over ordinary child sessions.

## Related projects (name disambiguation)

Several unrelated "MAGI" projects exist in the opencode/LLM space; none share
code with this one:

- **magi-ai/opencode-magi** — an OpenCode plugin for multi-model GitHub PR
  review/merge with odd-number majority approval gating. MAGI (theirs) reviews
  pull requests; ours votes on arbitrary artifacts/files with fail-closed REJECT.
- **ladiossoop5star/open_magi** — an OpenCode plugin running three fixed
  read-only EVA-named deliberators whose consensus gate precedes the main
  agent's action; ours is a council-as-a-tool with on-disk provenance and a
  separate dynamic-swarm executor.
- **fshiori/magi** — a Python CLI where three LLMs debate to improve an answer,
  continuing (fail-open) when voters error; ours treats any missing/erroring
  vote as fail-closed against approval.
- **a16z/magi** (LLM rollup), **ragavsachdeva/magi** (manga-page CV),
  **itorr's MAGI** (EVA toy build) — name-noise only, nothing in common.

Shared inspiration is Evangelion's MAGI trinity; implementations are unrelated.

## Development

```bash
npm run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
npm run test        # 255 unit tests, fully offline (no network, no LLM)
npm run build       # esbuild bundle → dist/index.js (ESM)
node smoke/run-smoke.mjs   # offline smoke of the shipped surface (see smoke/README.md)
```

Live end-to-end evidence (real opencode, real model sessions):

- `.omo/evidence/t10/` (internal working evidence, not shipped) — happy path: 3 real voters audited an artifact with
  planted defects and returned fail-closed **REJECT 0A/3R**, citing all 3
  planted defect classes; council wall time 95.6 s ≈ slowest single voter
  (Σ 168.2 s), proving true parallel fan-out.
- `.omo/evidence/t11/` (internal working evidence, not shipped) — failure paths, 31/31 assertions: a bad model slot
  produced 3 error votes → fail-closed **REJECT 0A/0R/3E**; SIGINT mid-run left
  the store valid with the interrupted run honestly frozen at `running`.
- `smoke/` ships a deterministic offline re-check of the build + entry +
  status surface for CI use.

## Naming

The product is named after the **Sibyl System** from *Psycho-Pass*: a distributed,
fail-closed deliberation network that renders verdicts — a fitting namesake for a
voting council. The councilor names **Melchior / Balthasar / Casper** are retained
as an Evangelion MAGI tribute to the original three-voter design. The project was
developed under the name MAGI and renamed to Sibyl-System before its first release.

## License

MIT
