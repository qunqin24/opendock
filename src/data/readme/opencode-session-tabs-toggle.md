# OpenCode session tabs toggle

**TUI-only plugin for OpenCode V2 (2.0.23 or later)**. Show or hide the left
session column when `tabs.layout` is `vertical`, or the tab strip when the
layout is horizontal. This plugin does not control the right sidebar.

## Usage

- **Ctrl+X, then V** (with the default leader key).
- **Ctrl+P → Toggle session tabs**.
- **`/toggle-tabs`** slash command.

Toggle `tabs.mode` between `off` and the previous visible mode (`auto` or `on`).
If tabs start hidden with no previously recorded mode, the plugin restores
`auto`. It does not change the layout, scope, sessions, saved tabs, or server
databases.

## Installation

### Published package

Once the package is published to npm, add its name to the `plugins` array in
`~/.config/opencode/cli.json`, preserving existing entries:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-session-tabs-toggle"]
}
```

You can pin a release using `"opencode-session-tabs-toggle@0.1.0"` instead.

### Local checkout

From this directory:

```sh
pnpm install --frozen-lockfile
```

Add this directory's **absolute path** to the `plugins` array in
`~/.config/opencode/cli.json`, preserving your existing entries and settings:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "/absolute/path/opencode-session-tabs-toggle"
  ]
}
```

Restart the TUI to load the plugin. There is no need to restart the server.
Configured in `cli.json`, the plugin also works when connecting to a remote
server (for example, through `oc`). Install it on the host running the TUI,
not on the remote server.

## Options

Use the object form of a plugin entry to configure its keyboard shortcut:

```json
{
  "plugins": [{
    "package": "opencode-session-tabs-toggle",
    "options": { "keybind": "<leader>v" }
  }]
}
```

For a local installation, use the absolute directory path as `package` instead.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `keybind` | Nonempty string or `false` | `"<leader>v"` | Keyboard shortcut for toggling session tabs. Set `false` to disable the shortcut while keeping the palette and slash command available. |

Examples:

- `"<leader>v"`: press your configured leader, then V (Ctrl+X, then V by default).
- `"ctrl+alt+v"`: use a direct key combination instead of a leader sequence.
- `false`: use only **Ctrl+P → Toggle session tabs** or **`/toggle-tabs`**.

## Behavior and limitations

The public plugin API does not provide a tab visibility setter. Instead, the
plugin updates **only `tabs.mode`** in the client's `cli.json`, which OpenCode
reloads automatically. It respects `$XDG_CONFIG_HOME`, preserves unrelated
settings and comments, and keeps existing symbolic links intact. The previous
visible mode is saved in the plugin's durable storage.

- The preference persists and affects **other TUIs sharing the same file**.
- If `OPENCODE_CLI_CONFIG_CONTENT` sets `tabs.mode` or `tabs.enabled`, the plugin
  shows an error without editing the file: inline configuration takes precedence.
- `auto` follows native behavior (for example, tabs may be hidden inside Herdr).
  Set the preference to `on` if you want tabs to remain visible when enabled.
- The default shortcut respects your configured leader and does not replace
  `<leader>b`.
- The plugin does not install itself or register itself in global configuration
  automatically.

## Development

Use Node.js 24, Bun 1.3.14, and the pnpm version declared in `packageManager`.
Runtime and development dependencies use exact versions; `saveExact` keeps
future additions pinned too. Commit `pnpm-lock.yaml` and use frozen installs
to reproduce the development environment.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
```

`@opencode/plugin` is an optional peer and an exact development dependency for
type checking. The plugin uses a type-only SDK import and receives its context
from OpenCode; it does not import the SDK at runtime. The peer range expresses
OpenCode V2 compatibility rather than an install pin. Consumers do not need to
download the SDK to run this plugin.

## Release checklist

1. Set `repository`, `homepage`, and `bugs` in `package.json` once the public
   repository URL is known, and confirm npm package name availability.
2. Update `version` for the release and regenerate the lockfile if necessary.
3. Run `pnpm install --frozen-lockfile`, then `pnpm pack`. The `prepack` script
   runs tests and type checking; CI runs the same validation on pushes and PRs.
4. Inspect the archive with `tar -tzf opencode-session-tabs-toggle-0.1.0.tgz`
   (adjust the filename for your version). It should contain only `package.json`,
   `src/`, `tui.ts`, `README.md`, and `LICENSE`, not tests or local configuration.
5. Test the archive in OpenCode, including its exported `./tui` entrypoint.
6. When ready and authenticated to npm, publish the inspected archive with
   `pnpm publish ./opencode-session-tabs-toggle-0.1.0.tgz --access public`.

No compilation step is required: OpenCode loads the TypeScript entrypoints.
Packaging and CI never publish the plugin automatically.

## License

MIT. See [LICENSE](LICENSE).
