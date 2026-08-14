# cross-session-messaging

**[中文文档](./README.zh-CN.md)**

An [OpenCode](https://opencode.ai) **plugin** that lets multiple sessions on the same machine communicate with each other — regardless of whether they share the same daemon process. Any session can register its task summary to a shared registry, discover other active sessions, and send a **blocking question** to a target session, which automatically generates an AI reply.

> **Status**: Core implemented — 3 tools + `session.deleted` event hook + TUI panel + **62 unit tests, 0 failures** + clean `tsc --noEmit`.

## Why

In multi-agent orchestration scenarios, sessions need to exchange context across conversations, but OpenCode has no built-in "A asks B" primitive. This plugin fills that gap.

**Why an in-process plugin instead of an external MCP server?** External MCP servers have HTTP timeouts that interrupt long waits. An in-process plugin's `execute()` has no such limitation — it can block for minutes waiting for a reply without the transport layer disconnecting.

**Why file-based IPC?** Sessions may run in different daemon processes (e.g., different terminal windows). The file-based transport layer (`~/.local/state/opencode/messages/`) enables cross-daemon communication without a shared service process. Each daemon runs an `InboxWatcher` that polls for inbound requests belonging to its sessions.

## Three Tools

| Tool | Purpose |
|---|---|
| `register_session(summary)` | Register the current session's task summary to the shared registry |
| `list_sessions(includeSelf?)` | Read the registry to pick targets for `ask_session` (excludes self by default; entries older than 24h are auto-hidden) |
| `ask_session(sessionId, question, timeoutMs?)` | Send a question to the target session and wait for an AI reply. **Never throws** — all failure paths return readable error text |

`ask_session` defaults to a 60-second timeout with a 10-minute maximum. Regardless of the failure type (target not found, timeout, abort, empty reply), it returns descriptive error text and never throws exceptions.

## Workflow

```
Session A (Daemon 1)                    Session B (Daemon 2)
────────────────────                    ────────────────────
1. ask_session(B, question)
   │
   ├─ Validate B exists in registry
   ├─ Write .req.json to messages/
   ├─ Poll for .res.json ...            InboxWatcher scans messages/
   │                                     ├─ Discovers B's .req.json
   │                                     ├─ Validates daemonId ownership
   │                                     ├─ Sends prompt via SDK
   │                                     ├─ Polls for assistant reply
   │                                     └─ Writes .res.json
   ├─ Reads .res.json
   ├─ Cleans up both files
   └─ Returns reply text
```

### Request/Response Lifecycle

1. **Caller** writes `{requestId}.req.json` containing the question
2. **Target's InboxWatcher** picks up the file, validates `daemonId` ownership, sends the prompt via `client.session.promptAsync`, and polls for the assistant reply
3. **Target's InboxWatcher** writes `{requestId}.res.json` containing the reply (or error)
4. **Caller** reads the response and cleans up both files

All file writes use **temp file + rename atomic swap** — readers never see partially written files.

## Storage Locations

| Path | Purpose |
|---|---|
| `~/.local/state/opencode/agents-registry.json` | Shared session registry (or `$XDG_STATE_HOME/opencode/`) |
| `~/.local/state/opencode/messages/` | File-based IPC directory for cross-daemon request/response files |

Both paths are **user-level** (not project-level), so sessions across different git repos can discover each other.

### Concurrency Safety

- **In-process**: An async promise chain (`writeChain`) serializes all read-modify-write operations on the registry within the same daemon process
- **Cross-process**: POSIX temp+rename atomicity ensures readers never see partially written files. Concurrent cross-process writes use last-writer-wins
- **Staleness fallback**: Each registry entry has a 24h TTL on `updatedAt`, serving as a safety net in case `session.deleted` events are missed

## TUI Plugin

The package also exports a TUI plugin (`tui.tsx`) that adds two slash commands to OpenCode TUI:

| Command | Function |
|---|---|
| `/peers` | Opens a navigable dialog listing all registered sessions. Press Enter to copy session info (including `ask_session` template) to clipboard |
| `/register` | Opens an input prompt to register a task summary for the current session |

## Installation

### Plugin (tools + inbox watcher)

Add to `~/.config/opencode/opencode.json` (note: `opencode.json`, **not** `tui.json`):

```jsonc
{
  "$schema": "https://opencode.ai/opencode.json",
  "plugin": ["opencode-cross-session-messaging"]
}
```

### TUI (optional — `/peers` and `/register` commands)

Add to `~/.config/opencode/tui.json`:

```jsonc
{
  "plugin": ["opencode-cross-session-messaging/tui"]
}
```

After changing the config, **fully quit and reopen** OpenCode.

## Development

```bash
bun install
bun run typecheck    # tsc --noEmit
bun test             # 62 tests / 10 files
```

## Directory Structure

```
src/
├── index.ts                 # Entry — PluginModule default export
├── constants.ts             # PLUGIN_ID, timeouts, backoff, TTL, file layout constants
├── types.ts                 # RegistryEntry / Registry / param interfaces / Error subclasses
├── xdg.ts                   # XDG_STATE_HOME resolution + getRegistryPath()
├── logger.ts                # Logger helper with PLUGIN_ID tag
├── registry.ts              # Atomic file I/O + in-process mutex chain
├── fileTransport.ts         # File-based IPC: request/response file write, read, poll
├── inbox.ts                 # InboxWatcher — polls messages/ directory, processes inbound requests
├── askAndWaitForReply.ts    # Send prompt + poll for assistant reply (via SDK)
├── eventHooks.ts            # session.deleted event handler factory
├── abort.ts                 # AbortSignal utilities (abortableSleep, withAbortCleanup)
└── tools/
    ├── registerSession.ts   # Tool: register_session
    ├── listSessions.ts      # Tool: list_sessions
    └── askSession.ts        # Tool: ask_session (file-based IPC orchestrator)
tui.tsx                      # TUI plugin — /peers dialog + /register input (SolidJS)
SKILL.md                     # LLM usage guide (skill definition)
test/manual/
└── MANUAL_TEST_PLAN.md      # 5-scenario E2E manual test plan
```

### Module Dependency Graph

```
index.ts
├── tools/registerSession.ts → registry.ts → xdg.ts, types.ts
├── tools/listSessions.ts   → registry.ts
├── tools/askSession.ts      → fileTransport.ts → abort.ts, xdg.ts
│                            → registry.ts (validation)
├── inbox.ts                 → fileTransport.ts, askAndWaitForReply.ts, registry.ts
├── eventHooks.ts            → registry.ts
├── logger.ts                → constants.ts
└── constants.ts (leaf node)
```

## Known Limitations

- **No deadlock detection** — If A waits for B and B asks A back, both sides will time out independently rather than reporting immediately. The MVP uses timeouts as a fallback without active cycle detection.
- **No authentication** — Assumes a single-user trusted environment. Any session that knows a sessionId can send messages. Multi-user/multi-tenant scenarios require redesign.
- **No message queue** — Each `ask_session` call is an atomic request from start to finish, with no queuing or retry.
- **No cross-session history** — Each `ask_session` is a fresh task for the target — the target session **cannot see** the caller's conversation history. Therefore the `question` parameter **must be self-contained** (include all background, code snippets, and constraints).
- **Polling-based** — Both the inbox watcher and response polling use timers (1s and 500ms respectively) rather than filesystem events. Sufficient for the expected traffic volume.

## Related Documentation

- [`SKILL.md`](./SKILL.md) — LLM usage guide specifying when to call each tool, how to write self-contained questions, and common pitfalls
- [`test/manual/MANUAL_TEST_PLAN.md`](./test/manual/MANUAL_TEST_PLAN.md) — 5 end-to-end scenario scripts for real OpenCode environments

## License

MIT
