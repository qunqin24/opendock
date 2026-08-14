# opencode-plugin-selector

> Interactive plugin selector for OpenCode - easily manage your plugins with a beautiful TUI

[![npm version](https://badge.fury.io/js/opencode-plugin-selector.svg)](https://badge.fury.io/js/opencode-plugin-selector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎨 **Beautiful TUI** - Interactive multiselect interface powered by @clack/prompts
- ⚡ **Fast** - Instant loading with known plugins list
- ✓ **Status indicators** - See which plugins are installed/active at a glance
- 💾 **Auto-sync** - Automatically updates your `opencode.json` configuration
- 🔄 **Preserves versions** - Maintains version specifiers for existing plugins
- 🌍 **Cross-platform** - Works on Windows, macOS, and Linux

## Installation

### From npm (Recommended)

Add to your OpenCode configuration:

```json
{
  "plugin": ["opencode-plugin-selector"]
}
```

OpenCode will automatically install it on startup.

### Manual Installation

```bash
npm install -g opencode-plugin-selector
```

Or add to your project:

```bash
npm install opencode-plugin-selector
```

## Usage

### In OpenCode

Just type the command:

```
/plugins
```

This opens an interactive menu where you can:

- **↑↓** - Navigate through plugins
- **Space** - Toggle plugin selection
- **Enter** - Confirm selection
- **Esc** - Cancel

### Example

```
╭─────────────────────────────────────╮
│ OpenCode Plugin Selector            │
├─────────────────────────────────────┤
│ ◉ opencode-firecrawl ✓              │
│   Web scraping via Firecrawl        │
│                                     │
│ ◯ oh-my-opencode ✓                  │
│   Background agents, LSP tools      │
│                                     │
│ ◯ opencode-wakatime ✗               │
│   Track usage with Wakatime         │
╰─────────────────────────────────────╯

[↑↓ Navigate] [Space Toggle] [Enter Confirm]
```

## How It Works

1. **Plugin Discovery** - Loads known plugins from the OpenCode ecosystem
2. **Status Check** - Scans `~/.cache/opencode/node_modules/` for installed plugins
3. **Config Sync** - Reads `~/.config/opencode/opencode.json` for active plugins
4. **Interactive Selection** - Presents a multiselect TUI
5. **Config Update** - Saves your selection back to `opencode.json`
6. **Restart Required** - Restart OpenCode to apply changes

## Supported Plugins

The selector includes all known plugins from the OpenCode ecosystem:

- **Auth plugins**: `opencode-antigravity-auth`, `opencode-openai-codex-auth`, `opencode-gemini-auth`
- **Development**: `opencode-daytona`, `opencode-devcontainers`, `opencode-worktree`
- **Monitoring**: `opencode-helicone-session`, `opencode-wakatime`, `opencode-sentry-monitor`
- **Utilities**: `opencode-firecrawl`, `opencode-pty`, `opencode-scheduler`
- **Agents**: `oh-my-opencode`, `opencode-background-agents`, `opencode-workspace`
- And many more...

## Configuration

The plugin respects your existing `opencode.json` configuration:

```json
{
  "plugin": [
    "opencode-plugin-selector",
    "opencode-firecrawl@1.2.0",
    "oh-my-opencode@latest"
  ]
}
```

Version specifiers are preserved when you update your selection.

## Development

### Prerequisites

- Node.js 18+
- Bun (for running OpenCode)

### Setup

```bash
git clone https://github.com/yourusername/opencode-plugin-selector.git
cd opencode-plugin-selector
npm install
```

### Build

```bash
npm run build
```

### Test Locally

Add to your `opencode.json`:

```json
{
  "plugin": ["./path/to/opencode-plugin-selector"]
}
```

## API Reference

### Plugin Hook

The plugin implements the `tui.command.execute` hook:

```typescript
{
  'tui.command.execute': async (input, output) => {
    if (input.command === 'plugins') {
      // Show interactive selector
    }
  }
}
```

### Functions

- `getAllPlugins()` - Get all available plugins with status
- `getActivePlugins()` - Get currently enabled plugins
- `updatePlugins(plugins: string[])` - Update configuration
- `getInstalledPlugins()` - Get plugins installed in cache

## Troubleshooting

### Plugin not loading?

1. Check your `opencode.json` syntax
2. Ensure the plugin is in the `plugin` array
3. Restart OpenCode

### Config not updating?

1. Check file permissions on `~/.config/opencode/opencode.json`
2. Ensure the file is valid JSON
3. Check OpenCode logs for errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenCode](https://opencode.ai) - The AI coding assistant
- [@clack/prompts](https://github.com/natemoo-re/clack) - Beautiful CLI prompts
- [picocolors](https://github.com/alexeyraspopov/picocolors) - Terminal colors

## Related

- [OpenCode Documentation](https://opencode.ai/docs)
- [OpenCode Ecosystem](https://opencode.ai/docs/ecosystem)
- [Plugin Development Guide](https://opencode.ai/docs/plugins)
- [Linux.Do 社区](https://linux.do) - 开发者社区

---

Made with ❤️ for the OpenCode community
