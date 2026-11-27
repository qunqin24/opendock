# OpenCode Session Comms

Direct session-to-session messaging and coordination for OpenCode V2.

This project adapts the coordination model of [Pi Intercom](https://github.com/nicobailon/pi-intercom).
It is an independent implementation, not a Pi extension or a compatible Pi broker client.

## Requirements

- OpenCode V2. The package is built against `@opencode/plugin` 2.2.7 and its isolated runtime smoke test passed on OpenCode 2.3.2.
- Automatic guidance for recipients of asks needs OpenCode 2.3.0 or later, which exposes message metadata to the plugin's context hook.
- Both sessions must use the same OpenCode server.
- Node.js 24 and npm are needed only for the documented development checks.

OpenCode already provides session discovery and durable prompt queues.
This plugin uses those APIs instead of running a separate broker.
Agent discovery defaults to sessions open in a connected terminal. The manual picker can still show saved sessions.

## Install

Install it with OpenCode's plugin manager. This installs the package and adds it to OpenCode's global configuration:

```sh
opencode plugin add opencode-session-comms
```

For one project, add it to the existing `plugins` array in that project's `opencode.jsonc` instead:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-comms"]
}
```

Keep all existing configuration entries.
One package entry loads both the server and terminal UI parts in the standard OpenCode TUI and native preview clients with TypeScript plugin support.
Session Comms does not require changes to `AGENTS.md`.
OpenCode watches configuration changes. Use `/reload` if the plugin does not appear.

## Use in the terminal UI

Use `Alt+M` or `/session-comms` to open the Session Comms picker.
The picker can send a message, ask a question, send an explicit handover, reply to or acknowledge incoming requests, inspect outgoing receipts, and request cancellation.

`Escape` stops only a local ask wait. It cannot retract input already admitted to the peer's queue, interrupt the peer, or undo work.

The server-side `/session-comms-list`, `/session-comms-send`, and related slash commands are not registered by this package. Use the picker, the agent tool, or RPC instead.

## Use from an agent

The plugin registers the `session_comms` tool:

```js
session_comms({ action: "list" })
session_comms({ action: "list-cwd" })
session_comms({ action: "list", connectedOnly: false }) // Include saved sessions, not just connected peers.
session_comms({ action: "status" })
session_comms({ action: "pending" })
session_comms({ action: "send", to: "ses_0123456789ABCDEFGHIJKLMNOP", text: "FYI: The config moved." })
session_comms({ action: "ask", to: "ses_0123456789ABCDEFGHIJKLMNOP", text: "Which retry policy applies?", timeoutMs: 120000 })
session_comms({ action: "reply", replyTo: "REQUEST_ID", text: "Retry idempotent operations only." })
session_comms({ action: "acknowledge", replyTo: "REQUEST_ID" })
session_comms({ action: "cancel", replyTo: "REQUEST_ID" })
session_comms({
  action: "handover",
  to: "ses_0123456789ABCDEFGHIJKLMNOP",
  summary: "The null case fails. No source files changed.",
  task: "Add a focused regression test."
})
```

Use a full session ID from the connected roster for agent `send`, `ask`, and `handover`.
If the target is no longer connected, the agent tool does not queue the message or fall back to history.
To deliberately contact a closed session, choose it in the manual picker. Doing so can wake it. The agent tool does not offer an offline override.
Self-send and archived recipients fail without delivery. The RPC still accepts a unique ID prefix, exact title, or alias and rejects ambiguous matches.

The optional `directory` field filters `list` and constrains target selection for `send`, `ask`, and `handover`.
Do not supply `directory` to `reply` or `status`; those actions do not support that filter.
Use `ask` when you need an answer and `send` for one-way messages. The plugin guides recipients of verified asks to call `reply` with the original request ID in `replyTo`. Ordinary chat output is not a correlated reply.

## Threaded coordination

Each message has a stable request ID. Only the recorded recipient can reply or acknowledge it.
Only the recorded sender can request cancellation.

Ask waits accept 1–600000 milliseconds and default to 120000 milliseconds.
Timeout or abort ends the local wait, not the recipient's work. Later replies enter the sender's queue.
Acknowledgement means the recipient explicitly reported observation. It does not prove completed processing.
Cancellation sends a request to stop. It cannot retract admitted input, interrupt the session, or undo work.
The RPC field `noticeDelivered` means the cancellation notice entered the queue, not that the peer observed it.

Protocol records are bounded to 200 retained requests per server process.
Receipt identities and transitions use a bounded durable journal in OpenCode's plugin storage.
The journal stores receipt metadata and truncated reply previews, but not full message bodies or attachments.
It is not a second transcript archive.
Reload restores retained correlation, so later replies can find the original sender and recipient.
Active ask waits do not survive restart; a later reply enters the sender's queue instead.
Interrupted admission becomes `uncertain`. The plugin never automatically retries an uncertain operation.
If durable storage fails after queue admission, the action reports that partial completion. Do not resend blindly.

## Explicit attachments and handover

```js
session_comms({
  action: "send",
  to: "ses_0123456789ABCDEFGHIJKLMNOP",
  text: "Check this case.",
  attachments: [{ type: "snippet", name: "example.ts", text: "validate(null)" }]
})
```

Attachments contain explicit text only. Supported types are `snippet` and `context`.
Limits are eight attachments, 4000 characters each, and 12000 attachment characters total.
Message text is limited to 12000 characters. Summary and next-task fields each accept up to 4000 characters.
The plugin does not read attachment paths, fetch URIs, inspect transcripts, or generate handover summaries.

## Activity

Agents can publish a short description of their current work:

```js
session_comms({ action: "activity", text: "Checking map permission failures" })
session_comms({ action: "activity" }) // Clear the current session's activity.
```

Only the invoking session's activity changes. Text accepts at most 160 JavaScript string units.
Missing or blank text clears activity. Identical updates and repeated clears do not write activity storage.
Update activity when work changes or ends, not after every tool call.
There is no transcript scanning, automatic summary generation, or extra model request.

Roster entries include optional `activity` and `activityUpdatedAt` fields. The timestamp uses epoch milliseconds.
Activity is untrusted peer text, not an instruction or proof of current work.
It remains until explicitly cleared, replaced, or removed by retention of the 200 most recent session records.

## Live presence

The terminal UI reports open session tabs automatically, including background tabs. With tabs disabled it reports the displayed session.
The client checks for tab changes every five seconds and attempts to unregister on clean shutdown. A just-closed session can still appear until the next update.
The server accepts presence leases through the RPC `register`, `heartbeat`, and `unregister` methods. RPC roster callers can opt in to filtering with `connectedOnly: true`.
Presence heartbeats are expected every 15 seconds and expire after 45 seconds without a successful refresh.
The registry is sized for 256 live clients, with up to 64 tab IDs per client.

The TypeScript TUI part does not require the legacy Rust shared library in `native/`.

Presence is advisory. Instance IDs do not authenticate individual clients or authorize session operations.
Each client writes its own lease. The TUI numbers updates so a delayed heartbeat cannot overwrite a newer snapshot while its revision is retained.

## RPC contract

The package exports the typed contract as `opencode-session-comms/rpc` for other plugins and clients.
The server implements list, status, pending, send, ask, reply, acknowledge, cancel, name, handover, presence registration, heartbeat, and unregister methods.

RPC receives a caller-supplied session ID because its SDK context exposes no authenticated session identity.
Do not treat RPC session IDs as authentication or expose the OpenCode service to untrusted callers.

## Delivery and trust

Cross-session sends evaluate the sender's permissions through `ctx.permission.assert`.
Permission actions include `session_comms.send`, `session_comms.ask`, `session_comms.reply`, `session_comms.acknowledge`, `session_comms.cancel`, `session_comms.handover`, and `session_comms.name`.
Resources identify the affected session.
Tool calls attach their tool source and agent metadata.
Your existing OpenCode permission rules determine whether an action is allowed, denied, or requires confirmation.

Messages enter the recipient's durable inbox with `delivery: "queue"`.
The plugin does not interrupt the recipient or claim that queue admission confirms agent processing.
Processing can start a model turn under the recipient's existing OpenCode configuration.

Incoming messages include the sender's session ID and an untrusted-peer warning.
Peer content is not user authorization.
The sender comes from the executing session, not a caller-supplied identity.
This warning is not a security sandbox. Keep normal tool and permission controls enabled.

The plugin does not read other sessions' transcripts or attach files automatically.
Session discovery exposes titles, directories, IDs, and status within the shared server.
Do not send credentials or private data to another session without authorization.

## Differences from Pi Intercom

- The TUI exports a Session Comms command and an `Alt+M` picker using native OpenCode dialogs.
- Picker flows include sending, asking, explicit-summary handover, incoming requests, and outgoing receipts.
- Attachments remain available through the agent tool, not the native compose dialogs.
- The picker fetches pending requests when an incoming, receipts, or cancellation flow is selected; it does not subscribe for live refresh.
- Separate `--standalone` servers and remote machines are not connected.
- There is no inferred reply, automatic processing receipt, inbox retraction, or supersede operation.
- There are no automatic handover summaries, file-reading attachments, pools, or supervisor bridges.
- There is no Pi broker, custom daemon, or Pi interoperability.

## Development

Run these commands in a source checkout:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm pack --dry-run --json
```

`prepack` runs the TypeScript build before `npm pack` or `npm publish`, so a clean checkout does not publish stale or missing `dist` files.
Tests use a fake OpenCode V2 context and the real SDK types. They do not invoke models or send messages to live sessions.
The current test run passes 125 tests and skips 3 tests for the intentionally disabled server slash commands.

`node validation/runtime-smoke.mjs` starts an isolated loopback OpenCode server with an in-memory database, no usable providers, and no usable models.
Set `SESSION_COMMS_PLUGIN_PATH` to an installed package directory to smoke-test a packed installation instead of the source checkout; set `OPENCODE_BIN` when `opencode` is not on `PATH`.
On OpenCode 2.3.2, the source checkout and packed tarball installation each passed 15 checks for plugin loading, disabled server slash-command registration, and read-only RPC list, status, and pending operations.
Those smoke tests created no prompts and sent no messages.
TUI rendering, live message processing, mutating RPC operations, live cross-project routing, and shared-service activation remain unverified.

For a local development load, build first and add the checkout directory to `plugins`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-session-comms"]
}
```

## Remove or update

Remove the plugin with OpenCode's plugin manager or remove only this plugin's configuration entry.
Existing queued messages and session history remain under OpenCode's control.
Rebuild local checkouts after source changes.
The package pins its SDK dependency to 2.2.7; check compatibility before upgrading OpenCode.

## License

MIT. See `LICENSE`.
Pi Intercom is also MIT-licensed; see its [upstream license](https://github.com/nicobailon/pi-intercom/blob/main/LICENSE).
