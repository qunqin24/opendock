# hashtrack

Token & cost tracking for AI coding agents — one append-only usage log per repo,
written by a small extension for each agent harness.

- **Per-repo**: data lives in `<git-root>/.hashtrack/usage.jsonl` (override with `HASHTRACK_DIR`). Keyed by git remote URL, so totals accumulate across sessions — restarts included.
- **Per-turn breakdown**: input/output/cache/reasoning tokens, cost, and per-tool usage + errors, per turn.
- **Harness-agnostic**: the storage layer (`packages/core`) knows nothing about pi/Claude/Copilot/OpenCode; each `apps/*` package is a thin adapter that maps its harness's events onto the same `Session` API.
- **Append-only schema**: short keys, never renamed — new fields may be added, old lines always parse.

## Agents

### PI

#### Technical details

##### Where data is stored

Usage is written to `<git-root>/.hashtrack/usage.jsonl` (override with `HASHTRACK_DIR`). Each line is one JSON record per agent run — one prompt and all of its turns. The repository is identified by its git remote URL; if there is no remote, the git root is used, and if there is no git repo, the current directory.

The file is append-only and uses a shared format, so adapters for other agents (OpenCode, Claude Code; Copilot planned) write to the same file. Old lines keep parsing when the format changes, and malformed lines are skipped.

##### When data is written

Turns are kept in memory and written in a single append when the agent goes idle and when it shuts down. This keeps writes safe when several agent sessions run on the same repo at once. The trade-off: if the agent is killed hard (e.g. `kill -9`), the current unsaved run is lost.

##### Cloud sync

Opt in by creating `~/.pi/hashtrack/config.json` (the pi root comes from `PI_CODING_AGENT_DIR`, so overriding the agent dir moves it too):

```json
{ "token": "..." }
```

The file holds a Bearer token, so hashtrack tightens it to owner-only (`chmod 600`) the first time it reads it.

`token` is required; `url` is optional and defaults to `https://witness-rho-rust.vercel.app`. When the file is present, records are `POST`ed to `<url>/api/ingest` as `{ "records": [...] }` with `Authorization: Bearer <token>`.
- Every flushed record is uploaded immediately; on success it moves from `usage.jsonl` to `synced.jsonl`.
- On session start, everything still in `usage.jsonl` (records from failed uploads, or from runs without cloud config) is uploaded in one batch, then moved.
- `usage.jsonl` is therefore the pending queue and `synced.jsonl` the uploaded archive. Readers (dashboard, repo totals) see both.
- The local file stays the source of truth: a failed upload is ignored and leaves the record in `usage.jsonl` for the next startup, and it never blocks the local write.

The dashboard reads from the same API when a token is configured: `/api/records` calls `GET /api/records?rep=<repo>` on the cloud server and serves those records instead of `.hashtrack`. If the request fails it falls back to the local log, so a network outage never hides data. The endpoint contract is in [docs/cloud-api.md](docs/cloud-api.md).

Auth flow (login, token refresh) is not implemented yet — the token is read as-is.

##### Dashboard server

`/hashtrack:show` starts a small HTTP server on `127.0.0.1:4444`, reachable only from your own machine. It serves the bundled viewer and an `/api/records` endpoint that returns the records for the current repo — from the cloud when a token is configured, otherwise from `.hashtrack`. It stops when the session ends.

## Install (pi)

From npm:

```bash
pi install npm:@hashtrack/pi
```

Or without installing, for one run:

```bash
pi -e npm:@hashtrack/pi
```

From source:

```bash
pi install git:github.com/HeapSoftGmbH/hashtrack
```

Or run the checkout without installing:

```bash
pi -e git:github.com/HeapSoftGmbH/hashtrack
```

Teams can share it via project settings (`-l`): pi installs missing packages automatically once the project is trusted.

> Security: pi extensions run with full system access. Review the source before installing (it's short — `packages/core/index.ts` + `apps/pi/extensions/index.ts`).

## Other agents

### OpenCode

`apps/opencode` is a plugin for [opencode](https://opencode.ai) v2 using the same core and the same `.hashtrack/usage.jsonl` file. Add it to `opencode.json`:

```json
{ "plugins": ["@hashtrack/opencode"] }
```

For local development, build the plugin once and point the entry at the package directory (local paths must be directories):

```bash
bun run build:opencode
```

```json
{ "plugins": ["/absolute/path/to/hashtrack/apps/opencode"] }
```

The plugin shows the current repo total (`⣏ 12K · $0.42`, the favicon as an orange braille mark in terminals) in the terminal UI and in OpenCode Desktop (which draws the favicon itself), and adds a `/hashtrack` command that opens the detailed web dashboard in your browser. Cloud sync reads `~/.config/opencode/hashtrack/config.json` (same `{ "token", "url" }` shape as pi). See [apps/opencode/README.md](apps/opencode/README.md).

### Claude Code

`apps/claude` is a [Claude Code](https://code.claude.com) plugin using the same core and the same `.hashtrack/usage.jsonl` file. This repository is also its marketplace:

```bash
claude plugin marketplace add HeapSoftGmbH/hashtrack
```

```bash
claude plugin install hashtrack@hashtrack
```

The plugin records usage from hooks and reads token counts from the session transcript. Claude Code transcripts carry no cost, so the plugin prices tokens from a built-in table of Anthropic API rates. Subagents get their own records. It also shows the repo total in the prompt footer, which opens a details pane. Hooks run `node`, so Node.js 18 or newer must be on `PATH`; without it the footer says so instead of showing a total. Cloud sync reads `~/.claude/hashtrack/config.json` (same `{ "token", "url" }` shape as pi). See [apps/claude/README.md](apps/claude/README.md).

`apps/copilot` is still a placeholder for an adapter using the same core. To add one: new `apps/<harness>` package, depend on `@hashtrack/core: workspace:*`, call `Session` on the harness's turn-end events, flush on idle/shutdown. See [AGENTS.md](AGENTS.md).

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs two jobs:

- **quality** — every push: install, format check, lint, build both extensions, then run the tests.
- **release** — on tag `<app>-vX.Y.Z`: builds `apps/<app>` via its `prepack` and publishes that app's package to npm, publicly (`@hashtrack/pi` for `apps/pi`, `@hashtrack/opencode` for `apps/opencode`).

Releasing an extension (per-package versions, independent of each other):

```bash
cd apps/pi
npm version 1.2.4 --no-git-tag-version
cd ../..
git commit -am "pi 1.2.4" && git tag pi-v1.2.4
git push origin main --tags
```

The opencode plugin releases the same way, with its own version and tag:

```bash
cd apps/opencode
npm version 0.1.0 --no-git-tag-version
cd ../..
git commit -am "opencode 0.1.0" && git tag opencode-v0.1.0
git push origin main --tags
```

The Claude Code plugin releases the same way (tag `claude-vX.Y.Z`). Bump `version` in both `apps/claude/package.json` and `apps/claude/.claude-plugin/plugin.json`: Claude Code decides whether an update exists from `plugin.json`.

A new `apps/<harness>` adapter needs no pipeline changes — tagging `<app>-v0.1.0` publishes `apps/<app>`.

## Renamed from witness

The project used to be called witness. Existing data keeps working:

- `<git-root>/.witness/` is moved to `.hashtrack/` on the first write; readers fall back to the old directory until then, so no history is lost.
- Cloud config is read from `~/.pi/hashtrack/config.json` (pi) or `~/.config/opencode/hashtrack/config.json` (opencode), falling back to the old `witness` directory.
- The packages are `@hashtrack/pi` and `@hashtrack/opencode`. The unscoped `witness-pi` / `witness-opencode` names hold the previous releases and are deprecated.
- Slash commands are `/hashtrack:show` (pi) and `/hashtrack` (opencode). The record schema is unchanged.

## Development

```bash
bun install
bun run test:extensions   # packages/core + both adapters
bun run test:web          # packages/local-web (vitest)
bun run lint
```

Building the pi extension (bundles extension + local-web viewer into `dist/`):

```bash
cd apps/pi
bun run build
```

Bun workspaces monorepo:

- `packages/core` — core `Session` class (record schema, storage, repo totals) and the shared `Usage` / `Tool` / `AgentTurnRecord` interfaces (re-exported to every adapter)
- `packages/lib` — formatters and brand constants shared by the adapters
- `apps/pi` — pi extension (`extensions/index.ts` maps pi events to `Session`)
- `apps/opencode` — opencode plugin (`src/index.ts` maps opencode events to `Session`)
- `packages/local-web` — the dashboard UI

## License

[Apache-2.0](LICENSE)
