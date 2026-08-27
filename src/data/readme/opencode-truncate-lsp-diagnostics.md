# opencode-truncate-lsp-diagnostics

An [OpenCode](https://opencode.ai) plugin that trims the LSP diagnostics block
that `write`, `edit`, and `apply_patch` append after every edit.

## Why this exists

After each edit, OpenCode's edit tools append the current LSP errors to the
tool output. In a project with many outstanding errors this block is large, and
most of it is residual errors the model already knows about and did not
introduce.

OpenCode's own TUI, and most frontends, already collapse or fold long tool
output themselves. This plugin is for the ones that do not — for example Zed,
which renders tool output raw and leaves it expanded by default.

<img width="535" height="270" alt="image" src="https://github.com/user-attachments/assets/0df6cd9b-d840-4e1e-988c-938d3bb5f5e6" />


## What it does

1. **Session baseline** — diagnostics already reported in a previous round are
   filtered out, so the model only sees newly introduced errors.
2. **Cap + spill** — if the remaining new diagnostics still exceed a
   configurable count, only the first few are shown inline and the full list is
   written to a temp file the model is told to read.

## Limits

- The token savings are small. If all you want is to cut tool-output tokens,
  this plugin is probably not worth installing — tools like magic-context
  already truncate tool calls and do it more thoroughly.
- Hiding known diagnostics should give the model less noise, but this has not
  been benchmarked and the expected benefit is modest.

## Install

Add the plugin to your `opencode.json` (or `opencode.jsonc`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-truncate-lsp-diagnostics"]
}
```

Then restart OpenCode.

## Configuration

Pass options as a tuple:

```json
{
  "plugin": [
    [
      "opencode-truncate-lsp-diagnostics",
      { "cap": 3 }
    ]
  ]
}
```

| Option   | Type       | Default                            | Description                                                              |
| -------- | ---------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `cap`    | `number`   | `3`                                | Max *new* diagnostics to show inline. `0` spills every new diagnostic to a file. |
| `tools`  | `string[]` | `["write", "edit", "apply_patch"]` | Tool ids whose output is inspected.                                      |
| `tmpDir` | `string`   | OS temp dir                        | Directory where spill files are written.                                 |

## Example

First edit to a file with 5 pre-existing errors, with `cap: 2`:

```
Wrote file successfully.

LSP errors detected in this file, please fix:
<diagnostics file="/path/to/file.ts">
ERROR [171:32] 'Promise' only refers to a type...
ERROR [197:20] 'Promise' only refers to a type...
</diagnostics>
(3 additional new LSP diagnostics written to /tmp/opencode-lsp-diagnostics-<session>-<ts>.txt; read it for the full list)
```

Second edit, where the model fixed two errors but introduced one new one:

```
Edit applied successfully.

LSP errors detected in this file, please fix:
<diagnostics file="/path/to/file.ts">
ERROR [600:10] Cannot find name 'newSymbol'.
</diagnostics>
(3 previously-seen LSP diagnostics omitted)
```

## How it works

The plugin registers a `tool.execute.after` hook and rewrites `output.output`
in place. A module-level baseline counts each diagnostic identity (severity +
message) per file; the `[line:col]` location is ignored, so a diagnostic that
only shifted lines is still recognized as seen. A message whose count increases
from one round to the next has that many new occurrences.

> Note: the `tool.execute.after` hook returns `Promise<void>`, so the plugin
> mutates `output.output` rather than returning a new string. This relies on
> OpenCode passing the same output object through to the model — current
> behavior (verified against OpenCode 1.18.21), but not part of the documented
> contract.

## Development

```sh
bun install
bun run build    # compile to dist/
bun test         # run unit tests
```

## License

MIT
