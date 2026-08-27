# OpenCode Models Presets

[![npm version](https://img.shields.io/npm/v/opencode-models-presets?logo=npm&label=npm)](https://www.npmjs.com/package/opencode-models-presets)

Assign models and variants to OpenCode agents, review the changes, and save reusable presets. The plugin uses the live agents and models from your OpenCode server instead of a hardcoded catalog.

## Install

Requires OpenCode `>=1.17.15 <2`.

```bash
opencode plugin opencode-models-presets --global
```

To pin the first automated npm release:

```bash
opencode plugin opencode-models-presets@0.3.1 --global --force
```

Restart OpenCode, then press `Ctrl+P` and choose **Configure model presets**, or run `/models-profiles`.

## Use

1. Choose project or global scope.
2. Start from live agents, an optional profile, or a saved preset.
3. Keep, replace, or inherit assignments.
4. Review and apply the changes.

See [Configuration](docs/configuration.md) for profiles, presets, storage, and write safety.

## Configure options

Options live beside the npm package spec in `tui.json`:

```json
{
  "plugin": [
    ["opencode-models-presets", {"profilesDir": ".opencode/model-profiles"}]
  ]
}
```

Relative profile paths resolve from the active project.

## Update or remove

Keep `"opencode-models-presets"` to follow `latest`. To pin a release, use `"opencode-models-presets@<version>"`.

To remove the plugin, delete only its matching string or tuple from the global `tui.json`, preserve every other entry, and restart OpenCode. There is no global npm installation to uninstall.

## Develop

See [Contributing](CONTRIBUTING.md) to load local source and run checks.

## Help

- [Troubleshooting](docs/troubleshooting.md)
- [Report a problem](https://github.com/andresnator/opencode-agent-model-configurator/issues)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT License](LICENSE)
