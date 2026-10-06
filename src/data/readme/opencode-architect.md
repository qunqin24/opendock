# opencode-architect
[![npm version](https://img.shields.io/npm/v/opencode-architect?color=cb3837&label=npm)](https://www.npmjs.com/package/opencode-architect) [![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun&logoColor=black)](https://bun.sh) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE.md) [![Platforms](https://img.shields.io/badge/Platforms-Linux-6366f1)](#quick-start-install-the-opencode-plugin-suite) [![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/docs/plugins)

**Ten specialist agents that design, build, and package OpenCode extensions — agent skills, slash commands, custom tools, plugins, and MCP server integrations — right inside your AI coding assistant.**

opencode-architect is an [OpenCode](https://opencode.ai) plugin and CLI that ships a suite of AI agent experts for OpenCode work: designing agents, creating skills and slash commands, building plugins and custom tools, integrating MCP servers, and packaging extensions for npm. Install it once and every specialist agent is available in your coding sessions.

## Quick start: install the OpenCode plugin suite

### Option 1 — Install as an OpenCode plugin

Add the package to the `plugins` array in your OpenCode config — `.opencode/opencode.json` in your project, or `~/.config/opencode/opencode.json` for all projects:

```json
{
  "plugins": ["opencode-architect@latest"]
}
```

The plugin registers the full agent suite at startup, with self-contained bundled references — no network sync.

### Option 2 — Install with the CLI (bunx or npx)

The CLI registers the package as a plugin: it adds `opencode-architect@latest` to the `plugins` array of your OpenCode config with surgical text editing (comments and formatting elsewhere in the file are preserved), then records the registration in an `opencode-architect.manifest.json` manifest at the scope base. Nothing is copied — the agents, references, and templates all load from the package at startup. A legacy v1 `plugin` entry is left untouched and reported with an upgrade advisory.

```bash
# Project scope (default): edits the ./.opencode/ or repo-root config
bunx opencode-architect install

# Global scope: edits the XDG/home config, creating opencode.jsonc if absent
bunx opencode-architect install --scope global
```

`npx opencode-architect install` works the same way if you prefer npm's runner.

Useful flags and commands:

```bash
bunx opencode-architect status                  # show mode, version, and the config file holding the entry
bunx opencode-architect uninstall               # remove the plugin entry, the manifest, and any residual payload
bunx opencode-architect clear-cache             # remove cached copies of this package from OpenCode's package cache
bunx opencode-architect clear-cache --all --yes # remove the whole OpenCode cache directory (destructive)
bunx opencode-architect clear-cache --dry-run   # preview what clear-cache would remove without deleting
bunx opencode-architect install --force         # re-register and rewrite the manifest even when up to date
bunx opencode-architect --help                  # full usage
```

Re-running install when the manifest matches reality is a zero-write no-op. `--mode copy` is refused with an explanatory error: this package is code-backed (it ships agents), and copying cannot express plugin registration.

Every install — including a no-op — also clears this package's stale cache keys from OpenCode's plugin cache (`$XDG_CACHE_HOME/opencode/npm`, falling back to `~/.cache/opencode/npm`): `opencode-architect`, `opencode-architect@latest`, and `opencode-architect@<installed version>` — each key holding every cached generation beneath it. Pinned keys like `opencode-architect@0.6.0` and other packages' cache keys are left untouched. This makes OpenCode re-fetch the just-installed version on next start instead of reusing a stale or partial extraction. Removal is best-effort: a failure prints a warning but the install still succeeds.

**Upgrading from a copy install (pre-0.8):** if a previous version copied agents into your scope base, install detects the old manifest, removes exactly the files it lists, prints a notice, and switches the scope to plugin registration in one step. Locally modified files are tracked by hash; uninstall and migration only remove what the manifest recorded.

`clear-cache` is a manual-only command (never invoked at load time) for removing cached package keys from OpenCode's plugin cache (`$XDG_CACHE_HOME/opencode/npm`, falling back to `~/.cache/opencode/npm`), where each key directory holds every cached generation beneath it. With no flags it removes `opencode-architect` and every `opencode-architect@*` key. `--package <name>` removes `<name>` and every `<name>@*`; `--all` removes the whole OpenCode cache directory (`$XDG_CACHE_HOME/opencode`, falling back to `~/.cache/opencode`). `--dry-run` lists what any mode would remove without deleting anything, and previews broad modes without `--yes`. Both broad modes require `--yes` to confirm, are mutually exclusive, and package names containing path separators or `..` are rejected. The command is idempotent — running with nothing cached succeeds — and removal failures warn without changing the exit code.

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
