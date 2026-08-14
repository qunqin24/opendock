# opencode-usage-total 🧠

Track model usage and costs per agent in the OpenCode TUI sidebar.

[![version](https://img.shields.io/badge/version-0.3.0-muted)](https://www.npmjs.com/package/opencode-usage-total)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A TUI plugin for [OpenCode](https://opencode.ai) that shows every model used by the main agent and its sub-agents, with the cost accumulated per model and a session total that includes sub-agent work.

> [!NOTE]
> Español: [README.es.md](README.es.md)

## Features

- **Per-agent breakdown** — lists the main agent and every sub-agent with the model and accumulated cost for each
- **Tree total** — the header sums the root session and all sub-agents, so you see the real session cost
- **Collapsible** — toggle the section with `Alt+M`; the state persists across restarts
- **Session-wide accumulation** — costs keep adding up for the whole session
- **Parent attribution** — sub-agent models are attributed to their parent session
- **KV persistence** — survives restarts and session switches

> [!WARNING]
> Token counts are hidden until the metric is accurate. The sidebar currently shows **cost only**; token data is still collected internally (in KV) and will be rendered once it can be counted reliably.

## Install

```bash
opencode plugin -g opencode-usage-total
```

The command registers both the server and the TUI sidebar entry in your global config. Restart opencode afterwards.

## Update

```bash
rm -rf ~/.cache/opencode/packages/opencode-usage-total@latest
opencode plugin -g opencode-usage-total
```

## Usage

Start a session in OpenCode and open the sidebar: the **🧠 Models** section lists every model used in the current session, with the accumulated cost per model and a total that includes sub-agent work.

Press `Alt+M` to collapse or expand the list.

![sidebar](https://github.com/AlonsoSG0/opencode-usage-total/raw/main/image.png)

## Requirements

- OpenCode with TUI support (plugin API ≥ 1.14.50)

## Development

```bash
npm install
npm run build   # bundle with tsup
npm test        # run the vitest suite
```

MIT
