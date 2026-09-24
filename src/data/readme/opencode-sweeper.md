# opencode-sweeper

An [opencode](https://opencode.ai) plugin that cleans up **expired sessions and their cascaded subagents** on a configurable schedule, plus a `/sweep` slash command for manual cleanup.

## Compatibility

The V1 entrypoint has been checked against **OpenCode 1.17.0 and 1.17.13** source, and the V2 API and loader against **OpenCode 2.0.15**. Live host integration and other releases remain unverified.

| Feature | V1 Mode | V2 Mode |
|---|---|---|
| **Session listing** | Direct SQLite read (bypasses SDK project filter & 100-row limit) | `OpenCode` SDK's `session.list()` + `session.active()` |
| **Cross-project pagination** | ✅ Direct DB read covers all projects | ✅ Paginating `session.list()` enumerates all sessions |
| **Process verification** | ❌ Not applicable | ✅ Uses `Service.discover()` + PID check, fail-closed on mismatch |
| **Active session protection** | Timer: no session context; Manual `/sweep`: auto-protected | Timer: auto-protected via `session.active()`; Manual: auto-protected |
| **Delete operation** | SDK `session.delete()` | SDK `session.remove()` |
| **Database access** | Reads `opencode.db` SQLite directly | No SQLite read; pure SDK API |

## Installation

### OpenCode V1

V1 uses the `plugin` tuple format in `opencode.json`:

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

For a local V1 plugin directory, use a `file://` URL in the same tuple format:

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

### OpenCode V2

V2 uses the `plugins` list of package/options objects; do not use the V1 `plugin` tuple for V2:

```json
{
  "plugins": [
    {
      "package": "opencode-sweeper",
      "options": {
        "expiry": "30d",
        "subagentExpiry": "7d",
        "interval": "1h",
        "dryRun": false,
        "protect": [],
        "recentActivityGrace": "1h"
      }
    }
  ]
}
```

For a local V2 plugin directory, first run `bun run build` in the plugin repository. Then point `package` at the directory using a `file://` URL; the root-level `server.js` re-exports the built `dist/index.js`:

```json
{
  "plugins": [
    {
      "package": "file:///absolute/path/to/opencode-sweeper",
      "options": { "expiry": "30d", "interval": "1h" }
    }
  ]
}
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `expiry` | `string \| number` | `"30d"` | String duration (`"1d"`, `"12h"`, `"30m"`, `"60s"`, `"100ms"`) or raw milliseconds number. **Applies to main sessions** (sessions with no `parentID`). Sessions whose `time.updated` is older than this are deletion candidates. |
| `expiryMs` | `number` | — | Override-raw-milliseconds form of `expiry`. Mutually exclusive with `expiry`. |
| `subagentExpiry` | `string \| number` | `"7d"` (independent of `expiry`) | String duration or raw ms. **Applies only to subagent sessions** (sessions with a `parentID`). Has its own fixed 7d default — it does **not** inherit from `expiry`. With the default `expiry: "30d"`, subagents are still cleaned at 7d unless you set this explicitly to a different value. |
| `subagentExpiryMs` | `number` | — | Override-raw-milliseconds form of `subagentExpiry`. Mutually exclusive with `subagentExpiry`. |
| `interval` | `string \| number` | `"1h"` | Background sweep cadence. Minimum accepted value is `60000` ms (1 minute) — shorter intervals are rejected. `0` disables the timer entirely. |
| `intervalMs` | `number` | — | Override-raw-milliseconds form of `interval`. Mutually exclusive with `interval`. |
| `dryRun` | `boolean` | `false` | When `true`, the plugin reports what would be deleted without calling the V1 `session.delete` or V2 `session.remove` API. Strict boolean — `0`/"yes" are rejected. |
| `protect` | `string[]` | `[]` | Session IDs that must never be deleted. **Auto-populated with the running session's ID when `/sweep` is invoked** — manual add not needed for the manual path. Honored for both main and subagent sessions. |
| `recentActivityGrace` | `string \| number` | `"1h"` | Sessions touched within this window are skipped **regardless of main/subagent status** — shared grace period for both thresholds. Protects sessions you or other tools recently interacted with. |
| `recentActivityGraceMs` | `number` | — | Override-raw-milliseconds form of `recentActivityGrace`. |
| `dbPath` | `string` | — | Optional override for the opencode SQLite DB path. Only used in V1 mode. Default auto-resolves via `XDG_DATA_HOME` (Linux) or platform default (`~/.local/share/opencode/opencode.db` on Linux, `~/Library/Application Support/opencode/opencode.db` on macOS). Set only when running against a non-standard opencode install. |

Unknown options are rejected — typos fail loud, not silent.

> **Note**: V2 mode uses `@opencode/client` v2.x SDK APIs (`OpenCode`, `Service`) which provide structured session metadata and automatic cross-project enumeration via pagination.

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
cascadeBlocked skipped: 0
dryRun skipped: 0
errors: 0
deletions:
  [DELETED] ses_abc — "Build refactor spike"
  [DELETED] ses_def — "Reproduce auth bug"
  [DELETED] ses_xyz — "" (parent: ses_abc)
```

### Automatic: background timer

On plugin load with `interval > 0`, a `setInterval(sweep, intervalMs)` starts. The timer is cleared on `dispose`. In V1, each tick logs via `app.log` with `service: opencode-sweeper`; in V2, timer results/errors are logged with `console.info`/`console.error`.

Disable the timer: `"interval": 0`.

## How it works

### OpenCode V1 Mode

1. **`/sweep` slash command in the TUI palette**: The plugin's `config` hook injects `sweep` into `Config.command` (the resolved configuration opencode serves to clients). This is the same mechanism used by `@cortexkit/opencode-magic-context` to expose its `/ctx-*` commands. opencode flows `config.command` → ACP `available_commands_update` → TUI's `sync().data.command` → the `/` popover (verified against opencode `1.17.13`). User-declared `sweep` entry in `opencode.json` takes precedence over the plugin default.
2. **Manual `/sweep` execution**: When the user picks `sweep` from the `/` popover (or sends `/sweep` as a prompt), opencode expands the injected template into a model prompt that asks the model to call the bundled `sweep` tool. The tool is registered via `Hooks.tool.sweep` using the official `tool()` helper from `@opencode-ai/plugin`. The tool's `execute(context)`:
   - Adds `context.sessionID` (the running session's ID) to an in-memory `protectedSessions` set — **so `/sweep` never deletes the currently-active session**.
   - Calls `runSweep(client, opts, protectedSessions)`.
   - Returns a multi-line summary string as the `ToolResult`. The model relays it to the user verbatim.
3. **Background timer**: On server-plugin entry, `setInterval(tick, opts.intervalMs)` schedules unattended sweeps. The timer tick has NO session-ID context (opencode's `PluginInput` lacks `sessionID` in v1.17.x), so timers **cannot self-protect the running session** — see [Warning B](#warning-b-timer-sweeps-cannot-protect-the-running-session).
4. **`runSweep(client, opts, protectedSessions)`** first classifies the complete `client.session.list()` snapshot before any deletion. Protected, recently active, and not-yet-expired sessions block deletion of their ancestors because SDK deletion cascades. Eligible trees are deleted from their top-level eligible session; after a successful parent deletion, snapshot descendants are counted in the result without issuing a separate DELETE for each descendant. In dry-run mode, the same snapshot plan is reported without calling the SDK.

#### V1 Session listing: Direct SQLite read

The V1 plugin gets its session list by **reading the opencode SQLite database directly `readonly`**, not by calling the opencode SDK's `session.list()`. This is a deliberate architectural choice driven by two hard limits of the SDK API in opencode 1.17.x:

1. **The SDK list filters by `project_id = current_instance.project.id`** — a plugin loaded in project A can never see sessions belonging to project B. Sweeping all your projects is impossible via the SDK.
2. **The SDK list caps at 100 rows** — the latest 100 only. Sessions older than that cutoff — which is precisely the surface a sweeper needs — are invisible to the SDK.

To actually clean stale sessions across all projects, the plugin opens the opencode DB directly via the runtime's built-in SQLite backend (Bun: `bun:sqlite`; Node/Electron: `node:sqlite` `DatabaseSync`). The same shipped artifact runs under both runtimes via dynamic `import()` gated by a `typeof Bun` probe. `better-sqlite3` is deliberately avoided (per-ABI prebuild downloads are a supply-chain liability; the built-in backends are flag-free).

**Safety invariants of the SQLite path:**

- The DB is opened `readonly` (`bun:sqlite` `{ readonly: true }`, `node:sqlite` `DatabaseSync({ readOnly: true })`). The plugin never writes, never ATTACHs, never mutates pragmas.
- opencode 1.17 uses WAL journal mode, so a readonly reader cannot block opencode's writer path.
- The plugin only selects the columns it reads: `id, project_id, parent_id, title, directory, time_created, time_updated, time_compacting, time_archived`. A `PRAGMA table_info(session)` schema guard at startup throws `SchemaMismatchError` if any required column is missing in a future opencode schema migration — the sweeper degrades loud, not silent.
- The DELETE path still goes through the opencode SDK's `session.delete()`, so opencode's reverse recursive child cleanup (`Session.remove` → `children()` recursion) keeps working. The mixed read(SQLite) + write(SDK) split avoids both the SDK scan blind spot and the risk of a direct-sqlite DELETE bypassing app-layer child cleanup.

If `dbPath` is not set in the plugin options, the path auto-resolves via `XDG_DATA_HOME` (Linux precedence) or platform default. Use the `dbPath` option only when running against a non-standard opencode install.

### OpenCode V2 Mode

V2 mode activates automatically when the plugin detects it's running in an OpenCode V2 host (via the `setup` function's dynamic import of `./v2.js`). The key differences:

1. **Session listing via SDK API**: Uses `OpenCode.make()` client with `Service.discover()` to locate the current OpenCode server. All sessions are enumerated via `session.list()` with pagination (`listAll` function) — no direct SQLite access required.
2. **Process verification**: After discovering the service endpoint via `Service.discover()`, V2 verifies `client.server.info().pid === process.pid`. **If the PIDs don't match, the plugin fails closed with an error** — it will not sweep sessions from a different process.
3. **Active session protection**: The timer sweep calls `client.session.active()` to get all currently active session IDs and protects them automatically via `protectedNow = new Set([...protectedIDs, ...active])`.
4. **Delete operation**: Uses `client.session.remove({ sessionID: id })` instead of `session.delete()`.

#### V2 Pre-delete Checks and Concurrency Limits

Immediately before removal, V2 refreshes the paginated session list and active IDs. It refuses removal if the candidate disappeared, its child-tree membership or parent links changed since the initial snapshot, any member of the fresh subtree is protected/active or not expired under its own threshold and grace period, or the candidate is in the protected-ancestor closure. These checks are still not atomic with the subsequent `session.remove()` request.

The fresh list/active checks and the subsequent `session.remove()` are not atomic. A session can become active or otherwise change after the checks and before the server processes DELETE, so it may still be removed. Plugin unload or cancellation can stop later requests and signal an in-flight request, but cannot retract a DELETE already accepted by the server. V2 treats `SessionNotFoundError` as success only when its `sessionID` matches the exact target being removed; a missing child ID is not treated as success for a different parent removal.

#### V2 Delete vs V1 Delete

| Aspect | V1 (`session.delete`) | V2 (`session.remove`) |
|---|---|---|
| API method | SDK `session.delete({ path: { id } })` | SDK `session.remove({ sessionID: id })` |
| Cascade behavior | Recursive delete of children via SDK | Same recursive deletion semantics |
| Error handling | `NotFoundError` treated as success | Only `SessionNotFoundError` for the exact target ID is treated as success |
| Protection check | Based on `protectedIDs` set + timer context | Based on `protectedIDs` + live `active()` call |

## Warnings

### Warning A: `session.delete` recursion and dual-threshold interaction

The opencode SDK's `session.delete({ path: { id } })` removes the targeted session *and recursively deletes all of its child sessions (subagents), messages, and parts*. This has two consequences for the dual-threshold design:

- **A non-expired or otherwise ineligible descendant blocks ancestor deletion**. The sweeper classifies the complete session snapshot before deleting; protected, recently active, or not-yet-expired descendants prevent a cascading ancestor delete. When an eligible parent is successfully removed, its descendants from that snapshot are included in the result counts, but are not sent as separate DELETE requests.
- **Subagent-only deletion relies on opencode cascading the child's own subtree, not its parent**. The SDK has no `cascade=false` parameter. When `opencode-sweeper` deletes a subagent independently (because it exceeded `subagentExpiry` while its parent is still within `expiry`), it expects the SDK to scope the cascade to that child's own subtree and leave the parent intact. We verified this expectation against the opencode v1.17.13 binary which exhibits the documented "delete by id" behavior, but if you observe parent cascades triggered by subagent deletions in a future opencode version, set `subagentExpiry` to `expiry` and report the regression — the single-threshold mode is safe under either cascade semantics.
- **404 on delete is treated as success**. If a session is already gone (for example, due to a concurrent process), the SDK may return `NotFoundError` (`{ name: "NotFoundError", data: ... }`); the plugin's adapter treats that as already deleted. Successful parent deletion does not cause a subsequent per-descendant DELETE: snapshot descendants are counted as covered by that parent operation. Non-404 errors still populate `errors[]` for audit.

### Warning B: Timer sweeps cannot protect the running session (V1 only)

The background timer is a **per-process** `setInterval` — opencode gives plugins no cross-process coordination primitive, and this plugin intentionally does not add one. If you run two opencode processes against the same data dir simultaneously (e.g. two project windows on the same machine), each process spawns its own timer and both fire independently.

For overlapping sweeps targeting the same already-removed session, a subsequent V1 `NotFoundError` is treated as success. This only covers that missing target; it is not a transaction or a guarantee against races involving a changing cascade tree. Because deleting a session also deletes descendants, concurrent activity or tree changes can still produce outcomes that a repeated-delete/404 check cannot prevent.

**No SQLite lease (intentional)**: `@cortexkit/opencode-magic-context` uses a SQLite `BEGIN IMMEDIATE` + `INSERT ... ON CONFLICT DO UPDATE` lease table to serialize expensive work (git commit indexing). This plugin does **not** adopt that pattern; V1's read-only scan and SDK deletes do not provide cross-process serialization, and a 404 response only confirms that the requested target is already absent.

**`timer.unref()`**: the timer calls `unref()` (Node.js / Bun) so the opencode process can exit naturally without waiting for the next tick. Without this, `opencode run` one-shots with `interval > 0` would hang on the timer.

If you genuinely need single-flight sweeps across processes, set `"interval": 0` on all but one process and rely on `/sweep` from a single TUI.

### Warning C: LLM-mediated manual path

`/sweep` invokes the plugin's `sweep` tool **through the model**: the markdown command template tells the model to call the tool and report its output. A tiny LLM round-trip occurs on every `/sweep`. If your model provider has strict rate limits, prefer the background timer over frequent manual sweeps.

### Warning D: Multiple concurrent opencode processes (V1)

Same as Warning B — V1's SQLite-based approach has the same per-process timer semantics. The SQLite scan is read-only, and a repeated delete of an already-absent target is handled as success. Neither fact makes the scan and cascading SDK deletion atomic or prevents races involving descendants.

### Warning E: V2 Process mismatch (fail-closed)

When V2 mode detects that the OpenCode service's PID does not match the plugin's process PID (via `client.server.info().pid !== process.pid`), it **refuses to sweep sessions and throws an error**. This fail-closed behavior prevents the plugin from manipulating sessions it doesn't own. This can occur in unusual setups where:

- The plugin is loaded in a non-standard environment
- OpenCode is run in a container or different process hierarchy

In such cases, the plugin logs the PID mismatch and exits the sweep operation safely.

## Surfaces

| Surface | Source | Purpose |
|---|---|---|
| `sweep` tool | `Hooks.tool.sweep` (registered via `tool()` helper from `@opencode-ai/plugin`) | Deterministic deletion + summary `ToolResult` |
| `/sweep` slash command | Plugin `config` hook injecting `sweep` into `Config.command` (no `commands/sweep.md` needed) | TUI slash palette entry + model prompt template invoking the `sweep` tool |
| V2 `sweep` tool | `ctx.tool.transform` in `src/v2.ts` | Registers the manual cleanup tool in the V2 plugin host |
| V2 `/sweep` command | `ctx.command.transform` in `src/v2.ts` | Adds the manual slash command when one is not already registered |

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
  v2.ts         # OpenCode V2 runtime implementation (Service.discover, pagination)
tests/
  duration.test.ts
  options.test.ts
  db.test.ts              # SQLite scan layer (real temp DB, schema guard, cross-project read)
  sweep.behavior.ts + sweep.edge.ts + sweep.mixed.ts + sweep.test.ts
  sweep.cascade.ts        # cascade protection, subtree counting and cycle safety
  v2.test.ts              # V2 pagination, protection, lifecycle and deletion behavior
  sweep-support.ts        # shared MockSweeperClient + session factory
  config-inject.test.ts   # config hook injects `sweep` into Config.command
```

## License

MIT (see `package.json`).

## Integration verification (manual, end-user scope)

The unit tests cover the option parser, shared cleanup algorithm, V1 config hook, and V2 plugin behavior. End-to-end verification requires a live host (and a configured LLM provider to exercise `/sweep`). Use `dryRun: true` first so the sweep reports candidates without deleting them.

### Verify V1

1. Configure the V1 `plugin` tuple as shown in [Installation](#installation), using a local `file://` path if testing this checkout. For example, set `expiry` to `"1ms"`, `dryRun` to `true`, and `interval` to `"1m"` (or `0` to disable the timer).
2. Start/restart the V1 host to load the config. Type `/` and verify `sweep` appears; invoke `/sweep` and confirm the tool runs and returns the multi-line summary.
3. Confirm timer output in the V1 server log using `service: opencode-sweeper` (`app.log`). The minimum non-zero interval is `1m`; allow at least one interval for the first timer tick.
4. After reviewing dry-run candidates, set `dryRun` to `false` only if you intend to remove them. A session ID explicitly protected by `/sweep` is skipped, but listing and deletion are not atomic; do not use this as a guarantee against activity that races with deletion.

### Verify V2

1. For a local checkout, run `bun run build` first, then configure the V2 `plugins` package/options object using its `file://` directory URL as shown in [Installation](#installation). Set `expiry` to `"1ms"`, `dryRun` to `true`, and `interval` to `"1m"` (or `0` to disable the timer).
2. Start/restart the V2 host. Verify the `sweep` tool and `/sweep` command are available; invoke `/sweep` and confirm the summary is returned.
3. Check the host's console output for `opencode-sweeper timer sweep` or `opencode-sweeper timer error`. The minimum non-zero interval is `1m`; allow at least one interval for the first timer tick.
4. V2 checks fresh pagination, active sessions, protected ancestors, and the candidate's complete subtree before each removal. These checks are not atomic with the server-side removal; a session may change after the checks. Unload/cancellation does not retract a DELETE already accepted by the server. Review dry-run output before setting `dryRun` to `false`.
