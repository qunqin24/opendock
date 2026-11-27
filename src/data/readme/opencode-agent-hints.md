# opencode-agent-hints

[Agent Hint protocol v1](../agent-hint-protocol.md) for [opencode](https://opencode.ai): every
main-line model request carries an `X-Agent-Hint` header describing the session, its
lifecycle state, the request priority and the cache intent, and the session lifecycle is
driven with dedicated manage requests (`pause` / `resume` / `stop` / `compact`).

The request body is never touched — the hint is one header, base64url JSON, no padding.

Published on npm as [`opencode-agent-hints`](https://www.npmjs.com/package/opencode-agent-hints).

- Conformance: **L1 + L2 + L3-lite** (focus-driven pause/resume, archive → stop; the draft
  signal is not implemented, see [implementation profile](docs/implementation-profile.md)).
- opencode baseline: **1.18.x** (V1 plugin API, `@opencode-ai/plugin`).
- Runtime dependencies: none. The plugin is plain TypeScript compiled to ESM.

```text
agent-hint-plugins/opencode-agent-hints/
├── src/hint.ts            # wire objects, verb → edit map, base64url encoder
├── src/cache.ts           # TTL derivation, 128-token gate, prefix signature
├── src/messages.ts        # wire message counting, restart-safe counter rebuild
├── src/config.ts          # options validation (load-time failures)
├── src/control-client.ts  # manage transport: timeouts, resume-only retries, result classes
├── src/session-store.ts   # facts, lifecycle triggers, barrier/quarantine
├── src/ipc.ts             # TUI ↔ server loopback channel
├── src/index.ts           # server part: hook wiring
└── src/tui/index.ts       # TUI part: focus observation
```

## Install

```bash
# opencode 1.x (V1 plugin API): installs the package and updates the config
opencode plugin opencode-agent-hints          # add -g for the global config
```

The plugin has two halves. opencode loads **server** plugins from `opencode.json` and **TUI**
plugins from `tui.json`. The CLI above writes both entries because the package exports both parts;
if you wire it by hand, add the `tui.json` entry yourself.

```jsonc
// ~/.config/opencode/opencode.json  (or the project's opencode.json)
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-agent-hints", { "sessionControl": { "enabled": true } }]
  ]
}
```

```jsonc
// ~/.config/opencode/tui.json — required only for focus-driven pause/resume
{
  "plugin": ["opencode-agent-hints"]
}
```

A local checkout works too: use the absolute path to this directory in both places
(`["/path/to/opencode-agent-hints", { ... }]` and `"/path/to/opencode-agent-hints"`).

Restart opencode after changing either file.

## Watch hints locally

Launch opencode with an extra config that enables the plugin trace, without touching the
global config:

```bash
bash scripts/opencode-hint-demo.sh
# in another terminal
npm run hint:watch
```

- The script writes `$TMPDIR/opencode-agent-hints-demo/opencode.json`, adds only this plugin
  and `trace.file`, then `exec`s opencode through `OPENCODE_CONFIG`; providers, credentials
  and existing plugins stay untouched.
- The trace lands in `$TMPDIR/opencode-agent-hints-demo/trace.jsonl`, one content-free
  record per ordinary or manage request.
- `npm run hint:watch` follows that file and prints `state` / `call_index` / `epoch` /
  `priority` / `cache_control` / manage result plus the exact base64url header.
  Options: `--file <path>`, `--tail <n>`, `--all`, `--json`, `--once`.

## What goes on the wire

```http
POST /v1/chat/completions
X-Agent-Hint: eyJzZXNzaW9uIjp7InNlc3Npb25faWQiOi...
content-type: application/json

{ "model": "...", "messages": [ ... ], "stream": true }   ← unchanged
```

A decoded hint (fresh session, first call):

```json
{
  "session": { "session_id": "ses_...", "call_index": 1, "epoch": 0, "state": "start" },
  "priority_control": { "priority": { "level": 3, "reason": "user_waiting" } },
  "cache_control": { "type": "ephemeral", "ttl_s": 600, "msg_offset": 2 }
}
```

- `msg_offset` equals the number of messages in the wire body (`len(body.messages)`), which is
  what a consumer validates it against. The plugin mirrors the harness's message conversion and
  under-counts when a shape is uncertain, so a declaration is never rejected for exceeding the
  request.
- Auxiliary model calls (title generation, compaction summaries) carry **no** hint.
- A processor-level retry of the same call re-sends the identical hint (`call_index` unchanged).
- A `@ai-sdk/openai-compatible` provider gets the manage requests on
  `<baseURL>/chat/completions` with the placeholder body `{"model":"…","messages":[],"stream":false}`.

## Lifecycle triggers

| state | Trigger | Notes |
| --- | --- | --- |
| `start` / `append` | Every main-line request | `start` exactly once per session: the first call only when the session had no history before it |
| `pause` | TUI focus leaves an idle session; without a TUI, another session's request is accepted while this one is idle | One per pause cycle, only when no stream is in flight |
| `resume` | Before the next request of a paused or already-seeded session; when the TUI focuses such a session | Awaited before the main-line request is released |
| `stop` | Session deleted, session archived, plugin disposal / process exit | Best effort on exit, as the protocol allows |
| `compact` | `session.compacted` (epoch + 1) and pruned tool output | `compact` carries the **old** epoch; the next request carries the new one and suppresses its cache declaration for one round |

`parent_session_id` is never emitted: opencode does not record fork lineage, and a subagent
session's `parentID` names its creator, not a context parent — the protocol forbids claiming it.

## Configuration

Options are validated once at load time; an invalid option fails the plugin load instead of
degrading silently.

| option | default | meaning |
| --- | --- | --- |
| `enabled` | `true` | Master switch |
| `providers` | `[]` (all) | Provider-id globs that get hints and manage requests |
| `priority` | `"dynamic"` | `"omit"`, `"dynamic"` (3/`user_waiting` on a turn opening, else 1/`critical_path`), or a static `{ level, reason }` |
| `cacheControl` | `"dynamic"` | `"omit"`, `"dynamic"`, or a static `{ ttl_s, msg_offset? }` |
| `sessionControl.enabled` | `true` | Send manage requests (the header is still injected when off) |
| `sessionControl.endpoint` | derived | Explicit manage URL; derived as `<baseURL>/chat/completions` |
| `sessionControl.pendingOpAwaitMs` | `5000` | How long a request waits for an in-flight mutation |
| `sessionControl.controlTimeoutMs` | `5000` | Per-attempt manage timeout |
| `sessionControl.retries` | `1` | Retries of explicit transient rejections, `resume` only |
| `focus.enabled` | `true` | Accept focus signals from the TUI part |
| `trace.enabled` / `trace.file` | `false` / stdout | Content-free JSONL trace of emitted hints and manage outcomes |

## Verification

```bash
npm install
npm run typecheck
npm test                 # 62 unit tests: wire vectors, state machine, IPC, control client
bash e2e/run.sh all      # real opencode runs against a scripted upstream (phases A–D)
python3 e2e/tui-check.py # real TUI in a pty → focus/blur signals
bash e2e/real-gateway.sh # real gateway through agent-hint-watcher (needs the local config)
```

The e2e phases drive real `opencode run` / `opencode serve` processes and assert on the captured
bytes: `start` once, `append` afterwards, auxiliary exemption, `msg_offset == len(body.messages)`,
retry reuse, adoption + early `resume`, headless pause/resume, focus pause/resume, overflow →
compact → retry with the old epoch, and `stop` on disposal. Captures for phase runs are written to
`e2e/.tmp/`; the sanitized real-gateway capture is in [`docs/evidence/`](docs/evidence/).

## Known limits

- A plain OpenAI-compatible gateway rejects the empty-messages manage request with `400`. That is
  a classified `failed` result (no retry, no quarantine); a paired Agent-Hint consumer accepts it.
  See the [implementation profile](docs/implementation-profile.md).
- No draft signal: `resume` fires when the TUI focuses a session, not while typing.
- opencode 2.x (`Plugin.define`, RPC parts) is not supported yet.
- Desktop / web clients publish no focus signal, so lifecycle falls back to the headless triggers.

## Upstreaming

Feasibility study and a phased plan for landing this in opencode itself: [`docs/design/20261127-01-upstreaming-opencode.md`](docs/design/20261127-01-upstreaming-opencode.md).
