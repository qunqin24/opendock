# opencode-snap-to-bottom

Typing snaps the opencode transcript back to the bottom, the way a terminal treats
scrollback.

opencode pins the transcript while output streams and after you submit, but once you
scroll up it stays up until you scroll all the way back down. In Claude Code the
transcript *is* the terminal's scrollback, so its behaviour is really the terminal
emulator's: any keystroke jumps to the bottom, new output does not, and the scrollback
keys never reach the app. This ports that rule.

## Install

```jsonc
// ~/.config/opencode/tui.json
{ "plugin": ["opencode-snap-to-bottom"] }
```

Or from a checkout: `{ "plugin": ["./path/to/opencode-snap-to-bottom"] }`.
Restart opencode afterwards.

## Behaviour

Snapping fires on any keystroke **except** opencode's own scroll and message-navigation
commands (`session.page.*`, `line.*`, `half.page.*`, `first`, `last`, `message.*`,
`messages_last_user`). It identifies those by recording the dispatched command name from
the keymap `dispatch` event, so it follows your keybinds — rebind them and it still works.

It does nothing while a dialog is open or in `modal`/`question` mode, so the command
palette's filter is never hijacked. Landing exactly on `scrollHeight - viewport.height`
re-arms opencode's own sticky scroll, so follow-the-output resumes.

## Options

```json
{ "plugin": [["opencode-snap-to-bottom", { "trigger": "typing" }]] }
```

| Option | Default | Meaning |
|---|---|---|
| `trigger` | `"any-key"` | Every keystroke except scroll commands (terminal-faithful). `"typing"` restricts it to characters actually landing in the prompt. |
| `paste` | `true` | Also snap when pasting into the prompt. |

## Verified against opencode 1.18.27

| Case | Result |
|---|---|
| Scroll up, type one character | Snaps to bottom |
| PageUp / PageDown | Still scroll freely |
| `Home` (jump to first message) | Stays at top |
| Esc, ↑ history recall | Snap |
| Palette open, typing a filter | Transcript stays put |
| Typing while already at bottom | No-op |

Finding the transcript: it is the only scrollbox in the TUI with
`stickyScroll && stickyStart === "bottom"`, which makes that a stable discriminator —
the sidebar, dialogs, autocomplete and diff viewer all have non-sticky scrollboxes.
