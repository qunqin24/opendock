# opencode-cloakpipe

OpenCode plugin for using [CloakPipe](https://github.com/borgius/cloakpipe) as a privacy layer.

The plugin masks provider-bound prompt and tool-history text through CloakPipe, then restores placeholders in completed assistant text and local tool arguments.

## Other CloakPipe plugins

If you use a different coding tool, similar CloakPipe integrations are also available for:

- [Claude Code (`claude-cloakpipe`)](https://github.com/borgius/claude-cloakpipe)
- [Hermes (`hermes-cloakpipe`)](https://github.com/borgius/hermes-cloakpipe)
- [Pi (`pi-cloakpipe`)](https://github.com/borgius/pi-cloakpipe)

## Why this differs from claude-cloakpipe

Claude Code hooks cannot replace the prompt before Claude Code sends it to the provider, so `claude-cloakpipe` uses a local Anthropic-compatible gateway.

OpenCode exposes provider-bound chat transform hooks. This plugin uses those hooks directly, so the MVP does not need a provider gateway.

## Request flow

1. OpenCode prepares the message history for a provider call.
2. `opencode-cloakpipe` handles `experimental.chat.messages.transform` and calls CloakPipe `/v1/pseudonymize` for text fields.
3. The provider receives placeholders instead of plaintext sensitive values.
4. When assistant text completes, `experimental.text.complete` calls CloakPipe `/v1/rehydrate` so local display is natural.
5. Before local tools run, `tool.execute.before` rehydrates tool args so shell commands and file edits use real local values.

Historical tool inputs and outputs are also masked before each provider call. OpenCode may store real local tool args and output, so this step prevents old local tool data from leaking in later turns.

## Install

OpenCode supports two standard plugin install paths:

- npm package config, managed by `opencode plugin <module>`.
- local plugin files under `.opencode/plugins/` or `~/.config/opencode/plugins/`.

Use the npm path after this package is published:

```bash
opencode plugin opencode-cloakpipe
```

Install it globally for every project:

```bash
opencode plugin opencode-cloakpipe --global
```

OpenCode records npm plugins in `opencode.json` or `~/.config/opencode/opencode.json`, then installs packages with Bun at startup. You can also edit config directly:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cloakpipe"]
}
```

Pass plugin options with the tuple form:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-cloakpipe",
      {
        "baseUrl": "http://127.0.0.1:3100/v1",
        "strict": true,
        "debug": false
      }
    ]
  ]
}
```

For local development, build this checkout and install a local plugin shim:

```bash
npm install
npm run build
npx opencode-cloakpipe install
```

The helper writes `.opencode/plugins/opencode-cloakpipe.js`, which OpenCode loads automatically at startup. Install the shim globally when you want this checkout available in every project:

```bash
npx opencode-cloakpipe install --global
```

Install into a custom config directory when you launch OpenCode with `OPENCODE_CONFIG_DIR`:

```bash
npx opencode-cloakpipe install --config-dir /path/to/opencode-config-dir
OPENCODE_CONFIG_DIR=/path/to/opencode-config-dir opencode
```

Re-run the install helper after moving or rebuilding this checkout. Use `--force` if an older shim already exists.

You can still load the built file explicitly from `opencode.json` during development:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file://../opencode-cloakpipe/dist/index.js"]
}
```

## Configuration

Options in `opencode.json` override environment variables. Environment variables override defaults.

| Option | Environment variable | Default |
| --- | --- | --- |
| `enabled` | `OPENCODE_CLOAKPIPE_ENABLED` | `true` |
| `baseUrl` | `OPENCODE_CLOAKPIPE_BASE_URL`, then `CLOAKPIPE_BASE_URL` | `http://127.0.0.1:3100/v1` |
| `strict` | `OPENCODE_CLOAKPIPE_STRICT` | `true` |
| `timeoutMs` | `OPENCODE_CLOAKPIPE_TIMEOUT_MS` | `30000` |
| `healthTimeoutMs` | `OPENCODE_CLOAKPIPE_HEALTH_TIMEOUT_MS` | `3000` |
| `debug` | `OPENCODE_CLOAKPIPE_DEBUG` | `false` |
| `transformSystem` | `OPENCODE_CLOAKPIPE_TRANSFORM_SYSTEM` | `true` |
| `restoreAssistantText` | `OPENCODE_CLOAKPIPE_RESTORE_ASSISTANT_TEXT` | `true` |
| `restoreToolArgs` | `OPENCODE_CLOAKPIPE_RESTORE_TOOL_ARGS` | `true` |
| `transformToolDefinitions` | `OPENCODE_CLOAKPIPE_TRANSFORM_TOOL_DEFINITIONS` | `false` |
| `extraSkipKeys` / `skipKeys` | `OPENCODE_CLOAKPIPE_EXTRA_SKIP_KEYS` | none |

`skipKeys` and `extraSkipKeys` add keys to the default skip list. The default list preserves structural and binary fields such as `id`, `sessionID`, `type`, `role`, `url`, `data`, and `signature`.

## Doctor command

Check resolved config and CloakPipe health:

```bash
npm run build
npx opencode-cloakpipe doctor
```

Print non-secret config:

```bash
npx opencode-cloakpipe print-config
```

## Privacy boundary

- Provider-bound message history and system prompts are masked before transport.
- Historical tool inputs and outputs are masked before later provider calls.
- Assistant text and tool args are restored locally when the matching hooks run.
- Logs include hook names, status, and counts only. They must not include raw prompt text, tool output, or credentials.
- OpenCode local storage may still contain restored plaintext. Treat local-at-rest redaction as a separate mode, not part of this MVP.

## Limitations

- The key OpenCode hooks are currently experimental. Pin and test against the OpenCode version you use.
- Streaming deltas may briefly show placeholders until `experimental.text.complete` restores the final text.
- The MVP is text-first. It skips structural and binary-looking fields.
- CloakPipe must be running before strict-mode provider calls.
- `transformToolDefinitions` is off by default because rewriting tool descriptions can reduce tool clarity.

## Development

Run all checks:

```bash
npm test
npm run typecheck
```

Useful files:

- `src/index.ts` — plugin hooks.
- `src/config.ts` — option and env parsing.
- `src/privacy.ts` — CloakPipe HTTP client.
- `src/transforms.ts` — message, system, and tool-arg transforms.
- `src/cli.ts` — doctor command.
- `tests/` — Node test suite with a fake CloakPipe server.
