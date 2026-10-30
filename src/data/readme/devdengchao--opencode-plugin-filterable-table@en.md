# OpenCode Filterable Table

Filter Markdown tables in OpenCode Desktop sessions by column values.

<p align="center">
  <img src="https://raw.githubusercontent.com/DevDengChao/opencode-plugin-filterable-table/main/docs/preview.jpg" alt="Filtering a Markdown table in an OpenCode session" width="900">
</p>

<p align="center">
  <sub>After clearing the checkbox for task count 1, only three rows remain. The footer shows the current row count and a one-click reset.</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@devdengchao/opencode-plugin-filterable-table">
    <img alt="npm" src="https://img.shields.io/npm/v/@devdengchao/opencode-plugin-filterable-table">
  </a>
  <a href="https://github.com/DevDengChao/opencode-plugin-filterable-table/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/DevDengChao/opencode-plugin-filterable-table/actions/workflows/ci.yml/badge.svg">
  </a>
  <img alt="OpenCode Desktop" src="https://img.shields.io/badge/OpenCode%20Desktop-2.2.x-111">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

<p align="center">
  <a href="./README.md">简体中文</a> · <a href="./README.en.md"><strong>English</strong></a>
</p>

Markdown tables are common in OpenCode sessions. This plugin adds a funnel button to every table header. Open it, choose the values you want to keep, and only matching rows remain.

Filtering is display-only. It does not change the original Markdown or the stored session data.

## Features

- **Filter from the header**: no extra panel, no separate table tool
- **Multi-select**: keep several values from the same column
- **Search**: type to narrow long value lists
- **Select all / none / reset**: fast per-column controls
- **Combined filters**: columns combine with AND; values in one column combine with OR
- **Row count and reset**: a footer shows `Showing X of Y rows` and can clear the whole table
- **Empty values**: empty cells appear as `(empty)` and can be filtered like any other value
- **Themes and languages**: follows OpenCode's light/dark theme and Chinese/English UI
- **State retention**: filters are restored after message re-renders or timeline virtualization where possible
- **Command palette action**: clear every table filter at once

## Quick start

### Requirements

- OpenCode Desktop **2.2.x** (developed and tested with 2.2.1)
- No extra Node.js install is required when installing from npm
- Node.js **20.19+** and npm are required only when building from source
- OpenCode Desktop on Windows, macOS, or Linux

### Install from npm (recommended)

Package name:

```text
@devdengchao/opencode-plugin-filterable-table
```

Add the plugin to your global `~/.config/opencode/opencode.jsonc`. On Windows this is usually
`C:\Users\<name>\.config\opencode\opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-filterable-table"
  ]
}
```

Pin a version when needed:

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-filterable-table@0.1.1"
]
```

OpenCode installs and loads the package from npm. No clone or manual build is required.

If the GUI does not reload after saving, restart Desktop or check **Settings > Extensions > Plugins**
for `opencode-plugin-filterable-table`.

### Build from source (development)

```bash
git clone git@github.com:DevDengChao/opencode-plugin-filterable-table.git
cd opencode-plugin-filterable-table
npm ci
npm run build
```

The build output is `dist/gui.cjs`. Point the global config at the local directory:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///absolute/path/to/opencode-plugin-filterable-table"
  ]
}
```

On Windows, use a path such as `file:///E:/my/open-source/opencode-plugin-filterable-table`.

For development, enable debug logging:

```jsonc
{
  "plugins": [
    {
      "package": "@devdengchao/opencode-plugin-filterable-table",
      "options": {
        "debug": true
      }
    }
  ]
}
```

When debugging a local checkout, replace `package` with the `file:///...` directory.

## Usage

1. Open a session that contains a Markdown table.
2. Hover over a column header. A funnel button appears on the right.
3. Click it and select the values you want to keep. Rows update immediately.
4. Add more column filters if needed.
5. When a column has many values, a search box appears at the top.
6. Use the footer's **Clear all filters** action to restore the table.
7. You can also run **Clear all table filters** from the command palette.

Empty cells are labeled `(empty)`. Long values are truncated in the dropdown with the full text in a tooltip.

## Compatibility

- Verified with **OpenCode Desktop 2.2.1**
- Uses the Desktop GUI plugin API, which is still **experimental**
- Only enhances Markdown tables in the session timeline
- **TUI is not supported**. TUI plugins can register custom renderers for fenced code blocks only, not ordinary Markdown tables

> If OpenCode changes the Markdown table DOM, this plugin may need an update. The selectors are centralized in
> `src/table-filter.ts`.

## How it works

OpenCode Desktop renders Markdown tables with a wrapper like:

```html
<div data-component="markdown-table">
  <table>...</table>
</div>
```

The plugin observes the session timeline container `[data-slot="session-timeline-scroll"]` with a
`MutationObserver`, injects filter buttons into `<th>` cells, and renders a fixed-position popover on
`document.body` so the table's `overflow-x: auto` wrapper cannot clip it.

Filters are stored by session message part, so they can be restored when a table re-renders or the timeline
virtually unmounts and remounts a message. The plugin only changes display state; it never writes to session content.

## Development

```bash
npm run demo       # standalone browser demo at http://localhost:5173
npm run typecheck  # TypeScript type check
npm run test       # jsdom unit tests
npm run build      # build dist/gui.cjs
npm run dev        # watch build; Desktop reloads the GUI part automatically
```

Point the global `plugins` entry at this directory for local development. After changing source files, run
`npm run build` or keep `npm run dev` running.

### Layout

```text
src/
├─ index.ts          # server entry: plugin id and load log
├─ gui.ts            # GUI entry: styles, command, table enhancement
├─ table-filter.ts   # table discovery, state, filtering, MutationObserver
├─ popover.ts        # header dropdown DOM and interactions
├─ labels.ts         # Chinese/English copy
└─ styles.css        # OpenCode theme-based styles
demo/                # standalone demo page
tests/               # jsdom tests
```

## FAQ

### No funnel icon appears

Check the following:

1. You are running OpenCode Desktop 2.2.x.
2. The plugin is enabled under **Settings > Extensions > Plugins**.
3. The table is in the session timeline, not in Settings, the sidebar, or a regular web page.
4. For a local checkout, `dist/gui.cjs` exists and `npm run build` has completed; for an npm install, the package installed successfully.
5. With `debug: true`, the Desktop renderer log contains `[filterable-table]` output.

### Changes do not show up

Run `npm run build`, or keep `npm run dev` running. Desktop watches `dist/gui.cjs`, not the files under `src/`.

### Does filtering modify the Markdown?

No. It only hides rows in the current view. It does not change Markdown, the database, or other clients.

### Does it work in the TUI?

No. The TUI has no plugin extension point for interactive table headers.

## Limitations

- Only session timeline tables are enhanced. Tables in Settings and sidebars are not.
- Filtering is visual; hidden rows are normally excluded from copied selections.
- Values are matched by visible cell text. A cell containing multiple values is treated as one value.
- Filter state lives in memory and is cleared when the plugin reloads or Desktop restarts.
- The implementation depends on OpenCode Desktop's current DOM structure and may need updates after upgrades.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development and review guidelines.

- [Issues](https://github.com/DevDengChao/opencode-plugin-filterable-table/issues)
- [npm package](https://www.npmjs.com/package/@devdengchao/opencode-plugin-filterable-table)
- [Changelog](./CHANGELOG.md)
- [中文 README](./README.md)

## License

[MIT](./LICENSE) © 2026 DevDengChao

If this plugin helps you, consider giving the repository a star.
