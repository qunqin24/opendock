# @ymchun/opencode-ollama-usage

<!-- CSpell:ignore safehouse -->

![npm](https://img.shields.io/npm/v/@ymchun/opencode-ollama-usage.svg)
![npm](https://img.shields.io/npm/d18m/@ymchun/opencode-ollama-usage.svg)

An opencode TUI plugin for Ollama usage information.

![home](https://github.com/ymchun/opencode-ollama-usage/blob/5d148b46e0fedd2721d9205749bf80db8afb09f0/assets/screenshot_home-1.png)

![session](https://github.com/ymchun/opencode-ollama-usage/blob/5d148b46e0fedd2721d9205749bf80db8afb09f0/assets/screenshot_session-1.png)

## Why This Plugin

A quick shortcut to check my quota usage would be fantastic, rather than navigating to the settings page every time.

## Quick Start

Add the plugin to your `~/.config/opencode/tui.json` & start `opencode`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@ymchun/opencode-ollama-usage@latest"]
}
```

## Environment Variables

### `OLLAMA_SESSION_COOKIE` (required)

Your Ollama session cookie, used to authenticate requests to the [Ollama settings page](https://ollama.com/settings). Without it the plugin shows **No Cookie** in the sidebar.

**How to get it:**

1. Sign in at [ollama.com](https://ollama.com) in your browser
2. Open **DevTools** → **Application** → **Cookies** → `https://ollama.com`
3. Copy the value of the cookie named `__Secure-session`
4. Set it as the environment variable:

```bash
# In your shell profile (~/.zshrc, ~/.bashrc, etc.)
export OLLAMA_SESSION_COOKIE="<your-session-cookie-value>"
```

Or set it in your `opencode.json`:

```json
{
  "env": {
    "OLLAMA_SESSION_COOKIE": "<your-session-cookie-value>"
  }
}
```

> **Note:** The session cookie expires periodically. When it does, the plugin will show **Signed Out** — repeat the steps above to update the value.

### `OLLAMA_QUOTA_REFRESH_INTERVAL` (optional)

How often (in milliseconds) the plugin refreshes quota data. Defaults to `300000` (5 minutes).

```bash
export OLLAMA_QUOTA_REFRESH_INTERVAL=60000  # refresh every minute
```

## Troubleshooting

### Error Codes

The plugin shows different status messages in the sidebar depending on the state of your connection and quota data. Here's what each message means:

| Message            | Meaning                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **Connect Ollama** | No quota data has been fetched yet (initial state).                                              |
| **No Cookie**      | `OLLAMA_SESSION_COOKIE` is not set.                                                              |
| **Signed Out**     | The session cookie has expired or is invalid.                                                    |
| **Missing Data**   | The Ollama settings page loaded, but no quota fields (session, weekly, plan) could be extracted. |
| **Network Error**  | The fetch to `ollama.com/settings` failed (timeout, DNS failure, or non-OK HTTP response).       |
| **Unknown Error**  | An unrecognized error occurred.                                                                  |

> **Tip:** You can force an immediate refresh by restarting `opencode` or by setting `OLLAMA_QUOTA_REFRESH_INTERVAL` to a shorter interval (e.g. `60000` for 1 minute) to see if the issue resolves on the next cycle.

### Using with [agent-safehouse](https://github.com/eugene1g/agent-safehouse)

Prepare an env file, place it somewhere (`/path/to/agent-safehouse.env`)

```.env
OLLAMA_QUOTA_REFRESH_INTERVAL=6000
OLLAMA_SESSION_COOKIE='__Secure-session=...'
```

Start the agent-safehouse as follows

```bash
$ safehouse --env=/path/to/agent-safehouse.env -- opencode --opencode-options
```

## Development

```bash
bun install
bun run build
bun test
```

## License

MIT
