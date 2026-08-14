# opencode-usage-left

OpenCode TUI plugin that lists every provider shown by `opencode auth list` in the session sidebar.

- Percentage quotas show a bar, percentage remaining, and time until reset.
- Credit quotas show the provider, balance, and amount left.
- Click the section or any provider header to fold and unfold it.
- Providers without an accessible usage API remain listed as unavailable.
- Credentials are read from OpenCode's XDG auth store on every refresh and are never logged or cached.

Supported usage adapters: OpenAI/Codex, Anthropic OAuth, OpenRouter, Z.AI Coding Plan, Synthetic, MiniMax Token Plan, OpenCode Zen, and OpenCode Go.

OpenCode does not currently expose Zen balance or Go quota endpoints for API keys. Their adapters use the authenticated workspace dashboard. Store the credentials in `~/.config/opencode/opencode-usage-left.json`:

```json
{
  "openCode": {
    "workspaceId": "wrk_...",
    "authCookie": "your-opencode.ai-auth-cookie"
  }
}
```

Protect the browser session cookie from other users:

```bash
chmod 600 ~/.config/opencode/opencode-usage-left.json
```

The plugin follows `XDG_CONFIG_HOME`. Set `OPENCODE_USAGE_LEFT_CONFIG` to use another path. Environment variables are temporary overrides and take precedence over the file:

```bash
export OPENCODE_GO_WORKSPACE_ID="wrk_..."
export OPENCODE_GO_AUTH_COOKIE="your-opencode.ai-auth-cookie"
```

Find the `auth` cookie in your browser's developer tools under Storage/Cookies for `opencode.ai`. It is only sent to fixed `https://opencode.ai/workspace/...` URLs and is never logged or cached. Without stored credentials, Zen and Go display `need creds`.

## Install

Install the package, then add it to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-usage-left"]
}
```

For local development, use the package directory so OpenCode resolves its runtime-safe `./tui` source entrypoint:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-usage-left"]
}
```

Restart OpenCode after changing `tui.json`.

## Options

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-usage-left",
      {
        "refreshIntervalSeconds": 60,
        "requestTimeoutMs": 10000,
        "showUnavailable": true
      }
    ]
  ]
}
```

Provider quota endpoints are not standardized and some are private APIs that may change. A failed provider request is isolated and does not prevent other balances from rendering.
