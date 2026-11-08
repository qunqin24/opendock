# opencode-trip-meter

[![npm](https://img.shields.io/npm/v/opencode-trip-meter)](https://www.npmjs.com/package/opencode-trip-meter)

A trip meter for your OpenCode sessions: how fast the model is going and what the trip has cost so
far.

An [OpenCode](https://opencode.ai) v2 plugin that adds two sections to the session sidebar:

- **Speed**: output tokens per second for the last step, trailing time windows (5m and 1h by
  default), and the whole session.
- **Price**: the selected model's price per million tokens for input, cached input, cache writes
  (when billed), and output, next to what the session has spent in each category.

The Speed and Price sections appear below OpenCode's built-in Context section:

<img src="docs/sidebar.png" alt="OpenCode sidebar showing Context, Speed, and Price sections" width="384">

## Install

    opencode plugin add opencode-trip-meter

Or add the package to `plugins` in `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencode-trip-meter"]
}
```

## Options

Use the object form to change the trailing windows, in minutes:

```json
{
  "plugins": [{ "package": "opencode-trip-meter", "options": { "windows": [1, 15, 60] } }]
}
```

| Option    | Default   | Description                                     |
| --------- | --------- | ----------------------------------------------- |
| `windows` | `[5, 60]` | Trailing windows for averaged speed, in minutes |

## How It Works

Speed counts output and reasoning tokens per assistant step, timed from the first streamed part to
the end of the model stream, so tool execution and time to first token are excluded.

Prices come from the model catalog for the model selected in the prompt, using the base tier
(context-size tiers are ignored). Models with no pricing, such as local ones, show `no pricing`.

Spend prices each message's tokens at the base tier of the model that produced it, so switching
models mid-session stays accurate. Reasoning tokens bill as output. The total is checked against
the costs OpenCode recorded for those messages; if they differ by more than 2% (tiered pricing, or a
model missing from the catalog), a warning shows the billed amount and marks the breakdown as
approximate. Spend covers this session's assistant messages only, not sub-agent sessions, so it
can read slightly below the built-in Context total.

## Development

Requires [Bun](https://bun.sh).

    bun install
    bun test
    bun run lint
    bun run build

OpenCode loads plugin code from `node_modules` without the Solid JSX transform, so `bun run build`
pre-transforms `src/` into `dist/` and keeps `solid-js` and `@opentui/solid` external so the plugin
shares the host's runtime. `prepack` runs the build before `npm publish`.

To try a local checkout, build it and symlink it into a project's plugin directory:

    bun run build
    mkdir -p <project>/.opencode/plugins
    ln -s "$PWD" <project>/.opencode/plugins/opencode-trip-meter

## Releasing

Bump `version` in `package.json`, merge it, then publish a GitHub release tagged `v<version>`
(e.g. `v0.2.0`). The `publish` workflow checks the tag matches, runs lint and tests, and publishes
to npm via trusted publishing, so no npm token is needed.

## Layout

```text
src/index.ts   no-op server part, so OpenCode loads the TUI part
src/tui.tsx    sidebar slot, history backfill, live first-token tracking
src/stats.ts   pure speed and pricing helpers
tests/         bun tests for src/stats.ts
scripts/       build script
```
