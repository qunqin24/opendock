# opencode-colorful-timeline

[English](./README.md) | [简体中文](./README.zh-CN.md)

An OpenCode Desktop plugin that brings the TUI's colorful Markdown styling to
the GUI conversation timeline — via one scoped stylesheet.

## What it colors

Markdown in the conversation area gets the same `markdown-*` colors the TUI
renders with: headings, bold, italic, blockquotes, list markers, and inline
code. Every color is a `light-dark(<light>, <dark>)` pair that follows the
current appearance.

Deliberately muted variants are left untouched: reasoning parts, tool output,
and path inline code keep their own colors.

## Enable

Add the package to the global `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["@qthinker/opencode-colorful-timeline"],
}
```

Or install it directly:

```sh
opencode plugin add @qthinker/opencode-colorful-timeline
```

A rebuild reloads the GUI part in every window; the server part does not
exist, so nothing else restarts. Disable it in **Settings > Extensions >
Plugins** or by removing the entry.

## Develop locally

```bash
npm install
npm run build
```

The GUI bundle is written to `dist/gui-experimental.cjs`. To try a local
build, point the `plugins` entry at the absolute path of this repository
instead of the package name.

### Change the colors

Edit `src/tui-colors.css` and run `npm run watch`; each rebuild applies live.
Each pair is `light-dark(<light>, <dark>)`, matching the current appearance.

## License

[MIT](./LICENSE)
