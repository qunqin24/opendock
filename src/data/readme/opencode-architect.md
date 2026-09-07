# opencode-architect

[![npm version](https://img.shields.io/npm/v/opencode-architect)](https://www.npmjs.com/package/opencode-architect)
[![License: MIT](https://img.shields.io/npm/l/opencode-architect)](./LICENSE.md)
[![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/docs/plugins)

**Ten specialist agents that design, build, and package OpenCode extensions — agent skills, slash commands, custom tools, plugins, and MCP server integrations — right inside your AI coding assistant.**

opencode-architect is an [OpenCode](https://opencode.ai) plugin and CLI that ships a suite of AI agent experts for OpenCode work: designing agents, creating skills and slash commands, building plugins and custom tools, integrating MCP servers, and packaging extensions for npm. Install it once and every specialist agent is available in your coding sessions.

## Quick start: install the OpenCode plugin suite

### Option 1 — Install as an OpenCode plugin

Add the package to the `plugin` array in your OpenCode config — `.opencode/opencode.json` in your project, or `~/.config/opencode/opencode.json` for all projects:

```json
{
  "plugin": ["opencode-architect"]
}
```

The plugin registers the full agent suite at startup, with self-contained bundled references — no network sync.

### Option 2 — Install with the CLI (bunx or npx)

Copy the agents, references, and templates straight into your OpenCode directories, where you can read and modify every file:

```bash
# Project scope (default): copies into ./.opencode/
bunx opencode-architect install

# Global scope: copies into ~/.config/opencode/
bunx opencode-architect install --scope global
```

`npx opencode-architect install` works the same way if you prefer npm's runner.

Useful flags and commands:

```bash
bunx opencode-architect status                  # show install mode and version for a scope
bunx opencode-architect uninstall               # remove exactly the files a copy install wrote
bunx opencode-architect install --force         # overwrite locally modified files, switch a scope from plugin to copy install
bunx opencode-architect --help                  # full usage
```

A copy install writes 10 agents into `agents/`, 9 reference docs into `opencode-architect/references/`, and 9 starter templates into `opencode-architect/templates/` of the scope base, plus an `opencode-architect.json` manifest that tracks versions and file hashes for safe upgrades. Relative reference paths inside agents are rewritten to absolute paths at install time.

Plugin install and copy install are mutually exclusive per scope — the CLI refuses to copy over an existing plugin entry unless you pass `--force`.

## What you get: ten specialist OpenCode agents

Ten specialist agents, one router:

| Agent | What it does |
| --- | --- |
| `opencode-architect` | Routes OpenCode meta tasks to the right specialist — agents, skills, commands, tools, plugins, MCP setup, packaging, publishing |
| `opencode-agent-designer` | Designs OpenCode agents and orchestrator subagents — roles, constraints, tools, permissions |
| `opencode-skill-creator` | Creates OpenCode skills in `.opencode/skills` — SKILL.md, frontmatter, progressive disclosure |
| `opencode-command-crafter` | Creates OpenCode slash commands in `.opencode/commands` — prompt templates, `$ARGUMENTS`, frontmatter |
| `opencode-tool-builder` | Creates OpenCode custom tools in `.opencode/tools` — Zod schemas and execute logic |
| `opencode-plugin-engineer` | Builds OpenCode plugins in `.opencode/plugins` — event hooks, custom tools, TypeScript |
| `opencode-mcp-integrator` | Configures MCP servers and tool scoping in `opencode.json` — local/remote servers, permissions |
| `opencode-packager` | Packages OpenCode extensions for local sharing across projects — `file:///` plugin packages |
| `opencode-publisher` | Publishes OpenCode extensions to npm — transforms local packages into distributable ones |
| `opencode-extension-auditor` | Analyzes `.opencode/` contents and reports packaging readiness — inventory, dependencies, complications |

Also bundled and installed with the agents:

- **References** — self-contained docs covering stable OpenCode fundamentals: agents, commands, config, MCP servers, plugins, prompt engineering, skills, tools, plus worked one-shot examples
- **Templates** — starter files for new skills, plugins, package manifests, and TypeScript configs

## When to use these OpenCode agents

Reach for opencode-architect whenever you want to:

- Spin up new OpenCode agents with consistent frontmatter and tool permissions
- Create agent skills and slash commands with solid prompt engineering
- Build OpenCode plugins and custom tools in TypeScript
- Integrate MCP servers into your OpenCode setup with confidence
- Package and publish your extensions so other developers can install them

## Requirements

- [OpenCode](https://opencode.ai) — the AI coding assistant the plugin extends
- [Bun](https://bun.sh) — runs the plugin and the CLI (`bunx`); if you use `npx`, Bun must still be on your `PATH` because the CLI ships as TypeScript

## Development

Install dependencies:

```bash
bun install
```

Type check:

```bash
bun run check
```

Run the test suite:

```bash
bun test
```

## Acknowledgements

- [OpenCode](https://opencode.ai) - The AI coding assistant that makes this plugin possible
- [Bun](https://bun.sh) - The fast all-in-one JavaScript runtime
- [qforge](https://github.com/qforge) - Original developer of this project
