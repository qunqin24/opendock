# opencode-bg-agents

Native-task orchestration for [OpenCode](https://opencode.ai) v1.18.25. It adds a
small durable control plane around OpenCode's own background subagents while
retaining the `monitor_*` process-monitor API for compatibility.

## Requirements

This release requires an OpenCode version that provides native background
subagents and must be started with:

```sh
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true opencode
```

The feature gate is mandatory: without it, the plugin cannot dispatch native
background work. The runtime treats `true`, `yes`, `on`, `1`, or `y` as enabled,
matching OpenCode v1.18.25 boolean runtime-flag semantics for
`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`. When available,
the plugin also reads OpenCode's `GET /experimental/capabilities` endpoint. The
plugin coordinates records; it cannot invoke or inspect OpenCode's native
`BackgroundJob` directly.

## Install and configure

Configure the plugin with its tuple options in `opencode.json`:

```json
{
  "plugin": [
    [
      "opencode-bg-agents@0.2.0",
      {
        "max_concurrent": 4,
        "max_monitors": 8,
        "enforce_write_roots": true,
        "require_completion": true,
        "notifications": true,
        "validation_timeout_sec": 600
      }
    ]
  ]
}
```

| Option | Meaning |
| --- | --- |
| `max_concurrent` | Maximum native background tasks managed at once. |
| `max_monitors` | Maximum live monitor processes managed at once. |
| `enforce_write_roots` | Enforce declared roots in write hooks and authoritative completion diffs. |
| `require_completion` | Require a specialist to explicitly report its outcome. |
| `notifications` | Emit lifecycle TUI toasts. |
| `validation_timeout_sec` | Per-command timeout for completion validation. |

Use `bg_setup` to install the templates, or copy them from `templates/`.
Ignore the runtime directory with `.opencode/bg/` (already listed in this
repository's `.gitignore`).

## Managed native-task handshake

The orchestrator never constructs a native task call itself:

1. Call `orch_prepare` with the title, specialist, complete prompt, and exact
   allowed write roots.
2. It returns the **exact native `task(background: true)` invocation**. Invoke
   that returned call unchanged.
3. If preparation queues work because a slot or write root is unavailable, use
   `orch_start` when the control plane reports it can start.

The native task runs independently. The plugin records the orchestration
contract and its completion; it does not own the native `BackgroundJob` or
inspect its live internals. Cancellation is a session abort, so it is
best-effort rather than a process-isolation guarantee.

The orchestration tools are:

| Tool | Purpose |
| --- | --- |
| `orch_prepare` | Validate a task contract, reserve its write roots, and return the native invocation or a queued record. |
| `orch_start` | Start eligible queued work through its prepared handshake. |
| `orch_status` | Show managed tasks, queues, locks, and completion state. |
| `orch_cancel` | Cancel a managed task through session abort and release its reservation. |
| `orch_continue` | Persist context and return an exact one-use native continuation invocation. |
| `orch_complete` | Record the specialist's completed or blocked outcome and trigger the completion gate. |

Tasks move through durable states: `queued`, `ready`, `starting`, `running`,
`blocked`, `checking`, `done`, `failed`, `cancelled`, and `interrupted`. With
`enforce_write_roots`, concurrent
write-capable tasks must have non-overlapping declared roots; a queued task
holds no conflicting write lock until it starts. This guards managed edits, not
arbitrary shell behavior: `bash` commands are not path-contained and can write
outside a declared root.

`require_completion` makes a native task's ordinary final text insufficient.
The specialist calls `orch_complete` with its result, changed files, and
validation evidence (or a clear `blocked` outcome). The completion gate records
`done` only after validation succeeds. A timeout or failed validation rejects
that completion attempt and restores `running` so the specialist can fix the
issue and retry.

Records are stored in SQLite at `.opencode/bg/tasks.sqlite`. Legacy global or
project `bg-agents.json` files remain a soft configuration fallback; tuple
options win. On startup, the plugin reads the v1.18.25 `session.status()` map.
An unlinked `starting` dispatch is marked `interrupted` but retains its lease
until explicit cancellation; inactive linked work is interrupted and released.

## Monitors

For compatibility, process monitors retain their existing names:
`monitor_run`, `monitor_status`, `monitor_read`, `monitor_wait`, and
`monitor_kill`. Use monitors for external commands and real events, not
sleep-based polling. Monitor processes are separate from native task control;
they do not make arbitrary `bash` execution path-contained.
An unclean plugin restart cannot reattach OS processes: persisted running
sidecars are shown as `unavailable` and are not promised controllable.
`monitor_kill` reports recovered `unavailable` records as uncontrollable rather
than claiming they were killed.

## Migration from old `bg_*` tools

Replace the old `bg_dispatch` flow with `orch_prepare` followed by the exact
native invocation it returns. Replace `bg_status`, `bg_cancel`, and `bg_send`
with `orch_status`, `orch_cancel`, and `orch_continue`; specialists report
through `orch_complete` instead of `bg_ask`/implicit final output. Update
agents using the supplied templates. Legacy project/global `bg-agents.json` is
a soft fallback for compatibility; prefer tuple options.

## Caveats

- Native background subagents are experimental and gated by OpenCode.
- Write-root locking coordinates declared managed work only. It cannot sandbox
  arbitrary `bash` commands, network effects, or tools that escape their root.
- Root checks resolve symlinks at hooks and completion, but are advisory and
  TOCTOU-prone rather than a security boundary.
- Validation and monitor commands request native `bash` permission first.
  Once approved, they are full-trust host commands, not sandboxed by roots.
- Cancellation requests a session abort. It cannot guarantee termination of
  every child process started by arbitrary commands.

## License

MIT
