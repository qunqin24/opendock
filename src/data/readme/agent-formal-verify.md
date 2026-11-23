# Agent formal verify

![Agent formal verify: model protocols with TLA+ and TLC, prove invariants with Lean 4, and check bounded Rust with Kani.](assets/formal-verify-header.png)

<!-- Proportional badge widths use 93.25%; nine equal gaps fill the remaining 6.75%. Keep the row contiguous to avoid extra whitespace. -->
<p>
<a href="https://github.com/michael-denyer/agent-formal-verify/actions/workflows/ci.yml"><img src="https://github.com/michael-denyer/agent-formal-verify/actions/workflows/ci.yml/badge.svg" alt="CI" width="8.91%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="CHANGES.md"><img src="https://img.shields.io/github/package-json/v/michael-denyer/agent-formal-verify?color=0969DA" alt="Version" width="9.5%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--only-6B7280" alt="License: GPL-3.0-only" width="12.87%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="#claude-code"><img src="https://img.shields.io/badge/Claude%20Code-plugin-D97757" alt="Claude Code plugin" width="12.07%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="#codex"><img src="https://img.shields.io/badge/Codex-plugin-10A37F" alt="Codex plugin" width="8.71%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="#pi"><img src="https://img.shields.io/badge/Pi-package-7C3AED" alt="Pi package" width="7.33%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-plugin-211E1E" alt="OpenCode plugin" width="10.89%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="https://github.com/tlaplus/tlaplus"><img src="https://img.shields.io/badge/TLA%2B-TLC-2E6DB4" alt="TLA+ and TLC" width="6.93%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="https://lean-lang.org"><img src="https://img.shields.io/badge/Lean%204-proofs-0F9D9A" alt="Lean 4" width="9.11%"><img src="assets/badge-gap.svg" alt="" width="0.75%"></a><a href="https://github.com/model-checking/kani"><img src="https://img.shields.io/badge/Kani-Rust-B7410E" alt="Kani" width="6.93%"></a>
</p>

A skill for Claude Code, Codex, Pi, OpenCode and Antigravity that implements the targeted formal-verification method [recently promoted by Boris Cherny](https://x.com/bcherny/status/2102543349102338309). The agent models selected parts of your code, checks their properties, maps counter-examples to source lines, and helps reproduce and fix reachable bugs.

It uses TLA+ and TLC for thread interleavings, shutdown and resource ownership, and Lean 4 for arithmetic, bounds and sequential state transitions. A protocol that depends on arithmetic can use both. For Rust functions with bounded inputs and loops, Kani checks the production code for overflow, invalid memory access, panics and broken invariants.

## Install

### Claude Code

Run in Claude Code:

```text
/plugin marketplace add michael-denyer/agent-formal-verify
/plugin install agent-formal-verify@agent-formal-verify
```

### Codex

Run in your terminal:

```shell
codex plugin marketplace add michael-denyer/agent-formal-verify
codex plugin add agent-formal-verify@agent-formal-verify
```

### Pi

Run in your terminal:

```shell
pi install npm:agent-formal-verify
```

To install from Git instead, use `pi install git:github.com/michael-denyer/agent-formal-verify`.

### OpenCode

OpenCode 2.2 or later. Run in your terminal:

```shell
opencode plugin add agent-formal-verify
```

To install from Git instead, use `opencode plugin add 'git+https://github.com/michael-denyer/agent-formal-verify.git'`.

### Antigravity

Clone or check out the repository, then run in your terminal:

```shell
agy plugin install /absolute/path/to/agent-formal-verify
```

Run `setup` once to prepare the shared Java, Python, TLC, elan, Lean, Rust and Kani tools. In Claude Code, use `/agent-formal-verify:setup`. In Codex, request the plugin's `setup` skill. In Pi, use `/skill:setup`. In OpenCode or Antigravity, request the `setup` skill. It reuses installed prerequisites and needs no target repository.

For local checkouts and skills-only installs, see [shared installation](docs/reference.md#shared-installation).

## Getting started

```text
Use formal-verify to check this queue's shutdown protocol and window arithmetic.
```

In Claude Code, use `/agent-formal-verify:formal-verify`. In Codex, type `$formal-verify` or request the plugin's `formal-verify` skill. In Pi, use `/skill:formal-verify`. In OpenCode or Antigravity, request the `formal-verify` skill.

## How it works

![Recheck existing models against source changes. Use TLA+ and TLC for thread protocols, Lean 4 for arithmetic and state invariants, and Kani for bounded Rust functions. Rerun checks and mutations, compare recorded guarantees, and trace failures back to code. Report assumptions, bounds and recheck commands. Production fixes are by request and model CI is optional.](assets/formal-verify-overview-v4.png)

1. **Choose what to check.** If the repository already has models, the agent reads the source changes since each model was last checked, reruns its checks and mutations, and records what it promises before editing it. For new targets, it builds a TLA+ or Lean model or writes a Kani harness that calls the production Rust function.
2. **Test the guarantees.** The agent reruns the checks itself, tests each property against deliberate mistakes, and compares existing guarantees with the record. Past bug fixes supply mutations where practical. You can also request an independent review of the properties against the code.
3. **Follow failures back to the code.** The agent maps each counter-example to source lines, checks whether shipped settings can reach it, and tries to reproduce it. It reports a proposed fix and changes production code only if you ask. It gives you commands to rerun the checks and adds them to CI if you request it or the repository already runs models there.

A passing check establishes its stated properties under its assumptions and bounds. Reports must identify omitted constraints and unfinished proofs. See [scope and evidence](docs/reference.md#scope-and-evidence).

## Details

- [Skills and slash commands](docs/reference.md#skills-and-slash-commands)
- [Shared installation](docs/reference.md#shared-installation)
- [Runtime setup and tool pins](docs/reference.md#runtime-setup-and-tool-pins)
- [Plugin updates](docs/reference.md#plugin-updates)
- [Verification workflow](skills/formal-verify/SKILL.md)
- [Release history](CHANGES.md)
- [Agent instructions](AGENTS.md)

## Data handling

The plugin configures no MCP servers or hooks, requires no credentials and has no telemetry. Its OpenCode entry point, `opencode.mjs`, reads and registers the bundled skills without running commands or making network requests. The agent sends selected source excerpts, models and results to its model provider. Verification runs locally. Setup verifies a TLC JAR you obtain from the pinned TLA+ release and uses elan to install a missing Lean toolchain. The Kani helpers use the pinned installation you prepare through Cargo. See [tool setup](skills/formal-verify/references/setup.md).

## Contributing

Bug reports, documentation fixes and runtime improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development checks and pull requests.

## License

Copyright (c) 2026 Michael Denyer. Licensed under the [GNU General Public License, version 3](LICENSE), SPDX identifier `GPL-3.0-only`.
