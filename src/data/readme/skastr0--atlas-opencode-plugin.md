# atlas

**Deterministic knowledge base indexer for AI agents**

Generates multi-resolution markdown indexes of knowledge bases, solving the "AI doesn't know what it knows" problem through cheap, deterministic, static analysis.

## Status

Experimental. `atlas` is useful enough to inspect and try, but command behavior, generated view formats, plugin surfaces, and release channels may change.

The official crates.io package is `agent-atlas`, and the installed command is `atlas`.

## The Problem

AI agents working with knowledge bases (folders of markdown, PDFs, notes) face a chicken-and-egg problem: they need to know what exists before they can effectively search, but they can't search without knowing what to look for.

Existing solutions (embeddings, auto-memories, RAG) optimize for retrieval *given a query*, but don't solve the fundamental **discovery problem**.

## The Solution

`atlas` creates a **persistent, human-readable atlas** of your knowledge base:

- **ROOT_ATLAS.md** — Top-level map with folder signatures and key files
- **Per-folder INDEX.md** — Detailed listings with snippets and top terms
- **TERMS.md** — Concept-to-file mapping for topic navigation

The atlas is:
- **Deterministic** — No LLM, no randomness, fully reproducible
- **Incremental** — Only reprocesses changed files
- **Portable** — Plain files, works with any AI tool
- **Fast** — Sub-second for unchanged corpora

## Quick Start

```bash
# Install from crates.io
cargo install agent-atlas

# Or install from a local checkout for development
cargo install --path .

# Initialize in your knowledge base
cd /path/to/your/kb
atlas init

# Build the index
atlas build

# View the atlas
cat .atlas/views/ROOT_ATLAS.md
```

## Commands

```
atlas init     # Initialize .atlas directory
atlas scan     # Scan for changes (fast fingerprint check)
atlas build    # Build/update index and generate views
atlas search   # Lexical search with deterministic ranking and highlights
atlas doctor   # Report issues (extraction failures, stale cache)
atlas clean    # Remove cached data
```

## Search

`atlas search` stays lexical and deterministic. Results are ranked by relevance score descending,
then by path ascending for exact score ties.

```bash
# Human-readable output with one excerpt per hit
atlas search programming --path alpha --type markdown --limit 5

# Stable JSON envelope with matched fields, reasons, and highlight payloads
atlas search programming --json

# Include raw Tantivy explanation trees without changing the default JSON shape
atlas search programming --json --explain
```

## What Gets Indexed

For each file, `atlas` extracts:

- **Title** — First heading or derived from filename
- **Snippet** — First paragraph (~400 chars)
- **Top terms** — TF-IDF weighted distinctive words
- **Top phrases** — Frequent bigrams and trigrams
- **Links** — Internal links, external URLs, citations (DOI, arXiv, ISBN)
- **Word/char count** — For quick size estimates

Across the corpus:

- **Global term frequencies** — Which terms are distinctive
- **Folder signatures** — Top terms/phrases per folder
- **Cross-references** — Term-to-file and phrase-to-file mappings

## Supported File Types

By default, `atlas` indexes:

- Markdown (`.md`)
- Plain text and notes (`.txt`, `.rst`, `.org`)
- PDF (`.pdf`) — via `pdftotext` (Poppler)
- Rust (`.rs`)
- TypeScript / TSX (`.ts`, `.tsx`)
- JavaScript / JSX (`.js`, `.jsx`, `.mjs`, `.cjs`) — using the same code extractor as TypeScript/TSX when possible
- Common config/text files (`.json`, `.yml`, `.yaml`, `.toml`, `.sh`, `.sql`) — plaintext fallback

Structured formats such as Markdown and code get richer extraction (headings, symbols, links) where supported. Config-style files still contribute snippets and terms through plaintext extraction.

## Configuration

Edit `.atlas/config.toml`:

```toml
[scan]
ignore = [".git", ".atlas", "node_modules", "__pycache__", "*.pyc", ".DS_Store"]
include_extensions = [
  "md",
  "txt",
  "pdf",
  "rst",
  "org",
  "rs",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "yml",
  "yaml",
  "toml",
  "sh",
  "sql",
]

[extract]
max_file_size = 10000000  # 10MB
snippet_length = 400

[analyze]
top_terms = 20
top_phrases = 10
min_term_length = 3
max_term_length = 25
max_digit_ratio = 0.4
min_df = 2
max_df_ratio = 0.5

[render]
atlas_folder_depth = 3
atlas_max_files_per_folder = 10
```

## PDF Support

PDF extraction requires `pdftotext` from Poppler:

```bash
# macOS
brew install poppler

# Ubuntu/Debian
apt install poppler-utils

# Fedora
dnf install poppler-utils
```

## Use with AI Agents

The generated markdown files are designed to be loaded as context:

1. **Always-on context**: Include `ROOT_ATLAS.md` in every conversation
2. **On-demand**: Load folder `INDEX.md` or `TERMS.md` when exploring specific topics
3. **Deep dive**: Reference specific file cards when needed

Example agent instruction:
```
You have access to the knowledge base atlas in .atlas/views/ROOT_ATLAS.md.
Use it to understand what exists before searching. When exploring a topic,
check the relevant folder INDEX.md for detailed file listings.
```

## Plugins

Atlas also ships optional npm packages for agent runtime plugins:

- `@skastr0/atlas-codex-plugin` — Codex lifecycle hooks that initialize Atlas and refresh changed indexes after edit tools run.
- `@skastr0/atlas-opencode-plugin` — OpenCode event plugin that initializes Atlas and debounces changed-only rebuilds after file edit events.

Both plugins expect the `atlas` binary to be available on `PATH`.

The CLI crate and plugin packages are released with the same version. See [docs/publishing.md](docs/publishing.md) for the publishing and versioning strategy.

## Project Status

**Phase 1 (Complete):** Scaffold, CLI, configuration, types
**Phase 2 (In Progress):** Text extraction, analysis pipeline
**Phase 3 (Planned):** Global aggregation, view rendering
**Phase 4 (Planned):** Doctor diagnostics, polish

## Building from Source

```bash
# Development build
cargo build

# Release build (optimized, stripped)
cargo build --release

# Install locally
cargo install --path .
```

Install from crates.io with:

```bash
cargo install agent-atlas
```

## Verification

```bash
cargo test --all-features
cargo package --list
cargo publish --dry-run --locked
```

The GitHub Actions CI workflow runs tests, package file-list inspection, and package verification. The protected release workflows publish the crate and npm plugins from the same `v*` version tag so the installable `atlas` binary and agent plugins stay version-aligned. The crate workflow runs the publish dry-run before any real upload, then uses crates.io trusted publishing to request a short-lived publish token through GitHub Actions OIDC. The npm plugin publish workflow uses npm trusted publishing for the Codex and OpenCode packages. Real package publication is gated by the protected `release` environment and requires explicit maintainer approval.

## Contributing And Support

This is an issues-first, solo-maintained project. Reproducible bugs, documentation corrections, and scoped proposals are the best contribution path. See `CONTRIBUTING.md` and `SUPPORT.md` for boundaries and expectations.

## Security

Do not report suspected vulnerabilities in public issues. Use the private process described in `SECURITY.md`.

## License

MIT
