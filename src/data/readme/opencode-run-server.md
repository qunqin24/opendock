# opencode-run-server

**OpenCode v2, with the existing 0.1.x HTTP API preserved.** Version **0.3.0**
keeps `/run`, `/status`, `/health`, port `4097`, bearer authentication, request
fields, and response formats. Runs use native v2 session APIs behind a supervised
compatibility listener. Native plugin RPC is also available.

The listener now stays available for the whole life of the OpenCode service
process: OpenCode evicts idle location instances after an hour, and 0.2.0 let
that eviction take the listener down until the next time a project was opened.

This is compatibility for **old HTTP callers on OpenCode v2**, not support for
loading the plugin in OpenCode v1.

## Install

Use OpenCode's **managed background service**. The plugin discovers the service
registration and credentials automatically, checking that the registration
belongs to the process hosting the plugin. It does not start another OpenCode
service or guess a backend URL.

Existing configuration can keep the old spelling and tuple:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-run-server@0.3.0", { "port": 4097, "token": "your-token" }]
  ]
}
```

OpenCode v2 normalizes that configuration. Its current spelling also works:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "opencode-run-server@0.3.0", "options": { "port": 4097, "token": "your-token" } }
  ]
}
```

The plugin targets `@opencode/plugin@2.0.3`. Configure it globally to make it
available across projects. For a local checkout, run `bun install` and
`bun run build`, then use its absolute **directory** path as `package`.

After updating the plugin or configuration, **quit and restart OpenCode**.

## Existing HTTP API

Callers keep using the compatibility listener's address and port:

```sh
curl -H 'Authorization: Bearer your-token' \
  -H 'Content-Type: application/json' \
  --data '{"dir":"/path/project","prompt":"Review the current changes"}' \
  'http://your-tailscale-host:4097/run'
```

Success remains **HTTP 202** with an unwrapped response:

```json
{"requestId":"rq_...","status":"accepted","queued":false}
```

`queued: false` means native prompt admission or command execution returned
successfully. `queued: true` means the job is waiting for a compatibility queue
slot. Neither guarantees model success. Observe results through OpenCode's
sessions and the run log. Accepted jobs are independent of the HTTP connection.

### Request fields

`dir` is required. At least one of `prompt` or `command` is required.

| Field | Meaning |
| --- | --- |
| `dir` | Project path on the server machine. |
| `prompt` | Nonempty prompt or command argument text. |
| `command` | Native command name; omitted prompt supplies empty text. |
| `continue` | Continue the latest applicable root session, or create one if none exists. |
| `session` | Select a specific session; takes precedence over `continue`. |
| `fork` | Fork the selected session through its latest message boundary. Requires `session` or `continue`. |
| `agent` | Select the session agent. |
| `model` | `provider/model`; v2 also accepts `provider/model#variant`. |
| `variant` | Override the model variant, using the current/default model if needed. |
| `title` | Rename the selected session. |
| `files` | Server file paths; relative paths resolve at the selected session's location. |
| `inlineFiles` | Array of `{ filename, content }`, with bare filename and standard base64. |
| `thinking` | Accepted for compatibility; CLI rendering is no longer involved. |
| `dangerouslySkipPermissions` | Override the configured permission default. |
| `timeoutMs` | Override the run deadline in milliseconds. |

The legacy schema still rejects unknown fields, path traversal in upload names,
and leading `-` in flag-valued fields. Existing base64 with nonzero pad bits is
accepted and normalized before native v2 attachment admission. OpenCode stores
attachments durably; no temporary upload directory is needed.

### Status and health

- `GET /health` remains unauthenticated and returns `{ "status": "ok", "uptimeMs": ... }`.
- `GET /status` requires the bearer token when configured, and retains its fields:

```json
{
  "version": "0.3.0", "uptimeMs": 1000,
  "bind": { "host": "100.64.1.2", "port": 4097 },
  "mainServer": { "url": "http://127.0.0.1:49374", "healthy": true, "lastCheckAt": 1789386000000 },
  "opencodePath": "/path/to/opencode",
  "runs": { "active": 1, "queued": 2, "concurrency": 10, "queueMax": 100, "total": 5, "failed": 1 }
}
```

The compatibility listener has **one queue across all requested directories**.
Its counters reset when the listener restarts. Native RPC has its own
location-scoped queues and counters.

`mainServer.healthy` reports backend **transport** health. A slow answer from a
busy service still counts as reachable; only a connection-level failure reports
`false`, and either way `/run` keeps accepting work.

### Errors

The original error body remains `{ "code": "...", "error": "...", "requestId": "rq_..." }`.

| HTTP status | Code |
| --- | --- |
| 400 | `VALIDATION` |
| 401 | `UNAUTHORIZED`, with `WWW-Authenticate: Bearer` |
| 405 | `METHOD_NOT_ALLOWED` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 500 | `SPAWN_FAILED` — retained name for native startup/admission failure |
| 503 | `QUEUE_FULL`, with `Retry-After` |

Post-acceptance failures are logged and counted rather than changing the response.

## Options

All documented 0.1.x option names remain accepted.

| Option | Default / behavior |
| --- | --- |
| `bind` | Tailscale IPv4 discovery, falling back to `127.0.0.1` |
| `port` | `4097` |
| `token` | Unset; optional bearer token for `/run` and `/status` |
| `concurrency` | `10` active compatibility runs across all directories |
| `queueMax` | `100` waiting jobs; `0` disables waiting |
| `queueTtlMs` | `0`, no waiting-job expiry |
| `runTimeoutMs` | `1800000`, 30 minutes starting when a slot is acquired |
| `maxBodyBytes` | `10485760`, 10 MiB; checked while reading the HTTP body |
| `dangerouslySkipPermissions` | `false` |
| `attach.username`, `attach.password` | Override environment/service credentials used for backend requests |
| `runtime` | `auto`: Bun if available, otherwise Node; `bun` and `node` force a runtime |
| `healthCheck.intervalMs` | `5000`; also the re-check interval for discovery, port ownership, and adopted listeners |
| `healthCheck.timeoutMs` | `2000`; exceeding it marks the service busy, not lost |
| `healthCheck.failureThreshold` | `3` consecutive connection failures before the log reports the backend unavailable |
| `restart.maxRetries` | `10` per window, and the event-stream reconnect budget |
| `restart.baseDelayMs` | `500` |
| `restart.maxDelayMs` | `30000` |
| `restart.windowMs` | `60000`; also the pause after the budget is spent |
| `shutdownGraceMs` | `2000` before force-terminating the companion process group |
| `opencodePath` | `process.execPath`; retained as compatibility/status metadata, not invoked for runs |
| `log.file` | `${XDG_STATE_HOME:-~/.local/state}/opencode-run-server/server.log` |
| `log.level` | `info`; also accepts `debug`, `warn`, `error` |
| `log.maxSize` | `10m`; bytes or `k`/`m` suffix |
| `log.maxFiles` | `5`, including the current file |
| `legacyHttp` | New: `true`; set `false` for RPC-only use |
| `maxInputBytes` | New: `10485760`; application-level size limit for native RPC only |

Timer values are positive integers, with a maximum of `2147483647` milliseconds;
`queueTtlMs` may be zero. OpenCode's native file and model limits also apply.

`runtime`, health checks, restart limits, binding, and shutdown grace control the
**compatibility subprocess**. `opencodePath` and `thinking` remain accepted but
are informational/presentation compatibility fields: runs execute through the
discovered v2 service rather than another CLI process.

## Supervision and headless execution

Location instances sharing the same bind/port share one listener, and the
listener's lifetime follows the **host OpenCode process**, not those instances.
Unloading an instance — including OpenCode's hourly eviction of idle locations —
leaves it serving; runs for a directory whose services were evicted boot them
again through the service. Changing the plugin's options restarts it with the new
configuration. A clean host shutdown terminates it, and a host that dies without
one is detected by the listener's own owner check.

The running listener records `pid`, owner, bind, port, and an options fingerprint
in `${XDG_STATE_HOME:-~/.local/state}/opencode-run-server/listener-<bind>-<port>.json`.
A starting supervisor confirms the recorded address still answers before trusting
it, then **adopts** a matching listener this process already owns, **reclaims**
one whose owner is gone or whose options changed, discards a registration that no
longer answers, and keeps skipping a port owned by a different live OpenCode
process. Port contention, failed
discovery, an unreachable backend, and a spent restart budget all re-check on the
configured interval rather than giving up, so the endpoint recovers without
restarting OpenCode.

The listener treats only definitive signals as fatal. Any HTTP response,
including 401, proves transport liveness, and a probe that exceeds
`healthCheck.timeoutMs` means the service is busy. A dropped event stream is
resubscribed with bounded backoff, and missed inbox deliveries are reconciled on
reconnect so accepted runs are not abandoned. Exhausting the reconnect budget or
losing the owning process shuts the listener down: admission stops, pending jobs
are discarded, native sessions are interrupted, and it exits within the
configured grace period.

Permission asks are rejected and interrupt a headless run by default. With
`dangerouslySkipPermissions`, pending asks are approved once. Explicit configured
denials remain final. Forms belonging to managed sessions or their descendants
are cancelled; unrelated and ambiguous global forms are left alone.

Timeouts call native session interruption, not merely client-request cancellation.
Inbox delivery is observed before checking for idle so queued execution cannot
be mistaken for completion. Command admissions are reconciled with native inbox
and message state. Third-party command callbacks must return cooperatively.

Waiting jobs are in-memory. Admitted inputs and session history belong to
OpenCode; interruption does not delete durable history/inbox entries or replace
OpenCode's native recovery policy.

## Optional native v2 RPC

The v2 API remains available on OpenCode's own server:

```ts
import { OpenCode } from "@opencode/client"
import { RunServer } from "opencode-run-server/rpc"

const client = OpenCode.make({ baseUrl: "http://host:49374", headers: yourOpenCodeAuthHeaders })
const runs = client.rpc(RunServer)
const location = { directory: "/path/project" }
await runs.run({ prompt: "Review changes" }, { location })
const status = await runs.status(undefined, { location })
```

RPC uses `/api/rpc/opencode-run-server/run` and
`/api/rpc/opencode-run-server/status`, `{ input: ... }` /
`{ output: ... }` envelopes, HTTP 200 success, and native RPC error types.
It selects directories with the RPC location option, and accepts explicit session
IDs instead of legacy `continue`/`fork` fields. These conventions apply only to
RPC; existing `/run` clients keep their original interface.

## Development and verification

```sh
bun install --frozen-lockfile
bun run check
bun run typecheck
bun run knip
bun run test
bun run build
bun run verify:package
```

The suite enforces 95% coverage. Package verification installs a real tarball,
checks consumer declarations, and uses an isolated v2 server and local fixture
model. It exercises native RPC and the legacy HTTP API with **both Node and Bun
companion runtimes**, including old config normalization, continuation, forking,
commands, attachments, authentication, queue limits, permissions, timeouts, runs
accepted while transport probes stall, and unload. CI runs the checks on macOS
and Linux.
