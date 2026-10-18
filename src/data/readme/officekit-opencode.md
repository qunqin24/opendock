# officekit

Fast, single-binary document tools for AI coding agents. One **760 KB Rust binary**
speaks MCP over stdio — no Python, no Node, no Microsoft Office, no approvals
from anyone. Works with **OpenCode, Claude Code, and Codex**.

## What it does (v0.1 — PowerPoint)

| Tool | What |
|---|---|
| `pptx_create` | New 16:9 deck with all 11 standard PowerPoint layouts |
| `pptx_add_slide` | Add a slide by layout name (`Title Slide`, `Two Content`, …) |
| `pptx_set_text` | Fill placeholders / shapes: paragraphs, bullets, levels, bold, size, color, align |
| `pptx_add_image` | Insert png/jpg/gif; auto aspect-ratio and auto-fit-to-slide |
| `pptx_add_textbox` | Free-form text boxes anywhere |
| `pptx_duplicate_slide` | Clone a slide (text + images) |
| `pptx_delete_slide` | Remove a slide |
| `pptx_inspect` | Full structural dump: shapes, placeholders, positions, text |
| `pptx_extract_text` | Read all text from a deck |

Edits work on existing .pptx files created by PowerPoint, python-pptx, etc.
Every operation saves atomically (`tmp` + rename).

## Install

Prebuilt binaries for Linux (x64/arm64, gnu/musl), macOS (x64/arm64) and
Windows (x64): [GitHub Releases](https://github.com/ixode0/officekit/releases).

Or build from source (needs Rust):

```sh
cargo build --release
cp target/release/officekit ~/.local/bin/
```

## OpenCode (npm package)

Published as [`officekit-opencode`](https://www.npmjs.com/package/officekit-opencode).
One line in config — the package downloads the right binary for your platform
automatically (falls back to an `officekit` binary on PATH):

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["officekit-opencode"]
}
```

You get: the `officekit` MCP server, a `presentations` skill, and a `/deck`
command. Options via plugin config:

```jsonc
{ "plugins": [{ "package": "officekit-opencode",
                "options": { "command": "/usr/local/bin/officekit" } }] }
```

Or from a local checkout:

```jsonc
{ "plugins": ["/path/to/officekit/plugin/opencode"] }
```

Or skip the plugin and register the server directly:

```sh
opencode mcp add officekit --global -- officekit
```

## Claude Code

```sh
claude mcp add officekit -- officekit
```

## Codex

```sh
codex mcp add officekit -- officekit
```

## Layout

```
src/            Rust sources (MCP server + pptx core)
  xml.rs        minimal OOXML DOM
  imgdim.rs     PNG/JPEG/GIF dimension probing
  pptx.rs       package model + all operations
  tools.rs      MCP tool definitions & dispatch
  main.rs       stdio JSON-RPC loop
assets/         blank_16x9.pptx template (embedded into the binary)
plugin/opencode OpenCode plugin (TS) + presentations skill
```

## Roadmap

- docx (Word): paragraphs, tables, images, headers
- xlsx (Excel): cells, formulas, styles, charts
- pptx: tables, charts, shape styling, slide reordering, notes
- prebuilt binaries for linux/macOS/windows via GitHub releases

MIT licensed. Nobody's approval required.
