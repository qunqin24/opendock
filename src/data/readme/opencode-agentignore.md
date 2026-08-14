# opencode-agentignore

OpenCode plugin that blocks reads, edits, writes, globs, and greps on files
matching `.agentignore` / `.claudeignore` (gitignore syntax). Uses the
battle-tested [`ignore`](https://github.com/kaelzhang/node-ignore) library
for pattern matching.

Ported from [claude-ignore](https://github.com/stefanoverna/claude-ignore).

## How it works

Two hooks run together:

- **`tool.execute.before`** on `read|edit|write|glob|grep|multiedit|list`. Walks up
  from the target file's parent to `/`, collecting every `.agentignore` and
  `.claudeignore` along the way. Patterns from co-located files are merged
  at each directory level using the `ignore` library. If *any* level matches
  the (symlink-resolved) path, the call is denied.
- **`tool.execute.after`** on `grep`. Re-inspects the response after ripgrep
  runs. Grep's `tool.execute.before` only sees the search root, so a project-
  wide search could return match lines from protected files. This hook
  extracts each path in the response, checks it against the same ignore chain,
  and replaces the result with a block message — the original content is
  never shown to the model. Supports both ripgrep raw output and OpenCode
  native grep format.

## Install

Add to your OpenCode config (`~/.config/opencode/opencode.json` or
`opencode.json`):

```json
{
  "plugin": ["opencode-agentignore@latest"]
}
```

OpenCode installs it from npm on next start.

## Usage

Create a `.claudeignore` or `.agentignore` in any directory:

```gitignore
# Secrets
.env
.env.*
*.pem
secrets/

# Generated
dist/
node_modules/
```

The plugin walks up from each target file's directory, so you can place
ignore files at the project root, in subdirectories, or in `~` for
truly global rules.

### .agentignore vs .claudeignore

Both are checked at every directory level and their patterns are merged.
Use whichever you prefer — `.agentignore` for OpenCode-native workflows,
or `.claudeignore` for compatibility with claude-ignore / Claude Code.

## Key semantics

- **Walk-up starts from the target file**, not the cwd — rules apply
  regardless of where OpenCode was launched.
- **Fail-closed across files.** A leaf-level `!pattern` cannot re-include
  a file ignored higher up. Unreadable/corrupt ignore files also fail
  closed. However, negations *within* a single ignore file work normally.
- **`Glob` results aren't filtered.** The model can still learn that a
  protected file *exists* (e.g. `Glob("**/.env")` returns paths). Only
  `Grep` is post-filtered, since it can leak file *contents*.
- **`bash` is not hooked.** Shell commands (`cat .env`, `grep -r SECRET .`)
  bypass the ignore files entirely.

## Configuration

The plugin requires no configuration. Drop the ignore files and it works.

## Testing

```bash
npm test
```

38 tests covering the `ignore` library integration, hierarchical
lookup, block/allow matching, symlink handling, merged `.agentignore` +
`.claudeignore`, and grep post-filter extraction.

## License

MIT
