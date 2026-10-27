# opencode-tokenwatch

**English** · [简体中文](./README.md)

![Sidebar](./assets/sidebar.png)

A terminal monitoring plugin for OpenCode CLI that displays real-time token usage, cache hit rate, and model throughput in the sidebar, with one-click interactive browser reports.

> This is a fork of [TTWK/opencode-tokenwatch](https://github.com/TTWK/opencode-tokenwatch), published as `@jasonencode/opencode-tokenwatch`.

---

## Key Features

- **Real-time Sidebar Dashboard**: Check input/output tokens, estimated cost, cache hit rate, and average TTFT & generation speed per model during sessions.
- **Cache Hit Rate & Trends**: Track cache efficiency per model, with arrows showing whether the hit rate for recent requests is trending up or down.
- **Token Breakdown**: Automatically breaks down tokens into system prompt, user input, tool execution, and assistant output to identify major context consumers.
- **Interactive Usage Reports**: Type `/usage` in the terminal to launch an ECharts interactive dashboard in your browser with historical trends, cross-model comparisons, and failed request stats; export to JSON or Markdown with one click.
- **Built for OpenCode 2.x**: targets the 2.1.3 Plugin API and OpenTUI 0.6.6, using the host's live events and sidebar slot directly.

---

## Installation & Setup

### 1. Install

Use OpenCode's built-in plugin manager (installs into the global plugin cache and updates the global config):

```sh
opencode plugin add @jasonencode/opencode-tokenwatch
```

To pin a version:

```sh
opencode plugin add @jasonencode/opencode-tokenwatch@0.7.0
```

### 2. Upgrade / Enable

`opencode plugin add` enables the plugin automatically. To upgrade an installed older version:

```sh
opencode plugin update
```

If the old version is still loaded after upgrading, delete its cache directory and reinstall:

- Windows: `%USERPROFILE%\.cache\opencode\npm\@jasonencode\opencode-tokenwatch@latest`
- macOS / Linux: `~/.cache/opencode/npm/@jasonencode/opencode-tokenwatch@latest`

> Scoped packages add a nested `@jasonencode` directory under `npm`.

For local development (before publishing), point `opencode.json` (or `opencode.jsonc`) at this repository with an absolute path:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-tokenwatch"]
}
```

> OpenCode 2.x resolves package-name plugins through its own cache first. If that cache still holds the old version, editing the project config alone will not refresh it; run `opencode plugin add/update`. For CLI-only usage (for example, against a remote server), add the same `"plugins"` array to `cli.json`.

---

## Usage

Type `/usage` in the terminal input to open the action menu:

- **HTML Report**: Select a date range to generate and open an interactive chart in your default browser.
- **Export Data**: Export structured JSON or Markdown reports, saved to `~/.opencode/reports/` by default.
- **Settings**: Interactively toggle sidebar sections or switch language in the popup menu. Changes are saved automatically without editing configuration files.

---

## Requirements

- **OpenCode CLI**: 2.x (baseline: 2.1.3)
- **OpenTUI**: ≥ 0.6.6 (provided by the OpenCode host)

---

## Related Projects

- [opencode-throughput](https://github.com/Howardzhangdqs/opencode-throughput) — Real-time LLM performance monitoring (TTFT/TPS/latency/cost)
- [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — TUI sidebar cache hit rate visualization, token distribution analysis
- [magic-context](https://github.com/cortexkit/magic-context/) — Cache-aware infinite context + cross-session memory system

---

## License

MIT
