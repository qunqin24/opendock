# pi-studio-opencode

OpenCode plug-in adaptation of the [pi](https://pi.dev/) extension [`pi-studio`](https://github.com/omaclaren/pi-studio).

It provides a local browser-based Studio workspace for [OpenCode](https://opencode.ai/), with an editor on the left and response/preview on the right.

If you use pi itself, use the original [`pi-studio`](https://github.com/omaclaren/pi-studio). This repo is for OpenCode.

## Status

Usable and actively improving.

The main goal is a good OpenCode version of Studio rather than full feature parity with `pi-studio`.

## Features

- Launch Studio with `/studio`
- Attach Studio to the current OpenCode session, or create one if needed
- Two-pane editor + response/preview workspace
- Run, queue steering, stop, and browse response history
- Raw response, rendered response preview, and editor preview
- Load and save local files
- Markdown / QMD / LaTeX preview with practical support for:
  - math fallback
  - Quarto-style callouts
  - preview page-break markers
  - local PDF figure preview via `pdf.js`
- PDF export of the right-pane preview via `pandoc` + `xelatex`
- Theme-aware Studio UI based on the active OpenCode theme
- Footer/status info, pane focus controls, and response highlighting inspired by `pi-studio`

## Install

Recommended:

```bash
npx pi-studio-opencode@latest install
```

That configures OpenCode globally, so `/studio` is available in all your OpenCode projects.

If you only want `/studio` in the OpenCode project you are currently in:

```bash
npx pi-studio-opencode@latest install --project
```

If you use Bun instead of npm:

```bash
bunx pi-studio-opencode@latest install
bunx pi-studio-opencode@latest install --project
```

Optional: if you want `pi-studio-opencode` available as a normal shell command:

```bash
npm install -g pi-studio-opencode
pi-studio-opencode install
```

Then fully restart OpenCode and run:

```text
/studio
```

The install step updates both OpenCode config files for you:

- `opencode.json` for the server plugin
- `tui.json` for the TUI plugin

## Manual config

If you prefer to edit config yourself, add this to either:

- `.opencode/opencode.jsonc` and `.opencode/tui.json`
- `~/.config/opencode/opencode.json` and `~/.config/opencode/tui.json`
- `~/.config/opencode/opencode.jsonc` and `~/.config/opencode/tui.jsonc`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["pi-studio-opencode@latest"]
}
```

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["pi-studio-opencode@latest"]
}
```

## Notes

- `/studio` opens a browser-based Studio attached to the current OpenCode session, or creates one if needed.
- `/studio` is a built-in slash action provided by the TUI plug-in; it will not appear unless the plug-in is also present in `tui.json`.
- If `/studio` gets sent to the model as ordinary text, the plug-in probably did not load, or you still have a stale `command.studio` entry from an older install. Rebuild or reinstall the package, remove that legacy command entry if needed, then fully restart OpenCode.
- After updating the plug-in, open a fresh Studio browser tab rather than reusing an older one.
- Advanced launcher flags are best used with the standalone CLI or `PI_STUDIO_OPENCODE_LAUNCH_ARGS`.
- `--base-url`, `--session`, and `--directory` are taken from the active OpenCode session during `/studio`.
- The Studio UI is external to OpenCode; it is not an embedded pane.
- Preview and PDF quality depend on local tooling:
  - `pandoc` for preview/PDF workflows
  - `xelatex` for PDF export

## Standalone launcher

You can also launch the browser surface directly:

```bash
pi-studio-opencode --directory "/path/to/project"
```

or:

```bash
npx pi-studio-opencode --directory "/path/to/project"
```

To attach manually to an existing OpenCode server/session:

```bash
pi-studio-opencode --base-url "http://127.0.0.1:4096" --session "<session-id>" --directory "/path/to/project"
```
