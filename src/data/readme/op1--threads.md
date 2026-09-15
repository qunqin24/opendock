# @op1/threads

Managed top-level worker sessions for OpenCode 2.0.3. The server entrypoint is `index.ts`; the terminal entrypoint is `tui.ts`.

## Install

Install the plugin globally:

```sh
opencode plugin add @op1/threads
```

Or add it to `plugins` in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": ["@op1/threads"]
}
```

Keep the other entries in your plugin list. Open a fresh TUI to load the terminal entrypoint. Session tabs must be enabled.

The `skills/managed-sessions` directory contains the VERA delegation guide. Copy or link it into `~/.config/opencode/skills/managed-sessions` to make it available to agents.

For local development, clone [opzero1/threads](https://github.com/opzero1/threads), run `bun install`, and use the clone's absolute path as the plugin entry instead. The internal plugin ID remains `op-threads`, so switching between local and published installs preserves worker records.

## Delegate work

```text
threads_spawn({
  key: "review-auth",
  title: "Review authentication",
  directory: "/absolute/path/to/assigned-worktree",
  task: "Review the authentication changes. Report findings and verification evidence."
})
```

The worker opens in a native tab without taking focus. Select that tab to read its conversation. Use `threads_list` to inspect reports and `/threads` to reopen closed worker tabs. Native `subagent` remains available for bounded tasks and role-specific reviews.

## Tools

The native tool names use namespace `threads` and individual names `spawn`, `list`, `send`, `interrupt`, and `report`.

| Tool | Input | Result |
| --- | --- | --- |
| `threads_spawn` | `{ key, title, directory, task }` | Worker view |
| `threads_list` | `{}` | `{ workers: WorkerView[] }` |
| `threads_send` | `{ workerID, key, text }` | `{ workerID, messageID }` |
| `threads_interrupt` | `{ workerID }` | Worker view |
| `threads_report` | `{ verdict, summary, evidence }` | `{ workerID, report }` |

All fields are strings except `evidence`, which is an array of strings. Verdicts are `PASS`, `PASS WITH NOTES`, `FAIL`, and `INCONCLUSIVE`. Each tool returns JSON in native `content` and the same value in `output`.

`directory` must exist and be absolute. Spawn uses native `subagent` permission gating. The worker uses the coordinator's agent and model, with resolved agent permissions followed by session permissions. Its actual tool actions still pass through native permission checks. There is no separate directory-approval flow or agent/model override.

Tool identity comes from the calling session. Only the owning coordinator can send or interrupt. Only the exact original top-level worker can report. Native subagents and managed workers cannot spawn managed workers. Native `subagent` remains available.

## Identity and retries

The coordinator ID and spawn key determine the worker ID. Worker metadata contains `opThreads` with exactly `workerID`, `coordinatorID`, `key`, `fingerprint`, `initialMessageID`, and `reportMessageID`. There is no native `parentID`.

The first create includes both message IDs. Subsequent creates adopt the original metadata returned by OpenCode. Identical spawn retries reuse the initial message ID. Changing the title, directory, or task under that key is an error. Startup never replays initial prompts.

Send keys are scoped to the worker and determine a stable message ID. A retry with different text is rejected. Each worker has one task and one terminal report. Identical report retries return the original report; conflicting reports are rejected. Send clarifications within the existing task, and use a new spawn key for new work. The persisted report view is keyed by the original report message ID, so recreating a deleted worker cannot inherit an old verdict.

## Worker views and limits

`WorkerView` contains `workerID`, `coordinatorID`, `key`, `title`, `directory`, `outcome`, and `report`. `outcome` is the native last execution outcome, or `null` before one exists. It is not current activity. Native tabs display current busy, attention, and unread state.

`report` is the explicit worker claim, or `null`. Native `succeeded` means the agent loop completed, not that the assigned task passed.

Plugin option `maxWorkers` defaults to 4 and accepts integers from 1 through 32. Admission is serialized by coordinator within the loaded server process. A worker without a report continues to occupy a slot unless its native outcome is `failed` or `interrupted`. A successful run without a report does not silently free its slot.

## Terminal and RPC

The terminal synchronizes workers before opening native tabs without changing focus. A TUI memory index survives plugin reloads and respects manually closed tabs. `/threads` explicitly reopens workers for open coordinator tabs. A new TUI recovers workers from durable storage. Closing the TUI does not interrupt workers.

All open native root-session tabs are automatically grouped by OpenCode project ID, including sessions not managed by this plugin. Projects follow their first appearance in the current tab order; sessions keep their relative order within each project. Worktrees with the same project ID stay together. Each tab with unloaded project metadata stays in its own group until that metadata becomes available. Reconciliation moves only out-of-order tabs, without changing focus or closing and reopening them. Native tabs do not support divider rows.

The read-only RPC definition is `ThreadsRpc` in `src/rpc.ts`, with ID `threads` and method `snapshot`:

```ts
input: { coordinatorIDs: string[] }
result: { workers: WorkerView[] }
```

The input accepts at most 100 coordinator IDs. Raw HTTP RPC requests wrap the input as `{ "input": { "coordinatorIDs": ["ses_..."] } }`. The method declares `errors: {}` and the RPC declares `events: {}`. The TUI subscribes to native session events and reconciles at most one snapshot at a time, with a three-second missed-event refresh.

## Verification and limits

Run `bun run typecheck`, `bun test`, and `bun run verify:live`. The live check requires OpenCode 2.0.3, Python, and `uv`. It starts a separate local server, a deterministic model endpoint, and a terminal process with isolated configuration and data. It verifies actual tool calls, durable messages, permission restrictions, worker limits, deleted-worker cleanup, restart behavior, and native tab visibility, busy state, and focus.

Run `bun run verify:tabs` to verify project grouping across real git worktrees, new worker insertion, focus preservation, and TUI reopening.

Pass an extracted package directory to test the release artifact: `bun run verify:live /absolute/path/to/package`.

The native session and plugin index are separate writes. A crash after session creation but before indexing requires an explicit identical spawn retry. A crash after native report admission but before saving the report view requires an explicit report retry; the native coordinator notification remains canonical and is not duplicated. There is no custom outbox or startup task replay.

Snapshots remove stale index entries for deleted sessions. Admission locking assumes one OpenCode server process. Workers that omit `threads_report` have no task verdict; their native execution outcomes remain visible separately.
