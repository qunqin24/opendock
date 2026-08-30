# opencode-choose-directory

[![npm version](https://img.shields.io/npm/v/opencode-choose-directory.svg)](https://www.npmjs.com/package/opencode-choose-directory)
[![license](https://img.shields.io/npm/l/opencode-choose-directory.svg)](LICENSE)

Windows-only OpenCode V2 TUI plugin that adds a **选择目录** button to the home screen.

The button opens the native Windows Explorer-style folder picker. Selecting a directory keeps OpenCode on the home screen; OpenCode creates the session in that directory only after the first prompt is submitted.

## Features

- Visible only on the OpenCode home screen
- Positioned at the far right of the home footer
- Native Windows `IFileDialog` folder picker
- Explorer-style address bar, search, navigation tree, and folder list
- Preserves the selected directory until the first prompt is submitted
- Does not create an empty session when a directory is selected
- No keyboard shortcut, command-palette entry, or slash command
- Handles spaces, Chinese characters, and other Unicode paths

## Requirements

- Windows 10 or Windows 11
- OpenCode V2
- Windows PowerShell 5.1 (included with Windows)

## Install

### npm (recommended)

Install the latest version from npm and add it to the global OpenCode configuration:

```powershell
opencode2 plugin add opencode-choose-directory
```

Restart `opencode2` after installation.

To install a specific version:

```powershell
opencode2 plugin add opencode-choose-directory@0.1.4
```

The package is available at [npmjs.com/package/opencode-choose-directory](https://www.npmjs.com/package/opencode-choose-directory).

### Manual configuration

You can also add the npm package directly to `~/.config/opencode/cli.json`:

```json
{
  "plugins": [
    "opencode-choose-directory@latest"
  ]
}
```

Preserve any existing entries in `plugins`, then restart `opencode2`.

### GitHub source installation

To run the plugin directly from source, clone the repository into your OpenCode configuration directory:

```powershell
git clone https://github.com/huahai0202/opencode-choose-directory.git `
  "$HOME\.config\opencode\plugins\opencode-choose-directory"
Set-Location "$HOME\.config\opencode\plugins\opencode-choose-directory"
npm install
```

Add the cloned TUI entrypoint to `~/.config/opencode/cli.json`. Replace `<USER>` with your Windows user name:

```json
{
  "plugins": [
    "file:///C:/Users/<USER>/.config/opencode/plugins/opencode-choose-directory/src/tui.tsx"
  ]
}
```

### Update and uninstall

Install the newest npm release:

```powershell
opencode2 plugin add opencode-choose-directory@latest
```

Remove the plugin from the global configuration:

```powershell
opencode2 plugin remove opencode-choose-directory
```

## How It Works

1. The plugin appends a button to the outer `prompt.footer` TUI slot so it stays at the far right.
2. The slot input supplies `sessionID`; the button renders only when it is absent.
3. Clicking the button launches hidden Windows PowerShell in STA mode.
4. PowerShell creates the native `IFileDialog` COM picker with `FOS_PICKFOLDERS`.
5. The selected path is returned as UTF-8 Base64 between fixed markers.
6. The plugin resolves the path through OpenCode and preloads the location-scoped agent/model catalogs.
7. The plugin restores focus to the home prompt after the native dialog closes.
8. OpenCode creates a session in that location when the first prompt is submitted.

## Development

```powershell
npm install
npm run typecheck
```

The main implementation is in `src/tui.tsx`. `src/index.ts` is the package entrypoint and declares that the package has a TUI plugin.

## Limitations

- Windows only. The plugin does not register a button on other platforms.
- The native folder picker resembles File Explorer but does not include the full Explorer tab bar or file-operation toolbar.
- The OpenCode V2 plugin API is beta and may require compatibility updates.

## License

MIT
