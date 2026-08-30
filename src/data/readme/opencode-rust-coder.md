# opencode-rust-coder

[![npm version](https://img.shields.io/npm/v/opencode-rust-coder.svg)](https://www.npmjs.com/package/opencode-rust-coder)
[![GitHub release](https://img.shields.io/github/v/release/ugur-murat-alt/opencode-rust-coder)](https://github.com/ugur-murat-alt/opencode-rust-coder/releases/latest)
[![CI](https://github.com/ugur-murat-alt/opencode-rust-coder/actions/workflows/ci.yml/badge.svg)](https://github.com/ugur-murat-alt/opencode-rust-coder/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/ugur-murat-alt/opencode-rust-coder)](LICENSE)

[Türkçe](README.tr.md) | English

An OpenCode V2 plugin that helps coding agents produce correct, idiomatic Rust.
It structures Cargo diagnostics, adds rust-analyzer navigation, produces
write-free rename/refactor plans, verifies crates, and reads version-pinned Rust
API documentation.

## Documentation Map

| Start here | Contents |
|---|---|
| [Tool and Configuration Reference](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/tools.en.md) | Every `rust.*` input, output bound, visibility rule, write behavior, automatic feature, option default/range, and troubleshooting path |
| [Benchmark Reference](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/benchmark.en.md) | Controlled A/B preflight, fixtures, scoring, cache/workspace isolation, metrics, artifacts, measured results, cost limits, and deterministic validation |
| [Architecture](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/architecture.en.md) | Plugin hooks, Rust engagement, two-clock gate, LSP lifecycle, identity, scheduling, and build acceleration |
| [Rust Guidance Research](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/rust-research.en.md) | Evidence behind ownership, dependency, async, and acceleration decisions |
| [Validation Implementation Plan](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/validation-implementation-plan.en.md) | Validation invariants, rollout stages, and acceptance design |

Use this README for installation and the supported surface. Use the references
above for exact contracts and evidence boundaries.

## Current Release

The latest stable release is **0.3.0**.

| Surface | Verified release |
|---|---|
| npm | [`opencode-rust-coder@0.3.0`](https://www.npmjs.com/package/opencode-rust-coder/v/0.3.0) |
| GitHub | [`v0.3.0`](https://github.com/ugur-murat-alt/opencode-rust-coder/releases/tag/v0.3.0) |

Release `0.3.0` adds evidence-efficient validation orchestration: schedule-only
passive automation, centralized evidence and workspace preflight, complete-or-
inconclusive input identity, compact rustc diagnostics with verified write-free
suggestions, source-first documentation lookup, bounded privacy retention, and
free bilingual cold/warm ablation evidence. Affected-scope execution remains in
`shadow` mode and runtime impact-capsule injection remains disabled until stronger
evidence exists.

## Highlights

- Structured `cargo check`, test, Clippy, and format feedback.
- A two-clock validation gate: bounded `FAST_PASS` feedback and authoritative
  `FULL_PASS` only after format, Clippy, all targets, and applicable doctests.
- Crates.io verification and common Rust mistake detection.
- Rust Analyzer hover, symbols, references, definitions, implementations, and
  call hierarchy.
- Rename and refactor suggestions that never write to the workspace.
- Exact Cargo.lock version resolution with cache, bounded path/git source,
  docs.rs, and explicitly enabled local-rustdoc fallback.
- Complete rustc diagnostic trees plus verified `MachineApplicable`, write-free
  suggestion packages; compact check output is the default.
- Read-only build diagnostics with content-keyed Cargo metadata reuse, Cargo
  unit telemetry, and explicit bounded `timings=true` reports; no linker, cache
  wrapper, compiler backend, or Cargo configuration is auto-enabled.
- Bounded, advisory automation that remains inactive in non-Rust projects.
- Passive validation is schedule-only; prose completion never grants
  `FULL_PASS`, which requires explicit `rust.check target=all` on this host.

## Requirements

- OpenCode V2 with a plugin API compatible with the pinned
  `@opencode-ai/plugin@0.0.0-beta-18050` target.
- A Rust toolchain with Cargo for compiler-backed tools.
- `rust-analyzer` for semantic `rust.*` tools. Resolution order is the explicit
  `rustAnalyzerPath`, `PATH`, then `~/.cargo/bin/rust-analyzer`.
- Bun `1.3.14` for repository development and release checks.

## Install

Install the exact current release globally:

```bash
opencode2 plugin add opencode-rust-coder@0.3.0
opencode2 plugin list
```

`plugin add` updates the global OpenCode V2 configuration. Exact versions stay
pinned. Configuration-directory changes reload automatically; if an existing
server does not reflect the changed package, use `opencode2 service restart` as
a troubleshooting step.

## Configure

To pass options, replace the string entry in
`~/.config/opencode/opencode.jsonc` with the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-rust-coder@0.3.0",
      "options": {
        "autoGate": true,
        "autoCrateCheck": true,
        "autoAudit": true,
        "autoLsp": false,
        "toolInvites": true,
        "maxTokens": 900,
        "gateResponseMs": 30000,
        "gateHostConcurrency": 1,
        "gateCacheMode": "auto",
        "gateScopeMode": "shadow",
        "tools": {
          "check": true,
          "audit": true,
          "crate": true,
          "hints": true,
          "lsp": true,
          "rename": true,
          "refactor": true,
          "docs": true
        }
      }
    }
  ]
}
```

The shown values are the defaults. `autoLsp` is intentionally opt-in. Use
`toolchainPath` or `rustAnalyzerPath` only when normal executable discovery is
not sufficient. See the
[full configuration table](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/tools.en.md#configuration-reference)
for every option, accepted range, nested tool gate, and interaction.

## Use

The plugin does not create or replace an agent. In a Rust workspace it injects
one compact core workflow, exposes `rust.check` by default, and opens audit,
dependency/docs, or semantic tools only when the task text calls for them. The
full `opencode-rust-coder` runtime skill remains registered for explicit use but
is not advertised automatically, avoiding a mandatory skill-read turn on small
fixes.

Useful explicit requests include:

```text
Run rust.check with target "all" before finishing.
Run rust.check once with timings=true when build latency needs diagnosis.
Use rust.crate_lookup before adding the dependency.
Trace callers with rust.hierarchy before changing this function.
Prepare a write-free rust.rename plan for this symbol.
```

## Tools

| Tool | Purpose |
|---|---|
| `rust.check` | Run Cargo check, test, doctest, Clippy, format, or the full gate; compact output is default and optional `timings=true` adds bounded stable Cargo timing diagnostics |
| `rust.audit` | Find common agent-generated Rust pitfalls |
| `rust.crate_lookup` | Verify crate names and published versions |
| `rust.symbol` | Show hover type and documentation |
| `rust.symbols` | List document symbols |
| `rust.references` | Find semantic references |
| `rust.definition` | Open the semantic definition |
| `rust.implementations` | Find trait/type implementations |
| `rust.hierarchy` | Inspect incoming/outgoing calls |
| `rust.rename` | Produce a verified, write-free rename package |
| `rust.refactor` | List code actions without executing commands or edits |
| `rust.docs` | Read version-pinned source/rustdoc/docs.rs content; expensive local generation is explicit |

The [complete tool reference](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/tools.en.md)
documents required and optional inputs, exact Cargo commands, gate status and
authority, result limits, task-based visibility, network behavior, and path
safety for every row.

## Defaults And Safety

- `autoGate`, `autoCrateCheck`, and `autoAudit` are enabled only in detected
  Rust workspaces and are session-limited.
- `autoGate` schedules only a fast check after validation-relevant edits and
  never blocks model dispatch on Cargo, rust-analyzer, network, or terminal work.
- The model-facing tool surface is demand-based: localized tasks see only
  `rust.check`; task cues open the specialized tools.
- Validation returns `FAST_PASS`, `FULL_PASS`, `FAIL`, or a non-authoritative
  state such as `PENDING`, `STALE`, or `RESOURCE_BLOCKED`. A 30-second response
  budget never turns unfinished work into a pass.
- Cargo work is streamed asynchronously, coalesced and serialized per worktree,
  limited by host leases, and rejected when its content identity becomes stale.
- `FULL_PASS` always uses the complete workspace scope and a separate applicable
  doctest command. Affected-package scope remains in shadow mode by default.
- `autoLsp` is disabled by default and has a deadline and per-session quota
  when enabled.
- Rename/refactor tools never modify files or run server-returned commands.
- Workspace and symlink escapes are rejected. Rustdoc cache lives outside the
  workspace.
- Cargo selection isolates linked worktrees, resolves a sole bounded nested
  workspace, rejects ambiguous roots, and reports the selected manifest.
- Build acceleration is observational except for safe metadata reuse: scan or
  symlink uncertainty bypasses the cache; alternative linkers, sccache, and
  Cranelift are reported but never enabled. `FULL_PASS` commands stay unchanged.
- Tool activity records only timing, size, status, outcome, and content-budget
  metadata. It does not record tool input, output, source, errors, or message
  content; raw session IDs are pseudonymized and the log is rotated.
- All injected guidance is advisory. Compiler and test output remain the source
  of truth, and plugin failures remain fail-open.

## Documentation And Support

- [Architecture](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/architecture.en.md)
- [Tool and Configuration Reference](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/tools.en.md)
- [Benchmark Reference](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/benchmark.en.md)
- [Validation Implementation Plan](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/validation-implementation-plan.en.md)
- [Rust Guidance Research](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/rust-research.en.md)
- [Latest GitHub Release](https://github.com/ugur-murat-alt/opencode-rust-coder/releases/latest)
- [Bug reports and feature requests](https://github.com/ugur-murat-alt/opencode-rust-coder/issues/new/choose)
- [Security policy](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/SECURITY.md)
- [Contributing guide](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/CONTRIBUTING.md)
- [Code of conduct](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/CODE_OF_CONDUCT.md)

## Development

```bash
bun install --frozen-lockfile
bun scripts/check-release-docs.ts
bun run typecheck
bun test
bun run build
bun run benchmark:fixtures
bun run benchmark:validation:smoke
bun run benchmark:ablation:smoke
```

The release gate is `bun run typecheck && bun test && bun run build`. `dist/` is
generated and must not be edited manually. The previous full benchmark is
invalid because of a scorer/workspace failure and is not release evidence. The
latest two-fixture controlled A/B is valid but exceeds the documented cost
budget and is not a general rollout claim; a new paid run requires explicit
approval. See the [benchmark evidence limits](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/benchmark.en.md#verified-results-and-limits).
The free ablation smoke exercises sequential feature arms, Turkish mirrors,
cold/warm cohorts, source-state safety, and concurrency, but is explicitly
`measurement-only` rather than a rollout claim.

Maintainers should follow the version and tag consistency checklist in the
[release process](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/CONTRIBUTING.md#maintainer-release-process).

## License

[MIT](LICENSE) © 2026 Uğur Murat Altıntaş
