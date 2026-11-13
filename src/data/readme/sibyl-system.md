# Sibyl-System

> Read this page in another language: [English](README.md) · [Chinese](docs/README.zh.md)

[![npm version](https://img.shields.io/npm/v/sibyl-system.svg)](https://www.npmjs.com/package/sibyl-system) ![license MIT](https://img.shields.io/badge/license-MIT-green.svg)

A standalone [opencode](https://opencode.ai) plugin that adds independent,
fail-closed review to your agent workflow: nothing it produces can be approved
by the party that drafted it, and a missing or broken reviewer can never count
as consent.

## Why three voters

An AI that reviews its own plan is grading its own homework: the same blind
spots that produced the artifact produced the review. Sibyl's answer is
structural, not temperamental. Three reviewer personas audit every artifact
independently and in parallel, and approval needs 2 of 3 votes with zero
broken seats. Silence, crashes, and unreadable replies count *against*
approval, never for it. One drafting agent can wear down three independent
checks; it cannot become all three.

What it gives you:

- **`sibyl_consult`** — a three-voter review council (MELCHIOR / BALTHASAR / CASPER)
  that audits an artifact against a goal and returns a **fail-closed verdict**
  (`APPROVE` / `REJECT` / `CANNOT_ANSWER`).
- **`sibyl_swarm`** — a lightweight workflow swarm: an ARCHITECT persona plans a
  dependency-ordered task graph, deterministic workers execute it in waves, and
  the result is aggregated into a verdict.
- **`sibyl_review` / `sibyl-chamber`** — a general review chamber with isolated
  role sessions and one conclusion spoken in one voice (see below).
- **`sibyl_audit`** — the outside lane as a product organ: completion reviews
  convene themselves from a fresh root session, so the reviewer is
  structurally unrelated to whoever drafted the artifact (see Tools).
- **`sibyl_status` + verification primitives** (`sibyl_anchor_check`,
  `sibyl_time_probe`, `sibyl_attribute`) — read-only checks: run-store view,
  re-verification of claimed human orders against the engine's own records,
  clock integrity, commit attribution.

Zero coupling to team-mode or fleet orchestration: no `team_*` tools, no
cross-agent message bus. Everything runs through plain opencode child sessions.

## Session hygiene

Council voters, swarm workers and the swarm judge run as **child sessions of
the calling session** (`parentID` from the tool context): the TUI session
picker lists root sessions only, so no review vote ever clutters your top-level
session list. Transcripts stay in the DB, reachable from the parent session and
mirrored into the run's sealed reply files. A seatless (CLI/headless) caller
falls back to top-level creation, and its voter rows are **garbage-collected
on success** (the reply files are the durable record; failed votes keep their
DB rows for salvage). `sibyl_review` roles run fully isolated under /tmp with
their own HOME/DB (`src/lane/isolated.ts`), never touching yours.

## The review chamber (democratic centralism)

The name is the design: broad internal deliberation, one unified external
voice. `sibyl_review` + `sibyl-chamber` is a GENERAL review apparatus: any
artifact (doc, plan, code, agent-behavior exam pack) goes through broad
evidence gathering -> blind PRO/CON clash with cross-critique -> an
independently-drawn judge (the judge pool and draw seed are recorded before
launch) -> exactly ONE conclusion spoken in ONE voice (APPROVE / REJECT /
NEEDS_HUMAN). Internal dissent is preserved by path+hash in the sealed run
dir, never dumped outward. All role sessions run isolated under /tmp (zero
sessions in your main list); runs are spotcheckable
(`sha256sum -c CHECKSUMS.txt`) and append-only-ledgered.
Laws and mechanism: https://github.com/TachikomaGundam/Sibyl-System/tree/main/docs.

```
sibyl-chamber run --target doc.md --goal "Is this sound?" --model your-provider/your-model
sibyl-chamber status --tail 5
sibyl-chamber spotcheck <runDir|runId>
sibyl-chamber kill <runDir> <role>
sibyl-chamber run --target - --goal "Evaluate candidate behavior" --profile exam --model your-provider/your-model --scenario scenarios/<id>.json
```

## Install

### Requirements

Use the Node version declared by `package.json` `engines`. Linux with
Bubblewrap provides hardened filesystem containment. macOS and Windows use
portable containment only with `credentialProxy`; it protects credentials but
does not stop artifacts reading files accessible to the runner account.

**Version binding.** sibyl-system 2.x requires opencode 2.x (developed and
verified against 2.2.7): the plugin entry point is the 2.x `{ id, setup }`
definition, which opencode 1.x never loads — an install under 1.x sits dead
and silent. opencode 1.x users stay on sibyl-system 1.6.5, the last
1.x-compatible line; the reverse is equally hard — 1.6.5 fails to load under
2.x.

Install the published npm package (opencode 2.x plugin system; opencode 1.x
is retired):

```sh
opencode plugin add sibyl-system
```

Or register it in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": ["sibyl-system"]
}
```

Alternatively, register a local checkout by path — a configured local path
must be a **directory** (a checkout of this repo with `dist/` built, or an
installed npm package directory such as `node_modules/sibyl-system`; a path
to a single file is silently skipped by 2.x). One entry in
`~/.config/opencode/opencode.jsonc`
(Windows: `%USERPROFILE%\.config\opencode\opencode.jsonc`). This is a
**documented example only** — the plugin never edits your config:

```jsonc
{
  "plugins": [
    {
      "package": "/abs/path/to/sibyl-system",
      "options": {
        "modelPool": {
          "default": { "providerID": "your-provider", "modelID": "your-model" }
        },
        "concurrencyK": 4
      }
    }
  ]
}
```

The options object's fields sit at its **top level** (as in the example) and
are passed **verbatim**; unknown keys are rejected loudly, never silently
ignored. The options object is
the **only** config surface — there are no other config files (the
  `SIBYL_STATE_FILE` and `SIBYL_CHAMBER_LEDGER` env vars exist solely as
  explicit test/CI isolation seams, see State).

Invalid options never crash the host: the plugin prints
`[sibyl] SIBYL plugin DISABLED — fix options (no sibyl_* tools registered)` to
stderr, registers nothing, and returns empty hooks.

## Tools

Throughout: a *receipt* here means a machine-verifiable result record —
identifiers and hashes you can re-check against the engine's own store, not a
transcription.

| Tool | Arguments | Behavior |
|------|-----------|----------|
| `sibyl_consult` | `{ artifact, goal }` | `artifact` is a file path or inline multi-line text (≤ 256 KiB). The three councilors audit it in parallel; each reply is parsed into a verdict (one in-session JSON-only repair shot per voter). Returns the tally, merged reasons/must-fix, run id, and per-voter reply file paths. |
| `sibyl_audit` | `{ artifact, goal }` | Independent audit lane: the council is convened by a FRESH engine-provisioned root session (structurally unrelated to any drafting chain), so the review enters the effective path without the caller's identity touching it. Receipt: auditor session id (retained, DB-reconcilable), artifact sha256 bound at start and end (mid-flight drift => VOID), and the verdict; anything but INDEPENDENT on the fresh convener => REFUSED, no receipt. |
| `sibyl_swarm` | `{ artifact, goal, judge? }` | ARCHITECT decomposes goal + artifact into a strict-JSON workflow schema; workers are minted deterministically and dispatched in dependency waves; drafts land in the run's space dir. Verdict: `APPROVE` / `REJECT` / `EXHAUSTED`, forced to `CANNOT_ANSWER` when a declared worker left no terminal row (rule W2 below) or zero drafts were produced. With `judge: true`, one extra judge pass may replace the derived verdict — an unrecognized or failed judge reply keeps the derived one. |
| `sibyl_status` | `{ runId? }` | Read-only. Lists all recorded runs (newest last) + the last chamber-ledger rows, or shows one run's full record and space dir. |
| `sibyl_review` | `{ target, goal, seed?, maxRounds? }` | General democratic-centralism chamber: launches the isolated evidence→clash→judge pipeline detached and returns a receipt (explicitly NOT a verdict); the single voice lands in the run record at terminal state. CLI twin: `sibyl-chamber`. |
| `sibyl_anchor_check` | `{ sessionId, index?, body?, expectSha256?, label? }` | Read-only verifier for "human anchor" claims (an order/approval message the owner says they sent): re-checks the claim against the engine's own session store instead of trusting a transcribed string. Closed 4-state verdict `MATCH` / `MISMATCH` / `ABSENT` / `ERROR`; the receipt carries a hash of the canonical view read, so later store mutation shows up as a view-hash difference. No `expectSha256` claim → non-verdict. |
| `sibyl_time_probe` | `{ endpoints?, toleranceMs? }` | Clock-integrity check against independent HTTP `Date` headers (default pool: cloudflare / google / mozilla; sources with the same owner dept collapse to ONE source). Verdict: `SYNCED` / `DRIFT` / `INSUFFICIENT-SOURCES` (< 2 distinct owners is never consent). Default tolerance 300000 ms. `endpoints` JSON is shape-validated and every URL passes the egress gate before any fetch (reserved/internal shapes refused by rule name; blocked = failed receipt, never consent). HEAD only, zero payload, redirects not followed. |
| `sibyl_attribute` | `{ moves, commits, roster }` | Pure comparator (zero network/git of its own): attributes git ref-moves to committer identities against a roster. Per-move verdict: `ATTRIBUTED` / `UNATTRIBUTED` (the silent-egress case) / `AMBIGUOUS` (byte-equal roster pair = registry defect, blocks, never picks). Identity matching is byte-exact by design — no normalization. `moves`/`roster` JSON is shape-validated; malformed input is refused by name (entry-indexed), never guessed at. |

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
| `lane` | see below | Isolated-lane mechanics for `sibyl_review` / `sibyl-chamber` (`src/lane/isolated.ts`). Sub-keys: `runRoot` (string, default `"/tmp"`) — parent dir for run dirs; `opencodeBin` (non-empty string; discovery order: `$OPENCODE_BIN` → `~/.local/bin/opencode` → `/usr/local/bin/opencode` → `/usr/bin/opencode` → bare PATH name `"opencode"`; never empty, a wrong guess fails loud at spawn naming the bin; a bare name is resolved host-side against `$PATH` BEFORE sandboxing, so the sandbox execs exactly that resolved binary regardless of the sandbox's pinned PATH) — the binary launched for each isolated role; `configSource` (default `~/.config/opencode/opencode.jsonc`) — read-copied only when `credentialProxy` is absent, never written back; `roleTimeoutMs` (integer ≥ 5000, default `1200000`) — per-role wall-clock budget; `roleSalvageGraceMs` (integer ≥ 0, default `900000`) — grace window after the deadline: a role still finishing within grace is kept and disclosed (`SALVAGED … past its deadline` on the ledger/notes, verdict demoted through the normal gap channel); grace exhausted still SIGKILLs with timedOut=true, so a hung role dies — fail-closed unchanged; `examMaskDirs` (array of absolute paths, default `[]`) — dirs tmpfs-masked from exam candidates (grader files, other runs); empty = an unsandboxed venue that says so plainly in its final report. A mask whose subtree contains the lane binary never kills the lane: the sandbox builder re-binds the binary's parent directory (and its resolved realpath's parent, or the file itself if it hangs directly on the masking root) read-only on top of the tmpfs, leaving the rest of the masked tree hidden. |
| `modelPolicy` | `{ allowedPrefixes: ["local-"] }` | Model seating allow-list: only pool models whose `providerID/modelID` starts with one of these prefixes may take a seat; everything else is denied at launch. Array of non-empty strings, **at least 1 entry** (an empty list is rejected as a deny-everything typo). Set this to your own machine's providers — the shipped default is a prefix pattern, not a specific model. |
| `credentialProxy` | absent | Optional loopback credential relay for isolated roles. When configured, every seated provider must appear in `providers`; Sibyl refuses an undeclared seat rather than falling back to host config. Each provider declares `baseUrl`, exactly one of `keyFile`, `keyEnv`, or `keyless: true`, optional OpenAI-compatible `npm`, and allowed `models`. `maxRequestsPerRole` defaults to `2000`. |
| `chamber` | see below | Review-chamber seats and rounds. Sub-keys: `maxRounds` (integer 1–8, default `3`) — clash/cross-critique round cap; `roles` (`{ evidence, pro, con, judge }` → pool slot names, each default `"default"`); `judgePool` (non-empty array of slot names, default `["default"]`) — the slots the independent judge may be drawn from (the pool and draw seed are recorded before launch). |

### Credential proxy for isolated roles

Use `credentialProxy` when review or exam roles may run untrusted artifacts or
prompts. Sibyl starts a loopback-only relay for the run, reads each provider key
once in the trusted runner, and gives each role a short-lived scoped token. The
role receives a synthesized provider-only OpenCode config: it does **not** copy
your host `configSource`, and it never receives the upstream API key.

```jsonc
{
  "plugins": [
    {
      "package": "sibyl-system",
      "options": {
        "modelPool": {
          "default": { "providerID": "review-gateway", "modelID": "review-model" }
        },
        "modelPolicy": { "allowedPrefixes": ["review-gateway/"] },
        "credentialProxy": {
          "providers": {
            "review-gateway": {
              "baseUrl": "https://gateway.example.com",
              "keyFile": "~/.config/sibyl/review-gateway.key",
              "models": ["review-model"]
            },
            "local": {
              "baseUrl": "http://127.0.0.1:8000",
              "keyless": true,
              "models": ["local-review"]
            }
          },
          "maxRequestsPerRole": 2000
        }
      }
    }
  ]
}
```

`keyFile` is the recommended production option. Store it outside the project
tree with owner-only permissions. `keyEnv` is supported for an already managed
runner secret, but Sibyl reads it only at relay startup; it never propagates to
role processes. `keyless: true` is for local OpenAI-compatible servers that do
not require authentication. `baseUrl` is the upstream origin; the relay adds
the request path. It permits POST `/v1/chat/completions`, `/v1/completions`,
`/v1/embeddings`, `/v1/responses`, and GET `/v1/models` or `/v1/models/*`.
All other paths return 404. The relay rejects redirects, applies the role quota, and records
sanitized request receipts in the run directory. It does not log request bodies,
authorization headers, upstream keys, or role tokens.

Migration is opt-in: adding `credentialProxy` changes isolated roles from
host-config copies to proxy-only configuration. Add every provider a role can
use before enabling it; an omitted provider fails the run before the role
launches. First test against a revocable/non-production credential, then rotate
any key that was previously exposed to role environments.

The role sandbox blocks agent-controlled shell and web tools and uses isolated
namespaces, but it retains normal model-provider connectivity through the
loopback relay. The relay is a credential boundary, not a destination-level
network firewall. A hostile local user sharing the runner account, or an
unsandboxed exam venue, is outside this boundary; use a dedicated OS account or
container for those threat models.

### Portability (release principle)

The published package pins **no device-side model authorizations**: the only
model defaults shipped are empty-string sentinels (= "host default") and the
generic `local-` seating prefix. Concrete provider/model ids live exclusively
in **your** config — the options object of the registration entry (per-operator
`modelPool` / `modelPolicy` / `--model` flag). Operators on shared fleets
conventionally keep concrete values in an operator-local file that their own
shell or OpenCode configuration feeds into that options object at registration.
time; that file sits outside the package boundary — `package.json` `files`
ships only `dist/`, `README.md`, `LICENSE`, and ship.sh gate 5a fails the
release if anything else appears in the tarball. `./ship.sh` additionally
fails the release if any vendor model id reappears on a shipped surface.

## State layout

All persistent data lives under one directory, `~/.sibyl` (created on first
use; on Windows `%USERPROFILE%\.sibyl`). The only place outside it the plugin
writes is the isolated run root for chamber/exam lanes (`lane.runRoot`,
default `/tmp`, defined under Options) — sealed per-run directories there.

- **Chamber ledger**: `~/.sibyl/chamber-ledger.jsonl` — append-only history, one JSON
  record per line, each run stamped with a per-run sequence number that
  increments with every appended run; `sibyl_status` reads its tail.
- **Runs file**: `~/.sibyl/runs.json` (Windows: `%USERPROFILE%\.sibyl\runs.json`) —
  one record per run (id, kind, artifact, goal, status, verdict, timestamps,
  plus notes the tool records at run milestones, shown by `sibyl-chamber status`),
  co-located
  with `spaces/` under the one `~/.sibyl` state root, so npm upgrades (which ship a
  fresh, versioned package directory) never wipe your run history. Written
  atomically (tmp + rename; the parent directory is created on demand).
- **Per-run space**: `~/.sibyl/spaces/<runId>/` (Windows: `%USERPROFILE%\.sibyl\spaces`) — full voter replies
  (`MELCHIOR.md`, …) for consults, worker drafts (`<workerId>.draft.md`) for swarms.
- **Test/CI overrides**: `SIBYL_STATE_FILE` points the runs file at a custom
  path. `SIBYL_CHAMBER_LEDGER` explicitly points the append-only chamber ledger
  at another path. Neither setting is implicit; use both in isolated CI runs.
- `load()` never throws: a missing or corrupt runs file recovers to an empty
  list (with a stderr warning) and the next write replaces the corrupt file —
  so if run history matters, back up `~/.sibyl`; the chamber ledger is a
  separate append-only file and is untouched by that recovery. Malformed
  individual entries are dropped, not fatal.

## Fail-closed policy

Plainly stated — every combination lands in exactly one state:

- **APPROVE** needs ≥ 2 genuine approvals **and** zero error/missing votes.
  With three voters that means exactly 3A or 2A+1R.
- **REJECT** when the council answered: all three voted genuinely but approval
  wasn't reached, or there are ≥ 2 genuine rejects regardless of the third
  seat (2R+1error is still a REJECT — the "no" is already decisive).
- **CANNOT_ANSWER** for every other mix (2A+1error, 1A+1R+1error, …): the
  mechanism itself is broken. That is NOT a "no", and it can never be treated
  as a "yes": repair the broken part and run again.
- A reply that still doesn't parse after its single repair shot is **not** a
  reject ballot — it marks that seat as an error, which blocks approval and
  can force CANNOT_ANSWER. There is no path where a broken reply helps
  anything pass.
- Each ballot also carries a self-reported `confidence` (0..1): recorded for
  the human reader, never used in the tally.
- The pinned default policy is `majority2of3`; stricter policies exist (see
  Architecture), never looser ones. There is no lenient mode, by design.
  All of the above is pinned by `test/council.test.ts`.

## Ballot-integrity laws

These rules exist because real failures happened while this product was in
daily internal use (the incident records themselves live outside the shipped
package). Four of them govern the ballot itself; three carry the short names
`W1`–`W3` used across the codebase and the docs, while the fourth — refused
launches leaving records — arose from a specific council ruling and carries
no short name. A fifth rule, `W4`, governs releases instead and is stated
where it applies, in the Release process section at the end of this document.

- **Convener recusal (W1).** Every consult/swarm/review run resolves the
  convening execution chain through the engine's own session store
  (`session.get` parent links — never a self-report) and scans it for drafting
  evidence of the artifact (write/edit parts targeting it, or content matches).
  A kinship hit marks the run `independence=NOT-INDEPENDENT`: the ballot is
  preserved as data but is not in any effective path. A chain that cannot be
  read stamps `UNVERIFIABLE` — unreadable is never silently clean.
- **Refused launches leave records.** An explicit `--run-id` whose tool-staged
  `launch-context.json` is missing or malformed is REFUSED, with a
  `launch-refusal.json` written into the private run dir — a pinned id claiming
  a tool launch that never staged its finding is a provenance lie, not an
  absence. The bare CLI lane (no `--run-id`) keeps the named `UNVERIFIABLE`
  leg, and once the chamber runner regenerates its run record, that record
  outranks any contradicted staged claim ("record wins").
- **Absence is a disability (W2).** Before any tally is honored, every declared
  voter/worker must have left a terminal row (`ok|error|timeout` + detail) in
  the run's `TERMINALS.txt`. A declared seat without its row is counted
  `dead-without-record=N` on the first receipt line and forces `CANNOT_ANSWER` —
  never folded into an approve or a reject. A worker session ending with empty
  content is a failure, not a done ballot.
- **The scoring rules travel with the vote (W3).** Each terminal record embeds
  `instrument: {rulesHash, components}` — the sha256 of every persona prompt /
  criteria text the build actually sends (councilors, architect, judge, repair
  grammar, chamber roles). `rulesHash` flips with any rule edit, so
  "re-evaluate under the new rules" is reproducible and comparable; the
  `rules=<12hex>` label rides every result line and `sibyl_status` output.

## Security notes

See **[SECURITY.md](https://github.com/TachikomaGundam/Sibyl-System/blob/main/SECURITY.md)** for the disclosure channel (private GitHub
advisory), the full data-egress map, and the honestly-named limitations.
Summary:

- Consult/swarm send the artifact text to your configured model pool providers.
- `sibyl_time_probe` fetches nothing before the URL passes the egress gate:
  reserved/internal address shapes, single-label hosts, non-http(s) schemes,
  userinfo and non-default ports are refused by rule name; a blocked source is
  a failed receipt, never consent.
- The plugin writes under its state paths (the runs file and the per-run space) and,
  for chamber/exam lanes, sealed run directories under `lane.runRoot`
  (default `/tmp`), every plugin-created dir `0700` (mkdir mode + explicit
  chmod: unreachable to group/other regardless of umask) —
  role homes, transcripts, pidfiles, CHECKSUMS.
- Voter/worker turns run with `bash`, `edit`, and `write` disabled per prompt.
- Supply chain: CI actions are SHA-pinned, installs run with
  `--ignore-scripts`, and a weekly `npm audit`
  (`.github/workflows/scheduled-audit.yml`, which also accepts repo
  workflow_dispatch runs) is witnessed server-side by the pre-publish
  liveness gate (a green audit run, recent within the gate's pinned
  freshness window and bound to the exact commit being released — the
  judgment table and the operative defaults are locked together in
  `test/publish-gate.test.ts`, which imports the defaults from
  `scripts/publish-gate.mjs`). Honest status ledger of every vector,
   open or closed: [OPEN-VECTORS.md](https://github.com/TachikomaGundam/Sibyl-System/blob/main/OPEN-VECTORS.md).
- Engine sessions this product spawns are retained under bounded ages
  (`npm run reap`, dry-run by default; audit conveners >= 90 days per owner
  ruling, reconciliation data preserved in the sealed manifest).

## Architecture (`src/`)

Dependencies point downward only:

```
index.ts            plugin entry: parse options → share one RunStore + client
                    adapter → register the eight sibyl_* tools
├── engine/         runPersona(): create + prompt one child session through a
│                   structural client seam; per-stage timeouts; never throws —
│                   every failure is a structured PersonaRunResult
├── verdict/        strict JSON verdict contract: fence-tolerant extraction →
│                   validation → exactly one repair → fail-closed REJECT
├── council/        councilor personas + tallyVotes (majority2of3 default,
│                   unanimous exported); pure aggregation, zero IO
├── state/          RunStore: atomic RMW runs.json, per-run space dirs;
│                   chamber records: EOF-append ledger, final report
│                   regenerated last, CHECKSUMS + spotcheck
├── swarm/          planner (ARCHITECT schema) → minter (deterministic worker
│                   roster) → dispatcher (dependency waves, stagger,
│                   suspend-on-rate-limit, resume) → aggregate (report +
│                   verdict derivation; full drafts never inlined)
├── lane/           isolated opencode-run launcher (env pinning,
│                   argv-only spawn, pidfile-only kill) + seating policy prefilter
├── chamber/        deliberation protocol (evidence -> blind clash ->
│                   cross-critique -> drawn judge, bounded rounds) + synthesis
│                   (one voice, fail-closed, dissent sealed by path+hash)
├── exam/           scenario-as-data behavioral exams, mechanical
│                   transcript/disk signal grading, canary veto
├── personas.ts     registry: 3 councilors + ARCHITECT + judge/repair texts,
│                   model slots — the single source of every scoring-rule
│                   text (rule W3 hashes these)
├── terminal.ts     rule W2 terminal-row grammar (ok|error|timeout), parse +
│                   the dead-without-record declared-minus-recorded diff
├── instrument.ts   rule W3 ruler: sha256 set of the live prompt/criteria
│                   texts + deterministic rulesHash fold
├── independence.ts rule W1 convener-recusal: engine-store chain walk +
│                   drafting-evidence scan (INDEPENDENT / NOT-INDEPENDENT /
│                   UNVERIFIABLE, fail-closed on unreadable)
├── options.ts      zod v4 schema + parseOptions (never throws); home of the
│                   config-default single sources (DEFAULT_TIMEOUT_MS)
├── cli.ts          sibyl-chamber bin: run | status | spotcheck | kill
├── util.ts         single definitions: withTimeout + errMessage
└── tools/          sibyl_consult / sibyl_swarm / sibyl_status / sibyl_review
                    + audit primitives (anchor / time probe / attribution)
                    glue + shared helpers (model-slot chain, artifact reader)
```

## Relationship to other multi-agent tools

If you have seen "swarm"-style toolkits — for example the multi-agent
orchestration bundled with [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent),
which coordinates long-lived named agents through shared tools and a message
bus — this is **not** one of those. It has no `team_*` tools, no
cross-agent message bus, and no fleet-orchestration dependency of any kind —
it was written from scratch (~5K lines of product code, comments excluded,
`src/` only) and happens to share the problem space. `sibyl_swarm` is a
single tool call driving a PLAN→MINT→DISPATCH→AGGREGATE pipeline over
ordinary child sessions.

## Development

```bash
npm run typecheck   # tsc --noEmit, strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
npm test            # full unit suite, fully offline (no network, no LLM; the run prints the exact count)
npm run reap        # session-retention reaper: dry-run manifest by default; -- --apply deletes via the engine API
npm run coverage    # offline suite + coverage floor ratchet (floors only move up; CI door)
npm run build       # esbuild bundle → dist/index.js + dist/cli.js (ESM)
node smoke/run-smoke.mjs   # offline smoke of the shipped surface (see smoke/README.md)
./ship.sh           # the full release gate: all of the above + portability scan of the packed tarball
```

Live end-to-end evidence (real opencode, real model sessions):

- Working evidence t10 (recorded outside this repository, not shipped) — happy path: 3 real voters audited an artifact with
  planted defects and returned fail-closed **REJECT 0A/3R**, citing all 3
  planted defect classes; council wall time 95.6 s ≈ slowest single voter
  (Σ 168.2 s), proving true parallel fan-out.
- Working evidence t11 (recorded outside this repository, not shipped) — failure paths, 31/31 assertions: a bad model slot
  produced 3 error votes, and the run failed closed; SIGINT mid-run left
  the store valid with the interrupted run honestly frozen at `running`.
  (The recorded tally predates the judgment-table law pinned in
  `test/council.test.ts`; under today's locked table an all-error ballot is
  classified CANNOT_ANSWER, never REJECT — see the fail-closed policy table.)
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

## Release process

Publishing a version takes three steps:

1. write a release record (`docs/release/v<version>.md` — named after the tag, v included) listing the verification
   evidence, including a literal `gate: PASS` line;
2. take the release lease (`scripts/release-lease.sh`) — a lock file in the
   releaser's own `~/.config/sibyl/` that stops the same maintainer from
   tagging two releases at once (it is a per-user guard, not a distributed
   lock);
3. create the tag and push it.

Nothing more is done by hand: pushing the tag is the last human step. A CI
workflow triggered by the tag then re-verifies the paperwork and publishes to
npm. Enforcement comes in two honest layers:

- **Local (fast-fail, bypassable):** a push hook (rule `W4`) checks that the
  tag carries its own proof — it reads the release record and
  `package.json`'s version from the exact files the pushed tag itself points
  at (`git show <oid>:<path>`), never from the working copy, and requires the
  version inside the tag to equal the tag name. Tag messages are scanned too:
  home-directory paths and email-address shapes are refused by rule name,
  because tag messages are public — reference facts by hash or run id.
  The hook also refuses a tag push unless the local release lease (step 2)
  names exactly that version. Hooks are per-clone and must be installed
  (`scripts/install-hooks.sh`), and
  `git push --no-verify` can skip them — they save you a rejected push, they
  are not the door.
- **Server-side (the door):** the CI publish workflow re-runs the tag
  paperwork — tag name must equal `package.json`'s version, and the release
  record `docs/release/v<version>.md` (tag name, v included) must exist in the tagged tree carrying a
  literal `gate: PASS` line (`scripts/tag-paperwork.mjs`, locked by
  `test/tag-paperwork.test.ts`) — and additionally refuses unless a recent
  security-audit run — scheduled or dispatched by the repo itself — finished
  green on the exact commit being released (the commit binding and the
  pinned freshness window are the "Supply chain" bullet in Security notes).
  Skipping the local hook does not skip this; of the hook's four
  checks, two have no server echo — the tag-message hygiene scan, and the
  lease check, which cannot echo by design (the lease is an operator-local
  per-user file, step 2). The npm publish itself runs under a CI identity
  with provenance, so the registry records exactly which repo commit
  produced the package.
- All of it is regression-locked in tests (`test/hook-prepush.test.ts` feeds
  the hook the same push information git sends it; `test/publish-gate.test.ts`
  locks the server-side door's judgment table).
