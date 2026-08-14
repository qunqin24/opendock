# <img src="https://constellationdev.io/opencode-icon.svg" height="30"> Constellation Plugin for OpenCode

[![NPM Version](https://img.shields.io/npm/v/@constellationdev/opencode?logo=npm&logoColor=white)](https://www.npmjs.com/package/@constellationdev/opencode) [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE)

A lightweight OpenCode plugin that wires up the [Constellation](https://app.constellationdev.io) MCP server and steers OpenCode toward `code_intel` for code search and navigation.

## What it does

| Capability | How |
|------------|-----|
| Registers the Constellation MCP server | `config` hook spawns `npx -y @constellationdev/mcp@latest` and forwards `CONSTELLATION_ACCESS_KEY` |
| Prefers `code_intel` over text search | `experimental.chat.system.transform` appends a single instruction to the system prompt |
| Survives context compaction | `experimental.session.compacting` re-pushes the `code_intel` preference into the compacted summary |

The plugin ships **no skills, no agents, and no slash commands**. It is purely an integration layer — once installed, the Constellation MCP server's `code_intel` tool is available to OpenCode and its subagents.

## Installation

### Prerequisites

1. A [Constellation](https://app.constellationdev.io) account with a project indexed
2. `CONSTELLATION_ACCESS_KEY` exported in your environment (must start with `ak:`)

### Setup

Add the plugin to your project's `opencode.json`:

```json
{
  "plugin": ["@constellationdev/opencode"]
}
```

OpenCode installs the plugin at startup. No further configuration is required — the MCP server is registered programmatically by the `config` hook.

> Install at the project level, not globally. The plugin should only be enabled in projects indexed by Constellation.

## Behavior

The plugin always registers the MCP server. The system-prompt and compaction hooks only attach when `CONSTELLATION_ACCESS_KEY` starts with `ak:`. Without a valid key, the MCP server still spawns and surfaces its own auth error to the user.

Privacy: Constellation extracts structural code metadata locally and uploads only that metadata, your source is never transmitted.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| `AUTH_ERROR` from Constellation | Verify `CONSTELLATION_ACCESS_KEY` is exported and starts with `ak:`. Use `constellation auth` to set it. |
| `PROJECT_NOT_INDEXED` | Run `constellation index --full` in the project root. |
| `code_intel` tool missing in OpenCode | Confirm the plugin is listed in `opencode.json`, restart OpenCode, and check that `npx @constellationdev/mcp@latest` resolves. |

## Development

```bash
npm install
npm run type-check
npm run build      # tsc → dist/
```

Releases are published from GitHub Releases — see `.github/workflows/publish.yml`.

See [AGENTS.md](AGENTS.md) for plugin internals and contributor guidance.

## Documentation

- [Constellation Documentation](https://docs.constellationdev.io)
- [OpenCode Plugin Docs](https://opencode.ai/docs)
- [Constellation MCP Server](https://github.com/shiftinbits/constellation-mcp)

## License

GNU Affero General Public License v3.0 (AGPL-3.0)

Copyright © 2026 ShiftinBits Inc. See [LICENSE](LICENSE).
