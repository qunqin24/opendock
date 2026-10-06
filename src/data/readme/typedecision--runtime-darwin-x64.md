# TDM — Typed Decision Model

TDM turns subjective judgment calls — choices, yes/no judgments, ordered scores — into a typed,
auditable API. Instead of free-form "ask the model and hope", callers submit a **typed question**
(one of three primitives: `choice`, `noul`, `score`) with all decision context, and receive a
**typed answer** with a winning label, probability distribution, and confidence.

Current release: **v0.1.2** on npm as `@typedecision/*` (OIDC trusted publishing, automatic
provenance). The shipped agent integration is the [opencode](https://opencode.ai) plugin; other
harnesses and MCP remain fallbacks (see [Roadmap](#roadmap)).

## Install (opencode plugin)

Add the plugin to the `plugins` array in your `opencode.jsonc`:

```jsonc
{
  "plugins": ["@typedecision/opencode-tdm@latest"]
}
```

Set `TYPESAFE_API_KEY` (or `TDM_JEV_API_KEY`) in the environment for real model-backed judgments.
**Without a key** the runtime degrades to a deterministic **mock provider**: the tool and the risk
gate keep working, but the answers are canned, not intelligent — do not rely on mock-provider
verdicts for safety decisions.

## Packages

Published on npm (v0.1.2):

| Package | What it is |
| --- | --- |
| `@typedecision/opencode-tdm` | opencode plugin: `tdm_judge` tool + automatic risk gate |
| `@typedecision/runtime` | napi-rs native runtime umbrella (`NapiClient` in-process) |
| `@typedecision/runtime-{win32-x64-msvc,linux-x64-gnu,linux-arm64-gnu,darwin-x64,darwin-arm64}` | Per-platform binaries (SLSA provenance) |

Internal workspace packages (not published):

| Package | What it is |
| --- | --- |
| `@typedecision/contract` | ts-rs-generated TS types + JSON Schemas (committed source of truth) |
| `@typedecision/client` | `TdmClient` abstraction: `NapiClient`; `RpcClient` placeholder |
| `@typedecision/mcp` | MCP stdio server — built but **unpublished**; fallback for plugin-less hosts |

## What the plugin does

1. **`tdm_judge` tool** — typed judgments mid-session: routing, classification, yes/no verification
   (`noul`, with P(yes)), and ordered scoring. Every answer is typed and probabilistic (confidence +
   the full `(label, probability)` distribution for choice/score), so decisions can feed code logic
   and stay auditable.
2. **Risk gate** — `tool.execute.before` initiates a TDM risk judgment (a score plus `noul`
   questions over `{tool, args}`), enforced at `permission.evaluate` by mutating `effect` to `"ask"`
   when the verdict is dangerous / confidence < `confidenceFloor` (default `0.55`, a plugin option) /
   noul P ≥ 0.8. Read-only tools are allowlisted (no judgment); `tdm_judge` is self-exempt; the gate
   fails open on judge outage.

## Architecture

A **Rust workspace** owns everything shared:

- `backend/tdm-core` — the contract: primitives (`choice`/`noul`/`score`), provider trait, error
  taxonomy, and the ts-rs + schemars exports.
- `backend/tdm-provider-jev` — TypeSafe System One provider; `backend/tdm-provider-mock` —
  deterministic offline provider (the no-key default).
- `backend/tdm-runtime` — the engine: provider registry, layered TOML config, exact-hash SQLite
  cache, classified retry, circuit breaker, WAL audit, and stats.
- `backend/conformance` (`tdm-conformance`) — a 10-case battery every provider must pass.
- `backend/tdmm` — the management CLI (`init`/`call`/`use`/`keys`/`doctor`/`logs`/`stats`/`config`,
  including `cache clear`).
- `backend/tdm-napi` — the napi-rs binding published as `@typedecision/runtime`.

**TypeScript adapters** (`adapters/*`) consume the contract and never touch raw Rust: `tdm-contract`
holds the committed generated types + JSON Schemas, `tdm-client` defines the `TdmClient` abstraction
(`NapiClient`; `RpcClient` placeholder), `tdm-opencode` is the opencode plugin, and `tdm-mcp` is the
MCP stdio server. The two worlds meet exactly once: ts-rs generates TS types from the Rust contract,
and napi-rs provides the native binding.

## Repository layout

```
tdm/
├── backend/                      # Rust workspace (cargo)
│   ├── tdm-core/                 # Contract: primitives, provider trait, errors, ts-rs/schemars exports
│   ├── tdm-runtime/              # Engine: registry, config, exact-hash cache, retry, circuit breaker, WAL audit, stats
│   ├── tdm-provider-jev/         # TypeSafe System One provider
│   ├── tdm-provider-mock/        # Deterministic mock provider (no-key default)
│   ├── conformance/              # tdm-conformance: 10-case provider battery
│   ├── tdmm/                     # Management CLI (init/call/use/keys/doctor/logs/stats/config)
│   └── tdm-napi/                 # napi-rs binding → @typedecision/runtime
├── adapters/                     # TypeScript workspace (pnpm)
│   ├── tdm-contract/             # Generated TS types + JSON Schemas (committed)
│   ├── tdm-client/               # TdmClient: NapiClient | RpcClient placeholder
│   ├── tdm-opencode/             # opencode plugin (@typedecision/opencode-tdm)
│   └── tdm-mcp/                  # MCP stdio server (built, unpublished; fallback only)
└── docs/adr/                     # Architecture decision records
```

## Development

Toolchain: Rust stable (pinned by `rust-toolchain.toml`), Node >= 22.6 (26 in CI), pnpm 12.9.1
(pinned via `packageManager`), Bun for the napi smoke test.

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace    # Rust tests; regenerates TS bindings + JSON Schemas
pnpm install              # links the TS workspace
pnpm -r --if-present typecheck
pnpm -r --if-present test
pnpm exec biome check .   # Lint + format TS adapters
```

The contract lives in Rust: edit `backend/tdm-core` types, run `cargo test` to regenerate
`adapters/tdm-contract/src/generated` + `schema/`, then commit the generated artifacts with the type
change.

## Roadmap

M0–M2 are complete and published (v0.1.2). **M3 — judgment-surface expansion** — is in progress:

- M3.1 title/compaction short-circuit (set `result` to skip auxiliary LLM calls)
- M3.2 dynamic tool panel (`session.context` tools pruning)
- M3.3 model/agent routing (`session.prompt` classification + `session.model.request`)
- M3.4 result triage + retry decisions (`tool.execute.after`, `session.retry`)
- M3.5 shell command governance (`shell.create.before`)

The `pi` and `dsh` plugins are deferred. MCP is **not** a new product line: the opencode plugin is a
strict superset inside opencode, so `tdm-mcp` stays unpublished as the fallback for plugin-less
hosts and must not be co-installed with the plugin.

## Community

- [Contributing](CONTRIBUTING.md) — setup, verification gates, conventions, release process
- [Security](SECURITY.md) — reporting vulnerabilities; key/audit-data handling
- [Code of Conduct](CODE_OF_CONDUCT.md)

## License

Licensed under [Apache-2.0](LICENSE).
