# opencode-tab-move

Move the active OpenCode session tab left or right with keyboard shortcuts.

Requires OpenCode V2 with the `context.ui.tabs.move` plugin API.

## Install

Add the package to the `plugins` array in `~/.config/opencode/cli.json`, preserving any existing entries:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["opencode-tab-move@0.1.0"]
}
```

OpenCode installs the package automatically. Run `/reload` if needed.

## Usage

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+PageUp` | Move the active tab one position left |
| `Ctrl+Shift+PageDown` | Move the active tab one position right |

The commands also appear in the command palette as **Move session tab left**
and **Move session tab right**. They are available when session tabs are enabled.
Moving past the first or last tab does nothing.

## Local use

Point a `plugins` entry in `cli.json` at the absolute path of this repository
instead of the published package. Use forward slashes in Windows JSON paths.
Do not load both versions at once.

OpenCode loads `tui.ts` directly; no dependency installation or build step is required.

## Publishing

For the initial release:

```powershell
npm login
npm publish --dry-run
npm publish
git tag v0.1.0
git push origin v0.1.0
```

For subsequent releases, commit your changes first, then:

```powershell
npm version patch
npm publish --dry-run
npm publish
git push origin main --follow-tags
```

Update the pinned version in `cli.json` on each machine after publishing.
Use `npm version minor` for new features or `npm version major` for breaking changes.

## License

MIT
