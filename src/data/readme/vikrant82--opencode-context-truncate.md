# opencode-context-truncate

An OpenCode plugin for **hiding old conversation context from future model
requests** without deleting your visible OpenCode history.

Use it when a recent part of a session has gone down the wrong path and you want
future prompts to behave as if that part of the conversation never happened —
without starting a new session and without paying for an LLM summarization step.

## What it does

`opencode-context-truncate` adds three slash commands:

```text
/truncate_user_turns 5
/truncate_status
/truncate_clear
```

When you run `/truncate_user_turns N`, the plugin:

1. Looks at the current session history.
2. Counts backward by real user messages.
3. Stores a fixed hidden range from the Nth most recent user message through the
   current latest message.
4. Removes that range from future model prompts.

Your OpenCode UI and session history remain unchanged. Only future LLM requests
are filtered.

## When to use it

Good fits:

- You tried an approach and want the model to forget it.
- A long debugging branch is no longer relevant.
- You pasted large context that should not be sent again.
- You want a cheap alternative to summarization/compression.

Not a fit:

- You want a summary of the hidden content.
- You want to physically delete messages from OpenCode history.
- You want token accounting or automatic pruning.

## Installation

### Local development install

Clone or keep this project somewhere on disk, then install and build it:

```sh
npm install
npm run build
```

Add the plugin path to your OpenCode config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/Users/chauv/vibe-tools/opencode-context-truncate"],
}
```

Then fully quit and restart OpenCode. OpenCode loads plugins at startup and does
not hot-reload plugin config.

### npm package install

If this package is published to npm, configure it by package name instead of a
local path:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@vikrant82/opencode-context-truncate"],
}
```

Restart OpenCode after changing the config.

## Commands

### `/truncate_user_turns N`

Hide the last `N` real user-turn windows from future model prompts.

Example:

```text
/truncate_user_turns 3
```

Important details:

- `N` counts user messages, not assistant replies, tool calls, or ignored plugin
  notifications.
- The hidden range is fixed at command time.
- New messages sent after the command remain visible to the model.
- If fewer than `N` user messages exist, the plugin hides from the oldest real
  user message it can find and reports the actual count.
- The command itself does not call the model.

### `/truncate_status`

Show active hidden ranges for the current session.

```text
/truncate_status
```

### `/truncate_clear`

Clear active hidden ranges for the current session.

```text
/truncate_clear
```

After clearing, future model prompts can see the full session context again.

## Persistence

Hidden ranges are persisted and survive OpenCode restarts until you clear them.

State is stored as JSON under OpenCode's data directory:

```text
$XDG_DATA_HOME/opencode/storage/plugin/context-truncate/state.json
```

If `XDG_DATA_HOME` is unset, the plugin uses:

```text
~/.local/share/opencode/storage/plugin/context-truncate/state.json
```

Writes are atomic. If the state file is corrupt, the plugin renames it aside and
starts with empty state.

## Example workflow

1. Work normally in an OpenCode session.
2. Realize the last few user turns led the model in the wrong direction.
3. Run:

   ```text
   /truncate_user_turns 4
   ```

4. Optionally check what is hidden:

   ```text
   /truncate_status
   ```

5. Continue with a new prompt. The model will not see the hidden historical
   range, but your OpenCode history remains visible.
6. Undo the filtering if needed:

   ```text
   /truncate_clear
   ```

## Development

Useful commands:

```sh
npm install
npm run typecheck
npm run build
npm run format:check
```

Format files with:

```sh
npm run format
```

## Current limitations

- State is per OpenCode session ID.
- There is no automatic cleanup for stale sessions yet.
- There is no summarization or token accounting.
- The plugin depends on OpenCode's experimental chat message transform hook.

## Troubleshooting

### The commands are not available

- Confirm the plugin is listed in your OpenCode config.
- Confirm the local path is correct, or that the npm package is installed and
  resolvable.
- Restart OpenCode after changing config.

### Hidden context still appears to be used

- Run `/truncate_status` in the same session.
- Make sure you cleared or truncated the intended session.
- Remember that only future model prompts are filtered; existing visible history
  is intentionally unchanged.

### I want to reset all persisted state manually

Delete the state file:

```sh
rm ~/.local/share/opencode/storage/plugin/context-truncate/state.json
```

If you use `XDG_DATA_HOME`, delete the file under that directory instead.
