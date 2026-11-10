# opencode-plugin-market

[![npm](https://img.shields.io/npm/v/opencode-plugin-market)](https://www.npmjs.com/package/opencode-plugin-market)
[![license](https://img.shields.io/npm/l/opencode-plugin-market)](LICENSE)

**A plugin marketplace inside the OpenCode desktop app.** Browse 2,900+ plugins, search them, filter them, and install or remove them without leaving the app or editing a config file.

The desktop app can list what you already have, but there is no way to *discover* plugins: no catalog, no search, no install button. This adds that page under **Settings › Plugin Market**.

![Settings › Plugin Market](docs/settings.jpg)

## Install

```sh
opencode plugin add opencode-plugin-market
```

Open **Settings › Plugin Market**. The catalog loads on first open and is cached for 12 hours.

## What you can do

- **Search** across package names, titles and descriptions of the whole OpenDock catalog.
- **Filter** the way the site does: category, maintenance health, OpenCode version (V1/V2), last commit, minimum stars.
- **Install** runs `opencode plugin add <name>`; **Uninstall** runs `opencode plugin remove <spec>`.
- The page waits until the server has actually loaded or dropped the plugin, so it never shows a stale state.
- A plugin that installs but fails to load is reported with its error instead of silently appearing installed — the usual failure is a V1 plugin that only exports named symbols instead of a default plugin definition.

## Requirements

- OpenCode desktop 2.2 or newer.
- Network access to `www.opendock.net` for the catalog.

## Notes

- The catalog comes from `https://www.opendock.net/zh/plugins-index.json` — the same file the site itself uses. The refresh button re-fetches it immediately.
- **Installing a plugin runs third-party code inside your OpenCode server, with your privileges.** Nothing in this catalog is reviewed. The first install asks for confirmation and remembers the answer.
- The plugin only calls the `opencode plugin` CLI, exactly the command you would type. It does not rewrite your configuration by itself.
- V1 plugins are tagged in the list. They will fail to load on OpenCode 2 — the tag is a warning, not a filter.

## Development

```sh
npm install
npm run build     # bundles the GUI into dist/gui-experimental.cjs
```

Point `plugins` in `~/.config/opencode/opencode.jsonc` at this directory to load it from source.

## License

MIT
