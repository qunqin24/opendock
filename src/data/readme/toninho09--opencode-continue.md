# @toninho09/opencode-continue

An [opencode](https://opencode.ai) plugin that adds a `/continue` command: it
resumes an interrupted run (aborted with `ESC`) **without adding a new
message** to the session and **without the model ever noticing the
interruption**.

Useful when you interrupt the agent mid-task and want it to redo the aborted
response as if the interruption had never happened — no orphaned partial
text, no "[Tool execution was interrupted]" in the context, no
"continuing from where I left off" meta-commentary, and no polluting the
history with messages like "continue" or "go on".

## Requirements

- A recent [opencode](https://opencode.ai) version (plugin API `>= 0.6.0`).

## Installation

Add the plugin to your `opencode.json` (project or global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@toninho09/opencode-continue"]
}
```

Or install from this repository (local checkout):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/path/to/opencode-continue/src/index.ts"]
}
```

Restart opencode after saving the config. That's it — the plugin
**self-registers** (the `/continue` command appears automatically, no need
to create a command file).

## Usage

```
/continue
```

- A run was started and interrupted with `ESC` → the plugin **removes the
  interrupted tail from the session** (the aborted assistant message, with
  its partial text and interrupted tools) and the agent **regenerates the
  full response** from the last completed step (or from the original
  prompt) — for the model and for the transcript, it's as if the
  interruption never existed. File edits already made are **not** undone.
- Session busy → warns and does nothing.
- Last run already completed → warns and does nothing (idempotent).
- Session with no user prompt → warns and does nothing.

## How it works

1. A `config` hook registers the `/continue` command.
2. When `/continue` runs, a `command.execute.before` hook validates the
   session (idle, has a user prompt, last run unfinished), identifies the
   **interrupted tail** after the last real user prompt — assistant
   messages with an error (the aborted response) and the plugin's own old
   neutral messages — and **deletes them from the session** via
   `DELETE /session/:id/message/:messageID` (an endpoint that does NOT
   revert file changes). Completed steps of the turn (tool calls with
   results) are preserved: the model naturally resumes after them.
   If deletion fails (server without the endpoint), the removed IDs are
   hidden from the context via the `experimental.chat.messages.transform`
   hook.
3. Finally, the hook **replaces the command's own parts**, in place, with
   a single empty, `ignored` text part. The command creates that message
   (effectively invisible) and runs the agent loop. Since opencode
   **filters `ignored`/empty parts** out of the provider conversion
   (`MessageV2.toModelMessagesEffect`), the model receives the clean
   history — ending at the last completed step or at the original prompt —
   and regenerates the response from scratch, **with no trace of the
   interruption**.

The original user message is **never rewritten nor re-sent** — neither in
the UI (its `time.created` is preserved, nothing jumps around) nor to the
model (the text does not go into the context again).

The mechanism mirrors opencode's own loop exit condition
(`SessionPrompt.runLoop`): a run without a valid `finish` = work pending;
a clean `finish` = nothing to continue.

## Known limitations

- **No-op cases**: busy session, already-completed run, or a session with
  no prompt cancel the command with a throw — the TUI shows the generic
  "failed to send command" toast in those cases (alongside the plugin's
  explanatory toast). On the normal path (an interrupted run) there is
  **no error at all**.
- **Continuation model**: the resume uses the session's current
  model/agent (not necessarily the ones from the aborted run).
- **Tool re-execution**: the response is regenerated from the last
  completed step — tools from the aborted step may run again (file edits
  remain; the model sees the current state of the files).
- **Name collision**: on opencode versions where `/continue` or `/resume`
  resolve to the session picker before custom commands, register one of
  the alternate names the plugin also intercepts: `retry`, `go` or `again`
  (e.g. `.opencode/command/retry.md` with any template). The hook
  intercepts those names automatically.
- The "real" solution would be a native `/session/:id/continue` endpoint
  exposing `SessionPrompt.loop()` — this plugin is the 100% plugin-API way
  until then.

## Development

```sh
bun install
bun run typecheck
```

## License

[MIT](LICENSE) © toninho09
