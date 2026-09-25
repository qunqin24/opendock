# ZFT (Zero-Friction Traceability)

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
the `traceagent` import package and the 2026-09-12 note that kept
`traceagent` canonical). Run state lives under `.zft/`; dated logs retain
the old codename.

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

## Install

```bash
pip install zft
```

Requires Python 3.12+ (the `zft` console script is the only entry point).

## Quickstart

All commands take an optional trailing `[root]` (defaults to the current
directory) and exit non-zero on gate failure.

```bash
# L0: lint every clause node in .zft/specs/ (schema, hashes, duplicates)
zft lint [root]

# Scaffold a new DRAFT clause node
zft create --alias EXPORT-413 --domain protocol \
  --title "Export size limit" \
  --statement "The export endpoint rejects payloads > 10 MB with 413" \
  --property "size > 10MB -> status == 413" --kind test

# Fast verification stage: L0 + L2-fast + Gherkin fallback, JSON report
zft check [root]

# L2 merge gate: sandboxed mutation-testing campaign over a module + its tests
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

# Run the contract negotiation state machine (CFP -> counter -> accept -> validate)
zft negotiate [root]

# Lineage: mechanically extract element -> clause bindings (JSON)
zft extract [root]
# Impact query: which clauses are affected by changed path[:symbol]
zft impact src/exports/exporter.py:handle_export

# Pre/post subagent task gates
zft task-gate before --subagent producer --description "implement export endpoint"
zft task-gate after  --subagent producer --description "implement export endpoint"
```

## Editor integration

ZFT ships thin editor plugins that enforce the two boundaries where contracts
are decided — when work is **dispatched** to a subagent, and when the contract
store itself is **edited**. They are silent in any project without a `.zft/`
store.

**opencode** (`.opencode/plugins/`): the dispatch gate wraps the built-in
`task` tool and blocks writer dispatches that are not bound to a contract
(`[contract: <name>]` in the description); the lint gate re-runs `zft lint`
on every `.zft/**` edit. Every decision lands in `.zft/audit.log` and
`.zft/gates-hook/log.jsonl`.

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

A **Codex** equivalent (PostToolUse hook + agent skill) binds the same CLI
seams, so policy and audit trails stay identical across clients.

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

The seed contract — 43 validated clause nodes as of this release (`zft lint`
reports the current count) — lives in [`.zft/specs/`](.zft/specs/) and is the
working self-hosted example for every gate tier above.

## Design

Full architecture, decision records (D1–D6), and the verification pipeline
specification live in [`designs/ARCHITECTURE.md`](designs/ARCHITECTURE.md).
Release notes are in [`CHANGELOG.md`](CHANGELOG.md); the framework landscape
research is under [`docs/research/`](docs/research) and the positioning
analysis in [`docs/POSITIONING.md`](docs/POSITIONING.md).

## License

Apache-2.0 — see [LICENSE](LICENSE).
