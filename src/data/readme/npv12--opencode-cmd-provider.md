# opencode-cmd-provider

[![CI](https://github.com/npv12/opencode-cmd-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/npv12/opencode-cmd-provider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@npv12/opencode-cmd-provider)](https://www.npmjs.com/package/@npv12/opencode-cmd-provider)

A provider and plugin for [OpenCode](https://opencode.ai) that connects to the [Command Code](https://commandcode.ai) Provider API. This enables you to use ALL Command Code plans — Go, GOAT, Pro, Max 10×, Max 20×, Provider, Team, and Enterprise — with OpenCode.

> **Disclaimer:** This is an unofficial, community-maintained integration. It is not affiliated with, endorsed by, or supported by Command Code. You need your own Command Code account and API key or subscription. Command Code's terms, availability, and pricing apply.

## Install

```sh
opencode plugin @npv12/opencode-cmd-provider
```

Update an existing install:

```sh
opencode plugin @npv12/opencode-cmd-provider --force
```

Install globally (available in every project):

```sh
opencode plugin @npv12/opencode-cmd-provider --global
```

Manual config also works:

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@npv12/opencode-cmd-provider"],
}
```

Then authenticate:

```txt
/connect
```

Select **Command Code**, paste your API key, and pick a model with `/models`.

## Authentication

### Browser login

Run `/connect` in OpenCode and select **Command Code**. Paste your API key when prompted.

### Environment variable

```sh
export COMMANDCODE_API_KEY="user_..."
```

## Usage

Pick a model with `/models`, or run non-interactively:

```sh
opencode run --model commandcode/claude-sonnet-5 "hello"
```

## Model discovery and offline behavior

The plugin ships a bundled catalog and auto-registers every model into
OpenCode's config at startup using the plain catalog name (e.g.
`Claude Sonnet 5`). Model availability changes when the package is updated. You
can still declare your own `provider.commandcode` entry; your declarations
always win and the snapshot fills in only what's missing (`whitelist`/
`blacklist` on a declared entry filter the auto-registered models too).

- Snapshot — `src/catalog/snapshot.ts` (model ids, names, context lengths) plus
  `src/catalog/facts.ts` (reasoning efforts, per-1M-token rates, input
  modalities). Regenerated from the live catalog via `npm run refresh:snapshot`.

Run `npm run refresh` to regenerate the snapshot (offline from fixtures).

Auto-registration adds no network latency to OpenCode startup — the snapshot is
bundled, and the plugin never contacts the Command Code API to list models. The
plugin works fully offline; model availability never depends on the catalog
endpoint being reachable.

The following environment variables are intended for tests, local mocks, and
compatible API endpoints:

| Variable                     | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `COMMANDCODE_API_BASE`       | Override the Command Code API base URL |
| `COMMANDCODE_FACTS_URL`      | Override the bundled `models.md` URL   |
| `COMMANDCODE_MODALITIES_URL` | Override the CLI bundle URL            |

### Reasoning support

Reasoning metadata is enriched only for models whose Command Code effort support is known. Supported levels are sent as the documented `reasoning_effort` request field; `off`, unsupported levels, and newly discovered models without metadata do not add reasoning fields to the request. No prompt instructions are injected.

Reasoning blocks from completed assistant turns are not replayed to Command Code in later requests; only the user-visible text and completed tool calls are sent back as history. This prevents prior private reasoning traces from interfering with reasoning on follow-up turns.

## Image input

Image input is advertised only for models marked with the `image` input modality in the Command Code CLI bundle. The release-time refresh generates this map into `src/catalog/facts.ts`; unknown models default to text-only until their upstream metadata is reviewed.

For vision-capable models, image blocks from user messages and tool results are forwarded in Command Code's data-URL wire format. Text-only models reject image content before making a network request instead of silently dropping it.

## Pricing display

The Command Code Provider API does not currently include prices in its model catalog. This provider generates a table from the bundled `models.md` catalog so OpenCode can display estimated request costs.

Models missing from that table display zero cost in OpenCode. This does **not** mean Command Code will bill the request at zero. Check the current [Command Code pricing](https://commandcode.ai/docs/resources/pricing-limits) before relying on the displayed value.

## Update and remove

Update the installed package, or remove it from the `plugin` array in your `opencode.json` (the auto-registered `provider.commandcode` entry is injected by the plugin, so there is no config block to remove). The npm package is cached under OpenCode's plugin cache (`~/.cache/opencode/packages/`); remove the cached directory to fully uninstall.

## Development

Build, then run the full suite:

```sh
npm install
npm run build
npm test
npm run format:check
```

The headless end-to-end test runs the real OpenCode CLI against a mock Command Code server through the built package:

```sh
npm run build && npm run test:e2e
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup and tests. See [RELEASE.md](RELEASE.md) for the release process.

## Credits

Inspired by [pi-commandcode-provider](https://github.com/patlux/pi-commandcode-provider).

## License

MIT
