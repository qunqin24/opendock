# opencode-delete-messages

An [opencode](https://github.com/anomalyco/opencode) TUI plugin that deletes **only the last assistant message** of the current session, without reverting file changes.

## What it does

- Surgically deletes the last `role: "assistant"` message via `DELETE /session/{sessionID}/message/{messageID}`.
- Asks for **confirmation** before deleting (with a preview of the message).
- **Does not touch files on disk.** It does not revert edits or snapshots. It is not `/undo`.

## What it does NOT do

- Does not delete user messages or ranges.
- Does not delete multiple messages in a batch.
- Does not modify `/undo`, `/redo`, or `/timeline`.
- Does not implement context pruning.

## Requirements

- opencode with the `session.deleteMessage` endpoint (present since ~1.18.x; verified on 1.18.32).
- This is a **TUI-only** plugin, registered in `tui.json` (not `opencode.json`).

## Installation

### From npm (recommended)

Add it to your `tui.json` (global `~/.config/opencode/tui.json` or project `.opencode/tui.json`):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["opencode-delete-messages", { "keybind": "ctrl+alt+j" }]
  ]
}
```

The second tuple element (options) is optional — omit it to run the command without a keybind. Then restart opencode.

### From source (for development)

```bash
git clone https://github.com/fede-ciliberti/opencode-delete-messages
cd opencode-delete-messages
npm install
npm run build
```

Then register it by absolute path in `tui.json`:

```json
{
  "plugin": [
    ["/path/to/opencode-delete-messages", { "keybind": "ctrl+alt+j" }]
  ]
}
```

## Usage

- **Command palette** (`Ctrl+P`): "Delete last assistant message".
- **Slash**: `/delete-last`.
- **Keybind**: only if you set the `keybind` option.

When run: if there is a deletable last assistant message, a confirmation dialog appears with a preview; on confirm, the message is deleted. The session re-renders automatically (the TUI listens for the `message.removed` event).

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `keybind` | string | *(none)* | Key that triggers the command, e.g. `"ctrl+alt+j"`. |

> **Why it is not rebound through `tui.json`'s `keybinds`**: that object is a closed set of built-in commands and rejects unknown keys. Plugin keybinds are configured in the plugin's own options tuple.

## Guards and behavior

Before deleting, the plugin checks:

1. **Session route**: the command only acts inside a session.
2. **An assistant exists**: if not, it notifies and does not open the dialog.
3. **Not a compaction summary**: deleting a compaction's anchor message would break the compacted context; it is rejected.
4. **It is the last message**: the assistant to delete must be the session's last message.
5. **Session not busy**: it rejects only if `busy`/`retry`. An absent status means **idle** (the server omits idle sessions from its status map).
6. **Re-validation on confirm**: if the conversation changed between the dialog and the confirmation, it aborts without deleting.

## Error handling

| Situation | Result |
|---|---|
| Session busy (`409`) | "Session was busy — nothing deleted" |
| Session not found (`404` with `NotFoundError`) | "Session not found — it may have been deleted" |
| Endpoint missing in this version (generic `404`) | "This opencode version doesn't support deleting messages" |
| Network error / server down | "Could not reach opencode server" |
| Message already deleted | Silent success (the server is idempotent) |

## Development

```bash
npm run typecheck   # tsc over src + tests
npm test            # build + bun test
npm run build       # compile src -> dist
```

Structure:

- `src/pure.ts` — pure logic (selection, guards, preview, error mapping).
- `src/ports.ts` — minimal interfaces (ports) the `api`/SDK satisfy without casts.
- `src/flow.ts` — orchestration over the ports.
- `src/tui.ts` — entry: command/binding registration and adapters.

Design decisions and findings: [`docs/DESIGN.md`](docs/DESIGN.md). Manual QA checklist: [`QA.md`](QA.md).

## License

MIT.
