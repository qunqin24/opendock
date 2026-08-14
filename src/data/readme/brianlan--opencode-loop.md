# opencode-loop

An [OpenCode](https://opencode.ai) plugin that lets you create, list, and delete **session-scoped recurring loops** (like cron jobs, but temporary).

## Key difference from system cron

These loops live **only in memory**. They automatically disappear when:

- The OpenCode TUI / process exits
- The session is deleted

This is by design — perfect for temporary automation within a coding session without leaving background tasks behind.

## Features

- **cron_create** – Add a recurring loop using standard 5-field cron syntax
- **cron_list** – View loops in the current session
- **cron_delete** – Remove a loop by name

When a loop triggers, it sends a prompt back into the same OpenCode session, so the AI picks it up in the next loop turn.
Schedules use standard five-field cron syntax and the OpenCode server's local timezone. The loop keeps the agent that created it.

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
  "plugin": ["@brianlan/opencode-loop"]
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

Every 5 minutes, the plugin injects a prompt into the current session:
```
[Scheduled loop triggered] "healthcheck": Run the test suite and report any failures
```

The AI then acts on it just like a normal user message.

## Permissions

This plugin inherits the current agent's permission rules. It does not add any new permission surfaces — when the AI acts on a triggered prompt, it goes through the normal OpenCode tool-approval flow.

## License

MIT
