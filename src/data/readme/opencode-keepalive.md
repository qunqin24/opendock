# Opencode Keepalive

OpenCode plugin that keeps sessions alive: emits liveness heartbeats for external watchdogs and detects (and optionally recovers) stalled agents.

---

## Getting Started

`opencode-keepalive` is a "watchdog" plugin for OpenCode. It monitors your agent's activity and helps ensure work doesn't grind to a halt without you knowing.

- **Liveness Log**: Emits continuous JSON telemetry to a background log file.
- **Stall Detection**: Automatically detects when an agent is "busy" but has stopped making progress.
- **Auto-Recovery**: Can automatically unstick stalled subagents by aborting them and nudging the parent agent to resume.

### Installation

```bash
npm install opencode-keepalive
```

Enable it in your `opencode.json` (or `opencode.jsonc`):

```json
{
  "plugins": [
    ["opencode-keepalive", {
      "childStallAction": "abort-resume-parent"
    }]
  ]
}
```

### Quick Start

By default, the plugin works out of the box with zero configuration. It appends NDJSON (Newline Delimited JSON) heartbeats to:

```bash
~/.local/state/opencode-keepalive/heartbeat.ndjson
# or $XDG_STATE_HOME/opencode-keepalive/heartbeat.ndjson
```

You can view the pulse of your agent in real-time:

```bash
tail -f ~/.local/state/opencode-keepalive/heartbeat.ndjson | jq .
```

### Common Recipes

**1. Pipe to an external watchdog**
If you are using a process manager like Harbor that expects heartbeats on stdout:
```json
["opencode-keepalive", { "output": "stdout" }]
```

**2. Enable automatic subagent recovery**
To have the plugin automatically abort hung subagents and ask the parent to retry:
```json
["opencode-keepalive", { "childStallAction": "abort-resume-parent" }]
```

**3. Silence all output**
To keep the stall detection logic running but stop writing to any log:
```json
["opencode-keepalive", { "output": "none" }]
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `intervalMs` | `number` | `10000` | Interval between standard heartbeats (ms). |
| `includeDetails` | `boolean` | `true` | Include event types, tool names, and stall details. |
| `includeSessionID` | `boolean` | `true` | Include session IDs in heartbeats. |
| `stallMs` | `number` | `120000` | Duration of no-progress before triggering a stall (ms). |
| `childStallAction` | `string` | `"report"` | Action for stalled children: `"report"` or `"abort-resume-parent"`. |
| `maxStallRecoveries` | `number` | `3` | Max recovery attempts per child session. |
| `abortWaitMs` | `number` | `30000` | Wait time after abort before nudging parent (ms). |
| `toolStallMsByTool` | `object` | `{...}` | Per-tool stall budgets (e.g., `{"glob": 60000}`). |
| `bashQuickStallMs` | `number` | `60000` | Stall budget for "quick" bash commands (ls, cat, etc.). |
| `resumeMessageTemplate`| `string` | `...` | Template used for parent nudge messages. |
| `output` | `string` | `"file"` | Where to write: `"file"`, `"stdout"`, `"stderr"`, or `"none"`. |
| `logFile` | `string` | `...` | Custom path when `output` is `"file"`. |

### Troubleshooting

- **No heartbeats appearing?** Check the `logFile` path. If you are on a non-standard system, ensure `XDG_STATE_HOME` is set or provide an explicit `logFile` path.
- **False positive stalls?** If a long command (like a large `git clone`) is stalling, it might be classified incorrectly. You can unmap bash stall budgets by setting `toolStallMsByTool: { "bash": null }`.
- **Too much log noise?** Increase `intervalMs` to reduce the frequency of keepalive pulses.

---

## How It Works

### Event Model

The plugin emits envelopes with `type: "heartbeat"`. The behavior is driven by 7 distinct triggers:

| Trigger | When it fires |
|---------|---------------|
| `event` | Any OpenCode event (except other heartbeats). |
| `idle` | Periodic pulse when the system is completely idle. |
| `tool.execute.before` | Immediately before a tool starts running. |
| `tool.execute.after` | Immediately after a tool finishes. |
| `tool.running` | Periodic "keepalive" pulse while a tool is in-flight. |
| `stall` | Fired when the stall budget is exceeded. |
| `stall.recovery` | Fired during an automatic recovery attempt (or error). |

**Example Envelope:**
```json
{
  "type": "heartbeat",
  "properties": {
    "source": "opencode-keepalive",
    "timestamp": "2026-07-28T12:00:00.000Z",
    "unixMs": 1785240000000,
    "trigger": "stall",
    "sessionID": "sess_123",
    "parentID": "sess_000",
    "stalledForMs": 120000
  }
}
```

### Emission Internals

1. **Throttling**: Standard events are batched. If an event occurs within `intervalMs` of the last heartbeat, it is held in a "pending" slot and flushed later. `stall` and `stall.recovery` triggers bypass this throttle for immediate visibility.
2. **Keepalive Timer**: While a tool is active, a dedicated timer re-emits the last `tool.running` signal at the `intervalMs` frequency. **Crucially, these keepalives do NOT reset the stall clock.**
3. **Backpressure**: When writing to `stdout` or `stderr`, the plugin respects stream drain signals to avoid memory bloat during heavy event volume.

### Stall Detection Model

A session is considered **stalled** if its status is `busy` but no **progress** has been noted for the duration of its effective budget.

- **Progress is**: Message updates (`part.updated`, `part.delta`), tool lifecycle events (`before`, `after`), or command events.
- **Progress is NOT**: Internal heartbeats or `tool.running` keepalives.

#### Effective Budgets
The plugin uses a "strictest fuse" rule:
1. **No tools in flight**: Uses global `stallMs`.
2. **Mapped tools in flight**: If tools like `glob` or `grep` are running, the **minimum** of their mapped budgets is used (default 60s).
3. **Unmapped tools only**: If only unmapped tools (like a long `npm install`) are running, the short-fuse timer is disabled entirely to avoid false positives.

### Bash Classification

The `bash` tool is special. The plugin inspects the first segment of the command to classify it:
- **Quick**: `cat`, `ls`, `grep`, `jq`, `mkdir`, `rm`, etc. These use `bashQuickStallMs`.
- **Long**: `npm`, `docker`, `git`, `python`, `tsc`, `vitest`, etc. These are unmapped by default.
- **Unknown**: Fail-safe to **Long**.

### Subagent Recovery

When `childStallAction` is `"abort-resume-parent"`:
1. `stall.recovery` is emitted.
2. The plugin calls `session.abort(childID)`.
3. It waits for the child to become idle (up to `abortWaitMs`).
4. It sends a synthetic prompt to the **parent** session with the `task_id` of the stalled child, allowing the parent to naturally resume the work.

### Architecture Tour

| Module | Responsibility |
|--------|----------------|
| `index.ts` | Entry point; wires options to state and hooks. |
| `hooks.ts` | OpenCode lifecycle hooks; translates events to heartbeats/progress. |
| `heartbeat.ts` | The core emission engine, throttler, and timers. |
| `sessions.ts` | State tracking for active sessions and progress timestamps. |
| `tools.ts` | Tool name normalization and effective budget calculation. |
| `bash-command.ts` | Logic for classifying bash commands as quick vs long. |
| `recover.ts` | Implementation of the abort-resume-parent sequence. |
| `state.ts` | Runtime state and IO abstraction (the test seam). |

### Edge Cases

- **Unmapped Silence**: If an agent is running an unmapped tool (like `sleep 300`) and the model is silent, the plugin will not stall. It relies on the external worker wall timeout.
- **Waiting for User**: When an agent is blocked on a `permission.ask` dialog, the stall timer is automatically disarmed to prevent "stalling" while waiting for you.

---

## License

[MIT](LICENSE)
