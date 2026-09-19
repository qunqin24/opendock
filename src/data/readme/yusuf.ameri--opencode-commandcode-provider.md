# @yusuf.ameri/opencode-commandcode-provider

Command Code provider for [OpenCode](https://opencode.ai), built on Command Code's
[official Provider API](https://commandcode.ai/docs/provider).

Community-built and not affiliated with or endorsed by Command Code.

- Uses the documented `https://api.commandcode.ai/provider/v1` endpoints, not the
  internal CLI bridge.
- Fetches the live model catalog on every startup, so new models appear with no
  manual sync.
- Falls back to a local cache when the catalog request fails.
- Registers its own auth method so `/connect` works.

## Install

Add the plugin to `~/.config/opencode/opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@yusuf.ameri/opencode-commandcode-provider"]
}
```

Then connect once:

```
/connect
```

Search for **Command Code** and paste your API key. The same key that
authenticates the Command Code CLI works here.

Alternatively, provide the key with an environment variable:

```bash
export COMMANDCODE_API_KEY=your-key
```

## Models

The plugin fetches `GET /provider/v1/models` and registers every model served
over the OpenAI-compatible `/chat/completions` endpoint. Claude models are
`/messages`-only and are intentionally excluded from this provider; configure
them separately if your plan includes them.

Models are cached at `$XDG_CACHE_HOME/opencode/commandcode-models.json`
(`~/.cache/opencode/commandcode-models.json` by default) and refreshed on every
startup.

## Credential lookup

The API key is resolved in this order:

1. `COMMANDCODE_API_KEY`
2. `~/.local/share/opencode/auth.json` under `commandcode`
3. `~/.commandcode/auth.json` (the Command Code CLI login)

## Configuration

The plugin only fills in fields you have not set. To override anything, declare
the provider yourself:

```json
{
  "provider": {
    "commandcode": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Command Code",
      "options": { "baseURL": "https://api.commandcode.ai/provider/v1" }
    }
  }
}
```

## Development

```bash
bun install
bun run typecheck
bun test
```

## License

MIT
