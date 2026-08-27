# opencode-provider-tabnine

> [!WARNING]
> This unofficial project is deprecated and no longer maintained. Tabnine now
> provides an official plugin for OpenCode.

- [Official repository](https://github.com/codota/tabnine-opencode-public)
- [Official documentation](https://docs.tabnine.com/main/getting-started/tabnine-plugin-for-opencode)

## Uninstall

OpenCode does not currently provide a plugin uninstall command. Open each
existing global config file:

```sh
config_dir="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
for config in "$config_dir/opencode.json" \
  "$config_dir/opencode.jsonc" \
  "$config_dir/config.json"; do
  [ ! -f "$config" ] || "${EDITOR:-vi}" "$config"
done
```

Remove every `plugin` entry for `opencode-provider-tabnine`, including a
version suffix such as `opencode-provider-tabnine@0.1.5`. Then optionally remove
OpenCode's downloaded copies:

```sh
cache="${XDG_CACHE_HOME:-$HOME/.cache}/opencode/packages"
[ ! -d "$cache" ] || find "$cache" -maxdepth 1 -type d \
  \( -name 'opencode-provider-tabnine' -o \
  -name 'opencode-provider-tabnine@*' \) \
  -exec rm -rf -- {} +
```

No further fixes or releases are planned for this package.
