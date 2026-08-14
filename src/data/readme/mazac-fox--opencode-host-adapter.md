# @mazac-fox/opencode-host-adapter

**Defensive boundary** for OpenCode plugins: validate tool definitions and runtime args, wrap execution with structured failures, preserve OpenCode cancellation signals, propagate **fleet correlation** IDs, normalize hook outputs, and append canonical **NDJSON telemetry**.

Re-exports **`@mazac-fox/opencode-fleet-contracts`** (`fleetContracts` / `/contracts`).

## What it does

- `wrapPlugin(plugin, { name, ... })` — production path for fleet plugins.
- `mergeToolExecuteBeforeHookArgs(inputArgs, outputArgs)` — same merge semantics as `tool.execute.before` fleet propagation (output wins key overlaps); use in hook plugins that read args before the merged shape exists on `output.args`.
- `runPluginContractTests` — loadability, tool shape, telemetry, arg validation harness.
- `validateToolDefinitions` — CI preflight without loading OpenCode.

No product logic (memory, locks, plans, graphs). Boundary options, error codes, and invariants: **`CONTRIBUTING.md`**, **`AGENTS.md`**.

Host Adapter does not impose arbitrary tool execution deadlines. Plugin and runtime owners are responsible for cancellation policy; Host Adapter only preserves caller-provided `ctx.abort` / `ctx.signal` signals while wrapping execution.

## Quick start

```bash
bun add @mazac-fox/opencode-host-adapter
```

```ts
import { wrapPlugin } from "@mazac-fox/opencode-host-adapter";

export default wrapPlugin(MyPlugin, { name: "my-plugin" });
```

## Development

```bash
bun install
bun run typecheck
bun test
```

Breaking boundary behavior: extend tests first; ripple to Conductor, Engram, Codemem, Fleet as needed. **`AGENTS.md`**.

## License

MIT
