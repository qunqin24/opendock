# opencode-multi-usage

<img src="demo.png" alt="Demo of the usage sidebar" align="right" width="380" />

OpenCode sidebar plugin that displays subscription usage for:

- ChatGPT Codex
- OpenCode Go
- CommandCode

Providers are opt-in. If none are configured, the sidebar shows a short setup
message and the plugin makes no usage requests.

Install from npm as [`opencode-multi-usage`](https://www.npmjs.com/package/opencode-multi-usage):

```sh
opencode plugin add opencode-multi-usage --global
```

Then enable providers as shown below.

<br clear="both" />

This package provides a terminal sidebar, so add it and its options to the
global `cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-multi-usage",
      "options": {
        "providers": ["codex", "opencode-go", "commandcode"]
      }
    }
  ]
}
```

When developing locally from this repository, point `package` at the built
directory instead:

```json
{
  "package": "file:///home/me/src/opencode-multi-usage/dist",
  "options": {
    "providers": ["codex"]
  }
}
```

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

1. `COMMANDCODE_USAGE_API_KEY` (an explicit usage credential).
2. `COMMANDCODE_API_KEY`, `COMMAND_CODE_API_KEY`, or `CMD_API_KEY`.
3. `~/.commandcode/auth.json`.
4. `OPENCODE_AUTH_CONTENT` or OpenCode's `auth.json` `commandcode` entry.

The plugin tries the next credential when CommandCode rejects one for the
private `/alpha/*` billing API. This matters when `/connect` contains a
Provider-only Studio key: it can call `/provider/v1/*`, but may not be allowed
to read subscription usage. Run `cmd auth login` to populate
`~/.commandcode/auth.json`, or set `COMMANDCODE_USAGE_API_KEY` to explicitly
choose a usage-capable key. Do not put API keys directly in `cli.json`.

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
