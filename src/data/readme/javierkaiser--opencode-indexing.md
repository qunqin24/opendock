# opencode-indexing

[![ci](https://github.com/Javierkaiser/opencode-indexing/actions/workflows/ci.yml/badge.svg)](https://github.com/Javierkaiser/opencode-indexing/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node: >=22.6](https://img.shields.io/badge/node-%3E%3D22.6-brightgreen.svg)](https://nodejs.org)

OpenCode plugin that adds **semantic code search** by reusing the code index created by [Kilo Code](https://kilo.ai) and maintaining its **own independent index** (embedded LanceDB by default, or Qdrant if you prefer), so search keeps working even when Kilo isn't installed, is disabled, or its index is stale.

## TL;DR

**Why it exists.** A semantic code index is expensive to build — every chunk is
a call to an embedding API — and it only lasts as long as the tool that made it.
Kilo Code already builds one, which is worth having. But building your own means
paying for it again, and leaning on Kilo's means your search breaks the day
Kilo is uninstalled, disabled, or stale. Both are bad enough on their own.

**What it does instead.** It *reads* Kilo's index and never writes to it, then
keeps an independent index of its own next to it. Every search queries both and
merges the results, preferring whichever is fresher. If you already have a Kilo
index, its vectors are copied across **without re-embedding** — zero API calls —
and you only ever pay to index the files that changed since.

**What it is for.** Finding code by what it *does* rather than what it is
*called*, in a search that keeps working whether or not the tool that built the
index is still installed.

## Install

### With the OpenCode CLI (recommended)

```bash
opencode plugin add @javierkaiser/opencode-indexing
```

That is the whole install. OpenCode downloads the package into its own cache and
records it in the global `plugins` array, and it loads both halves of the plugin:
the server side (`index.ts`, which registers the tools) and the terminal UI
(`tui.ts`, which adds the prompt-footer indicator and the `/indexing` page).

Update and remove it with the same command family:

```bash
opencode plugin check     # is there a newer version?
opencode plugin update    # install it
opencode plugin remove @javierkaiser/opencode-indexing
```

`plugin add` installs the plugin but knows nothing about its tools, so it does
not write permission rules. Add this one to `opencode.json` to keep the host
asking before the only tool that writes your settings file:

```jsonc
{
  "permissions": [
    { "action": "indexing_config_set", "resource": "*", "effect": "ask" }
  ]
}
```

The other six tools only read. OpenCode's base policy already allows everything
(`{ "action": "*", "resource": "*", "effect": "allow" }`), so they need no rule;
write them out only if you want to tighten the set.

### One command, permissions included

To skip the manual rule:

```bash
npx @javierkaiser/opencode-indexing
```

The installer runs `opencode plugin add`, writes the permission rules, and
restarts the service. It picks its strategy from where it runs: from an installed
copy — an npx cache, an unpacked tarball — it installs the published package;
from a checkout it installs your working tree instead, so edits take effect on
restart with no publish in between. It prints which one it chose.

| Flag | Effect |
| --- | --- |
| `--package [spec]` | Install the published package (default spec `@latest`) |
| `--local` | Copy this directory into the config dir (development) |
| `--skip-deps` | `--local` only: copy the files, install no dependencies |
| `--no-restart` | Do not restart the service |

`install.sh` and `install.ps1` are thin wrappers over it; PowerShell also accepts
`-Local`, `-Package`, `-Spec`, `-SkipDeps` and `-NoRestart`.

`--package` deletes any copied plugin it finds: both sources define the same
plugin id and the config directory is scanned automatically, so leaving both
would load the plugin twice.

If no package manager is available, a `--local` install still copies the files
and the plugin runs with reduced features (line chunker instead of tree-sitter,
no LanceDB).

### Manual

To manage the directory yourself, point `opencode.json` at it. Relative paths
resolve from the config file containing the entry:

```jsonc
{
  "plugins": ["./plugins/opencode-indexing"]
}
```

## How it works

```
OpenCode ──► indexing_search ──┬──► Kilo's index (read-only)      Qdrant ws-*  ·  Kilo LanceDB
                               └──► own index (read/write)        own LanceDB (default)  ·  Qdrant oc-*
```

- **Read-only reuse**: the plugin computes the same collection name Kilo uses (`ws-` + sha256 of the workspace path, first 16 hex chars), validates the embedding profile stored in the metadata point, and queries with an embedding from the *same* model (e.g. Mistral `codestral-embed-2505`, 1536d).
- **Import without re-embedding**: `indexing_build` (or `indexing_import`) can copy vectors + chunks from an existing Kilo index — both its Qdrant collections and its local LanceDB database — at **zero embedding cost**, then incrementally index only the delta.
- **Own index**: manifest-based incremental indexer (per-file sha256) writing to `oc-*` collections or an embedded LanceDB database, using the same chunk payload shape as Kilo (`filePath`, `fileHash`, `codeChunk`, `startLine`, `endLine`, `segmentHash`, `pathSegments`).
- **Merge**: results from Kilo + own are merged; own (fresher) hits win on overlap; ghost hits (deleted files) are filtered out.

## Tools (namespace `indexing`)

| Tool | Purpose |
| --- | --- |
| `indexing_search` | Semantic search across Kilo's index + own index. `{ query, path? }`. Ends with a one-line index status |
| `indexing_status` | Backends, Kilo sources available for import, both indexes, freshness, recommendation |
| `indexing_config` | Effective configuration: backend, provider/model, credentials (masked), search and behavior settings, settings file, Kilo sources. Read-only |
| `indexing_config_set` | Change one setting and persist it. `{ key, value }`. Refuses credentials |
| `indexing_refresh` | Incremental update of the own index (new/changed/deleted files only) |
| `indexing_build` | Build the own index: imports from Kilo when compatible, otherwise embeds from scratch. `{ rebuild?, skipImport? }` |
| `indexing_import` | Import a specific Kilo source without re-embedding. `{ source?, rebuild? }` |

## Settings

Three surfaces write the same file through the server plugin's RPC; a fourth, read-only one reports it.

### `/indexing-config` — slash command

Registered as a server command, so the host lists it in every client. Whether typing it *runs* it depends on the client: the terminal TUI and the Desktop app submit the line to the model instead of dispatching the command, so there it does nothing. To read the configuration from those, ask the assistant — it calls `indexing_config`, which returns the same report. The subcommands below apply wherever the command is dispatched.

| Subcommand | Purpose |
| --- | --- |
| `/indexing-config` or `show` | Print the effective configuration and any warnings |
| `/indexing-config set <key>=<value>` | Change one setting. `set <key>` alone prints its current value; `set <key>=reset` reverts it |
| `/indexing-config test [target]` | Test connectivity: `qdrant`, `lancedb`, `provider`, `kilo` |
| `/indexing-config import [source]` | Import vectors from a Kilo source without re-embedding |
| `/indexing-config help` | List keys and subcommands |

Settable keys (case-insensitive):

| Key | Meaning |
| --- | --- |
| `vectorstore` | `qdrant` or `lancedb` |
| `qdranturl` / `qdrantapikey` | Qdrant connection |
| `lancedbdirectory` | LanceDB directory for the own index |
| `provider` / `model` | Embedding provider and model |
| `mistralkey` / `openaikey` / `geminikey` / `voyagekey` / `openrouterkey` | API keys for those providers |
| `ollamaurl` | Ollama base URL |
| `openaicompatibleurl` / `openaicompatiblekey` | OpenAI-compatible endpoint |
| `importfromkilo` | `true` to import from Kilo when building, `false` to start from scratch |
| `autorefresh` | Refresh the own index automatically on search |
| `enabled` | Master switch. `false` pauses writing and refreshing; search keeps reading Kilo's index |
| `searchmaxresults` | Result cap per search |
| `embeddingbatchsize` | Embedding batch size |
| `searchminscore` | Minimum similarity score |
| `fileextensions` | Extensions to index |

### `/indexing` — settings page (terminal TUI)

Opens a full settings page: current configuration, detected Kilo sources, and the index actions. Keyboard-driven through the host keymap:

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move between actions |
| `enter` | Run the selected action |
| `e` | Edit settings (opens the dialog editor) |
| `r` | Reload status |
| `esc` | Close the page |

### Prompt-footer indicator

The terminal footer shows whether the current workspace is indexed, in one glyph:

| Indicator | Meaning |
| --- | --- |
| `● indexed` | Own index exists and is complete |
| `◐ index stale` | Own index exists but needs a refresh |
| `○ not indexed` | Nothing indexed yet, but Kilo's index is readable |
| `✕ no index` | Neither index is available for this workspace |
| `⏸ paused` | Indexing paused: nothing is written or refreshed |
| `!` / `◌` | The status could not be read / is still loading |

*Indexing: start, pause or resume indexing* in the command palette — or `/indexing-config set enabled=false` — controls it. The footer is a status line only: the host's `prompt.footer` slot exposes no interaction surface, so it is not clickable. Pausing leaves `indexing_search` working (it still reads Kilo's index), but `indexing_build`, `indexing_refresh`, `indexing_import` and auto-refresh refuse to write until you resume. The command has a stable id, so a key can be assigned in `cli.json`.

The indicator is terminal-only, and that is a host limitation rather than a missing feature. Every slot that renders status (`prompt.footer`, `sidebar.content`, `session.panel`, …) belongs to a **CLI plugin**, and the Desktop app does not load CLI plugins at all — its palette shows none of this plugin's entries, and it has no status area under the prompt. A server plugin has no UI surface of its own: the SDK's toast lives in the TUI context, and plugins can only subscribe to events, never publish one.

What works in every client instead is the tool layer:

- **Status** — every `indexing_search` result ends with a line like `Index: ◐ index stale · own 2.2k pts · /path/to/project`, using the same glyphs as the footer. It costs no extra message and adds no noise: a reader who ignores it sees exactly the output they saw before. It refreshes on every search.
- **Read** — `indexing_config`.
- **Change** — `indexing_config_set { key, value }`, validated by the same rules as `/indexing-config set`. Credentials are refused: a tool call is recorded in the conversation, and the settings file never stores keys in plain text.

The index-state vocabulary is shared, so the footer and the chat line can never describe the same state differently.

### Editing settings

Settings are edited in a dialog-based flow, reachable three ways:

- Press `e` from the `/indexing` page.
- The command **Indexing: settings (dialogs)** in the command palette (a manual escape hatch if the page ever fails to render).
- Automatically: if the host has no JSX runtime, `/indexing` opens this flow instead of the page.

`indexing_config` (the tool) reports the same configuration as `/indexing-config` and works in every client, because tools run server-side, and `indexing_config_set` changes a value the same way. Together they are the whole configuration surface for clients that do not dispatch slash commands.

Configurable from all three:

- **Vector store** for the own index: Qdrant or LanceDB.
- **Qdrant URL + API key** (local or remote) with connection test.
- **LanceDB directory** with availability test.
- **Embedding provider/model** (mistral, openai, ollama, openai-compatible, gemini, voyage, openrouter) and **API key**. The model is chosen from a catalog rather than typed blind. The model is chosen from a catalog rather than typed blind.
- **Import from Kilo** toggle with live source detection ("Qdrant ws-… (31,261 pts) · LanceDB …").
- **Auto-refresh on search** toggle.
- Build / refresh / import actions and a status summary.

### Embedding providers

All seven have an adapter. Every model below is in the catalog, which is what
supplies the dimension, the score threshold and the input ceiling; a model that
is not listed still works, and its dimension is probed from the provider on
first use. See the next section for how far each one has actually been tested.

| Provider | Default model | Also in the catalog | Input ceiling |
| --- | --- | --- | --- |
| `mistral` | `codestral-embed-2505` | `codestral-embed`, `mistral-embed` | 8,192 |
| `openai` | `text-embedding-3-small` | `text-embedding-3-large`, `text-embedding-ada-002` | 8,192 |
| `voyage` | `voyage-code-3` | **`voyage-code-4`**, `voyage-4`, `voyage-4-large`, `voyage-4-lite`, `voyage-3-lite` | **32,000** |
| `gemini` | `gemini-embedding-001` | **`gemini-embedding-2`**, `text-embedding-004`, `embedding-001` | 2,048 (001) / 8,192 (2) |
| `openrouter` | `openai/text-embedding-3-small` | `openai/text-embedding-3-large`, `google/gemini-embedding-2-preview` | 8,192 |
| `ollama` | `nomic-embed-text` | `mxbai-embed-large`, `all-minilm`, `bge-m3` | 512 – 8,192 |
| `openai-compatible` | none | whatever your endpoint serves | probed |

#### Getting an API key (Mistral)

Mistral is the default provider and the only one tested end to end here, so it is
the shortest path to a working index. API access is enabled by default on a free
account — **no credit card** — with a usage limit that is enough to index a
repository.

1. Create an account at <https://console.mistral.ai> if you do not have one.
2. Open the **Studio** console and click **API Keys** in the left sidebar.
3. Click **Create new key**: give it a name, set an expiration date, and choose the
   connector access scope (*Shared connectors only* is enough for an API key).
4. Click **Create new key** and **copy the key right away** — it is shown once and
   cannot be retrieved later.

Then hand it to the plugin. The simplest way keeps the key out of any file:

```bash
export KILO_INDEX_MISTRAL_KEY=...          # Linux / macOS
# PowerShell: $env:KILO_INDEX_MISTRAL_KEY = "..."
```

Equivalently, set it from **`/indexing-config`** in any client or the `/indexing`
page in the terminal (the field is masked), or through the plugin's options in
`opencode.json` — see
[Configuration](#configuration-optional-opencodejson). Settings resolve in the
order *plugin options → `indexing.json` → environment → defaults*, so an
environment variable is overridden by anything set in the file or in the options.

To check the key before indexing:

```bash
curl -s https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $KILO_INDEX_MISTRAL_KEY" | head -c 200
```

A list of models means it works; a `401` means the key is wrong or the header is
missing.

#### How far each provider has actually been tested

Worth stating plainly, because "implemented" and "seen working" are not the
same claim and only one of them is safe to rely on.

| Provider | Against the real API | What that means |
| --- | --- | --- |
| `mistral` | **Yes** | Two inputs, 1536 dimensions, distinct vectors, ~680 ms |
| `openrouter` | **Partly** | The request reached the API and authenticated; it was refused by the key's own $0 spend limit, so the response parser is unverified |
| `ollama` | **No** | The local server was not running during the check |
| `openai`, `gemini`, `voyage`, `openai-compatible` | **No** | No credentials available; only mock-based tests |

The adapters for the last four were written from each provider's documentation
and tested against fixtures written alongside them, which means the tests encode
the same reading of the docs as the code. A wrong assumption about a field name
or a response shape would pass every test and fail on first use.

Three specific things this leaves open, in descending order of how quietly they
would fail:

- **Gemini's aggregation.** `gemini-embedding-2` returns a single aggregated
  vector for a plain list of inputs, where `gemini-embedding-001` returns one per
  input. The adapter wraps each input in its own `Content` to make both behave
  the same way, and a test asserts the count — but the test is against a fixture,
  not the model. If the wrapping is wrong, N inputs silently become one vector.
- **Voyage's response shape.** It is treated as OpenAI-shaped
  (`data[].embedding` with an `index`). This matches its published API reference
  and was not confirmed against the service.
- **Voyage and Ollama truncation.** Both are sent `truncation`/`truncate: false`
  so that an over-long chunk fails instead of being silently shortened. If a
  provider rejects that field rather than honouring it, indexing stops with an
  error rather than degrading — which is the intended direction to fail, but it
  is a guess about the field being accepted.

If you use one of these providers and it fails, the error message names the
provider and the endpoint; please report it, since this is the part of the
plugin most likely to be wrong.

Two things worth knowing before switching:

- **Model ids are namespaced per provider.** Changing provider clears the model
  so the new provider's default applies. A leftover id like
  `codestral-embed-2505` under `provider: "voyage"` would be sent to Voyage and
  rejected.
- **Changing the model invalidates the own index.** A different model means a
  different vector space, so the next build deletes the existing points and
  re-embeds the whole workspace. `indexing_status` warns with the point count
  *before* that happens. Re-embedding a repository is cheap — well under a
  couple of dollars at any paid provider — but a large one takes a while.

**Which models can import from Kilo.** Kilo's registry is mirrored entry for
entry, because an import is accepted only when provider, model id and dimension
match exactly. Models marked *ours* in the table above are not in Kilo's
registry and can never be imported; `indexing_config` says which is which. If
your Kilo index uses a different model, set the same provider and model here and
the import costs nothing.

Settings are stored in `~/.config/opencode/indexing.json` (plugin options → `indexing.json` → environment → defaults). Plugin options in `opencode.json` still work and take precedence. API keys are never written to `indexing.json` in plain text; set them through the environment or plugin options.

`~/.config/kilo/kilo.jsonc` is still read, and still supplies the embedding provider, model, dimensions and API keys — and it still says where *Kilo* keeps its index. It no longer decides where this plugin's own index is written; that stopped being coupled so that the default could actually take effect for people running Kilo. See [Where each index lives](#where-each-index-lives).

## Configuration (optional, `opencode.json`)

```jsonc
{
  "plugins": [
    { "package": "@javierkaiser/opencode-indexing", "options": {
      "vectorStore": "qdrant",
      "qdrantUrl": "http://localhost:6333",
      "importFromKilo": true,
      "autoRefresh": false,
      "ignoreKiloConfig": false
    }}
  ]
}
```

| Option | Meaning |
| --- | --- |
| `vectorStore` | `qdrant` or `lancedb` for the **own** index. Does not affect where an import reads from. |
| `qdrantUrl` / `qdrantApiKey` | Qdrant connection |
| `provider` / `model` / `dimension` | Embedding profile, overriding the resolved one |
| `importFromKilo` | Import a compatible Kilo index on build instead of re-embedding |
| `autoRefresh` | Refresh inline on search when few files changed |
| `enabled` | Master switch: when false the own index is neither written nor refreshed |
| `ignoreKiloConfig` | Stop reading `~/.config/kilo/kilo.jsonc` entirely |

`~/.config/kilo/kilo.jsonc` is read as a fallback for the embedding provider,
model, dimensions **and API keys**, which is what makes a free import possible:
the same model has to be used to reuse Kilo's vectors. Set `ignoreKiloConfig` to
`true` to cut that off, or override any single value with the options above, an
environment variable, or `~/.config/opencode/indexing.json` — in that order of
precedence, with plugin options winning.

### Environment variables

| Variable | Meaning |
| --- | --- |
| `KILO_INDEX_VECTOR_STORE` | `lancedb` (default) or `qdrant` for the own index |
| `KILO_INDEX_QDRANT_URL` / `KILO_INDEX_QDRANT_API_KEY` | Qdrant connection |
| `KILO_INDEX_LANCEDB_DIR` | Base directory for the own LanceDB stores |
| `KILO_INDEX_KILO_LANCEDB_DIR` | Override Kilo's LanceDB directory (import source) |
| `KILO_INDEX_MISTRAL_KEY`, `KILO_INDEX_OPENAI_KEY`, `KILO_INDEX_OPENAI_COMPATIBLE_URL`, `KILO_INDEX_OPENAI_COMPATIBLE_KEY`, `KILO_INDEX_OLLAMA_URL`, ... | Embedding credentials |

Word about data safety: Kilo's indexes (`ws-*` collections and its LanceDB directory) are **never modified**. Imports are copies.

## Requirements

- OpenCode v2 (plugin API `@opencode/plugin@2.x`).
- **For the own index: nothing to run.** The default store is embedded LanceDB
  (`@lancedb/lancedb@0.26.2`), so there is no server to start, no port to free and
  no container to keep alive.
- **A Qdrant server is only needed if you ask for it**, either by setting
  `vectorStore=qdrant` or because a Kilo index you want to import lives in Qdrant.
  In that case the default URL is `http://localhost:6333`.
- Embedding credentials compatible with the collection you search (the profile is read from the metadata point).

### Where each index lives

The own index and Kilo's index are independent, and each one is chosen on its
own:

| Index | Default | Configured by |
| --- | --- | --- |
| Own index | embedded LanceDB, under `~/.local/state/opencode-indexing/lancedb` | `vectorStore` |
| Kilo index (read-only) | whatever `kilo.jsonc` says | Kilo itself |

Kilo's `vectorStore` used to decide where this plugin's own index was written,
because both were read from the same setting chain. That is no longer the case:
Kilo decides where an import **reads from**, and your own index decides where it
**writes to**. If Kilo is on Qdrant and you have not set `vectorStore` yourself,
the own index still goes to LanceDB and `indexing_status` says so.

### Platform support for the embedded store

`@lancedb/lancedb` is a JavaScript wrapper around a native library, with one
prebuilt binary per platform and no WebAssembly fallback. The platforms it ships
a binary for are:

| Platform | `platform-arch` | Own index on LanceDB |
| --- | --- | --- |
| Windows x64 / arm64 | `win32-x64`, `win32-arm64` | yes |
| Linux x64 / arm64 (glibc and musl) | `linux-x64`, `linux-arm64` | yes |
| macOS Apple Silicon | `darwin-arm64` | yes |
| **macOS Intel** | `darwin-x64` | **no binary is published** |

On macOS Intel the default store cannot load, and installing it again will not
help. The plugin says so explicitly and asks you to pick Qdrant:

```
LanceDB is the default store for the own index but has no native binary for
darwin-x64. It cannot run on this platform and reinstalling will not change
that. Set vectorStore=qdrant explicitly in
~/.config/opencode/indexing.json to use a Qdrant server instead.
```

Set `vectorStore=qdrant` in `~/.config/opencode/indexing.json` (or run
`/indexing-config set vectorstore=qdrant`) to use a Qdrant server instead.

## Semantic search vs. code graphs (roadmap)

`opencode-indexing` implements **semantic (vector) search**. It is worth being
explicit about how it compares to **code-graph** tooling (call graphs, symbol
graphs, SCIP-style indexes), because they answer different questions and are
complementary:

| | Semantic index (this plugin) | Code graph |
| --- | --- | --- |
| Question it answers | "Where is the code that does something like X?" | "Who calls X? What breaks if I change it? Path from A to B?" |
| Signal | Meaning (embeddings over chunks) | Structure (symbols, `CALLS`, `DEFINES`, `IMPORTS` edges) |
| Strengths | Natural language, concepts without known identifiers, cross-language | Exact structural facts, multi-hop traversals, no similarity false positives |
| Weaknesses | "Similar" is not "relevant"; no notion of connections | Cannot find a concept with no known symbol; fragile on dynamic code |
| Cost profile | Embedding API + vector DB | Local parsing + small graph store |

We measured this rather than assuming it. [`bench/`](./bench) runs the same
real questions about code through four methods — word matching, symbol-name
lookup, this plugin's semantic search, and a fusion of the last two — over two
codebases of different languages, and counts how often each finds the right
file. The [report](./bench/results.md) opens with the numbers in plain language.
What it found:

- **Symbol-name lookup was the weakest of the four**, in both codebases. It only
  matches what things are *called*, so a question in ordinary words has little to
  grab onto.
- **Semantic search and plain word matching traded places.** On one codebase
  semantic won clearly (100% vs 76% found in the top 10); on the other they were
  close (60% vs 55%). Neither replaces the other.
- **Fusing semantic with symbol lookup was never worse than semantic alone**, and
  better on both: more files found on one codebase, a better position on the
  other.

One caveat that matters for reading that: the benchmark measures `codegraph
query`, the one subcommand that matches names. It does **not** measure what a
graph is actually good for — who calls what, what breaks if you change it,
paths between two places. Those are the graph's real strength and they are not
in the numbers above.

The broader consensus points the same way: use embeddings to find the entry node
by intent, then walk the graph for exact relationships. Cursor reported ~12.5%
retrieval-accuracy improvement combining semantic search with grep; Sourcegraph
layers semantic search over a SCIP graph; Aider uses tree-sitter + PageRank with
no embeddings at all for repo maps.

This plugin deliberately stays on the semantic side and coexists with grep/read
(see the tool descriptions and the bundled skill). A code-graph mode (tree-sitter
symbol/edge extraction into SQLite, exposed as `indexing_graph_*` tools that
chain after `indexing_search`) is a candidate for a future major version; the
tree-sitter infrastructure is already in place.

## Development

```powershell
npm install
node --test "test/*.test.ts"   # unit tests (Node 26 runs TS natively)

# CLI harness against the real environment:
node test/cli.ts status     --root .
node test/cli.ts search "database connection pooling" --root .
node test/cli.ts build      --root .            # import from Kilo when possible
node test/cli.ts import     --root . --source ws-43dfc9b3ee33fcfd
node test/cli.ts build      --vector-store lancedb --root .
```

## Acknowledgements

This plugin interoperates with the open-source [Kilo Code](https://github.com/Kilo-Org/kilocode) indexing format (MIT License, Copyright (c) 2026 Kilo Code). The line-based chunker and the tree-sitter queries are ports of Kilo Code's implementation. It also builds on [opencode](https://github.com/anomalyco/opencode) (MIT), [LanceDB](https://github.com/lancedb/lancedb) (Apache-2.0), [web-tree-sitter](https://github.com/tree-sitter/tree-sitter) (MIT), [tree-sitter-wasms](https://github.com/Gregoor/tree-sitter-wasms) (Unlicense) and [ignore](https://github.com/kaelzhang/node-ignore) (MIT).

Kilo Code is a trademark of its owners; this project is **unofficial and not affiliated** with Kilo Code or the OpenCode project.

## License

MIT (see `LICENSE`). Portions derived from Kilo Code and other third parties are
documented in `THIRD_PARTY_NOTICES.md`. This project is unofficial and not
affiliated with Kilo Code or OpenCode.
