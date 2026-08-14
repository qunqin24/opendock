# opencode-localmemory

Persistent **local** memory plugin for [OpenCode](https://opencode.ai) — no subscription, no external service, zero cost.

Stores memories as **Markdown files with YAML frontmatter** organized per-project under `~/.config/opencode/localmemory/`. Inspired by [Claude Code's memory system](https://docs.anthropic.com/en/docs/claude-code/memory), but 100% local and offline.

## Por que usar

- Os dados permanecem no computador: não há API, conta ou custo recorrente.
- Memórias de usuário podem ser reutilizadas entre projetos, enquanto as de projeto ficam isoladas por repositório Git.
- Os arquivos são Markdown legível e versionável; não há formato proprietário.
- A busca combina palavras-chave e recência, sem embeddings nem serviço externo.

## Início rápido

Adicione o plugin ao arquivo de configuração do OpenCode:

```jsonc
{
  "plugin": ["opencode-localmemory"]
}
```

Depois de reiniciar o OpenCode, peça ao agente algo como: `salva que este projeto usa Bun, não Node`.

---

## Installation

### From npm (recommended)

Add to your `opencode.json` or `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["opencode-localmemory"]
}
```

OpenCode will install it automatically at startup via Bun.

### From source

```bash
git clone https://github.com/DevairRestani/opencode-localmemory.git
cd opencode-localmemory
bun install
bun run build
bun run install-plugin
```

Or manually add to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugin": ["file:///absolute/path/to/opencode-localmemory"]
}
```

Restart OpenCode and the `memory` tool will appear in the available tools list.

---

## How it works

### The `memory` tool

The agent gets direct access to a `memory` tool with 7 modes:

| Mode | Arguments | Description |
|------|-----------|-------------|
| `save` | `name`, `content`, `scope?`, `type?`, `tags?` | Create or update a memory |
| `search` | `query` | Search memories by keywords |
| `list` | `scope?` | List all memories in a scope |
| `forget` | `name` | Remove a memory by name |
| `recall` | `query` | Get top relevant memories with freshness warnings |
| `extract` | — | Get instructions for extracting memories from conversation |
| `consolidate` | — | Get instructions for reviewing, merging, and pruning memories |

### Scopes

| Scope | Storage | Availability |
|-------|---------|-------------|
| `user` | `~/.config/opencode/localmemory/user/memory/` | Cross-project, always available |
| `project` | `~/.config/opencode/localmemory/projects/<hash>/memory/` | Isolated per git repository |

The project hash is derived from `git rev-parse --show-toplevel`.

### Memory types (4 types)

| Type | What it stores | Example |
|------|---------------|---------|
| `user` | Role, goals, preferences, knowledge level | "User is a senior backend engineer" |
| `feedback` | Corrections about how to work with this user | "Always run tests after changes" |
| `project` | Work context not derivable from code | "Deploy deadline is April 15" |
| `reference` | Pointers to external systems | "Monitoring: https://grafana.example.com/d/abc" |

### File format

Each memory is a `.md` file with YAML frontmatter:

```markdown
---
name: User Role
description: Senior backend engineer focused on observability
type: user
created: 2026-04-02T10:00:00Z
updated: 2026-04-02T10:00:00Z
tags: [observability, python]
---

Content of the memory goes here.
```

### MEMORY.md index

A `MEMORY.md` index file is automatically maintained in each scope directory and loaded into the system prompt so the agent always knows what memories exist. Limits: 200 lines, 25KB, ~150 chars per entry.

### Context compaction

When the context window fills up, the `experimental.session.compacting` hook injects all memories into the continuation prompt so nothing is lost across compactions.

### Search

Keyword-based **token overlap** with recency scoring — no embeddings, no external API. Works fully offline.

---

## Usage

### Phrases that trigger automatic saving

The agent recognizes phrases like:

- *"remember that I prefer concise responses"*
- *"save that this project uses Bun, not Node"*
- *"don't forget: deploy is via GitHub Actions"*
- *"lembra que prefiro respostas concisas"*
- *"salva isso"*
- *"não esqueça"*

### Direct tool usage

```
Save to project memory: this project uses Vue 3 with Composition API.
```

```
Search memory for what you know about this project's deployment.
```

---

## Storage layout

```
~/.config/opencode/localmemory/
├── user/
│   └── memory/
│       ├── MEMORY.md           # Index file (always in system prompt)
│       ├── user_role.md        # Memory files with frontmatter
│       └── ...
└── projects/
    └── <sha256-hash>/
        └── memory/
            ├── MEMORY.md
            ├── project_context.md
            └── ...
```

Legacy `.json` files from v1 are **auto-migrated** to `.md` on first load (originals backed up as `.json.bak`).

---

## Comparison with opencode-supermemory

| Feature | opencode-supermemory | opencode-localmemory |
|---------|---------------------|---------------------|
| Storage | Cloud (Supermemory API) | Local (`~/.config/...`) |
| Semantic search | Vector embeddings | Keyword overlap |
| Cost | Paid subscription | Zero |
| Privacy | Data sent to API | 100% local |
| Cross-machine sync | Yes (via API) | No (portable via files) |
| Works offline | No | Yes |

---

## Development

```bash
bun install
bun run build        # Compile to dist/
bun run typecheck    # Type-check only
bun run dev          # Watch mode
bun test             # Run tests
```

## License

MIT
