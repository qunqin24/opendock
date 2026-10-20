# opencode-volcengine-stats

[![CI](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml)
[![NPM Publish](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml)
[![NPM Version](https://img.shields.io/npm/v/opencode-volcengine-stats)](https://www.npmjs.com/package/opencode-volcengine-stats)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[中文文档](README.zh-CN.md)

An [OpenCode](https://opencode.ai) **v2** CLI plugin showing your **Volcengine
Ark Coding Plan** quota usage in the session sidebar (like the built-in
context / MCP panels — nothing on the home screen):

![Screenshot: 5h / 1W / 1M usage bars in the OpenCode session sidebar](docs/screenshot.png)

Data comes from the local [`arkcli`](https://www.npmjs.com/package/@volcengine/ark-cli)
— the plugin never calls the Ark API or handles auth. Data auto-refreshes every
60s; press **`ctrl+alt+r`** (or click the `↻` line under the bars) to refresh
immediately.

> **OpenCode v1:** this package line (`1.x`) supports OpenCode **v2 only**.
> V1 users should pin the legacy line — `opencode-volcengine-stats@0.3.x` —
> and follow its README for the V1 `tui.json` setup.

## Install

**Prerequisite:** `arkcli` installed, on your `PATH`, and logged in:

```bash
npm i -g @volcengine/ark-cli@latest
arkcli auth login
arkcli usage plan --product coding-plan --format json   # sanity check
```

Then either let OpenCode add the plugin to your global config:

```bash
opencode plugin add opencode-volcengine-stats
```

or list it yourself in `opencode.json` (global
`~/.config/opencode/opencode.json`, or a project `opencode.jsonc` /
`.opencode/opencode.json`) and restart OpenCode:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-volcengine-stats"]
}
```

The CLI auto-loads the package's TUI component from the active plugin list, so
no separate terminal configuration is needed. If you run the terminal against
a **remote server** and want the plugin active locally regardless, list it in
the global CLI config `~/.config/opencode/cli.json` instead:

```jsonc
{
  "plugins": ["opencode-volcengine-stats"]
}
```

## Configuration

Pass options with the object form of a `plugins` entry:

| Option          | Default        | Meaning                             |
|-----------------|----------------|-------------------------------------|
| `product`       | `"coding-plan"`| arkcli product id                   |
| `bin`           | `"arkcli"`     | arkcli binary name/path             |
| `pollMs`        | `60000`        | Data refetch interval (ms)          |
| `barWidth`      | `14`           | Progress-bar track width in cells   |
| `showCountdown` | `true`         | Show the per-window reset countdown |
| `refreshKey`    | `"ctrl+alt+r"` | Hotkey for an immediate refresh     |

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-volcengine-stats",
      "options": { "pollMs": 30000, "barWidth": 18 }
    }
  ]
}
```

## Troubleshooting

**`ctrl+alt+r` does nothing (Windows / WSL / tmux).** If OpenCode's built-in
`ctrl+alt+k` (which-key) is also dead, the combination is being intercepted
before it reaches the terminal — common causes are the Chinese IME (Microsoft
Pinyin grabs Ctrl+Alt combos), an AutoHotkey script, or another system-wide
hotkey. Verify by switching the keyboard layout to English US (Win+Space) and
pressing the hotkey again. If you cannot remove the interceptor, bind the
refresh command to a different key, for example `alt+r` (its `ESC r` sequence
passes through WSL + tmux reliably):

```jsonc
{
  "plugins": [
    {
      "package": "opencode-volcengine-stats",
      "options": { "refreshKey": "alt+r" }
    }
  ]
}
```

The clickable `↻` hint line always works regardless of keyboard transport.

## License

[MIT](LICENSE)
