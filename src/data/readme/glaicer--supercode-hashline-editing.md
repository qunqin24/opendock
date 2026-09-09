# hashline-editing

An OpenCode plugin that edits files by line number instead of search and replace. Search and replace breaks when the same code shows up twice. Plain line numbers break when an earlier edit moves the lines below it.

## What it does

Each `read` returns a `[PATH#TAG]` header. The tag names the exact version you read, so `edit` can check it before it writes.

Read a file first, then send a patch like this:

```text
[src/a.ts#A1B2]
replace 2-3
+new line two
+new line three
```

Reads take `limit` and `offset`. For inserts use `insert before N`, `insert after N`, or `append`. One patch can cover several files. Every file is checked first, then written.

## Benefits

- Edits in one patch never shift each other. Line numbers refer to the version you read. Use the new header for the next edit.
- Duplicate lines are safe because you point at lines, not text. A stale tag stops instead of writing to the wrong place.
- Patches stay small. You send only the operation and the new lines, no surrounding context.
- If the file changed on disk, the edit stops before writing anything. Read again and retry.
- No fuzzy matching. The tag either matches or it does not.

## Install

Install with the OpenCode CLI:

```bash
opencode plugin @glaicer/supercode-hashline-editing --global
```

- `--global` installs into the global config (`~/.config/opencode`); default is local (`.opencode` in the current project).
- `--force` replaces an already-installed version.
- Restart OpenCode after installing.

Manual install also works: add the package to the `plugin` array in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@glaicer/supercode-hashline-editing"]
}
```

Restart OpenCode after saving.
