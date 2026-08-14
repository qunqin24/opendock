# codebase-graph

A standalone tool that gives AI coding agents a **live, token-efficient structural map** of a codebase — injected into the system prompt on every LLM call, updated in real-time as files change.

**Zero API keys. Zero network calls. Fully offline. MIT licensed.**

---

## The Problem

Coding agents waste significant tokens and latency exploring codebases they don't understand. They grep, open files, scan directories — all to build a mental model that could have been handed to them upfront.

## The Solution

A ~2-5K token compressed map of the entire codebase — modules, symbols, type hierarchies, dependencies — with file paths and line numbers. Always current. Injected invisibly into the system prompt before every LLM call.

The agent starts every turn knowing:
- What modules exist and what they contain
- Every important type and its shape
- How types relate (inheritance, composition)
- Exact file paths and line numbers (updated on every file save)
- External dependencies and their versions

---

## Quick Start

```bash
# Install the CLI
pip install codebase-graph

# Generate .codebase.md for your project
codebase-graph ./my-project

# Watch mode — keep .codebase.md updated as you edit files
codebase-graph --watch --dir ./my-project
```

### With OpenCode

```bash
# Install the OpenCode plugin
npm install -g @broskees/opencode-codebase-graph
```

Add to your `opencode.json`:

```json
{
  "plugin": ["@broskees/opencode-codebase-graph"]
}
```

That's it. The plugin spawns `codebase-graph --watch` in the background and injects the structural map into the system prompt on every LLM call — for all providers.

---

## Installation

### CLI Tool (Python)

```bash
pip install codebase-graph
```

**Requirements:**
- Python 3.11+
- Git (the project directory must be a git repository)

### From Source

```bash
git clone https://github.com/broskees/codebase-graph.git
cd codebase-graph
pip install -e .
```

### Dependencies

- **[Kit](https://github.com/cased/kit)** (cased-kit) — tree-sitter based symbol extraction
- **watchfiles** — Rust-backed, cross-platform file watcher
- **pathspec** — gitignore-style pattern matching

---

## CLI Usage

```bash
# Basic: generate .codebase.md in the project root
codebase-graph ./my-project

# Watch mode: regenerate on every file change
codebase-graph --watch --dir ./my-project

# Custom output path
codebase-graph ./my-project --output /tmp/my-map.md
codebase-graph ./my-project -o /tmp/my-map.md

# Verbose logging
codebase-graph -v ./my-project

# Version info
codebase-graph --version
```

### Arguments

| Argument | Description |
|----------|-------------|
| `path` (positional) | Project directory to index |
| `--dir` | Alternative to positional path argument |
| `--watch` | Watch mode: keep `.codebase.md` updated on file changes |
| `--output`, `-o` | Custom output file path (default: `<project>/.codebase.md`) |
| `--verbose`, `-v` | Enable verbose/debug logging |
| `--version` | Show version and exit |

---

## OpenCode Plugin

The OpenCode plugin reads `.codebase.md` fresh on every LLM call and injects it into the system prompt. It works with all providers (Anthropic, OpenAI, Copilot OAuth, local models — everything).

### Setup

1. Install the CLI tool and the plugin:

```bash
pip install codebase-graph
npm install -g @broskees/opencode-codebase-graph
```

2. Add to your `opencode.json`:

```json
{
  "plugin": ["@broskees/opencode-codebase-graph"]
}
```

3. The plugin automatically:
   - Spawns `codebase-graph --watch` as a background process
   - Reads `.codebase.md` fresh on every LLM call
   - Pushes the structural map into the system prompt

### How It Works

The plugin uses OpenCode's `experimental.chat.system.transform` hook, which fires **before every single LLM call** for **all providers**. It reads the latest `.codebase.md` from disk and pushes it onto `output.system[]`.

```typescript
import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync } from "fs"
import { join } from "path"
import { spawn } from "child_process"

export const CodebaseGraph: Plugin = async ({ directory }) => {
  const briefingPath = join(directory, ".codebase.md")

  spawn("codebase-graph", ["--watch", "--dir", directory], {
    stdio: "ignore", detached: false,
  })

  return {
    "experimental.chat.system.transform": async (_incoming, output) => {
      try {
        output.system.push(readFileSync(briefingPath, "utf-8"))
      } catch { /* file doesn't exist yet */ }
    },
  }
}
```

That's the entire plugin (~25 lines).

---

## Output Format

The output is a Markdown file with prompt framing wrapping a TOON (Token-Oriented Object Notation) codeblock:

```markdown
## Live Codebase Map

The following is a **real-time structural map** of this codebase. It was
regenerated moments ago and reflects the current state of all files on disk.

All file paths and line numbers are accurate right now. When you edit a file,
this map updates before your next turn.

Use this map to navigate directly to the right files and line numbers without
searching. Trust these locations — they are current.

​```toon
codebase:
  name: my-project
  languages[2]: typescript,python
  last_indexed: 2026-02-15T21:15:00Z

modules[3]{name,path,key_types,depends_on}:
  auth,src/auth,"User|Session|Credentials","database|config"
  orders,src/orders,"Order|OrderItem|OrderStatus","auth"
  database,src/database,DatabaseClient,

symbols[8]{fqn,kind,file,line,signature}:
  src/auth/models::User,interface,src/auth/models.ts,1,export interface User {
  src/auth/login::login,fn,src/auth/login.ts,3,"export async function login(creds: Credentials): Promise<Session> {"
  ...

hierarchies[2]{symbol,relationship,target,file,line}:
  src/orders/types::Order,contains,OrderItem,src/orders/types.ts,18
  ...

dependencies[4]{name,version,category}:
  express,^4.18.2,runtime
  typescript,^5.4.0,dev
  ...
​```
```

### TOON Schema

| Section | Fields | Description |
|---------|--------|-------------|
| `codebase:` | name, languages, last_indexed | Project metadata |
| `modules[N]{...}` | name, path, key_types, depends_on | Directory-based module groupings |
| `symbols[N]{...}` | fqn, kind, file, line, signature | Functions, classes, interfaces, etc. |
| `hierarchies[N]{...}` | symbol, relationship, target, file, line | Type relationships (extends/implements/contains) |
| `dependencies[N]{...}` | name, version, category | External deps from manifest files |

### Why TOON

TOON saves 40-60% tokens vs JSON for tabular data by declaring field names once per table. The Markdown wrapper provides prompt framing that tells the model this is live data, not stale documentation. Total output is typically ~2-5K tokens for a substantial codebase.

---

## Supported Languages

| Language | Extensions | Symbol Types |
|----------|------------|-------------|
| TypeScript | `.ts`, `.tsx` | interfaces, classes, functions, methods, enums |
| JavaScript | `.js`, `.jsx` | classes, functions, methods |
| Python | `.py` | classes, functions, methods |

More languages (Rust, Go, etc.) are supported by Kit and planned for future releases.

## Supported Manifests

| File | Dependencies |
|------|-------------|
| `package.json` | dependencies, devDependencies |
| `pyproject.toml` | project.dependencies, optional-dependencies, tool.*.dev-dependencies |

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                   codebase-graph                      │
│                                                       │
│  ┌────────────┐   ┌──────────┐   ┌────────────────┐   │
│  │ Watcher    │ → │ Kit      │ → │ Graph Builder  │   │
│  │(watchfiles)│   │(symbols) │   │(cluster, rels) │   │
│  └────────────┘   └──────────┘   └───────┬────────┘   │
│                                          │            │
│                                 ┌────────▼────────┐   │
│                                 │  .codebase.md   │   │
│                                 │  (md + toon)    │   │
│                                 └────────┬────────┘   │
└──────────────────────────────────────────┼────────────┘
                                           │
                               ┌───────────▼───────────┐
                               │   OpenCode Plugin     │
                               │                       │
                               │ Reads .codebase.md    │
                               │ fresh on EVERY LLM    │
                               │ call. Pushes onto     │
                               │ output.system[]       │
                               └───────────────────────┘
```

### Project Structure

```
codebase-graph/
├── src/
│   ├── cli.py                  # CLI entry point
│   └── core/
│       ├── parser.py           # Kit wrapper for symbol extraction
│       ├── graph.py            # Module clustering, hierarchy inference
│       ├── writer.py           # Markdown + TOON serialization
│       ├── manifest.py         # package.json, pyproject.toml parsing
│       └── watcher.py          # File watcher, filtering, incremental pipeline
├── plugins/
│   └── opencode/               # OpenCode plugin (~25 lines TS)
│       └── index.ts
├── tests/                      # 304 tests
├── pyproject.toml
├── LICENSE                     # MIT
└── README.md
```

---

## Performance

| Metric | Budget | Actual |
|--------|--------|--------|
| Cold index (200 files, ~10K LOC) | < 1 second | ~15-50ms |
| Incremental update (single file) | < 50ms | ~5-15ms |
| Output size (200 files) | ~2-5K tokens | ~2-4K tokens |

### Incremental Update Pipeline

```
File saved to disk
  → Watcher detects change (watchfiles, ~1ms)
  → Content hash compared — skip if unchanged
  → Kit re-parses changed file(s) (<10ms per file)
  → Rebuild affected graph sections
  → Re-serialize .codebase.md
  → Atomic write to disk
  → Next LLM call reads fresh file via plugin hook
```

---

## File Ignore Strategy

Priority order:
1. **Hardcoded defaults** — `node_modules`, `dist`, `target`, `.venv`, `__pycache__`, `build`, `out`, `.next`, `coverage`, `.git`
2. **`.gitignore`** — always respected
3. **`.codebasegraphignore`** — optional user overrides (same syntax as `.gitignore`)

Binary files, non-source files, and unsupported extensions are automatically excluded.

---

## Design Principles

1. **Offline first** — no API keys, no network calls
2. **Fast** — cold index under 1 second, incremental under 50ms
3. **Live** — map updates before the next LLM call
4. **Invisible** — system prompt injection via plugin hook
5. **Schema is the contract** — TOON schema is stable; parser backends are swappable
6. **Respect conventions** — `.gitignore`, manifest files
7. **Provider-agnostic** — works with all LLM providers

---

## License

MIT
