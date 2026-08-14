# opencode-fs-ops

[OpenCode](https://github.com/anomalyco/opencode) plugin that adds permission-gated `mv` and `cp` tools so the agent can move and copy files instead of rewriting them.

## Why

When an agent renames a module or duplicates a file, the cheap path is to **move/copy first, then edit**. Doing it with `write` instead is expensive (re-emitting the entire file content), loses git rename detection, and increases the chance of the model corrupting code it didn't need to touch.

Without dedicated tools the agent has to reach for `bash` (`mv`, `cp`, `Move-Item`, `Copy-Item`, …) which is gated behind shell permissions and varies per platform. This plugin gives the agent first-class, cross-platform, permission-gated tools so the safe path is also the obvious path.

## Tools

### `mv` — move or rename
Moves or renames a file or directory. Uses `fs.rename` for the fast atomic path and falls back to copy + delete on `EXDEV` (cross-volume moves). Refuses to clobber an existing destination unless `overwrite: true`.

### `cp` — copy
Copies a file or directory. Recursive when the source is a directory. Refuses to clobber an existing destination unless `overwrite: true`. Symbolic links are preserved as links (not dereferenced).

Both tools work identically on Windows, macOS, and Linux (Node ≥20 stdlib only — no shelling out).

## Permissions

Both tools reuse the **`edit`** permission key — the same one that gates the built-in `write`, `edit`, and `apply_patch` tools. That means:

- An agent that has `edit` denied also has `mv`/`cp` denied.
- A read-only agent never sees these tools in its toolset.
- Existing config like `"permission": { "edit": "ask" }` automatically prompts for `mv`/`cp` too.

When the source or destination escapes the project worktree, the tools additionally request the `external_directory` permission, mirroring how the built-in tools handle out-of-tree paths.

## Installation

Add the plugin to your OpenCode config:

```jsonc
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-fs-ops@latest"
  ]
}
```

For a read-only agent, deny `edit` and these tools disappear from its toolset along with the built-ins:

```jsonc
{
  "agent": {
    "researcher": {
      "permission": { "edit": "deny" }
    }
  }
}
```

## Build

```sh
pnpm install
pnpm build       # tsc → dist/
```

## License

MIT
