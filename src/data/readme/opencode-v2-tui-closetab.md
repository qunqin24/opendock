# opencode-v2-tui-closetab

> ⚠️ **学习用途 / For learning purposes** — This project is for learning OpenCode V2 plugin development only. The APIs used are beta APIs and may change between versions. Do not use in production.

A TUI plugin for OpenCode V2 that adds a `/close` command to close session tabs. **For learning / demonstration purposes only.**

## Features

Type the slash command `/close` in the TUI. The following usages are supported:

| Usage | Description |
| --- | --- |
| `/close` | Close the currently active tab |
| `/close 3` | Close the 3rd tab |
| `/close 1,3,5-7` | Close multiple tabs by index/range (comma separated, `a-b` is a closed interval, whole input is bounds-checked) |
| `/close <keyword>` | Match by title; if exactly one match, close it directly |
| `/close <keyword>` (multiple matches) | A multi-select dialog pops up: all matches selected by default, `Space` toggles selection, the filter input disallows spaces (spaces are reserved for toggling), `Enter` confirms and closes, `Esc` cancels |

No confirmation dialogs — closing is immediate. Session content is **not** deleted; you can reopen the session later from the session list.

## Requirements

- OpenCode V2 (docs: <https://opencode.ai/v2/docs/build/plugins/cli>)
- Dependencies: `@opentui/core`, `@opentui/solid`, `solid-js` (see `peerDependencies` in `package.json`)

## Installation / Loading

> The plugin is not yet published to the npm registry, so install it directly from the GitHub repository.

Choose one of the following:

**1. Install from GitHub (recommended)**

Install with the CLI (it automatically adds the entry to the global `~/.config/opencode/opencode.json`):

```sh
opencode2 plugin add github:firefoxmmx2/opencode-tui-closetab
```

Or add the GitHub spec directly to the `plugins` array in the global `opencode.json` (or a project `opencode.json`):

```jsonc
{
  "plugins": ["github:firefoxmmx2/opencode-tui-closetab"]
}
```

Branches, tags, and commit hashes are supported for pinning, e.g. `github:firefoxmmx2/opencode-tui-closetab#main`. Update to the latest commit with `opencode2 plugin update`.

**2. Local development (no bundling)**

Put `src/tui.tsx` into the `plugins/tui/` directory of the global config directory and it will be auto-discovered:

```
<global-config>/plugins/tui/tui.tsx
```

## Project Structure

```
opencode-v2-tui-closetab/
├── package.json      # npm package metadata (exports exposes both ./ and ./tui entry points)
├── src/
│   ├── index.ts      # Main entry: declares the plugin id and marks tui: true
│   └── tui.tsx       # TUI entry: /close command implementation (incl. custom JSX multi-select dialog)
├── README.md
└── LICENSE           # MIT
```

- `src/index.ts`: main entry, marked `tui: true`, loaded by OpenCode to associate the TUI entry.
- `src/tui.tsx`: TUI-side implementation. Key points:
  - The keymap command must be registered inside the `render` callback of `ui.slot` (component context, which includes `Keymap.Provider`) — do not call `ctx.keymap.layer()` directly in `setup()`;
  - The multi-select dialog is rendered via `ctx.ui.dialog.show(() => JSX)` with a custom Solid component, and keyboard handling uses `useKeyboard` from `@opentui/solid`;
  - zh/en locales are auto-detected (`options.locale` or system `LANG`/`LC_ALL`).

## Disclaimer / Learning Notice

- This plugin is **for learning purposes only** — for learning OpenCode V2 plugin development. It is not an official project.
- The plugin APIs it depends on (`@opencode-ai/plugin`, `@opentui/*`) are all **beta APIs** and may break compatibility with future versions.
- Use at your own risk. Do not use in production.

## License

[MIT](./LICENSE)
