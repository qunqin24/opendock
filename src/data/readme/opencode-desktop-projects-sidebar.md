# Projects Sidebar for OpenCode Desktop

[![CI](https://github.com/bocukom/opencode-desktop-projects-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/bocukom/opencode-desktop-projects-sidebar/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-desktop-projects-sidebar?label=npm)](https://www.npmjs.com/package/opencode-desktop-projects-sidebar)

Project-grouped chat history, nested forks, and activity indicators for **OpenCode Desktop**. Inspired by the project sidebar in Claude Desktop; this is an independent, unofficial plugin.

The plugin adds a fourth **Projects / Experimental** card to Preferences and replaces the Inbox list with project groups, while keeping OpenCode's native sidebar shell, header controls, search, resizing, and session actions.

> **Status: experimental beta.** The GUI plugin API is experimental, and this plugin uses an explicitly unsupported DOM adapter for the sidebar. Compatible Desktop updates are expected to keep working, but a major UI change can require a plugin update. On failure, the plugin reveals the standard Inbox instead of leaving a broken sidebar.

## Features

- Chats grouped by project, with worktrees and subdirectories kept under their project.
- Nested forks shown under their source chat, each still an independent native session.
- **In Progress** and **Unread** activity with popup navigation, including pending approvals and questions.
- Native per-chat menu: rename, fork, close, and delete.
- Project **plus** for a new draft in the exact server and directory, with empty-draft reuse.
- Persistent sidebar width, collapsed groups, and collapsed fork branches.
- Full keyboard support, RTL, reduced motion, and forced-colors handling.
- Automatic recovery to the standard Inbox if the host structure is incompatible.

## Requirements

- OpenCode Desktop **2.2.5–2.2.7** (verified).
- The plugin is configured in the global `opencode.jsonc`; Desktop reads GUI plugins from the global configuration.

## Install

Add the package to the `plugins` array in `~/.config/opencode/opencode.jsonc`, keeping any existing entries:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "opencode-desktop-projects-sidebar@beta"
  ]
}
```

The `beta` tag follows the newest prerelease. Pin an exact version such as `opencode-desktop-projects-sidebar@0.1.0-beta.2` if you need reproducible installs.

Then open **Preferences** and select **Projects / Experimental**. The native layout remains Inbox; the plugin stores its own enabled preference.

No build step is required for users: the package ships the prebuilt GUI bundle.

## Usage

- Select any original mode in Preferences, or run **Restore the standard sidebar** from the command palette, to leave Projects.
- The gear at the footer opens native General settings. When an update is available, the native update button sits next to it.
- **In Progress** covers running work and pending approvals or questions. **Unread** covers completed answers you have not viewed.
- Hover a project to reveal its **plus**; it opens or resumes an empty draft in that project.

## Known limitations

- **Cold start:** Desktop paints the saved native Inbox before plugin setup runs, so a brief Inbox flash can appear on a cold launch. The plugin cannot hide frames painted before it starts; a fully seamless launch needs Desktop support.
- **Experimental host integration:** the sidebar adapter depends on Inbox selectors and native mode radios. There is no public left-sidebar or interface-mode API.
- **Activity counts** cover loaded history, not total server history.
- **Width tracking** applies while Projects is active; resizing while Projects is disabled is not recorded.
- Verified on Linux. Windows and macOS have not been separately validated.

See [compatibility](docs/compatibility.md) for failure handling and host ownership, and [behavior](docs/behavior.md) for the detailed interaction contract.

## Disable and remove

- Turn off **opencode-desktop-projects-sidebar** under **Settings → Extensions → Plugins** to unload it. Cleanup restores native styling and spacing.
- To remove it completely, delete its entry from `plugins` in the global `opencode.jsonc`, or run `opencode plugin remove opencode-desktop-projects-sidebar`.

The plugin does not patch application files. It stores preferences in OpenCode's plugin storage and never stores prompt content or session transcripts.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

The test suite uses DOM fixtures and does not touch real sessions. Live Desktop diagnostics are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
