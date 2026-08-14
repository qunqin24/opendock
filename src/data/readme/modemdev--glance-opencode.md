# glance.sh agent plugins

[![Integration](https://github.com/modem-dev/glance-agent-plugins/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/modem-dev/glance-agent-plugins/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Supported Agents](https://img.shields.io/badge/agents-pi%20%7C%20OpenCode%20%7C%20Claude%20Code%20%7C%20Codex-blue)](#available-plugins)

Agent integrations for [glance.sh](https://glance.sh) — temporary image sharing for coding agents.

Paste a screenshot in your browser, your agent gets the URL instantly.

## Available plugins

| Agent | Directory | npm package | Install |
|---|---|---|---|
| [pi](https://github.com/mariozechner/pi) | [`pi/`](pi/) | `@modemdev/glance-pi` | `pi install npm:@modemdev/glance-pi` |
| [OpenCode](https://github.com/anomalyco/opencode) | [`opencode/`](opencode/) | `@modemdev/glance-opencode` | Add `"@modemdev/glance-opencode"` to `opencode.json` `plugin` list |
| [Claude Code](https://github.com/anthropics/claude-code) | [`claude/`](claude/) | `@modemdev/glance-claude` | `/plugin marketplace add modem-dev/glance-agent-plugins` then `/plugin install glance-claude@glance-agent-plugins` |
| [Codex](https://developers.openai.com/codex) | [`codex/`](codex/) | `@modemdev/glance-codex` | `codex mcp add glance -- npx -y @modemdev/glance-codex` |

## How it works

Each plugin creates a live session on glance.sh, gives you a URL to open, and waits for you to paste an image. The image URL is returned to the agent over SSE — no manual copy-paste needed.

```text
agent ──POST /api/session──▶ { id, url }
agent ──GET  /api/session/<id>/events──▶ SSE (waiting…)
user  ──opens /s/<id>, pastes image──▶ agent receives URL
```

Sessions are anonymous and ephemeral (10-minute TTL). Images expire after 30 minutes.

## Packaging policy

New plugins should be published as installable packages (npm where possible) with a one-command install path in their README.

Each plugin directory should include:

1. Integration code
2. `README.md` with install / verify / update / remove steps
3. `package.json` (if the target agent supports package-based install)
4. Release automation (GitHub Actions workflow + documented version/tag convention)

## Adding a new plugin

Create a directory for your agent (e.g. `cursor/`, `cline/`) with the files above and open a PR.

## Sponsor

Sponsored by [Modem](https://modem.dev?utm_source=github&utm_medium=oss&utm_campaign=oss_glance_agent_plugins&utm_content=readme_footer).

<a href="https://modem.dev?utm_source=github&utm_medium=oss&utm_campaign=oss_glance_agent_plugins&utm_content=readme_footer">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://modem.dev/images/logo/svg/modem-combined-white.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://modem.dev/images/logo/svg/modem-combined-black.svg">
    <img src="https://modem.dev/images/logo/svg/modem-combined-black.svg" alt="Modem" width="220">
  </picture>
</a>

## License

MIT
