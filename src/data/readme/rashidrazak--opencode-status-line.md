# opencode-status-line

[![CI](https://github.com/rashidrazak/opencode-status-line/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/rashidrazak/opencode-status-line/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@rashidrazak/opencode-status-line)](https://www.npmjs.com/package/@rashidrazak/opencode-status-line)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/rashidrazak/opencode-status-line/blob/main/LICENSE)

A status line for [OpenCode](https://opencode.ai) v2's terminal UI. It shows
context window usage, cache usage, streaming speed, cost, elapsed time and
uncommitted changes in one configurable row.

<p align="center">
  <img src="assets/status-line.png" alt="A session with the status line at the bottom, showing context, cache, speed, cost, time and uncommitted changes" width="1080" />
</p>

The line itself:

```
███········▏ 26% — 262.0k │ ⧉ 99.6% — 260.9k │ ██████·····▏ ↯ 158 · μ  88 tok/s │ +6 -1 │ $0.18 │ 57m11s
```

From left to right, the line shows context window usage, cache usage, current
speed (`↯`) and turn average (`μ`) speed, uncommitted changes, session cost,
and elapsed time. Segments with nothing to show are hidden.

## What you get

- **Context window**: a bar showing how full the context window is, the
  percentage used, and the token count. The bar colour changes as the window
  fills.
- **Cache** (`⧉`): how much of the model's input came from cache, and the
  cached token count.
- **Speed**: the current streaming speed (`↯`) and the average for the turn
  (`μ`). When a stream stops, the last reading stays on screen in a dimmed
  colour.
- **Cost and time**: the session's cost so far and how long it has been
  running.
- **Uncommitted changes**: added and removed line counts for staged, unstaged
  and untracked files, taken from OpenCode's VCS status. No `git` command is
  run.
- **Running shells**: the number of commands running right now. Click the
  count to open the composer's Shell tab.
- `/opencode-status-line` (alias `/tps`): opens a dialog with the detailed
  numbers behind the meter.

The line can be placed in one slot or in several at once, and each placement
can show its own segments. When the window is narrow, whole segments move to
the next row; in a sidebar they stack one per row. Built-in colour palettes:
Catppuccin, Dracula, Gruvbox, Nord, Rosé Pine, Tokyo Night, and the flat
`grey` and `white`.

## Install

Requires OpenCode v2. The plugin is CLI-only, so it is loaded from
`~/.config/opencode/cli.json`, not `opencode.json`.

1. Add the package to the `plugins` list. Create the file if it does not
   exist, or add the package to the existing list:

   ```json
   {
     "plugins": ["@rashidrazak/opencode-status-line"]
   }
   ```

2. Restart OpenCode and open a session. The line appears at the bottom of the
   window, below OpenCode's own footer. Run `/opencode-status-line` (alias
   `/tps`, also in the command palette) to open the stats dialog.

OpenCode downloads the package and transpiles the plugin on load, so there is
no build step.

The line only appears while a session is open. If it does not appear during a
session, check that the entry is in `cli.json` (not `opencode.json`) and
restart OpenCode. For other problems, see the manual's [common questions and
fixes][fixes]; if none of them apply, [open an issue][issues].

To install from a checkout, point `cli.json` at the directory instead. An
absolute path, a path relative to the config directory, or a package name all
work:

```json
{
  "plugins": ["/path/to/opencode-status-line"]
}
```

Changes to a checkout hot-reload, so nothing needs rebuilding.

## Quick start

Configuration is optional and written in JSON. Place it in
`~/.config/opencode/opencode-status-line.json` for every project, or in
`.opencode-status-line.json` in a project folder. The project file wins where
both set the same key. For example:

```json
{
  "usage": { "labels": "words" },
  "colors": { "palette": "catppuccin" },
  "cap": { "gaugeWidth": 14 }
}
```

This changes the labels from glyphs to words, applies the Catppuccin palette,
and widens the speed gauge. Settings are read when the plugin loads, so
restart OpenCode to apply a change. Invalid files and values produce a warning
and are ignored.

## Full manual

The [customization manual][manual] is the complete reference:

- [every setting, with its default and allowed values][settings]
- [choosing and ordering the segments][segments], per placement if you like
- [placing the line in one slot or several at once][placement], and padding it
- [understanding and tuning the speed meter][meter]
- [the bundled palettes, custom colours and per-segment opt-outs][themes]
- [ready-made setups][setups] to copy
- [common questions and fixes][fixes]

## Development

```
bun test                    # the whole suite, no OpenCode needed
bun test test/rate.test.ts  # one module
bun install                 # once, for the typechecker
bun run typecheck           # src/, the tests and the entry
npm run check:pack          # every module the entry imports is in the tarball
```

`src/tui.tsx` is the plugin entry. `src/rate.ts` holds the speed maths,
`src/render.ts` the gauge and context-bar geometry, `src/format.ts` the
usage-line formatting, `src/diff.ts` the uncommitted-change counter,
`src/palette.ts` the bundled colour palettes, and `src/config.ts` the JSON
loader. The root `tui.tsx` re-exports the entry so OpenCode can load the
plugin from a checkout directory; npm consumers resolve the entry through the
`exports` map.

CI runs the suite on Linux, macOS and Windows for every pull request, together
with a typecheck of the source (the entry included), a transpile of the entry
and the tarball check. Contributions are welcome; see
[CONTRIBUTING.md][contributing] for the workflow, and `AGENTS.md` for the
host-API traps behind the entry.

## Publishing

The package is published as source, not as a bundle. OpenCode transpiles the
TSX on load, so there is nothing to build. `package.json` maps `./tui` to
`src/tui.tsx`, and the `files` allowlist includes all of `src/`, so the
tarball contains the entry and every module it imports. `@opencode/plugin` is
a dependency; the rendering peers (`@opentui/core`, `@opentui/solid`,
`solid-js`) are provided by OpenCode. `npm run check:pack` verifies that every
module the entry imports is included in the tarball.

Releases are published by CI. Pushing a `v*` version tag (created by
`npm version`) triggers `.github/workflows/publish.yml`, which publishes with
npm trusted publishing (OIDC) and creates the GitHub Release from that
version's changelog section in the same run. Creating the Release by hand also
works. No repository secret is needed, and provenance is attached
automatically. The tagged commit must be on `main`, and the tag must match the
`package.json` version. Versions and Releases that already exist are skipped
rather than treated as errors, so re-runs and the hand-published bootstrap
release are safe. Maintainers: see [RELEASING.md][releasing].

[manual]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md
[settings]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#10-all-settings-at-a-glance
[segments]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#3-pick-the-parts-you-want
[placement]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#4-move-the-line-around
[meter]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#5-understand-and-tune-the-speed-meter
[themes]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#6-colours-and-themes
[setups]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#11-ready-made-setups
[fixes]: https://github.com/rashidrazak/opencode-status-line/blob/main/MANUAL.md#12-common-questions-and-fixes
[issues]: https://github.com/rashidrazak/opencode-status-line/issues
[contributing]: https://github.com/rashidrazak/opencode-status-line/blob/main/CONTRIBUTING.md
[releasing]: https://github.com/rashidrazak/opencode-status-line/blob/main/RELEASING.md
