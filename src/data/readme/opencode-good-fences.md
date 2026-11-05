# opencode-good-fences

Not related to the good-fences TypeScript boundary tool.

An OpenCode TUI plugin that renders fenced code blocks in assistant replies as a **borderless box**: a subtle raised background, a muted language label in the top-left corner, and the syntax-highlighted code inside.

## Scope

- Styles only Markdown written by the assistant (reply text and compaction summaries). Tool output (bash, read, grep, and so on) is plain text and is never touched.
- Registers a renderer for every language OpenTUI can normalize (its extension and basename maps, currently ~70 keys) plus a few common aliases (`sh`, `shell`, `console`, `text`, ...). Language keys are normalized with `infoStringToFiletype` and deduplicated.
- Fences with no language tag, or with a language OpenTUI does not know, keep the default look: the Markdown code-block API routes strictly by resolved language and has no wildcard.

## Requirements

- OpenCode 2.x (V2) TUI. Uses `context.markdown.registerCodeBlockRenderer`.
- `@opentui/core` >= 0.8.0 (bundled with OpenCode 2.2.x). Uses `BoxRenderable`, `TextRenderable`, `extensionToFiletype`, `basenameToFiletype`, `infoStringToFiletype`.
- Tested with OpenCode 2.2.5.
- Not compatible with OpenCode 1.x (V1 plugin API).

## Install

Add the package to `~/.config/opencode/cli.json` (a package with only a TUI part goes in `cli.json`, not `opencode.json`):

```json
{
  "plugins": ["opencode-good-fences"]
}
```

Restart OpenCode. Check `/plugins` for load errors, then send a message with a fenced code block to see the result.

## Theming

Uses the active theme: `background.raised.base` for the block surface and `text.muted` for the language label. It works with any theme and was designed alongside the warm `opencode-warm-boot` palette.

## How it works

`setup(context)` registers one code-block renderer per known language through `context.markdown.registerCodeBlockRenderer`, wrapping the default renderable in a `BoxRenderable`. The returned cleanup unregisters every language.

## Uninstall

Remove the entry from `cli.json` and restart OpenCode.

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # smoke test against dist/ (renders a frame with @opentui/core testing)
```

## License

MIT
