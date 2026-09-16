# @ailelabs/opencode-plugin

Zero-config [Aile](https://aile.sh) provider for the [opencode](https://opencode.ai) CLI.

Adds every model your Aile buyer key can reach to opencode's model picker — no
hand-written `provider` block, no per-model config. The plugin discovers models
dynamically from Aile's `/v1/models` catalog and injects your key on outbound
inference calls, against Aile's OpenAI- **and** Anthropic-compatible surface.

- **Dynamic model discovery** — models come from `GET {baseURL}/v1/models`, cached
  in-memory (5-min TTL) with a last-known-good disk snapshot fallback for offline
  starts.
- **Both surfaces** — Claude-family models route through `@ai-sdk/anthropic`
  (`/v1/messages`); everything else through `@ai-sdk/openai-compatible`
  (`/v1/chat/completions`). Aile serves both under `/v1`.
- **Key stays scoped** — the bearer is attached only to Aile's own inference paths
  on the configured relay origin (`/v1/chat/completions`, `/v1/messages`,
  `/v1/models`); it is never sent anywhere else.
- **Zero runtime dependencies** — Node built-ins only.

## Install

```bash
# in your opencode config directory, or globally
npm install @ailelabs/opencode-plugin
```

Then register it in `opencode.json` (project or `~/.config/opencode/opencode.json`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["@ailelabs/opencode-plugin", { "baseURL": "https://<your-relay>/v1" }]
  ]
}
```

`baseURL` is your **public relay origin's `/v1`** (e.g.
`https://relay.aile.example/v1`) — *not* the web app's `/relay` proxy. If you
omit it here, set it during `opencode auth login` instead.

## Authenticate

```bash
opencode auth login
# choose "Aile", paste your sk-aile-… buyer key
```

The key is stored in opencode's `auth.json`. From then on:

```bash
opencode          # Aile models appear in the picker
opencode -m opencode-aile/claude/claude-sonnet-5 "explain this repo"
```

Model ids are exactly what Aile advertises in `/v1/models`
(`<upstream>/<model>`, e.g. `openai/gpt-5.2`, `claude/claude-sonnet-5`). opencode
prefixes them with the provider id (`opencode-aile/…`) in the picker; only the
`opencode-aile` segment is opencode-internal — Aile receives the bare
`<upstream>/<model>` on the wire.

## Options

| Option              | Default                    | Notes                                                                   |
| ------------------- | -------------------------- | ----------------------------------------------------------------------- |
| `baseURL`           | — (or from `auth.json`)    | Relay `/v1` origin. Required to reach Aile.                              |
| `providerId`        | `"aile"`                   | Auto-prefixed to `opencode-aile` for opencode's native-adapter gate.    |
| `displayName`       | `"Aile"`                   | Label in the model picker / auth prompt.                                |
| `modelCacheTtl`     | `300000` (5 min)           | In-memory catalog cache TTL, ms.                                        |
| `anthropicProviderIds` | Aile's claude-format set | Upstream prefixes routed via `@ai-sdk/anthropic`.                       |
| `features.fetchInterceptor` | `true`             | Attach the bearer to inference calls.                                    |
| `features.diskCache` | `true`                    | Persist/read a last-known-good catalog snapshot.                         |

Peer dep `@opencode-ai/plugin` is **optional** — it is provided by the opencode
runtime; you do not need to install it.

## How it routes (for the curious)

opencode dispatches a model's map key **verbatim** as the wire `model`, stripping
only the provider's own `opencode-aile` segment. Aile's catalog ids are already
fully qualified (`claude/claude-sonnet-5`), and Aile's relay routes on that
exact string — so the plugin keys models by the raw id **unchanged** (it does not
re-prefix them, because a second prefix would reach the relay as a model id it
cannot route).

## Develop

```bash
bun install
bun test
bun run build   # → dist/index.js (+ best-effort dist/index.d.ts)
```

## License

MIT. See [LICENSE](LICENSE).
