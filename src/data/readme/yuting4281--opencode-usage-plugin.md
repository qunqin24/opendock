# @yuting4281/opencode-usage-plugin

OpenCode TUI plugin that shows your AI provider usage quota directly inside OpenCode.

Auto-detects available providers. Auto-refreshes every 60 seconds.

## Supported providers

| Provider | Auth source | What it shows |
|----------|-------------|---------------|
| GitHub Copilot | `~/.local/share/opencode/auth.json` | Premium interactions remaining %, plan type, reset date |
| Kiro | `~/.config/opencode/kiro.db` | Usage / limit per account |
| Codex (OpenAI) | `~/.local/share/opencode/auth.json` | Weekly usage %, plan type, reset countdown |
| NVIDIA (build.nvidia.com) | `~/.local/share/opencode/auth.json` + `opencode.db` | Local estimate: requests made today from this machine vs. an assumed daily limit, recent requests/min |
| Grok (xAI) | `~/.local/share/opencode/auth.json` | Weekly credit usage % (Grok Build), plan (e.g. Grok Pro), period reset |

> **Note on NVIDIA:** NVIDIA offers no usage API, so this row is a *local estimate* — it counts today's requests (local midnight reset) made through OpenCode on this machine against an assumed daily limit of 1,000 (adjustable via `nvidia_daily_limit`).

## What you get

![usage interface](<resources/usage.png>)

- Collapsible usage panel on the home screen
- Collapsible usage panel in the session sidebar
- `/usage` command for a full-screen detailed view
- `/usage-refresh` command to manually refresh
- Color-coded progress bars (green → yellow → red as quota decreases)
- Quota reset time on the same row as the progress bar, shown as local `MM/DD HH:mm` (providers that expose no reset time simply omit it)

## Requirements

- OpenCode >= 2.0.28 (plugin version 0.3.0 and later)
- Node.js >= 22 for the optional helper command. OpenCode supplies the TUI runtime.

Version 0.3.0 migrates the plugin to OpenCode 2's CLI plugin API. It does not
support OpenCode 1; use the 0.2.x release for V1 instead.

## Setup

This is a TUI-only plugin.

- Add it to `~/.config/opencode/cli.json`
- Do not add this CLI-only plugin to `opencode.json` / `config.json`
- Restart OpenCode fully after changing the config

### Load from npm package

Once version 0.3.0 is available from npm, add this to `~/.config/opencode/cli.json`:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "@yuting4281/opencode-usage-plugin"
  ]
}
```

You usually do not need to run `npm install` manually for the TUI plugin itself. OpenCode reads the package name from `cli.json` and resolves/installs it through its own plugin system.

Use the package name only. Do not use `@yuting4281/opencode-usage-plugin/tui` in `cli.json`.

When installed from npm, OpenCode resolves the package's `./tui` export automatically. Users only need the package name in `cli.json`.

### Use a local checkout

For local development or if you cloned this repo directly, point `cli.json` at the plugin directory (not `tui.tsx`):

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    "/absolute/path/to/opencode-usage-plugin"
  ]
}
```

Using an absolute directory path is the most reliable option for local installs.
OpenCode 2 resolves the directory's `./tui` export; a direct `tui.tsx` path does not load this CLI plugin.

## Optional helper command

The plugin works without this. Install it only if you want the `opencode-auth-usage` command on your `PATH`.

```bash
npm install -g @yuting4281/opencode-usage-plugin
```

Or install from GitHub:

```bash
npm install -g github:fdsf53451001/opencode-usage-plugin
```

The plugin automatically detects which providers are available and only shows the ones you have configured. No extra setup needed.

### Prefer running connectors in a subprocess?

Most users do not need this. If you want to force the plugin to use `opencode-auth-usage`, configure the same plugin spec with options:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "@yuting4281/opencode-usage-plugin",
      "options": { "command": "opencode-auth-usage" }
    }
  ]
}
```

If you are loading the plugin from a local checkout, replace `"@yuting4281/opencode-usage-plugin"` with the same absolute directory path you used above.

## Options

Pass in the plugin entry's `options` object:

| Option | Default | Description |
|--------|---------|-------------|
| `command` | — | Run an external command instead of built-in connectors |
| `cwd` | — | Working directory for the external command |
| `interval_ms` | `60000` | Auto-refresh interval (ms) |
| `timeout_ms` | `8000` | Command timeout (ms) |
| `max_items` | `4` | Max rows shown in compact panels |
| `title` | `Usage` | Panel title |
| `show_home` | `true` | Show panel on home screen |
| `show_sidebar` | `true` | Show panel in session sidebar |
| `nvidia_daily_limit` | `1000` | Assumed NVIDIA daily request limit for the local usage estimate |

## Troubleshooting

- If the panel does not appear, make sure the plugin is configured in `cli.json` (V2 no longer reads changes to `tui.json`)
- For a local checkout, use an absolute directory path, not a direct path to `tui.tsx`
- After changing config, fully quit and reopen OpenCode
- Check `~/.local/share/opencode/log/opencode.log` for CLI plugin errors (`role=cli`)
- `opencode plugin list` lists server plugins, not this CLI-only plugin
- If the plugin is loaded, you should see the `Usage` panel and the `/usage` command
- If the NVIDIA row is missing, make sure `auth.json` has an `nvidia` entry (set up via `opencode auth login`)
- If the Grok row is missing, make sure `auth.json` has an `xai` OAuth entry (set up via `opencode auth login`)

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCODE_AUTH_PATH` | `~/.local/share/opencode/auth.json` | Custom OpenCode auth file path |
| `OPENCODE_KIRO_DB_PATH` | `~/.config/opencode/kiro.db` | Custom Kiro database path |
| `OPENCODE_DB_PATH` | `~/.local/share/opencode/opencode.db` | Custom OpenCode database path (CLI, used for the NVIDIA estimate) |
| `OPENCODE_NVIDIA_DAILY_LIMIT` | `1000` | Assumed NVIDIA daily request limit (CLI equivalent of `nvidia_daily_limit`) |
