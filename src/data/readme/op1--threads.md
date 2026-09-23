# @op1/threads

Managed top-level worker sessions for OpenCode 2.0.7. The server entrypoint is `index.ts`; the terminal entrypoint is `tui.ts`.

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

The worker opens in a native tab without taking focus. Select that tab to read its conversation. Use `threads_list` to inspect reports and `/threads` to reopen closed worker tabs.

Both the parent and managed workers can use native `subagent` for bounded tasks and role-specific reviews. The parent can mix direct subagent calls with managed threads. Each worker can work directly or delegate within its brief and inherited permissions, then review the results and submit its own combined report.

The parent writes the `task` brief. The plugin appends an explicit reminder that native delegation is optional and that workers cannot call `threads_spawn`. Include the worker's delegation budget in the brief. Use `No children` only when the task requires it, since that also rules out native subagents.

## Tools

The native tool names use namespace `threads` and individual names `spawn`, `list`, `send`, `interrupt`, `hide`, and `report`.

| Tool | Input | Result |
| --- | --- | --- |
| `threads_spawn` | `{ key, title, directory, task, agent? }` | Worker view |
| `threads_list` | `{}` | `{ workers: WorkerView[] }` |
| `threads_send` | `{ workerID, key, text }` | `{ workerID, messageID }` |
| `threads_interrupt` | `{ workerID }` | Worker view |
| `threads_hide` | `{ workerID }` | Worker view |
| `threads_report` | `{ verdict, summary, evidence }` | `{ workerID, report }` |

All fields are strings except `evidence`, which is an array of strings. Verdicts are `PASS`, `PASS WITH NOTES`, `FAIL`, and `INCONCLUSIVE`. Each tool returns JSON in native `content` and the same value in `output`.

`directory` must exist and be absolute. Without `agent`, the worker inherits the coordinator's active agent and resolved model, with agent permissions followed by session permissions.

Set `agent` to use a configured profile, such as `agent: "vera-core"` for a VERA workstream or `agent: "vera-auditor-readonly"` for an independent review. The plugin resolves the profile in the assigned directory. OpenCode supplies its system prompt and step limit. The profile's model and variant take precedence; a profile without a model inherits the coordinator's resolved model. Explicit selection supports `primary`, `all`, and `subagent` profiles on OpenCode 2.0.7.

Explicit selection requires the caller's ordered agent and session rules to allow `subagent` for that exact agent ID. A matching `deny` or `ask` rejects the request before creation. OpenCode's plugin API cannot request approval for an input-dependent agent ID.

A selected worker uses its profile's permissions. Parent session `deny` and `ask` rules at creation become hard denials on the worker, and parent allows are not copied. This conservative rule also drops parent allow exceptions that follow a denial. It prevents inherited permissions from relaxing a read-only profile. Each managed worker receives one explicit grant for `threads_report`, whose handler verifies ownership. Native subagents retain their own profiles and inherit those session restrictions. Omitting `agent` keeps the existing inheritance behavior.

Tool identity comes from the calling session. Only the owning coordinator can send, interrupt, or hide a worker. Only the exact original top-level worker can report. Native subagents and managed workers cannot spawn managed workers. Native `subagent` remains available.

## Identity and retries

The coordinator ID and spawn key determine the worker ID. Worker metadata contains `opThreads` with exactly `workerID`, `coordinatorID`, `key`, `fingerprint`, `initialMessageID`, and `reportMessageID`. Explicit-role workers also carry `opThreadsRole: true`. There is no native `parentID`.

The first create includes both message IDs. Identical spawn retries reuse the original session and initial message ID, even if the profile configuration has changed. They do not reset its agent or model. Changing the title, directory, task, or explicit agent under that key is an error. Requests that omit `agent` retain their pre-role fingerprint. Startup never replays initial prompts.

The initial prompt hook resolves a selected profile after OpenCode loads the assigned directory's configuration. It rechecks the caller's role authorization and selects the profile's model before admitting the task. If the profile is unavailable, admission fails without running the task. The indexed worker remains recoverable: fix the profile configuration and retry the identical request. Until initialization completes, managed follow-ups and direct prompts are rejected. Initialization is recorded after native admission; a retry repairs that record if interrupted between the two writes.

Send keys are scoped to the worker and determine a stable message ID. A retry with different text is rejected. Each worker has one task and one terminal report. Identical report retries return the original report; conflicting reports are rejected. Send clarifications within the existing task, and use a new spawn key for new work. The persisted report view is keyed by the original report message ID, so recreating a deleted worker cannot inherit an old verdict.

## Worker views and limits

`WorkerView` contains `workerID`, `coordinatorID`, `key`, `title`, `directory`, `agent`, `model`, `outcome`, `report`, and `hidden`. `agent` and `model` reflect the native session's saved selection, or `null` if unset. A model contains `providerID`, `id`, and an optional `variant`.

`outcome` is the native last execution outcome, or `null` before one exists. It is not current activity. Native tabs display current busy, attention, and unread state.

`report` is the explicit worker claim, or `null`. Native `succeeded` means the agent loop completed, not that the assigned task passed.

`hidden` is the desired idle-tab visibility. Current activity, input requests, or selection can keep that tab open.

Plugin option `maxWorkers` defaults to 4 and accepts integers from 1 through 32. Admission is serialized by coordinator within the loaded server process. A worker without a report continues to occupy a slot unless its native outcome is `failed` or `interrupted`. A successful run without a report does not silently free its slot.

## Terminal and RPC

The terminal synchronizes workers before opening native tabs without changing focus. A TUI memory index survives plugin reloads and respects manually closed native tabs. Conversations closed through Activity stay dismissed across restarts. `/threads` explicitly reopens workers for open coordinator tabs, including workers dismissed through Activity. A new TUI recovers the other workers from durable storage. Closing the TUI does not interrupt workers.

Activity shows Main and Worker roles as row subtitles. It omits a leading `[Main] ` or `[Worker] ` from known managed titles, including closed history rows and prefixes reapplied by older clients. Managed identity comes from the worker RPC, including lookups for loaded history conversations whose workers are on older pages. Unrelated prefixed titles remain unchanged.

For open managed tabs, the TUI also removes one legacy prefix from the fresh saved title. The remainder stays unchanged, and empty remainders are not saved. A durable client-storage marker makes this saved-title cleanup one-shot per session. Later intentional prefixed renames remain in saved history, while Activity omits the redundant role label from its display.

When upgrading, restart all existing TUIs. Older 0.1.7 clients still write role prefixes and can reapply them after cleanup.

Workers with `PASS` or `PASS WITH NOTES` reports hide automatically once idle. This also applies to reports saved before upgrading. Unreported workers and `FAIL` or `INCONCLUSIVE` reports stay visible. The selected tab, running workers, and tabs needing input stay open until they are inactive.

The coordinator can call `threads_hide` when a worker is no longer needed. Hiding preserves the conversation and report, survives restarts, and does not free an admission slot. `/threads` restores hidden workers and keeps them visible for inspection. A valid `threads_send` follow-up also restores its worker. Visibility overrides belong to the original report message ID, so recreating a deleted worker cannot inherit its hidden state.

Reports reach the coordinator through silent synthetic messages. They remain available through `threads_list` and the session history without adding a notification row to the conversation. Older report notification rows remain in native history.

With Activity disabled or unable to mount, open native root-session tabs are grouped by OpenCode project ID, including sessions not managed by this plugin. This includes horizontal, narrow, and unsupported-version fallback. Projects follow their first appearance in the current tab order. Worktrees with the same project ID stay together.

Within each project, running sessions and sessions waiting for input come before idle sessions. Tabs with the same priority keep their relative order. Selecting an idle tab does not reorder it. Native tab order is shared between terminals in the same directory, so sorting by each terminal's selection would make them repeatedly undo each other's moves. Idle is a display priority, not a completion verdict. Each tab with unloaded project metadata stays in its own group until that metadata becomes available. Reconciliation moves only out-of-order tabs, without changing focus or closing and reopening them to reorder. Native tabs do not support divider rows.

The RPC definition is `ThreadsRpc` in `src/rpc.ts`, with ID `threads`. `snapshot` is read-only. The user-invoked `restore` method clears hidden state for the supplied coordinators' workers. Both methods accept and return:

```ts
input: { coordinatorIDs: string[] }
result: { workers: WorkerView[] }
```

The input accepts at most 100 coordinator IDs. Raw HTTP RPC requests wrap the input as `{ "input": { "coordinatorIDs": ["ses_..."] } }`. Each method declares `errors: {}` and the RPC declares `events: {}`. The TUI subscribes to native session events and reconciles at most one snapshot at a time, with a three-second missed-event refresh.

## Activity sidebar

Activity replaces the contents of the native left vertical tab rail on compatible OpenCode V2 layouts. Native tabs remain enabled and retain their layout reservation, resize handle, activity state, and session navigation. The prompt and transcript remain native OpenCode UI.

Subtitles start with the project name or folder basename, followed by a distinct location or worktree basename when needed. Main and Worker labels appear only for known managed relationships; ordinary history rows show project and location without a role label.

Rows are grouped in this order:

- **Priority**: permission or form attention, then running work, then unread results or errors.
- **Pinned**: pinned conversations without priority activity.
- **Today**, **Yesterday**, recent weekdays, and older calendar dates, using the local timezone.

Divider lines separate sections. Click a heading to collapse or expand its conversations; the arrow and count show its current state. Collapsed sections stay collapsed across reloads and restarts. This changes sidebar visibility without closing tabs, and `/activities` can still find conversations in collapsed sections.

A session appears once. Priority takes precedence over pinning. Idle does not mean that a task passed. Open-tab status comes from the native tab API; closed history uses available native running and input-request state, without inventing a success status. Date groups use the last native execution's `time.idle`, falling back to `time.updated` for conversations without an execution. Title cleanup therefore does not move an older executed conversation into Today.

Running rows use OpenCode's registered animated dot spinner. Input requests take precedence over the spinner, and it is removed when the session becomes idle.

Colors follow the active theme: selected conversations and date headings use its accent, running indicators use its information color, and input requests use its warning color. Unread errors use the error color. Worker headings and pinned controls use purple, while project subtitles and inactive controls use subdued text. Blank lines separate section headings from conversations and give worker groups space above and below their heading. Long titles are truncated to keep the action buttons separate.

Managed workers appear indented under their main conversation. The stack appears in **Priority** when any member is running, needs input, or has an unread result. Otherwise, a pin on any visible member places the stack in **Pinned**; date sections use the most recent member activity. Workers with an unavailable main conversation remain standalone rows.

Each main conversation with workers has a **▾ Workers (N)** heading below its subtitle. Click the heading to collapse the worker list, or **▸ Workers (N)** to expand it. When the list is collapsed, the main row summarizes worker activity, with input requests taking precedence over running spinners. Collapsing keeps the workers running and their tabs open. Stack preferences survive reloads and restarts, and `/activities` still lists collapsed workers.

Activity fetches the 100 most recent root sessions across projects and refreshes them in the background. Open and pinned sessions are merged into the list; older pins and known main conversations are resolved individually. Archived, deleted, and native child sessions are excluded. Closed managed workers are not reintroduced by fetched history. `/threads` restores their native tabs using the existing worker visibility rules.

Left-click a row to open or focus its real session. Each row has one-click **[◇]** (pin), **[◆]** (unpin), and **[×]** (close from Activity) buttons beside its title. These controls work on both main and worker rows without selecting a background conversation. Closing removes the row and closes its native tab when open. Saved history and the pin preference remain intact. Dismissed rows stay hidden through refreshes, reloads, and restarts. Selecting a closed conversation in `/activities` restores it; `/threads` also restores dismissed managed workers. Reopening a conversation through native session navigation restores its Activity row. Right-click also opens the action menu. The mouse wheel scrolls the list, and the native rail edge remains draggable.

| Command | Action |
| --- | --- |
| `/activity` | Toggle Activity and the native rail |
| `/pin` | Pin or unpin the current conversation |
| `/activities` | Choose a loaded conversation, including closed Activity rows, and restore it if needed |
| `/activity-sections` | Choose a section to collapse or expand |
| `/activity-threads` | Choose a managed worker stack to collapse or expand |
| `/threads` | Restore managed worker tabs |

The same actions are available in the command palette. **+ New session** dispatches OpenCode's registered `session.new` command. Pins use plugin client storage and survive TUI reloads and restarts.

In `/activities`, **Ctrl+F** pins or unpins the highlighted conversation. The picker stays open and preserves your search and selection. This also works for conversations in **Priority**. **Enter** opens the highlighted conversation, and **Esc** closes the picker. The footer shows the current pin action. Configure `threads.activity.choose.pin` in `cli.json` to change the shortcut.

Activity requires vertical tabs. To select the layout and disable Activity by default, configure the terminal plugin in `~/.config/opencode/cli.json`:

```json
{
  "tabs": { "layout": "vertical" },
  "plugins": [{ "package": "@op1/threads", "options": { "activity": false } }]
}
```

Omit `activity` or set it to `true` to enable the sidebar. Keep the server plugin in `opencode.json`; server plugin options are not forwarded to the terminal entrypoint. For local development, replace the package name in both files with the clone's absolute path.

The left rail has no public plugin slot in 2.0.7. `src/activity-rail.ts` is an internal compatibility adapter: it checks a bounded render-tree structure and unambiguous geometry, hides native children while remembering their visibility, and mounts only plugin-owned content. OpenTUI constructors are imported at the terminal entrypoint to preserve host identity. The adapter uses renderer pre-paint callbacks and resize events, not continuous tree polling or root monkeypatches. It restores native children on detach, toggle, and disposal. Compatibility depends on the detected rail structure and geometry, regardless of the OpenCode version string. Unrecognized rail structures, horizontal layouts, and narrow layouts fall back to native tabs. Activity never moves shared native tabs while mounted; native project and activity grouping resumes during fallback.

`src/activity-theme.ts` accepts both `base`/`muted` and legacy `default`/`subdued` theme tokens. Missing colors use a valid fallback before reaching the renderer: assigning an undefined spinner color aborts the entire frame. Accent and worker colors follow the theme's foreground brightness rather than fixed light/dark shade numbers. If a hue lacks sufficient text contrast, Activity uses the theme's normal foreground. The `@opencode/theme` development dependency keeps the host theme types available to TypeScript. Renderer regression tests cover both token shapes and missing colors, including spinner construction and subsequent color updates.

## Verification and limits

Run `bun run typecheck`, `bun test`, and `bun run verify:live`. The live check requires OpenCode V2, Python, and `uv`. It starts a separate local server, a deterministic model endpoint, and a terminal process with isolated configuration and data. It verifies actual tool calls, durable messages, permission restrictions, worker limits, deleted-worker cleanup, restart behavior, and native tab visibility, busy state, and focus.

Run `bun run verify:tabs` to verify project grouping across real git worktrees, activity-based ordering, permission prompts, completed and resumed workers, focus preservation, and TUI reopening.

Run `bun run verify:activity` to exercise Activity enabled against an isolated instance of the installed OpenCode version. The suite clears its own `.audit/activity` artifacts, uses the deterministic model fixture, and reads actual renderer bounds through the test-only TUI probe. It checks layout, click and keyboard navigation, one-click pin and close controls, and native prompt responses. It also covers section and worker-stack collapse, aggregated worker status, title cleanup, worker restoration, fallback layouts, reloads, and restart persistence. `verify:tabs` and `verify:idle-tabs` explicitly disable Activity to inspect native ordering.

Run `bun run verify:roles` to verify named profiles against the native server and deterministic model endpoint. It checks actual system prompts, model variants, native delegation, read-only execution, reporting, and role-aware retries.

Run `bun run verify:idle-tabs` to open two native terminals on different idle sessions in the same directory and verify that their shared tab order stays stable.

Pass an extracted package directory to test the release artifact: `bun run verify:live /absolute/path/to/package`.

The native session and plugin index are separate writes. A crash after session creation but before indexing requires an explicit identical spawn retry. A crash after native report admission but before saving the report view requires an explicit report retry; the native coordinator notification remains canonical and is not duplicated. There is no custom outbox or startup task replay.

Snapshots remove stale index entries for deleted sessions. Admission locking assumes one OpenCode server process. Workers that omit `threads_report` have no task verdict; their native execution outcomes remain visible separately.
