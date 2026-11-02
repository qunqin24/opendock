# @lunaticmuch/opencode-nanogpt-plugin

An [OpenCode v2](https://github.com/sst/opencode) TUI plugin that adds a NanoGPT usage panel to the right sidebar. Track your balance, usage over time, top models, and subscription quota at a glance — with automatic refresh every 60 seconds.

## Features

- **Balance** — See your current NanoGPT USD balance.
- **Usage overview** — Requests, net/gross cost, and token breakdown for the selected period.
- **Top models** — Quick view of your most-used models (configurable to show today's activity).
- **Subscription quota** — Visual progress bar and quota details if you're on a NanoGPT subscription.
- **Auto-refresh** — Updates every 60s, and also refreshes when sessions complete/fail.
- **Manual refresh** — Use the Command Palette: `Refresh NanoGPT usage`.

## Installation

### From npm (recommended)

1. Install the plugin in your OpenCode environment:

```bash
npm install @lunaticmuch/opencode-nanogpt-plugin
```

2. Add it to your OpenCode config (`~/.config/opencode/cli.json`):

```json
{
  "plugins": ["@lunaticmuch/opencode-nanogpt-plugin"]
}
```

3. Restart OpenCode — the "NanoGPT Usage" panel will appear in the sidebar.

### From a local path (development)

```json
{
  "plugins": ["/path/to/opencode-nanogpt-tui"]
}
```

## API Key

The plugin resolves your NanoGPT API key in this order:

1. `NANOGPT_API_KEY` environment variable
2. `provider.nanogpt.options.apiKey` in `opencode.jsonc`

Example `opencode.jsonc`:

```jsonc
{
  "provider": {
    "nanogpt": {
      "options": {
        "apiKey": "sk-...",
      },
    },
  },
}
```

## Configuration

All options can be set under `provider.nanogpt.options` in `opencode.jsonc`, or via environment variables.

| Option           | Values                          | Default        | Env var                    | Description                                                                                 |
| ---------------- | ------------------------------- | -------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `usagePeriod`    | `"last30Days"`, `"monthToDate"` | `"last30Days"` | `NANOGPT_USAGE_PERIOD`     | Time range for usage statistics.                                                            |
| `usageModelView` | `"byModel"`, `"lastDay"`        | `"byModel"`    | `NANOGPT_USAGE_MODEL_VIEW` | How to aggregate top models (`byModel` = over the selected period, `lastDay` = only today). |

## Model setup

Want to quickly add one or many NanoGPT models to your OpenCode configuration? Check out **[LunaticMuch/opencode-nanogpt](https://github.com/LunaticMuch/opencode-nanogpt)** — it provides helpers/scripts to install and configure NanoGPT models in OpenCode.

## Publishing

This package is published to npm as `@lunaticmuch/opencode-nanogpt-plugin`. Releases are created via [release-please](https://github.com/googleapis/release-please) when a release tag is pushed/created; publishing to the npm registry happens as part of that release workflow.

## License

[MIT](./LICENSE)
