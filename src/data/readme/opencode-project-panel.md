# opencode-project-panel

[Traditional Chinese](README.zh-TW.md)

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

### Upgrading

Alternatively, specify the version in the `tui.json` plugin spec. OpenCode
automatically downloads and loads the specified version when it starts:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-project-panel@0.1.9"]
}
```

Change `@<version>` to the version you want and restart OpenCode to upgrade;
you do not need to clear the cache manually.

For a project installation, run this command from the project's `.opencode/`
directory:

```sh
bun add opencode-project-panel@latest
```

For a global installation, remove this plugin's cache so OpenCode downloads the
latest version from npm:

```sh
cache="$HOME/.cache/opencode/packages/opencode-project-panel"
if [ -d "$cache" ]; then rm -rf -- "$cache"; fi
```

Restart OpenCode after upgrading, changing `tui.json`, or clearing the package
cache.

## If you are an agent

When installing or upgrading this plugin:

1. Treat it as an OpenCode TUI plugin. Update the project
   `.opencode/tui.json` or global `~/.config/opencode/tui.json`, not
   `opencode.json`.
2. Preserve existing `plugin` entries and avoid duplicates.
3. If a specific version is requested, use
   `"opencode-project-panel@<version>"` in the `plugin` array. OpenCode will
   download and load that version on startup.
4. For a project dependency upgrade, run `bun add opencode-project-panel@latest`
   from the project's `.opencode/` directory.
5. Restart OpenCode after changing `tui.json`. For a global cached installation,
   remove only this plugin's cache directory if a fresh download is needed.
6. Do not load the npm package and a local `dist/index.js` copy at the same time.

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

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the release history.

## License

MIT
