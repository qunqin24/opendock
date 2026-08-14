# Simple Memory Plugin for OpenCode

[![npm version](https://img.shields.io/npm/v/@knikolov/opencode-plugin-simple-memory)](https://www.npmjs.com/package/@knikolov/opencode-plugin-simple-memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A persistent memory plugin for [OpenCode](https://opencode.ai) that enables the AI assistant to remember context across sessions.

## Setup

1. Add the plugin to your [OpenCode config](https://opencode.ai/docs/config/):

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["@knikolov/opencode-plugin-simple-memory"]
   }
   ```

2. Start using memory commands in your conversations.

Memories are stored in `.opencode/memory/` as daily logfmt files. Existing logfmt files remain readable across plugin updates.

Automatic memory loading and saving are opt-in. When enabled, the plugin can load and save context automatically:

- Before a response, it injects a short relevant-memory block based on the latest user message.
- When the user explicitly says “remember ...”, it saves that memory automatically.
- It does not automatically save arbitrary conversation content.

## Updating

> [!WARNING]
> OpenCode does NOT auto-update plugins.

To get the latest version, clear the cached plugin and let OpenCode reinstall it:

```bash
# Remove the plugin from cache
rm -rf ~/.cache/opencode/node_modules/@knikolov/opencode-plugin-simple-memory

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

- `decision` - Architectural or design decisions
- `learning` - Things learned during development
- `preference` - User or project preferences
- `blocker` - Current blockers or issues
- `context` - General context information
- `pattern` - Recurring patterns or conventions

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

- `scope` - filter by scope. By default this keeps the original contains-style matching.
- `type` - filter by memory type.
- `query` - rank by matching words across type, scope, content, and tags.
- `limit` - maximum results. Query results return the best matches; non-query results return the latest memories.
- `tags` - require all provided tags.
- `since` / `until` - filter by ISO timestamp or date prefix.
- `match` - scope matching mode: `contains`, `exact`, or `prefix`.

## Automatic Context

Automatic context loading is disabled by default. When `autoLoad` is enabled, the plugin uses OpenCode chat hooks to remember the latest user message, search active memories, and inject a compact block like this into system context:

```md
Relevant Memory:
- context/deploy/staging: Use materialize-deployments.cjs for staging runtime restart
- context/tests: Run make staging-live-onboarding-e2e for staging onboarding
```

Automatic context saving is also disabled by default. When `autoSave` is enabled, it is intentionally conservative and only stores explicit requests such as:

```text
remember that I prefer minimal diffs
```

That request is stored as a `preference` memory in scope `user` with tag `auto`. Other explicit remember requests default to `context/user` unless they look like a decision, blocker, pattern, or preference.

Configure the behavior through plugin options by using OpenCode's plugin tuple form. The first item is the package name and the second item is the options object passed to the plugin:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@knikolov/opencode-plugin-simple-memory",
      {
        "autoLoad": true,
        "autoSave": true,
        "autoHookTimeoutMs": 100,
        "contextLimit": 5,
        "contextMaxChars": 1200,
        "contextMinScore": 1,
        "autoSaveScope": "user"
      }
    ]
  ]
}
```

Configuration options:

| Option | Default | Description |
|--------|---------|-------------|
| `autoLoad` | `false` | Enables automatic relevant-memory injection before responses. The plugin uses the latest user message as the search query and appends a compact `Relevant Memory:` block to system context when matches exist. |
| `autoSave` | `false` | Enables automatic saving only for explicit user requests like `remember that I prefer minimal diffs`. It does not save arbitrary conversation content. |
| `autoHookTimeoutMs` | `100` | Maximum time each automatic hook can spend on memory work. Hooks fail open after this timeout so memory loading or saving cannot block normal responses. |
| `contextLimit` | `5` | Maximum number of memories included in the automatic relevant-memory block. |
| `contextMaxChars` | `1200` | Maximum character budget for the automatic relevant-memory block. Matching memories are truncated to stay within this budget. |
| `contextMinScore` | `1` when there is a query | Minimum relevance score required for automatic context loading. Increase this to make injected memory stricter; set it lower to include weaker matches. |
| `autoSaveScope` | `"user"` | Scope used for automatic explicit `remember ...` saves unless the inferred memory itself provides something more specific. |

To keep automatic behavior disabled while retaining manual tools, omit options entirely or set both flags to `false`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@knikolov/opencode-plugin-simple-memory",
      {
        "autoLoad": false,
        "autoSave": false
      }
    ]
  ]
}
```

For local development, point OpenCode at the checkout with a `file://` URL and pass the same options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "file:///absolute/path/to/opencode-plugin-simple-memory/index.ts",
      {
        "autoLoad": true,
        "autoSave": true
      }
    ]
  ]
}
```

OpenCode loads plugin configuration at startup. Restart OpenCode after changing configuration.

## Storage Format

Memory files are daily logfmt files named `YYYY-MM-DD.logfmt` under `.opencode/memory/`.

Each active memory record uses these fields:

```logfmt
ts=2026-05-28T10:00:00.000Z type=context scope=api content="Remember this" issue=#51 tags=backend,current
```

Compatibility notes:

- Existing unquoted `scope`, `issue`, and `tags` records remain readable.
- New records quote fields only when needed, except `content`, which is always quoted.
- Multiline content is stored on one physical line using escaped `\n` sequences and is restored during recall/export.
- Updates and deletes append audit records to `.opencode/memory/deletions.logfmt`.

## Maintenance

`memory_forget` keeps its original behavior when called with only `scope`, `type`, and `reason`: it deletes all exact matches. To delete only one matching memory, pass `query`.

`memory_export` and `memory_import` can move memories between projects or back up the store. `jsonl` is the default export/import format.

`memory_compact` removes exact duplicate active records and rewrites active memory files in chronological order. Use `dryRun: true` to preview the change.

## Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/cnicolov/opencode-plugin-simple-memory.git
cd opencode-plugin-simple-memory
bun install
```

Run checks:

```bash
bun test
bun run typecheck
```

Point your OpenCode config to the local checkout via a `file://` URL:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-plugin-simple-memory"]
}
```

Replace `/absolute/path/to/opencode-plugin-simple-memory` with your actual path.
