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

The package ships two halves: a server plugin that resolves Codex credentials
from OpenCode V2's credential store, and the terminal sidebar.
`opencode plugin add` registers the server half; the sidebar half is configured
separately in `cli.json`.

<br clear="both" />

Add the sidebar and its options to the global `cli.json`:

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

When developing locally from this repository, point both configurations at the
built directory instead:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["file:///home/me/src/opencode-multi-usage/dist"],
}
```

```json
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "file:///home/me/src/opencode-multi-usage/dist",
      "options": {
        "providers": ["codex"]
      }
    }
  ]
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

1. OpenCode's `openai` integration connection, resolved on the server by the
   bundled server plugin. On OpenCode V2 this is the live credential store: the
   ChatGPT login from `/connect` and its OAuth refreshes live there, not in
   `auth.json`.
2. `CHATGPT_ACCESS_TOKEN`, with optional `CHATGPT_ACCOUNT_ID`.
3. `OPENCODE_AUTH_CONTENT` containing OpenCode auth JSON.
4. OpenCode's legacy `auth.json` OpenAI OAuth entry.

Credential sources 2-4 are only used when the server plugin is not registered or
the RPC is unreachable. On V2, registering the server plugin (see above) is what
keeps Codex usage working after the OAuth token refreshes.

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
On OpenCode V2, ChatGPT credentials are read through the server plugin and the
integration API, so reconnecting from `/connect` updates what the sidebar sees.
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
