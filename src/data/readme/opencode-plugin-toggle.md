# opencode-plugin-toggle

A button in the OpenCode desktop session header that shows what is installed and lets you turn plugins on and off. Skills are listed too — clicking one inserts `@skill-id` into the prompt.

![The plugin and skill switcher](docs/popover.jpg)

## What it does

- **Plugins** — one row per plugin in your global config, with a one-line description taken from the OpenDock catalog, and a switch. Turning one off appends `"-<plugin-id>"` to the `plugins` array; turning it back on removes that line. No restart: the server reloads in about a second.
- Off plugins stay in the list, greyed out, so you can turn them back on without hunting for the package name.
- A plugin that failed to load shows its error rather than disappearing.
- **Skills** — click a row to insert `@<skill-id>` into the prompt. Skills are loaded by the agent, so the insert is a mention, not a call.

## Install

```sh
opencode plugin add opencode-plugin-toggle
```

Then click the puzzle icon at the right end of the session header.

## How the toggling works

OpenCode disables a package plugin when the global `plugins` array contains `"-<plugin-id>"` **after** the package entry. This plugin appends the line at the end for that reason, and removes it cleanly when re-enabled. The config file is parsed before and after every write and the change is rejected unless it matches exactly, with the previous file kept as `opencode.json*.toggle-backup`.

## Limitations

- Global config only. The desktop app has no per-project plugin toggle.
- Plugin-contributed skills cannot be switched off one by one; turn off the whole plugin instead.

## Development

```sh
npm install
npm run build     # bundles the GUI into dist/gui-experimental.cjs
```

## License

MIT
