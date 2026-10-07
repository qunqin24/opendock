# Sibyl-System

[![npm version](https://img.shields.io/npm/v/sibyl-system.svg)](https://www.npmjs.com/package/sibyl-system) ![license MIT](https://img.shields.io/badge/license-MIT-green.svg)

A standalone [opencode](https://opencode.ai) plugin:

- **`sibyl_consult`** — a three-voter review council (MELCHIOR / BALTHASAR / CASPER)
  that audits an artifact against a goal and returns a **fail-closed verdict**
  (`APPROVE` / `REJECT` / `CANNOT_ANSWER`).
- **`sibyl_swarm`** — a lightweight workflow swarm: an ARCHITECT persona plans a
  dependency-ordered task graph, deterministic workers execute it in waves, and
  the result is aggregated into a verdict.
- **`sibyl_review` / `sibyl-chamber`** (v1.1) — a general review chamber with
  isolated role sessions and one conclusion spoken in one voice (see below).
- **`sibyl_status` + audit primitives** (`sibyl_anchor_check`, `sibyl_time_probe`,
  `sibyl_attribute`) — read-only verification tools: run-store view, human-message
  anchor re-verification, clock integrity, ref-move attribution.

Zero coupling to team-mode or fleet orchestration: no `team_*` tools, no
cross-agent message bus. Everything runs through plain opencode child sessions.

## Session hygiene (L1)

Council voters, swarm workers and the swarm judge run as **child sessions of the
calling session** (`parentID` from the tool context): the TUI session picker
lists root sessions only, so no sibyl ballot ever clutters your top-level
session list. Transcripts stay in the DB, reachable from the parent session and
mirrored into the run's sealed reply files. A seatless (CLI/headless) caller
falls back to top-level creation, and its voter rows are **garbage-collected
on success** (the reply files are the durable record; failed votes keep their
DB rows for salvage). `sibyl_review` roles run fully isolated under /tmp with
their own HOME/DB (`src/lane/isolated.ts`), never touching yours.

## v1.1 — the review chamber (民主集中制)

`sibyl_review` + `sibyl-chamber` is a GENERAL review apparatus: any artifact
(doc, plan, code, agent-behavior exam pack) goes through broad evidence
gathering -> blind PRO/CON clash with cross-critique -> an independently-drawn
judge (E2 pool+seed committed before launch) -> exactly ONE conclusion spoken
in ONE voice (APPROVE / REJECT / NEEDS_HUMAN). Internal dissent is preserved
by path+hash in the sealed run dir, never dumped outward. All role sessions
run isolated under /tmp (zero sessions in your main list); runs are
spotcheckable (`sha256sum -c CHECKSUMS.txt`) and append-only-ledgered.
Laws: docs/isolation-laws.md. Mechanism: docs/democratic-centralism.md.

```
node dist/cli.js run --target doc.md --goal "Is this sound?" --model your-provider/your-model
node dist/cli.js status --tail 5
node dist/cli.js spotcheck <runId>
node dist/cli.js run --target - --profile exam --scenario scenarios/<id>.json ...  # behavioral exam venue (bell preflight mandatory)
```

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
        "modelPool": {
          "default": { "providerID": "your-provider", "modelID": "your-model" }
        },
        "concurrencyK": 4
      }
    ]
  ]
}
```

Registering the TS entry directly is supported (opencode transpiles plugin
sources with Bun). The tuple's second element is passed **verbatim** as the
options object, so option fields sit at its **top level** (as in the example);
unknown keys are rejected loudly, never silently ignored. The options object is
the **only** config surface — there are no other config files (the
`SIBYL_STATE_FILE` env var exists solely as a test/CI isolation seam, see
State).

Invalid options never crash the host: the plugin prints
`[sibyl] SIBYL plugin DISABLED — fix options (no sibyl_* tools registered)` to
stderr, registers nothing, and returns empty hooks.

## Tools

| Tool | Arguments | Behavior |
|------|-----------|----------|
| `sibyl_consult` | `{ artifact, goal }` | `artifact` is a file path or inline multi-line text (≤ 256 KiB). The three councilors audit it in parallel; each reply is parsed into a verdict (one in-session JSON-only repair shot per voter). Returns the tally, merged reasons/must-fix, run id, and per-voter reply file paths. |
| `sibyl_swarm` | `{ artifact, goal, judge? }` | ARCHITECT decomposes goal + artifact into a strict-JSON workflow schema; workers are minted deterministically and dispatched in dependency waves; drafts land in the run's space dir. Verdict: `APPROVE` / `REJECT` / `EXHAUSTED`, forced to `CANNOT_ANSWER` when a declared worker left no terminal row (W2) or zero drafts were produced. With `judge: true`, one extra judge pass may replace the derived verdict — an unrecognized or failed judge reply keeps the derived one. |
| `sibyl_status` | `{ runId? }` | Read-only. Lists all recorded runs (newest last) + the last chamber-ledger rows, or shows one run's full record and space dir. |
| `sibyl_review` | `{ target, goal, seed?, maxRounds? }` | v1.1 general democratic-centralism chamber: launches the isolated evidence→clash→judge pipeline detached and returns a receipt (explicitly NOT a verdict); the single voice lands in the run record at terminal state. CLI twin: `sibyl-chamber`. |
| `sibyl_anchor_check` | `{ sessionId, index?, body?, expectSha256?, label? }` | Read-only verifier for "human anchor" claims (an order/approval message the owner says they sent): re-checks the claim against the engine's own session store instead of trusting a transcribed string. Closed 4-state verdict `MATCH` / `MISMATCH` / `ABSENT` / `ERROR`; the receipt carries a hash of the canonical view read, so later store mutation shows up as a view-hash difference. No `expectSha256` claim → non-verdict. |
| `sibyl_time_probe` | `{ endpoints?, toleranceMs? }` | Clock-integrity check against independent HTTP `Date` headers (default pool: cloudflare / google / mozilla; sources with the same owner dept collapse to ONE source). Verdict: `SYNCED` / `DRIFT` / `INSUFFICIENT-SOURCES` (< 2 distinct owners is never consent). Default tolerance 300000 ms. Reads remote endpoints; sends no data beyond a HEAD request. |
| `sibyl_attribute` | `{ moves, commits, roster }` | Pure comparator (zero network/git of its own): attributes git ref-moves to committer identities against a roster. Per-move verdict: `ATTRIBUTED` / `UNATTRIBUTED` (the silent-egress case) / `AMBIGUOUS` (byte-equal roster pair = registry defect, blocks, never picks). Identity matching is byte-exact by design — no normalization. |

## Options

All keys optional; a type error or a missing required entry (such as
`modelPool.default`) disables the plugin with per-field `[sibyl] config error: …`
lines. Unknown keys are rejected the same loud way — so a typo'd option key or a
misplaced nesting level (e.g. wrapping everything in `{ "options": { … } }`)
disables the plugin with a named-key error instead of silently running on
defaults.

| Key | Default | Meaning |
|-----|---------|---------|
| `modelPool` | `{ default: { providerID: "", modelID: "" } }` | Named `{providerID, modelID}` slots. The `default` entry is **required**. Empty-string provider/model is a sentinel meaning "host default". Resolution per persona: caller override slot → persona's own slot (`melchior`/`balthasar`/`casper`/`architect`) → `pool.default`; a missing named slot is never fatal. |
| `voters` | all `"default"` | `{ MELCHIOR, BALTHASAR, CASPER }` → pool slot names, letting each councilor run on a different model. |
| `swarm` | all `"default"` | `{ judge, pro, con }` → pool slot names for the swarm roles. |
| `maxRounds` | `4` | Swarm round budget (wave cycles). Integer 1–16. |
| `timeoutMs` | `240000` | Per-child-session timeout (create + prompt share the budget). Integer ≥ 1. |
| `concurrencyK` | `4` | Cap on parallel workers per wave (also capped by the schema's own `concurrency`). Integer 1–8. |
| `staggerMs` | `2000` | Delay between worker launches within a wave, to avoid rate-limit bursts. Integer ≥ 0. |
| `lane` | see below | v1.1 isolated-lane mechanics for `sibyl_review` / `sibyl-chamber` (`src/lane/isolated.ts`). Sub-keys: `runRoot` (string, default `"/tmp"`) — parent dir for run dirs; `opencodeBin` (non-empty string; discovery order: `$OPENCODE_BIN` → `~/.local/bin/opencode` → `/usr/local/bin/opencode` → `/usr/bin/opencode` → bare PATH name `"opencode"`; never empty, a wrong guess fails loud at spawn naming the bin) — the binary launched for each isolated role; `configSource` (default `~/.config/opencode/opencode.jsonc`) — **read-copied** into each role home, never written back; `roleTimeoutMs` (integer ≥ 5000, default `600000`) — per-role wall-clock budget; `examMaskDirs` (array of absolute paths, default `[]`) — dirs tmpfs-masked from exam candidates (grader files, other runs); empty = an unsandboxed venue that says so plainly on the voice face. |
| `modelPolicy` | `{ allowedPrefixes: ["local-"] }` | v1.1 E4/F1 seating allow-list: only pool models whose `providerID/modelID` starts with one of these prefixes may take a seat; everything else is denied at launch. Array of non-empty strings, **at least 1 entry** (an empty list is rejected as a deny-everything typo). Set this to your own machine's providers — the shipped default is a prefix pattern, not a specific model. |
| `chamber` | see below | v1.1 review-chamber seats and rounds. Sub-keys: `maxRounds` (integer 1–8, default `3`) — clash/cross-critique round cap; `roles` (`{ evidence, pro, con, judge }` → pool slot names, each default `"default"`); `judgePool` (non-empty array of slot names, default `["default"]`) — the slots the independent judge may be drawn from (E2 pool+seed committed before launch). |

### Portability (release principle)

The published package pins **no device-side model authorizations**: the only
model defaults shipped are empty-string sentinels (= "host default") and the
generic `local-` seating prefix. Concrete provider/model ids live exclusively
in **your** config — the registration tuple's options object (per-operator
`modelPool` / `modelPolicy` / `--model` flag). Operators on shared fleets
conventionally keep the concrete values in an operator-local file (e.g.
`operator/release.env`, key `HISTORIAN_TRANSLATE_MODEL=<provider/model>`) that
their own shell/opencode config feeds into that options object at registration
time; that file sits outside the package boundary — `package.json` `files`
ships only `dist/`, `README.md`, `LICENSE`, and ship.sh gate 5a fails the
release if anything else appears in the tarball. `./ship.sh` additionally
fails the release if any vendor model id reappears on a shipped surface.

## State layout

- **Chamber ledger**: `~/.sibyl/chamber-ledger.jsonl` — append-only, one JSON
  record per line, serial-stamped at append (A5); `sibyl_status` reads its tail.
- **Runs file**: `~/.sibyl/runs.json` (Windows: `%USERPROFILE%\.sibyl\runs.json`) —
  one record per run (id, kind, status, verdict tally, operator notes), co-located
  with `spaces/` under the one `~/.sibyl` state root, so npm upgrades (which ship a
  fresh, versioned package directory) never wipe your run history. Written
  atomically (tmp + rename; the parent directory is created on demand).
  *Note: 1.0.x-era runs recorded under the old package-local `<repo>/.state` path
  are not migrated (pre-adoption by design) — the store starts empty.*
- **Per-run space**: `~/.sibyl/spaces/<runId>/` (Windows: `%USERPROFILE%\.sibyl\spaces`) — full voter replies
  (`MELCHIOR.md`, …) for consults, worker drafts (`<workerId>.draft.md`) for swarms.
- **Test seam**: `SIBYL_STATE_FILE` env var overrides the runs-file path.
- `load()` never throws: a missing or corrupt file recovers to an empty list
  (with a stderr warning); malformed individual entries are dropped, not fatal.

## Fail-closed policy

Plainly stated:

- Approval needs **≥ 2 of 3 approvals and zero error/missing votes**.
- When the council genuinely spoke (all three ballots substantive, or ≥ 2
  substantive rejects) and approval was not reached, the verdict is **REJECT**.
- When error/missing seats leave no decision (2A + 1 error, 2A + 1 missing,
  a tie with an error seat), the verdict is **CANNOT_ANSWER** — a wounded
  instrument, NOT a substantive reject, and it can never approve. Repair the
  infra and re-run (since v1.2; pinned by `test/council.test.ts`).
- Error votes, missing votes, and malformed verdicts all count against approval.
- A reply that still doesn't parse after its single repair shot becomes a
  0-confidence REJECT ballot with reason `verdict-unparseable: …`.
- There is no lenient mode, by design.

## Ballot-integrity laws (W1–W4, drafted 2026-10-04/05 after the campaign postmortems; shipped in v1.3.0)

- **Convener recusal (W1).** Every consult/swarm/review run resolves the
  convening execution chain through the engine's own session store
  (`session.get` parent links — never a self-report) and scans it for drafting
  evidence of the artifact (write/edit parts targeting it, or content matches).
  A kinship hit stamps the run `independence=NOT-INDEPENDENT`: the ballot is
  preserved as data but is not in any effective path. A chain that cannot be
  read stamps `UNVERIFIABLE` — unreadable is never silently clean.
- **Absence is a disability (W2).** Before any tally is honored, every declared
  voter/worker must have left a terminal row (`ok|error|timeout` + detail) in
  the run's `TERMINALS.txt`. A declared seat without its row is counted
  `dead-without-record=N` on the first receipt line and forces `CANNOT_ANSWER` —
  never folded into an approve or a reject. A worker session ending with empty
  content is a failure, not a done ballot.
- **The ruler rides the ballot (W3).** Each terminal record embeds
  `instrument: {rulesHash, components}` — the sha256 of every persona prompt /
  criteria text the build actually sends (councilors, architect, judge, repair
  grammar, chamber roles). `rulesHash` flips with any ruler edit, so
  "re-evaluate under the new rules" is reproducible and comparable; the
  `rules=<12hex>` label rides the receipt face and `sibyl_status` lines.

## Security notes

- Consult/swarm send the artifact text to your configured model pool providers.
- The plugin writes under its state paths (the runs file and the per-run space) and,
  for chamber/exam lanes, sealed run directories under `lane.runRoot`
  (default `/tmp`) — role homes, transcripts, pidfiles, CHECKSUMS.
- Voter/worker turns run with `bash`, `edit`, and `write` disabled per prompt.

## Architecture (`src/`)

Dependencies point downward only:

```
index.ts            plugin entry: parse options → share one RunStore + client
                    adapter → register the seven sibyl_* tools
├── engine/         runPersona(): create + prompt one child session through a
│                   structural client seam; per-stage timeouts; never throws —
│                   every failure is a structured PersonaRunResult
├── verdict/        strict JSON verdict contract: fence-tolerant extraction →
│                   validation → exactly one repair → fail-closed REJECT
├── council/        councilor personas + tallyVotes (majority2of3 default,
│                   unanimous exported); pure aggregation, zero IO
├── state/          RunStore: atomic RMW runs.json, per-run space dirs;
│                   v1.1 chamber records: EOF-append ledger (A5), face-last
│                   regeneration, CHECKSUMS + spotcheck (A4)
├── swarm/          planner (ARCHITECT schema) → minter (deterministic worker
│                   roster) → dispatcher (dependency waves, stagger,
│                   suspend-on-rate-limit, resume) → aggregate (report +
│                   verdict derivation; full drafts never inlined)
├── lane/           v1.1 E1/E4: isolated opencode-run launcher (L1 env pinning,
│                   argv-only spawn, pidfile-only kill) + seating policy prefilter
├── chamber/        v1.1 民主 protocol (evidence -> blind clash -> cross-critique
│                   -> drawn judge, bounded rounds) + 集中 synthesis (ONE voice,
│                   fail-closed, dissent sealed by path+hash)
├── exam/           v1.1 E3: scenario-as-data behavioral exams, mechanical
│                   transcript/disk signal grading, canary veto
├── personas.ts     registry: 3 councilors + ARCHITECT + judge/repair texts,
│                   model slots — the single source the W3 face hashes
├── terminal.ts     W2 terminal-row grammar (ok|error|timeout), parse + the
│                   dead-without-record declared-minus-recorded diff
├── instrument.ts   W3 ruler face: sha256 set of the live prompt/criteria
│                   texts + deterministic rulesHash fold
├── independence.ts W1 convener-recusal: engine-store chain walk +
│                   drafting-evidence scan (INDEPENDENT / NOT-INDEPENDENT /
│                   UNVERIFIABLE, fail-closed on unreadable)
├── options.ts      zod v4 schema + parseOptions (never throws)
├── cli.ts          v1.1 sibyl-chamber bin: run | status | spotcheck | kill
└── tools/          sibyl_consult / sibyl_swarm / sibyl_status / sibyl_review
                    + audit primitives (anchor / time probe / attribution)
                    glue + shared helpers (model-slot chain, artifact reader)
```

## vs. swarm

This is **not** the oh-my-openagent swarm. It has no `team_*` tools, no
cross-agent message bus, and no fleet-orchestration dependency of any kind —
it is a clean-room implementation (~5K lines of product code, comments excluded) that happens to
share the problem space. `sibyl_swarm` is a single tool call driving a
PLAN→MINT→DISPATCH→AGGREGATE pipeline over ordinary child sessions.

## Development

```bash
npm run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
npm test            # full unit suite, fully offline (no network, no LLM; ~420 at v1.3.0 — the run prints the exact count)
npm run build       # esbuild bundle → dist/index.js + dist/cli.js (ESM)
node smoke/run-smoke.mjs   # offline smoke of the shipped surface (see smoke/README.md)
./ship.sh           # the full release gate: all of the above + portability scan of the packed tarball
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

## Release wheel

Tags v* require a packet receipt (docs/release/<ver>.md with a real `gate: PASS` line) and a lease; after cloning run `scripts/install-hooks.sh` — hooks are per-clone and ship empty. **W4 (2026-10-05):** the hook reads the receipt AND `package.json`'s version exclusively from the pushed tag's **object body** (`git show <oid>:<path>`); working-tree reads are forbidden — the tag must carry its own paperwork, and the in-tag version must equal the tag name (ghost-version class killed). Regression-locked in `test/hook-prepush.test.ts` (ref lines fed via stdin).
