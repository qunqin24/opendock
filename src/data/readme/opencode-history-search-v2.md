# opencode-history-search-v2

OpenCode **V2** plugin that gives the AI model a `history_search` tool: search past
conversation sessions by keyword, fuzzy term, multi-term AND, or file touch history.

OpenCode V2 stores sessions in a local SQLite database. This plugin opens that
database **read-only**, on demand, and runs deterministic searches over it. No
indexing, no network, no data leaves the machine.

Port of [joeyism/opencode-history-search](https://github.com/joeyism/opencode-history-search)
(V1, for legacy OpenCode) to the V2 plugin SDK and the V2 storage schema.

## Install

In `opencode.json` (global or project):

```json
{
  "plugins": ["opencode-history-search-v2@latest"]
}
```

The plugin hot-reloads on config change; no restart needed.

## What the model gets

A single tool, `history_search`, e.g. the model can answer:

- "What did we decide about the cache bug last week?" → keyword + date search
- "Which sessions touched `src/auth.ts`?" → file trace
- "Find the session about both the truck API and the vertex deploy" → multi-term AND
- "Search every project on this machine for 'postgres migration'" → cross-project

## Options

| Option | Type | Description |
| --- | --- | --- |
| `query` | string | Keyword, regex (with `regex: true`), or fuzzy term. Required unless `filePath` or `terms` is set. |
| `terms` | string[] | Multi-term AND: sessions containing **all** terms. 1 term falls back to `query`. |
| `filePath` | string | Trace which sessions touched this file path. Other filters are ignored. |
| `searchAllProjects` | boolean | Search all projects on the machine instead of only the current one. |
| `mode` | `"keyword" \| "fuzzy"` | Exact keyword (default) or typo-tolerant fuzzy matching. |
| `regex` | boolean | Treat `query` as a regular expression (keyword mode). |
| `caseSensitive` | boolean | Case-sensitive matching (keyword mode, default false). |
| `fuzzyThreshold` | number | 0.0–1.0, lower = stricter (fuzzy mode, default 0.4). |
| `date` | string | `'today'`, `'yesterday'`, `'last N days/weeks/months'`, `'YYYY-MM-DD'`, `'YYYY-MM'`, or `'YYYY-MM-DD to YYYY-MM-DD'`. |
| `limit` | number | Max results (default 50). Applied **after** date filtering, so `date` + `limit` returns the newest results within the range. |
| `role` | `"user" \| "assistant"` | Restrict message matches to one role. Title matches are always included. Ignored with `filePath`. |

## Project scoping

By default searches are scoped to the current project:

- **Git repositories** → the project id is the git root's first-commit hash
  (the same id OpenCode V2 uses).
- **Non-git directories** → the location id plus the legacy `"global"` bucket,
  so sessions from pre-migration (V1) installs are still found. On a fresh
  install with no legacy sessions the `global` bucket simply matches nothing.

`searchAllProjects: true` removes the project filter entirely.

## Where it reads

OpenCode's data directory, resolved the same way the OpenCode binary does:

| Platform | Data directory |
| --- | --- |
| any | `$XDG_DATA_HOME/opencode` (if set) |
| Linux | `~/.local/share/opencode` |
| macOS | `~/Library/Application Support/opencode` |
| Windows | `%LOCALAPPDATA%\opencode` |

Database file: `$OPENCODE_DB` (absolute path or name inside the data dir) if
set, else `opencode.db`, else the newest `opencode-<channel>.db` (OpenCode
names the DB per channel on versioned installs). Everything is opened
`readonly`.

If the database contains an unexpected schema the tool returns an actionable
error instead of raw SQL failures; on a machine without any OpenCode history
yet it returns a friendly "no history found" message.

## Privacy

- Local only. No telemetry, no network access.
- Read-only access to the session database.
- Nothing is indexed or copied; queries run on demand against SQLite.

## Requirements

- OpenCode **V2** (the plugin runs inside OpenCode's bundled Bun runtime;
  `bun:sqlite` is used directly, so there are no native dependencies to build).
- Linux, macOS, or Windows.

## Development

```sh
bun install
bun test          # unit + integration tests (temp on-disk V2-schema DB)
bunx tsc --noEmit
bun run smoke-test.ts
```

Integration tests seed a temporary `XDG_DATA_HOME` with a real V2-schema
database, so they never touch your actual history.

## Behavior notes vs V1

- Date filtering is applied **before** `limit` (V1 applied `limit` first, so a
  small `limit` combined with a date filter could return "no matches").
- Reads the V2 `session_v2` / `session_message` tables (parts are inline in
  the message `data` JSON). The frozen legacy `session`/`message`/`part`
  tables are not read: `session_v2` already contains every legacy session id.

## Attribution & license

Ported from [joeyism/opencode-history-search](https://github.com/joeyism/opencode-history-search)
(MIT). Tool description and search semantics carry over; the storage layer was
rewritten for the V2 schema. Dual copyright, see [LICENSE](./LICENSE).
