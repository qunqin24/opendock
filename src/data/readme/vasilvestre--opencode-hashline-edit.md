# @vasilvestre/opencode-hashline-edit

LINE#ID edit tool for OpenCode v2 — safe, hash-validated line-based file editing.

## Features

- **LINE#ID addressing**: Each line identified by `line#hash` (e.g., `42#ZP`), configurable 2-4 chars
- **Context-aware hash validation**: Hash includes neighbor lines — prevents stale edits even with identical content
- **Four operations**: `replace` (single/range), `append`, `prepend`, `replace_text` (exact substring)
- **Atomic batching**: Multiple edits sorted bottom-up, applied atomically
- **Safety**: Overlap detection, no-op detection (3-strike loop guard), deduplication
- **Chained edits**: Fresh anchors returned after successful edit — no re-read needed
- **Formatters**: Auto-runs configured formatters after write
- **OpenCode v2 native**: Uses `/api/fs/read` and `/api/experimental/fs/write`

## Installation

```bash
npm install @vasilvestre/opencode-hashline-edit
```

## Usage

### As an OpenCode plugin (recommended — direct use)

Add it to your OpenCode config, the `hashline_edit` tool becomes available to the AI automatically:

```jsonc
// opencode.jsonc (project) or ~/.config/opencode/opencode.jsonc (global)
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@vasilvestre/opencode-hashline-edit"]
}
```

The AI will read files with `LINE#ID` anchors and call the tool on its own.

---

### As a library (embed in your own plugin)

The package exports the plugin definition as its default export. There is no `createHashlineEditTool` factory.

```typescript
import hashlineEdit from "@vasilvestre/opencode-hashline-edit"

export default hashlineEdit
```


## LINE#ID Format

When you read a file, each line comes back as `LINE#ID|content`:
```
1#ZP|const x = 1
2#AB|function foo() {
3#CD|  return x + 1
4#EF|}
```

The hash covers the line and its neighbors. It is 2 characters by default; pass `hashLength: 3` or `4` for longer hashes.
The tag never appears in the file on disk: the tool strips it before editing and writes the plain content back.
## Edit Examples

### Replace single line
```json
{ "op": "replace", "pos": "2#AB", "lines": "function bar() {" }
```

### Replace range
```json
{ "op": "replace", "pos": "2#AB", "end": "3#CD", "lines": ["function bar() {", "  return 42", "}"] }
```

### Append after line
```json
{ "op": "append", "pos": "4#EF", "lines": "// new comment" }
```

### Prepend before line
```json
{ "op": "prepend", "pos": "1#ZP", "lines": "// header comment" }
```

### Replace exact text (no anchors needed)
```json
{ "op": "replace_text", "oldText": "function foo()", "newText": "function bar()" }
```

### Delete file
```json
{ "delete": true, "edits": [] }
```

### Configure hash length (2-4 chars)
```json
{ "hashLength": 3, "edits": [...] }
```

## Safety Features

- **Context-aware hash validation**: Hash includes prev/next lines — identical lines in different contexts get different hashes
- **Overlap detection**: Rejects overlapping ranges
- **Deduplication**: Removes duplicate edits automatically
- **No-op detection**: Reports edits that produce no changes; 3 consecutive no-ops throws error
- **Bottom-up application**: Line numbers stay valid during batch edits
- **Strict patch content**: Rejects diff markers or display prefixes

## Chained Edits

After a successful edit, the result includes fresh LINE#ID anchors for the changed region:
```
Updated src/file.ts
--- Fresh Anchors ---
42#ZP|function bar() {
43#KT|  return 42
44#WS|}
```
Use these fresh anchors directly in the next edit call without re-reading.

## API

### Configuration Options (via args)
- `hashLength`: 2-4 (default: 2) — characters per line hash

## License

MIT License
