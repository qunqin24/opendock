# opencode-semantic-search

Local-first semantic search plugin for [OpenCode](https://opencode.ai), with smart `grep` routing and incremental indexing.

## Quickstart

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- [OpenCode](https://opencode.ai)
- [ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`)
- Either [Ollama](https://ollama.com) or an OpenAI-compatible embedding API

### Install

**Option A — `bunx` (recommended after the package is on npm)**

Runs the same installer as `install.sh` from the published package (no clone):

```bash
# Global shim (~/.config/opencode/plugins) — default
bunx opencode-semantic-search@latest

# Project-local only (./.opencode/plugins)
bunx opencode-semantic-search@latest install --local
```

Other flags match `install.sh` (see below).

**Option B — Remote `install.sh` (curl)**

```bash
curl -fsSL https://raw.githubusercontent.com/jainprashul/opencode-semantic-search/main/install.sh | bash
```

Use `bash -s -- --local` after the pipe for a project-local shim instead of the default global install.

**Option C — Git clone**

```bash
git clone https://github.com/jainprashul/opencode-semantic-search.git
cd opencode-semantic-search

# Global (default): ~/.config/opencode/plugins
bash install.sh

# Project-local only: ./.opencode/plugins
bash install.sh --local
```

Common installer modes (clone or remote script):

```bash
# explicit global install (default)
bash install.sh --global

# project-local only
bash install.sh --local

# OpenAI embeddings instead of Ollama
bash install.sh --openai-key-env OPENAI_API_KEY --skip-ollama

# custom Ollama model
bash install.sh --ollama-model nomic-embed-text

# skip Ollama checks/model pull
bash install.sh --skip-ollama
```

The script installs dependencies, writes a plugin shim, optionally pulls the Ollama model, writes config, and runs integration self-tests when the test scripts are present (git clone); npm installs skip that step.

### Start

```bash
# Ollama users
ollama serve

# open your codebase
cd /path/to/your/repo
opencode
```

## Available tools

- `semantic_search(query, top_k?, threshold?, path?)`
- `grep(pattern|query, ...)` smart route: conceptual -> semantic, exact/regex -> `rg`
- `index_status()` health and coverage stats
- `reindex()` full index rebuild
- `diagnostic_bundle()` JSON support bundle (provider, index, routing history)

Optional **slash aliases** (`/sem-status`, `/sem-search`, etc.): add Markdown stubs under `.opencode/commands/` as described in [SETUP.md](SETUP.md#8-using-the-plugin-in-opencode). Each stub body is an LLM prompt that asks the assistant to call the matching tool.

## Verify it works

From this plugin repo:

```bash
bun run check
bun run test:integration
bun run diagnostic:bundle
```

Expected:

- `bun run check` exits successfully (no TypeScript errors).
- `bun run test:integration` prints JSON with `"ok":true` from both suites.
- `bun run diagnostic:bundle` prints one JSON bundle with provider health, index stats, DB path, and recent routing outcomes.

In OpenCode (after startup indexing):

- `index_status()` should report `provider_healthy: true`, `files_indexed > 0`, `total_chunks > 0`.
- `semantic_search("authentication flow")` should return JSON results with file paths and scores.
- `grep("auth retry flow")` should return scored semantic matches (`score=...`) when provider/index are healthy.

## Debugging pointers

- No semantic results: ensure embedder is reachable (`ollama serve` or valid OpenAI key) and run `reindex()`.
- `grep` behaving like plain text search: this is expected for exact/regex/single-token patterns.
- Wrong results after changing embedding model/dimensions: run `reindex()`.
- Persistent index issues: remove the project DB under `~/.cache/opencode/semantic-search/<project-hash>/embeddings.db`.

## Publishing (maintainers)

Bump `version` in `package.json`, then:

```bash
bun run typecheck
npm publish --access public
```

`prepublishOnly` runs `typecheck` automatically. The npm package name is [`opencode-semantic-search`](https://www.npmjs.com/package/opencode-semantic-search).

## Docs

- `docs/ARCHITECTURE.md` architecture, data flow, index lifecycle, smart grep routing
- `docs/CONFIG.md` full configuration reference + install script behavior
- `docs/DEBUGGING.md` logging/diagnostics, troubleshooting, and verification playbook
- `SETUP.md` extended setup walkthrough and notes
