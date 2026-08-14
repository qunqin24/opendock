# opencode-agent-bridge

[![npm version](https://img.shields.io/npm/v/opencode-agent-bridge)](https://www.npmjs.com/package/opencode-agent-bridge)
[![npm downloads](https://img.shields.io/npm/dw/opencode-agent-bridge)](https://www.npmjs.com/package/opencode-agent-bridge)
[![license](https://img.shields.io/npm/l/opencode-agent-bridge)](./LICENSE)

English | [简体中文](README_zh_CN.md)

OpenCode plugin for cross-session agent collaboration: dispatch tasks, wait for results, completion notifications, and result inspection. Migrated from [multi-agent-bridge](https://github.com/Mooling0602/multi-agent-bridge), everything runs inside the opencode process — no extra server spawned, no external configuration.

## Installation

### CLI installer (recommended)

```bash
opencode plugin opencode-agent-bridge@latest --global
```

Drop `--global` to install for the current project only. The command fetches the package from npm and patches the opencode config. Restart opencode afterwards.

### Manual config

In `opencode.jsonc` (global `~/.config/opencode/opencode.jsonc` or project `opencode.json`):

```jsonc
{
  "plugin": ["opencode-agent-bridge"]
}
```

opencode installs npm plugins automatically at startup. Pin a version with `"opencode-agent-bridge@0.1.1"` if desired.

### Local path (development)

```jsonc
{
  "plugin": ["/path/to/opencode-agent-bridge"]
}
```

Loading resolves `package.json` `exports["./server"]` (i.e. `dist/index.js`), so build once before first use:

```bash
npm install
npm run build
```

## Tools

| Tool | Arguments | Description |
|---|---|---|
| `agent_bridge_dispatch` | `target`, `message` | Dispatch a message to a target session asynchronously. The caller is notified automatically once the target finishes (**no polling needed**) |
| `agent_bridge_wait` | `target`, `message`, `timeout?` | Dispatch a message and **block** until the target replies, returning the full reply; `timeout` defaults to 1800 seconds |
| `agent_bridge_notify` | `sender?`, `message?` | Manually notify the sender session of completion; `sender` is looked up from the dispatch registry when omitted |
| `agent_bridge_check` | `target`, `limit?` | Inspect a target session's status (busy/idle) and recent messages to obtain task results; **call only after the completion notification, never to poll** |
| `agent_bridge_sessions` | `keyword?` | List sessions in the current directory (ID + title), optionally filtered by keyword |
| `agent_bridge_get_self_metadata` | none | Return the calling session's `sessionID` and title (read-only) |

## Environment variables

The plugin injects these into every shell execution (agent tools and user terminals) via the `shell.env` hook:

- `OPENCODE_SESSION_ID`: current session ID
- `OPENCODE_SESSION_CWD`: session working directory

## Usage

### Async mode (notification separated from results)

```
Session A (caller) agent_bridge_dispatch → Session B (receiver) executes the task
    → B finishes → session.idle event auto-notifies A (or B's agent calls agent_bridge_notify as fallback)
    → A receives the notice (completion only, no result content)
    → A calls agent_bridge_check(B) to read B's recent messages (task results)
```

### Sync mode (block until the full result)

```
Session A agent_bridge_wait(B, msg) → B executes → the tool blocks until B replies
    → B's reply is returned to A in full (no notify/check needed)
```

## Concurrency & race behavior

- **Notification dedup**: idle auto-notification and manual `agent_bridge_notify` share the same dispatch record and claim it atomically before sending, guaranteeing at most one notification per task. On send failure the record is restored for later retry by a subsequent idle event or manual notify.
- **Precise reply matching**: each dispatched message is matched to its own reply using watermark (last message ID before dispatch) + text probe + parentID, so concurrent dispatches into the same target never cross wires or misfire notifications.
- **Sync wait timeout**: `agent_bridge_wait` has a timeout fallback (1800s default); use `agent_bridge_check` to inspect progress after a timeout.

### Known limitations

- **Single dispatcher per target**: the registry holds one record per target session. Concurrent dispatches to the same target overwrite earlier records — auto-notification goes only to the last registered caller; overwritten callers can rely on the manual notify instruction embedded in the dispatched message.
- **Multiple opencode instances**: the registry file under `~/.local/share/` is shared globally, but each opencode instance keeps its own in-memory copy and does not observe other instances' writes; across instances, auto-notifications may be duplicated or lost — prefer manual `agent_bridge_notify` in that case.
- **No realtime UI refresh across instances**: multiple independent opencode instances (e.g. two TUI windows) share the same session database, but events are only broadcast within the instance that produced the message. Messages dispatched into a session displayed by another instance do not appear in realtime; reopening/switching the session shows them (no data loss). Prefer a single instance (Web serve, or multiple sessions inside one TUI) for multi-session collaboration.
- **Circular wait**: A `wait`s B while B `wait`s A forms a deadlock; both block until timeout. Avoid circular dependencies — use `dispatch`/`check` combinations instead.
- **Message window**: reply recognition only inspects the latest 50 messages of the target session; in very active sessions a dispatched message may slide out of the window, in which case fall back to manual `agent_bridge_notify`.
- **Registry TTL**: dispatch records older than 7 days are pruned automatically; re-dispatch tasks that outlive the TTL.

## Registry

Dispatch relationships are persisted to `~/.local/share/opencode-agent-bridge/dispatches.json` (`XDG_DATA_HOME` overrides the base directory). Relationships survive opencode restarts.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # tsup → dist/
```

## License

MIT
