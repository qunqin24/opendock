# opencode-plugin-git-memory

[![npm version](https://img.shields.io/npm/v/opencode-plugin-git-memory)](https://www.npmjs.com/package/opencode-plugin-git-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A persistent memory plugin for [OpenCode](https://opencode.ai) that stores AI agent memories on a **detached git branch** — keeping your working tree clean while preserving full version history.

> Forked from [knikolov/opencode-plugin-simple-memory](https://github.com/cnicolov/opencode-plugin-simple-memory) — the core logfmt memory format and tool design are inherited; this version replaces filesystem-backed storage with pure git plumbing on an orphan branch.

## Setup

1. Add the plugin to your [OpenCode config](https://opencode.ai/docs/config/):

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["opencode-plugin-git-memory"]
   }
   ```

2. Start using memory commands in your conversations.

Automatic memory loading and saving are opt-in. When enabled, the plugin can load and save context automatically:

- Before a response, it injects a short relevant-memory block based on the latest user message.
- When the user explicitly says "remember ...", it saves that memory automatically.
- It does not automatically save arbitrary conversation content.

## Updating

> [!WARNING]
> OpenCode does NOT auto-update plugins.

To get the latest version, clear the cached plugin and let OpenCode reinstall it:

```bash
# Remove the plugin from cache
rm -rf ~/.cache/opencode/node_modules/opencode-plugin-git-memory

# Run OpenCode to trigger reinstall
opencode
```

## Tools

The plugin provides nine tools:

| Tool | Description |
|------|-------------|
| `memory_remember` | Store a new memory |
| `memory_recall` | Retrieve memories by scope, type, or search query |
| `memory_update` | Update an existing memory |
| `memory_forget` | Delete a memory (with audit logging) |
| `memory_list` | List all scopes and types for discovery |
| `memory_export` | Export memories as `jsonl`, `json`, or `logfmt` |
| `memory_import` | Import memories from `jsonl`, `json`, or compatible `logfmt` |
| `memory_compact` | Rewrite memory files chronologically and remove exact duplicates |
| `memory_context` | Build a compact relevant-memory context pack |

## Memory Types

- `decision` — Architectural or design decisions
- `learning` — Things learned during development
- `preference` — User or project preferences
- `blocker` — Current blockers or issues
- `context` — General context information
- `pattern` — Recurring patterns or conventions

## Example Usage

```
User: Remember that my name is Kris

AI: [calls memory_remember with type="context", scope="user", 
     content="User's name is Kris"]
    
    I've stored that your name is Kris.

User: My preferred programming language is Erlang

AI: [calls memory_remember with type="preference", scope="user", 
     content="Preferred programming language is Erlang"]
    
    Got it! I've noted that your preferred programming language is Erlang.

User: What do you know about me?

AI: [calls memory_recall with scope="user"]
    
    Here's what I know about you:
    - Your name is Kris
    - Your preferred programming language is Erlang

User: Actually, I prefer Elixir now.

AI: [calls memory_update with type="preference", scope="user", 
     content="Preferred programming language is Elixir"]
    
    Updated your language preference to Elixir.

User: Forget my language preference

AI: [calls memory_forget with type="preference", scope="user", 
     reason="User requested removal"]
    
    Done. I've removed your language preference from memory.
```

## Recall Filters

`memory_recall` supports the original filters plus optional richer filters:

- `scope` — filter by scope. By default this keeps the original contains-style matching.
- `type` — filter by memory type.
- `query` — rank by matching words across type, scope, content, and tags.
- `limit` — maximum results. Query results return the best matches; non-query results return the latest memories.
- `tags` — require all provided tags.
- `since` / `until` — filter by ISO timestamp or date prefix.
- `match` — scope matching mode: `contains`, `exact`, or `prefix`.

## Automatic Context

Automatic context loading is disabled by default. When `autoLoad` is enabled, the plugin uses OpenCode chat hooks to remember the latest user message, search active memories, and inject a compact block like this into system context:

```md
RM:
c/deploy/staging: Use materialize-deployments.cjs for staging runtime restart
c/tests: Run make staging-live-onboarding-e2e for staging onboarding
```

The context pack uses a token-efficient condensed format:
- **`RM:`** header instead of `Relevant Memory:` (—13 chars)
- **Single-letter types**: `d`=decision, `l`=learning, `r`=preference, `b`=blocker, `c`=context, `p`=pattern
- **Scope grouping**: memories from the same scope+type are merged into one line
- **Time-decay scoring**: memories older than 1 day score lower, >1 week lower still, >90 days near-zero

Automatic context saving is also disabled by default. When `autoSave` is enabled, it is intentionally conservative and only stores explicit requests such as:

```text
remember that I prefer minimal diffs
```

That request is stored as a `preference` memory in scope `user` with tag `auto`. Other explicit remember requests default to `context/user` unless they look like a decision, blocker, pattern, or preference.

Configure the behavior through plugin options by using OpenCode's plugin tuple form:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-plugin-git-memory",
      {
        "autoLoad": true,
        "autoSave": true,
        "autoHookTimeoutMs": 100,
        "contextLimit": 5,
        "contextMaxChars": 1200,
        "contextMinScore": 1,
        "autoSaveScope": "user",
        "autoSaveOnCompact": true,
        "memoryBranch": "memory/agent"
      }
    ]
  ]
}
```

### Configuration options

| Option | Default | Description |
|--------|---------|-------------|
| `autoLoad` | `false` | Enables automatic relevant-memory injection before responses. |
| `autoSave` | `false` | Enables automatic saving only for explicit user requests like `remember that I prefer minimal diffs`. |
| `autoHookTimeoutMs` | `100` | Maximum time each automatic hook can spend on memory work. Hooks fail open after this timeout. |
| `contextLimit` | `5` | Maximum memories included in the automatic relevant-memory block. |
| `contextMaxChars` | `1200` | Maximum character budget for the automatic relevant-memory block. |
| `contextMinScore` | `1` when query provided | Minimum relevance score for automatic context loading. |
| `autoSaveScope` | `"user"` | Default scope for auto-saved explicit remember requests. |
| `autoSaveOnCompact` | `false` | When true, `memory_compact` saves a `context/system` memory recording the compaction (entries before → after, duplicates removed). |
| `memoryBranch` | `"memory/agent"` | Git branch name for memory storage. Change to isolate memory per agent or team. |

For local development, symlink the package into the plugin cache:

```bash
ln -sf "$(pwd)" ~/.cache/opencode/node_modules/opencode-plugin-git-memory
```

Then use the normal plugin name:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-plugin-git-memory",
      {
        "autoLoad": true,
        "autoSave": true
      }
    ]
  ]
}
```

OpenCode loads plugin configuration at startup. Restart OpenCode after changing configuration.

## Storage Architecture

This plugin uses a radically different storage approach from most memory plugins: memories are stored on a **detached git branch** (default: `memory/agent`) using pure git plumbing commands.

### How it works

Instead of writing `.opencode/memory/*.logfmt` files to your working tree, the plugin:
1. Creates an orphan branch `memory/agent` in your repo
2. Writes all memory content as git objects (blobs, trees, commits) on that branch
3. Reads memory by traversing the branch's commit history
4. Never touches your working directory or pollutes your working tree

### Key benefits

- **Clean working tree** — no `.opencode/memory/` clutter in your code diffs
- **Shared across branches** — the memory branch is accessible from any git branch or worktree
- **Version-controlled** — full git history of all memory changes
- **PR-reviewable** — memory changes appear as commits on a dedicated branch
- **Atomic writes** — each operation is a single `git update-ref` — no partial writes
- **No `.gitignore` hacks** — nothing to add to `.gitignore`

### Storage format

Memory files are daily logfmt files named `YYYY-MM-DD.logfmt` on the `memory/agent` branch:

```logfmt
ts=2026-05-28T10:00:00.000Z type=context scope=api content="Remember this" issue=#51 tags=backend,current
```

Each active memory record uses these fields:
- `ts` (required) — ISO 8601 timestamp
- `type` (required) — one of `decision | learning | preference | blocker | context | pattern`
- `scope` (required) — string identifier (e.g., `api`, `user`, `deploy/staging`)
- `content` (required) — the memory content (always quoted, multiline uses `\n`)
- `issue` (optional) — e.g., `#51`
- `tags` (optional) — comma-separated values

### Inspecting memories

You can browse memories directly using git commands:

```bash
# List all memory files on the branch
git ls-tree -r --name-only refs/memory/agent

# Read a specific day's memories
git show refs/memory/agent:.opencode/memory/2026-05-28.logfmt

# View the commit history of the memory branch
git log refs/memory/agent

# Search memory content
git grep "search term" refs/memory/agent -- .opencode/memory/
```

### Multiple memory branches

You can isolate memories per agent or team by using different branch names:

```jsonc
// Agent "build" uses its own memory
{ "memoryBranch": "memory/build" }

// Agent "review" uses a shared team memory
{ "memoryBranch": "memory/team" }
```

### Why not a database?

File-based memory (logfmt on a git branch) is:
- **Transparent** — you can inspect, diff, and edit memories with standard Unix tools
- **Portable** — no SQLite, no vector DB, no external dependencies
- **Git-native** — full history, branching, merging, and sharing via git remotes
- **Scriptable** — `grep`, `awk`, `sed` work directly on memory content

## Maintenance

`memory_forget` keeps its original behavior when called with only `scope`, `type`, and `reason`: it deletes all exact matches. To delete only a specific memory, pass `query`.

`memory_export` and `memory_import` can move memories between projects or back up the store. `jsonl` is the default export/import format.

`memory_compact` removes exact duplicate active records and rewrites active memory files in chronological order. Use `dryRun: true` to preview the change.

### Migration from old `.opencode/memory/` storage

If you were using a previous version that stored memories as files on the working tree, use the export/import tools to migrate:

```bash
# In the old version:
opencode → memory_export format=logfmt → copy the output

# In the new version (after upgrading):
opencode → memory_import format=logfmt → paste the output
```

## Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/lhw/opencode-plugin-git-memory.git
cd opencode-plugin-git-memory
npm install
```

Run checks:

```bash
npm test
npm run typecheck
```

Point your OpenCode config to the local checkout by symlinking the package into the plugin cache:

```bash
ln -sf "$(pwd)" ~/.cache/opencode/node_modules/opencode-plugin-git-memory
```

Or for development, reference it directly in your config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-git-memory"]
}
```

OpenCode resolves the plugin from `node_modules` — the symlink above keeps it pointing at your local checkout.
