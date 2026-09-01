# opencode-volcengine-stats

[![CI](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml)
[![NPM Publish](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml)
[![NPM Version](https://img.shields.io/npm/v/opencode-volcengine-stats)](https://www.npmjs.com/package/opencode-volcengine-stats)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[中文文档](README.zh-CN.md)

An [OpenCode](https://opencode.ai) TUI plugin showing your **Volcengine Ark
Coding Plan** quota usage in the session sidebar (like the built-in context /
MCP panels — nothing on the home screen):

![Screenshot: 5h / 1W / 1M usage bars in the OpenCode session sidebar](docs/screenshot.png)

Data comes from the local [`arkcli`](https://www.npmjs.com/package/@volcengine/ark-cli)
— the plugin never calls the Ark API or handles auth.

## Install

**Prerequisite:** `arkcli` installed, on your `PATH`, and logged in:

```bash
npm i -g @volcengine/ark-cli@latest
arkcli auth login
arkcli usage plan --product coding-plan --format json   # sanity check
```

Then either let OpenCode add the plugin:

```bash
opencode plugin opencode-volcengine-stats        # current project
opencode plugin opencode-volcengine-stats -g     # global (all projects)
```

or add it to the TUI config (`~/.config/opencode/tui.json` global, or
`<project>/.opencode/tui.json` per project) and restart:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-volcengine-stats"]
}
```

> This is a **TUI** plugin, loaded via `tui.json` — not `.opencode/plugins/`
> (that directory is for *server* plugins).

## Configuration

Options are passed as the second element of the `plugin` entry:

| Option          | Default        | Meaning                             |
|-----------------|----------------|-------------------------------------|
| `product`       | `"coding-plan"`| arkcli product id                   |
| `bin`           | `"arkcli"`     | arkcli binary name/path             |
| `pollMs`        | `60000`        | Data refetch interval (ms)          |
| `barWidth`      | `14`           | Progress-bar track width in cells   |
| `showCountdown` | `true`         | Show the per-window reset countdown |

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-volcengine-stats", { "pollMs": 30000, "barWidth": 18 }]]
}
```

## License

[MIT](LICENSE)
