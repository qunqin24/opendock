# opencode-queue

[![npm version](https://img.shields.io/npm/v/@geckom/opencode-queue)](https://www.npmjs.com/package/@geckom/opencode-queue) [![Buy Me A Coffee](https://img.shields.io/badge/Support-Buy%20Me%20A%20Coffee-yellow?logo=buymeacoffee)](https://buymeacoffee.com/geckom)

An [OpenCode](https://opencode.ai) plugin that maintains a global task queue and processes queued work when OpenCode is idle.

## Architecture

The source is split into focused modules under `src/`, while the runtime deploy still ends up as a single bundled plugin file for OpenCode.

- `src/plugin.ts` wires hooks and tools
- `src/queue-manager.ts` owns `queue.json` persistence and serialized state transitions
- `src/queue-processor.ts` runs the queue/session state machine
- `src/schedule-manager.ts` owns cron jobs and delegates persisted mutations back to `QueueManager`
- `src/testing.ts` exposes a test-only surface used by compiled-output tests

## How it works

The plugin stores a shared queue in `~/.local/share/opencode/queue/queue.json`. When OpenCode is idle, one process-wide queue processor picks the next pending item, creates or resumes a session for it, and monitors progress. Blocked items (permission requests, questions) hold the queue until resolved. Completed work enters a review state before final close-out.

### Features

- **Queue management tools** — add, list, confirm, follow up, remove, and retry items
- **Idle processing** — automatically starts the next queued task when OpenCode is idle
- **Permission and question handling** — detects blocked sessions and auto-resumes when you respond through any opencode interface
- **Review gate** — finished work enters `review_pending` state for human sign-off before marking complete
- **Auto-complete on NO_REPLY** — when the AI's final response contains "NO_REPLY" on a line by itself, the item skips review and goes straight to `completed`
- **Task dependencies** — parent-child relationships with configurable dependency modes
- **Retry with backoff** — transient processing errors requeue items as pending with increasing retry delays
- **State-change notifications** — toasts appear only when queued work is ready for review or blocked
- **Scheduled tasks** — one-off (run once at a specific time) or recurring (cron-based) scheduled items that automatically prepend to the front of the queue
- **Schedule management** — pause, resume, and remove scheduled tasks; automatic auto-disable after a configurable number of occurrences
- **Corruption-safe queue store handling** — preserves broken `queue.json` contents for recovery instead of silently resetting state
- **Hot-reload config** — change queue settings without restarting OpenCode

## Tools

| Tool | Description |
|------|-------------|
| `queue-add` | Add a task to the queue |
| `queue-list` | List queue items, with optional status filter and view modes |
| `queue-action` | Manage an existing item: confirm a review, send a follow-up, remove, or retry |
| `queue-schedule` | Add a one-off/recurring scheduled task, or list, pause, resume, or remove schedules |

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@geckom/opencode-queue"
  ]
}
```

Alternatively, install directly from GitHub:

```json
{
  "plugin": [
    "@geckom/opencode-queue@git+https://github.com/geckom/opencode-queue.git"
  ]
}
```

## Configuration

The queue reads its settings from `~/.local/share/opencode/queue/queue.json`. Edit the `config` object there — changes apply immediately without restarting OpenCode.

| Setting | Default | Description |
|---------|---------|-------------|
| `idleTimeoutSeconds` | `3600` | Seconds of inactivity before the next item is processed |
| `maxRetries` | `3` | Maximum retry attempts for failed items |
| `retryDelaysMinutes` | `[5, 10, 15]` | Delay in minutes before each retry attempt |
| `sessionTimeoutMinutes` | `60` | Maximum minutes to wait for a running session before marking it failed |

## Development

Local tests use compiled output from `dist/`, including an internal test surface for the repo test suite. That test-only surface is not exported or published as part of the package contract.

```bash
npm install
npm run build
npm test
```

To deploy into your local OpenCode config:

```bash
npm run build:runtime
```

Smoke test the deployed plugin with:

```bash
opencode --print-logs debug config
```

## License

MIT
