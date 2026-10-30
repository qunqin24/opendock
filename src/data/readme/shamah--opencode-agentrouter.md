# @shamah/opencode-agentrouter

OpenCode adaptation of [madgagarin/pi-agentrouter](https://github.com/madgagarin/pi-agentrouter).

See original [README](https://github.com/madgagarin/pi-agentrouter/README.md). This README documents only installation and differences introduced by the adaptation.

## How to Install

### NPM Package

Add `@shamah/opencode-agentrouter` to your plugin list in `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@shamah/opencode-agentrouter"],
  "model": "agentrouter-openai/gpt-6.1-sol"
}
```

### Local Checkout

From this checkout:

```sh
npm install
npm run build
```

Use the checkout's absolute path in your OpenCode configuration:

```json
{
  "plugins": ["/absolute/path/to/opencode-agentrouter"],
  "model": "agentrouter-openai/gpt-6.1-sol"
}
```

### Authenticate

Use `/connect` → **AgentRouter**. Both provider families share the host integration's credentials. The upstream environment variables `AGENTROUTER_API_KEY` and `AGENT_ROUTER_API_KEY` also work.

## Commands

Each OpenCode action has its own slash command:

| Command | Description |
|---|---|
| `/agentrouter_status` | Show status, endpoint, monthly spend, pacing, and retries. |
| `/agentrouter_pricing` | Show model pricing and protocols; refresh the catalog and reload models. |
| `/agentrouter_sync` | Refresh the model catalog and reload models. |
| `/agentrouter_check` | Check model availability and monthly spend. Makes real API requests and consumes tokens. |
| `/agentrouter_pacing` | Show the current minimum request interval. |
| `/agentrouter_pacing <ms>` | Set the minimum request interval in milliseconds. Applies to new requests. |
| `/agentrouter_key <key>` | Save an API key and reload credentials. |

The standalone CLI keeps its existing action syntax, e.g. `opencode-agentrouter status` or `opencode-agentrouter pacing <ms>`. Use `opencode-agentrouter --help` for usage. CLI configuration changes require restarting OpenCode.

## Configuration location

Pi paths are replaced by OpenCode/XDG paths:

| File | Default location |
|---|---|
| Plugin configuration | `~/.config/opencode/agentrouter.json` |
| Pricing cache | `~/.local/state/opencode/agentrouter/.agentrouter-models-cache.json` |
| Shared pacing timestamp | `~/.local/state/opencode/agentrouter/.agentrouter-pacing` |
| Redacted retry diagnostics | `~/.local/state/opencode/agentrouter/.agentrouter-debug.log` |

`XDG_CONFIG_HOME` and `XDG_STATE_HOME` are respected. Configuration writes use owner-only permissions, not encryption.

In addition to upstream's `apiKey` and `minIntervalMs`, this adaptation accepts:

- `baseURL`: gateway root without `/v1`; defaults to `https://agentrouter.org`.
- `maxRetries`: transport retry count; defaults to upstream's ten retries. Set `0` to disable plugin retries. OpenCode may also apply its own retry policy.


MIT attribution is preserved in [LICENSE](LICENSE) and [NOTICE](NOTICE).
