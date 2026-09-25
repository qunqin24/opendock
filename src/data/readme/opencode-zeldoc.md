# opencode-zeldoc

An [OpenCode](https://opencode.ai) plugin that shows **exactly the Zeldoc models
your API key can use**, with the right limits, prices and capabilities.

Without it, OpenCode lists the Zeldoc models from [models.dev](https://models.dev),
a static catalog that says nothing about your key. You may see models your key
cannot call, miss models it can, and get no context limits or capabilities for
Zeldoc's own models. This plugin asks Zeldoc which models your key has and
builds the model picker from that answer. When a model is removed from your key,
it disappears from OpenCode on the next start.

## How it works

```
OpenCode starts
        │
        ▼
opencode-zeldoc (provider.models hook for "zeldoc")
        │  • GET https://api.zeldoc.ai/v1/zeldoc/models with your API key
        │  • keeps the chat models your key may call
        │  • per model: context/output limits, your price per 1M tokens,
        │    tool calls, reasoning (+ effort levels), image and PDF input
        │  • display names come from models.dev where it knows the model
        ▼
the model picker shows only what your key can use
```

The plugin is resilient by design:

- **Graceful fallback**: if the Zeldoc endpoint is unreachable or slow
  (3 s timeout), OpenCode keeps the models.dev catalog instead of showing no
  models at all.
- **Nothing extra to configure**: it reuses the API key you already gave
  OpenCode for Zeldoc and the base URL from models.dev.
- **Prices are yours**: the catalog returns what your organization pays, so
  OpenCode's cost tracking matches your Zeldoc usage.

## Install

### From npm (recommended)

Add to your `opencode.json` (global or per-project):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-zeldoc"]
}
```

OpenCode installs the plugin automatically on next launch via Bun.

### From source (for development)

Clone this repo. The included `opencode.jsonc` loads the plugin from local
source:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["./src/index.ts"]
}
```

## Configure

Log in to Zeldoc once, if you have not already:

```bash
opencode auth login   # choose Zeldoc, paste your API key
```

The plugin uses that key. Without a stored login it falls back to the
`ZELDOC_API_KEY` environment variable, which OpenCode also reads for Zeldoc.

| Source                   | Used when                                   |
| ------------------------ | ------------------------------------------- |
| `opencode auth login`    | A Zeldoc API key is stored (preferred)      |
| `ZELDOC_API_KEY`         | No stored key                               |

The model list is fetched when OpenCode starts. After a change to your key's
models, restart OpenCode to see it.

## Develop

This repo uses [Flox](https://flox.dev) for a reproducible dev environment
(Bun). Tests use Bun's built-in test runner against a local HTTP server, no
mocks.

```bash
flox activate        # enter the dev env (runs bun install)
bun test             # run the unit tests
bun run typecheck    # typecheck
```

## License

MIT
