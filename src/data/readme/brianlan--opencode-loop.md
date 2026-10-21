# opencode-loop

An [OpenCode](https://opencode.ai) plugin that lets you create, list, and delete **session-scoped recurring loops** (like cron jobs, but temporary).

Requires OpenCode v2 (tested with 2.1). Use plugin version 0.2.x with OpenCode v1.

## Key difference from system cron

These loops live **only in memory**. They automatically disappear when:

- The plugin unloads or the OpenCode server process exits
- The session is deleted

This is by design — temporary automation without installing persistent system cron jobs.
With V2's shared background service, closing the TUI alone does not necessarily stop loops. Use `cron_delete` to stop them explicitly.

## Features

- **cron_create** – Add a recurring loop using standard 5-field cron syntax
- **cron_compact_create** – Schedule compaction of the current session
- **cron_list** – View loops in the current session
- **cron_delete** – Remove a loop by name

When a prompt loop triggers, it waits until the same OpenCode session is idle before sending its prompt.
Schedules use standard five-field cron syntax and the OpenCode server's local timezone. Prompt loops keep the agent that created them; compaction loops use the current session without switching agents.

## Installation

### Option A: bunx (zero-config)

Run this inside your project directory:

```bash
bunx @brianlan/opencode-loop install
```

This creates `.opencode/plugins/opencode-loop.js` automatically. Restart OpenCode and the plugin is ready.

### Option B: npm package

```bash
bun add -d @brianlan/opencode-loop
# or: npm install -D @brianlan/opencode-loop
```

Then in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@brianlan/opencode-loop"]
}
```

### Option C: manual

Copy `dist/index.js` into `.opencode/plugins/opencode-loop.js` in your project.

## Usage

Once installed, just ask OpenCode:

- "Create a loop called `healthcheck` that runs every 5 minutes and tells me to run the test suite"
- "List my loops"
- "Delete the healthcheck loop"

Example behind the scenes:
```
cron_create(name="healthcheck", schedule="*/5 * * * *", command="Run the test suite and report any failures")
```

Every 5 minutes, the plugin marks the loop as due and sends a prompt once the current session is idle:
```
[Scheduled loop triggered] "healthcheck": Run the test suite and report any failures
```

The AI then acts on it just like a normal user message.

### Busy sessions

Both kinds of loop wait for the session agent loop to become idle before submitting a request. While busy, each loop keeps at most one pending run in the plugin, even if its schedule fires many times. On idle, that run is sent once; missed ticks are not replayed into the session inbox.

Pending loops are sent in first-triggered order, one at a time per session, waiting for idle again before the next request. Other sessions are independent. The cron schedule stays unchanged, and `cron_list` shows loops waiting for idle. Deleting a loop discards its pending run; deleting the session or unloading the plugin also cancels idle waits.

Requests use queued delivery as a safeguard if new user work starts concurrently with submission. They never intentionally steer an active agent loop. Already queued messages from older plugin versions are not removed.

### Scheduled compaction

```js
cron_compact_create({
  name: "hourly-compact",
  schedule: "46 * * * *",
  runImmediately: false,
})
```

This makes compaction due every hour at minute 46 and requests it once the session is idle through OpenCode V2's session compaction interface, without sending a prompt. A successful request does not mean the summary has finished. Compaction is lossy and uses the session's current model, which may incur model usage costs.

Both creation tools accept optional `runImmediately` (default: `false`). Set it to `true` to make one extra run due on creation without changing the cron schedule. It still waits for idle and coalesces with scheduled triggers while waiting. Requests run asynchronously; check `cron_list` for request failures. A failed immediate request leaves the loop scheduled for future runs.

Prompt and compaction loops share names within each session. Use `cron_list` to view either kind and `cron_delete` to remove either kind. Deletion and plugin cleanup stop future triggers, not requests already submitted to OpenCode.

## Permissions

When the AI acts on a triggered prompt, it inherits the creating agent's permission rules and goes through the normal OpenCode tool-approval flow. Compaction loops request compaction directly rather than asking the AI to run a tool.

## License

MIT
