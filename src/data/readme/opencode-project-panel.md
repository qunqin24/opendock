# opencode-project-panel

OpenCode TUI plugin that adds a bottom bar with:

- a project file manager with Markdown/code preview and editing;
- a Permissions panel for Skills, Tools, and MCP configuration.

## Install

This is an OpenCode TUI plugin. It must be declared in `tui.json`, not in the
server plugin list in `opencode.json`.

### Project installation

Install the package in the project's `.opencode/` directory:

```sh
mkdir -p .opencode
cd .opencode
bun add opencode-project-panel
```

Create or update `.opencode/tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel"]
}
```

The plugin loader uses OpenCode's own package cache; it does not load this
plugin from an unrelated application workspace such as `apps/tui/node_modules`.

### Global installation

To enable the plugin for every project, create
`~/.config/opencode/tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel"]
}
```

The global TUI configuration is `~/.config/opencode/tui.json`. OpenCode
automatically downloads npm plugins into its own cache at
`~/.cache/opencode/packages/`; manually installing the package into
`~/.opencode/` is not required for global activation.

The plugin uses the current project configuration (`opencode.json` or
`opencode.jsonc`) when editing permissions and MCP settings.

### Refreshing a cached version

Only remove this plugin's cache directory when you need to force a fresh
download. The command below targets this package only:

```sh
cache="$HOME/.cache/opencode/packages/opencode-project-panel"
if [ -d "$cache" ]; then rm -rf -- "$cache"; fi
```

Restart OpenCode after changing `tui.json` or clearing the package cache.

## Shortcuts

- `F1`: open the file manager
- `F3`: open Permissions
- `F2`: rename the selected file
- `F7`: create a file or directory
- `Delete`: delete the selected file
- `Ctrl+G`: go to a path
- `Ctrl+R`: return to the project root

## Development

```sh
bun install
bun run typecheck
bun run build
```

The package entry point is the generated `dist/index.js` file. Runtime UI
dependencies remain external in the bundle and are declared in `dependencies`
so OpenCode's Bun-based plugin loader can resolve them.

## License

MIT
