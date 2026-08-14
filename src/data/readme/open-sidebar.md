# openSidebar
Sidebar customization plugin for OpenCode.

*NOT COMPLETE* - tested only on Windows 10 LTSC IoT. Linux/Mac planned but not guaranteed to work. PRs/forks welcome.

## Features

### Header buttons

**`> Switch Session`**

invokes the 'switch session' command

**`> model`**

brings up the 'select model' menu

**`> weight`**

toggle through weight options

**`Weekly usage`**

see your weekly usage and when it resets. not all platforms are currently supported


### Main sidebar menu

**`Scripts`**

Run/reference project scripts with the configured shell or language runner. Left-click to run, right-click to place the command in the configured WezTerm target without running it. Click `scripts` to configure runners, tracked extensions, and other settings.

Built with wezterm, pwsh and Windows in mind first, so un-tested issues may come up on other platforms


**`Files`**

Browse/copy files in-terminal. Click to change dir.

When launched with `oc <directory>`, a fresh session uses the project name. The
first duplicate gets a numeric suffix such as `openSidebar1`, followed by
`openSidebar2` as needed. Existing sessions are never renamed. The Files and
Scripts sections use the stored project directory automatically.

### Configuration

The sidebar shows MCP and LSP sections by default. To hide either section without
disabling its underlying service, create `%USERPROFILE%\.config\openSidebar\config.json`:

```json
{
  "showMcp": false,
  "showLsp": true
}
```

Project-specific overrides go in `.config\openSidebar.json` under the project. The
sidebar loads user settings first, then overlays project values when that file exists;
values missing from the project file continue to come from the user config. Use
`config.example.json` as a reference for the currently configurable settings.
`projectDirectory` sets the directory used by Files and Scripts independently of the
OpenCode session directory. Script pins, file-root history, favorite roots,
and per-session active roots are also stored there. OpenCode-owned settings such as
sessions, models, MCP services, LSP services, and authentication remain in OpenCode.
The initial `cd <directory>` prompt may be quoted by the terminal; openSidebar accepts
that form when locating the project's config.

## Install
1. Open `%USERPROFILE%\.config\opencode\tui.json`
2. Add:
```json
{ "plugin": ["open-sidebar"] }
```
3. Restart OpenCode.

## Screenshot

<img src=".res/scr/1.png" width="300">
