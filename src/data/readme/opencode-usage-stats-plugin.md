# opencode-usage-stats-plugin

[简体中文](README.zh-CN.md) | English

An [OpenCode](https://opencode.ai) plugin that tracks LLM token usage and displays interactive statistics in the terminal UI.

![Usage stats overview](docs/screenshot-overview.png)

## Features

- **Token tracking** -- automatically records input, output, cache, and reasoning tokens for every LLM call
- **Multi-device** -- aggregates usage across multiple machines via hostname identification
- **Heat-map overview** -- daily and weekly activity heat maps with trend levels
- **Model breakdown** -- per-provider / per-model token consumption with bar charts
- **Device breakdown** -- per-device usage with last-active timestamps
- **Timezone-aware** -- configurable timezone with 10 presets; all aggregation respects DST / leap-year boundaries
- **Crash-safe** -- SQLite WAL mode with busy-timeout retry; committed data survives process kills
- **Keyboard & mouse** -- full keyboard navigation (arrow keys, Tab, Shift+Tab) and mouse click support
- **Responsive layout** -- adapts to narrow terminals with a stacked layout

## Requirements

- [OpenCode](https://opencode.ai) >= 1.18.30, < 1.19.0
- [Bun](https://bun.sh) runtime (only needed for building from source)

## Installation

### From npm (recommended)

1. Add the plugin to `~/.config/opencode/opencode.json`:

   ```jsonc
   {
     "plugin": ["opencode-usage-stats-plugin"]
   }
   ```

2. Add the plugin to `~/.config/opencode/tui.json`:

   ```jsonc
   {
     "plugin": ["opencode-usage-stats-plugin"]
   }
   ```

   The same package name goes in both files: OpenCode loads the server entry from the first and the TUI entry from the second.

3. Restart OpenCode. The plugin is installed automatically and will begin tracking usage.

> **Database location for npm installs:** the database defaults to `~/.config/opencode/usage-stats-data`, outside the package directory, so updating the plugin never wipes your history. Set `dataDir` to an absolute path in your config file if you want it elsewhere (see Configuration).

### From source (for local development)

1. Clone the repository:

   ```bash
   git clone https://github.com/qiming-zhao/opencode-usage-stats-plugin.git
   cd opencode-usage-stats-plugin
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the plugin:

   ```bash
   bun run build
   ```

4. Register the plugin in your OpenCode configuration files:

   Add the server plugin to `~/.config/opencode/opencode.json`:

   ```jsonc
   {
     "plugin": [
       "/absolute/path/to/opencode-usage-stats-plugin/dist/server.mjs"
     ]
   }
   ```

   Add the TUI plugin to `~/.config/opencode/tui.json`:

   ```jsonc
   {
     "plugin": [
       "/absolute/path/to/opencode-usage-stats-plugin/dist/tui.mjs"
     ]
   }
   ```

5. Restart OpenCode. The plugin will begin tracking usage automatically.

## Usage

Open the usage panel in OpenCode via:

- Slash command: type `/usage`
- Command palette: search for **Usage stats**

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Switch between tabs (Overview / Models / Devices / Settings) |
| `Shift+Tab` | Toggle Daily / Weekly mode (on Overview tab) |
| `Arrow keys` | Navigate heat-map cells |
| `Esc` | Close the panel |

## Configuration

The plugin looks for configuration in this order (first match wins):

1. `~/.config/opencode/usage-stats-plugin.json` (user-level, recommended -- survives plugin updates)
2. `stats.config.json` in the plugin root (legacy, for local installs)
3. Built-in defaults

```json
{
  "dataDir": "./data",
  "timeZone": "Asia/Shanghai"
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `dataDir` | Directory for the SQLite database. Absolute paths are used as-is; relative paths resolve against the directory of the loaded config file | `~/.config/opencode/usage-stats-data` (or `./data` under the plugin root for legacy local installs) |
| `timeZone` | IANA timezone for day boundaries | `Asia/Shanghai` |

The timezone can also be changed from the Settings tab in the TUI panel; the change is saved to the user-level config file.

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Type check
bun run typecheck
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Architecture

```
src/
├── server.ts      # Server-side plugin entry (event listener + retry queue)
├── tui.tsx        # Terminal UI panel (SolidJS + @opentui)
├── collector.ts   # Event capture / token extraction
├── store.ts       # SQLite data layer (schema, upsert, aggregation)
├── overview.ts    # Heat-map and compact number formatting
└── config.ts      # Configuration file reader
```

## License

[MIT](LICENSE)
