# opencode-plan-usage

[English](./README.en.md) | [中文](./README.md)

An OpenCode plugin: check your **OpenCode Go plan usage and reset times** right from the TUI with the `/usage` command (or by asking an agent to call the `go_usage` tool) — no need to open a browser.

## Features

| Entry | Usage | Effect |
|-------|-------|--------|
| **TUI command** | Type `/usage` in the opencode input box and press Enter | A toast shows usage progress bars for the three windows plus reset times |
| **Agent tool** | Just ask an agent "check my Go plan usage" | The agent automatically calls the `go_usage` tool and reports back |

Three quota windows are shown (minimal three-line output):

- **Rolling 5h** ($12 cap): usage over a rolling 5-hour window
- **Weekly** ($30 cap): usage this week
- **Monthly** ($60 cap): usage this month

Each line shows, in order: progress bar + percentage + countdown until reset (`h:mm`, hours right-aligned to 3 chars with space padding, two-digit minutes).

## How it works

An official API is now available ([PR #16513](https://github.com/anomalyco/opencode/pull/16513), merged 2026-08-11):

```
GET https://opencode.ai/zen/go/v1/usage
Authorization: Bearer <opencode-go-api-key>
```

The API key is read directly from the `opencode-go` entry in `~/.local/share/opencode/auth.json` (supports overriding via the `XDG_DATA_HOME` and `OPENCODE_AUTH_CONTENT` environment variables) — no browser, workspace ID, or cookie required.

## Installation

### Option 1: Local path (current setup)

Add the directory pointed to by `exports` in `package.json` (this repo) to both config files:

**Server side** (`~/.config/opencode/opencode.jsonc`):
```jsonc
{
  "plugin": ["/Volumes/SourceCode/vscode/opencode-status"]
}
```

**TUI side** (`~/.config/opencode/tui.json`):
```json
{
  "plugin": ["/Volumes/SourceCode/vscode/opencode-status"]
}
```

> Create `tui.json` if it doesn't exist; keep existing plugins such as `oh-my-openagent` in both configs.

### Option 2: npm publish

```bash
npm publish
# then
opencode plugin install opencode-plan-usage
```

## Usage

```bash
# Inside the TUI
/usage

# Or just ask an agent
Use the go_usage tool to check my Go plan usage
```

Example output (toast):

```
OpenCode Go usage
▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫▫   0%   4:09
▪▪▪▪▪▪▫▫▫▫▫▫▫▫▫▫▫▫▫▫  32%  20:06
▪▪▪▪▪▪▪▪▪▪▪▫▫▫▫▫▫▫▫▫  53% 383:45
```

Actual output:

![/usage command output](./screenshots/screen-shot.png)

## Structure

```
screenshots/
  screen-shot.png   # Actual screenshot of the /usage command output
src/
  index.js   # Shared logic: read key, call API, format
  tui.js     # TUI plugin: /usage slash command (exports ./tui)
  server.js  # Server plugin: go_usage tool (exports ./server)
```

No runtime dependencies (`@opencode-ai/plugin` is used only for JSDoc type annotations) — pure ESM JavaScript, loadable directly by opencode's Bun runtime.

## Known limitations

- The API endpoint is an official new feature (launched 2026-08-11); the response structure may change across versions
- No polling cache; every call makes a real-time request (an interval of at least a few minutes is recommended)
- When `status: "rate-limited"`, the progress bar shows 100% (no extra marker in minimal mode; a full bar signals rate limiting)
