# @mazac-fox/opencode-fleet-contracts

**Canonical contracts** for the OpenCode plugin fleet: branded IDs, `FleetContext`, telemetry envelopes, artifact references, and `HealthReport`. Hand-written validators; runtime dep **`ulid`** only.

## Modules

| Export | Purpose |
|--------|---------|
| `ids` | Branded ID types, `new*` / `parse*` (and legacy parsers where applicable) |
| `context` | `FleetContext`, `decodeFleetContext`, merge helpers |
| `telemetry` | `FleetTelemetryEnvelope`, `validateTelemetryEnvelope`, `makeEnvelope` |
| `artifacts` | `ArtifactKind`, `ArtifactRef`, parsers |
| `health` | `HealthReport`, validate/normalize helpers |

Plugins often consume this **via** `@mazac-fox/opencode-host-adapter` to avoid duplicate package instances.

## Quick start

```bash
bun add @mazac-fox/opencode-fleet-contracts
```

```ts
import { newCorrelationId, validateHealthReport } from "@mazac-fox/opencode-fleet-contracts";
```

Rules: **no `as` on unknown**, use parsers; additive schema changes only unless `schema_version` migration is approved. **`AGENTS.md`**.

## Development

```bash
bun install
bun run check
```

## Fleet stack (context)

| Piece | Role |
|-------|------|
| **This package** | Shared IDs and envelopes |
| **opencode-host-adapter** | `wrapPlugin`, telemetry emit, contract tests |
| **opencode-fleet** | Install, doctor, test, generate config |
| **Plugins** | Conductor, Engram, Concord, Codemem |

## License

MIT
