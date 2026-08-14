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

The plugin entrypoint is `src/index.ts`. Load that entrypoint using your OpenCode plugin configuration while developing locally.

## Releasing

A maintainer can trigger a release from GitHub Actions:

1. Go to **Actions** > **Release** > **Run workflow**.
2. Choose `patch`, `minor`, or `major`.
3. The workflow installs the locked dependencies, checks the npm package, bumps the version, creates and pushes a Git tag, creates a GitHub Release, and publishes `@dmmop/opencode-tps` to npm with provenance.

## Metric notes

TPS is an estimate based on the byte length of streamed deltas. AVG is calculated from the output and reasoning token counts reported when a session step ends. TTFT measures the time from the start of a session step until the first streamed token.

## License

MIT
