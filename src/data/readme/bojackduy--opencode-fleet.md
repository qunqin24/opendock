# opencode-fleet

Lightweight orchestrator → workers for OpenCode (file spool + `prompt_async`, takeover-friendly; v1+v2 compatible).

One commander session fans out self-contained tasks to all registered worker sessions, watches `DONE:` replies, and reports back. Every delegation lands as a **normal user message**, so manual takeover with `revert / fork / continue` keeps working. Killing the commander never breaks workers.

> Scope: **v1+v2** (plugin id `fleet`; v1 `opencode` 1.18.32 via `/opt/homebrew/bin/opencode`, v2 `2.0.16+`).

## Install

```jsonc
// opencode.jsonc (v1 shape)
{ "plugin": ["file:/Users/duytrinh/Code/opencode-fleet"] }
```

Or from npm once published:

```jsonc
{ "plugin": ["@bojackduy/opencode-fleet"] }
```

## Tools

| Tool | What it does |
| ---- | ------------ |
| `fleet_register` | Register current session (daemon, directory, summary) |
| `fleet_list` | List workers **you own** (per-commander scoped, 24h TTL, excludes self by default; `scope:"all"` for the explicit global roster) |
| `fleet_tree` | Hierarchy grouped by parentID over workers **you own** + self (`scope:"all"` for the explicit global hierarchy) |
| `fleet_discover` / `fleet_ps` | Discover live sessions + process/port join (v1 API first; ownership-annotated: owner / `unassigned` / `unknown`; default hides workers owned by other commanders, `scope:"all"` for the explicit global roster) |
| `fleet_assign` / `fleet_unassign` / `fleet_transfer` | Claim a worker, release (one or all), transfer to another commander — exactly one owner per worker |
| `fleet_my_workers` / `fleet_unassigned` | Your owned workers (incl. stale rows) / claimable workers with no owner |
| `fleet_recover_commander` | After a daemon restart: recover your workers from a dead `oldDaemonId` to your current daemon (same sessionId, old pid must be exited; worker keys preserved, generations bumped) |
| `fleet_broadcast` | Fan out to **your owned workers** by default / `only:[...]` (each must be yours) with `agent/model/variant`, waits for `.res.json` |
| `fleet_exec` | Fast direct `promptAsync` + abort/retry, spool fallback — gated to workers you own (`force` never bypasses ownership) |
| `fleet_status` / `fleet_thread` | Compact status + `DONE:` extraction over your owned workers / thread view |
| `fleet_watch` / `fleet_ack` | Watch **your own** assignment events (`join/leave/idle/done/role/transfer`); explicit ack advances the cursor |
| `fleet_handoff_back` | Worker hands corrected result back to the **current** owner (`Re:reqId`; survives `.req` cleanup, transfer-aware) |
| `fleet_agents` / `fleet_models` | List available agents / models |
| `fleet_allow` / `fleet_block` / `fleet_policy` | Commander allowlist + `commander-only/accept/hold/refuse` inbound policy |
| `fleet_summary` / `fleet_group` | Grouped counts + last `DONE:` per group over workers you own |

## Assignment workflow

Multiple commanders share one fleet with **exactly one controlling commander
per worker** (composite identity `runtime + daemonId + sessionId` — bare
`ses_` ids that collide across v1/v2 must use the full selector):

1. `fleet_discover` (or `fleet_unassigned`) → find a claimable worker.
2. `fleet_assign` → claim it. A second commander's claim fails with
   `owned-by-other`; only the owner can exec/broadcast/status it, transfer
   it, or release it.
3. `fleet_exec` / `fleet_broadcast` / `fleet_status` / `fleet_list` /
   `fleet_summary` default to **your owned workers only**. Queued requests
   carry a generation stamp that is revalidated at delivery: a transfer that
   races the queue makes the old envelope stale (readable re-send error,
   never orphan-delivered).
4. `fleet_transfer` → hand a worker to another commander. In-flight
   handoffs follow: `fleet_handoff_back` routes to the **current** owner via
   a durable origin that survives `.req` cleanup.

Every delegation still lands as a normal user message (`agent` / `model` /
`variant` / `system` replay hints preserved), and the global inbound policy
(`commander-only` default, `hold`, `refuse`) is enforced after ownership on
both send and delivery.

Current limit: file events alone do not wake an idle AI automatically.
`fleet_watch` surfaces your assignment events (`join/leave/idle/done/role/
transfer`) as journal rows you poll for — no automatic prompt is injected
into an idle model when a file lands. A commander (human or a looping agent)
must read `fleet_watch` and act; likewise a worker only sees a delegation
when its session is live enough to receive the injected user message. Plan
polling accordingly.

## Restart recovery

Same-process hostname flips heal automatically on the next heartbeat. After
an actual daemon restart, quit and reopen OpenCode with the updated plugin,
resume the **same** commander session ID, and register it if it has not yet
heartbeated. Once the old PID has exited, run from that live commander session:

```
fleet_recover_commander({ oldDaemonId: "Mac.lan-81615-4096:v1" })
```

Only `assignment.commanderKey` migrates. Worker keys from a restarted daemon
remain stale: same-process hostname changes heal on worker heartbeat, but a
worker restarted under a new PID is a different identity and needs an explicit
release/reassignment before it is controllable again. Each recovered row's
generation bumps so old queued stamps go stale, and the journal/ACK cursor
plus handoff origins follow. Refuses when
the old pid is still alive, the caller is not the same live commander, or
journals/origins are corrupt — never copy state files between machines.

## Protocol

Delegated prompts are wrapped as:

```
[from fleet <reqId> | commander:<id>]
<self-contained task>
Reply ending with exactly: DONE:<one-line-result>
```

Workers reply via `.res.json`; commanders are auto-notified via `.notify.json`.

## loopd goal awareness (read-only)

Fleet rows surface the loopd goal behind a worker when the worker's project
uses loopd: fleet reads the project-local `<directory>/.opencode/loopd/state.json`
and joins on the worker (or owner) session ID.

- `fleet_list` / `fleet_my_workers` gain an appended `loopd` column
  (`<goal-name>:<status>/<phase>`, `-` when none).
- `fleet_status` rows append `| loopd:<goal-name>:<status>/<phase>` when matched.

Read-only and fail-open: the state file is never written, missing/corrupt/
oversize state renders as `-` (or no suffix), and existing columns are
unchanged (append-only).

## OpenCode v2

The same entry line works in **both** runtimes (minimum v2 `2.0.16`): v2
migrates the v1 `plugin` list and loads the dual-shape `dist/index.js`
(`{ id, server, setup }` — v1 runs `server`, v2 runs `setup`).

```jsonc
// already have this? nothing to add — it loads on v2 too.
{ "plugin": ["file:/Users/duytrinh/Code/opencode-fleet"] }
```

Otherwise:

```sh
opencode2 plugin add @bojackduy/opencode-fleet
```

```jsonc
// opencode.jsonc (v2 shape)
{ "plugins": ["@bojackduy/opencode-fleet"] }
```

Caveats:

- Do **not** point a v2 `plugins` entry at a file path (`…/dist/index.js`
  is rejected — "must be a directory"). Use the package spec above, or an
  absolute directory that contains `server.*`/`index.*` at its root.
- All `fleet_*` tools register natively per location; identity is the
  calling `sessionID`. Delegation routes by the target row's `runtime`:
  same-process in-process prompt → remote v2 HTTP (`POST
  {url}/api/session/{id}/prompt`, password read from
  `state/opencode/service.json` only on URL match at send time, never
  logged/persisted/registered) → file-spool fallback, which is also the
  universal v1↔v2 path. Every delegation still lands as a normal user
  message ending in a `DONE:` reply.
- v1 behaviour is unchanged (v1 pin `@opencode-ai/plugin 1.18.32` kept for
  v1 paths; v2 uses structural types only).

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE).
Original work by Duy Trinh (bojackduy), 2026. CI/publish pipeline adapted
from [@bojackduy/opencode-loopd](https://github.com/bojackduy/opencode-loopd).
