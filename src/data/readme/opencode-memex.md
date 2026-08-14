# opencode-memex

Persistent memory & knowledge graph plugin for [OpenCode](https://opencode.ai).

Give your AI assistant a real memory. Facts, decisions, preferences, learnings, and corrections are saved to a local SQLite database and recalled across sessions automatically.

> *Named after Vannevar Bush's [Memex](https://en.wikipedia.org/wiki/Memex) (1945) — "a device in which an individual stores all his books, records, and communications, and which is mechanized so that it may be consulted with exceeding speed and flexibility."*

[中文文档](./README.zh.md)

---

## Features

- **6 AI tools** — `memory_save`, `memory_search`, `memory_status`, `memory_delete`, `kg_update`, `kg_query`
- **FTS5 full-text search** — fast multilingual search with `unicode61` tokenizer
- **Knowledge graph** — entity relationships as structured triples (A --[predicate]--> B)
- **Workspace isolation** — each project directory gets its own memory scope
- **Deduplication** — same content saved twice is automatically deduplicated
- **System prompt injection** — AI is automatically instructed when/how to use memory
- **Prompt injection guard** — stored memories are wrapped in `<memory_data>` with sanitization
- **CLI tool** — Python 3 command-line interface for viewing, searching, deleting memories
- **Zero config** — just install and it works. No API keys, no external services

## Quick Start

### Option A: Install from npm

```json
// opencode.json
{
  "plugin": ["opencode-memex"]
}
```

That's it. OpenCode will install the plugin automatically on next startup.

### Option B: Install manually

```bash
# Copy the plugin file (auto-loaded by OpenCode)
curl -o ~/.config/opencode/plugins/memory.ts \
  https://raw.githubusercontent.com/anthropic-ai/opencode-memex/main/src/index.ts
```

### CLI Tool (optional)

```bash
# Install the CLI for terminal-based memory management
curl -o ~/.local/bin/memex \
  https://raw.githubusercontent.com/anthropic-ai/opencode-memex/main/memory
chmod +x ~/.local/bin/memex
```

Requires Python 3 (pre-installed on all Linux/macOS systems).

---

## AI Tools

Once installed, the AI automatically gains these tools:

| Tool | Description |
|------|-------------|
| `memory_save` | Save a fact, decision, preference, learning, or correction |
| `memory_search` | Full-text search across past memories |
| `memory_status` | Overview: stats, recent memories, entities, knowledge graph |
| `memory_delete` | Delete a memory by ID |
| `kg_update` | Record an entity relationship (e.g., "Project X uses React") |
| `kg_query` | Query entity relationships |

### When the AI saves automatically

- User says **"remember this"** or corrects the AI
- User preferences or coding conventions are mentioned
- Root causes, fixes, or key findings are discovered
- Architecture decisions or tool choices are made

### Memory types

| Type | When |
|------|------|
| `fact` | Environment, project, or configuration details |
| `decision` | Architecture choices, tool selections |
| `preference` | User coding style, conventions |
| `learning` | Root causes, fixes, discoveries |
| `correction` | When the AI was wrong and user corrects it |

### Rooms (topic classification)

`general`, `technical`, `config`, `troubleshooting`, `security`, `documentation`

---

## CLI Usage

```bash
# List memories for current directory
memex show

# List all memories across workspaces
memex show --all

# Full-text search
memex search "database config"
memex search "react" --type decision

# Delete by ID
memex delete abc123

# Bulk clear (with confirmation)
memex clear                    # current workspace
memex clear --before 7d        # older than 7 days
memex clear --all              # everything

# Database stats
memex status

# Knowledge graph
memex kg show
memex kg show --all
memex kg delete t_abc123
```

---

## How It Works

### Database

All data is stored locally in a single SQLite file:

```
~/.local/share/opencode-memory/memory.db
```

- **memories** — text content with FTS5 full-text index
- **entities** — named things (people, tools, projects, etc.)
- **triples** — entity relationships with temporal validity

### Workspace Isolation

Memories are scoped to the working directory (workspace). The AI only searches the current workspace by default — memories from other projects are never mixed in unless explicitly requested via `cross_workspace=true`.

### Deduplication

The memory ID is a SHA-256 hash of `workspace + type + raw_content`. Saving the same content twice increments an access counter instead of creating a duplicate.

### Security

- Stored memories are wrapped in `<memory_data>` tags in tool output
- The system prompt instructs the AI to treat `<memory_data>` content as data, not instructions
- All user-controlled fields are sanitized before rendering inside the tag boundary
- No data ever leaves your machine — everything is local SQLite

---

## Architecture

```
opencode-memex/
├── src/
│   └── index.ts       # Single-file OpenCode plugin (TypeScript)
├── memory             # CLI tool (Python 3, no dependencies)
├── package.json
├── README.md
├── README.zh.md
└── LICENSE
```

The plugin is a **single TypeScript file** with no external dependencies beyond `@opencode-ai/plugin`. It uses `bun:sqlite` (built into OpenCode's runtime) for the database.

The CLI is a **standalone Python 3 script** using only the standard library (`sqlite3`, `os`, `sys`, `re`, `pathlib`). No pip install needed.

---

## FAQ

**Q: Does it need an API key or external service?**
A: No. Everything is local SQLite. No network calls.

**Q: Does it work with any LLM provider?**
A: Yes. The plugin adds tools that any model can use. Works with OpenAI, Anthropic, Google, local models, etc.

**Q: How much disk space does it use?**
A: Minimal. A few hundred memories use ~100 KB. The FTS5 index adds some overhead.

**Q: Can I back up my memories?**
A: Copy `~/.local/share/opencode-memory/memory.db`. It's a standard SQLite file.

**Q: Can I share memories between machines?**
A: Copy the database file. Workspace paths are absolute, so memories from `/home/alice/project` on machine A won't match `/home/bob/project` on machine B.

**Q: What happens during context compaction?**
A: The plugin re-injects the memory system instruction after compaction so the AI retains its memory awareness.

---

## License

MIT
