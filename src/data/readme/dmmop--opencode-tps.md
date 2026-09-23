# opencode-tps

[![npm version](https://img.shields.io/npm/v/%40dmmop%2Fopencode-tps)](https://www.npmjs.com/package/@dmmop/opencode-tps)
[![npm downloads](https://img.shields.io/npm/dm/%40dmmop%2Fopencode-tps)](https://www.npmjs.com/package/@dmmop/opencode-tps)
[![Release](https://github.com/dmmop/opencode-tps/actions/workflows/release.yml/badge.svg)](https://github.com/dmmop/opencode-tps/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

OpenCode TUI plugin that displays response performance metrics while a session is running.

## Features

- Live tokens-per-second (TPS) estimate for the active response.
- Session-wide average output and reasoning token rate (AVG).
- Time to first token (TTFT).
- Tracks text, reasoning, and tool-input streaming events.
- Uses the OpenCode TUI session composer slot without changing conversation output.

## Installation

Add the published package to the `plugins` array in your OpenCode configuration:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@dmmop/opencode-tps"]
}
```

OpenCode installs the package and its production dependencies automatically. To
pin a release, use a versioned package specifier such as
`@dmmop/opencode-tps@1.0.0`.

## Development

Requirements:

- Bun
- An OpenCode V2 environment with TUI plugin support

Install dependencies:

```bash
bun install
```

For local TUI development, point `cli.json` at this project directory. OpenCode
loads the conventional root `tui.ts` entrypoint.

## Releasing

### Commit messages

`bun install` installs a Husky `commit-msg` hook. Commitlint rejects malformed
Conventional Commits before Git creates the commit (70-character header limit;
capitalized subjects are allowed). Ordinary Git merge messages are exempt, but
bare version numbers and `fixup!` messages are not. CI validates every new commit
and the PR title too, including after title edits, to cover squash merges and
hooks bypassed with `--no-verify`. The validator checks syntax, not whether an
agent chose the correct semantic type for the actual change.

### Automatic publication

The single **CI and Release** workflow tests pull requests and pushes to `main`.
It runs Bun tests, source typechecking, a TUI build and a packed-export smoke test.
Only a successful push to `main` can publish to npm and create a GitHub Release.

`semantic-release` uses Conventional Commits since the last release tag: `fix:`
produces a patch, `feat:` a minor, and `!` or a `BREAKING CHANGE:` footer a major.
Documentation, maintenance and test-only commits do not trigger a release unless
marked breaking. The largest applicable bump wins. Use conventional PR titles
when squash-merging.

Versions are tracked by Git tags and npm, not by automatic bump commits on `main`;
the published manifest receives the computed version. Tag pushes do not start
another workflow. npm Trusted Publishing must authorize this repository's
`release.yml` workflow (OIDC); publication includes provenance and needs no npm token.

## Metric notes

TPS is an estimate based on the byte length of streamed deltas. AVG is calculated from the output and reasoning token counts reported when a session step ends. TTFT measures the time from the start of a session step until the first streamed token.

## License

MIT
