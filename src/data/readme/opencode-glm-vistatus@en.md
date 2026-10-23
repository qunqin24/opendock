# opencode-glm-vistatus

English | [简体中文](./README.md)

> OpenCode TUI plugin — real-time Z.AI / ZHIPU GLM Coding Plan quota usage in the sidebar.

---

## Features

- 5-hour token quota (percentage + progress bar)
- Weekly token quota (percentage + progress bar)
- MCP tool usage (percentage + progress bar)
- Tokens used / total
- Reset countdown + local clock
- Account plan tier (Pro / Lite, etc.)
- Platform info (Z.AI / ZHIPU)
- Last refresh time + next refresh estimate
- Auto-refresh every 5 minutes (customizable, 1–1440 min); sessions share a quota record via the host KV so each refresh window triggers only one real request globally
- Bilingual: Chinese / English
- Morandi-style theme adaptation
- Progress bar color shifts with usage (green → orange → red)

## Installation

### Option 1: OpenCode command palette (recommended, works on V1 & V2)

In OpenCode, press **`Ctrl + P`** to open the command palette, find **`plugin`** (Install Plugin), and enter:

```
opencode-glm-vistatus
```

Press Enter to complete the installation and configuration. The host writes
the right config file for its own version (V2 → `cli.json`, V1 →
`tui.jsonc`) and pulls the plugin from npm — no manual file editing needed.

### Option 2: manual configuration (fallback)

Only needed when the host has no built-in install command.

V2 (opencode 2.x) — add to `cli.json` in your config directory:

```jsonc
{
  "plugins": [{ "package": "opencode-glm-vistatus" }],
}
```

V1 (opencode 1.x) — add to `tui.jsonc` in your config directory:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-glm-vistatus"],
}
```

| OS            | Config directory      |
| ------------- | --------------------- |
| Windows       | `%APPDATA%\opencode\` |
| macOS / Linux | `~/.config/opencode/` |

### Restart OpenCode

Enter any session to see the GLM quota panel in the sidebar.

## Uninstallation

**1. Remove the plugin configuration**

Delete `"opencode-glm-vistatus"` from the `plugins` array in `cli.json` (V2) and/or the `plugin` array in `tui.jsonc` (V1):

```jsonc
// cli.json (V2)
{
  "plugins": [], // remove the { "package": "opencode-glm-vistatus" } entry
}
```

```jsonc
// tui.jsonc (V1)
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [], // remove the "opencode-glm-vistatus" entry
}
```

**2. Clear the OpenCode plugin cache**

Due to [OpenCode known issue #6774](https://github.com/anomalyco/opencode/issues/6774), plugins are cached locally; after removing the config it is recommended to clear the cache as well:

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force "$env:USERPROFILE\.cache\opencode\packages\opencode-glm-vistatus"
```

```bash
# macOS / Linux
rm -rf ~/.cache/opencode/packages/opencode-glm-vistatus
```

**3. Restart OpenCode**

## Prerequisites

1. Authenticate your Z.AI / ZHIPU account via the `/connect` command, or
2. Set the `ZAI_API_KEY` / `ZHIPU_API_KEY` environment variables

Credential discovery priority: V2 credential DB `~/.local/share/opencode/opencode.db` (honors `OPENCODE_DB` / `XDG_DATA_HOME`) → XDG `~/.local/share/opencode/auth.json` → Windows `%LOCALAPPDATA%\opencode\auth.json` → environment variables.

## Slash Commands

| Command           | Action                                                         |
| ----------------- | -------------------------------------------------------------- |
| `/glm-refresh`    | Force-refresh quota data immediately                           |
| `/glm-config`     | Plugin settings: language / border / refresh interval          |
| `/glm-mcp-manage` | Install / uninstall GLM MCP servers (alias `/glm-mcp-install`) |

Language, border and refresh-interval preferences are persisted (plugin KV) and survive restarts.

`/glm-config` opens an interactive settings menu: display language, panel border, refresh interval. The refresh interval offers presets (1 / 2 / 5 / 10 / 30 / 60 minutes) plus custom input (1–1440 minutes, invalid input rejected); changes take effect immediately with the timer rescheduled.

`/glm-mcp-manage` (alias `/glm-mcp-install`) first asks for the scope (Local project / Global user-wide), then reads that scope's config file (`opencode.json` and `opencode.jsonc` are both legal; the one holding the `mcp` field is located automatically) and renders a checkbox list of the current state: checking installs, unchecking uninstalls, and on confirm only servers whose state differs from entry are changed. Available servers:

| Server         | Type   | Description                                     |
| -------------- | ------ | ----------------------------------------------- |
| github-read    | Remote | GitHub repo knowledge & code reading            |
| glm-web-reader | Remote | Web page content extraction & structured data   |
| glm-web-search | Remote | Web search & real-time information              |
| glm-vision     | Local  | Image analysis & video understanding (GLM-4.6V) |

## Panel Layout

```
▼ GLM Quota v0.1.0         14:24
───────────────────────────────
Platform:                 ZHIPU
Plan:                       Pro
5h Token
[███████░░░░░░░░░░░░░░░░░░] 28%
Reset: 2h 30m (16:58)
Weekly quota
[██░░░░░░░░░░░░░░░░░░░░░░░░] 7%
Reset: 4d 1h (Thu 16:03)
MCP                     0/1,000
[░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

Progress bar color rules:

| Usage  | Color  | Meaning           |
| ------ | ------ | ----------------- |
| < 70%  | Green  | Plenty remaining  |
| 70-90% | Orange | Approaching limit |
| >= 90% | Red    | Near exhaustion   |

## Build

```bash
npm install          # install dev deps only (runtime deps are host-provided; the published package has zero deps)
npm run build        # tsc output + esbuild bundle → dist/tui.js
npm run typecheck    # tsc --noEmit
```

Build artifacts:

- `dist/tui.js` — dual-format TUI plugin bundle (`{ id, tui, setup }`); this IS
  the `./tui` export target: V1 hosts read the `tui` field, V2 hosts read
  the `setup` field

## Architecture

| Aspect           | Implementation                                                     |
| ---------------- | ------------------------------------------------------------------ |
| Plugin type      | TUI plugin (sidebar_content slot)                                  |
| Rendering        | SolidJS (@opentui/solid)                                           |
| Data source      | Z.AI / ZHIPU Monitor API (3 endpoints per platform)                |
| Credentials      | OpenCode V2 credential DB / auth.json / environment variables      |
| HTTP client      | `fetch()` + AbortController 10s timeout                            |
| Error strategy   | `Promise.allSettled` graceful degradation (shows partial data)     |
| Refresh strategy | first fetch on mount + timed polling (default 5 min, customizable) |

## Troubleshooting

| Symptom                     | Likely cause                                                                |
| --------------------------- | --------------------------------------------------------------------------- |
| Panel blank / no data       | Not authenticated, credential DB / auth.json not matched, or env vars unset |
| Partial data missing        | An API endpoint timed out (10s); the rest still renders                     |
| Language toggle not working | Set `GLM_VISTATUS_LANG=zh\|en` to force a language (bypasses auto-detect)   |
| Data not updating           | Restart OpenCode, or run `/glm-refresh` to refresh now                      |

## License

MIT
