# opencode-session-telemetry

[![npm version](https://img.shields.io/npm/v/opencode-session-telemetry.svg)](https://www.npmjs.com/package/opencode-session-telemetry)
[![npm license](https://img.shields.io/npm/l/opencode-session-telemetry.svg)](https://www.npmjs.com/package/opencode-session-telemetry)
[![node engine](https://img.shields.io/node/v/opencode-session-telemetry.svg)](https://www.npmjs.com/package/opencode-session-telemetry)
[![types](https://img.shields.io/npm/types/opencode-session-telemetry.svg)](https://www.npmjs.com/package/opencode-session-telemetry)

**Fail-open session telemetry for [OpenCode](https://opencode.ai).** The plugin observes the agent's lifecycle and re-emits it as a small, stable, hook-compatible event schema — over HTTP, through a local callback, or both — so external systems can watch sessions, subagents, tools, permissions, compactions and crashes without touching OpenCode itself.

## The problem

OpenCode is a fast-moving, event-driven agent runtime. Teams that want to observe it from the outside — dashboards, watchdogs, chat bridges, quality gates — face three obstacles:

1. **The event surface moves.** OpenCode ships two plugin generations (V1 `@opencode-ai/plugin`, V2 `@opencode/plugin`) with different event names, shapes and hook mechanisms.
2. **Raw events are noisy.** One logical moment ("the agent finished and is waiting for the user") is spread across multiple low-level events that arrive in uncertain order and may duplicate each other.
3. **Observability must never hurt availability.** A telemetry endpoint that is down must not stop a tool from running or a session from finishing.

## Motivation

`opencode-session-telemetry` exists to give external consumers a **stable, semantic contract**: a versioned payload schema with a dozen normalized events (`SessionStart`, `Stop`, `Notification`, …) that maps cleanly onto the Claude Code hook lifecycle. It is deliberately boring: no dependencies beyond the OpenCode plugin SDK, no background daemons, no retries that could pile up, and a strict fail-open contract — telemetry is a helper, never a dependency of the agent itself.

## Architecture

```
┌─────────────────────────────── OpenCode ────────────────────────────────┐
│                                                                          │
│  V2 host (OpenCode 2.x)              V1 host (OpenCode 1.18.29+)         │
│  Plugin.define({ setup(ctx) })       server(input) → hooks               │
│    ctx.event.subscribe(...)            hooks.event(...)                  │
│    ctx.tool.hook(...)                  hooks["tool.execute.before"]      │
│    ctx.permission.hook(...)            hooks["permission.ask"]           │
│         │                                    │                           │
└─────────┼────────────────────────────────────┼──────────────────────────┘
          │          src/v2.ts / src/v1.ts (thin adapters)
          ▼                                    ▼
   ┌─────────────────────────────────────────────────────┐
   │  TelemetryEngine (src/engine.ts)                    │
   │  • per-session state, turn tracking, dedupe         │
   │  • assistant-text buffer (bounded)                  │
   │  • parent/child (subagent) relations                 │
   │  • detector: questions, summaries, attention hints  │
   └──────────────────────┬──────────────────────────────┘
                          ▼
   ┌─────────────────────────────────────────────────────┐
   │  TelemetryEmitter (src/emitter.ts)                  │
   │  • bounded queue, drop-oldest                        │
   │  • local callback  +  HTTP POST (AbortController)    │
   │  • strict fail-open, never throws                   │
   └─────────────────────────────────────────────────────┘
```

The normalization engine is SDK-agnostic; the V1 and V2 adapters are separate modules that never mix contracts and share only the engine and emitter. A host runs one generation at a time, so a single activity is never emitted twice — and the engine additionally deduplicates by turn, tool-call ID and permission-request ID as a safety net.

## Features

- **Dual-generation support**: one published package serves OpenCode V2 (`Plugin.define`) and V1 (`server()` hooks, object form).
- **12 normalized events** with a versioned payload schema (`schemaVersion: 1`).
- **Subagent-aware**: child sessions are reported as `SubagentStart`/`SubagentStop` with `parentSessionId`.
- **Turn deduplication**: `session.idle` + `session.status: idle` and `execution.started` + `status: busy` each collapse to one semantic event per turn.
- **Question detection**: a `Stop` whose last assistant message ends in a real question (English or Spanish, Markdown closers tolerated) carries `attentionHint: "answer"`.
- **Optional destructive-bash guard** using each generation's real authorization mechanism (`ctx.permission.hook("evaluate")` / `"permission.ask"`), never an observation hook.
- **Fail-open delivery**: bounded queue, finite timeouts, drop-oldest overflow, no retries, no thrown errors, no unhandled rejections.
- **Privacy by default**: no prompt text, no tool output, sensitive keys redacted, summaries capped.

## Event mapping

### OpenCode V2 → normalized events

| OpenCode source | Condition | Normalized event |
| --- | --- | --- |
| `session.created` event | no `parentID` | `SessionStart` |
| `session.created` event | with `parentID` | `SubagentStart` (+ `parentSessionId`) |
| `session.execution.started` event | new turn | `UserPromptSubmit` |
| `session.status` event (`busy`) | fallback when the turn is not active yet | `UserPromptSubmit` |
| `tool.execute.before` hook | — | `PreToolUse` |
| `tool.execute.after` hook | `status === "completed"` | `PostToolUse` |
| `tool.execute.after` hook | `status === "error"` | `PostToolUseFailure` |
| `session.idle` event | main session, turn end | `Stop` |
| `session.status` event (`idle`) | main session, turn end | `Stop` (deduplicated with `session.idle`) |
| `session.execution.succeeded` event | headless turn end (`opencode run`, CI) | `Stop` (deduplicated with the idle sources) |
| `session.execution.interrupted` event | interrupted turn (user stop / steering) | `Stop` |
| `session.idle` / `session.status` (`idle`) | child session | `SubagentStop` (+ `parentSessionId`) |
| `session.execution.failed` event | — | `StopFailure` |
| `permission.asked` event | — | `Notification` (`attentionHint: "permission"`) |
| `session.compaction.ended` event | — | `PostCompact` |
| `session.deleted` event | — | `SessionEnd` (state released) |

### OpenCode V1 → normalized events

| OpenCode source | Condition | Normalized event |
| --- | --- | --- |
| `session.created` | no `parentID` | `SessionStart` |
| `session.created` | with `parentID` | `SubagentStart` |
| `message.updated` (role `user`) | new turn | `UserPromptSubmit` |
| `session.status` (`busy`) | fallback when the turn is not active yet | `UserPromptSubmit` |
| `tool.execute.before` hook | — | `PreToolUse` |
| `message.part.updated` (tool part, state `completed`) | — | `PostToolUse` |
| `message.part.updated` (tool part, state `error`) | — | `PostToolUseFailure` |
| `session.idle` / `session.status` (`idle`) | main session | `Stop` (single emission per turn) |
| `session.idle` / `session.status` (`idle`) | child session | `SubagentStop` |
| `session.error` | — | `StopFailure` |
| `permission.updated` | — | `Notification` |
| `session.compacted` | — | `PostCompact` |
| `session.deleted` | — | `SessionEnd` (state released) |

## Requirements

- OpenCode **2.x** (V2 plugin API) and/or OpenCode **1.18.29+** (V1 object-form plugins)
- Node.js **>= 20** when consuming the package outside an OpenCode host

## Installation

Install as a global package plugin:

```bash
opencode plugin add opencode-session-telemetry
```

Or declare it in `opencode.json(c)`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-telemetry"]
}
```

With per-project options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-session-telemetry",
      "options": {
        "endpoint": "http://localhost:4318/events",
        "blockDestructiveBash": true
      }
    }
  ]
}
```

Manual installation for all projects (global discovery path):

```text
~/.config/opencode/plugins/opencode-session-telemetry/
```

Manual installation for a single project:

```text
.opencode/plugins/opencode-session-telemetry/
```

Both discovery layouts expect the plugin package directory (with its `package.json` and `dist/`), not a bare file.

## Configuration

Options resolve with this precedence (highest wins):

1. Programmatic options (`createOpenCodeTelemetryPlugin({...})`)
2. Plugin options in `opencode.json(c)` (`ctx.options` / V1 options)
3. Environment variables
4. Built-in defaults

An invalid value anywhere in the chain never throws and never blocks loading OpenCode; it is ignored (and reported through `onError` as `kind: "invalid-option"`).

## Environment variables

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `OPENCODE_TELEMETRY_URL` | string | unset (HTTP off) | Endpoint receiving `POST` payloads |
| `OPENCODE_TELEMETRY_TOKEN` | string | unset | Optional `Authorization: Bearer` token |
| `OPENCODE_TELEMETRY_TIMEOUT_MS` | positive int | `1500` | Per-request timeout |
| `OPENCODE_TELEMETRY_DEDUPE_WINDOW_MS` | non-negative int | `500` | Turn-end deduplication window |
| `OPENCODE_TELEMETRY_MAX_SUMMARY_CHARS` | non-negative int | `280` | Cap for `summary` fields |
| `OPENCODE_TELEMETRY_BLOCK_DESTRUCTIVE_BASH` | boolean | `false` | Enable the destructive-bash guard |
| `OPENCODE_TELEMETRY_INCLUDE_TOOL_INPUT` | boolean | `false` | Include sanitized tool input in `PreToolUse` |

```bash
export OPENCODE_TELEMETRY_URL=http://localhost:4318/events
export OPENCODE_TELEMETRY_TOKEN=your-secret-token
export OPENCODE_TELEMETRY_TIMEOUT_MS=1500
export OPENCODE_TELEMETRY_DEDUPE_WINDOW_MS=500
export OPENCODE_TELEMETRY_MAX_SUMMARY_CHARS=280
export OPENCODE_TELEMETRY_BLOCK_DESTRUCTIVE_BASH=false
```

Booleans accept `1/true/yes/on` and `0/false/no/off`; anything else is ignored. With no `OPENCODE_TELEMETRY_URL` the plugin runs without HTTP transport and without errors — a local `onEvent` callback still works.

## Programmatic usage

```ts
import { createOpenCodeTelemetryPlugin } from "opencode-session-telemetry"

export default createOpenCodeTelemetryPlugin({
  endpoint: "http://localhost:4318/events",
  token: process.env.MY_TOKEN,
  timeoutMs: 2000,
  dedupeWindowMs: 500,
  maxSummaryChars: 280,
  blockDestructiveBash: true,
  includeToolInput: false,
  onEvent: (event) => console.log(event.event, event.sessionId),
  onError: (error) => console.error("[telemetry]", error.kind, error.message),
})
```

The returned object is a dual plugin: OpenCode 2 uses its `setup()`, OpenCode 1 uses its `server()`. The package's own default export is `createOpenCodeTelemetryPlugin()` with no explicit options, i.e. environment + config driven.

## TypeScript API

```ts
createOpenCodeTelemetryPlugin(options?: TelemetryPluginOptions): DualOpenCodePlugin

interface TelemetryPluginOptions {
  endpoint?: string
  token?: string
  timeoutMs?: number          // default 1500
  dedupeWindowMs?: number      // default 500
  maxSummaryChars?: number     // default 280
  blockDestructiveBash?: boolean   // default false
  includeToolInput?: boolean   // default false
  onEvent?: (event: TelemetryPayload) => void | Promise<void>
  onError?: (error: TelemetryError) => void
}
```

Additional exports for embedders and tests: `TelemetryEmitter`, `TelemetryEngine`, `createTelemetryCore`, `resolveTelemetryOptions`, `endsWithQuestion`, `resolveAttentionHint`, `buildSummary`, `isDestructiveBash`, `sanitizeToolInput`, `sanitizeErrorMessage`, plus all payload and event types.

## Payload examples (one per event type)

Every payload shares the five mandatory fields (`pid`, `sessionId`, `cwd`, `timestamp`, `source`). Optional fields appear only when they carry information.

```json
// SessionStart
{
  "schemaVersion": 1, "event": "SessionStart", "originalEvent": "session.created",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:00.000Z", "source": "opencode"
}
```

```json
// SubagentStart
{
  "schemaVersion": 1, "event": "SubagentStart", "originalEvent": "session.created",
  "pid": 12345, "sessionId": "ses_sub_1", "parentSessionId": "ses_abc",
  "cwd": "/repos/panel", "timestamp": "2026-11-26T12:00:01.000Z", "source": "opencode"
}
```

```json
// UserPromptSubmit — never carries prompt text
{
  "schemaVersion": 1, "event": "UserPromptSubmit", "originalEvent": "session.execution.started",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:02.000Z", "source": "opencode"
}
```

```json
// PreToolUse (includeToolInput: false → key names only; true → sanitized values)
{
  "schemaVersion": 1, "event": "PreToolUse", "originalEvent": "tool.execute.before",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:03.000Z", "source": "opencode",
  "toolName": "bash", "toolCallId": "call_7", "input": { "keys": ["command"] }
}
```

```json
// PostToolUse
{
  "schemaVersion": 1, "event": "PostToolUse", "originalEvent": "tool.execute.after",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:04.000Z", "source": "opencode",
  "toolName": "bash", "toolCallId": "call_7"
}
```

```json
// PostToolUseFailure
{
  "schemaVersion": 1, "event": "PostToolUseFailure", "originalEvent": "tool.execute.after",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:04.500Z", "source": "opencode",
  "toolName": "bash", "toolCallId": "call_8", "error": "command failed with code 1"
}
```

```json
// Stop — turn ended; here the assistant asked a question
{
  "schemaVersion": 1, "event": "Stop", "originalEvent": "session.idle",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:05.000Z", "source": "opencode",
  "summary": "Refactored the emitter and added tests. Does this work for you?",
  "endsWithQuestion": true, "attentionHint": "answer"
}
```

```json
// SubagentStop
{
  "schemaVersion": 1, "event": "SubagentStop", "originalEvent": "session.idle",
  "pid": 12345, "sessionId": "ses_sub_1", "parentSessionId": "ses_abc",
  "cwd": "/repos/panel", "timestamp": "2026-11-26T12:00:06.000Z", "source": "opencode",
  "summary": "Subagent finished the review.", "endsWithQuestion": false, "attentionHint": "none"
}
```

```json
// StopFailure
{
  "schemaVersion": 1, "event": "StopFailure", "originalEvent": "session.execution.failed",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:07.000Z", "source": "opencode",
  "attentionHint": "permission", "error": "rate limited, retry later"
}
```

```json
// Notification — a permission request needs the user
{
  "schemaVersion": 1, "event": "Notification", "originalEvent": "permission.asked",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:08.000Z", "source": "opencode",
  "summary": "permission requested: bash.exec", "attentionHint": "permission"
}
```

```json
// PostCompact
{
  "schemaVersion": 1, "event": "PostCompact", "originalEvent": "session.compaction.ended",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:09.000Z", "source": "opencode"
}
```

```json
// SessionEnd
{
  "schemaVersion": 1, "event": "SessionEnd", "originalEvent": "session.deleted",
  "pid": 12345, "sessionId": "ses_abc", "cwd": "/repos/panel",
  "timestamp": "2026-11-26T12:00:10.000Z", "source": "opencode"
}
```

## Payload schema

```ts
interface TelemetryPayload {
  schemaVersion: 1              // contract version
  event: TelemetryEvent         // one of the 12 normalized names
  originalEvent?: string        // OpenCode event/hook this came from
  pid: number                    // OpenCode process ID
  sessionId: string             // session the event belongs to
  parentSessionId?: string      // only for child (subagent) sessions
  cwd: string                    // project directory of the session
  timestamp: string              // ISO 8601, UTC
  source: "opencode"             // always "opencode"
  summary?: string               // capped, whitespace-normalized text
  endsWithQuestion?: boolean     // for Stop / SubagentStop
  attentionHint?: "permission" | "answer" | "none"
  toolName?: string             // PreToolUse / PostToolUse(Failure)
  toolCallId?: string           // PreToolUse / PostToolUse(Failure)
  input?: Record<string, unknown> // sanitized tool input (PreToolUse)
  error?: string                // sanitized message (PostToolUseFailure, StopFailure)
}
```

`undefined` properties are never serialized. `pid`, `sessionId`, `cwd`, `timestamp` and `source` are present on every payload.

## Deduplication

OpenCode reports one logical moment through several channels. The engine collapses them per session and per turn:

- **Prompt start**: `execution.started` (V2) or the user `message.updated` (V1) marks a turn active; the `session.status: busy` fallback is skipped while a turn is active.
- **Turn end**: the first turn-end signal wins and every other is suppressed by a turn sequence check plus the `dedupeWindowMs` time window (per session, never a global flag). Interactive clients signal through `session.idle` / `session.status: idle`; headless runs (`opencode run`, CI) signal through `session.execution.succeeded`; interruptions end the turn through `session.execution.interrupted`. Whichever arrives first emits the single `Stop`, the rest are dropped.
- **Failed turns**: a `StopFailure` also closes the turn, so the user's retry is never deduplicated away.
- **Tool results**: each `callID` is reported exactly once, whichever channel delivers it first (V1 may see both the hook and the message-part view).
- **Permissions**: each permission request ID produces one `Notification`.

## Question detection

`endsWithQuestion(text)` looks at the **last significant character**: trailing whitespace, newlines and Markdown closers (`*`, `_`, `` ` ``, `)`, `]`) are skipped. A `?` anywhere else does not count, and a dangling Spanish `¿` is not treated as a question. `Stop` payloads carry `attentionHint: "answer"` only when the final assistant text of the turn is a real question.

## Subagents

A child session (`parentID` in V2 `session.created` / V1 `session.created`) is reported as `SubagentStart`, keeps `parentSessionId` on every subsequent event, and ends as `SubagentStop` — never as `Stop`. A subagent finishing never marks the parent session as finished.

## Optional destructive-bash protection

`blockDestructiveBash` (default `false`) installs a conservative guard against unambiguous catastrophes like:

```bash
rm -rf /
rm -rf ~
rm -rf $HOME
sudo rm -rf /
rm --no-preserve-root -rf /
```

Detection requires **all** of: an actual `rm` invocation (after `sudo`/`env`/`nohup`/`VAR=` prefixes, one level of `sh -c` unwrapping, and across `&&`/`||`/`;`/`|`/newline separators), a recursive flag, force or `--no-preserve-root`, and a target that is `/`, `/*`, `~`, `~/`, `$HOME` or their variants. `rm -rf ./build`, `rm -rf /tmp/cache`, `git rm -rf ...` and destructive strings inside `echo`/`grep` are never blocked. Single-quoted `'$HOME'`/`'~'` do not expand, so they are treated as literal file names and allowed; a quoted `/` still refers to the root and is blocked.

Blocking uses each generation's **real authorization mechanism**:

- **V2**: `ctx.permission.hook("evaluate")` sets `effect: "deny"` with a reason. Hooks run for `allow`/`ask` decisions; an explicit configured `deny` is final and never softened.
- **V1**: the `"permission.ask"` hook sets `output.status = "deny"`.

The guard only fires when the command surfaces in a permission evaluation — if your OpenCode version does not route a given shell call through permissions, the guard will not see it. **This is an extra safeguard, not a sandbox and not a complete shell analyzer.** Use permission rules for real policy.

## Error handling and fail-open

- No method of this package throws into OpenCode. Every handler, hook callback and cleanup path catches and reports.
- Deliveries run through a bounded queue (default 256). When full, the **oldest** event is dropped and reported (`kind: "dropped"`); no unbounded accumulation is possible.
- Every HTTP request uses an `AbortController` with a finite `timeoutMs` (default 1500 ms). There are no retries.
- A dead endpoint, a failing callback, invalid JSON, DNS failures and aborts are reported through `onError` and otherwise ignored. Tool executions and session flow are never affected — the test suite asserts this explicitly.
- `flush(timeoutMs)` and `close(timeoutMs)` always settle within their budgets; cleanup never hangs.

## Privacy and security

What leaves the machine:

- **Always**: event name, original event name, PID, session ID (and parent ID), project directory, UTC timestamp, source marker.
- **Summaries**: the last assistant turn's text, normalized and capped to `maxSummaryChars` (default 280) — and only on `Stop`/`SubagentStop` and permission notifications (action name only).
- **Never by default**: user prompts (no field exists for prompt text), tool outputs, full tool input (`PreToolUse` sends key names only unless `includeToolInput` is on).
- **When `includeToolInput` is on**: a depth-limited copy where keys matching token/secret/password/authorization/credential/api-key/cookie are replaced with `[REDACTED]`, strings are truncated, arrays capped and cycles replaced.
- **Errors**: single-line, length-capped messages; bearer tokens are redacted; HTTP response bodies are never included.
- The `Authorization` header value is never logged and never appears in any error message.

## PID watchdog integration

Every payload carries `pid`, so an external watchdog can detect agents that died without saying goodbye:

```json
{
  "pid": 12345,
  "sessionId": "ses_abc",
  "source": "opencode",
  "timestamp": "2026-11-26T12:00:00.000Z"
}
```

Recommended consumer flow:

1. On `SessionStart`, register `pid` + `sessionId` with the event timestamp.
2. Poll `process.kill(pid, 0)` (or your platform equivalent) on an interval.
3. If the process is gone and no `SessionEnd` arrived, mark the session as **terminated unexpectedly**.
4. If `SessionEnd` arrives, drop the registration — a clean end is not a crash.
5. Treat a vanished process with a pending `Notification`/`StopFailure` (attention `permission`) as "died while waiting for the user", which is a softer signal than a mid-turn crash.

**PID reuse caveat**: a PID is not a globally unique, permanent identity. After a crash, the OS may hand the same PID to an unrelated process, producing false "still alive" positives. When aggregating across hosts or long windows, key sessions by `pid` **plus** the process start timestamp, the host identifier and (on Linux) the boot ID from `/proc/sys/kernel/random/boot_id`. The plugin's `timestamp` field gives you the event time to combine with host identity; nothing in this package claims global PID uniqueness.

## Local development

```bash
git clone <your-fork-url>
cd opencode-session-telemetry
npm install
npm run build        # tsc -p tsconfig.json → dist/
npm run typecheck     # strict build check
npm run typecheck:compat  # compiles src/v1.compat.ts against the real V1 SDK types
npm run clean
```

The compat check is a compile-time assertion that the structural V1 types in `src/v1.ts` still match the published `@opencode-ai/plugin` / `@opencode-ai/sdk` contracts. Run it whenever you bump either SDK dev dependency.

## Testing

```bash
npm test             # builds, then runs the node:test suite
```

The suite uses only `node:test` + `node:assert`, importing the compiled `dist/`:

- `test/detector.test.mjs` — question detection (English/Spanish/Unicode/Markdown closers), attention hints for all event/answer combinations, summaries incl. surrogate pairs and `maxChars` limits.
- `test/bash-guard.test.mjs` — destructive commands blocked (wrappers, quotes, separators, `sh -c`) and benign/suspicious commands allowed.
- `test/emitter.test.mjs` — real HTTP server: POST + bearer token, 500/401, refused connections, `AbortController` timeouts, callback success/sync throw/rejected promise, queue overflow with drop-oldest, `flush`, `close`, and an unhandled-rejection canary.
- `test/plugin.integration.test.mjs` — full V2 and V1 pipelines with realistic fixtures: all 12 events, subagents, turn/prompt/permission/tool deduplication, state cleanup after `session.deleted`, real authorization results for the bash guard (deny vs. unchanged effect), dead-endpoint fail-open, option resolution, and the dual default export.

The blocking tests assert the **result of the authorization mechanism** (the mutated `PermissionEvaluation.effect` in V2, the mutated `output.status` in V1), not merely that a detector function ran.

## Publishing to npm

```bash
npm run build
npm pack --dry-run     # inspect the tarball
npm login
npm publish --access public
```

The package publishes only `dist/`, `README.md` and `LICENSE` (see the `files` field). Before your first release, add the real `repository`, `bugs` and `homepage` fields to `package.json` — they are intentionally omitted so nobody publishes with placeholder URLs.

For Git-based installs: `opencode plugin add github:YOUR_USER/opencode-session-telemetry`.

## License

[MIT](./LICENSE)
