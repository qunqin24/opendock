# @unfrgivn/opencode-config

An OpenCode plugin that bundles orchestration agents, skills, commands, instructions, and MCP configurations.

## How It Works

When installed, this plugin:

1. **Discovers** bundled assets in the npm package
2. **Installs** bundled skills, plugins, and MCPs via symlinks to your OpenCode config
3. **Injects** bundled agents, commands, and instructions into OpenCode's runtime config
4. **Respects** your local overrides and explicit disables

### Priority Order

1. **Your local configs** — always win
2. **Bundled configs** — fill in the gaps

## Installation

### 1. Add to your OpenCode config

In `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["@unfrgivn/opencode-config"]
}
```

### 2. Restart OpenCode

The plugin will automatically discover and install bundled assets on startup.

### Optional: Enable the TUI sidebar

The main plugin entry in `opencode.json` installs and injects Fellowship agents, commands, skills, MCPs, orchestration, and companion support. The TUI sidebar is loaded separately by OpenCode's TUI config.

To show the Fellowship sidebar/status panel, add the package to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["@unfrgivn/opencode-config/tui"]
}
```

If you already have TUI settings such as a theme, keep them and add the plugin entry:

```json
{
  "theme": {
    "name": "catppuccin-macchiato"
  },
  "plugins": ["@unfrgivn/opencode-config/tui"]
}
```

Use the `/tui` subpath here. The package root exports the server plugin for `opencode.json`, while `@unfrgivn/opencode-config/tui` exports the TUI sidebar plugin. Restart OpenCode after changing `cli.json`. If you do not want the sidebar, you can omit the TUI plugin entry; the main Fellowship plugin still works from `opencode.json`.

## Configuration

Create `~/.config/opencode/fellowship.json` (or for project-level `.opencode/fellowship.json`):

```json
{
  "disable": ["skill:example", "agent:verbose-debugger"],
  "installMethod": "link"
}
```

### Options

| Option          | Type                        | Default         | Description                                                 |
| --------------- | --------------------------- | --------------- | ----------------------------------------------------------- |
| `disable`       | `string[]`                  | `[]`            | Assets to disable (see below)                               |
| `installMethod` | `"link"` \| `"copy"`        | `"link"`        | How to install skills/plugins/MCPs                          |
| `agentNames`    | `"lotr"` \| `"descriptive"` | `"descriptive"` | Agent naming theme (see below)                              |
| `models`        | `Record<string, string>`    | `{}`            | Override the model used by built-in bundled agents             |
| `companion`     | `object`                    | `{ enabled: false }` | Desktop companion overlay configuration                     |
| `orchestration` | `object`                    | defaults        | Runtime orchestration admission, limits, and provider backpressure policy |

### Agent Name Themes

Agents can be displayed with either plain role-based names or Tolkien character names. Set `agentNames` in your config:

```json
{
  "agentNames": "lotr"
}
```

| Role         | `"descriptive"` (default) | `"lotr"`      |
| ------------ | ------------------------- | ------------- |
| Orchestrator | `orchestrator`            | `gandalf`     |
| Explorer     | `explorer`                | `legolas`     |
| Researcher   | `researcher`              | `radagast`    |
| Planner      | `planner`                 | `treebeard`   |
| Implementer  | `implementer`             | `celebrimbor` |
| Architect    | `architect`               | `elrond`      |
| Analyst      | `analyst`                 | `galadriel`   |
| TDD          | `tdd`                     | `aragorn`     |

The theme affects agent names everywhere: in the agent list, slash commands, delegation routing, and cross-references between agents. Agent markdown files use template variables (e.g. `{{explorer}}`) so cross-references resolve correctly regardless of theme.

When using the disable list, use the **themed name** (the name that appears after applying your chosen theme). For example, with `"descriptive"` theme, disable with `"agent:orchestrator"` instead of `"agent:gandalf"`.

### Override Agent Models

Use `models` in `fellowship.json` to override the model for built-in bundled agents without replacing the rest of the agent config.

```json
// ~/.config/opencode/fellowship.json
{
  "models": {
    "orchestrator": "anthropic/claude-opus-4",
    "explorer": "github-copilot/claude-sonnet-4.6"
  }
}
```

Built-in bundled agents accept either naming style as the key, regardless of your active `agentNames` theme. These two examples are equivalent:

```json
{
  "models": {
    "orchestrator": "anthropic/claude-opus-4"
  }
}
```

```json
{
  "models": {
    "gandalf": "anthropic/claude-opus-4"
  }
}
```

Notes:

- `models` only affects built-in bundled agents from this plugin
- local `opencode.json` `agent` entries still take priority over bundled agent injection
- omitted agents keep their plugin default model
- empty string values fall back to the plugin default model
- if both aliases are provided for the same built-in agent, the exact key match wins

### Orchestration Runtime Configuration

All fields below show their **defaults**. You only need to include fields you want to override.

```json
{
  "orchestration": {
    "providerMode": "copilot",
    "features": {
      "delegation": true,
      "diagnostics": true,
      "vision": true,
      "continuousLoop": true,
      "selfHealing": true
    },
    "limits": {
      "maxConcurrent": 3,
      "maxConcurrentGlobal": 5,
      "providerMaxConcurrent": {},
      "maxRetries": 2,
      "maxIterations": 25,
      "retryBackoffMs": 1500,
      "taskTimeoutMs": 120000
    },
    "runtimeFallback": {
      "enabled": true,
      "retryOnErrors": [400, 401, 403, 408, 429, 500, 502, 503, 504, 529],
      "maxFallbackAttempts": 2,
      "cooldownSeconds": 30,
      "timeoutSeconds": 30,
      "notifyOnFallback": true,
      "providerOrder": ["copilot", "native"]
    },
    "hooks": {
      "disabled": [],
      "telemetry": true
    },
    "notifications": {
      "enabled": true,
      "maxItems": 100
    },
    "categories": {
      "routing": {},
      "maxConcurrent": {}
    },
    "recovery": {
      "autoResumeOnStart": true
    },
    "tmux": {
      "enabled": false,
      "sessionPrefix": "fellowship"
    }
  }
}
```

Tmux support is optional and only active when `orchestration.tmux.enabled` is `true` and OpenCode is running inside a tmux session. When enabled, a dedicated tmux session (`{sessionPrefix}-{opencode-session-id}`) is created for each OpenCode session, and each subagent task gets its own window inside that session. Windows are automatically cleaned up when tasks complete, fail, stop, or parent sessions end. Use `tmux switch-client -t fellowship-*` to peek at agent work.

Feature flags (`orchestration.features`) toggle individual orchestration capabilities. Set any to `false` to disable that feature while keeping the rest active.

`limits.maxConcurrent` is the per-parent/session active cap. `maxConcurrentGlobal` caps active work across local OpenCode processes, and `providerMaxConcurrent` can lower that cap for `copilot` or `native`. Admission is coordinated through the local orchestration cache. A rejected task does not launch and does not create a queued record.

Category policies are optional. Use `orchestration.categories.routing` to override provider mode per task category (for example, `"quick": "native"`) and `orchestration.categories.maxConcurrent` to cap active tasks per category (for example, `"quick": 1`). Congestion responses (408, 429, 503, and 504 when listed in `runtimeFallback.retryOnErrors`) establish a shared provider cooldown and reduce effective provider capacity. Successful completions restore capacity one slot at a time.

Recovery policies are optional. `orchestration.recovery.autoResumeOnStart` checks persisted work on startup. Tasks owned by a live process remain active. Abandoned running records and legacy queued/retrying records become terminal `interrupted` records because OpenCode does not expose a safe API for replaying the original task call.

The runtime does not auto-dispatch queues or retry failed task calls. `maxRetries`, `retryBackoffMs`, `runtimeFallback.maxFallbackAttempts`, `timeoutSeconds`, `notifyOnFallback`, and `providerOrder` remain accepted for configuration compatibility but do not schedule work.

> **Note**: Configuration changes take effect on restart. After modifying your config, restart OpenCode to apply the changes.

### Desktop Companion

The package includes a bundled companion helper that can show small desktop tiles while agents are active or waiting for input. No separate install is required for the default setup, the helper and themed artwork ship inside `@unfrgivn/opencode-config` under `companion/`.

To enable it, add `companion.enabled` to `~/.config/opencode/fellowship.json` or a project-level `.opencode/fellowship.json`:

```jsonc
{
  "$schema": "./schemas/fellowship.schema.json",
  "companion": {
    "enabled": true,
    "position": "bottom-right",
    "size": "medium",
    "gifPack": "default",
    "loopStyle": "classic",
    "speed": 1,
    "debug": false
  }
}
```

Restart OpenCode after saving the config. On startup, Fellowship writes session state to OpenCode storage, launches the companion process, and the bundled macOS overlay opens chromeless tiles for busy or waiting agents. Idle state stays hidden.

Binary resolution order:

1. `companion.binaryPath`, when you configure a custom companion binary
2. `$XDG_DATA_HOME/opencode/storage/fellowship/bin/fellowship-companion`, or `~/.local/share/opencode/storage/fellowship/bin/fellowship-companion`
3. The bundled `companion/bin/fellowship-companion` from this npm package

Only set `binaryPath` when replacing the bundled helper:

```jsonc
{
  "companion": {
    "enabled": true,
    "binaryPath": "/usr/local/bin/fellowship-companion"
  }
}
```

Companion labels and artwork follow `agentNames`. The default `"descriptive"` theme uses role names such as `orchestrator` and `researcher`; `"lotr"` uses `gandalf`, `radagast`, and the rest of the Fellowship agent theme. Available positions are `bottom-right`, `bottom-left`, `top-right`, and `top-left`; sizes are `small`, `medium`, and `large`; `speed` accepts `0.25` through `4`.

### Disable Syntax

```json
{
  "disable": [
    "skill:verbose-logger", // Disable specific skill
    "agent:heavy-model", // Disable specific agent
    "command:dangerous-cmd", // Disable specific command
    "plugin:auto-formatter", // Disable specific plugin
    "instruction:old-guide", // Disable specific instruction
    "mcp:expensive-api", // Disable specific MCP
    "deprecated-thing" // Disable across ALL types (bare name)
  ]
}
```

## Overriding Bundled Configs

The plugin respects local configurations. Your local settings always take precedence over bundled defaults.

### Override Priority

```
1. Your local OpenCode config (opencode.json)     ← Highest priority
2. Explicit disable list (fellowship.json)
3. Local skill directories (~/.config/opencode/skill/<name>/)
4. Bundled configuration from this repo               ← Lowest priority
```

### By Asset Type

| Asset Type      | How to Override                                               | How to Disable                         |
| --------------- | ------------------------------------------------------------- | -------------------------------------- |
| **Skill**       | Create `~/.config/opencode/skill/<name>/SKILL.md`             | `"skill:<name>"` in disable list       |
| **Agent**       | **Recommended:** `fellowship.json` `agentOverrides` for partial changes. Use `opencode.json` `agent` only for full replacement. | `"agent:<name>"` in disable list       |
| **Command**     | Add to `opencode.json`: `{ "command": { "<name>": {...} } }` | `"command:<name>"` in disable list     |
| **Plugin**      | Disable bundled plugin, add your own to plugins directory        | `"plugin:<name>"` in disable list      |
| **Instruction** | Cannot override (only append). Disable and add your own.      | `"instruction:<name>"` in disable list |
| **MCP**         | Add to `opencode.json` MCP config section                     | `"mcp:<name>"` in disable list         |

### Examples

**Recommended: partially override a bundled agent without replacing everything:**

```json
// ~/.config/opencode/fellowship.json
{
  "agentOverrides": {
    "planner": {
      "temperature": 0.2
    }
  }
}
```

`agentOverrides` applies patch-style merge to bundled agent configs before injection. This is the default/safest way to tweak one value while preserving the rest of the bundled config. Built-in bundled agents accept either naming style as the key, so `planner` and `treebeard` both work.

**Advanced: fully replace a bundled agent definition:**

```json
// ~/.config/opencode/opencode.json
{
  "agent": {
    "bundled-agent": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.5
    }
  }
}
```

> ⚠️ `opencode.json` `agent` entries are **full replacements**, not merges. If you set only one field (for example `model`), you may unintentionally drop bundled defaults like `permission` and `prompt` for that agent.

**Disable multiple bundled assets:**

```json
// ~/.config/opencode/fellowship.json
{
  "disable": [
    "skill:verbose-logger",
    "agent:heavy-model",
    "instruction:old-conventions"
  ]
}
```

**Override a skill with your own version:**

```bash
# Create your local skill directory
mkdir -p ~/.config/opencode/skill/my-skill

# Add your SKILL.md
cat > ~/.config/opencode/skill/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: My customized version
---
Your custom skill content here...
EOF
```

**Completely disable a skill you don't use:**

```json
// ~/.config/opencode/fellowship.json
{
  "disable": ["skill:unused-skill"]
}
```

## What's Included

### Agents (`agent/`)

Pre-configured agent definitions with model, temperature, and system prompts. There are two **primary-capable** agents (you can talk to them directly) and six **dedicated subagents** (they run in the background, delegated by the primary agent). The planner is available as both. Names shown below use the default `"descriptive"` theme, with `"lotr"` names in parentheses.

#### Primary Agents

| Agent                      | Model         | What it does                                                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orchestrator` (`gandalf`) | Claude Opus 4 | The default orchestrator. Classifies your request, breaks it into tasks, delegates to the right subagents in parallel, and assembles the final result. Handles everything from quick fixes to multi-step projects.                                                                                                     |
| `planner` (`treebeard`)    | GPT-5.4       | Read-only planning and analysis agent. Can explore codebases, search the web, and run safe shell commands, but cannot edit files or run mutating commands. Use directly when you want to think through a problem, review a plan, or explore before committing to changes. Also available as a subagent for delegation. |

#### Subagents

| Agent                         | Model             | When called                      | What it does                                                                                                                                                                                                                                                                  |
| ----------------------------- | ----------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `explorer` (`legolas`)        | Claude Sonnet 4.6 | "Where is X in the codebase?"    | Searches the repo fast. Uses LSP, grep, glob, and git to find files, symbols, call paths, and code patterns. Returns structured results with absolute paths and a direct answer, not just a file list. Read-only by default.                                                  |
| `researcher` (`radagast`)     | GPT-5.2           | "How does library X work?"       | Researches external docs, OSS repos, and the web. Classifies the question (conceptual, implementation, history, or comprehensive), fetches official sources, and returns evidence-backed recommendations with links.                                                          |
| `implementer` (`celebrimbor`) | GPT-5.2 Codex     | "Build this end-to-end."         | The workhorse implementation agent. Operates like a senior staff engineer: explores context, plans edits, executes changes, runs tests, and iterates until done. Does not stop at partial progress or ask permission for normal engineering work.                             |
| `architect` (`elrond`)        | GPT-5.2           | "What's the right architecture?" | Read-only strategic advisor. Analyzes codebases, evaluates tradeoffs, and returns a bottom-line recommendation with an action plan and effort estimate. Biases toward simplicity and existing patterns over speculative complexity.                                           |
| `analyst` (`galadriel`)       | Gemini 3.8 Flash  | "What's in this image?"          | Multimodal analysis specialist. Handles PNG, JPEG, and WebP images, diagrams, and charts that other agents cannot process as plain text. Extracts targeted information and returns concise findings with confidence notes. Also serves as the backend for the vision tool.    |
| `tdd` (`aragorn`)             | GPT-5.2 Codex     | "Write tests for this."          | Strict TDD specialist following Red-Green-Refactor. Writes a failing test first, makes it pass with minimal code, then refactors under green. Produces a test plan, TDD log, execution results, and a quality scorecard. Never writes production code without a failing test. |

### Commands (`command/`)

Slash commands available to all users.

| Command               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `/continue`           | Enable continuous orchestration loop for current session         |
| `/stop`               | Stop continuous loop and active tracked orchestration work        |
| `/tasks`              | List active and recent subagent orchestration tasks              |
| `/task`               | Show details for one subagent orchestration task                 |
| `/diagnostics`        | Run orchestration diagnostics with live delegation probes        |
| `/doctor`             | Run deep orchestration doctor checks with actionable remediation |
| `/test-orchestration` | Run a parallel subagent delegation torture test audit            |
| `/fellowship-status`    | Show status for Fellowship status                             |
| `/fellowship-list`      | List all bundled assets from the Fellowship configuration                        |
| `/fellowship-cleanup`   | Remove stale cache files, broken symlinks, and unused plugins    |
| `/example`            | Example command demonstrating the expected format                |

### Skills (`skill/`)

Reusable skill files that agents can load. Each skill is a directory containing `SKILL.md` with YAML frontmatter.

| Skill                | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `orchestration-core` | Continuous loop orchestration, delegation visibility, and diagnostics workflow |
| `reflect`            | Review repeated workflows and recommend the smallest useful reusable asset     |
| `codemap`            | Create or update concise repository maps for unfamiliar codebases              |
| `readme-editor`      | Craft professional README.md files for GitHub open source projects             |
| `example`            | Example skill demonstrating the expected format                                |

### Runtime Plugins (`src/`)

Native V2 plugins compiled into the package root and activated during setup.

| Plugin                   | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `fellowship-orchestration` | Orchestration runtime: admission limits, task tracking, tmux sessions, provider backpressure, recovery |
| `vision-tool`            | PNG/JPEG/WebP analysis in a child session on the analyst agent's model, keeping image tokens out of the caller |

### Instructions (`instruction/`)

Markdown files automatically appended to agent context (registered in `manifest.json`).

| Instruction             | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `getting-started`       | Quick start guide for Fellowship OpenCode                     |
| `orchestration-runtime` | Orchestration controls, delegation discipline, tmux runtime |

### MCPs (`mcp/`)

Model Context Protocol server configurations.

| MCP               | Type   | Endpoint                         |
| ----------------- | ------ | -------------------------------- |
| `chrome-devtools` | local  | `npx chrome-devtools-mcp@latest` |
| `context7`        | remote | `https://mcp.context7.com/mcp`   |
| `exa`             | remote | `https://mcp.exa.ai/mcp`         |

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Type check
bun run typecheck

# Load the packed plugin and its TUI sidebar in the matching OpenCode release (needs tmux)
bun run verify:release

# Move the OpenCode SDK pins to the latest release
bun run update:opencode

# Link for local testing
npm link
```

## Adding New Configs

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add new skills, agents, commands, and more.

## Version Pinning

The bundled asset version is tied to the installed plugin version. To pin to a specific version:

```bash
npm install -g @unfrgivn/opencode-config@1.2.0
```

Check the [releases](https://github.com/unfrgivn/opencode-config/releases) for available versions.

## Installed Asset Locations

- Skills: `~/.config/opencode/skill/_plugins/opencode-config/`
- MCPs: `~/.config/opencode/mcp/_plugins/opencode-config/`

Each generated install directory contains its own `.gitignore` so generated content stays out of version control.

## Troubleshooting

Quick fixes for common issues:

| Issue                | Solution                                                         |
| -------------------- | ---------------------------------------------------------------- |
| Asset not appearing  | Check disable list in `fellowship.json`                            |
| Override not working | Verify exact name match (case-sensitive)                         |
| Stale installs       | Delete `~/.config/opencode/skill/_plugins` and restart           |
| Plugin not loading   | Verify `@unfrgivn/opencode-config` is in `opencode.json` plugins |

For detailed troubleshooting, see **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**.

## License

MIT, see [LICENSE](LICENSE)
