# @a-r-m-i-n/opencode-openai-usage

OpenCode plugin that reads your ChatGPT account usage and shows it in the TUI sidebar and command palette.

The sidebar panel starts expanded and can be collapsed.

![OpenAI Usage sidebar showing active usage windows](docs/screenshots/sidebar-expanded.png)

## What It Does

- fetches usage data from OpenAI Backend API
- reads the OpenCode OpenAI OAuth token from OpenCode's local state
- shows usage windows in the collapsible sidebar
- adds `OpenAI Usage`, `OpenAI Usage: Toggle Sidebar Display`, and `OpenAI Usage: Show/Hide Sidebar Section` commands to the TUI command list

## Screenshots

### Command Palette

Shows the OpenAI-specific commands added by the plugin.

- `OpenAI Usage`: opens the detailed usage dialog
- `OpenAI Usage: Toggle Sidebar Display`: switches the sidebar between used quota and remaining quota
- `OpenAI Usage: Show Sidebar Section` / `OpenAI Usage: Hide Sidebar Section`: toggles the sidebar section and persists the setting across restarts

<img src="docs/screenshots/command-palette-openai.png" alt="Command palette with OpenAI Usage commands" width="400" />

### Usage Dialog

Shows the detailed usage summary, including the current usage windows and account details returned by the upstream endpoint.

<img src="docs/screenshots/openai-usage-dialog.png" alt="OpenAI Usage dialog" width="400" />

### Sidebar Display Modes

The sidebar can show either used quota or remaining quota.

Used mode:

<img src="docs/screenshots/mode-used.png" alt="Sidebar showing used quota" width="350" />

Left mode:

<img src="docs/screenshots/mode-left.png" alt="Sidebar showing remaining quota" width="350" />

## Requirements

- OpenCode with an OpenAI account connected via OAuth
- Node.js and npm available for installation/build steps

## Install From npm

```bash
npm install @a-r-m-i-n/opencode-openai-usage
```

Add the runtime plugin in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@a-r-m-i-n/opencode-openai-usage"]
}
```

Add the TUI plugin in `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["@a-r-m-i-n/opencode-openai-usage/tui", { "invert": false }]]
}
```

After changing config, quit and restart OpenCode.

## TUI Options

The TUI plugin accepts options in `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["@a-r-m-i-n/opencode-openai-usage/tui", { "invert": true }]]
}
```

| Option | Default | Description |
|---|---|---|
| `invert` | `false` | Default sidebar mode. `false` shows used quota like `60% used`; `true` shows remaining quota like `40% left`. After the `OpenAI Usage: Toggle Sidebar Display` command is used, the last selected mode is persisted across restarts. |

## Project Structure

```text
src/
  index.ts
  tui.tsx
  lib/openai-usage.ts
.opencode/
  plugins/openai-usage.ts
  tui/openai-usage.tsx
  tui.json
```

## Notes And Limitations

- The plugin depends on OpenCode's locally stored `auth.json` format.
- The usage endpoint is an internal ChatGPT web endpoint and may change without notice.
- The plugin caches usage data locally in OpenCode's state directory.
- The plugin hides its sidebar panel when OpenCode has no OpenAI OAuth account configured.
- Usage-specific commands are hidden when OpenCode has no OpenAI OAuth account configured, but the sidebar visibility toggle remains available.
- The command summary currently includes the account email returned by the upstream endpoint.

## License

MIT
