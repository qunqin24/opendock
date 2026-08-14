# Ziit Extension Plugins

Ziit time tracking plugins for AI coding assistants. Track your coding time with [Ziit](https://ziit.app) - a self-hostable, open-source alternative to WakaTime.

## Available Plugins

| Plugin | Platform | Status |
|--------|----------|--------|
| `ziit-claude-code` | Claude Code | Ready |
| `ziit-codex` | Codex | Ready |
| `ziit-pi` | Pi / Oh My Pi | Ready |
| `ziit-opencode` | OpenCode | Ready |

## Installation

### Claude Code

```bash
# Add the ziit marketplace
claude plugin marketplace add arcat0v0/ziit-extension-plugins

# Install the plugin
claude plugin install ziit-claude-code

# Configure your API key
mkdir -p ~/.config/ziit
echo '{"apiKey": "your-ziit-api-key", "baseUrl": "https://ziit.app"}' > ~/.config/ziit/config.json
```

Get your API key from your [Ziit dashboard settings](https://ziit.app/settings).

### Codex

```bash
codex plugin marketplace add arcat0v0/ziit-extension-plugins
```

Install `ziit-codex` from the Codex plugin browser, review and trust its hooks with `/hooks`, then restart the session. The legacy standalone installer remains available for older Codex releases:

```bash
curl -fsSL https://raw.githubusercontent.com/arcat0v0/ziit-extension-plugins/main/plugins/ziit-codex/install.sh | bash
```

Configure your API key:

```bash
mkdir -p ~/.config/ziit
echo '{"apiKey": "your-ziit-api-key", "baseUrl": "https://ziit.app"}' > ~/.config/ziit/config.json
```

### OpenCode

Once the package is published, add the plugin via your `opencode.json` configuration at `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@arcat/ziit-opencode"
  ]
}
```

Then configure your API key:

```bash
mkdir -p ~/.config/ziit
echo '{"apiKey": "your-ziit-api-key", "baseUrl": "https://ziit.app"}' > ~/.config/ziit/config.json
```

Restart OpenCode so the plugin is loaded.

### Pi

```bash
pi install npm:@arcat/ziit-pi
```

### Oh My Pi

```bash
omp plugin install @arcat/ziit-pi
```

Both hosts read `~/.config/ziit/config.json`. Run `/reload` or restart the agent after installation.

### OpenCode (local development)

**For local development**, you can also build from source:

```bash
git clone https://github.com/arcat0v0/ziit-extension-plugins.git
cd ziit-extension-plugins/plugins/ziit-opencode
npm install
npm run build
```

Then use the local path in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///absolute/path/to/ziit-extension-plugins/plugins/ziit-opencode"
  ]
}
```

## Plugin Management

### Claude Code

```bash
# List installed plugins
claude plugin list

# Update plugin
claude plugin update ziit-claude-code

# Disable plugin
claude plugin disable ziit-claude-code

# Enable plugin
claude plugin enable ziit-claude-code

# Uninstall plugin
claude plugin uninstall ziit-claude-code
```

### Codex

Manage the native plugin from the Codex plugin browser. Use `/hooks` to review changed hook definitions after upgrades. For legacy file-based installs, use:

```bash
./plugins/ziit-codex/scripts/install.sh
./plugins/ziit-codex/scripts/uninstall.sh
```

### OpenCode

OpenCode uses plugin configuration in `opencode.json`. To remove the plugin:

1. Remove the plugin entry from your `~/.config/opencode/opencode.json`
2. Restart OpenCode

## How It Works

These plugins use each platform's native extension surface to send Ziit heartbeats:

- **Claude Code**: WakaTime-aligned activity hooks for prompts, tool boundaries, compaction, subagents, turn completion, and session end
- **Codex**: native plugin hooks for `apply_patch` and `Bash` plus `Stop`
- **Pi / Oh My Pi**: native extension events for `read`, `write`, and `edit`
- **OpenCode**: native plugin events for `message.part.updated`, `session.idle`, and `session.deleted`

Each heartbeat includes:
- Timestamp
- Project name (from git remote or directory)
- Programming language (30+ languages supported)
- File path
- Git branch
- Editor name (for example `Claude Code` or `Codex CLI`)
- Operating system

## Features

- Automatic tracking with no manual intervention
- Offline queue and batch retry
- Git-aware project and branch detection
- Language detection for common source files
- One-minute Claude activity sampling within active turns

## Logs

Debug logs:

- Claude Code: `~/.config/ziit/claude-code.log`
- Codex CLI: `~/.config/ziit/codex.log`
- OpenCode: `~/.config/ziit/opencode.log`

## Requirements

- Node.js 20 or newer for Claude Code hooks
- Python 3 for Codex hooks
- Node.js for building the OpenCode and Pi packages
- `git` for project and branch detection (optional)

## License

MIT
