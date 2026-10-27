<div align="center">

# Hush

Minimal session telemetry for the OpenCode TUI.

[![npm version](https://img.shields.io/npm/v/opencode-hush?logo=npm)](https://www.npmjs.com/package/opencode-hush)
[![License](https://img.shields.io/npm/l/opencode-hush)](https://github.com/federicobordon09-dev/opencode-Hush/blob/main/LICENSE)
[![Node.js](https://img.shields.io/node/v/opencode-hush)](https://nodejs.org/)

</div>

<div align="center">
  <img src="https://raw.githubusercontent.com/federicobordon09-dev/opencode-Hush/main/docs/design/captura_hush_oficial.png" width="1000" alt="Hush sidebar telemetry panel shown in light and dark OpenCode themes">
</div>

## What Hush is

Hush is a compact sidebar plugin for the OpenCode TUI. It shows context pressure, the current Git branch, and session metrics that the host does not draw in the same place. The panel stays quiet when a value is unavailable and uses only data provided by the local plugin context.

The values in the image above are illustrative examples, not a record of a specific session.

## Installation

```sh
opencode plugin add opencode-hush
```

Restart OpenCode after installing. The first load can take close to a minute while the host downloads and precompiles the plugin.

## What the panel shows

- **Context** — a compact pressure bar and the percentage of context remaining. The measurement comes from the latest assistant message with usage, compared with the model context limit when the host provides it.
- **Git** — the current branch from the host's VCS data. This row appears only when OpenCode is running inside a Git repository.
- **Meta** — the model, family cost, family processed tokens, cached tokens, session age, and active reasoning state.

Each metadata row has a distinct terminal-friendly symbol. Missing values hide their row, and an empty section is not rendered. Hush does not estimate metrics or make external telemetry calls; all values come from the OpenCode plugin context and host store.

## Commands

- **Hush: check for updates** — available in the command palette.
- **`/hush-update`** — available in the prompt.

The command asks the host's plugin API whether a newer `opencode-hush` release is available. After confirmation, the host installs the update. Restart OpenCode to load the new plugin code.

## Requirements

- Node.js 22.18 or newer
- OpenCode 2.1.x

## Development

```sh
pnpm install
pnpm test
pnpm build
pnpm verify:pack
```

## License

MIT. Copyright © 2026 Federico Bordón.
