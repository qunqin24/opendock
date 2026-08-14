# opencode-sweeper

An [opencode](https://opencode.ai) plugin that cleans up **expired sessions and their cascaded subagents** on a configurable schedule, plus a `/sweep` slash command for manual cleanup.

Compatible with opencode `1.17.x` (uses the `Hooks.tool` API and the `tool()` helper from `@opencode-ai/plugin@^1.17.0`).

## Installation

Add `opencode-sweeper` to the `plugin` array in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-sweeper",
      {
        "expiry": "30d",
        "interval": "1h",
        "dryRun": false,
        "protect": [],
        "recentActivityGrace": "1h"
      }
    ]
  ]
}
```

For local development, install via `file://`:

```json
{
  "plugin": [
    [
      "file:///absolute/path/to/opencode-sweeper",
      { "expiry": "30d", "interval": "1h" }
    ]
  ]
}
```

> The plugin reads `opencode.json`'s `plugin[i][1]` object. Numeric `expiry`/`interval` values are interpreted as milliseconds; string values accept `<n>d|h|m|s|ms` (no whitespace).

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `expiry` | `string \| number` | `"30d"` | String duration (`"1d"`, `"12h"`, `"30m"`, `"60s"`, `"100ms"`) or raw milliseconds number. **Applies to main sessions** (sessions with no `parentID`). Sessions whose `time.updated` is older than this are deletion candidates. |
| `expiryMs` | `number` | — | Override-raw-milliseconds form of `expiry`. Mutually exclusive with `expiry`. |
| `subagentExpiry` | `string \| number` | `"7d"` (independent of `expiry`) | String duration or raw ms. **Applies only to subagent sessions** (sessions with a `parentID`). Has its own fixed 7d default — it does **not** inherit from `expiry`. With the default `expiry: "30d"`, subagents are still cleaned at 7d unless you set this explicitly to a different value. Set this explicitly when you want a different subagent threshold. | |
| `subagentExpiryMs` | `number` | — | Override-raw-milliseconds form of `subagentExpiry`. Mutually exclusive with `subagentExpiry`. |
| `interval` | `string \| number` | `"1h"` | Background sweep cadence. Minimum accepted value is `60000` ms (1 minute) — shorter intervals are rejected. `0` disables the timer entirely. |
| `intervalMs` | `number` | — | Override-raw-milliseconds form of `interval`. Mutually exclusive with `interval`. |
| `dryRun` | `boolean` | `false` | When `true`, the plugin reports what would be deleted without calling `session.delete`. Strict boolean — `0`/"yes" are rejected. |
| `protect` | `string[]` | `[]` | Session IDs that must never be deleted. **Auto-populated with the running session's ID when `/sweep` is invoked** — manual add not needed for the manual path. Honored for both main and subagent sessions. |
| `recentActivityGrace` | `string \| number` | `"1h"` | Sessions touched within this window are skipped **regardless of main/subagent status** — shared grace period for both thresholds. Protects sessions you or other tools recently interacted with. |
| `recentActivityGraceMs` | `number` | — | Override-raw-milliseconds form of `recentActivityGrace`. |
| `dbPath` | `string` | — | Optional override for the opencode SQLite DB path. Default auto-resolves via `XDG_DATA_HOME` (Linux) or platform default (`~/.local/share/opencode/opencode.db` on Linux, `~/Library/Application Support/opencode/opencode.db` on macOS). Set only when running against a non-standard opencode install.

Unknown options are rejected — typos fail loud, not silent.

### Dual-threshold example

You run opencode for weeks in the same main session, and subagents accumulate as you delegate tasks. Configure:

```json
{
  "plugin": [
    [
      "opencode-sweeper",
      { "expiry": "30d", "subagentExpiry": "1h", "interval": "10m", "recentActivityGrace": "5m" }
    ]
  ]
}
```

Effect:
- Main sessions older than 30 days → deletion candidates.
- Subagents not touched in the last 1 hour → deletion candidates (independently of their parent — the parent is **not** deleted, only the stale subagent).
- Any session touched in the last 5 minutes → always skipped (shared grace).

## Usage

### Manual: `/sweep`

With the plugin loaded, type `/sweep` in the chat. The plugin's `sweep` tool runs immediately, deletes expired sessions (cascading to subagents), and returns a structured summary the model prints back.

Example output (rendered via the model):

```
Sweep complete.
scanned: 14
deleted: 6
protected: 1
recentActive skipped: 4
main notExpired skipped: 2
subagent notExpired skipped: 0
dryRun skipped: 0
errors: 0
deletions:
  [DELETED] ses_abc — "Build refactor spike"
  [DELETED] ses_def — "Reproduce auth bug"
  [DELETED] ses_xyz — "" (parent: ses_abc)
```

### Automatic: background timer

On plugin load with `interval > 0`, a `setInterval(sweep, intervalMs)` starts. The timer is cleared on `dispose`. Each tick logs via `app.log` with `service: opencode-sweeper` so you can grep server logs.

Disable the timer: `"interval": 0`.

## How it works

1. **`/sweep` slash command in the TUI palette**: The plugin's `config` hook injects `sweep` into `Config.command` (the resolved configuration opencode serves to clients). This is the same mechanism used by `@cortexkit/opencode-magic-context` to expose its `/ctx-*` commands. opencode flows `config.command` → ACP `available_commands_update` → TUI's `sync().data.command` → the `/` popover (verified against opencode `1.17.13`). User-declared `sweep` entry in `opencode.json` takes precedence over the plugin default.
2. **Manual `/sweep` execution**: When the user picks `sweep` from the `/` popover (or sends `/sweep` as a prompt), opencode expands the injected template into a model prompt that asks the model to call the bundled `sweep` tool. The tool is registered via `Hooks.tool.sweep` using the official `tool()` helper from `@opencode-ai/plugin`. The tool's `execute(context)`:
   - Adds `context.sessionID` (the running session's ID) to an in-memory `protectedSessions` set — **so `/sweep` never deletes the currently-active session**.
   - Calls `runSweep(client, opts, protectedSessions)`.
   - Returns a multi-line summary string as the `ToolResult`. The model relays it to the user verbatim.
3. **Background timer**: On server-plugin entry, `setInterval(tick, opts.intervalMs)` schedules unattended sweeps. The timer tick has NO session-ID context (opencode's `PluginInput` lacks `sessionID` in v1.17.x), so timers **cannot self-protect the running session** — see [Warning B](#warning-b-timer-sweeps-cannot-protect-the-running-session).
4. **`runSweep(client, opts, protectedSessions)`** does, for each session from `client.session.list()`:
   1. `scanned++`
   2. If `session.id ∈ protectedSessions` → `protectedCount++`, skip.
   3. If `Date.now() - session.time.updated < recentActivityGraceMs` → `recentActiveSkipped++`, skip.
   4. Pick threshold: `session.parentID === undefined ? opts.expiryMs : opts.subagentExpiryMs`. If `Date.now() - session.time.updated < threshold` → `mainNotExpiredSkipped++` or `subagentNotExpiredSkipped++` (by parent status), skip.
   5. If `opts.dryRun` → `dryRunSkipped++`, record a `dryRun: true` deletion entry, skip the SDK call.
   6. Else `await client.session.delete({ path: { id: session.id } })`. Errors are captured into the `errors` array; they do not abort the sweep.

A single pass over `client.session.list()` is sufficient — main and subagent sessions are partitioned by their threshold alone, not by separate passes. See [Warning A](#warning-a-sessiondelete-is-recursive) for the cascade implication.

### Session listing path: direct SQLite read (not the SDK)

The plugin gets its session list by **reading the opencode SQLite database directly `readonly`**, not by calling the opencode SDK's `session.list()`. This is a deliberate architectural choice driven by two hard limits of the SDK API in opencode 1.17.x (verified against `sst/opencode` `session.ts` SHA `68f225a`):

1. **The SDK list filters by `project_id = current_instance.project.id`** (`listByProject` L964). A plugin loaded in project A can never see sessions belonging to project B. Sweeping all your projects is impossible via the SDK.
2. **The SDK list caps at 100 rows** (`limit ?? 100` L997, `order by time_updated desc` L1003) — the latest 100 only. Sessions older than that cutoff — which is precisely the surface a sweeper needs — are invisible to the SDK.

To actually clean stale sessions across all projects, the plugin opens the opencode DB directly via the runtime's built-in SQLite backend (Bun: `bun:sqlite`; Node/Electron: `node:sqlite` `DatabaseSync`). The same shipped artifact runs under both runtimes via dynamic `import()` gated by a `typeof Bun` probe — this mirrors `@cortexkit/opencode-magic-context` `shared/sqlite.ts`. `better-sqlite3` is deliberately avoided (per-ABI prebuild downloads are a supply-chain liability; the built-in backends are flag-free).

**Safety invariants of the SQLite path:**

- The DB is opened `readonly` (`bun:sqlite` `{ readonly: true }`, `node:sqlite` `DatabaseSync({ readOnly: true })`). The plugin never writes, never ATTACHes, never mutates pragmas.
- opencode 1.17 uses WAL journal mode (verified on a live `opencode.db`), so a readonly reader cannot block opencode's writer path.
- The plugin only selects the columns it reads: `id, project_id, parent_id, title, directory, time_created, time_updated, time_compacting, time_archived`. A `PRAGMA table_info(session)` schema guard at startup throws `SchemaMismatchError` if any required column is missing in a future opencode schema migration — the sweeper degrades loud, not silent.
- The DELETE path still goes through the opencode SDK's `session.delete()`, so opencode's reverse recursive child cleanup (`Session.remove` → `children()` recursion, verified in `sst/opencode` `session/session.ts` SHA `68f225a`) keeps working. The mixed read(SQLite) + write(SDK) split avoids both the SDK scan blind spot *and* the risk of a direct-sqlite DELETE bypassing app-layer child cleanup.

**What this means for the cascade cost:** when the plugin lists a parent from SQLite, the SDK `session.delete(parent)` recurses through the SDK's own `children()` call — so dependent child rows are removed via opencode, not via the sweeper's own SQLite writes. The plugin is read-only on the DB even at the cascade layer.

If `dbPath` is not set in the plugin options, the path auto-resolves via `XDG_DATA_HOME` (Linux precedence) or platform default (`~/.local/share/opencode/opencode.db` on Linux, `~/Library/Application Support/opencode/opencode.db` on macOS). Use the `dbPath` option only when running against a non-standard opencode install.

## Warnings

### Warning A: `session.delete` recursion and dual-threshold interaction

The opencode SDK's `session.delete({ path: { id } })` removes the targeted session *and recursively deletes all of its child sessions (subagents), messages, and parts*. This has two consequences for the dual-threshold design:

- **Main-session deletion cascades downward**. When a main session is removed (e.g. because it exceeded `expiry`), all of its subagents — including any that *would* still have been within `subagentExpiry` — are also removed. This is deliberate and matches opencode's notion of a "session tree."
- **Subagent-only deletion relies on opencode cascading the child's own subtree, not its parent**. The SDK has no `cascade=false` parameter (verified against `@opencode-ai/sdk@1.17.x` types — `session.delete` only accepts `{ path: { id } }`). When `opencode-sweeper` deletes a subagent independently (because it exceeded `subagentExpiry` while its parent is still within `expiry`), it expects the SDK to scope the cascade to that child's own subtree and leave the parent intact. We verified this expectation against the opencode v1.17.13 binary which exhibits the documented "delete by id" behavior, but if you observe parent cascades triggered by subagent deletions in a future opencode version, set `subagentExpiry` to `expiry` and report the regression — the single-threshold mode is safe under either cascade semantics.
- **404 on delete is treated as success**. When a sweep deletes a main session (triggering SDK recursion to remove its subagents), and then in the same pass tries to delete a subagent whose ID was already cascaded away, the SDK returns `NotFoundError` (`{ name: "NotFoundError", data: ... }`, verified in `@opencode-ai/sdk@1.17.x` types). The plugin's SDK adapter detects this by name and returns `true` (already-deleted state), so the subagent still appears under `deletions` and `errors` stays at `0`. Same applies to other already-gone scenarios. Non-404 errors still populate `errors[]` for audit.

### Warning B: Timer sweeps cannot protect the running session

The plugin's server-plugin entrypoint (where `setInterval` is set up) does **not** receive a `sessionID` — opencode's `PluginInput` lacks that field in v1.17.x. When the background timer fires, it cannot identify the session the user is currently in. Two mitigations:

- **`recentActivityGrace` (default `1h`)**: Sessions touched within the last hour are skipped. If opencode has been active recently, the live session is naturally protected.
- **`protect: [<id>]`**: Explicitly list the running session ID (or any reference session) to guarantee safety across timer sweeps.

If neither matches your workflow, set `"interval": 0` and rely on `/sweep` manually.

### Warning C: LLM-mediated manual path

`/sweep` invokes the plugin's `sweep` tool **through the model**: the markdown command template tells the model to call the tool and report its output. A tiny LLM round-trip occurs on every `/sweep`. If your model provider has strict rate limits, prefer the background timer over frequent manual sweeps.

### Warning D: Multiple concurrent opencode processes

The background timer is a **per-process** `setInterval` — opencode gives plugins no cross-process coordination primitive, and this plugin intentionally does not add one. If you run two opencode processes against the same data dir simultaneously (e.g. two project windows on the same machine), each process spawns its own timer and both fire independently.

- **No data corruption**: `session.delete` is idempotent. The process that fires first deletes the row; the second process receives SDK `NotFoundError` (HTTP 404) which the plugin's SDK adapter detects by name and silently treats as "already deleted" (returns `true`, does not populate `errors[]`). Verified against opencode 1.17.13 runtime + `@opencode-ai/sdk@1.17.x` types.
- **Audit log duplication**: each tick logs a full `Sweep complete.` summary, so two concurrent processes produce two summary lines per tick covering overlapping session sets. This is cosmetic — the deletions themselves are deduplicated by the SDK's 404 path.
- **No SQLite lease (intentional)**: `@cortexkit/opencode-magic-context` uses a SQLite `BEGIN IMMEDIATE` + `INSERT ... ON CONFLICT DO UPDATE` lease table to serialize expensive work (git commit indexing) across processes. This plugin does **not** adopt that pattern because session deletion is cheap and idempotent — adding ~200 lines of lease-acquire/renew/release/cool-down code would be over-engineering for a low-frequency sweep whose worst case is a redundant 404.
- **`timer.unref()`**: the timer calls `unref()` (Node.js / Bun) so the opencode process can exit naturally without waiting for the next tick. Without this, `opencode run` one-shots with `interval > 0` would hang on the timer.

If you genuinely need single-flight sweeps across processes, set `"interval": 0` on all but one process and rely on `/sweep` from a single TUI.

## Surfaces

| Surface | Source | Purpose |
|---|---|---|
| `sweep` tool | `Hooks.tool.sweep` (registered via `tool()` helper from `@opencode-ai/plugin`) | Deterministic deletion + summary `ToolResult` |
| `/sweep` slash command | Plugin `config` hook injecting `sweep` into `Config.command` (no `commands/sweep.md` needed) | TUI slash palette entry + model prompt template invoking the `sweep` tool |

## Development

```bash
bun install
bun test
bunx tsc --noEmit
bunx biome check .
bun run build
```

Layout:

```
src/
  duration.ts   # parse "7d"/"24h"/"30m"/"60s"/"Nms" -> milliseconds
  options.ts    # parse plugin options -> typed SweeperOptions (includes dbPath override)
  db.ts         # readonly sqlite scan layer (bun:sqlite/node:sqlite runtime-detected)
  sweep.ts      # core runSweep (mockable SweeperClient interface)
  index.ts      # opencode server plugin default export (PluginModule shape)
tests/
  duration.test.ts
  options.test.ts
  db.test.ts              # SQLite scan layer (real temp DB, schema guard, cross-project read)
  sweep.behavior.ts + sweep.edge.ts + sweep.mixed.ts + sweep.test.ts
  sweep-support.ts        # shared MockSweeperClient + session factory
  config-inject.test.ts   # config hook injects `sweep` into Config.command
```

## License

MIT (see `package.json`).

## Integration verification (manual, end-user scope)

The plugin's unit tests cover the duration parser, options parser, cleanup
algorithm, and the `config` hook's `Config.command.sweep` injection with a
mock `PluginInput`. The full end-to-end binding — the `@opencode-ai/plugin`
host invoking `Hooks.tool.sweep` against the real `OpencodeClient` — requires
a live opencode process and (for `/sweep`) a configured LLM provider, so it
cannot be exercised in CI. To verify on your machine after
`bun install && bun run build`:

1. Add the plugin to the target project's `opencode.json` (or to your
   `~/.config/opencode/opencode.json` for global scope). The plugin auto-
   injects the `/sweep` slash command via its `config` hook — **no manual
   copy of any markdown file is needed**:
   ```json
   {
     "plugin": [
       ["file:///abs/path/to/opencode-sweeper", { "expiry": "1ms", "dryRun": true }]
     ]
   }
   ```
2. Run `opencode` in that project (or restart an open TUI so opencode re-
   loads `opencode.json` and re-runs `config` hooks).
3. In the chat, type `/` and verify `sweep` appears in the slash palette.
   Select it (or send `/sweep` as a prompt) and confirm:
   - The `sweep` tool is invoked (you see tool execution in the UI).
   - The model prints back the multi-line summary (counts + deletions list).
   - Setting `"dryRun": false` next run and `/sweep` actually deletes expired
     sessions (verify with `opencode session list` before and after).
   - Setting `"interval": "5s"` (use `intervalMs: 5000` to bypass the 60s
     floor for testing only) sweeps automatically within ~5s of startup;
     grep the server log (`--print-logs`) for `service: opencode-sweeper`.
4. Critical regression: while a `/sweep` is in flight from session `ses_X`,
   confirm `ses_X` is NOT in the deletions list — `protectedCount`
   increments by 1.
