# opencode-multi-usage

<img src="demo.png" alt="Demo of the usage sidebar" align="right" width="380" />

OpenCode sidebar plugin that displays subscription usage for:

- ChatGPT Codex
- OpenCode Go
- CommandCode

Providers are opt-in. If none are configured, the sidebar shows a short setup
message and the plugin makes no usage requests.

Install from npm as
[`opencode-multi-usage`](https://www.npmjs.com/package/opencode-multi-usage):

```sh
# OpenCode v1
opencode plugin opencode-multi-usage --global

# OpenCode v2
opencode2 plugin add opencode-multi-usage
```

Then enable providers as shown below.

<br clear="both" />

## OpenCode v1

> [!WARNING]
> Support for OpenCode v1 may be dropped at any moment following the official
> stable release of OpenCode v2. Prefer the v2 setup for new installs.

Requires OpenCode 1.18.29 or newer. Add the package and options to
`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-multi-usage", { "providers": ["codex", "opencode-go", "commandcode"] }]]
}
```

Restart OpenCode after changing v1 TUI configuration.

## OpenCode v2

Add the package and options to `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-multi-usage",
      "options": {
        "providers": ["codex", "opencode-go", "commandcode"],
      },
    },
  ],
}
```

The package exports both the v2 server entrypoint and its `./tui` CLI
entrypoint. OpenCode loads the CLI entrypoint automatically.

## Options

`providers` is an array containing any of `"codex"`, `"opencode-go"`, and
`"commandcode"`. The default is an empty array.

Set one refresh interval for every enabled provider:

```json
{
  "providers": ["codex", "opencode-go"],
  "refreshInterval": "5m"
}
```

Intervals accept `s`, `m`, `h`, or `d`. Values below 10 seconds are clamped to
10 seconds. Without an override, Codex refreshes every 30 seconds and the other
providers refresh every 5 minutes.

## Authentication

### Codex

Checked in this order:

1. `CHATGPT_ACCESS_TOKEN`, with optional `CHATGPT_ACCOUNT_ID`.
2. `OPENCODE_AUTH_CONTENT` containing OpenCode auth JSON.
3. OpenCode's `auth.json` OpenAI OAuth entry.

### OpenCode Go

Checked in this order:

1. `OPENCODE_GO_API_KEY`.
2. OpenCode's `auth.json` `opencode-go` entry.
3. OpenCode's `account.json` `opencode-go` account.

### CommandCode

Checked in this order:

1. `COMMANDCODE_API_KEY` or `COMMAND_CODE_API_KEY`.
2. OpenCode's `auth.json` `commandcode` entry.
3. `~/.commandcode/auth.json`.

`COMMANDCODE_API_URL` overrides the CommandCode API base URL.

## Stability

The Codex integration calls the undocumented internal endpoint
`https://chatgpt.com/backend-api/wham/usage`, which may change without notice.
Reconnect the affected provider when a saved credential is rejected.

## Development

```bash
npm install
npm run typecheck
npm test
```

Format with [Prettier](https://prettier.io) (`printWidth: 100`):

```bash
npm run format
npm run format:check
```

## License

MIT
