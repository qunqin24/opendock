# opencode-v2-cli-codex-usage

OpenCode V2 CLI plugin that displays remaining OpenAI Codex usage limits, reset countdowns, credits, and banked resets in the terminal sidebar.

It queries the ChatGPT Codex rate-limit API and renders real-time remaining quota percentages, live countdown timers, plan type, credits balance, and reset credits.

---

## Highlights

- **Zero External Dependencies Required**: Automatically retrieves credentials from OpenCode's own database (`~/.local/share/opencode/opencode.db`). There is **no need to install the separate `codex` CLI** or run `codex login` if you are already signed in to OpenAI in OpenCode.
- **Backward-Compatible Fallback**: Also seamlessly checks `~/.codex/auth.json` (with security validation) if present.
- **Native OpenCode V2 Architecture**: Built with `@opencode/plugin/tui` using the `sidebar.content` slot and OpenTUI universal components.
- **Persistent State**: The collapsed/expanded state is saved using OpenCode's durable storage (`context.storage.store`), persisting across restarts and hot reloads.
- **Live Countdowns**: Ticks every second to count down until window resets (e.g. `2h 15m`).
- **Background Refresh**: Safely polls usage data in the background (stale-while-revalidate every 60 seconds).
- **Remaining Percentage**: Displays remaining quota (e.g. `95% left`), not consumed percentage.
- **Customizable & Themed**: Fully integrated with OpenCode semantic theme tokens (`context.theme.text.*`).

---

## Display

### Collapsed
```text
▶ Codex Usage (5h 95% left)
```

### Expanded
```text
▼ Codex Usage
  Plan     PLUS
  5h       95% (4h 38m)
  Weekly   4% (1d 11h)
  Credits  $171.55
  Resets   3 available
```

---

## Installation

### Option 1: Global CLI Settings (Recommended)

Add the plugin to your global `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "opencode-v2-cli-codex-usage"
  ]
}
```

### Option 2: Project Configuration (`opencode.jsonc`)

Add the package to `plugins` in your project's `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-v2-cli-codex-usage"
  ]
}
```

---

## Authentication Sources

The plugin resolves OpenAI credentials automatically using the following order:

1. **OpenCode Database (Primary)**:
   - Path: `~/.local/share/opencode/opencode.db` (or `$XDG_DATA_HOME/opencode/opencode.db`).
   - Reads the active OpenAI OAuth token directly from the `credential` table.
   - When OpenCode refreshes tokens, this plugin automatically receives the newest token.
2. **Codex CLI Auth File (Fallback)**:
   - Path: `~/.codex/auth.json`.
   - Security verification ensures the file is not a symlink, has safe permissions, and is an authentic Codex CLI auth file.

If no credentials are found in either source, the sidebar displays:
```text
Sign in with OpenAI in OpenCode (/connect)
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `OPENCODE_CODEX_USAGE_DISABLED` | Set to `"true"` to disable all usage network requests entirely. |
| `OPENCODE_DB_PATH` | Override path to `opencode.db` (defaults to `~/.local/share/opencode/opencode.db`). |

---

## Development & Building

Requirements:
- [Bun](https://bun.sh) (v1.2+) or Node.js (v22+)

```bash
# Install dependencies
bun install

# Run unit tests
bun test

# Type-check TypeScript
npm run check

# Build production bundle
bun run build
```

---

## License

MIT
