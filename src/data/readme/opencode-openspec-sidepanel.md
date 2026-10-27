# opencode-openspec-sidepanel

OpenCode v2 plugin that shows OpenSpec statistics in the sidebar of the current
repository. The plugin is read-only: it reports what OpenSpec already knows and
never writes to `openspec/`.

Status: the PoC is complete. Milestone `01` delivered the sidebar, the live data
source, the session panel, the e2e proof and the nix packaging. `AGENTS.md` is
the operating manual and `BRIEFING.md` is the product brief.

## Sidebar

```
OPENSPEC
3 active changes

in-progress          2  ████
complete             1  ██

tasks           52/228
specs               24
requirements       214
archived             9
```

The header is `OPENSPEC`. The total line counts active changes. Status rows are
sorted by count descending and then by name, and the four-cell bar is scaled to
the largest status count. The summary shows completed and total tasks across
active changes, the number of main specs, the total requirement count and the
number of archived changes.

The section refreshes after every assistant turn and on a 30 second fallback
timer. It caches the last counts per project and paints them immediately on
startup. When the project has no OpenSpec root, when `openspec` is missing, when
it exits non-zero, times out or returns invalid JSON, the section shows a muted
`unavailable` line instead of crashing the TUI.

## Session panel

Press `<leader>o` to open the breakdown panel:

```
OPENSPEC
3 active changes

fix-thing          2/2  ████
add-widget         2/3  ██▌
old-work           1/1  ████

tasks           52/228
specs               24
requirements       214
archived             9
```

Every active change is listed with its completed and total task count and a
completion bar, sorted by last modified descending. The spec, requirement and
archived totals follow.

## Prerequisites

- OpenCode v2, tested with 2.0.29
- The `openspec` CLI on `PATH`, tested with 1.10.0
- Node 24 for development
- Nix with flakes for the build and the development shell
- Python 3 for the e2e pseudo terminal

## Install

The plugin is discovered automatically from a project's
`.opencode/plugins/<name>/` directory. To use it in a project:

1. Make sure the project has been initialized with `openspec init`, so
   `openspec/config.yaml` exists at its root.
2. Copy the plugin directory into the project:

   ```bash
   mkdir -p .opencode/plugins
   cp -r /path/to/opencode-openspec-sidepanel/.opencode/plugins/openspec-stats \
     .opencode/plugins/
   ```

3. Start OpenCode in that project. Confirm the plugin loaded:

   ```bash
   opencode plugin list
   ```

The assembled plugin is also available from `nix build` at
`result/plugins/openspec-stats/`.

## Development

From a clean checkout:

```bash
nix develop          # Node 24, python3, jujutsu, nixfmt
npm install          # dependencies for the tests and the type check
npm test             # unit and integration tests
npm run test:e2e     # end to end tests against the real OpenCode terminal
npm run typecheck    # TypeScript
npm run test:package # build with nix and verify the assembled plugin
nix flake check      # unit and integration tests in a pure sandbox
nix build            # assembled plugin in result/plugins/openspec-stats/
```

`nix flake check` only builds the check for the current system. The flake
defines every output for `x86_64-linux`, `aarch64-linux`, `x86_64-darwin` and
`aarch64-darwin`.

## Testing

- `tests/unit/` covers parsing, aggregation, layout, caching, refresh, setup,
  packaging and the documentation contract. It uses the built in `node:test`
  runner and needs no network.
- `tests/integration/` runs the real `openspec` CLI against a temporary project
  and includes a hanging-command test with a short timeout.
- `e2e/` boots the real OpenCode process in a pseudo terminal against a
  temporary fixture project. It proves the sidebar renders the correct counts,
  refreshes after a real assistant turn and shows `unavailable` without dying
  when the OpenSpec root is missing. See `e2e/README.md`.

The e2e suite requires `opencode`, `python3` and `npm install`. A skipped e2e
run is not proof.

## Packaging

`nix build` assembles the plugin at `result/plugins/openspec-stats/`. The
directory contains `index.ts`, `layout.ts`, `setup.ts`, `tui.tsx`, `openspec.ts`,
`cache.ts` and `refresh.ts`. `npm run test:package` runs the build and verifies
that every runtime file is present.

The npm package publishes the same plugin directory. Its exports point at
`index.ts` for the server entrypoint and `tui.tsx` for the TUI entrypoint.

## How work is organised

- Milestones and epics: beans. Milestone titles start with `01`, `02`, ...
- Epic internals: OpenSpec. One change per epic.
- Version control: jj, committed as Pim Snel.

See `AGENTS.md` for the operating manual and `BRIEFING.md` for the product goal.
