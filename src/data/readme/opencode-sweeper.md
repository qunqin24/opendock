# opencode-sweeper

An [opencode](https://opencode.ai) plugin that cleans up **expired sessions and their cascaded subagents** on a configurable schedule, plus a `/sweep` slash command for manual cleanup.

## Compatibility

The V1 entrypoint has been checked against **OpenCode 1.17.0 and 1.17.13** source, and the V2 API and loader against **OpenCode 2.0.15**. V2 integration has also been exercised on **OpenCode 2.1.3**: current-process binding and real-session cleanup on a private `serve` host, plus serialized multi-location timer cleanup on a native `serve --service` host using an isolated backup of real session data. Other releases and V1 live-host integration remain unverified.

| Feature | V1 Mode | V2 Mode |
|---|---|---|
| **Session listing** | Direct SQLite read (bypasses SDK project filter & 100-row limit) | `OpenCode` SDK's `session.list()` + `session.active()` |
| **Cross-project pagination** | ✅ Direct DB read covers all projects | ✅ Paginating `session.list()` enumerates all sessions |
| **Process verification** | ❌ Not applicable | ✅ Current `serve` listener or discovered shared service, always verified against the plugin PID |
| **Active session protection** | Timer: no session context; Manual `/sweep`: auto-protected | Timer: auto-protected via `session.active()`; Manual: auto-protected |
| **Delete operation** | SDK `session.delete()` | SDK `session.remove()` |
| **Database access** | Reads `opencode.db` SQLite directly | No SQLite read; pure SDK API |

## Installation

### Install with the CLI

Register the plugin in the global OpenCode config under `XDG_CONFIG_HOME/opencode` (or `~/.config/opencode` when `XDG_CONFIG_HOME` is unset):

```bash
npx opencode-sweeper@latest install
```

New configs default to V1. To explicitly use V2:

```bash
npx opencode-sweeper@latest install --format v2
```

For an existing plugin entry, the CLI updates only its package version and keeps its options; it supports V1 tuples and V2 package/options objects, and preserves JSONC comments. It refuses duplicate or ambiguous entries rather than choosing one. A higher existing version pin is not downgraded.

The plugin defaults to `dryRun: false` and `interval: "1h"`, so it can delete sessions automatically after loading. Before starting or restarting the OpenCode host, set `dryRun: true` in the installed config and review the reported candidates.

V1 only: when OpenCode's `plugin_origins` identifies one unique config source, the plugin asynchronously checks npm and may update the version pin on disk. The change takes effect after restarting OpenCode; it does not hot-replace the running plugin. If the source cannot be identified uniquely or the check/update fails, it is skipped.

For this plugin's V2 runtime, a background npm registry check is attempted only when `plugin.list` reports exactly one active server package for the current location and its `source.target` exactly matches the package spec in one unique, safe V2 `plugins` entry in the global or current-location config. If the registry's latest version is newer than both the running version and any exact version pin, the updater locks and rechecks the source/config before changing only that entry's version spec. Object options and JSONC formatting are preserved; restart OpenCode for the new version to take effect. This does not create config, install dependencies, or hot-reload the running plugin. Local `file://` plugins, untrusted or ambiguous sources/configs, unsupported specs, invalid options, and a plugin that is no longer installed are skipped. OpenCode's native `opencode plugin update` does not upgrade exact pins; this plugin's V2 background updater can advance a trusted config pin when those checks pass. You can still explicitly update through `npx opencode-sweeper@latest install --format v2`. This is a scoped update path for opencode-sweeper, not a promise that all V2 plugins update automatically.

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
| `dbPath` | `string` | — | Optional override for the opencode SQLite DB path. Only used in V1 mode. Defaults to `$XDG_DATA_HOME/opencode/opencode.db`, or `~/.local/share/opencode/opencode.db` when unset or empty, including on macOS. Set for a non-standard database location or filename. |

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

If `dbPath` is not set in the plugin options, the path resolves to `$XDG_DATA_HOME/opencode/opencode.db`, or `~/.local/share/opencode/opencode.db` when `XDG_DATA_HOME` is unset or empty, including on macOS. This follows OpenCode's [XDG-based data directory](https://github.com/anomalyco/opencode/blob/v1.2.27/packages/opencode/src/global/index.ts). Use the plugin's `dbPath` option for a non-standard database location or filename; the plugin does not probe other databases.

If the database is missing, the sweep stops before deletion and reports the attempted path with instructions to check `XDG_DATA_HOME` or set `dbPath`. Other database-open failures include the path and underlying error. Timer sweeps log the same diagnostic.

### OpenCode V2 Mode

V2 mode activates automatically when the plugin detects it's running in an OpenCode V2 host (via the `setup` function's dynamic import of `./v2.js`). The key differences:

1. **Session listing via SDK API**: Uses the complete `OpenCode.make()` client, including `session.active()`. The current process's explicit `serve --hostname/--port` listener is tried first, with authentication from `OPENCODE_SERVER_USERNAME` (default `opencode`) and `OPENCODE_SERVER_PASSWORD`. Shared-service discovery is a second candidate source. All sessions are enumerated via `session.list()` with pagination (`listAll` function) — no direct SQLite access required.
2. **Process verification**: Every candidate must pass `client.server.info().pid === process.pid` before any session scan or deletion. A different global service is never accepted merely because the current listener is unavailable. Once verified, one client is used for the entire sweep; failures do not switch the running sweep to another server. No port scanning, guessed default port, or OpenChamber-specific path is used. An unknown listener, dynamic port `0`, or unavailable authentication cannot be assumed safe; if no candidate can be verified, the sweep fails closed.
3. **Active session protection**: The timer sweep calls `client.session.active()` to get all currently active session IDs and protects them automatically via `protectedNow = new Set([...protectedIDs, ...active])`.
4. **Delete operation**: Uses `client.session.remove({ sessionID: id })` instead of `session.delete()`.

#### V2 Pre-delete Checks and Concurrency Limits

V2 plugin sweeps share a serial queue across location instances in the same JavaScript realm, covering client verification, global snapshots, and deletion. Each invocation keeps its own options, protections, and result. The `sweepQueueID` in load logs identifies the actual shared queue; this is not a cross-Worker, cross-realm, or cross-process lock.

Immediately before removal, V2 refreshes the paginated session list and active IDs. It refuses removal if the candidate disappeared, its child-tree membership or parent links changed since the initial snapshot, any member of the fresh subtree is protected/active or not expired under its own threshold and grace period, or the candidate is in the protected-ancestor closure. These checks are still not atomic with the subsequent `session.remove()` request.

The fresh list/active checks and the subsequent `session.remove()` are not atomic. A session can become active or otherwise change after the checks and before the server processes DELETE, so it may still be removed. Plugin unload or cancellation can stop later requests and signal an in-flight request, but cannot retract a DELETE already accepted by the server. V2 treats `SessionNotFoundError` as success only when its `sessionID` matches the exact target being removed; a missing child ID is not treated as success for a different parent removal.

**Use one host per database.** `session.active()` reports activity in the connected host, not activity in every process sharing its database. PID verification establishes the request's destination, not exclusive ownership of stored sessions. Two independent hosts using the same database can see the same sessions while missing each other's active sessions. Disabling only one sweeper timer does not fix this blind spot. Use one host with multiple clients (for example, native OpenCode can connect to an OpenChamber-owned service using `opencode --server URL`), or use genuinely separate data directories. Neither manual nor scheduled cleanup is safe to enable on a shared database with independent concurrent hosts. This plugin does not enforce database ownership or provide cross-process activity coordination.

**Do not stop the host running your maintenance session.** Establish the execution host before changing service lifecycle settings; being able to read the same session from another endpoint is not proof of host identity. `opencode service set disabled true` also stops the shared service, so it is not a harmless preference change. If a stop/restart is necessary, have the operator perform it outside the affected session. A supported location reload can load a new plugin without replacing the host process, but cancels pending permissions/forms; check those first.

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

Setting `"interval": 0` on all but one process reduces duplicate timers, but does not serialize manual sweeps or protect activity in other hosts. Do not use it as a substitute for one host per database or separate data directories.

### Warning C: LLM-mediated manual path

`/sweep` invokes the plugin's `sweep` tool **through the model**: the markdown command template tells the model to call the tool and report its output. A tiny LLM round-trip occurs on every `/sweep`. If your model provider has strict rate limits, prefer the background timer over frequent manual sweeps.

### Warning D: Multiple concurrent opencode processes (V1)

Same as Warning B — V1's SQLite-based approach has the same per-process timer semantics. The SQLite scan is read-only, and a repeated delete of an already-absent target is handled as success. Neither fact makes the scan and cascading SDK deletion atomic or prevents races involving descendants.

### Warning E: V2 Process mismatch (fail-closed)

Every V2 endpoint candidate is checked using `client.server.info().pid === process.pid`. A candidate with a mismatching PID is rejected. If none can be verified, the plugin **refuses to scan or delete sessions and reports an error**. This can occur when only another process's shared-service registration is available, or when the current host's listener/authentication cannot be determined. Do not remove the PID check to make cleanup run. A matching PID does not make independent hosts sharing one database safe; see [V2 Pre-delete Checks and Concurrency Limits](#v2-pre-delete-checks-and-concurrency-limits).

## Surfaces

| Surface | Source | Purpose |
|---|---|---|
| `sweep` tool | `Hooks.tool.sweep` (registered via `tool()` helper from `@opencode-ai/plugin`) | Deterministic deletion + summary `ToolResult` |
| `/sweep` slash command | Plugin `config` hook injecting `sweep` into `Config.command` (no `commands/sweep.md` needed) | TUI slash palette entry + model prompt template invoking the `sweep` tool |
| V2 `sweep` tool | `ctx.tool.transform` in `src/v2.ts` | Registers the manual cleanup tool in the V2 plugin host |
| V2 `/sweep` command | `ctx.command.transform` in `src/v2.ts` | Adds the manual slash command when one is not already registered |

## Development

本地开发和测试需要 Bun >= 1.4.2；推荐使用 `.bun-version` 指定的版本，与 CI 和发布保持一致。Bun 1.3.x 的 `ResolveMessage` 不继承 `Error`，会导致 V2 插件入口解析测试失败；无需为此修改插件入口或升级 OpenCode 依赖。

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
   v2.ts         # OpenCode V2 runtime implementation (verified host client, pagination)
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

1. For a local checkout, run `bun run build` first, then configure the V2 `plugins` package/options object using its `file://` directory URL as shown in [Installation](#installation). Keep the real expiry/grace thresholds, set `dryRun` to `true`, and use `interval: "1m"` temporarily to observe a real timer tick. Back up persistent data before any deletion, and ensure each database has only one host.
2. Start/restart the V2 host. Verify the `sweep` tool and `/sweep` command are available; invoke `/sweep` and confirm the summary is returned.
3. Check the host's console output for `opencode-sweeper timer sweep` or `opencode-sweeper timer error`. The minimum non-zero interval is `1m`; allow at least one interval for the first timer tick.
4. V2 checks fresh pagination, active sessions, protected ancestors, and the candidate's complete subtree before each removal. These checks are not atomic with the server-side removal; a session may change after the checks. Unload/cancellation does not retract a DELETE already accepted by the server. Review dry-run output before setting `dryRun` to `false`.
5. Exercise both native shared-service and explicit private `serve` modes. Confirm the verified PID is the plugin's host, and that an unrelated shared-service registration is not selected. For real deletion, compare session IDs before and after, including retained active sessions and ancestors; a summary count or a mock test alone is not end-to-end evidence. Restore the normal timer interval after verification.

## Release

发布流程由 Release Please 自动化（版本计算、Release PR、GitHub Release 与 npm 发布）。维护者请阅读 [RELEASING.md](./RELEASING.md)。
