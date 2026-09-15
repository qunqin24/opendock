# opencode-subagent-throttle

[![CI](https://github.com/beremaran/opencode-subagent-throttle/actions/workflows/ci.yml/badge.svg)](https://github.com/beremaran/opencode-subagent-throttle/actions/workflows/ci.yml)

An OpenCode plugin that limits concurrent `task` and `subagent` tool calls. Excess calls remain queued in FIFO order; they are never rejected or silently dropped.

## Why Queue Instead of Reject

Queuing preserves the parent agent's intent. Every requested task can still run when a slot becomes available, instead of failing because the concurrency limit was reached.

## Installation

OpenCode 2 can install the plugin directly from GitHub:

```bash
opencode plugin add github:beremaran/opencode-subagent-throttle
```

For project-local configuration or options, add an object to `opencode.json` or
`opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "github:beremaran/opencode-subagent-throttle",
      "options": { "maxParallel": 2, "mode": "session" }
    }
  ]
}
```

For a local checkout, replace the GitHub spec with the checkout's absolute path,
for example `/absolute/path/to/opencode-subagent-throttle/index.ts`. The root
`index.ts` loads the OpenCode 2 adapter. Relative paths resolve from the config
file. The legacy OpenCode 1 callable adapter remains available through the
package's `./server` export.

`opencode plugin add` updates the global plugin configuration. Project-local
entries live in the project's config. Restart OpenCode after changing an
unwatched local dependency.

## Configuration

Options are provided in the `options` object for the corresponding `plugins`
entry.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxParallel` | number | `2` | Maximum number of task/subagent calls that may run at once. |
| `mode` | string | `"session"` | `"session"` creates a separate throttle pool per session. `"global"` shares one pool within the plugin instance. |
| `maxWaitMs` | number | `3600000` | Watchdog backstop in milliseconds. A call holding a slot longer than this is force-released with a warning log. The default is 60 minutes. |
| `notifyQueue` | boolean | `false` | OpenCode 1 compatibility only: injects status lines when a task is queued or starts. OpenCode 2 skips transcript insertion and logs a warning. |

The common `"session"` mode is useful for one agent's fan-out. In `"global"` mode, all sessions share the same pool.

## Usage

The OpenCode 2 adapter hooks `execute.before` and `execute.after` for the `task`
and `subagent` tools. It awaits a semaphore slot before allowing a call to
proceed. When all `maxParallel` slots are busy, additional calls wait in a FIFO
queue and start in order as slots become available. With `maxParallel: 2` and
five calls, two start immediately and three wait.

Foreground calls are the default, and release their slots when the tool
completes. Background calls keep their slots until the child session emits an
idle event. The watchdog releases a slot after `maxWaitMs` as a final backstop
and logs a warning.

If your OpenCode build gates background subagents behind its experimental
setting, enable it before using `background: true`:

```sh
OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS=true opencode
```

Tool errors release slots immediately. The legacy OpenCode 1 adapter uses the
same queue behavior for `task` calls through its `tool.execute.before` and
`tool.execute.after` hooks.

## Queue Notifications

`notifyQueue` is supported only by the legacy OpenCode 1 adapter. Set it to
`true` to add informational queued/started lines to the parent transcript.
OpenCode 2 skips this option and logs a warning because its plugin API does not
provide the same transcript insertion.

These notes are sent with `noReply: true`, so the agent loop is not triggered; they are purely informational. They are also sent with `ignored: true`, so they show in the TUI but are excluded from the model's context and never consume tokens or influence the agent.

Each queued task can add up to two transcript lines, so heavy fan-out produces transcript noise. The parent agent is typically blocked waiting on a foreground task while queued, so the notes are mainly for a human watching the TUI. A task aborted while still queued may leave its "queued" line behind without a "started" line.

## Caveats

- Queued calls appear as running tool calls in the UI while they wait. The tool output does not expose queue status.
- With `notifyQueue: true` on OpenCode 1, queue status appears as
  user-message-style lines in the transcript rather than inside the tool
  call's own UI box. The plugin cannot repaint a running tool call's status;
  see Queue Notifications above.
- `"session"` mode gives each session its own pool. A parent agent and each subagent can therefore have separate pools.
- `"global"` mode shares one pool within a plugin instance.
- This throttles concurrency, not rate. It limits how many tasks run simultaneously, not how many tasks can be created over time.
- The OpenCode 2 adapter throttles only `task` and `subagent`; other tools are unaffected.
- If the watchdog fires, the slot is available again even if the underlying call is still running.

## Runtime

The package root targets OpenCode 2.x and is loaded as raw TypeScript by
OpenCode's Bun runtime. Node.js `22.6` or newer is required only for the local
development checks, whose test command uses Node's native TypeScript stripping.
The legacy `./server` export is retained for compatible OpenCode 1 installs.

## Project Structure

- `index.ts` — OpenCode 2 package loader.
- `src/index.ts` — OpenCode 1 plugin factory and hooks.
- `src/v2.ts` — OpenCode 2 `{ id, setup }` adapter.
- `src/v1.ts` — OpenCode 1 package entrypoint.
- `src/queue.ts` — framework-independent FIFO semaphore.
- `src/manager.ts` — slot manager for active slots, background idle watchers, error release, and the watchdog.
- `test/` — Node test runner tests.

## Development

```sh
npm ci
npm run check
```

`npm run check` runs typecheck (`tsc --noEmit`), lint (Biome), and the tests.
Tests use Node's built-in test runner with native TypeScript type stripping.
There is no build step: OpenCode loads the TypeScript entrypoints directly.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for getting started, manual testing,
and test guidance. [RELEASING.md](RELEASING.md) documents the GitHub release
flow, and [SECURITY.md](SECURITY.md) covers the security policy.

## Related

- [opencode-agent-tree](https://github.com/beremaran/opencode-agent-tree) —
  force opencode to act as an orchestrator that delegates every task to
  subagents. This throttle is a good companion: cap fan-out so orchestrator
  delegation does not run away.
