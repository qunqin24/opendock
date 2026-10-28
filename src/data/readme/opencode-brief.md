# opencode-brief

[![npm version](https://img.shields.io/npm/v/opencode-brief)](https://www.npmjs.com/package/opencode-brief) [![CI](https://github.com/mustafaerpek/opencode-brief/actions/workflows/ci.yml/badge.svg)](https://github.com/mustafaerpek/opencode-brief/actions/workflows/ci.yml) [![license](https://img.shields.io/npm/l/opencode-brief)](https://github.com/mustafaerpek/opencode-brief/blob/main/LICENSE)

Create a reviewable handoff brief from an OpenCode session.

Long OpenCode sessions collect useful evidence in tool calls, shell commands, and diffs. `opencode-brief` turns that evidence into one Markdown brief that you can paste into a pull request, save as `HANDOFF.md`, or use to start the next session.

The brief is deterministic. It does not call a model.

This is a community plugin, not an official OpenCode project. Source and issues: [github.com/mustafaerpek/opencode-brief](https://github.com/mustafaerpek/opencode-brief).

## Features

- Desktop panel with Generate, Copy, Save, and Insert.
- Terminal `/handoff` command and a scrollable Brief panel.
- Composer pill when the session moved past the cached brief.
- Cached briefs with a staleness check.
- English and Turkish headings. Quoted session text keeps its own language.
- No model calls and no external network requests.

## Install

Requires OpenCode 2.2 or later. The Desktop GUI API is experimental and can change between releases.

```sh
opencode plugin add opencode-brief
```

Or add the package to the global config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-brief"]
}
```

`opencode.json(c)` is global at `~/.config/opencode/opencode.jsonc`. The same entry loads the server part, the Desktop GUI, and the TUI.

Restart OpenCode Desktop after the install. A new CLI session loads the TUI part.

### Local development

```sh
bun install
bun run build
```

Point OpenCode at the package directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-brief"]
}
```

`bun run dev` rebuilds the GUI bundle on change. Each rebuild reloads the GUI in Desktop. The server part does not restart.

## Use

### Desktop

1. Open a session.
2. Run `Handoff: Open brief` from the command palette, or open the Brief tab from the side panel.
3. Generate the brief.
4. Copy it, save it, or insert it into the composer.

After a brief exists, a composer pill appears when the session changes again. It opens the Brief panel, where Regenerate replaces the cached brief. The pill does not appear before the first brief.

### Terminal

1. Run `/handoff` in a session, or from Home to pick one from the session list. The command palette entry is `Handoff: Open brief`.
2. The Brief panel opens with the generated Markdown. Scroll it with the mouse or the arrow keys.
3. Press `s` to save `HANDOFF.md`, `r` to regenerate, `f` to toggle full screen, and `esc` to close.

The terminal panel and the Desktop panel call the same server RPC and share the same cache.

## The brief

The brief contains:

- Header: session ID, directory, generation time, file count, command count.
- Request: the first and latest user request.
- What changed: working tree files with line counts and status.
- Commands: shell commands other than tests.
- Verification: test, typecheck, and lint commands with their exit status.
- Tool activity: tool names and call counts.
- Last assistant message.
- Open questions: TODOs in the diff and missing verification.
- Next steps.

The brief quotes session text. It is not a summary. Read it before sharing it.

## Language

Desktop follows the app locale. The TUI uses the `locale` plugin option, then the system locale, then English. Supported template locales are `en` and `tr`. Other locales fall back to English. Quoted session text, commands, and paths are not translated.

Set the TUI language in the plugin options:

```jsonc
{
  "plugins": [
    { "package": "opencode-brief", "options": { "locale": "tr" } }
  ]
}
```

The `locale` option affects the TUI brief. The Desktop brief follows the app language.

## Settings

The Desktop settings page controls whether the brief includes shell commands and verification. The TUI includes both by default.

## Privacy

The plugin does not call a model or an external service. It reads session messages, shell commands, tool activity, and the working diff through the OpenCode server, and renders Markdown locally. It makes no network requests beyond the OpenCode server's RPC and file APIs.

The brief can include user prompts, assistant text, file paths, shell commands, and TODO text. Review it before pasting it into a public pull request or an external service.

The last brief is cached in the plugin's server storage so the staleness check does not rebuild it. The cache holds the same session text as the brief and stays on the OpenCode server. The Desktop save action uses the system save dialog and writes only the file you choose. The TUI writes `HANDOFF.md` through the server's file API after you confirm the overwrite.

## Development

```sh
bun install
bun test
bun run typecheck
bun run build
```

`bun run dev` rebuilds the GUI bundle on change.

## Package layout

```text
src/
├── index.ts          server part, registers the RPC
├── rpc.ts            RPC contract shared by server, TUI, and GUI
├── brief/generate.ts deterministic brief builder
├── tui.tsx           ./tui entry, the /handoff command and Brief panel
├── gui.tsx           ./gui-experimental entry
└── gui/
    ├── definition.ts stores, i18n
    ├── window.tsx    command, panel, menu item, settings page, composer pill, styles
    ├── panel.tsx     the Brief panel
    ├── settings.tsx  settings rows
    ├── status.ts     cached brief status store and refresh
    └── styles.ts     panel CSS
```

The package exposes:

- `.` server part
- `./rpc` RPC contract
- `./tui` terminal UI
- `./gui-experimental` desktop GUI bundle

## Publishing

```sh
bun test
bun run typecheck
bun pm pack --dry-run
bun publish
```

`prepack` builds the GUI bundle before packing. The published package includes `dist/gui-experimental.cjs`, `src`, the README, and the MIT license.

## Troubleshooting

If `/handoff` does not appear after installing into an already running server, the server may hold plugin metadata from before the package exposed `./tui`. Restart the background service, or list the package in `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": [
    { "package": "opencode-brief", "options": { "locale": "tr" } }
  ]
}
```

## Links

- [npm package](https://www.npmjs.com/package/opencode-brief)
- [GitHub repository](https://github.com/mustafaerpek/opencode-brief)
- [Issues](https://github.com/mustafaerpek/opencode-brief/issues)
- [Changelog](https://github.com/mustafaerpek/opencode-brief/blob/main/CHANGELOG.md)

## Contributing

Issues and pull requests are welcome at [github.com/mustafaerpek/opencode-brief](https://github.com/mustafaerpek/opencode-brief).

## License

MIT
