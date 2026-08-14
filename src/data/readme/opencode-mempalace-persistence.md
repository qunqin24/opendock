# opencode-mempalace-persistence

> **Community plugin** — not officially maintained by the MemPalace team. Fully open source, ~200 lines of TypeScript.

An OpenCode plugin that automatically saves every conversation to MemPalace and uses stored memory to provide better, context-aware responses. Real-time, zero cron, zero external scripts.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## How it works in 3 seconds

| Without plugin | With plugin |
|---|---|
| Every session starts from scratch | The model knows who you are and what you've done |
| You repeat context each time | Memory is automatic |
| Model starts from scratch each time | Memory persists across sessions |

The plugin injects relevant memories from MemPalace into every prompt (via `experimental.chat.messages.transform`), and saves every response back to MemPalace. A perfect feedback loop.

---

## Installation

### 1. Plugin (saves conversations)

```json
{
  "plugin": ["opencode-mempalace-persistence"]
}
```

Add this line to your `~/.config/opencode/opencode.json` and restart OpenCode.

### 2. Identity (who you are)

Create `~/.mempalace/identity.txt`:

```
I am [name], a [role]. I work with [technologies]. My main projects are [projects].
```

This file is loaded by the plugin — no need to add it to `instructions` in opencode.json.

### 3. MemPalace (if not already installed)

```bash
# Install (requires mempalace>=3.3.5 for HNSW corruption fix)
uv tool install "mempalace>=3.3.5"
# or
pipx install "mempalace>=3.3.5"

# Create palace
mempalace init ~/opencode-memory

# Configure MCP
mempalace mcp
```

The `mempalace mcp` command gives you the exact MCP setup string for your configuration.

### 4. Memory injection (recommended)

The plugin automatically injects your identity + relevant memories from MemPalace into every prompt. No model discipline required.

Create `~/.mempalace/plugin-config.json`:

```json
{
  "autoInjectContext": true
}
```

**Do NOT put this in `opencode.json`** — OpenCode's schema validation rejects unknown keys. The plugin reads its config from `~/.mempalace/plugin-config.json` instead.

When enabled:
- **First message**: Injects your identity from `~/.mempalace/identity.txt`
- **Every message**: Runs `mempalace search` and injects relevant results

#### AGENTS.md for this mode

Create `~/.config/opencode/AGENTS.md`:

```markdown
# Memory & Knowledge instructions

## CRITICAL: You MUST follow these steps BEFORE every response.

### Step 1 — Query Knowledge Graph
Call `mempalace_mempalace_kg_query` for entity "user". Then filter the returned facts — keep only those whose text contains keywords from the user's question, so irrelevant facts are excluded.

### Step 2 — Record Knowledge Graph facts

After responding, if you discovered any new facts during the conversation (decisions made, milestones reached, problems encountered, preferences expressed, emotional states), call `mempalace_mempalace_kg_add` to record them. Object must be 128 characters or fewer.

**This is mandatory** — record facts you are confident about. Prefer quality over quantity; noisy KG entries degrade retrieval over time.

### Naming reminder
All MemPalace tools use the prefix `mempalace_mempalace_*` (not `mempalace_*`). Examples:
- `mempalace_mempalace_kg_query` (NOT `mempalace_kg_query`)
- `mempalace_mempalace_kg_add`
- `mempalace_mempalace_kg_invalidate`
If you ever catch yourself typing `mempalace_kg_query`, STOP — the correct prefix is `mempalace_mempalace_`.
```

#### Complete `~/.config/opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-mempalace-persistence"],
  "instructions": ["AGENTS.md"],
  "mcp": {
    "mempalace": {
      "type": "local",
      "command": ["mempalace-mcp"],
      "enabled": true
    }
  }
}
```

> Note: `identity.txt` is NOT listed in `instructions` — the plugin injects it automatically. It is also NOT in the `provider` block or `permission` block — those are optional and depend on your model setup.

### 5. Alternative: Model-driven memory (without autoInjectContext)

If you prefer the model to search MemPalace on its own via AGENTS.md (requires good model tool-use discipline), set `autoInjectContext` to `false` or omit the file:

```json
{
  "autoInjectContext": false
}
```

#### AGENTS.md for this mode

Create `~/.config/opencode/AGENTS.md`:

```markdown
# Memory & Knowledge instructions

## CRITICAL: You MUST follow these steps BEFORE every response.

### Step 1 — Search MemPalace
Call `mempalace_mempalace_search` with the user's question or key topics as query. Get the top 5-10 most relevant memory drawers.
**This is mandatory. Never skip this step. No exceptions.**

### Step 2 — Query Knowledge Graph
Call `mempalace_mempalace_kg_query` for entity "user". Then filter the returned facts.

### Step 3 — Record Knowledge Graph facts
After responding, call `mempalace_mempalace_kg_add` for any new facts.

### Naming reminder
All MemPalace tools use the prefix `mempalace_mempalace_*` (not `mempalace_*`).
```

And keep `"~/.mempalace/identity.txt"` in `instructions` in opencode.json since the plugin won't inject it.

#### Comparison

| Feature | **Auto-inject (Recommended)** | Model-driven (alternative) |
|---------|:-:|:-:|
| Memory search | Plugin injects automatically | Model calls `mempalace_search` |
| Identity | Plugin injects automatically | Via `instructions: ["identity.txt"]` |
| AGENTS.md | Minimal (KG only) | Full (search + KG) |
| Depends on model discipline | No | Yes |

```bash
# Install (requires mempalace>=3.3.5 for HNSW corruption fix)
uv tool install "mempalace>=3.3.5"
# or
pipx install "mempalace>=3.3.5"

# Create palace
mempalace init ~/opencode-memory

# Configure MCP
mempalace mcp
```

The `mempalace mcp` command gives you the exact MCP setup string for your configuration.

---

## What happens after installation (auto-inject mode)

```
You ask a question
  → Plugin hooks into `experimental.chat.messages.transform`
  → Injects your identity + relevant memories from MemPalace
  → Model sees context without having to search

The model responds
  → Plugin detects the response is complete
  → Saves the conversation to MemPalace (flat export, no hardcoded wings)
  → Model records KG facts via MCP tools (mandatory per AGENTS.md)

Next time you ask
  → Plugin finds the previous memory → injects it automatically
  → The cycle continues, memory grows
```

---

## What gets saved

Every turn (question + answer) is saved as a drawer in MemPalace. No forced categorization — MemPalace's own mining handles organization. The model can optionally record KG facts (decisions, milestones, preferences) during conversation via MCP tools.

---

## Architecture

```
                 ┌──────────────────────────────┐
                 │         OpenCode              │
                 │                               │
  User msg ─────►│  experimental.chat.messages   │
                 │  .transform hook              │
                 │    ↓                          │
                 │  Injects identity + memories  │
                 │  (autoInjectContext: true)    │
                 │    ↓                          │
                 │  Model sees context → answers │
                 │    ↓                          │
  Answer done ──►│  chat.message + session.idle  │
                 │    ↓                          │
                 │  Query OpenCode DB            │
                 │  since last sync              │
                 │    ↓                          │
                 │  Export → flat text files     │
                 │    ↓                          │
                 │  mempalace mine (async)       │
                 │  single serialized call       │
                 └──────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────────────┐
                 │      MemPalace            │
                 │  ~/opencode-memory/       │
                 │  Vector DB + KG           │
                 └──────────────────────────┘
                            ▲
                            │
                 ┌──────────────────────────┐
                 │  Model (via AGENTS.md)    │
                 │  Records KG facts:       │
                 │  kg_add / kg_invalidate  │
                 └──────────────────────────┘
```

---

## Relevant files

| File | Purpose |
|---|---|
| `~/.config/opencode/opencode.json` | OpenCode config with plugin + MCP |
| `~/.config/opencode/AGENTS.md` | Tells the model to manage KG facts |
| `~/.mempalace/plugin-config.json` | Plugin config (`autoInjectContext`) |
| `~/.mempalace/identity.txt` | Your identity (injected by plugin) |
| `~/.mempalace/config.json` | MemPalace config (palace path) |
| `~/.mempalace/knowledge_graph.sqlite3` | Knowledge Graph (structured facts) |
| `~/opencode-memory/` | MemPalace vector DB (all drawers) |
| `~/.mempalace/sync_state.json` | Last sync state |

---

## Install from npm

```json
{
  "plugin": ["opencode-mempalace-persistence"]
}
```

## Local development

```json
{
  "plugin": ["/path/to/opencode-mempalace-persistence/dist/index.js"]
}
```

## Debug logging

```bash
export OPENCODE_MEMPALACE_DEBUG=1
```

When set, the plugin writes a debug log to `/tmp/opencode-mempalace.log`.

---

## License

MIT
