# opencode-rewind

[English](./README.md) | [中文](./README.zh-CN.md)

Claude Code style `/rewind` for [opencode](https://opencode.ai) — **git-free**, prompt-based snapshots.

Each user prompt (non-`/` command) is snapshotted to `.opencode/rewind/snapshots/<id>/` and recorded in `.opencode/rewind/history.json`. List via `/rewind`, pick a prompt with arrow keys, choose 1 of 6 actions to restore.

## How it relates to your project

* **Project root** = where your `opencode.json` lives and where you run `opencode`. The plugin reads `directory` from opencode and stores snapshots under `<project>/.opencode/rewind/`.
* **Two parts are required:**
  1. **Plugin** (`src/index.ts` / `plugin/rewind.ts`) — hooks `chat.message` and `tool.execute.after`, provides tools `rewind`/`list_checkpoints`/`restore_checkpoint`. Loaded via `opencode.json: plugin`.
  2. **Command** (`command/rewind.md`) — defines the slash command `/rewind` (uses `question` + the tools above). Loaded from `.opencode/commands/rewind.md` (project) or `~/.config/opencode/commands/rewind.md` (global). Without it, tools exist but `/rewind` won't appear in TUI.

## Installation

### Option A — npm (recommended) — 2 locations

#### A1. Project `node_modules` (simplest)

Run in **project root** (where `opencode.json` lives):

```bash
npm i @nameused/opencode-rewind
# or bun add / pnpm add / yarn add
# installs to <project>/node_modules/@nameused/opencode-rewind
```

#### A2. `.opencode` isolated (keeps project `package.json` clean)

Keep `package.json` clean by installing into `<project>/.opencode` itself (opencode supports `<project>/.opencode/package.json` per `opencode.ai/docs/plugins: Dependencies`):

```bash
mkdir -p .opencode
cat > .opencode/package.json <<'JSON'
{
  "dependencies": {
    "@nameused/opencode-rewind": "^1.0.2"
  }
}
JSON
# install into <project>/.opencode/node_modules
(cd .opencode && npm install)
# or: (cd .opencode && bun install)
```

Both A1 and A2 work; A2 puts the package at `<project>/.opencode/node_modules/@nameused/opencode-rewind` at the same level as your project root's `.opencode` dir (sibling to project files, inside `.opencode`).

In **project root** `opencode.json` (create if not exists, `opencode.jsonc` also works):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@nameused/opencode-rewind"]
}
```

`@nameused/opencode-rewind` is published with `command/` and `plugin/` included (see `package.json: files`). **But opencode does not auto-install the command file** — you must copy it once:

```bash
mkdir -p .opencode/commands
# A1 source: <project>/node_modules/...
cp node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
# A2 source: <project>/.opencode/node_modules/...
# cp .opencode/node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
# if you skipped npm i and let opencode auto-install via opencode.json, source is instead:
# cp ~/.cache/opencode/node_modules/@nameused/opencode-rewind/command/rewind.md .opencode/commands/rewind.md
```

> Global alternative: `mkdir -p ~/.config/opencode/commands && cp <source>/command/rewind.md ~/.config/opencode/commands/rewind.md` and put `plugin` in `~/.config/opencode/opencode.json`.

Restart opencode. Type `/` — you should see `/rewind` and `/checkpoint`.

> Where packages live: A1 `npm i` → `<project>/node_modules/@nameused/opencode-rewind`; A2 `(cd .opencode && npm i)` → `<project>/.opencode/node_modules/@nameused/opencode-rewind` (same level as project `.opencode` dir, isolated); auto-install via `opencode.json` → `~/.cache/opencode/node_modules/@nameused/opencode-rewind` (opencode runs `bun install` at startup). If you see nothing, clear `~/.cache/opencode` and restart, or check TUI logs (`client.app.log` with `service:"rewind"`).

### Option B — local (no npm)

```bash
mkdir -p .opencode/plugins .opencode/commands
cp src/index.ts .opencode/plugins/rewind.ts
# or cp plugin/rewind.ts .opencode/plugins/rewind.ts  (both are synced)
cp command/rewind.md .opencode/commands/rewind.md
```

No `opencode.json` change needed. Restart opencode.

`src/index.ts` is the source of truth (`plugin/rewind.ts` synced each release).

### Verify

* `/rewind` appears when typing `/` in TUI
* Send a normal prompt (not `/...`), then `/rewind` should list it
* Tools available to agent: `list_checkpoints`, `restore_checkpoint`, `rewind`

### Troubleshooting — `/rewind` not visible

1. Did you copy `command/rewind.md` to `.opencode/commands/rewind.md` (plural, not `command/`)? Old docs used `command/` singular — now `commands/`.
2. Did you restart opencode after editing `opencode.json` / adding files?
3. Is `opencode.json` in project root (or `~/.config/opencode/opencode.json` for global)? `opencode.jsonc` also works.
4. Check `~/.cache/opencode/node_modules/@nameused/opencode-rewind` exists after restart. If not, run `bun pm cache rm` or `rm -rf ~/.cache/opencode` and restart.
5. Check opencode version supports plugins (`>=0.10`).

## Usage

| Command | Description |
|---------|-------------|
| `/rewind` | Interactive list (last 10, newest on top, system prompts filtered) → arrow keys → 6 actions |
| `/rewind <index> --action=1` | Direct restore: `1=code+conv, 2=conv, 3=code, 4=summarize-from, 5=summarize-upto, 6=never` (`--confirm` alias for `1`) |
| `/checkpoint [label]` | Manual snapshot with label (`manual-<ISO>` if empty) |
| `list_checkpoints` (tool) | Same filtered/sorted list for agents |
| `restore_checkpoint {steps, action}` | Programmatic restore |

Agent natural language:

```
List checkpoints
Restore to checkpoint 2
```

Sorting/filtering: `rewind`/`list_checkpoints` filter `isIgnorablePrompt` and sort by `timestamp` desc before slicing.

## Storage

- Snapshots: `.opencode/rewind/snapshots/<id>/`
- History: `.opencode/rewind/history.json` (atomic write, reindexed after prune, filtered on load if snapshot missing)

Restore: deletes current files not in snapshot (including `.opencode` tracked files), then copies snapshot files; empty dirs pruned; `lastPrompt` reset to restored entry.

## Large projects

Current `snapshotWorkingTree: src/index.ts:146` is a **full copy** (exact restore, including newly created/deleted files), not Claude Code's “only edited files” model. For small/medium repos this is correct and simple. For large repos (`>10k` files) each checkpoint is `O(N)` and 100 checkpoints use more disk. Mitigations:

* Ignores `.git/node_modules/.opencode/.cache/dist/build/.next/coverage/tmp/logs/.turbo/out/.parcel-cache/.vite/.idea/.vscode`, skips `>50MB` and symlinks (fixed in `1.0.1` to use `lstat`), precisely excludes `.opencode/rewind`.
* Use `/checkpoint` manually before risky `bash` edits (bash is only heuristically tracked: `rm/mv/cp/mkdir/touch/echo/sed/perl/python/>/cat >`).
* Future: incremental mode (only restore edited files, aligned with Claude Code limitations) can be enabled to trade exactness for speed — tracked as enhancement.

## Limitations (same as Claude Code)

- `bash` file changes, subagents, symlinks not fully tracked — use `/checkpoint` before risky bash
- Large files `>50MB` skipped
- Symlinks skipped (`1.0.1` fixes `listFilesRecursive` to use `lstat`)

## Development

```bash
node --check src/index.ts
# edit src/index.ts, it will be synced to plugin/rewind.ts before publish
```

## Publish

```bash
npm login
npm publish --access public
```

## License

MIT
