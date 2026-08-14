# @tokenmix/opencode-plugin

Adds three [tokenmix.ai](https://tokenmix.ai) account tools to [OpenCode](https://github.com/sst/opencode) so the agent can browse models, open the top-up page, and hint about balance from inside a coding session.

## Install

In your `opencode.json`:

```json
{
  "plugin": ["@tokenmix/opencode-plugin"]
}
```

OpenCode auto-installs the npm package on first run.

## What the plugin gives the agent

| Tool | What it does |
|---|---|
| `tokenmix_models` | List all tokenmix-served models and prices, optionally filtered by `type` (chat / image / video / audio / embedding) |
| `tokenmix_topup` | Opens `tokenmix.ai/dashboard/credits` in the user's default browser |
| `tokenmix_balance` | Returns your live balance — available, balance, gift credit, total spent — via the API-key-authenticated `GET /v1/wallet`, plus a top-up link |
| `tokenmix_usage` | Reports token usage (input / output / total) for the current OpenCode session |

The agent decides when to call these — for example, when the user asks "show me what models I can use" or "I'm running low, top me up."

## Low-balance alerts

When the assistant finishes a turn, the plugin checks your wallet (throttled to once a minute) and shows a **one-time toast** if your available balance drops below a threshold — so you're warned before a request fails. Set the threshold (USD, default `1`) in `opencode.json`:

```json
{
  "plugin": [["@tokenmix/opencode-plugin", { "lowBalanceThreshold": 2 }]]
}
```

Every wallet/TUI call is wrapped, so a network or headless-server failure never disrupts your session.

## Companion CLI

Want zero-config setup of OpenCode + tokenmix? Try [`npx tokenmix opencode`](https://github.com/TokenMixAi/tokenmix-cli) — installs OpenCode, signs you in by browser, writes the config, and launches.

## Roadmap

- ~~**v0.2** — Live balance via tokenmix `/v1/wallet`~~ ✅ shipped
- ~~**v0.3** — per-session token usage (`tokenmix_usage`) + low-balance toast~~ ✅ shipped
- **v0.4** — Optional cache_control injection for anthropic-routed requests (cheaper repeated context)
- **Future** — localized output (中文 / 日本語 / 한국어 / Español / Français), matching the CLI

## License

MIT
