# @zhzy0077/opencode-terminal-title

Terminal title plugin for OpenCode - updates terminal window title based on session state.

## Installation

```bash
opencode plugin add @zhzy0077/opencode-terminal-title
```

Or for local development:

```bash
opencode plugin add file:///path/to/opencode-terminal-title
```

## Features

- Updates terminal title with session status
- Shows current working state with icons
- Truncates long titles automatically
- **Herdr support:** when `HERDR_ENV=1`, also renames the Herdr pane and publishes `pane.report-metadata` (`--title` / `--display-agent`) so the Herdr sidebar matches the outer terminal title

## States

| Icon | Status | Description |
|------|--------|-------------|
| `[*]` | Working | Session is processing |
| `[✓]` | Done | Session is idle |
| `[✗]` | Error | An error occurred |
| `[?]` | Waiting | Waiting for permission |

## Title Format

```
[Icon] Status | Session Title
```

Example: `[*] Working | How to implement auth...`

## Build

```bash
npm install
npm run build
```

## License

MIT
