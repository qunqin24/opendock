# opencode-prompt-rail

An [OpenCode Desktop](https://opencode.ai) GUI plugin that keeps your recent
prompts visible while you work.

It adds two small widgets to the session screen:

- **Recent prompt rail** — a slim vertical rail pinned to the left edge of the
  chat column. Each line is one of your last 10 prompts, oldest at the top and
  newest at the bottom. Hover a line to read the full message, click it to copy
  the text. The newest prompt is drawn as a thicker accent-colored line.
- **Last prompt bubble** — a floating pill in the session header showing the
  message you sent most recently. Hover it for the full text. On narrow windows
  it collapses to a small dot.

Both widgets only read your transcript. The plugin never edits messages, never
sends anything anywhere, and has no network access of its own.

## What it looks like

![The recent prompt rail and the last prompt bubble in a session](assets/rail.png)

Hovering a rail line opens a preview card with the index, time, and full text:

![A hovered rail line showing its preview card](assets/rail-hover.png)

## Requirements

- **OpenCode Desktop.** GUI plugins are a desktop feature; the browser web UI and
  the terminal UI do not load them.
- An OpenCode release that ships the `@opencode/plugin` v2 GUI API. The plugin is
  built against `@opencode/plugin@2.2.6`.
- The GUI plugin API is still marked **experimental** upstream, so a future
  OpenCode release may require a plugin update.

## Install

A GUI plugin has to be listed in your **global** config,
`~/.config/opencode/opencode.json`, to appear in every window. Listing it only in
a project config is not enough.

### From npm

```sh
opencode plugin add opencode-prompt-rail
```

That installs the package and adds it to your global config. Older builds have no
`add` subcommand; there the same install is:

```sh
opencode plugin opencode-prompt-rail --global
```

Those older builds write the deprecated `plugin` key instead of `plugins`. If the
install succeeds but the widgets never appear, check your global config and move
the entry under `plugins`.

### From a clone

If the package install fails, a clone works without any package manager:

```sh
git clone https://github.com/Alan468767/opencode-prompt-rail.git
```

Then point your global config at the directory:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-prompt-rail"]
}
```

`dist/gui-experimental.cjs` is committed, so there is no build step.

> Installing straight from the repository —
> `opencode plugin add github:Alan468767/opencode-prompt-rail` — goes through
> npm's git preparation, which fails with `git dep preparation failed` on some
> builds. Use the npm package or a clone instead.

`opencode plugin add file:/path/to/plugin` is **not** supported — use a path in
`plugins` instead.

## Usage

| Action | Result |
| --- | --- |
| Hover a rail line | Show the full prompt, its index and time |
| Click a rail line | Copy that prompt to the clipboard |
| Hover the header bubble | Show the full text of your latest prompt |
| Command palette → **Toggle recent prompt rail** | Show or hide the rail |

The rail updates as you send new prompts. It also stays correct when you switch
between sessions.

## Configuration

Set the number of prompts kept in the rail with the `limit` option (default `10`,
allowed range `1`–`50`):

```jsonc
{
  "plugins": [
    { "package": "opencode-prompt-rail", "options": { "limit": 20 } }
  ]
}
```

## Development

```sh
npm install
npm run typecheck
npm run build      # writes dist/gui-experimental.cjs
npm run dev        # rebuild on every change
```

To iterate against a running desktop app, list the clone's directory in your
global `opencode.json` and run `npm run dev`. Every rebuild reloads the plugin's
GUI in every window; the server part does not restart.

`dist/` is committed on purpose so that git-based installs work. Always run
`npm run build` before committing a source change — CI fails when `dist/` is out
of date with `src/`.

## Troubleshooting

**Nothing appears.** GUI plugins only load in OpenCode Desktop, and only when
listed in the global `opencode.json`. Check **Settings → Extensions → Plugins**;
a plugin that failed to load is listed there as not loaded.

**The CLI said it installed, but nothing appears.** An older CLI writes the
deprecated `plugin` key. Move that entry into `plugins`
([see above](#with-the-cli)).

**An install from GitHub fails with "does not expose plugin entrypoints".** The
package declares its server part as `exports["./server"]` since 0.1.8. Clear the
plugin cache (`~/.cache/opencode/packages/`) and install again.

**An install from GitHub fails with "git dep preparation failed".** The CLI clones
the repository and then prepares it with npm. Install the npm package instead,
`opencode plugin add opencode-prompt-rail`, or clone the repository and point
`plugins` at the directory — the bundled `dist/` needs no build.

**The rail shows the wrong size or position.** The rail measures the chat column
at runtime. Resize the window once, or reopen the session, to force a re-measure.

**The bubble is missing.** It only renders when the active session has at least
one user message.

## License

[MIT](LICENSE)
