<a id="readme-top"></a>

[![npm version][npm-shield]][npm-url]
[![CI][ci-shield]][ci-url]
[![License][license-shield]][license-url]
[![OpenCode V2][opencode-shield]][opencode-url]

<br />

<div align="center">
  <h3 align="center">opencode-orchestrator-uni</h3>

  <p align="center">
    An OpenCode V2 plugin that runs coding work as an evidence-driven audit loop.
    <br />
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/tree/main/docs/en"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/issues/new">Report Bug</a>
    &middot;
    <a href="https://github.com/OniVe/opencode-orchestrator-uni/issues/new">Request Feature</a>
  </p>

  <p align="center">
    <strong>English</strong> &middot; <a href="https://github.com/OniVe/opencode-orchestrator-uni/blob/main/README.ru.md">Русский</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#what-you-get">What You Get</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#configure">Configure</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a>
      <ul>
        <li><a href="#quick-start">Quick Start</a></li>
        <li><a href="#the-audit-loop">The Audit Loop</a></li>
        <li><a href="#agents">Agents</a></li>
        <li><a href="#commands">Commands</a></li>
      </ul>
    </li>
    <li><a href="#reference">Reference</a></li>
    <li><a href="#development">Development</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

Agent sessions drift: the same agent writes the code, judges the result, and
summarizes its own success. This plugin makes the separation explicit for
[OpenCode V2](https://opencode.ai/v2/docs/build/plugins). It ships the
**orchestrator agent kit**: a root orchestrator with a built-in audit loop,
read-only audit subagents, one writer, deterministic verification tools, and the
process documents that keep the loop honest. Plugin id: `orchestrator.uni`.

The kit is a protocol, not a sandbox. Auditors are read-only by tool permission
and prompt; the orchestrator delegates every code/doc/test edit; audit artifacts
stay in writable paths. The write guard keeps the orchestrator out of source —
see [Write Guard](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md#write-guard).

### What You Get

| Layer | What ships |
| --- | --- |
| Agents | `orchestrator` (primary); read-only `factcheck`, `empiric`, `invariant`, `arbiter`, `meta`, `redteam`, `context-lint`; writer `fix-runner` |
| Tools | Five read-only tools: `orch_uni_validate_report`, `orch_uni_context_lint`, `orch_uni_snapshot`, `orch_uni_sessions`, `orch_uni_session_stats` |
| Commands | Three slash commands: `/agents-md`, `/spec`, `/handoff` |
| Reference | Process documents exposed as the `audit-kit` reference; deep details in [Reference](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

- [![OpenCode V2][opencode-shield]][opencode-url]
- [![TypeScript][typescript-shield]][typescript-url]
- [![Bun][bun-shield]][bun-url]
- [![Biome][biome-shield]][biome-url]
- [![semantic-release][semantic-release-shield]][semantic-release-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- **OpenCode 2.x** with the V2 plugin API (`plugins` field). V1's loader expects
  the legacy `server()` export and will not load this plugin.
- **Bun** for tests and check scripts, **Node.js 22.14+** for release tooling.
  The plugin has no build step and no `dist/`.
- A git checkout for `npm run check:locales` and `npm run verify:kit`; the npm
  package ships no `tools/` directory.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Installation

With the OpenCode CLI:

```sh
opencode plugin add opencode-orchestrator-uni
```

Or add it to the `plugins` array in `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-orchestrator-uni"]
}
```

Pin a version with `opencode-orchestrator-uni@0.5.1`. For model options, use the
object form — see [Configure](#configure) and [Models](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md#models).

Restart the service after changing the config:

```sh
opencode service restart
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Configure

All options are optional and live on the plugin entry:

- `locale` — `"en"` or `"ru"`; full tags such as `"ru-RU"` are accepted.
- `model` / `agents` — default and per-agent models in
  `"provider/model[#variant]"` or `{ providerID, model, variant }` form.
- `sessionGuard` — prompt-budget reminders and the compaction limit.
- `toolOutputGuard` — caps large `shell`/`bash`/`webfetch` output.

Invalid values are ignored with an `[orchestrator.uni] …` warning. Full option
reference: [Models](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md#models),
[Locale](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md#locale), and
[Session Hygiene](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md#session-hygiene).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

### Quick Start

1. Install the plugin, restart OpenCode, and open a session in the project directory.
2. Set `model` — or leave it unset so subagents inherit the session model.
3. Give the orchestrator a slice. Use `/spec` before implementation, `/agents-md`
   for an `AGENTS.md`, and `/handoff` to close the slice.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### The Audit Loop

`factcheck` marks stale work; `empiric` reproduces and measures; `invariant`
probes states and hostile input; `arbiter` resolves disputes. `meta` gates the
reports, `redteam` checks acceptance, and `fix-runner` closes the list. The
process documents ship as the `audit-kit` reference and live in
[`docs/en`](https://github.com/OniVe/opencode-orchestrator-uni/tree/main/docs/en).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Agents

| Agent          | Mode       | Role                                                              |
| -------------- | ---------- | ----------------------------------------------------------------- |
| `orchestrator` | `primary`  | Root orchestrator; delegates edits; writes audit/state artifacts  |
| `factcheck`    | `subagent` | Read-only: staleness pre-pass (already done / outdated)           |
| `empiric`      | `subagent` | Read-only: reproductions, measurements, first sources             |
| `invariant`    | `subagent` | Read-only: states, cancels, races, hostile input                  |
| `arbiter`      | `subagent` | Read-only: resolves disputed findings only                        |
| `meta`         | `subagent` | Read-only: meta-audit of reports (pass/fail gate)                 |
| `redteam`      | `subagent` | Read-only: acceptance red team (release gates)                    |
| `context-lint` | `subagent` | Read-only: audits AGENTS.md/SPEC.md for token efficiency          |
| `fix-runner`   | `subagent` | Writer: applies the fix list and proves closure                   |

All agents ship without a model; definitions live in [`agents/`](https://github.com/OniVe/opencode-orchestrator-uni/tree/main/agents) and
are parsed at setup. "Read-only" means `edit` is denied and the prompt forbids
writes; `shell` stays allowed for verification (accepted risk I-M15).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Commands

| Command      | What it does                                                                                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/agents-md` | Injects the AGENTS.md audit/draft workflow: `context-efficiency.md` template, `orch_uni_context_lint`, `context-lint`, approval before writing.                  |
| `/spec`      | Injects the SPEC.md workflow: brief, clarifying questions, EARS/AC/traceability, `orch_uni_context_lint`, `context-lint`, approval before writing.               |
| `/handoff`   | Injects the slice-closing workflow: session and working-tree facts, the `session-discipline.md` handoff template, writes `docs/planning/handoff-<YYYY-MM-DD>.md`. |

A command is a prompt, not a writer: it injects a workflow into the current
session, and the orchestrator follows the usual evidence and approval rules.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Reference

The deep reference lives in [`docs/en/reference.md`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/docs/en/reference.md):
write guard, all five tools with schemas and limits, session hygiene, models,
locale, precedence, and notes.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Development

There is no build. `index.ts` is the shipped entry point.

```sh
npm install
npm run typecheck
npm test
npm run check:locales
npm run verify:kit
npm run lint
npm run lint:fix
```

`npm test` scans only `./test/` and now runs **438 tests in 11 files** — 437 pass
and 1 skip. A bare `bun test` from the root is red by design: it also picks up
intentionally failing fixtures under `eval/cases/` and drafts under `lab/`; use
`npm test`.

`check:locales` and `verify:kit` need a git checkout — the npm package ships no
`tools/` (`stand: unavailable`). [Biome](https://biomejs.org)
([`biome.json`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/biome.json)) covers `index.ts`, `lib/`, `test/` and `eval/*.ts`,
skips `lab/` and `eval/results/`, and freezes `eval/cases/**` and
`eval/baselines/**`; baseline records use `JSON.stringify(…, null, 2)` style, so
reformatting them would churn on `eval:recompute`. `lint/style/noNonNullAssertion`
is the one rule disabled.

For a live server, point a project config at the checkout:
`"plugins": ["file:///C:/path/to/opencode-orchestrator-uni"]`. Local plugin
paths must be directories; OpenCode reloads them on change.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

The current published release is **0.5.1**. Pre-1.0, a breaking change bumps the
minor version. Release notes live on [GitHub Releases][releases-url]; planned
work and known issues live in the [issue tracker][issues-url].

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

See [`CONTRIBUTING.md`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/CONTRIBUTING.md). Fork, create a branch
(`git checkout -b feature/AmazingFeature`), commit with
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`docs:`; `commitlint` enforces the format), push, and open a pull request. `ru` is
the reference locale; `en` must mirror it. After editing agents or docs, run
`npm run check:locales`; after README edits, run `npm test` (heading and fence
parity).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distributed under the MIT License. See [`LICENSE`](https://github.com/OniVe/opencode-orchestrator-uni/blob/main/LICENSE).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Questions, bugs and feature requests: [GitHub Issues][issues-url].

Project Link: [https://github.com/OniVe/opencode-orchestrator-uni][repo-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) — the README structure.
- [OpenCode V2 plugin documentation](https://opencode.ai/v2/docs/build/plugins) — the plugin API.
- [shields.io](https://shields.io) — the badges.
- [Bun](https://bun.sh), [Biome](https://biomejs.org) and
  [semantic-release](https://semantic-release.gitbook.io/) — the toolchain.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[npm-shield]: https://img.shields.io/npm/v/opencode-orchestrator-uni?style=for-the-badge
[npm-url]: https://www.npmjs.com/package/opencode-orchestrator-uni
[ci-shield]: https://img.shields.io/github/actions/workflow/status/OniVe/opencode-orchestrator-uni/ci.yml?branch=main&style=for-the-badge
[ci-url]: https://github.com/OniVe/opencode-orchestrator-uni/actions/workflows/ci.yml
[license-shield]: https://img.shields.io/github/license/OniVe/opencode-orchestrator-uni?style=for-the-badge
[license-url]: https://github.com/OniVe/opencode-orchestrator-uni/blob/main/LICENSE
[opencode-shield]: https://img.shields.io/badge/OpenCode-V2-000000?style=for-the-badge
[opencode-url]: https://opencode.ai/v2/docs/build/plugins
[typescript-shield]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[bun-shield]: https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white
[bun-url]: https://bun.sh/
[biome-shield]: https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white
[biome-url]: https://biomejs.org/
[semantic-release-shield]: https://img.shields.io/badge/semantic--release-E10079?style=for-the-badge
[semantic-release-url]: https://semantic-release.gitbook.io/
[repo-url]: https://github.com/OniVe/opencode-orchestrator-uni
[issues-url]: https://github.com/OniVe/opencode-orchestrator-uni/issues
[releases-url]: https://github.com/OniVe/opencode-orchestrator-uni/releases
