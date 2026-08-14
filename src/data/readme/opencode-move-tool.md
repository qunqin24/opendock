# OpenCode Move Tool

[![CI](https://github.com/FRFlo/opencode-move-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/FRFlo/opencode-move-tool/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/opencode-move-tool)](https://www.npmjs.com/package/opencode-move-tool)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **`move`** — relocate complete code blocks inside an OpenCode worktree. Designed for agents that would otherwise copy code to a new location and then delete the original.

The tool is intentionally narrow: it moves text safely. It does **not** update imports, exports, references, formatting, or surrounding code semantics.

---

## Installation

Add `opencode-move-tool` to your OpenCode plugin configuration:

```json
// opencode.json or .opencode/opencode.json
{
  "plugin": ["opencode-move-tool"]
}
```

Or use the CLI:

```bash
opencode plugin opencode-move-tool
```

OpenCode installs plugins automatically on startup — no manual `npm install` required.

---

## Usage

### Required workflow

1. Read the source and destination files.
2. Call `move` with `dry_run=true`.
3. Review `preview.removed_text` and `preview.inserted_text`.
4. Re-run the same call with `dry_run=false`.
5. Update imports, exports, references, and formatting manually.
6. Run diagnostics/tests.

### Move lines to another file

```ts
move({
  source_file: "src/utils.ts",
  destination_file: "src/validation.ts",
  start_line: 42,
  end_line: 68,
  insert_mode: "append",
  dry_run: true,
})
```

### Insert before or after a destination line

```ts
move({
  source_file: "src/utils.ts",
  destination_file: "src/validation.ts",
  start_line: 42,
  end_line: 68,
  insert_mode: "before_line",
  insert_line: 12,
  dry_run: true,
})
```

`insert_line` is valid only with `insert_mode="before_line"` or `insert_mode="after_line"`.

### Reorder within the same file

```ts
move({
  source_file: "src/app.ts",
  destination_file: "src/app.ts",
  start_line: 120,
  end_line: 150,
  insert_mode: "after_line",
  insert_line: 45,
  dry_run: true,
})
```

Same-file `insert_line` uses the original file's line numbers. Inserting inside or adjacent to the moved range is rejected.

---

## Reference

### Arguments

| Argument | Type | Required | Description |
|---|---|---|---|
| `source_file` | `string` | Yes | Source file inside the current worktree. |
| `destination_file` | `string` | Yes | Destination file inside the current worktree. Created on apply if missing. |
| `start_line` | `number` | Yes | 1-based inclusive source start line. |
| `end_line` | `number` | No | 1-based inclusive source end line. Defaults to `start_line`. |
| `insert_mode` | `"append" \| "prepend" \| "after_line" \| "before_line"` | No | Destination placement. Defaults to `append`. |
| `insert_line` | `number` | For `after_line`/`before_line` | 1-based destination anchor line. |
| `adjust_indentation` | `boolean` | No | Defaults to `false`. Best-effort leading-whitespace adjustment. |
| `dry_run` | `boolean` | No | Defaults to `true`. Set `false` only after reviewing the preview. |

### Defaults and constraints

- `dry_run` defaults to `true`.
- `insert_mode` defaults to `append`.
- `adjust_indentation` defaults to `false`.
- Paths must stay inside the current worktree. Absolute paths are allowed only inside the worktree.
- Destination files may be created, but destination parents must resolve inside the worktree.
- Cross-file writes use best-effort rollback, not a true filesystem transaction.

### When not to use

- Do **not** use for partial-line edits.
- Do **not** use to update imports or references.
- Do **not** use when generating brand-new code.
- Do **not** skip reading the files first; the tool needs precise block boundaries.
- Do **not** apply (`dry_run=false`) until the dry-run preview is correct.

### Guarantees

- Rejects paths that escape the worktree, including symlink/junction escapes for existing files.
- Preserves CRLF/LF style and final-newline state for moved complete lines.
- Computes source and destination contents before writing.
- Uses backups and cleanup for best-effort rollback on write failure.
- Does not update code semantics.

---

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Run tests
bun test

# Build
bun run build
```

Requires [Bun](https://bun.sh) and Node.js >= 20.

---

## License

MIT
