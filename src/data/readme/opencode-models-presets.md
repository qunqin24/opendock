# OpenCode Models Presets

[![npm version](https://img.shields.io/npm/v/opencode-models-presets?logo=npm&label=npm)](https://www.npmjs.com/package/opencode-models-presets)

Assign models and variants to OpenCode agents, review the changes, and save reusable presets. The plugin uses the live agents and models from your OpenCode server instead of a hardcoded catalog.

## Install

Requires OpenCode `>=2.0.28 <3`. This release uses the V2 CLI plugin API and does not support OpenCode 1.

Add the package to `plugins` in the global `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`; `OPENCODE_CONFIG_DIR` overrides the configuration directory):

```json
{
  "plugins": ["opencode-models-presets"]
}
```

To pin a release, use `"opencode-models-presets@<version>"`. Choose a release that declares V2 support. Published releases through 0.3.5 used the V1 API.

Restart OpenCode, then press `Ctrl+P` and choose **Configure model presets**, or run `/models-profiles`.

## Use

1. Choose project or global scope.
2. Start from live agents, an optional profile, or a saved preset.
3. Keep, replace, or inherit assignments.
4. Review and apply the changes.

See [Configuration](docs/configuration.md) for profiles, presets, storage, and write safety.

## Configure options

Options use the object form in `cli.json`:

```json
{
  "plugins": [
    {"package": "opencode-models-presets", "options": {"profilesDir": ".opencode/model-profiles"}}
  ]
}
```

Relative profile paths resolve from the active project.

## Update or remove

Keep `"opencode-models-presets"` to follow `latest`. To pin a release, use `"opencode-models-presets@<version>"`.

To remove the plugin, delete only its matching string or package object from the global `cli.json`, preserve every other entry, and restart OpenCode. There is no global npm installation to uninstall.

## Develop

See [Contributing](CONTRIBUTING.md) to load local source and run checks.

## Help

- [Troubleshooting](docs/troubleshooting.md)
- [Report a problem](https://github.com/andresnator/opencode-agent-model-configurator/issues)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT License](LICENSE)

## Migrating from OpenCode 1

OpenCode V2 replaces terminal settings in `tui.json` with global `cli.json`, and package options use `{ "package": "...", "options": {...} }` instead of tuples. Existing saved presets and last-applied history remain in their original JSON files. Existing legacy agent configuration is preserved; new configuration uses native V2 `agents` and model references.

After successful assignment writes, the plugin requests the V2 configuration reload. This rebuilds every loaded location on the connected server and cancels pending permissions and forms. If reload fails, the file remains saved and the plugin reports that a restart is required.

See the official [V1 migration guide](https://dev.opencode.ai/v2/docs/migrate-v1/) and [CLI plugin API](https://dev.opencode.ai/v2/docs/build/plugins/cli).
