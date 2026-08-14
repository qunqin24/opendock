# opencode-pencil-sync

Automatic Pencil MCP server integration for OpenCode. Just install the plugin and Pencil works.

## What it does

1. **Auto-setup**: If Pencil is running but not configured, automatically adds it to your global config
2. **Auto-sync**: If Pencil port changes, automatically updates the config
3. **Manual tools**: Provides tools for the agent to manage Pencil integration

## Installation

Add to your `opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-pencil-sync"]
}
```

That's it. When you start OpenCode with Pencil running, it will automatically configure itself.

## Tools

### `pencil_status`

Check current Pencil status. Shows:
- Whether Pencil app is running
- Current port from Pencil
- Whether global/project configs have Pencil configured
- Whether ports are in sync

### `pencil_setup`

Add Pencil MCP server to OpenCode config. The agent will ask you:

> "Do you want to add Pencil to your global config (all projects) or just this project?"

Parameters:
- `scope`: `"global"` or `"project"`

**Global**: Adds to `~/.config/opencode/opencode.jsonc` - Pencil available in all projects

**Project**: Adds to `./opencode.json` - Pencil available only in this project

### `pencil_sync`

Sync the port when Pencil restarts with a new port. Use this if Pencil tools fail with connection errors.

Requires Pencil to already be configured - use `pencil_setup` first if not.

## How it works

1. Pencil app writes its MCP config to `~/.claude.json` when running
2. Plugin reads the port and command from there
3. Plugin adds/updates the config in OpenCode's config files
4. Creates backup before any modification
5. Validates changes before writing

## Safety measures

- **Backup before write**: Creates `.pencil-sync.bak` before any modification
- **JSONC validation**: Validates structure before writing
- **Verification**: Confirms changes took effect
- **Auto-rollback**: Restores backup if verification fails
- **Read-only source**: Never modifies `~/.claude.json`

## Typical workflow

**Automatic setup (recommended):**
1. Start Pencil app
2. Start OpenCode - plugin detects Pencil and auto-configures global config
3. Restart OpenCode to load Pencil MCP tools
4. Done

**Manual setup (if auto-setup fails):**
1. User: "Set up Pencil for me"
2. Agent calls `pencil_setup` with `scope: "global"` or `scope: "project"`
3. Restart OpenCode to apply

**Port sync after Pencil restart:**
1. User tries to use Pencil tools, gets connection error
2. Plugin auto-syncs on next OpenCode startup, OR
3. Agent calls `pencil_sync` manually
4. Restart OpenCode to apply

## Note on Pencil lifecycle

Pencil removes its config from `~/.claude.json` when closed. This is expected:

- **Pencil closed**: Plugin does nothing (no source config)
- **Pencil open**: Plugin can read port and sync
- **Pencil restarted**: Use `pencil_sync` to update port

## Config locations

| Scope | Path |
|-------|------|
| Global | `~/.config/opencode/opencode.json`, `~/.config/opencode/opencode.jsonc`, `~/.config/opencode/config.json`, `~/.config/opencode/config.jsonc` |
| Project | `./opencode.json`, `./opencode.jsonc`, `./config.json`, `./config.jsonc` |
| Project (.opencode) | `./.opencode/opencode.json`, `./.opencode/opencode.jsonc`, `./.opencode/config.json`, `./.opencode/config.jsonc` |

The plugin checks for existing config files in the order listed above. If no config exists:
- **Global scope**: Creates `~/.config/opencode/opencode.jsonc`
- **Project scope**: Creates `./opencode.json`

Project config takes precedence over global config.

## Troubleshooting

**Plugin fails to add config automatically:**
- Ensure only one config file exists per scope (no duplicates like both `opencode.json` and `config.json`)
- Check that the config file is valid JSONC
- Try using `pencil_setup` tool manually

**Pencil tools not available after setup:**
- OpenCode must be restarted to load new MCP servers
- Check that Pencil app is running

**Multiple config files detected:**
- The plugin will report conflicts and refuse to modify
- Remove duplicate config files so only one remains per scope
