# ZFT (Zero-Friction Traceability)

When agents hand work to each other, acceptance runs on vibes: there is no
pre-agreed definition of done, and when the deliverable is wrong there is no
artifact-level answer to *which agreed item was missed*. Tracing tools
observe what happened — they don't bind the work to what was agreed.

ZFT turns the handoff into a contract with machine-checked evidence.
Contract-grounded verification for multi-agent work.

## What ZFT is

ZFT is a contract-first traceability and verification layer for multiagent
software development. Instead of accepting handoffs on vibes, agents exchange
structured artifacts:

1. **A contract** — a versioned, clause-IDed set of obligations agreed between
   producer and consumer *before* validation. Each **clause** is one atomic,
   individually verifiable statement ("the export endpoint rejects payloads
   greater than 10 MB with a 413 status").
2. **A deliverable** — the work product, composed of **elements** (a function,
   a section, a test case, a claim).
3. **A trace manifest** — a deterministic, bi-directional mapping showing which
   deliverable element fulfills which contract clause, with machine-checked
   evidence (test run, type check, hash) attached to each link.

Both directions of coverage are load-bearing: every clause must be covered by
at least one element (no missed requirements), and every element must be
justified by at least one clause (no scope creep or hallucinated work).
LLM judgment is quarantined — it may only adjudicate clauses explicitly
declared subjective at authoring time, and it is excluded from deterministic
coverage claims.

ZFT (Zero-Friction Traceability) is the product, repository, Python package,
and CLI name (decision 2026-09-17, supersedes the 2026-09-13 note that kept
the `zft` import package and the 2026-09-12 note that kept
`zft` canonical). Run state lives under `.zft/`; dated logs retain
the old codename.

## Where zft sits

flock runs the swarm inside one boundary; flockwork is how swarms coordinate
across boundaries; zft is why you can trust either.

flock (whiteducksoftware/flock) orchestrates agents inside one runtime over a
shared blackboard; flockwork (our git-refspace coordinator) moves work across
trust boundaries where agents share nothing but a repo. zft is the
contract-and-proof layer above both — it binds a deliverable from either world
to a pre-agreed, machine-checked contract.

Not affiliated with whiteducksoftware/flock (their pip package is
flock-core); the names are neighbors, the layers are different.

## The L0–L3 verification gate

`zft gate` enforces four sequential tiers:

- **L0 · Static integrity** — schema validity, clause content hashes,
  duplicate-clause detection across the `.zft/specs/` store.
- **L1 · Local verification** — executable property suites (code-generated
  from clause invariants, with a Gherkin fallback renderer) executed per
  clause.
- **L2 · Merge gate** — sandboxed mutation testing plus full bi-directional
  coverage. Failures are *attributed*: surviving mutants indicate a contract
  fault (back to the spec agent); a valid clause failing indicates an
  implementation fault (back to the producer, bounded retries).
- **L3 · Signed attestation** — DSSE-enveloped attestation over the clause
  subjects, verifiable against the live store.

## Honest state

**Canonical repository.** This is the single working repository for zft
development and publication; the earlier private development line is
archived (read-only, no longer worked in). Two invariants keep it
leak-free: the `leak-sweep` pre-commit hook
(`tests/unit/test_no_private_leaks.py`) rejects private identifiers and
absolute home paths in tracked files, and release cuts are reviewed
against it. The `zft check .` store in [`.zft/specs/`](.zft/specs/) is this
repository's own contract corpus.

**Version.** 0.4.1 — task-gate `[root: PATH]` marker (0.4.0) + opencode-adapter
agent-lookup envelope fix (0.4.1); one gate can
govern a project other than the one it runs from (2026-10-23); 0.3.1 was the
changeset-scoping and gate-correctness cut (2026-10-21); 0.3.0 the gate-core
adapters + leak-removal cut (2026-10-20).
Requires **Python 3.12+**; the `zft` console script is the only entry point.

**Battle-tested.** The gates police this repository's own development: the
seed contract in [`.zft/specs/`](.zft/specs/) gates every commit, and each
release cut went through its own L0–L3 pipeline. Beyond the dogfood, the
gate loop was exercised end-to-end by a multi-agent research program's
benchmark — **9 bench windows, 56 engaged agent pairs judged through the
gates** under a preregistered, frozen-before-execution evaluation design.

**Experimental.** `zft task-gate` (dispatch-boundary enforcement) and
`zft impact` (impact queries) are the youngest surfaces; their semantics may
still settle. The editor plugins (opencode via npm, Codex port in
[`plugins/codex/`](plugins/codex/)) are thin CLI wrappers, observe-mode by
default, enforce-only when you opt in.

**Known boundary.** A green `zft check` proves **traceability, not
conformance**: the gate mechanically verifies bindings, store integrity, and
bound-suite execution — it does not execute your clause's semantics for you.
[`docs/KNOWN-GAPS.md`](docs/KNOWN-GAPS.md) is the living register of exactly
where that boundary sits, starting with Gap 001 and its committed
adversarial probe.

## Install

```bash
pip install zft
```

Requires Python 3.12+ (the `zft` console script is the only entry point).
0.2.0 is the first release installable without `--pre`. Before it, PyPI carried
only PEP 440 pre-releases (`0.2.0aN`, concretely `0.2.0a1..a8`); those
pre-releases remain on PyPI alongside stable 0.2.0 for pinning older receipts.

## Quickstart

All commands take an optional trailing `[root]` (defaults to the current
directory) and exit non-zero on gate failure. A clause **binds** when a test
carries a `# @trace("EXPORT-413")` comment on the line above it — that
binding is what every gate below counts, and `zft extract` prints the
bindings exactly as the gates see them. On a directory with no store yet,
`zft lint` exits 1 with `no clause store found`; scaffold first, lint second.

### New project (empty directory)

Run the commands below in an empty project directory: `zft create`
bootstraps a fresh clause store under `.zft/` and scaffolds your first
DRAFT clause (`zft lint` in a directory with no store refuses with that
same seed hint). `zft check` then stays red — `uncovered`, coverage 0/1 —
until a deliverable element binds: put `@trace("ALIAS")` in a comment line
immediately above the function (Markdown: `<!-- @trace("ALIAS") -->` above
the heading), run `zft extract`, then `zft check` again; `zft baseline`
seeds the reverse-coverage baseline (check's warning names it when
absent). `zft attest` writes the verification key that bare `zft verify`
consumes.

```bash
# Scaffold a new DRAFT clause node (seeds .zft/specs/)
zft create --alias EXPORT-413 --domain protocol \
  --title "Export size limit" \
  --statement "The export endpoint rejects payloads > 10 MB with 413" \
  --property "size > 10MB -> status == 413" --kind test

# Bind it: add the comment above a test that exercises the clause
#   # @trace("EXPORT-413")

# L0: lint every clause node in .zft/specs/ (schema, hashes, duplicates)
zft lint [root]

# Fast verification stage: L0 + L2-fast + Gherkin fallback, JSON report
zft check [root]

# L2 merge gate: sandboxed mutation-testing campaign over a module + its tests.
# The module must be importable the way the tests import it — a src-layout
# package needs src/exports/__init__.py with tests doing
# `from exports.exporter import …`. A module that exists only as a file path
# red-baselines the sandbox; the verdict then carries "baseline_ok": false
# and a hint on stderr (the kill counts behind it are not trustworthy).
zft gate --module src/exports/exporter.py --tests tests/test_exporter.py \
  [--scope f1,f2] [--oracle path/to/oracle.py] [--conftest path/to/conftest.py] \
  [--sandbox .zft/sandbox] [--resume] [root]

# L3: produce a DSSE attestation over the clause subjects
zft attest [root]
# Verify the attestation against the live store (re-derives clause digests).
# --key-in is required: zft attest writes the matching public key to
# .zft/attest-key.pub.json (override with --key-out at attest time).
zft verify --key-in .zft/attest-key.pub.json [root]

# Export the attestation / trace matrix (e.g. --format matrix).
# Refuses with a typed error until `zft attest` has produced an attestation.
zft export --format matrix [root]

# Replay a recorded run from .zft/runs by run id
zft repro <run_id> [root]

# Run the contract negotiation state machine (CFP -> counter -> accept -> validate);
# needs a contract manifest under .zft/contracts/
zft negotiate [root]

# Lineage: mechanically extract element -> clause bindings (JSON)
zft extract [root]
# Impact query: which clauses are affected by changed path[:symbol]
# (bindings resolve on traced test symbols)
zft impact tests/test_exporter.py:test_oversize_payload_rejected_413

# Pre/post subagent task gates — the description must reference an existing
# contract under .zft/contracts/ (a bare alias is refused)
zft task-gate before --subagent producer --description "[contract: release-1] implement export endpoint"
zft task-gate after  --subagent producer --description "[contract: release-1] implement export endpoint"

# One gate, another project: [root: PATH] re-points contract resolution,
# changeset diff, binding extraction and the audit log at that project's
# .zft/ store. A relative PATH resolves against the CWD; without the marker
# the CWD is the root, exactly as before.
zft task-gate before --subagent producer \
  --description "[root: ../other-project] [contract: release-1] implement export endpoint"
```

The `[root: PATH]` marker is what makes a single installed gate usable from a
harness whose working directory is not the governed project; it is additive —
omitting it leaves single-project dispatch byte-for-byte unchanged.

## Harness integration

ZFT ships thin per-harness integrations that enforce the two boundaries where
contracts are decided — when work is **dispatched** to a subagent, and when
the contract store itself is **edited**. All of them are silent in any
project without a `.zft/` store.

### Prerequisites (every harness)

1. **Python 3.12+** and the CLI: `pip install zft` (stable, on PyPI).
2. **A resolvable `zft` executable**, checked per harness in this order:
   `ZFT_BIN` env var (authoritative; a bad override fails loudly) →
   `<project>/.venv/bin/zft` → `zft` on `PATH` or `~/.local/bin` (where
   `uv tool install` / `pipx` / `pip install --user` land) →
   `python3 -m zft.cli.main`. A candidate that cannot start is skipped,
   never green.
3. **A seeded contract store** (`zft create`, then a contract manifest under
   `.zft/contracts/`). This is fail-closed by design
   (`CON-VALIDATED-OR-NO-START`): no store means nothing is enforced and
   `zft lint` says so in a typed rejection — a gate that silently passes on
   a missing store would be green-vacuous.
4. **Git** in the project, for changeset-scoped after-verdicts; without it
   the verdict degrades to tree-wide (never blocks, never fabricates scope).

**Subagents — what is actually required.** The *dispatch* boundary (opencode
only, today) fires on subagent dispatches: enforcement means implementation
work reaches writers through the harness's `task` tool with a
`[contract: <name>]` marker in the description. **No custom subagent
configuration is required** — lanes resolve by name with shipped defaults
(a fixed read-only list; every other type is a writer), and where the host
can resolve an agent's permissions, capability wins over the name.

The **desired end state is harness-agnostic: every writer works under a
recorded contract binding** (or an explicit, audited `[ungated: reason]`) —
a subagent dispatch is one binding path, never the only one. opencode is
there first: since the session-binding gate, a main-session edit on a
deliverable path is itself blocked until the session binds (`zft task-gate
before --subagent main --description "[contract: <name>] ..."` or an
explicit `[ungated: ...]`), so main-session-only work can no longer slip the
dispatch boundary. zcode and Codex still enforce edit-time (+ zcode Stop
gate) only; their dispatch-boundary paths need host-contract pinning
(zcode PreToolUse on the agent-spawn tool; Codex exposes PostToolUse only —
a documented ceiling, see `plugins/codex/README.md`).

### The five integrations

| Harness | Artifact | Dispatch boundary | Edit boundary | Completion boundary | Doc |
| --- | --- | --- | --- | --- | --- |
| **opencode** | npm `opencode-zft` (or copy `zft-gate.ts` + `zft-lint-gate.js`) | ✅ `task` tool wrapped: writer dispatches need `[contract: <name>]`, blocks before spawn, coverage verdict after; **main-session binding gate**: a deliverable edit before any recorded binding is blocked until the session binds (`zft task-gate before --subagent main ...`) | ✅ `zft lint` on every `.zft/**` edit (observe/enforce) | coverage verdict surfaced to the orchestrator | [`.opencode/plugins/README.md`](.opencode/plugins/README.md) |
| **zcode** | `plugins/zft-gates` (marketplace `dev-zft-gates`) or workspace `.zcode/config.json` | — (workflow carried by the skill) | ✅ PostToolUse L0 on `.zft/**` edits (observe/enforce) | ✅ Stop gate: `zft check` before *any* session may stop, subagent or main | [`plugins/zft-gates/README.md`](plugins/zft-gates/README.md) |
| **Codex** | `plugins/codex` (skill + PostToolUse hook) | — (workflow carried by the skill) | ✅ PostToolUse L0 on `.zft/**` edits (observe/enforce) | — | [`plugins/codex/README.md`](plugins/codex/README.md) |
| **pi** | `packages/pi-zft` (extension: L0 edit gate + settle gate) | — (workflow carried by the skill) | ✅ `zft lint` on every `.zft/**` edit (observe/enforce) | ✅ settle gate: `zft check` at turn end, demand loop capped (default 3) | [`packages/pi-zft`](packages/pi-zft) (this README below) |
| **pre-commit** | `.pre-commit-hooks.yaml` (`zft-lint`, `zft-check`) | — | ✅ at commit time (`zft-lint`) and pre-push (`zft-check`: L0 + L2-fast + gherkin) | — | [`.pre-commit-hooks.yaml`](.pre-commit-hooks.yaml) |

Every decision is one JSONL line in `<root>/.zft/audit.log` (dispatches) and
`<root>/.zft/gates-hook/log.jsonl` (edits) — the evidence layer; never delete
by hand.
**Gate-core architecture (the JS adapters).** The opencode and pi JS
adapters are thin protocol shims over one pure, zero-dependency policy
unit: `packages/zft-gate-core` (`findStoreRoot` / `inCorpus` / `parsePatchPaths`
/ `corpusPathsFor` / `resolveGate` / `runGate` / `appendLog`, plus the
`gateUnavailableRecord()` superset factory). Both adapters import it
**relative** (`./core/gate-core.js`, a synced byte copy — no bare
specifiers, no node_modules, no symlinks). `scripts/sync-zft-gates.mjs`
owns the arrow: the **package dirs are canonical**; `.opencode/plugins/`
and the packages' `core/` copies are deployed artifacts (the script runs
as `pretest` and, in copy+assert mode, as `prepublishOnly`). One schema
across every writer (opencode, pi, codex, zcode): every gate-decision
record carries `blocked` (true iff the event was blocked); `blocked` is
absent only from meta-records (`passthrough`, `unclassified`,
`outside_root`). Cross-adapter drift is caught by
`packages/zft-gate-core/test/parity.test.ts`, which fires identical
events through both adapters and diffs the records. Caveat: pi loads
extensions from user scope (`~/.pi/agent/extensions/`) or project scope
(`<root>/.pi/extensions/`); the project scope is trust-gated — a
fresh project silently no-ops until the extension is trusted (`-a` / trust
grant), while the user scope is unaffected.


**opencode** quick start:

```bash
pip install zft                                              # Python 3.12+

# Install the gates — either from npm (versioned, auto-installed by opencode):
bun add -D opencode-zft
#   then add it to opencode.json:   { "plugin": ["opencode-zft"] }

# …or copy the sources from this repo (global scope shown):
mkdir -p ~/.config/opencode/plugins
cp .opencode/plugins/zft-gate.ts .opencode/plugins/zft-lint-gate.js \
   ~/.config/opencode/plugins/
mkdir -p ~/.config/opencode/skills/zft                       # the workflow skill
cp .opencode/skills/zft/SKILL.md ~/.config/opencode/skills/zft/SKILL.md
# restart opencode, then scaffold a clause + contract (see .opencode/plugins/README.md)
```

**pi** quick start (the `pi-zft` extension — L0 edit gate + settle gate):

```bash
pip install zft                                              # Python 3.12+

# Copy the extension into pi's extensions dir (global scope shown):
mkdir -p ~/.pi/agent/extensions
cp -r packages/pi-zft ~/.pi/agent/extensions/pi-zft
# the extension imports the pi runtime types only; it needs no build step.

# The zft workflow skill (Agent Skills spec — same SKILL.md zcode uses):
mkdir -p ~/.agents/skills/zft-gates
#   copy the skill from the zcode package:  plugins/zft-gates/skills/zft-gates/SKILL.md

# restart pi; the gates are silent outside any .zft/ store.
```

Modes and knobs (same as the opencode port):

- `ZFT_HOOK_MODE` — `observe` (default: record + report, never block) or
  `enforce` (an L0 failure or a broken gate becomes an error result the
  model must see).
- `ZFT_BIN` — authoritative gate binary override.
- `ZFT_SETTLE_CAP` — consecutive `zft check` failures before the settle
  gate gives up (default 3). The demand text always cites the
  `.zft/runs/<id>` run and tells the model to stop or fix.
- Every gate decision is one JSONL line in `<root>/.zft/gates-hook/log.jsonl`.

**zcode**: install *ZFT Gates* from the `dev-zft-gates` marketplace
(this repo's `plugins/` directory is the marketplace root), or wire the

workspace hooks by hand — both documented in
[`plugins/zft-gates/README.md`](plugins/zft-gates/README.md). **Codex**: a
symlink for the skill plus one hook table, in
[`plugins/codex/README.md`](plugins/codex/README.md). **pre-commit**: add
this repo with `rev: v0.2.1` and pick `zft-lint` / `zft-check` — see the
usage header in [`.pre-commit-hooks.yaml`](.pre-commit-hooks.yaml).

```
.zft/
  specs/          # Clause nodes, one JSON file per domain/<alias>.json.
                  # UUIDv7 node identity + SHA-256 content integrity hash.
  contracts/      # Contract versions binding clause sets to milestones.
  runs/           # Run ledgers (selective force-add as evidence).
  cache/          # Verdict + extraction caches.
  gherkin/        # Rendered clause scenarios.
  sandbox*/       # Ephemeral gate sandboxes (local only, never committed).
designs/          # Architecture decision records and implementation plans.
```

The seed contract — 45 validated clause nodes as of this release (`zft lint`
reports the current count) — lives in [`.zft/specs/`](.zft/specs/) and is the
working self-hosted example for every gate tier above.

## Design

New here? [`docs/CONCEPTS.md`](docs/CONCEPTS.md) is the one-page mental
model — contract, clause, binding, gates, ledger — with a worked example.

Full architecture, decision records (D1–D6), and the verification pipeline
specification live in [`designs/ARCHITECTURE.md`](designs/ARCHITECTURE.md).
Release notes are in [`CHANGELOG.md`](CHANGELOG.md); the framework landscape
research is under [`docs/research/`](docs/research) and the positioning
analysis in [`docs/POSITIONING.md`](docs/POSITIONING.md).

## Roadmap

One line, no promises: the gates are becoming the trust layer between agents
— the signed acceptance payload of one handoff is the contract of the next.

## License

Apache-2.0 — see [LICENSE](LICENSE).

## Publishing

Version table (house convention: the npm packages stay version-aligned
with the Python CLI, pinned by `tests/unit/test_package.py`):

| Artifact | Registry | Version | Publish command |
| --- | --- | --- | --- |
| `zft` (Python) | PyPI | 0.4.1 | `python -m build && twine upload dist/*` |
| `opencode-zft` | npm | 0.4.1 | `cd packages/opencode-zft && npm stage publish` → `npm stage approve <id>` |
| `pi-zft` | npm | 0.4.1 | `cd packages/pi-zft && npm stage publish` → `npm stage approve <id>` |
| flockwork harness | PyPI | 0.4.0 | separate repository |

Publishing flow (JS adapters):

1. Change the canonical package
   (`packages/opencode-zft/` or `packages/pi-zft/`).
2. `node scripts/sync-zft-gates.mjs` — deploys the package to
   `.opencode/plugins/` and the packages' `core/` byte copies; commit the
   deploy alongside.
3. Bump the version in the package's `package.json` and record it in
   `CHANGELOG.md` (this table too).
4. `npm stage publish` from the package directory (requires npm ≥ 12 and a
   staging token) — `prepublishOnly` re-runs the sync in copy+assert mode,
   so a stale deploy or a stale `core/` copy fails the publish rather than
   shipping. Then `npm stage approve <stage-id>`; the registry asks for a
   one-time browser password, which only an interactive terminal can
   provide.

Install (consumers): `npm i -g opencode-zft` wires the opencode plugin;
`pi-zft` installs by copying the package into
`~/.pi/agent/extensions/pi-zft/` (user scope — the project scope is
trust-gated in pi). The gate behavior itself is identical across
adapters; see [`.opencode/plugins/README.md`](.opencode/plugins/README.md)
for the record schema and
[`packages/zft-gate-core/README.md`](packages/zft-gate-core/README.md)
for the policy unit.
