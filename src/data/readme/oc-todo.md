<p align="center">
  <img src="assets/icon.svg" width="120" height="120" alt="oc-todo icon" />
</p>
<h1 align="center">oc-todo</h1>
<p align="center"><strong>Per-session todo lists for your OpenCode terminal.</strong></p>
<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/nathwn12/oc-todo" alt="License" /></a>
  <img src="https://img.shields.io/github/languages/top/nathwn12/oc-todo" alt="Language" />
  <img src="https://img.shields.io/badge/platform-windows--linux-2b3137" alt="Platform" />
</p>

## Project name and description

**oc-todo** is an OpenCode V2 plugin that gives every session its own durable todo list. It adds a `todo` tool the agent calls to track multi-step work, backed by real plugin storage rather than ephemeral UI text, plus a read-only checklist rendered in the sidebar beside any open session that has todos. A `/show-todos` inspector panel shows one item's full detail on demand.

## Technology stack

- **TypeScript** (`^5.9.3`, devDependency) — all three sources are TypeScript; there is no build step, the host loads them directly.
- **Bun** (`>=1.4.0` engine; CI uses Bun 1.4.2) for install and tests, or **Node** (`>=22` engine).
- **`@opencode/plugin` (`2.0.30`, dependency)** — server plugin API: the `todo` tool, the `todo.list` RPC, and `session.panel`.
- **Peer dependencies supplied by the host:** `@opentui/core >=0.5.17`, `@opentui/solid >=0.5.17`, `solid-js >=1.9.0`.
- **Test tooling:** `bun test` plus `tsc --noEmit` (combined as `bun run check`); `ajv ^8.20.0` supports schema tests.

## Architecture

Three surfaces, one store:

- `index.ts` — server plugin: the `todo` tool (`list`, `open`, `write`, `add`, `update`, `complete`, `move`, `clear`), the per-session store, and the `todo.list` RPC.
- `tui.tsx` — interface plugin: the read-only sidebar checklist and the `/show-todos` inspector panel.
- `contract.ts` — shared, dependency-free RPC contract between the two (plain JSON Schema, no imports, so local directory plugins load on the stock binary).

The list persists per session under the key `todos/session/<sessionID>` in the host's SQLite plugin store, so it survives turns and server restarts. Writes emit `rpc.todo.changed`; the TUI refreshes on that event with a 3-second poll fallback for remote servers. The inspector panel owns no state beyond its selection index — every read goes through `todo.list`.

## Getting started

Prerequisites: Node 22 or newer, or Bun 1.4 or newer.

Install (stable npm route) — add the plugin to the `plugins` array in your `opencode.jsonc`:

```jsonc
{ "plugins": ["oc-todo@0.5.0"] }
```

Then restart OpenCode and verify the `todo` tool is available to the agent.

> [!NOTE]
> Two more routes live in [INSTALL.md](INSTALL.md): a bleeding-edge GitHub package spec (experimental) and a no-npm local directory entry. The bare `github:` directory form does not load — use the measured-working forms documented there.

Setup: no config file, no options, no network calls, no telemetry. Usage: ask the agent to track the work with the todo tool (e.g. "use the todo tool to track these steps"); run `/show-todos` to open the inspector for the current session (`up`/`down` or `k`/`j` to move, `escape`/`q` to close). Item statuses are `pending`, `in_progress`, `completed`, `cancelled`; priorities are `high`, `medium`, `low`. To uninstall, remove the entry from `plugins` and restart OpenCode.

Build from source:

```sh
git clone https://github.com/nathwn12/oc-todo.git
cd oc-todo
bun install
bun run check
```

## Project structure

- `index.ts` — server plugin: `todo` tool, per-session store, `todo.list` RPC.
- `tui.tsx` — interface plugin: sidebar checklist and `/show-todos` inspector panel.
- `contract.ts` — shared dependency-free RPC contract.
- `test/unit.test.ts` — unit tests for mutations, formatting, and the panel's pure renderers.
- `docs/specs/` — dated spec documents, one per shipped slice (`v0.2.0.md`, `v0.5.0.md`).
- `INSTALL.md` — the three install routes with measured results.
- `ROADMAP.md` — shipped tiers, saved items, and what is explicitly not being built.
- `CHANGELOG.md` — release history, newest first.
- `package.json` — scripts, entries, dependencies, and peers.
- `.github/workflows/` — `check.yml` (tests plus types on push/PR), `ci.yml`, `release.yml` (publish on tag).
- `assets/` — icon and signature artwork used by the README header and footer.

## Key features

- `todo` tool with `list`, `open`, `write` (V1 `todowrite` parity), `add`, `update`, `complete`, `move`, and `clear` actions.
- Per-session storage under `todos/session/<sessionID>`; survives turns and server restarts.
- Cross-session `open` view of every unfinished todo, ordered by priority then recency.
- Read-only sidebar checklist that refreshes on `rpc.todo.changed` with a poll fallback for remote servers.
- `/show-todos` inspector panel: keyboard-driven, read-only detail view (list, metadata, full content and notes) for the current session.
- Optional notes on items and a counts summary line on formatted output.

See [docs/specs/v0.5.0.md](docs/specs/v0.5.0.md) for the inspector layout, keys, and pure renderers, and [docs/specs/v0.2.0.md](docs/specs/v0.2.0.md) for the Tier 1 slice contract.

## Development workflow

- Branches are named `<type>/<slug>` (for example `docs/repo-guide`), matching the commit type.
- Commit subjects follow the conventional pattern (`feat:`, `fix:`, `docs:`, `chore:`, with optional scopes).
- Land only through a pull request, squash-merge it, and delete the branch afterwards.
- Keep `CHANGELOG.md`, `ROADMAP.md`, and the docs current with every user-facing change; release history lives in [CHANGELOG.md](CHANGELOG.md).
- Releases are cut by pushing an annotated tag named `v<version>`; the release workflow fails unless the tag equals the `package.json` version, so bump the version and document the change first, then tag.

## Coding standards

- The inspector panel's pure renderers (`listRows`, `metadataLines`, `proseLines`, `wrapText`, `formatStamp`, `resolveSelection`, and the selection/column math) stay free of host calls — their purity is what lets `bun test` cover the panel without a live host.
- Never add an npm script named `install`, `postinstall`, `preinstall`, `build`, `prepare`, or `prepack` — this repo ships TypeScript sources with no build step.
- Keep every install pin in `README.md` and `INSTALL.md` in step with the released version.
- Spec documents under `docs/specs/` are dated artifacts, not living docs: record a new slice in a new file, never by revising a shipped one.

## Testing

- `bun test` runs the suite alone (133 tests at v0.5.0, covering mutations, formatting, and the panel's pure renderers).
- `bun run check` runs the test suite plus `tsc --noEmit`; `prepublishOnly` runs the same check before publish, so a broken type or test can never be published.

## Contributing

See [AGENTS.md](AGENTS.md) for the quick start, layout, conventions, host contract, release process, and guardrails.

## License

MIT — see [LICENSE](LICENSE).

<!-- nathwn12 house footer: identical in every repo. Do not edit. -->
<p align="center">
  <a href="https://github.com/nathwn12"><img src="assets/signature.svg" width="96" alt="nathwn12" /></a>
</p>
<p align="center">
  <sub>Built by <a href="https://github.com/nathwn12">nathwn12</a> · <a href="https://github.com/nathwn12?tab=repositories">All projects</a></sub>
</p>
