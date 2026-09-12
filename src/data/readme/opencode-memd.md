<p align="center">
  <img src="logo.png" alt="opencode-memd" width="300">
</p>

# opencode-memd

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Half vibe-coded persistent memory for [OpenCode](https://opencode.ai/).

Plain markdown, no vector DB, no embeddings — just an index file and topic files that the LLM reads and writes.

## How it works

```
LLM
 ↓
small MEMORY.md injected into context
 ↓
search/read markdown only when needed
 ↓
persistent memory across sessions & projects
```

1. **Session start** — global + project `MEMORY.md` indexes (≤200 lines each) are injected into context via plugin hook
2. **During session** — LLM uses memory tools to recall and save knowledge
3. **Across sessions** — all sessions in the same git repo share one memory directory, so knowledge accumulates
4. **Across projects** — global memory (preferences, corrections) is shared everywhere

Memory is stored at `~/.local/share/opencode-memd/` (respects `$XDG_DATA_HOME`) so it doesn't pollute your repo.

## Install

### From npm

```bash
opencode plugin opencode-memd --global
```

This installs the plugin and updates your OpenCode config automatically.

### From source

```bash
git clone https://github.com/kryptohaker/opencode-memd.git
```

Then point your config to the cloned path:

```jsonc
{
  "plugin": ["file:///absolute/path/to/opencode-memd"]
}
```

All memory tools are registered automatically through the plugin API — no file copying, no postinstall scripts.

### Upgrading from v0.2

If you previously installed v0.2, run the uninstall script to clean up old standalone tool files:

```bash
./uninstall.sh
```

The uninstall script removes old standalone tool files from `~/.config/opencode/tools/` and the old plugin directory. Your memory data is preserved and automatically migrated to the new location on first run.

## Uninstall

```bash
# Clean up plugin files and optionally memory data
./uninstall.sh

# Remove the package
bun remove opencode-memd
```

## Memory scopes

| Scope | Directory | What goes here |
|-------|-----------|----------------|
| `global` | `~/.local/share/opencode-memd/global/` | User preferences, workflow, repeated corrections |
| `project` | `~/.local/share/opencode-memd/projects/<hash>-<path>/` | Decisions, conventions, references for one project |

## Memory tools

| Tool | Description |
|------|-------------|
| `memory_read` | Read a memory file from global or project scope |
| `memory_write` | Create/replace or append to a memory file (supports tags) |
| `memory_list` | List all memory files with size, type, tags, and preview (filterable by tag) |
| `memory_search` | Search memory with regex + fuzzy matching (typo tolerance, stemming) |
| `memory_search_all` | Search across global + all projects' memory (with fuzzy matching) |
| `memory_forget` | Delete an obsolete memory file |
| `memory_projects` | List all projects that have stored memory |
| `memory_prune` | Find stale files (not updated in N days) and optionally archive them |
| `memory_export` | Export memory to a JSON file for backup or transfer |
| `memory_import` | Import memory from a JSON export file |
| `memory_compact` | Scan for duplicates/overlap, deduplicate lines, or merge files |
| `memory_status` | Health report: file counts, sizes, index usage, stale/duplicate alerts |

All tools except `memory_search_all`, `memory_projects`, `memory_export`, and `memory_import` accept a `scope` parameter: `"project"` (default) or `"global"`.

### Examples

```
> What testing framework does this project use?
# LLM calls: memory_search [pattern=testing|test framework, scope=project]

> Save that I prefer pnpm over npm
# LLM calls: memory_write [filename=preferences.md, scope=global, mode=append, tags=tooling]

> What do you know about me across all projects?
# LLM calls: memory_search_all [pattern=prefer|workflow|style]

> Forget the old deployment notes
# LLM calls: memory_forget [filename=deployment_notes.md, scope=project]

> Which projects have memory?
# LLM calls: memory_projects

> Show me memories tagged with "testing"
# LLM calls: memory_list [scope=project, tag=testing]

> Are there any stale memories?
# LLM calls: memory_prune [action=scan, scope=project]

> Back up all my memory
# LLM calls: memory_export [scope=all, output=memory-backup.json]

> Restore from backup
# LLM calls: memory_import [input=memory-backup.json, mode=merge]

> Search with a typo
# LLM calls: memory_search [pattern=preferances]
# fuzzy matching finds "preferences" despite the typo

> Any duplicate content in my memory?
# LLM calls: memory_compact [action=scan, scope=project]

> Merge these overlapping files
# LLM calls: memory_compact [action=merge, files=prefs.md,corrections.md, target=preferences.md]
```

## Topic file types and tags

Topic files (everything except `MEMORY.md`) support optional YAML frontmatter with types, tags, and automatic timestamps:

```markdown
---
type: feedback
tags: tooling, testing
created: 2026-09-11T12:00:00.000Z
updated: 2026-09-11T14:30:00.000Z
---
Use pnpm over npm in all projects.
Prefer vitest over jest.
```

| Type | What goes here | Typical scope |
|------|---------------|---------------|
| `user` | Role, preferences, knowledge | global |
| `feedback` | Corrections, confirmed approaches | global |
| `project` | Decisions, conventions, constraints | project |
| `reference` | External links, trackers, dashboards | project |

Timestamps (`created`, `updated`) are added automatically when writing topic files. The LLM sets the `type` and `tags` when creating a file. Tags are comma-separated and can be used to filter in `memory_list`. On append, new tags are merged with existing ones. `MEMORY.md` index files remain plain markdown — no frontmatter.

## Fuzzy search

Search uses a 4-layer approach:

1. **Filename match** — normalizes hyphens/underscores to spaces
2. **Line-by-line regex** — exact pattern matching
3. **Multi-term fallback** — all terms appear anywhere in the file
4. **Fuzzy fallback** — activates when exact layers find < 5 results

The fuzzy layer uses pure TypeScript (no external dependencies):
- **Levenshtein distance** — typo tolerance ("preferances" → "preferences")
- **Stemming** — word variant matching ("testing" → "test", "configuration" → "configur")
- **Trigram similarity** — partial word matching ("config" → "configuration")

Fuzzy matching is on by default. Pass `fuzzy=false` to disable.

## Memory compaction

The `memory_compact` tool analyzes memory files for maintenance issues:

- **Duplicate lines** — same content appearing in multiple files
- **Overlapping files** — files with >50% word overlap (candidates for merging)
- **Overgrown files** — files exceeding 50KB or 100 lines

Actions: `scan` (report only), `dedup` (remove duplicate lines), `merge` (combine files into one). Merged source files are archived to `.archive/` (recoverable).

## Auto-extraction

During session compaction (long conversations), the plugin automatically prompts the LLM to extract and save any unsaved memorable facts before the conversation is summarized. This ensures important corrections, preferences, and decisions are captured even if the LLM didn't explicitly save them during the session.

## Storage layout

```
~/.local/share/opencode-memd/
├── global/                        # Shared across all projects
│   ├── MEMORY.md                  # Global index (loaded every session)
│   ├── preferences.md             # User preferences
│   └── workflow.md                # Workflow notes
└── projects/
    ├── a1b2c3d4-home-user-projects-myapp/
    │   ├── MEMORY.md              # Project index (loaded every session)
    │   ├── decisions.md           # Architecture decisions
    │   └── corrections.md         # Things the user corrected
    └── f9e8d7c6-home-user-projects-other/
        └── MEMORY.md
```

## What gets remembered

The LLM decides. It's guided to save:

- Your corrections and confirmed approaches → **global**
- Your preferences and working style → **global**
- Project decisions and constraints → **project**
- External references (trackers, dashboards) → **project**

It skips anything derivable from the codebase (architecture, file paths, dependencies).

## Project structure

```
opencode-memd/
├── src/
│   ├── index.ts              # Plugin entry — thin wiring
│   ├── storage.ts            # Storage layer (validation, paths, I/O, search, migration)
│   ├── fuzzy.ts              # Fuzzy matching (Levenshtein, stemming, trigrams)
│   ├── compact.ts            # Compaction analysis (duplicates, overlap, merge)
│   ├── tools/
│   │   ├── index.ts          # Barrel export
│   │   ├── memory_read.ts
│   │   ├── memory_write.ts
│   │   ├── memory_forget.ts
│   │   ├── memory_list.ts
│   │   ├── memory_search.ts
│   │   ├── memory_search_all.ts
│   │   ├── memory_projects.ts
│   │   ├── memory_prune.ts
│   │   ├── memory_export.ts
│   │   ├── memory_import.ts
│   │   ├── memory_compact.ts
│   │   └── memory_status.ts
│   └── hooks/
│       ├── index.ts          # Barrel export
│       └── session.ts        # Session hooks (context injection + compaction)
├── uninstall.sh              # Cleanup script for old installations
├── package.json
└── tsconfig.json
```

## Configuration

No configuration needed. The plugin uses sensible defaults:

| Setting | Default |
|---------|---------|
| Memory directory | `~/.local/share/opencode-memd/` (respects `$XDG_DATA_HOME`) |
| Index limit | 200 lines / 25KB per MEMORY.md |
| Topic file limit | 100KB per file |
| Search limit | 50 results max |
| Project key | SHA-256 prefix + path slug (e.g. `a1b2c3d4-home-user-myapp`) |
| Stale threshold | 90 days (configurable per call) |

## Design philosophy

This plugin is intentionally simple. It does not use embeddings, vector databases, semantic search, or automatic memory curation. The LLM handles all the semantic reasoning — the plugin just provides safe, bounded, persistent markdown storage.

## License

MIT — see [LICENSE](LICENSE).

## Author

**Ramil Mustafayev** ([@kryptohaker](https://github.com/kryptohaker))
