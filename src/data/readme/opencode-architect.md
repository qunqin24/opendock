# opencode-architect
[![npm version](https://img.shields.io/npm/v/opencode-architect?color=cb3837&label=npm)](https://www.npmjs.com/package/opencode-architect) [![Bun](https://img.shields.io/badge/Runtime-Bun-f9f1e1?logo=bun&logoColor=black)](https://bun.sh) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE.md) [![Platforms](https://img.shields.io/badge/Platforms-Linux-6366f1)](#quick-start-install-the-opencode-plugin-suite) [![OpenCode plugin](https://img.shields.io/badge/opencode-plugin-blueviolet)](https://opencode.ai/v2/docs/plugins)

**Ten specialist agents that design, build, and package OpenCode extensions — agent skills, slash commands, custom tools, plugins, and MCP server integrations — right inside your AI coding assistant.**

opencode-architect is an [OpenCode](https://opencode.ai) plugin and CLI that ships a suite of AI agent experts for OpenCode work: designing agents, creating skills and slash commands, building plugins and custom tools, integrating MCP servers, and packaging extensions for npm. It targets the OpenCode **v2** line and registers through the Effect-first plugin API (`@opencode/plugin/effect`). Install it once and every specialist agent is available in your coding sessions.

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
bunx opencode-architect status                  # resolve what a session would load, per scope, plus an effective verdict
bunx opencode-architect status --scope global   # narrow the resolution to one scope
bunx opencode-architect status --online         # also query the npm registry and flag a stale resolved copy
bunx opencode-architect status --path ../other  # resolve against another project directory
bunx opencode-architect status --package other  # resolve another installed package by name
bunx opencode-architect uninstall               # remove the plugin entry, the manifest, and any residual payload
bunx opencode-architect clear-cache             # remove cached copies of this package from OpenCode's package cache
bunx opencode-architect clear-cache --all --yes # remove the whole OpenCode cache directory (destructive)
bunx opencode-architect clear-cache --dry-run   # preview what clear-cache would remove without deleting
bunx opencode-architect install --force         # re-register and rewrite the manifest even when up to date
bunx opencode-architect --help                  # full usage
```

`status` does not report the manifest version alone: for each scope it resolves what a session would actually load. It prints the config file that holds the registration, the raw entry as written (`name@latest`, a pinned spec, a `{ package }` object, or a path/`file://` form), and the resolved source on disk — an npm spec resolves to OpenCode's package cache (`$XDG_CACHE_HOME/opencode/npm`, falling back to `~/.cache/opencode/npm`), a path entry to the package checkout — with the version read from that copy's `package.json` and the copy's age as a staleness hint (`resolved=1.0.0 (cache copy, 2h old)`). It closes with an effective verdict and warns when a package is registered in both scopes — the verdict annotates the double-load (`should load: 1.0.0 (cache copy, local + global; both scopes register — double-load)`) — when the manifest version disagrees with the resolved copy, when the cached copy for a spec is missing or incomplete, or when a config file cannot be parsed. The verdict answers from the strongest source it can: a resolved copy on disk (`cache copy` / `checkout copy`), else the registration spec itself — a pinned exact version answers directly (`should load: 1.0.0 (pinned spec, local)`, since the host fetches exactly that at next start) and `@latest` answers with the published version under `--online` (`npm latest`); a range like `^1.7.0` stays `unresolved` until a copy exists, and only then falls back to the manifest version. `status` is read-only. Without `--online` it never touches the network; `--online` queries the npm registry for every registered package — the name comes from the entry, or from the checkout's `package.json` for path-form registrations — and prints it per scope (`npm-latest=1.0.0`) plus `, latest <version>` on the verdict, flagging staleness; network failures warn rather than fail. `--path <dir>` resolves against another project directory (the directory must exist), so a package installed elsewhere can be checked without `cd`-ing into it. `--package <name>` resolves `<name>` instead of `opencode-architect`: it matches a plugins entry or a path checkout whose `package.json` name is `<name>`, reads that scope's `<name>.manifest.json` (or the legacy `<name>.json`), and, under `--online`, queries the registry for `<name>` — so a package installed from another repo can be inspected in place. `--online` and `--path` are status-only; `--package` applies to `status` and `clear-cache` only; any other command rejects them with an explanatory error.

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
| `opencode-tool-builder` | Registers OpenCode custom tools from plugins — JSON-Schema argument schemas and Effect execute logic |
| `opencode-plugin-engineer` | Builds Effect-first OpenCode plugins — plugin definitions, context domains, hooks, tool registration |
| `opencode-mcp-integrator` | Configures MCP servers and tool scoping in `opencode.json` — local/remote servers, permissions |
| `opencode-packager` | Packages OpenCode extensions for local sharing across projects — `file:///` plugin packages |
| `opencode-publisher` | Publishes OpenCode extensions to npm — transforms local packages into distributable ones |
| `opencode-extension-auditor` | Analyzes `.opencode/` contents and reports packaging readiness — inventory, dependencies, complications |

Also bundled and installed with the agents:

- **References** — self-contained docs covering stable OpenCode fundamentals: agents, commands, config, MCP servers, plugins, prompt engineering, skills, tools, plus worked one-shot examples
- **Templates** — starter files for new skills, plugins, package manifests, and TypeScript configs
- **Upgrade skill and command** — the `opencode-v2-upgrade` skill plus the `/upgrade-opencode-v2` slash command, registered at load

## One-shot upgrade from OpenCode v1 to v2

Say "upgrade my plugin/extensions package to opencode v2" (or run `/upgrade-opencode-v2`) and the suite upgrades one project in a single pass: it inventories your extensions, ports v1 plugin files to the Effect-first v2 plugin API, ports v1 file-based tool files to plugin-registered tools, rewrites your configs to v2-native keys, and finishes with a report recommending v2 capabilities to adopt — richer session hooks, plugin RPC, TUI plugins, MCP Code Mode, and saved approvals.

The upgrade is safe by construction: an already-v2 project is a clean no-op, files you modified after install are skipped with a warning rather than clobbered, and the OpenCode application installation is never touched. The bundled `opencode-v2-upgrade` skill defines the full procedure and every phase's completion criteria.

## When to use these OpenCode agents

Reach for opencode-architect whenever you want to:

- Spin up new OpenCode agents with consistent frontmatter and tool permissions
- Create agent skills and slash commands with solid prompt engineering
- Build OpenCode plugins and custom tools in TypeScript
- Integrate MCP servers into your OpenCode setup with confidence
- Package and publish your extensions so other developers can install them

## Requirements

- [OpenCode](https://opencode.ai) — the AI coding assistant the plugin extends (v2 line)
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
