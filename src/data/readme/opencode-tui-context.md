# opencode-tui-context

**See context usage and token composition at a glance in the OpenCode sidebar.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/SolitudeRA/opencode-tui-context/blob/main/LICENSE)
[![OpenCode: V1 + V2](https://img.shields.io/badge/OpenCode-V1%20%2B%20V2-18181b)](#quick-start)

English · [简体中文](https://github.com/SolitudeRA/opencode-tui-context/blob/main/README.zh-CN.md) · [日本語](https://github.com/SolitudeRA/opencode-tui-context/blob/main/README.ja.md)

![Illustrative context panel with window usage above and token composition below.](https://raw.githubusercontent.com/SolitudeRA/opencode-tui-context/main/docs/assets/context-preview.svg)

*Illustration with sample data; actual colors follow your OpenCode theme, except for the yellow output segment.*

- **Two views:** context-window capacity and a breakdown of reported tokens.
- **Fits your sidebar:** bars and legends adapt to the available width.
- **No extra model calls:** reads existing usage data without a tokenizer or credentials.

## Quick start

**One package version supports OpenCode V1 and V2.** Check `opencode --version`, then use the matching command:

| OpenCode | Install `2.1.1` | Global configuration |
| --- | --- | --- |
| V1 `>=1.18.31 <2` | `opencode plugin -g opencode-tui-context@2.1.1` | `tui.json` → `plugin` |
| V2 `>=2.0.32 <3` | `opencode plugin add opencode-tui-context@2.1.1` | `cli.json` → `plugins` |

OpenCode downloads the prebuilt package; no local build or manual adapter selection is needed. Restart OpenCode, open a session, and show the sidebar. The **Context** panel displays the latest assistant usage with positive output tokens in the active context; until then, it shows `no usage snapshot yet`.

See the [user guide](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.md#quick-start) for ZIP/source installation, upgrades, and sidebar settings.

## Reading the panel

- **Top bar:** used, reserved, and free context-window space. Reserved space is a display estimate based on the model's output limit; it does not reserve tokens in OpenCode.
- **Bottom bar:** the used tokens split into cache, prompt, reasoning, and output. It shows composition, so it can be full while the top bar still has free space.

| Bar | Legend | Segment | Meaning |
| --- | --- | --- | --- |
| Overview | `u` | `used` | Total used tokens |
| Overview | `r` | `reserved` | Remaining output reservation (estimated) |
| Overview | `f` | `free` | Space remaining after usage and reservation |
| Composition | `c` | `cached` | Cache-read tokens |
| Composition | `p` | `prompt` | Input + cache-write tokens |
| Composition | `t` | `think` | Reasoning tokens |
| Composition | `o` | `out` | Output tokens |

The panel reflects the **latest assistant message reporting positive output tokens in the active context**. It is not cumulative session usage or an exact count of the next prompt.

See the [user guide](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.md#reading-the-panel) for segment meanings and calculation details.

## Optional configuration

The defaults work without additional configuration. Both host versions accept the same options; their configuration formats differ. Use the [V1/V2 examples](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.md#configuration) to edit the existing entry and preserve other settings and plugins.

| Option | Default | Purpose |
| --- | --- | --- |
| `showLegend` | `true` | Show token legends when space permits. |
| `exclude` | `[]` | Hide selected segments and their legends. |
| `barWidth` | `24` | Initial outer panel width; measured sidebar width takes over. Not a fixed bar width. |

Restart OpenCode after changes. The [full configuration reference](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.md#configuration) lists supported segments and option behavior.

## Documentation and support

- [User guide](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/guide.md): other installation methods, configuration, calculations, troubleshooting, updates, and removal.
- [Contributing](https://github.com/SolitudeRA/opencode-tui-context/blob/main/CONTRIBUTING.md): development setup, checks, and source layout.
- [Release guide](https://github.com/SolitudeRA/opencode-tui-context/blob/main/docs/releasing.md): packaging and publishing for maintainers.
- [Report an issue](https://github.com/SolitudeRA/opencode-tui-context/issues): include your OpenCode version, OS, and steps to reproduce.

## License

[MIT](https://github.com/SolitudeRA/opencode-tui-context/blob/main/LICENSE) © opencode-tui-context contributors.
