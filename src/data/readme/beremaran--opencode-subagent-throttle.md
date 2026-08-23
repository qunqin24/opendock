# opencode-subagent-throttle

[![npm](https://img.shields.io/npm/v/@beremaran/opencode-subagent-throttle.svg)](https://www.npmjs.com/package/@beremaran/opencode-subagent-throttle)
[![License](https://img.shields.io/npm/l/@beremaran/opencode-subagent-throttle.svg)](LICENSE)
[![CI](https://github.com/beremaran/opencode-subagent-throttle/actions/workflows/ci.yml/badge.svg)](https://github.com/beremaran/opencode-subagent-throttle/actions/workflows/ci.yml)

An OpenCode plugin that limits how many `task` tool calls run concurrently. Excess calls remain queued as pending in FIFO order; they are never rejected or silently dropped.

## Why Queue Instead of Reject

Queuing preserves the parent agent's intent. Every requested task can still run when a slot becomes available, instead of failing because the concurrency limit was reached.

## Installation

Add the plugin to `opencode.json`. The plugin entry file is TypeScript source and is loaded natively by OpenCode:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["/absolute/path/to/opencode-subagent-throttle/src/index.ts", { "maxParallel": 2, "mode": "session" }]
  ]
}
```

For OpenCode 1, if the plugin is published to npm, the string form works too,
including options in the tuple:

```json
{
  "plugin": [
    ["@beremaran/opencode-subagent-throttle", { "maxParallel": 2, "mode": "session" }]
  ]
}
```

OpenCode 2 uses the plural `plugins` field and the package root's `{ id, setup }`
entrypoint:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "@beremaran/opencode-subagent-throttle",
      "options": { "maxParallel": 2, "mode": "session" }
    }
  ]
}
```

For a local OpenCode 2 plugin, use `"./src/v2.ts"`. The legacy OpenCode 1
entrypoint remains `"./src/index.ts"` (or the package's `./server` export).

Restart OpenCode after adding the plugin because configuration is loaded at startup.

## Configuration

Options are provided as the second item in the plugin tuple.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxParallel` | number | `2` | Maximum number of subagent tasks that may run at once. |
| `mode` | string | `"session"` | `"session"` creates a separate throttle pool per session. `"global"` shares one pool across the whole OpenCode instance. |
| `maxWaitMs` | number | `3600000` | Watchdog backstop in milliseconds. A task holding a slot longer than this is force-released with a warning log. The default is 60 minutes. |
| `notifyQueue` | boolean | `false` | When enabled, injects a status line into the session transcript when a task is queued (`⏳ Task queued — position 3 of 5 (2 running)`) and when it starts (`▶ Task started`). |

The common `"session"` mode is useful for one agent's fan-out. In `"global"` mode, all sessions share the same pool.

## How It Works

The plugin hooks `tool.execute.before` for the `task` tool and awaits a semaphore slot before allowing the task to proceed. When all `maxParallel` slots are busy, additional calls wait in a FIFO queue and start in order as slots become available. For example, with `maxParallel: 2` and five tasks, two start immediately and three wait; each completed task allows the next queued task to start.

Foreground tasks are the default. The `task` tool blocks until its subagent finishes, so the slot is freed exactly when the subagent completes.

For background tasks (`background: true`), enable the experimental OpenCode flag:

```sh
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true
```

Because a background `task` call returns immediately, its slot remains held until the subagent session actually finishes, detected through the `session.idle` bus event.

If a task call errors, for example because of a depth limit, unknown agent, or permission denial, the slot is released through the tool-error event. The `maxWaitMs` watchdog is the final backstop, ensuring an unforeseen leak such as an aborted or interrupted tool call cannot permanently deadlock the queue.

## Queue Notifications

Set `notifyQueue: true` to make the throttle visible in the OpenCode 1
transcript. When a task has to wait for a slot, the plugin posts a synthetic
line into the parent session via the OpenCode API. The line shows the task's
FIFO position, how many tasks are running, and the total in the pool. When the
queued task finally gets a slot, a second line announces that it started. Lines
for background tasks include `, background`. OpenCode 2 does not currently
expose the ignored/no-reply transcript insertion used by this option, so it is
skipped there with a warning.

These notes are sent with `noReply: true`, so the agent loop is not triggered; they are purely informational. They are also sent with `ignored: true`, so they show in the TUI but are excluded from the model's context and never consume tokens or influence the agent.

Each queued task can add up to two transcript lines, so heavy fan-out produces transcript noise. The parent agent is typically blocked waiting on a foreground task while queued, so the notes are mainly for a human watching the TUI. A task aborted while still queued may leave its "queued" line behind without a "started" line.

## Caveats

- Queued task calls appear as a running tool call in the UI while they wait. The model's tool output does not expose queue status.
- With `notifyQueue: true` on OpenCode 1, queue status appears as
  user-message-style lines in the transcript rather than inside the tool
  call's own UI box. The plugin cannot repaint a running tool call's status;
  see Queue Notifications above.
- `"session"` mode throttles per session. A parent agent and each subagent have their own pool.
- This throttles concurrency, not rate. It limits how many tasks run simultaneously, not how many tasks can be created over time.
- The plugin throttles only the `task` tool, not other tools.

## Project Structure

- `src/index.ts` — OpenCode 1 plugin factory and hooks.
- `src/v2.ts` — OpenCode 2 `{ id, setup }` adapter.
- `src/v1.ts` — OpenCode 1 package entrypoint.
- `src/queue.ts` — framework-independent FIFO semaphore.
- `src/manager.ts` — slot manager for active slots, background idle watchers, error release, and the watchdog.
- `test/` — Node test runner tests.

## Development

```sh
npm install
npm run check
```

`npm run check` runs typecheck (`tsc --noEmit`), lint (Biome), and the tests.
Tests use the built-in Node test runner (`node --test`) with Node's native
TypeScript type stripping.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for getting started, manual testing,
and test guidance. [RELEASING.md](RELEASING.md) documents the tag-triggered
release flow, and [SECURITY.md](SECURITY.md) covers the security policy.

## Related

- [opencode-agent-tree](https://github.com/beremaran/opencode-agent-tree) —
  force opencode to act as an orchestrator that delegates every task to
  subagents. This throttle is a good companion: cap fan-out so orchestrator
  delegation does not run away.
- [pi-task-graph](https://github.com/beremaran/pi-task-graph) — a task manager
  for Pi, the companion CLI.
