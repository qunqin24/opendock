# HR: Agent Seat Matching and Capability Benchmarking

Unified harness that matches autonomous LLM coding agents to task-appropriate seats, runs capability benchmarks across model fleets, and emits deployment verdicts. One Python engine on PyPI (`aihr`), two OpenCode plugins on npm, one database schema, and 23 CLI commands.

The English version is canonical. The Chinese version (`README.zh-CN.md`) is a faithful mirror. When the two diverge, the English text governs.

## What HR Decides

HR is a decision-support plugin for assigning configured models to autonomous-agent seats. It does not claim that a model is universally "best". Its output is a bounded recommendation for a named seat or task, backed by a versioned item pool, the recorded model responses, health gates, and the policy in `configs/`.

The decision pipeline is:

1. `hr discover` derives the candidate fleet from the live OpenCode configuration.
2. `hr seed` registers seats, batteries, and item metadata in PostgreSQL.
3. `hr calibrate` validates anchor-model difficulty bands against the item pool.
4. `hr bench` or the Stage 0/Stage 1 sweep records scored measurements.
5. `hr health`, `hr verdict`, and `hr recommend` apply capability, reliability, and seat gates.
6. `hr apply` exports the accepted seat assignment to a FastDraw preset; it never changes a model assignment by itself unless explicitly requested.

## Decision Statuses

Scores alone are not a safe decision contract. HR distinguishes these states:

| Status | Meaning | Allowed to rank or assign? |
|--------|---------|----------------------------|
| `pass` | All required items were measured and the configured rule passed. | Yes, subject to seat gates. |
| `fail` | All required items were measured and the configured rule failed. | No for that rule. |
| `inconclusive` | Samples are incomplete or an adapter/infrastructure failure occurred. | No; rerun or resume safely. |
| `invalid` | The configured item pool cannot support the requested rule. | No; repair the pool/configuration. |
| `not_applicable` | The model cannot perform the requested modality or tool protocol. | No for that capability; never coerce it to a zero-score capability failure. |

Calibration currently emits `pass`, `fail`, `inconclusive`, and `invalid`. Live benchmark and recommendation paths retain infrastructure incidents in the database and are being migrated to the same complete outcome contract. A token cap, a partial round, or a resumed run with missing measurements is evidence of uncertainty, not evidence that the model failed the task.

## Methodology

### Item pools and grading

`itemrepo/` is versioned test material. Every item has an item key, type, tier, payload, and grading specification. Batteries group items by capability, for example reasoning, factuality/hallucination, vision, `tool_a`, and `tool_b`. Graders are deterministic where possible: exact-match, schema, constraint, citation, and sandboxed unit-test graders. LLM judging is kept explicit because it introduces a second model and a second source of uncertainty.

Calibration uses anchor models and tier acceptance bands. Its purpose is not to select a production model. It detects a broken, missing, or difficulty-shifted item pool before that pool is used to decide seat assignments. A complete tier is required before a band can pass; malformed or missing evidence must not produce a vacuous pass.

### Repeated measurement and separation

Stage 0 cheaply narrows the fleet. Stage 1 evaluates finalists against the full item banks. Each measurement is indexed by model, battery, round, item, and repetition so that repeated calls can be audited and resumed. Pairwise separation compares matched model/item observations; the item is the primary independent unit, and repetitions estimate gateway and generation variability.

Do not interpret a small point-score difference as a seat decision. A candidate should only displace another candidate when the relevant items are complete, the confidence/separation rule is met, and both candidates pass the seat's hard gates. The current implementation records pairwise bootstrap separation and sequential precision diagnostics. Planned hardening is documented in `docs/en/capability-prior.md`: per-model stopping, complete paired-round enforcement, and multiplicity-aware comparisons.

### Health, constraints, and recommendation

Health is independent evidence, not a cosmetic penalty. It includes answer completion, self-consistency, tool reliability, and observed failures. A seat can impose required capabilities, context limits, and a health gate. A model without a required modality or one with insufficient evidence must be unassigned or reported as indeterminate rather than promoted by a fallback average.

Cost, latency, freshness, and uncertainty are part of the recommendation problem. `configs/models.yaml` supplies known price/capability facts; measurements supply observed behavior. Reference scores in `configs/knowledge.yaml` are priors, never replacements for a missing required live capability measurement.

### Reproducibility and audit trail

The database stores sweeps, runs, measurements, infra incidents, separations, and calibration events. Preserve the item-pool hash, configuration revision, endpoint/model identity, timeout/retry policy, grader version, and random seed with every externally shared conclusion. Reports without that provenance are operational hints, not reproducible experiments.

## Safety Rules

- The default `bash scripts/test.sh` and `--ci` modes explicitly remove inherited database credentials. They cannot silently use an ambient production DSN.
- `bash scripts/test.sh --with-db` accepts only an `hr_test_*` scratch database. It rejects names such as `wiki`.
- Generated artifacts resolve outside the repository by default. Tests seal `HOME`, OpenCode config, HR config, item repository, and output paths into temporary directories.
- A test session compares `git status --porcelain` before and after execution. Unexpected writes in the repository fail the suite.
- Production provider credentials belong in environment variables or local overlays, never in tracked YAML, `hr.toml`, test fixtures, or reports.

## Install

The engine ships on PyPI as **`aihr`** (import package `hr`, console script `hr`); the OpenCode plugins ship on npm:

```bash
# Python engine (add [vision] only if you need the vision item generators)
pip install "aihr[vision]"

# OpenCode plugins — both in one command
npm install -g opencode-hr-agent opencode-fastdraw
```

`opencode-fastdraw` is a standalone model/role-switching plugin and can be installed on its own. `opencode-hr-agent` bridges the OpenCode tool surface to the `hr` CLI, so it requires the Python engine above. Wheel artifacts are also attached to each [GitHub Release](https://github.com/TachikomaGundam/AIHR/releases).

Installing from this repository (source/editable) works identically:

```bash
pip install .
```

Source, editable, and wheel installs are supported. Packaged configuration resolves from the installation's `share/aihr` directory. Executable-code benchmarks fail closed unless Bubblewrap (`bwrap`) is installed; on Debian/Ubuntu use `sudo apt-get install bubblewrap`. If an older `hr-cli` or `hr-bench` package is already installed, remove it first:

```bash
pip uninstall hr-cli hr-bench -y
pip install .
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `HR_DSN` | Override the PostgreSQL connection string (preferred over `HR_DB_PASSWORD` + `db_*` fields) | unset |
| `HR_HOME` | Force an alternate config root (configs/, `hr.toml`, `itemrepo` are resolved from here) | repo root |
| `HR_COMPOSE_FILE` | Override the `docker compose` manifest that DB password resolution probes | unset |
| `HR_ITEMREPO` | Override the benchmark item repo directory | `HR_HOME/itemrepo` |
| `HR_OUTPUT_DIR` | Override the runtime output root for run artifacts | platform cache dir (see below) |

### Output root (run artifacts)

Generated artifacts (bench exports, calibration reports, sweep dumps, …) NEVER land inside the repo tree. They resolve through `hr.config.output_root()`: `HR_OUTPUT_DIR` env var wins, otherwise the platform cache dir (`$XDG_CACHE_HOME/hr`, `~/Library/Caches/hr`, `%LOCALAPPDATA%/hr\Cache`), otherwise the system temp dir. CLI flags that name an explicit output path always win at the call site.

### Configuration

Copy the example `hr.toml` if you need the DB / Wiki.js knobs:

```bash
cp configs/hr.toml.example hr.toml
```

There is no single "source of truth" file — configuration is split by concern across `configs/`, plus the runtime opencode config:

### Local overlays (`configs/*.local.yaml`)

The tracked configs ship ZERO real deployment values (placeholder examples
where a value is machine-specific). A live machine's real values live in the
gitignored local overlays — `configs/seats.local.yaml`, `configs/fleet.local.yaml`,
`configs/deployable.local.yaml`, `configs/models.local.yaml` — which
`hr.config.load_yaml` deep-merges over the tracked files automatically:
**local wins per key; dicts merge recursively; lists are replaced, never
merged.** A missing overlay is normal (the tracked file is used as-is).

First-install: `cp configs/seats.yaml configs/seats.local.yaml`,
`cp configs/fleet.yaml configs/fleet.local.yaml`,
`cp configs/deployable.yaml configs/deployable.local.yaml` (and
`configs/models.yaml` → `models.local.yaml` if your gateway facts differ),
then fill in your real anchors, wire overrides, gateway URLs and
`extra_deployable` list. Never edit deployment values into the tracked
files — *any* `.local.yaml` is safe for real values, *nothing else* is.

The per-file split:

- `configs/thresholds.yaml` — numeric sweep and gate thresholds (stage0 budgets, half-widths, acceptance bands).
- `configs/models.yaml` — model pricing and the capability overlay (thinking/vision), keyed by bare model slug; unknown models get safe defaults.
- `configs/knowledge.yaml` — curated reference scores and qualitative research findings, keyed by bare model slug (unknown models are skipped).
- `configs/fleet.yaml` — OPTIONAL overrides for the dynamic fleet: `wire_overrides`, `scope_excludes`, and `gateway_urls` (base URLs for registry-only providers).
- `configs/seats.yaml` — seat definitions, per-seat `primary_capabilities`, and the stage-0 `calibration_anchors`.
- `configs/deployable.yaml` — `extra_deployable`: models served outside the opencode config (the only hand-maintained model list).
- `configs/hr.toml.example` — template for the root `hr.toml` (DB connection + optional Wiki.js publish target). Secrets are NEVER stored here: they come from the environment (`HR_DSN`, `HR_DB_PASSWORD`, provider keys).

The model fleet itself is not declared in this repo: it is derived at runtime from the opencode config (`opencode.jsonc` provider blocks) and merged with the `deployable.yaml` extras — see Universality below.

### Quick start

```bash
cp configs/hr.toml.example hr.toml   # point the DB knobs at your PostgreSQL
hr seed                              # create/upgrade the schema + canonical seats
hr status                            # sweeps + latest-sweep capability means
```

Live benchmarks (`hr bench`, `hr discover`) additionally read provider credentials from your OpenCode config / environment; everything else runs DB-only.

## CLI Map

Twenty-three commands, each targeting a specific concern: 13 core commands, 4 `apply-*` transactional-preset commands, and 6 `release-*` lifecycle commands. Legacy v1 commands (`evaluate`, `report`, `run_all`) were retired. `hr verdict` supersedes the retired evaluation path.

| Command | Purpose |
|---------|---------|
| `hr discover` | Enumerate providers/models from `opencode.jsonc` into `hr` (scope + auth presence) |
| `hr seed` | Initialize the schema and seed canonical seat definitions |
| `hr bench` | Run the live capability benchmarks and record `hr.measurement` rows |
| `hr verdict` | Comprehensive verdict: capability averages + health + gates + assignment |
| `hr health` | Full-pool behavioral-health markdown table (DB-only, zero API calls) |
| `hr sweeps` | List sweeps from the DB with run/model/measurement counts |
| `hr calibrate` | Stage-0 anchor calibration engine (dry-run planning + live API passes) |
| `hr reference` | Read curated published-benchmark scores from `configs/knowledge.yaml` |
| `hr research` | Read qualitative findings from the same knowledge store |
| `hr publish` | Publish reports to Wiki.js (optional target; skips with exit 0 when unconfigured) |
| `hr recommend` | Seat recommendations from `configs/seats.yaml` + recent measurements |
| `hr status` | DB status: sweeps + latest-sweep capability means (DB-only) |
| `hr apply` | Bridge the latest verdict seating into a FastDraw preset |
| `hr apply-preview` | Preview an apply transaction (exact file changes, preview record id) |
| `hr apply-rollback` | Roll back an apply transaction from its backup manifest |
| `hr apply-backups` | List retained apply backups (bounded: 10 / 30 days) |
| `hr apply-prune` | Enforce the apply-backup retention bounds |
| `hr release-build` | Build a release candidate (full runtime closure, per-payload SHA-256) |
| `hr release-verify` | Re-hash every payload; a failed verify removes the candidate |
| `hr release-activate` | Atomically activate a verified release (backup-first, idempotent) |
| `hr release-rollback` | Roll back to the pre-activation symlink + config state |
| `hr release-list` | List releases, newest first |
| `hr release-prune` | Enforce bounded release retention (newest-valid + active preserved) |

The CLI has no global `--config` flag: configuration is resolved from the environment (see the table above) and from `configs/` relative to HR_HOME. Run `hr --help` and `hr <command> --help` for the full per-command flag list.

## FastDraw Seam

FastDraw is the model-selection subpackage bundled at `fastdraw/`. It provides TUI-based preset management for agent model assignments and integrates with opencode through `hr apply`.

### Subpackage Layout

```
fastdraw/
  server.ts     # FastDraw HTTP server (preset API)
  tui.ts        # Terminal UI for preset management
  package.json  # npm manifest (standalone install)
  test/         # Test suite
  README.md     # FastDraw-specific documentation
```

### The `hr apply` Contract

`hr apply` is the bridge between verdict seating and FastDraw presets. It works in three steps:

1. Computes the latest per-seat verdict assignments
2. Writes a named preset to `<opencode-config-dir>/fastdraw-presets.json`
3. With `--set-state`, also writes `.fastdraw.json` for boot-time activation

### Dual-File Registration

FastDraw has server and TUI components. Register the plugin in both opencode configuration files; registering only one silently omits the other component.

```jsonc
// ~/.config/opencode/opencode.jsonc
{ "plugin": ["opencode-fastdraw"] }
```

```json
// ~/.config/opencode/tui.json
{ "plugin": ["opencode-fastdraw"] }
```

The first loads the `fastdraw_*` agent tools; the second loads `/fastdraw` and the `<leader>m` key binding.

## Layout

```
harness/hr/               # repo root (pip install -e .)
  configs/                # YAML config: deployable.yaml, fleet.yaml, hr.toml.example, knowledge.yaml, models.yaml, seats.yaml, thresholds.yaml (+ gitignored *.local.yaml overlays)
  docs/                   # bilingual documentation (en/, zh-CN/)
  exports/                # generated artifacts (gitignored)
  fastdraw/               # npm subpackage: FastDraw server, TUI, preset management
  hr/                     # Python package: the CLI and all business logic
    adapters/             # provider adapters (anthropic-compat, openai-compat) + fleet routing
    bench/                # benchmark batteries + stage0/stage1 sweep engines
    graders/              # grading functions (factuality, reasoning, vision, tools)
    items/                # item loaders for benchmark questions
    scheduler/            # task scheduling (kept per Metis C1)
    seats/                # seat taxonomy and profile helpers
    stats/                # statistical aggregation for sweep results
  itemrepo/               # git-versioned benchmark item repository by category
  scripts/                # operational scripts (check_universal.sh, register_livebench_batteries.py, spread_probe.py, ...)
  tests/                  # pytest test suite
  pyproject.toml          # package manifest with CLI entry point
```

## Tests

```bash
bash scripts/test.sh          # hermetic offline suite, coverage >= 80%
bash scripts/test.sh --ci     # lint, type checks, offline tests, wheel build
bash scripts/test.sh --with-db # explicit scratch-PostgreSQL integration suite
```

The test suite is a release gate, not a collection of smoke tests.

| Test area | Purpose |
|-----------|---------|
| `tests/adapters/` | Validate provider endpoint resolution, protocol shaping, capability overlays, and error boundaries without network calls. |
| `tests/items/`, `tests/graders/` | Protect item parsing, content hashes, deterministic scoring, schema constraints, citations, and sandbox contracts. |
| `tests/test_calibrate*` | Protect anchor calibration, complete-tier checks, resume accounting, persistence, token caps, and `inconclusive`/`invalid` reporting. |
| `tests/test_stage0*`, `tests/test_stage1*`, `tests/test_bootstrap.py`, `tests/test_sequential.py` | Protect sweep planning, paired-score handling, resume keys, stopping rules, and finalist selection. |
| `tests/bench/` | Validate offline benchmark runners, request construction, scorer behavior, storage shape, and explicitly gated PostgreSQL end-to-end flows. |
| `tests/test_apply*`, `tests/test_cli*`, `tests/test_release_surface.py` | Protect user-facing CLI contracts, FastDraw export behavior, output locations, and package release surface. |
| `fastdraw/test/` | Validate OpenCode preset persistence, restore plans, comment-preserving config edits, TUI/server split behavior, and portable path handling. |

All offline tests run against hermetic fixtures and a per-test staging workspace: `HOME`, `OPENCODE_CONFIG_DIR`, `HR_HOME`, `HR_ITEMREPO`, and `HR_OUTPUT_DIR` are sealed into pytest temporary directories by `hr_sandbox` (`tests/conftest.py`). The session-level cleanliness guard snapshots `git status --porcelain` at session start and fails with the offending paths if a test writes into the repository. DB-marked tests require an explicit scratch database and are skipped by offline modes.

The quality gates are:

- `compileall`: import/syntax coverage for package, scripts, item builders, and tests.
- `ruff check hr scripts itemrepo`: undefined-name and fatal static checks.
- `basedpyright --level error hr scripts`: typed production-path validation.
- `pytest --cov=hr --cov-fail-under=80`: branch-aware package coverage floor.
- `scripts/check_universal.sh`: rejects machine-specific paths, prohibited model literals, and unsafe provider assumptions.
- `pip wheel --no-deps`: verifies the published package can be built.

Live API bench runs need real provider credentials from the opencode config:

```bash
hr bench --model gpt-4o --battery reasoning
```

## Universality

This codebase targets the general class of autonomous LLM coding agents, not a specific product. The seat taxonomy (tier 1 through tier 4), the benchmark item categories (factuality, reasoning, vision, tool_a, tool_b), and the verdict pipeline (discover, bench, assign, verdict) apply to any agent that consumes LLM output and produces code artifacts.

Provider-specific hardcoding was removed during unification. The model fleet is derived at RUNTIME from opencode's live config (`opencode.jsonc` provider blocks: every `provider.*.models` entry becomes a fleet model, and the `npm` field derives the wire type); `configs/fleet.yaml` holds only OPTIONAL overrides (`wire_overrides` for registry-only providers, `scope_excludes`, `gateway_urls`), and `configs/deployable.yaml` `extra_deployable` is the only hand-maintained model list (models served outside the opencode config). Add a model to opencode's config and it flows into the sweep pools, discover and routing with zero file edits here. Knowledge data lives in `configs/models.yaml` (pricing/capabilities) and `configs/knowledge.yaml` (reference scores, findings), both with safe defaults for unknown models.

## License

See `LICENSE`.
