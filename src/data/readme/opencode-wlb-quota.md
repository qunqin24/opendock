# opencode-wlb-quota

[English](README.md) | [简体中文](README.zh-CN.md)

An OpenCode TUI plugin that displays WLB daily and weekly quota usage in the
footer. It refreshes every five minutes, provides a `/quota` refresh command,
and opens the WLB carpool page when `WLB` is clicked.

## Requirements

- OpenCode 1.18.5 or newer
- A configured OpenCode provider named `wlb`
- macOS, Windows, or Linux for clickable browser navigation

## Install

Add the npm package to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-wlb-quota"]
}
```

Restart OpenCode after changing the configuration.

## Provider configuration

The plugin reads `baseURL` and `apiKey` from the `wlb` provider. Keep the API
key in your own OpenCode configuration; it is never bundled with this plugin.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "wlb": {
      "npm": "@ai-sdk/openai",
      "name": "WLB",
      "options": {
        "baseURL": "http://codex.wlbclub.com/v1",
        "apiKey": "YOUR_WLB_API_KEY"
      }
    }
  }
}
```

## Usage

- The footer refreshes automatically every five minutes.
- Run `/quota` to refresh manually and show a status notification.
- Click the underlined `WLB` label to open <https://www.wlbclub.com/gpt-carpool>.

## Development

```sh
npm install
npm run typecheck
npm pack --dry-run
```

For local testing, reference the source file from `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./extensions/opencode-wlb-quota/src/tui.tsx"]
}
```

## License

MIT
