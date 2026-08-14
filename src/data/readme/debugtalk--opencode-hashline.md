# @debugtalk/opencode-hashline

OpenCode plugin adapter for [hashline](https://github.com/can1357/oh-my-pi) — compact, line-anchored, tag-verified file edits. Powered by [`@oh-my-pi/hashline`](https://github.com/can1357/oh-my-pi).

Instead of exact-string matching (which forces models to re-type old content and risks drift), hashline uses **line-number anchors** combined with **content-hash tags** so every edit is validated against the exact file snapshot the model saw. This plugin wraps the hashline engine as an OpenCode `edit` tool override and snapshot injection hook.

> **Package name:** Published as [`@debugtalk/opencode-hashline`](https://www.npmjs.com/package/@debugtalk/opencode-hashline) on npm. The unscoped name `opencode-hashline` is used by a different package on the public registry.

## Installation

```bash
opencode plugin @debugtalk/opencode-hashline
```

Install globally:

```bash
opencode plugin @debugtalk/opencode-hashline --global
```

Restart OpenCode. No build step — OpenCode loads the TypeScript plugin entry directly.

### Upgrade

```bash
opencode plugin @debugtalk/opencode-hashline --force
```

### Verify

```bash
grep "opencode-hashline" ~/.local/share/opencode/log/opencode.log
```

`opencode-hashline plugin loaded` → success.

## How It Works

The plugin overrides the built-in `edit` tool and injects snapshot tags into `read` output:

1. **Read** — output starts with `[path/file.ts#A1B2]` (4-hex content hash of the file)
2. **Edit** — `[path/file.ts#A1B2]` plus line-anchored ops; tag must match current file content
3. **Drift** — mismatch rejects the edit (with recovery when possible); re-read and retry

### Edit syntax (format v2)

```
[src/foo.ts#A1B2]
SWAP 2.=2:
+    return newValue

INS.POST 10:
+    // new comment

DEL 5.=7

INS.HEAD:
+# SPDX-License-Identifier: MIT
```

| Operation | Syntax | Description |
|-----------|--------|-------------|
| Replace lines | `SWAP N.=M:` | Replace inclusive range `N`..`M` with `+` body rows |
| Delete lines | `DEL N.=M` or `DEL N` | Delete range; no body |
| Insert before | `INS.PRE N:` | Insert before line `N` |
| Insert after | `INS.POST N:` | Insert after line `N` |
| Insert head | `INS.HEAD:` | Insert at file start |
| Insert tail | `INS.TAIL:` | Insert at file end |
| Delete file | `REM` | Remove entire file (section header required) |
| Move/rename | `MV dest/path` | Move file to `dest/path` |

Body rows are `+TEXT` only. The range deletes; the body is the **final** content for that range.

### Rules

- Line numbers refer to the **original** file; they do not shift as hunks apply in one patch
- Every successful edit returns a new `#TAG` — use it for the next edit or re-read
- Ranges should cover **only** lines that change
- On stale tag or unexpected result: **stop and re-read**

## Configuration

No configuration required.

### Programmatic use (hashline core)

Use the upstream package directly:

```ts
import { Patch, Patcher, NodeFilesystem, InMemorySnapshotStore } from "@oh-my-pi/hashline";
```

## Limitations

- **`SWAP.BLK N:` not supported** — tree-sitter block resolver not bundled; use `SWAP N.=M:` line ranges
- **OpenCode only** — this npm package targets the OpenCode plugin runtime; see `docs/cross-platform-plugins.md` for other agents

## Docs

- [Test design](docs/test-design.md)
- [Comparison vs built-in edit](docs/comparison-report.md)

## License

MIT