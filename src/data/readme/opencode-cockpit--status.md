# opencode-cockpit

[![CI](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml/badge.svg)](https://github.com/Codestz/opencode-cockpit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-cockpit?color=%23cb3837&label=opencode-cockpit)](https://www.npmjs.com/package/opencode-cockpit)
[![Docs](https://img.shields.io/badge/docs-cockpit.codestz.dev-9d7cd8)](https://cockpit.codestz.dev/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Your agent, on instruments.** Cockpit adds what [OpenCode](https://opencode.ai) doesn't ship with:
shells that keep running, subagents you can watch, a pull request in the terminal, and a trail of
everything each conversation made.

<img src="media/hero.gif" width="840" alt="One OpenCode session with Cockpit: the tests run in the background, fail, and pass after a fix; subagents work in parallel; the PR lands in Trail under its ticket; the context bar fills">

*Drawn by Cockpit's own renderers, the same code that runs in your terminal: a test run failing and
passing in the background, subagents at work, the PR landing in Trail, the context filling. Every
bay, live, is on the [site](https://cockpit.codestz.dev/).*

## Install

**OpenCode 1**

```sh
opencode plugin opencode-cockpit@0.10.0 --global --force
```

**OpenCode 2**

```sh
opencode plugin add opencode-cockpit@0.10.0
opencode service restart    # after installing, and after every update
```

Requires OpenCode 1.18+ or 2.0.15+, on macOS or Linux.

The version is pinned on purpose: OpenCode resolves a plugin once, so a bare name or `@latest` stays
on whatever it installed first. The same line moves you to a newer release.

Stuck on an old version? This runs from npm, outside OpenCode, so it works whatever you have
installed:

```sh
npx opencode-cockpit@latest update
```

## What you get

Seven bays, all on by default. Each one draws its block in the sidebar, or says `none yet` until it
has something.

| Bay | What it gives you | Key or command | Docs |
| --- | --- | --- | --- |
| **Trail** | What every conversation shipped — PRs, tickets, deploys — and which one shipped it | `ctrl+x f` · `/trail` | [Trail](https://cockpit.codestz.dev/trail/overview/) |
| **Shell** | Terminals that outlive the turn; the agent waits on a port or a pattern, you watch | `ctrl+x o` panel · `ctrl+x j` console | [Shell](https://cockpit.codestz.dev/shell/overview/) |
| **Subagents** | Every helper in the sidebar with what it's doing now, and its whole run one key away | `ctrl+x d` | [Subagents](https://cockpit.codestz.dev/subagents/overview/) |
| **Review** | Review changes like a pull request: notes on lines, which the agent reads and resolves | `ctrl+x v` | [Review](https://cockpit.codestz.dev/review/overview/) |
| **Status** | How full the context is, where the tokens went, what changed, what it costs | `/status-setup` | [Status](https://cockpit.codestz.dev/status/overview/) |
| **Trust** | Approve the same command three times and Trust answers it for you | `ctrl+x p` · `/trust` | [Trust](https://cockpit.codestz.dev/trust/overview/) |
| **Updater** | Every plugin you have: what runs, what is published, and an update you pick | `/plugins-update` | [Updater](https://cockpit.codestz.dev/updater/overview/) |

Every key is the same on OpenCode 1 and 2, and none of them is one of OpenCode's own. Each bay is
also published on its own, as `@opencode-cockpit/<bay>` — see
[Install](https://cockpit.codestz.dev/start/install/).

## Set up in one sentence

Install, restart, then type `/cockpit-setup`.

The agent reads your settings, asks only what matters — which bays show, in what order, how quiet
when empty — and writes the smallest correct file. Every setting is in the
[Configuration](https://cockpit.codestz.dev/configuration/) reference.

## Something wrong?

```sh
npx opencode-cockpit@latest doctor
```

It checks OpenCode, its config, Cockpit's logs and the daemon, and prints the fix for anything
wrong. [Troubleshooting](https://cockpit.codestz.dev/help/troubleshooting/) covers the
rest.

## Links

- [Documentation](https://cockpit.codestz.dev/) — start with
  [What Cockpit is](https://cockpit.codestz.dev/start/what-cockpit-is/)
- [OpenCode 1 and 2](https://cockpit.codestz.dev/start/opencode-versions/) — what
  differs between the two
- [Changelog](CHANGELOG.md)
- [Troubleshooting](https://cockpit.codestz.dev/help/troubleshooting/)
- [Contributing](CONTRIBUTING.md)

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the architecture,
the invariants worth knowing before changing anything, and how to run your working copy inside
OpenCode.

```sh
bun install
bun run check    # lint, typecheck, tests (real PTYs, real daemon)
```

## License

[MIT](LICENSE)
