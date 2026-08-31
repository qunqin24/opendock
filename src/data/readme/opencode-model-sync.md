# opencode-model-sync

[English](README.md) | [简体中文](README.zh-CN.md)

[![CI](https://github.com/sanm00/opencode-model-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/sanm00/opencode-model-sync/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![npm downloads](https://img.shields.io/npm/dm/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![Node.js](https://img.shields.io/node/v/opencode-model-sync.svg)](https://www.npmjs.com/package/opencode-model-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Keep models for OpenAI-compatible OpenCode providers in sync with their
`GET /models` endpoints.

## Features

- Discovers every provider from the merged OpenCode configuration.
- Fetches providers concurrently without blocking OpenCode startup.
- Writes all successful updates to the config in one atomic operation.
- Keeps existing model metadata and removes models no longer returned upstream.
- Leaves a provider unchanged when its request fails.
- Never writes resolved API keys or other runtime provider options to disk.
- Preserves comments in `opencode.jsonc`.
- Includes an optional TUI command for updating one provider or all providers.

## Requirements

- OpenCode 1.18 or newer.
- Providers with an OpenAI-compatible `GET /models` endpoint.
- A writable JSON or JSONC OpenCode config containing the provider definitions.

## Install

### Install with an AI coding assistant

Paste this prompt into OpenCode, Claude Code, Codex, or another coding agent:

```text
Install opencode-model-sync for my global OpenCode configuration.

1. Run `npx opencode-model-sync install`.
2. Verify that the server plugin `opencode-model-sync` is present in the global
   `opencode.json` or `opencode.jsonc` plugin array.
3. Verify that `opencode-model-sync/tui` is present in the global `tui.json`
   plugin array.
4. Preserve all existing configuration, plugins, and JSONC comments. Do not
   replace either config file wholesale.
5. Validate both config files after editing and report exactly which files were
   changed.
6. Do not publish packages, commit changes, or remove existing plugins.
7. Remind me to restart OpenCode when installation is complete.
```

### Local installation

Clone the repository into OpenCode's global plugin directory, then install the
dependencies and build it:

```sh
mkdir -p ~/.config/opencode/plugins
git clone <repository-url> ~/.config/opencode/plugins/opencode-model-sync
cd ~/.config/opencode/plugins/opencode-model-sync
npm install
npm run build
```

Add the built server entry to `~/.config/opencode/opencode.json`. Replace the
example with the actual absolute path for your home directory:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "/Users/your-name/.config/opencode/plugins/opencode-model-sync/dist/index.js"
  ]
}
```

To enable the optional TUI integration, add the built TUI entry to
`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/Users/your-name/.config/opencode/plugins/opencode-model-sync/dist/tui.js"
  ]
}
```

Restart OpenCode after changing either configuration file. To update a local
installation later, pull and rebuild it:

```sh
cd ~/.config/opencode/plugins/opencode-model-sync
git pull
npm install
npm run build
```

### npm installation

After the package is published to npm, install both the server and TUI entries
with one command:

```sh
npx opencode-model-sync install
```

The command creates the global OpenCode config files when needed, preserves
existing plugins and JSONC comments, and adds these entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-model-sync"]
}
```

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-model-sync/tui"]
}
```

It is safe to run the installer more than once. Use a custom OpenCode config
directory when necessary:

```sh
npx opencode-model-sync install --config-dir /absolute/path/to/opencode
```

Restart OpenCode after installation. You can still add the package entries
manually if you do not want `npx` to edit the config files.

The default config path is resolved in this order:

1. The plugin option `configPath`.
2. `OPENCODE_CONFIG`.
3. `~/.config/opencode/opencode.json`.
4. `~/.config/opencode/opencode.jsonc`.

For a project config, pass its path explicitly because OpenCode merges global
and project configuration before invoking plugins:

```json
{
  "plugin": [
    [
      "opencode-model-sync",
      { "configPath": "/absolute/path/to/project/opencode.json" }
    ]
  ]
}
```

## TUI

The one-command npm installer enables the TUI entry automatically. For a manual
npm installation, add it to `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-model-sync/tui"]
}
```

Run `/model-sync` to select one provider or all providers. The latest result is
shown centered immediately below the home prompt and disappears after one
minute. The session sidebar keeps a `Models` section below `Context`, `MCP`,
and `LSP`, showing the latest model count or failure for each provider. Models
written in the background are loaded the next time OpenCode starts.

## Options

Options are optional and can be supplied to either plugin entry:

```json
[
  "opencode-model-sync",
  {
    "configPath": "/absolute/path/to/opencode.jsonc",
    "statusPath": "/absolute/path/to/.model-sync-status.json",
    "endpoint": "models",
    "timeout": 5000,
    "defaultModel": {
      "limit": {
        "context": 204800,
        "output": 131072
      }
    }
  }
]
```

| Option | Default | Description |
| --- | --- | --- |
| `configPath` | Discovered | JSON/JSONC file whose provider models are updated. |
| `statusPath` | Beside config | Shared status file used by the TUI plugin. |
| `endpoint` | `models` | Path relative to each provider's `options.baseURL`. |
| `timeout` | `5000` | Request timeout in milliseconds. |
| `defaultModel` | 204800 context, 131072 output | Metadata for newly discovered models. |

Provider IDs do not need to be listed. The plugin reads all providers from the
current merged configuration. A provider without `options.baseURL` is reported
as a warning and left unchanged.

## Development

```sh
make install
make check
```

Run `make help` to list the available development and release targets.

## Release

See the [release guide](RELEASING.md) for initial setup, version selection,
troubleshooting, and the complete maintainer checklist.

Repository maintainers can release a patch, minor, or major version with one
command:

```sh
make release-patch
make release-minor
make release-major
```

The release target requires a clean `main` branch and an `origin` remote. It
fetches `origin/main`, refuses to release when the local branch is behind or
diverged, runs the complete check suite, creates the npm version commit and
matching `v` tag, then pushes `main` and the tag. Pushing the tag starts the
GitHub Release workflow.

The release workflow verifies the tag, runs the complete check suite, publishes
the package to npm with provenance, and creates a GitHub Release containing the
package tarball. Add an npm automation token as the repository secret
`NPM_TOKEN` before the first release.

## Security

The plugin requests only each configured provider's model endpoint. It uses the
runtime `apiKey` for the request but persists only the returned model IDs and
model metadata. The status file contains no credentials.

## License

MIT
