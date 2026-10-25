# opencode-docview

Markdown doc viewer side panel for the OpenCode TUI, with line numbers and GitHub-style range copying.

Requires OpenCode 2.1 or later.

## Install

Add it to `~/.config/opencode/cli.json` and restart the TUI:

```json
{ "plugins": ["opencode-docview"] }
```

## Use

- `/doc path/to/file.md` or `/doc @file` opens a doc; `/doc` alone opens a picker.
- Click or drag the line numbers to copy a range like `#L3-L8`. Shift-click extends it.
- Frontmatter is dimmed and unnumbered, so L1 is the first line after it.
- The panel reloads when the file changes.

| Key | Action |
| --- | --- |
| `j` / `k`, `g` / `G` | Scroll, top / bottom |
| `s` | Rendered / source view |
| `y` / `esc` | Copy / clear selection |
| `o` / `r` | Open another doc / reload |
| `f` / `q` | Fullscreen / close |

`<leader> left` and `<leader> right` move focus between the prompt and the panel.

## Develop

```sh
npm install
npm run typecheck
npm test              # unit tests (vitest)
npm run test:render   # gutter layout against OpenTUI (bun)
npm run build
bun test/e2e/smoke.ts # real OpenCode TUI, needs opencode on PATH and a build
```

## License

Apache-2.0
