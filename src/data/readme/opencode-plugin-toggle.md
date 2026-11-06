# opencode-plugin-toggle

[![npm](https://img.shields.io/npm/v/opencode-plugin-toggle)](https://www.npmjs.com/package/opencode-plugin-toggle)
[![license](https://img.shields.io/npm/l/opencode-plugin-toggle)](LICENSE)

**Turn plugins on and off from the conversation, without editing `opencode.jsonc`.** Click the puzzle icon in the session header and every plugin gets a switch.

The app's own switch only manages a plugin's desktop UI. Server-side plugins — sandboxes, memory, notification hooks — have no UI, so they get no switch at all, and the only way to disable one is to add a `"-name"` entry to the config by hand. This gives them all a real switch, applied globally and hot-reloaded in about two seconds.

![The plugin and skill switcher](docs/popover.jpg)

## Install

```sh
opencode plugin add opencode-plugin-toggle
```

Click the puzzle icon at the right end of the session header.

## What you can do

- **Enable / disable any plugin**, including ones with no UI of their own. Disabled plugins stay in the list, greyed out, ready to switch back on.
- **See why a plugin failed** — the runtime error is shown under the name instead of a bare "failed" badge.
- **Insert a skill** into the prompt box: click a skill and `@skill-id` is appended and focused, so you never mistype an id.
- Each plugin shows its one-line description, taken from the OpenDock catalog.

## Requirements

- OpenCode desktop 2.2 or newer.

## How it works

- Disabling writes `"-<plugin-id>"` to the `plugins` array in your **global** config, at the end of the array — the order matters, a disabled entry placed before the package entry does not take effect. Re-enabling removes that line, leaving the rest of the file untouched, formatting and comments included.
- **The switch is global, not per-session.** Plugins load once per server process, and one process serves every session, so there is no per-conversation isolation to toggle.
- Disabling a plugin does not rewind what it already did in the current conversation; it stops participating from that moment. Start a new session for a clean slate.
- Skills are not toggled. Clicking one inserts its id into the message; the model loads the skill when it sees `@skill-id`.
- Config writes are validated before they land: the file is re-parsed and compared, and nothing is written if the result is not exactly the intended change.

## Development

```sh
npm install
npm run build     # bundles the GUI into dist/gui-experimental.cjs
```

Point `plugins` in `~/.config/opencode/opencode.jsonc` at this directory to load it from source.

## License

MIT
