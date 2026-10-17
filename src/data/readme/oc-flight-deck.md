<p align="center">
  <img src="assets/icon.svg" width="120" height="120" alt="oc-flight-deck icon" />
</p>
<h1 align="center">oc-flight-deck</h1>
<p align="center"><strong>Render live session telemetry for OpenCode users — TypeScript.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-flight-deck" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-flight-deck" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## Project name and description

**oc-flight-deck** is an [OpenCode V2](https://opencode.ai) CLI plugin that renders live session telemetry as a panel in the sidebar: status, agent, model, cost, project, tokens, cache, context, permissions, elapsed time and throughput — every row read from the open session at render time. It is for anyone running agent sessions who wants the numbers where they are already looking.

> [!NOTE]
> Cost, tokens, cache and reasoning roll up the subagent tree through the host's `parentID` link, falling back to the session alone when there is none. A session's own cost excludes its subagents, so the reported figure understates real spend — one money row tells the truth.

## Technology stack

| Technology | Version | Role |
|------------|---------|------|
| TypeScript | `^5.9.3` | Source language (`strict`, `noUncheckedIndexedAccess`) |
| Bun | `>=1.4.0` (CI pins `1.4.2`) | Install, test, build |
| Node | `>=22` | Alternative runtime |
| `@opencode/plugin` | `2.0.30` | Only runtime dependency; host API (compatible with opencode `2.0.30`) |
| `@opentui/core` / `@opentui/solid` | `0.5.17` (peer `>=0.5.17`) | Renderer, supplied by the host, never bundled |
| `solid-js` | `1.9.12` (peer `>=1.9.0`) | UI primitives, supplied by the host |
| `string-width` | `7.2.0` | Cell-width measurement for the rail |

## Architecture

Two entries, compiled to plain JS in `dist/` by `bun run compile` (`scripts/build.ts`); the host loads the compiled entries, never raw source. `src/index.ts` is a deliberately inert server-side entrypoint; all visible behavior lives in the TUI entry `src/tui/index.tsx`, which claims the host's `sidebar.content`, `sidebar.footer` and `prompt.footer.status` slots.

```text
host session state ──► src/tui/session-reads.ts ──► src/tui/stats.ts / rows.ts ──► sidebar rail
        │                        │                          │
        │                        . project-totals.ts         . presentation.ts (theme roles, no ANSI)
        │                        . session-tps.ts / session-elapsed.ts
        │                        . caution.ts (clock + baseline, read-only)
        │                        . go.ts ──► https://opencode.ai/zen/go/v1/usage (opt-in, 60 s poll)
        └─ config: host options ▷ flight-deck.jsonc ▷ src/tui/config.ts defaults
```

The panel is read-only with one exception: clicking the opt-in `ses` row copies the full session id to the OS clipboard — verified, either by the host clipboard write or by reading the clipboard back after the terminal fallback — and stays silent. Only a copy that could not be confirmed raises its warning toast, so a typo never breaks the TUI and a working copy never nags. Every toast the plugin can raise (invalid-config warnings, copy outcomes, the opt-in caution toast) is silenced per-kind or altogether through the `notifications` section; `"notifications": { "enabled": false }` is the one-line silence switch.

## Getting started

### Prerequisites

- OpenCode `2.0.30`
- Node 22+ or Bun 1.4+
- A published install uses the npm/git route below; building from source needs the repo checkout

### Install

Compatible with opencode 2.0.30. Pin a full commit sha, not a branch name, so the install stays put.

1. Add the plugin to the `plugins` array in your `opencode.jsonc`:
   ```jsonc
   { "plugins": ["oc-flight-deck@git+https://github.com/nathwn12/oc-flight-deck.git#<full sha>"] }
   ```
2. Restart OpenCode.
3. Verify: the panel appears beside an open session.

A no-npm route (local clone as the plugin entry) exists; see [INSTALL.md](INSTALL.md) for both routes and uninstall.

### Setup

The config file is optional — with no file at all you get the defaults.

1. Copy [flight-deck.example.jsonc](flight-deck.example.jsonc) to `~/.config/opencode/flight-deck.jsonc` (`$XDG_CONFIG_HOME/opencode/flight-deck.jsonc` when that variable holds an absolute path; a `.json` name works too, `.jsonc` is tried first).
2. Edit any key; every key is optional and validated against [flight-deck.schema.json](flight-deck.schema.json). There is no per-project lookup.

```jsonc
// ~/.config/opencode/flight-deck.jsonc
{
  "refresh": 100,
  "sidebar": {
    "maxLines": 24,
    "rows": [
      "status", "agent", "model", "cost", "project",
      "tokens", "cache", "context", "perms", "elapsed", "tps"
    ]
  },
  "format": { "duration": "spaced" },
  "caution": { "toast": false }
}
```

### Notifications

Every toast the plugin can raise is silenced through one section — the
invalid-config warning, the copy outcome, and the opt-in caution toast:

```jsonc
// Silence everything with one key:
{ "notifications": { "enabled": false } }
```

Each per-kind flag (`config`, `copy`, `caution`) silences only its kind, and
all of them default to `true`, so silencing is always an explicit edit. A
verified copy is silent regardless and never reaches this gate; `caution.toast`
stays the feature opt-in (default `false`) — `notifications.caution` only
suppresses it.

## Project structure

```text
index.ts                  package root, re-exports the server entrypoint
src/index.ts              server-side entrypoint (inert; visible behavior lives in src/tui)
src/tui/index.tsx         sidebar panel entrypoint (slot claims, render, ticker wiring)
src/tui/                  one module per concern: rows, config, file-config, stats,
                          session-reads, session-tps, session-elapsed, project-totals,
                          format, presentation, style, caution, go / go-usage /
                          go-panel / go-look, guard (+tokens), clipboard,
                          host-clipboard, ticker, throughput, coerce
scripts/build.ts          compile script behind `bun run compile`
fixtures/                 test suite (`*.test.ts`, 21 files)
flight-deck.example.jsonc every option, documented inline
flight-deck.schema.json   types, defaults and allowed values
INSTALL.md                the two install routes
CHANGELOG.md              release history (Keep a Changelog, SemVer)
assets/                   icon.svg, signature.svg
.github/workflows/        check.yml (typecheck + tests) · ci.yml (compile + tests) ·
                          release.yml (compile + publish on `v*` tags)
```

## Key features

- Live rows for `status`, `agent`, `model`, `cost`, `project`, `tokens`, `cache`, `context`, `perms`, `elapsed` and `tps`, plus opt-in rows: `caution`, `branch`, `total`, `spark`, `reasoning`, `turns`, `guard`, `go` and `ses`.
- Family-scoped money: cost, tokens, cache and reasoning cover the conversation plus every subagent session in its tree; the `project` row covers every session in the project.
- Elapsed time recomputed from the assistant-turn spans the host recorded, so a restart returns the same value instead of resetting.
- Live throughput over `sidebar.tps.scope` (`family` or `session`, default `family`); reads `0 tok/s` whenever the scope is not generating.
- Stable rail: with `sidebar.persist` every named row draws a zero skeleton until the host has data, while `caution` stays silent until something stops moving.
- `layout.labels` renames any row — `{ "cost": "session", "total": "lifetime" }` draws your own cost under `session` and the family total under `lifetime`.
- The `go` row and `sidebar.footer.go` panel are opt-in and share one account-wide poll; the key resolves only from OpenCode's own credential sources and is never logged.

## Development workflow

Branches are named `<type>/<slug>` and land only through a pull request, squash-merged, then the branch is deleted. Commit subjects follow Conventional Commits (`<type>: <subject>`). Keep `CHANGELOG.md` and the docs current with every user-visible change.

```sh
bun install
bun run check
```

`bun run check` typechecks (`tsc --noEmit`) and runs the suite. `bun run compile` emits the shipped entries to `dist/`. Built against `@opencode/plugin` 2.0.30 — see the official [OpenCode V2 CLI plugin API](https://opencode.ai/v2/docs/build/plugins/cli). Releases are cut by pushing an annotated tag `v<version>` — the `release` workflow compiles and publishes to the public registry (make sure tag and manifest version agree; the workflow has no tag-versus-manifest guard). Two tracks: the registry is the slow/stable track (tagged releases only); a git install spec at any commit is the fast/experimental track.

To load the plugin from a checkout while working on it, name the checkout as a git file URL in the `opencode.jsonc` of the project you run OpenCode in:

```jsonc
{
  "plugins": ["git+file:///absolute/path/to/oc-flight-deck"]
}
```

That installs a copy, not a symlink, so re-run the install after editing the checkout.

> [!WARNING]
> `dist/` is committed so a clone — and the `git+file://` install route that loads the built entry from the clone — works out of the box; the `release` workflow rebuilds it (`bun run compile`) before publishing. Never publish from a stale or missing `dist/`, and never hand-edit it: change the source and recompile. Never add an npm script named `install`, `postinstall`, `preinstall`, `build`, `prepare` or `prepack`: a git install would re-trigger a dependency-preparation step that is not needed here.

## Coding standards

TypeScript `strict` with `noUncheckedIndexedAccess`; JSX `preserve` with `@opentui/solid` as the import source. One module per concern under `src/tui/`; row rendering is pure (`statLine`/`statRows` in `rows.ts`) so the rail is trivially testable. Host-supplied strings pass through control-character flattening before drawing. Styling resolves through theme roles (`themeColor`/`attributeMask`), never ANSI escapes. Guardrail: keep the docs' publication claims true — if the install, build or publish story changes, update `README.md`, `INSTALL.md` and `AGENTS.md` together (`README.md` ships in the package; `INSTALL.md` and `AGENTS.md` are repo-only guides, not packaged).

## Testing

`bun run check` = `tsc --noEmit` + `bun test`. The suite (`fixtures/*.test.ts`, 21 files) includes headless OpenTUI render tests that mount the panel in a real renderer and assert the exact characters rendered, plus coverage for config/file-config/schema, formatting, elapsed, stats, tps, caution, persist, guard, go usage/panel/look, clipboard, ticker, toast cadence, width and rail defects. CI runs typecheck plus tests on `main` pushes and pull requests (`check.yml`); `ci.yml` compiles plus tests on push/PR.

## Contributing

See [AGENTS.md](AGENTS.md) — quick start, layout, host contract, release process and guardrails. Release history lives in [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
