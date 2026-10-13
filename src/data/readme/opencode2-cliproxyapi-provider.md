# OpenCode v2 · CLIProxyAPI provider

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/Mistakey/opencode2-cliproxyapi-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/Mistakey/opencode2-cliproxyapi-provider/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode2-cliproxyapi-provider)](https://www.npmjs.com/package/opencode2-cliproxyapi-provider)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tested with OpenCode](https://img.shields.io/badge/tested_OpenCode-2.0.26-informational)](docs/verification.md)

Use [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) (CPA) models in
OpenCode v2, with model discovery, tool calls, conversation summaries and
HTTP/SSE or WebSocket connections.

This is an independent plugin, not an official OpenCode or CPA product. It takes
inspiration from [CPA's official Pi plugin](https://github.com/router-for-me/pi-cliproxyapi-provider)
and uses OpenCode's native Responses runtime and public plugin APIs.

## Features

- Connect to CPA with a setup wizard and store the API key in OpenCode's credential store.
- Load model capabilities and reasoning options from CPA's model list.
- Cache the model list and temporarily retain models that disappear from it.
- Toggle Fast mode for models that support it, or pause and resume requests.
- View session duration, tokens per second (TPS), and token and cache usage.
- Use the same terminal commands with a local or remote OpenCode server.

## Requirements

- **OpenCode `>=2.0.26 <3`**. Tested on Windows with **2.0.26**; other versions
  have not been verified. OpenCode v1 is not supported.
- A running CPA service with an API key and support for `/v1/models` and `/v1/responses`.

## Install

Install the plugin through OpenCode, specifying the version:

```sh
opencode --version
opencode plugin add opencode2-cliproxyapi-provider@0.1.1
opencode plugin list
```

This keeps the plugin at `0.1.1` until you choose to upgrade. You do not need
`npm install -g` or a local copy of this repository.

You can also add it to the `plugins` array in your existing `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode2-cliproxyapi-provider@0.1.1"]
}
```

The default global config directory is `~/.config/opencode`
(`%USERPROFILE%\.config\opencode` on Windows). Project configs also apply.
Keep your other settings and use only one entry for this plugin. If you previously
loaded it from a source directory, remove that old entry.

The server plugin and terminal interface (TUI) are included in the same package.
**Do not add a second entry to `cli.json`.** If you use a remote OpenCode server,
install the plugin there; the terminal loads its TUI automatically.
See [OpenCode's plugin documentation](https://opencode.ai/v2/docs/plugins).

## Connect to CPA

1. Open OpenCode and run `/cpa-connect`.
2. Enter the CPA address, including any reverse-proxy subpath.
3. Enter the API key. The input is hidden. The plugin checks the connection
   before saving it to OpenCode's credential store.
4. Select a model in OpenCode. Use `/cpa-status` to check the connection.

OpenCode's built-in `/connect` also works, but saves the connection before
checking it. `/cpa-connect` checks first, so a failed attempt leaves the previous
connection unchanged. Do not commit config files containing API keys to Git.

## Commands

| Command | Description |
| --- | --- |
| `/cpa-connect` | Check and save a CPA address and API key |
| `/cpa-status` | Show the connection, model list, Fast mode, selected transport, compaction and pending settings |
| `/cpa-refresh` | Refresh the model list and apply any changes |
| `/cpa-fast` | Turn Fast mode on or off; the setting is saved between restarts |
| `/cpa-pause` | Pause new CPA requests; requests already sent continue normally |
| `/cpa-resume` | Resume paused requests |
| `/cpa-stats` | Show duration, TPS, and token and cache usage for this session |

The footer shows the connection status and statistics for the last turn.
Fast mode sends `priority` only for models that advertise support for it. It does
not change reasoning effort or guarantee a faster response.

`/cpa-status` distinguishes an unreachable OpenCode server (RPC) from failed
CPA verification. It shows the selected transport and its fallback notes, not
proof that a WebSocket request succeeded, along with the compaction mode and
any reload needed to apply saved settings.

TPS is measured over the whole turn, including tool calls and retries, rather
than just the time spent generating text. See [how statistics are calculated](docs/reference.md#pause-and-statistics).

### Applying a connection or directory change

Some saved changes need a reload before new requests use them
(`reloadRequired: true`). The TUI reloads the current location automatically
when needed. This cancels paused requests and resets session statistics.
Clients using RPC must handle the reload themselves; see
[applying changes](docs/reference.md#applying-changes).

## Configuration

For use without the TUI, set `CLIPROXYAPI_BASE_URL` and `CLIPROXYAPI_API_KEY` in
the server environment. Plugin options take precedence over environment variables,
which take precedence over the saved connection. A key saved for one address is
not used with a different address. See the [configuration reference](docs/reference.md#configuration)
for the full rules and options.

To change plugin options, edit its existing entry:

```jsonc
{
  "plugins": [{
    "package": "opencode2-cliproxyapi-provider@0.1.1",
    "options": {
      "transport": "auto",
      "compaction": "summary",
      "modelsDev": false
    }
  }]
}
```

- `transport: "auto"` chooses HTTP or WebSocket based on the model list and
  available runtime support.
- `compaction: "summary"` uses OpenCode's conversation summaries. This is the default.
- `modelsDev: false` disables price lookup. The default is `true`, which fetches
  public prices from `https://models.dev/api.json`. These are estimates, not CPA billing data.

Once configured, the plugin reads the CPA model list at startup, or loads it from
cache and refreshes it in the background. Later refresh failures can trigger
retries. Model requests you make through OpenCode may incur charges from your
provider; this plugin does not include a CPA service or account.

## Upgrade or uninstall

Publishing a new version does not upgrade an existing pinned installation.
Back up your config before upgrading. Run
`opencode plugin add opencode2-cliproxyapi-provider@<version>` with the published
version you want, then check `opencode plugin list` for duplicate or old entries.
`opencode plugin update` skips entries pinned to an exact version.
Restart OpenCode if it has not picked up the change.

To uninstall:

```sh
opencode plugin remove opencode2-cliproxyapi-provider@0.1.1
```

Also remove any entry you added manually to a project config. Credentials,
sessions and stored plugin data are managed separately by OpenCode; uninstalling
the plugin does not guarantee their removal.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| CPA commands are missing | Check the server's plugin list and version. The TUI does not need a separate `cli.json` entry. |
| A key is saved, but the connection is offline | Check `/cpa-status`, or run `/cpa-connect` to verify the address and key again. |
| CPA was unavailable on first startup | Run `/cpa-refresh` when CPA is back. The first model-list request is not automatically retried if there is no cache. |
| Changes are saved but not active, or a request is blocked after disabling Fast | Reload the current location. This cancels paused requests and resets statistics. |
| HTTP is used instead of WebSocket | Check `transportNote`. OpenCode may have fallen back to HTTP. |
| Native compaction is unavailable | Keep `summary`. Native compaction is optional and has not been tested with real CPA. |
| Models are missing from `opencode models` | On 2.0.26, that command uses a separate location. Check the session's model picker, or call `model.list` with the session's location. |

For bug reports, include your OpenCode and plugin versions, OS, and steps to
reproduce the problem. Remove keys, private addresses and conversation content
from any status output or logs you share. See [security reporting](SECURITY.md).

<a id="accepted-verification-scope"></a>

## Test coverage

Real CPA tests used OpenCode `2.0.26` and `gpt-6.1-sol` at commit `11eb30e`.
The later pause-timing fix (`16afc4b`) was tested offline only. Other models have
not been verified with real CPA.

Automated tests cover additional protocol and recovery scenarios using a mock
CPA service. CI also installs the packaged plugin and checks it with OpenCode
`2.0.26` and test credentials. Native compaction has only been tested with a mock;
the TUI has module tests but has not had a full manual terminal walkthrough.
Details are in the [test coverage table](docs/verification.md).

## Isolated host run

Use a separate test environment, not your regular OpenCode config or real CPA
credentials. Set `OPENCODE_CLI` to the OpenCode `2.0.26` executable.
`OC2CPA_SANDBOX` can override the directory used for test configuration and data.
The smoke tests use local mock services.

```sh
npm ci --cache .forge/local/npm-cache --no-audit --no-fund
bun test
bun run typecheck
bun run smoke:package
```

[Development](docs/development.md) · [Technical reference](docs/reference.md)
· [Release procedure](docs/releasing.md) · [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
