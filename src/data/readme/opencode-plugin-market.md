# opencode-plugin-market

A plugin market inside the OpenCode desktop app. Browse the [OpenDock](https://www.opendock.net/zh/plugins/) catalog, search it, filter it, and install or remove plugins without leaving the app.

![Settings › Plugin Market](docs/settings.jpg)

## What it does

- **Settings › Plugin Market** — a page listing 2,700+ OpenCode plugins.
- Search across names, titles and descriptions.
- Filters that mirror OpenDock: category, maintenance health, OpenCode version (V1/V2), last commit, minimum stars.
- **Install** runs `opencode plugin add <name>`; **Uninstall** runs `opencode plugin remove <spec>`. Both wait until the server has actually loaded or dropped the plugin, so the list never shows a stale state.
- A plugin that installs but fails to load is reported with its error instead of silently appearing installed.

## Install

```sh
opencode plugin add opencode-plugin-market
```

Then open **Settings › Plugin Market**.

## Notes

- The catalog is fetched from `https://www.opendock.net/zh/plugins-index.json`, the same file the site uses, and cached for 12 hours. The refresh button in the page re-fetches it.
- Installing a plugin runs third-party code inside your OpenCode server, with your privileges. Nothing in this catalog is reviewed. The first install asks for confirmation.
- Read-only with respect to your configuration: it only calls the `opencode plugin` CLI, the same command you would type.

## Development

```sh
npm install
npm run build     # bundles the GUI into dist/gui-experimental.cjs
```

Point `plugins` in `~/.config/opencode/opencode.json` at this directory to load it from source.

## License

MIT
