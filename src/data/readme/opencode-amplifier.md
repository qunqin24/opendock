# opencode-amplifier

[OpenCode](https://opencode.ai) plugin that brings [Amplifier](https://github.com/microsoft/amplifier) into any OpenCode session — bundles, modes, agents, provider switching, and diagnostics.

## Install

```bash
uv tool install amplifier                                          # 1. install amplifier
npm install -g opencode                                            # 2. install opencode
echo '{ "plugin": ["opencode-amplifier"] }' > opencode.json       # 3. add the plugin
opencode                                                           # 4. run it
```

The plugin registers 19 tools and 4 hooks automatically. Try:

```
modes                        # list available modes
bundle list                  # list available bundles
use foundation               # switch active bundle
bundle add git+https://...   # install a new bundle
brainstorm                   # activate brainstorm mode
mode off                     # clear active mode
```

## What you get

| Category | Tools |
|----------|-------|
| **Status** | `amplifier_status`, `amplifier_capability`, `amplifier_emit` |
| **Bundles** | `amplifier_bundle_list`, `amplifier_bundle_show`, `amplifier_bundle_resolve`, `amplifier_bundle_use`, `amplifier_bundle_current` |
| **Agents** | `amplifier_agents_list`, `amplifier_agents_show` |
| **Providers** | `amplifier_provider_list`, `amplifier_provider_use` |
| **Modes** | `amplifier_modes_list`, `amplifier_mode` |
| **Settings** | `amplifier_settings_get`, `amplifier_settings_set` |
| **Diagnostics** | `amplifier_init`, `amplifier_doctor`, `amplifier_cli` |

## Development

```bash
git clone https://github.com/michaeljabbour/opencode-amplifier.git
cd opencode-amplifier
bun install
bun test            # 80 tests, clean output
bun run typecheck   # should exit silently
```

### Local plugin development

To test local changes without publishing:

```json
{
  "plugin": ["file:///absolute/path/to/opencode-amplifier"]
}
```

## Requirements

- [Amplifier](https://github.com/microsoft/amplifier) (`uv tool install amplifier`)
- [OpenCode](https://opencode.ai) (`npm install -g opencode`)
- [Bun](https://bun.sh) (for development only)

## License

MIT
