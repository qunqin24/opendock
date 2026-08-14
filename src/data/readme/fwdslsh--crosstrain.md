# Crosstrain

CLI tool and OpenCode plugin for converting Claude Code extensions to OpenCode format.

## What It Does

Crosstrain bridges Claude Code's extension ecosystem to OpenCode:

| Claude Code | → | OpenCode |
|-------------|---|----------|
| Skills (`.claude/skills/`) | → | Plugin tools |
| Agents (`.claude/agents/`) | → | Agents (`.opencode/agent/`) |
| Commands (`.claude/commands/`) | → | Commands (`.opencode/command/`) |
| Hooks (`settings.json`) | → | Event handlers |
| MCP Servers (`.mcp.json`) | → | MCP config (`opencode.json`) |

## Installation

### Quick Install

```bash
# Install globally with bun
bun install -g @fwdslsh/crosstrain"

# Or run directly
bunx crosstrain --help
```

### From Source

```bash
git clone https://github.com/fwdslsh/crosstrain.git
cd crosstrain
bun install
bun link  # Makes 'crosstrain' available globally
```

## CLI Usage

```bash
crosstrain <command> [path] [options]
```

### Commands

| Command | Description |
|---------|-------------|
| `command <path>` | Convert a Claude Code command (.md file) |
| `skill <path>` | Convert a skill to OpenCode plugin tool |
| `agent <path>` | Convert an agent to OpenCode format |
| `hook` | Display Claude Code hooks configuration |
| `mcp [path]` | Convert MCP servers to OpenCode config |
| `plugin <source>` | Convert a full plugin (local or remote) |
| `list <source>` | List plugins in a marketplace |
| `all` | Convert all Claude Code assets in project |
| `init` | Initialize a new skills plugin |
| `settings` | Import Claude Code settings to opencode.json |

### Options

| Option | Description |
|--------|-------------|
| `-o, --output-dir <path>` | Output directory (default: `.opencode`) |
| `-p, --prefix <prefix>` | File prefix for generated files (default: `claude_`) |
| `-v, --verbose` | Enable verbose output |
| `--dry-run` | Preview changes without writing files |
| `--no-user` | Skip user-level assets from `~/.claude` |

### Examples

```bash
# Convert all assets in current project
crosstrain all

# Preview changes without writing
crosstrain all --dry-run

# Convert a single command
crosstrain command .claude/commands/create-feature.md

# Convert a skill to a plugin tool
crosstrain skill .claude/skills/pdf-extractor

# Convert a plugin from GitHub
crosstrain plugin anthropics/claude-plugins/code-review

# Browse a marketplace
crosstrain list anthropics/claude-plugins

# Convert a specific version
crosstrain plugin org/repo/plugin@v1.0.0
```

## OpenCode Plugin

Crosstrain also works as an OpenCode plugin, exposing tools that let the AI agent assist with conversion.

### Plugin Installation

```bash
# Clone to your plugin directory
git clone https://github.com/fwdslsh/crosstrain.git .opencode/plugin/crosstrain
cd .opencode/plugin/crosstrain
bun install
```

### Plugin Tools

When installed as a plugin, the AI agent can use these tools:

- `crosstrain` - Run any CLI command
- `crosstrain_convert_all` - Convert all assets
- `crosstrain_convert_plugin` - Convert a plugin
- `crosstrain_list_marketplace` - Browse marketplaces
- `crosstrain_convert_command` - Convert single command
- `crosstrain_convert_skill` - Convert single skill
- `crosstrain_convert_agent` - Convert single agent
- `crosstrain_convert_mcp` - Convert MCP servers
- `crosstrain_show_hooks` - Display hooks config
- `crosstrain_init` - Initialize skills plugin
- `crosstrain_import_settings` - Import Claude Code settings to opencode.json

### Plugin Configuration

Optional settings in `.opencode/plugin/crosstrain/settings.json`:

```json
{
  "enabled": true,
  "verbose": false
}
```

## Asset Conversion Details

### Skills → Plugin Tools

Claude Code skills become OpenCode plugin tools:

```
.claude/skills/commit-helper/SKILL.md → .opencode/plugin/crosstrain-skills/tools/skill_commit_helper.ts
```

### Agents → Agents

```
.claude/agents/code-review.md → .opencode/agent/claude_code-review.md
```

**Model mapping:**
- `sonnet` → `anthropic/claude-sonnet-4-20250514`
- `opus` → `anthropic/claude-opus-4-20250514`
- `haiku` → `anthropic/claude-haiku-4-20250514`

### Commands → Commands

```
.claude/commands/run-tests.md → .opencode/command/claude_run-tests.md
```

### Hooks → Event Handlers

**Event mapping:**
- `PreToolUse` → `tool.execute.before`
- `PostToolUse` → `tool.execute.after`
- `SessionStart` → `session.created`
- `SessionEnd` → `session.idle`

### MCP Servers → OpenCode Config

```
.mcp.json → opencode.json (mcp section)
```

### Settings → opencode.json

Claude Code settings are converted to OpenCode configuration:

```bash
# Import settings
crosstrain settings

# Preview first
crosstrain settings --dry-run
```

**Permission mode mapping:**
- `acceptEdits` → `{ edit: "allow" }`
- `bypassPermissions` → `{ edit: "allow", bash: "allow" }`
- `plan` → `{ edit: "deny", bash: "deny" }`

**Not converted** (no direct equivalent):
- `hooks` - Use OpenCode plugins instead
- `env` - Set environment variables before running OpenCode
- `companyAnnouncements` - Not supported
- `sandbox` - OpenCode uses different sandboxing

## Remote Plugins

Convert plugins directly from GitHub:

```bash
# GitHub shorthand
crosstrain plugin org/repo/plugin-name

# With version tag
crosstrain plugin org/repo/plugin-name@v1.0.0

# Full URL
crosstrain plugin https://github.com/org/repo
```

## Browsing Marketplaces

List available plugins in a Claude Code marketplace:

```bash
crosstrain list anthropics/claude-plugins
```

Output shows plugin names, descriptions, and the command to convert each one.

## Crosstrainer Configuration

Plugin authors can customize conversion by adding a `crosstrainer.json` or `crosstrainer.js` file to their plugin root.

### JSON Configuration

For simple customization (model mappings, asset filtering):

```json
{
  "name": "my-plugin",
  "prefix": "myplugin_",
  "models": {
    "sonnet": "anthropic/claude-sonnet-4-20250514"
  },
  "agents": {
    "exclude": ["deprecated-agent"]
  }
}
```

### JavaScript Configuration

For full control with transform hooks:

```javascript
export default {
  name: "my-plugin",

  transformAgent(agent, ctx) {
    // Modify agent before conversion
    agent.model = "opus"
    return agent
  },

  transformCommand(command, ctx) {
    // Return null to skip
    if (command.name.startsWith("internal-")) return null
    return command
  },

  onConversionComplete(ctx, results) {
    console.log(`Converted ${results.agents.length} agents`)
  }
}
```

Only one crosstrainer file per plugin. See [CLI Reference](docs/cli.md) for full documentation.

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests
bun run typecheck    # Type check
bun run build        # Build
```

## Documentation

- [CLI Reference](docs/cli.md) - Full CLI documentation
- [CLAUDE.md](CLAUDE.md) - Architecture and development guide

## License

CC-BY-4.0
