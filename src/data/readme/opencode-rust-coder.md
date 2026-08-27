# opencode-rust-coder

[Türkçe](README.tr.md) | English

An OpenCode V2 plugin that helps coding agents produce correct, idiomatic Rust.
It turns Cargo diagnostics into focused guidance, adds rust-analyzer navigation,
produces write-free rename/refactor plans, and retrieves version-pinned Rust API
documentation.

## Highlights

- Structured `cargo check`, test, Clippy, and format feedback.
- Crates.io verification and common Rust mistake detection.
- Rust Analyzer hover, symbols, references, definitions, implementations, and
  call hierarchy.
- Rename and refactor suggestions that never write to the workspace.
- Exact Cargo.lock version resolution with local rustdoc/docs.rs fallback.
- Bounded, advisory automation that remains inactive in non-Rust projects.

## Requirements

- OpenCode V2 `v0.0.0-beta-18050` or a compatible release.
- A Rust toolchain with Cargo for compiler-backed tools.
- `rust-analyzer` for `rust.*` semantic tools. Resolution order is the explicit
  `rustAnalyzerPath`, `PATH`, then `~/.cargo/bin/rust-analyzer`.

## Install

```bash
opencode2 plugin add opencode-rust-coder@0.2.2
opencode2 plugin list
```

The plugin is added to the global OpenCode V2 configuration. Restart the shared
OpenCode service after installation if an existing process has already loaded
the old plugin set.

To pass options, replace the string entry in `~/.config/opencode/opencode.jsonc`
with the object form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-rust-coder@0.2.2",
      "options": {
        "maxTokens": 900,
        "autoLsp": false,
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

## Tools

| Tool | Purpose |
|---|---|
| `rust.check` | Run Cargo check, test, Clippy, format, or the full gate |
| `rust.audit` | Find common LLM-generated Rust pitfalls |
| `rust.crate_lookup` | Verify crate names and published versions |
| `rust.symbol` | Show hover type and documentation |
| `rust.symbols` | List document symbols |
| `rust.references` | Find semantic references |
| `rust.definition` | Open the semantic definition |
| `rust.implementations` | Find trait/type implementations |
| `rust.hierarchy` | Inspect incoming/outgoing calls |
| `rust.rename` | Produce a verified, write-free rename package |
| `rust.refactor` | List code actions without executing commands or edits |
| `rust.docs` | Read version-pinned rustdoc or docs.rs content |

The plugin does not create or modify an agent. At runtime it registers the
autoinvoked `opencode-rust-coder` skill through the OpenCode Skill API. The skill
first requires an explicit Rust request or Cargo/Rust workspace evidence, then
guides the active agent through the available `rust.*` tools.

## Defaults And Safety

- `autoGate`, `autoCrateCheck`, and `autoAudit` are enabled only in detected
  Rust workspaces and are session-limited.
- `autoLsp` is disabled by default. When enabled, it has a five-second deadline
  and a per-session quota.
- Rename/refactor tools never modify files or run server-returned commands.
- Workspace and symlink escapes are rejected. Rustdoc cache lives outside the
  workspace.
- Linked Git worktrees are isolated at their nearest `.git` root. Parent-project
  detection ignores hidden nested worktrees, and Cargo commands pin and report the
  selected `Cargo.toml` with `--manifest-path`.
- `rust.check` and `rust.audit` require absolute project directories; a targeted
  audit path must remain relative to its requested directory.
- All injected guidance is advisory. Compiler and test output remain the source
  of truth, and failures remain fail-open.

See [Architecture](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/architecture.en.md),
[Benchmark Design](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/benchmark.en.md),
and [Rust Research](https://github.com/ugur-murat-alt/opencode-rust-coder/blob/main/docs/rust-research.en.md).

## Development

```bash
bun install
bun run typecheck
bun test
bun run build
```

The release gate is `bun run typecheck && bun test && bun run build`.
`dist/` is generated and must not be edited manually.

The previous full benchmark run is invalid because of a scorer/workspace
failure. No performance claim from that run is presented as release evidence.
A paid rerun requires a repaired harness and explicit approval.

## License

[MIT](LICENSE) © 2026 Uğur Murat Altıntaş
