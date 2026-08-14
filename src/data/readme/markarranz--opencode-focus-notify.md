# @markarranz/opencode-focus-notify

Desktop notifications for [OpenCode](https://github.com/nicepkg/opencode) with click-to-focus for [kitty](https://sw.kovidgoyal.net/kitty/) terminal.

## Install

```bash
npm install @markarranz/opencode-focus-notify
```

### Prerequisites

- **macOS** (notifications use `terminal-notifier`)
- **kitty** terminal emulator
- **terminal-notifier**: `brew install terminal-notifier`

## Features

- Native macOS notifications for OpenCode events (idle, error, permission, question)
- Per-event notification sounds
- Click a notification to focus the exact kitty window/tab via `kitten @ focus-window`
- 350ms debounce on idle events

## License

MIT
