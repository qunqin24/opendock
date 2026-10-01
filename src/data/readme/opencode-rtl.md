# opencode-rtl

Comprehensive right-to-left language support for opencode. The plugin improves mixed RTL/LTR conversations in terminal sessions while preserving code, commands, file paths, logs, and other technical text.

Requires **opencode 2.x**. On opencode 1.x, stay on `opencode-rtl@0.1`.

## Features

- Adds model guidance for Arabic, Persian, Hebrew, Urdu, Pashto, Sindhi, Yiddish, Divehi, Uyghur, and Kurdish workflows.
- Detects RTL text with Unicode script ranges and language-specific hints.
- Wraps RTL prose with Unicode bidirectional isolates so nearby LTR tokens stay readable.
- Optionally hard-wraps and pads RTL paragraphs so wrapped lines remain visually right-aligned in opencode's TUI.
- Leaves fenced code blocks and indented code untouched.
- Optionally normalizes Arabic-Indic, Eastern Arabic, or Latin digits.
- Exposes CLI commands for plugin status and RTL detection checks.
- Exports reusable text utilities for custom opencode plugins.

## Install

```sh
opencode plugin add opencode-rtl
```

Or add it to `opencode.json` / `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-rtl"]
}
```

### With options

opencode 2 takes plugin options through the object form of a `plugins` entry.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-rtl",
      "options": {
        "language": "auto",
        "systemGuidance": true,
        "isolateUserMessages": "auto",
        "isolateAssistantText": "auto",
        "isolateToolOutput": "off",
        "digitMode": "preserve",
        "alignRtlParagraphs": false,
        "rtlWrapColumn": 96,
        "rtlAlignColumn": 96
      }
    }
  ]
}
```

### From a checkout

Point a `plugins` entry at the directory. Relative paths resolve from the config file that contains the entry, and absolute paths work too:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "/absolute/path/to/opencode-rtl", "options": { "language": "auto", "notifyOnStart": true } }
  ]
}
```

Run `npm run build` after changing plugin sources.

The root `index.js` and `tui.js` are two-line re-exports of `dist/`, and both have to stay. When opencode loads a plugin from a directory it looks for those two filenames at the package root and ignores `main` and `exports`, so a package that only points `exports` into `dist/` is skipped with nothing in the log. Packages installed from npm resolve through `exports` as usual and do not need them.

This repository's own `opencode.json` already does this, so opencode loads the plugin when started from the checkout.

To confirm opencode sees the plugin, ask the running server:

```sh
opencode api plugin.list
```

Look for `"id":"opencode-rtl"` with `"features":{"server":true,"tui":true}` and `"status":"active"`. Note that `opencode plugin list` only lists packages installed through `opencode plugin add`, not config entries.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enables all plugin behavior. |
| `language` | `"auto" \| "none" \| RTL language code` | `"auto"` | Auto-detects or forces the RTL language context. |
| `systemGuidance` | `boolean \| string` | `true` | Adds built-in guidance or a custom system prompt. |
| `isolateUserMessages` | `"off" \| "auto" \| "always" \| boolean` | `"auto"` | Applies Unicode bidi isolation to user text. |
| `isolateAssistantText` | `"off" \| "auto" \| "always" \| boolean` | `"auto"` | Applies Unicode bidi isolation to generated assistant text. |
| `isolateToolOutput` | `"off" \| "auto" \| "always" \| boolean` | `"off"` | Applies isolation to tool output. Keep off if exact copy/paste matters. |
| `minRtlRatio` | `number` | `0.2` | Minimum RTL character ratio for automatic RTL detection. |
| `minRtlCharacters` | `number` | `2` | Minimum RTL characters needed for automatic detection. |
| `digitMode` | `"preserve" \| "latin" \| "arabic-indic" \| "eastern-arabic"` | `"preserve"` | Optional digit conversion outside code blocks. |
| `forceDirection` | `"auto" \| "rtl" \| "ltr"` | `"auto"` | Forces bidi isolate direction when automatic detection is not enough. |
| `alignRtlParagraphs` | `boolean` | `false` | Terminal-only hard-wrap/padding workaround. This is not the RTL detection switch. |
| `rtlWrapColumn` | `number` | `96` | Maximum visual width before the plugin inserts real line breaks. |
| `rtlAlignColumn` | `number` | `96` | Visual column used for right padding. Match this to your opencode message width. |
| `wrapRtlMarkdown` | `"off" \| "auto" \| "always"` | `"off"` | Experimental output-only Markdown wrapper for renderers that honor inline HTML. Keep off for normal use. |
| `directionEnv` | `boolean` | `true` | Exposes RTL settings to shell tools through `OPENCODE_RTL_*` env vars. |
| `includeLanguageHint` | `boolean` | `true` | Adds an explicit language-context line to the system guidance. |
| `notifyOnStart` | `boolean` | `false` | Shows a toast when the plugin loads. Useful for setup checks. |
| `debug` | `boolean` | `false` | Writes plugin initialization details to the opencode log. |

Supported language codes: `ar`, `fa`, `he`, `ur`, `ps`, `sd`, `yi`, `dv`, `ug`, `ku`.

## CLI Commands

Open the command palette, or type the slash command in the prompt:

- `RTL: Show Status` / `/rtl-status` to display active options.
- `RTL: Analyze Sample` / `/rtl-sample` to verify direction and language detection.

## Direction Detection

The plugin treats mixed text as RTL when at least `minRtlCharacters` RTL characters are present and the RTL ratio is at least `minRtlRatio`. With the default `minRtlRatio: 0.2`, a paragraph that is mostly Persian with some English identifiers, paths, or package names is still handled as RTL.

```json
{
  "minRtlRatio": 0.2,
  "minRtlCharacters": 2,
  "forceDirection": "auto"
}
```

Use `forceDirection: "rtl"` only if you want every formatted assistant/user text segment to be treated as RTL regardless of detected content.

## Markdown Wrapping

Renderers that honor inline HTML can be given an explicit direction instead of relying on bidi controls. Set `wrapRtlMarkdown: "auto"` to wrap each detected RTL output paragraph:

```html
<div dir="rtl" align="right">

RTL block only

</div>
```

LTR paragraphs and fenced code blocks are left unchanged. This is off by default because inline HTML wrappers interact poorly with some Markdown renderers, and it is never applied to text sent to a model.

## Terminal Alignment

opencode's terminal UI can render soft-wrapped RTL text with correct paragraph direction but left alignment on continuation lines. Enable `alignRtlParagraphs` only for terminal output, because it inserts real line breaks and padding spaces into assistant text.

```json
{
  "alignRtlParagraphs": true,
  "rtlWrapColumn": 96,
  "rtlAlignColumn": 96
}
```

Tune `rtlAlignColumn` to the visible message width in your terminal. If the padded lines start too far left, increase it; if they overflow or wrap again, decrease it.

## Troubleshooting

If it looks like nothing changed:

- Confirm the plugin is loaded with `opencode plugin list`.
- Look for the `RTL support loaded` toast on startup when `notifyOnStart` or `debug` is enabled.
- If automatic detection is too subtle, set `forceDirection` to `"rtl"` and `isolateAssistantText` to `"always"`.
- If RTL continuation lines appear left-aligned, enable `alignRtlParagraphs` and tune `rtlAlignColumn` for your terminal width.
- If assistant text is not isolated at all, your provider may stream over a protocol this plugin does not rewrite — see [How It Works](#how-it-works).
- If you mean the prompt cursor/input direction, that is controlled by opencode's terminal UI and your terminal, not by a plugin hook.

## How It Works

opencode plugins cannot replace the terminal renderer or the host terminal font. This plugin uses the opencode 2 plugin API to improve RTL behavior safely:

| Surface | Hook |
| --- | --- |
| RTL-aware response instructions | `session.hook("context")`, pushed onto `event.system` |
| User prompts, as stored and displayed | `session.hook("prompt")` |
| User turns sent to the model | `session.hook("context")`, over `event.messages` |
| Assistant prose | `session.hook("http.response")` — see below |
| Tool output, when enabled | `tool.hook("execute.after")` |
| `OPENCODE_RTL*` shell variables | `shell.hook("create.before")` |

Text that already carries bidi isolates is left alone, so a message is never wrapped twice as it moves through admission, context assembly, and later turns.

The formatter skips fenced code blocks and indented code, because invisible bidi controls inside source code, shell commands, or logs can make copying unsafe.

### Assistant text on opencode 2

opencode 1 had `experimental.text.complete`, which handed the plugin the finished assistant text. opencode 2 removed it with no replacement, and there is no API to rewrite a stored message part. The only remaining point where a plugin can see assistant prose before opencode stores and renders it is the provider's own HTTP response, so `src/stream.ts` rewrites the assistant text deltas inside the provider's SSE stream.

What this means in practice:

- **Supported protocols**: Anthropic Messages, OpenAI Chat Completions, OpenAI Responses, and Gemini. Anything else — including providers that stream over a WebSocket — is forwarded byte-for-byte, so assistant text is simply left unformatted rather than corrupted.
- **Only the agent loop** is rewritten. Title generation, compaction summaries, and one-shot `generate` calls are untouched.
- **Output arrives in blocks.** Isolation has to see a complete Markdown block to classify it, so text is released at blank lines outside fenced code. Streamed output is byte-identical to what a single whole-message pass would produce; it just appears paragraph by paragraph instead of token by token.
- Set `isolateAssistantText: "off"` to disable this path entirely; the hook is then never registered.

## Development

```sh
npm install
npm run typecheck
npm test
```

## Package Entrypoints

- `opencode-rtl` — the plugin's default export, plus the reusable text utilities.
- `opencode-rtl/tui` — the CLI plugin, loaded automatically by opencode.
- `opencode-rtl/server` — the server plugin definition on its own.

## Limitations

- Terminal shaping, glyph fallback, cursor movement, and input method behavior still depend on your terminal emulator and font.
- The opencode prompt/input widget is not replaced by this plugin; terminal cursor movement for RTL typing still depends on the terminal UI and your terminal.
- Assistant text isolation depends on the provider's streaming protocol; see the list above.
- Unicode isolation improves display order but intentionally does not rewrite code, logs, paths, or command output by default.
- If exact text copy/paste is more important than visual ordering, set `isolateAssistantText` to `"off"`.
