# @s1lent1um/opencode-auto-mode-plugin

An [opencode](https://opencode.ai) TUI plugin that gives the built-in **auto-approve permissions** toggle:

- a **hotkey** (default `<leader>p`, i.e. `ctrl+x` then `p`), and
- an eye-catching **indicator** in the prompt's meta row (home and session screens).

opencode itself already prints a small muted `auto` next to the agent name while auto-approve is on.
The plugin adds a bold dot in the theme's warning colour (orange in most themes) on the right, and
nothing while off:

```
┃  Build · Claude Opus Anthropic                       ← off
┃  Build auto · Claude Opus Anthropic               ●  ← on
```

It reuses opencode's own `permission.mode` command, so the hotkey, the command palette entry
("Enable/Disable auto-approve permissions") and `opencode --auto` / `--yolo` all stay in sync.
The palette entry also shows the hotkey once the plugin is loaded.

Requires opencode `>=1.18.0 <2` (tested on 1.18.32).

## Install

```sh
opencode plugin @s1lent1um/opencode-auto-mode-plugin -g
```

or add it manually to `~/.config/opencode/tui.json` (global) or a project `tui.json` / `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["@s1lent1um/opencode-auto-mode-plugin", { "keybind": "<leader>p" }]]
}
```

Note: TUI plugins go in `tui.json`, not `opencode.json`.

## Options

| Option     | Type                          | Default            | Description                                                          |
| ---------- | ----------------------------- | ------------------ | -------------------------------------------------------------------- |
| `keybind`  | `string \| string[] \| false` | `"<leader>p"`      | Key(s) that toggle auto-approve. `false` / `"none"` disables hotkey. |
| `labelOn`  | `string`                      | `"●"`              | Indicator text while auto-approve is on (bold, theme warning colour). |
| `labelOff` | `string`                      | `"approve: ask"`   | Indicator text while auto-approve is off (muted), if `showOff`.      |
| `showOff`  | `boolean`                     | `false`            | Also show `labelOff` while off. By default nothing shows while off.  |

For a louder indicator, e.g. `{ "labelOn": "● AUTO-APPROVE", "showOff": true }`.

Key syntax is opencode's keybind syntax (`<leader>x`, `ctrl+y`, `ctrl+shift+a`, …); `<leader>` is
`keybinds.leader` from your `tui.json` (default `ctrl+x`). Several keys are fine, e.g.
`{ "keybind": ["<leader>p", "ctrl+y"] }` (`ctrl+y` is unbound in opencode 1.18).

### Alternative hotkey: `<leader>y`

`<leader>y` ("yolo") is a nice mnemonic but in opencode 1.18 it is already bound to **Copy message**
(`messages_copy`). To use it, move Copy message elsewhere:

```json
{
  "keybinds": { "messages_copy": "none" },
  "plugin": [["@s1lent1um/opencode-auto-mode-plugin", { "keybind": "<leader>y" }]]
}
```

## How auto-approve behaves (opencode, not this plugin)

- It answers permission prompts for rules set to `ask` with "allow once". Rules set to `deny` are still denied.
- It is client-side and in-memory: it applies to the whole TUI process and resets on restart
  (start with `opencode --auto` to begin enabled).
- Prompts already pending when you switch it on are not auto-approved.

## How it works / limitations

opencode does not expose the auto-approve state to plugins. The plugin binds the key(s) to the
built-in `permission.mode` command and derives the state from that command's title
("**Disable** auto-approve permissions" ⇒ on), refreshing on every keymap `state` event. If a future
opencode changes that command, the indicator hides itself (and logs one warning) rather than
showing a wrong state; the hotkey keeps working as long as the command name exists.

Upstream improvements that would make this plugin unnecessary: a `permission_mode` keybind in
opencode's `keybinds` config, and exposing the permission mode to the plugin API.

## Development

Requires Node.js ≥ 22.18 (native TypeScript) for tests.

```sh
npm install
npm run build     # src/ → dist/ (Babel + babel-preset-solid, same setup opencode uses)
npm test          # node --test: helpers + build output checks
npm run typecheck # tsc --noEmit
```

To try local changes, point a `tui.json` at the source file (absolute path or relative to that `tui.json`):

```json
{ "plugin": [["/path/to/opencode-auto-mode-plugin/src/tui.tsx", {}]] }
```

opencode compiles local `.tsx` plugins at load time, so no build is needed for this. Restart opencode to reload.

**Why the npm package ships `dist/`:** opencode's runtime Solid JSX transform skips files under
`node_modules`, so an installed package must contain compiled JS. `exports["./tui"]` points at
`dist/tui.js`; `prepack` runs the build automatically. (0.1.0 shipped raw `.tsx` and silently
failed to load when installed from npm.)

Layout:

- `src/tui.tsx`: plugin entry (keymap layer + prompt slots), compiled to `dist/tui.js`.
- `src/state.ts`: pure helpers (state detection, option normalisation, bindings, labels).
- `scripts/build.mjs`: build script.
- `test/`: unit tests and build-output checks.

## Publishing

```sh
npm version patch   # or minor / major
npm publish         # prepack builds dist/, prepublishOnly runs typecheck + tests
```

To check a release before publishing, unpack `npm pack` output into a directory **under a
`node_modules` path** and point `tui.json` at it: that reproduces how opencode loads npm plugins.

## License

MIT
