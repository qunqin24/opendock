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

**Zero setup.** With no API key configured the plugin embeds locally: the package
ships a ~2 MB static model (potion-base-8M, 128 dimensions) that runs in plain
TypeScript in the same process. No network, no account, no service — and about
0.2 ms per chunk, so a full index of this repository takes seconds instead of
minutes. It is English-only; a configured cloud key still wins.

**If you never used Kilo.** `npx @javierkaiser/opencode-indexing --aio` is the
whole install: the published plugin, the codegraph companion, and a local-only
profile to match. It does not build the index — you start that when you want one.

## Install

### With npx (recommended)

```bash
npx @javierkaiser/opencode-indexing
```

This is the whole install: the installer runs `opencode plugin add`, writes the
permission rules, restarts the service, and, when you ask for it, also installs
and registers the companion `codegraph`
MCP. It picks its strategy from where it runs — from an npx cache or an
unpacked tarball it installs the published package, from a checkout it
installs your working tree instead — so edits take effect on restart with no
publish in between. It prints which one it chose.

Add `--with-codegraph` to install and register codegraph as part of the same run
(the flag is opt-in and only has effect in the published-package mode):

```bash
npx @javierkaiser/opencode-indexing --with-codegraph
```

| Flag | Effect |
| --- | --- |
| `--aio`, `--all-in-one` | All-in-one install for a machine without Kilo: implies `--package` and `--with-codegraph`, then writes a local profile (see below) |
| `--package [spec]` | Install the published package (default spec `@latest`) |
| `--local` | Copy this directory into the config dir (development) |
| `--skip-deps` | `--local` only: copy the files, install no dependencies |
| `--no-restart` | Do not restart the service |
| `--with-codegraph` | Install and register codegraph as a companion MCP (opt-in, `--package` only) |

### All-in-one (AIO)

If Kilo was never installed, `--aio` is the install with no decisions left in it:

```bash
npx @javierkaiser/opencode-indexing --aio
```

It implies `--package` and `--with-codegraph`: it installs the published plugin,
installs and registers codegraph, and writes a local profile to
`~/.config/opencode/indexing.json`:

```json
{
  "vectorStore": "lancedb",
  "provider": "local",
  "model": "potion-multilingual-128M",
  "dimension": 256,
  "autoRefresh": false,
  "searchKilo": false,
  "importFromKilo": false
}
```

`searchKilo` and `importFromKilo` are off because there is no Kilo index to read
from or copy. `dimension: 256` is written out rather than inferred: `kilo.jsonc`
is consulted before the model registry, so a dimension left behind by Kilo would
override the multilingual model's 256. `autoRefresh: false` is the other
deliberate one — the installer does not build the index, and this keeps search
from starting one on its own. The first build is yours to start: **Settings →
Indexing → Build**, `/indexing`, or `indexing_build`.

What the install does fetch is the model. After the restart it runs the plugin's
`settings.test` for `lancedb` and `provider`; the provider test downloads the
multilingual weights (~512 MB fp32, ~123 MB int8 on first use) and confirms they
produce 256 dimensions, so the first search is not the one that discovers a
missing or broken model. `--no-restart` skips that and leaves the download to
first use.

Existing keys and credentials in `indexing.json` are preserved: the profile is
merged into the file, not written over it, and a file that is not valid JSON is
left untouched with a warning. Plugin `options` in `opencode.json` still win over
the file, so an option that sets one of these keys takes precedence and the
installer says so. `--aio` is the published-package install and cannot be
combined with `--local`.

Running `--aio` again is safe. If the plugin is already installed — a `plugins`
entry in `opencode.json`, the copy at
`<config>/opencode/plugins/opencode-indexing`, a `javierkaiser.indexing` line in
`opencode plugin list` — or `indexing.json` already exists, the installer
applies no profile: it says what it found, leaves the file untouched, and skips
the `settings.test` model prefetch, so the multilingual weights are not
downloaded a second time. The rest of the install still runs: plugin
add/update, the codegraph registration, the permission rules and the service
restart.

If the plugin is already installed, change the profile from **Settings →
Indexing**; re-running the installer will not replace it. If only an
`indexing.json` exists (the plugin is not detected), back it up, remove it, and
run `--aio` again: with no file to protect, the installer writes the profile and
fetches the model.

### The codegraph companion

[CodeGraph](https://github.com/colbymchenry/codegraph) is a separate tool — a
local code-graph indexer exposed as an MCP server — and this plugin drives it
rather than reimplementing it. If it is not installed yet:

```bash
npm install -g @colbymchenry/codegraph
```

The package is scoped, and that matters: `codegraph` unscoped on npm is an
unrelated 2024 library with no CLI, so installing that name exits 0 and leaves
nothing on `PATH`.

Installing it is only half of it. `indexing_build` and `indexing_import` also
start the CLI for the workspace, so both indexes are built by the same action:
`codegraph init --yes` the first time a folder is seen, `codegraph sync`
afterwards. codegraph is a **companion, not a dependency** — with the CLI absent
nothing is spawned, no build fails, and no line is added to the output. Turn it
off with `/indexing-config set codegraph=false`, and see
[Semantic search and code graphs](#semantic-search-and-code-graphs) for why the
two belong together.

The launch is detached and reported as started, never as finished: on a large
monorepo `init` runs for minutes, and a tool call that blocked that long would
be worse than one that returns. Anything that fails afterwards lands in
`.codegraph/daemon.log`. A home directory or a drive root is refused rather than
indexed, and launches are limited to one per 15 seconds per workspace because
codegraph's own daemon already watches files.

### With the OpenCode CLI

```bash
opencode plugin add @javierkaiser/opencode-indexing
```

OpenCode downloads the package into its own cache and records it in the global
`plugins` array, and the host loads the parts the client runs: the server side
(`index.ts`, which registers the tools), the terminal UI (`tui.ts`, which adds
the prompt-footer indicator and the `/indexing` page), and — in OpenCode
Desktop — the GUI part (`dist/gui-experimental.cjs`, which adds the settings
page, palette commands and composer pill). It brings `plugin check`, `plugin
update` and `plugin remove` with it, but it cannot write permission rules — add
this one to `opencode.json` to keep the host asking before the only tool that
writes your settings file:

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

`install.sh` and `install.ps1` are thin wrappers over it; PowerShell also accepts
`-Aio`, `-Local`, `-Package`, `-Spec`, `-SkipDeps`, `-NoRestart` and
`-WithCodegraph`.

`--package` deletes any copied plugin it finds: both sources define the same
plugin id (`javierkaiser.indexing`) and the config directory is scanned
automatically, so leaving both would load the plugin twice.

If no package manager is available, a `--local` install still copies the files
and the plugin runs with reduced features (line chunker instead of tree-sitter,
no LanceDB).

### Upgrading from 0.5.x

0.6.0 changes the plugin id from `opencode.indexing` to
`javierkaiser.indexing`, because OpenCode reserves the `opencode` namespace for
its own plugins. The host stores this plugin's file manifest under its plugin
id, so the manifest written by 0.5.x is not visible to 0.6.0. The own index is
reindexed once: the workspace is rescanned and every indexed file is embedded
again. No vectors are deleted, and Kilo's index is untouched; with the bundled
local model no API calls are involved, while a cloud provider bills one full
embedding run. The TUI command ids (`opencode.indexing.settings`, `.dialogs`,
`.toggle`, …) keep their old prefix: they are a keybinding contract independent
of the plugin id, so existing `cli.json` bindings keep working.

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

OpenCode ──► codegraph_*  ───────► codegraph's graph (its own)    .codegraph/codegraph.db
             ▲
             └── indexing_build / indexing_import keep it in step
```

- **Read-only reuse**: the plugin computes the same collection name Kilo uses (`ws-` + sha256 of the workspace path, first 16 hex chars), validates the embedding profile stored in the metadata point, and queries with an embedding from the *same* model (e.g. Mistral `codestral-embed-2505`, 1536d).
- **Import without re-embedding**: `indexing_build` (or `indexing_import`) can copy vectors + chunks from an existing Kilo index — both its Qdrant collections and its local LanceDB database — at **zero embedding cost**, then incrementally index only the delta.
- **Own index**: manifest-based incremental indexer (per-file sha256) writing to `oc-*` collections or an embedded LanceDB database, using the same chunk payload shape as Kilo (`filePath`, `fileHash`, `codeChunk`, `startLine`, `endLine`, `segmentHash`, `pathSegments`).
- **Merge**: results from Kilo + own are merged; own (fresher) hits win on overlap; ghost hits (deleted files) are filtered out.
- **Companion graph**: the same build starts codegraph for the workspace, which keeps its own index in `.codegraph/` and serves it over its own MCP server. This plugin never reads or writes that database — see [Semantic search and code graphs](#semantic-search-and-code-graphs).

## Tools (namespace `indexing`)

| Tool | Purpose |
| --- | --- |
| `indexing_search` | Semantic search across Kilo's index + own index. `{ query, path? }`. Ends with a one-line index status |
| `indexing_status` | Backends, Kilo sources available for import, both indexes, freshness, recommendation |
| `indexing_config` | Effective configuration: backend, provider/model, credentials (masked), search and behavior settings, settings file, Kilo sources. Read-only |
| `indexing_config_set` | Change one setting and persist it. `{ key, value }`. Refuses credentials |
| `indexing_refresh` | Incremental update of the own index (new/changed/deleted files only) |
| `indexing_build` | Build the own index: imports from Kilo when compatible, otherwise embeds from scratch. `{ rebuild?, skipImport? }` |
| `indexing_import` | Import a specific Kilo source without re-embedding. `{ source?, rebuild? }`; `rebuild` drops the own index first |

### Bundled skill

The plugin registers a skill, `opencode-indexing` ("Semantic code search
(indexing)"), that tells the model when `indexing_search` is the right tool,
when Grep, Glob or Read are the better ones, how to read empty results, and how
to keep the index fresh. It ships as `skills/opencode-indexing/SKILL.md` and is
registered from that file, so there is nothing to install. Mention it as
`@opencode-indexing`, or let the model load it when the description matches.

## Settings

The terminal page and its dialog editor write the same file through the server
plugin's RPC; `/indexing-config set` writes it from the server. The Desktop
settings page writes it too: provider and model from the catalog, vector store,
credentials, search limits and the booleans, plus a one-click local setup. The
`indexing_config` tool reports the configuration without writing it, and refuses
credentials because a tool call is recorded in the conversation.

### `/indexing-config` — slash command

Registered as a server command, so the host lists it in every client. Whether typing it *runs* it depends on the client: the terminal TUI and the Desktop app submit the line to the model instead of dispatching the command, so there it does nothing. To read the configuration from those, ask the assistant — it calls `indexing_config`, which returns the same report — or, in Desktop, open the plugin's settings page. The subcommands below apply wherever the command is dispatched.

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
| `codegraph` | `false` to stop also running the `codegraph` CLI on build. On by default; a no-op when codegraph is not installed |
| `autorefresh` | Refresh the own index automatically on search |
| `enabled` | Master switch. `false` pauses writing and refreshing; search keeps working, and still reads Kilo's index unless `searchKilo` is off |
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
| `esc` | Close the page, returning to the session it was opened from |

### Prompt-footer indicator

The terminal footer shows whether the current workspace is indexed, in one glyph:

| Indicator | Meaning |
| --- | --- |
| `● indexed` | Own index exists and is complete |
| `◐ index stale` | Own index exists but needs a refresh |
| `○ not indexed` | Nothing indexed yet: Kilo's index is readable, or Kilo search is off |
| `✕ no index` | Neither index is available for this workspace |
| `⏸ paused` | Indexing paused: nothing is written or refreshed |
| `!` / `◌` | The status could not be read / is still loading |

*Indexing: start, pause or resume indexing* in the command palette — or `/indexing-config set enabled=false` — controls it. The footer is a status line only: the host's `prompt.footer` slot exposes no interaction surface, so it is not clickable. Pausing leaves `indexing_search` working — it reads both indexes, or only the own one when `searchKilo` is off — but `indexing_build`, `indexing_refresh`, `indexing_import` and auto-refresh refuse to write until you resume. The command has a stable id, so a key can be assigned in `cli.json`.

The footer itself is terminal-only: `prompt.footer` is a TUI slot, and OpenCode
Desktop has no equivalent status line under its composer. Desktop does not load
the TUI part; it loads the package's separate `./gui-experimental` part instead.
That part adds a **settings page** with the full configuration — provider and
model chosen from the catalog, vector store, Qdrant and LanceDB locations,
credentials, search limits and the indexing switches — plus a one-click local
setup, Build and Refresh actions, **palette commands** for those two index
actions, and a **composer pill** that carries the index state beside the
composer. They share the same server-side state through the plugin's RPC, so the
terminal page, the Desktop page and the tools share one settings file and one
index. The footer and the composer pill are two expressions of the same state,
not two indexes. The GUI export keeps the `-experimental` suffix because the
Desktop GUI SDK is still experimental and may change between OpenCode releases.

The page is assembled from the host's own settings components —
`SettingsLayout`, `SettingsSection`, `SettingsRow` and `Select` — so its column
width, section spacing, row separators and typography are the host's, in light
and dark alike. The hand-rolled CSS that reproduced those measurements and
coloured itself from the `--v2-*` variables is gone: a copied measurement is a
snapshot of one OpenCode release and drifts without saying so, and those
variables are not a theme API this package can rely on. With the components, the
page follows the host's layout and theme by construction instead of
approximately.

The tool layer works in every client as well:

- **Status** — every `indexing_search` result ends with a line like `Index: ◐ index stale · own 2.2k pts · /path/to/project`, using the same glyphs as the footer. It costs no extra message and adds no noise: a reader who ignores it sees exactly the output they saw before. It refreshes on every search.
- **Read** — `indexing_config`.
- **Change** - `indexing_config_set { key, value }`, validated by the same rules as `/indexing-config set`. Credentials are refused: a tool call is recorded in the conversation. Set them from the TUI or the Desktop page, or through the environment or plugin options.

The index-state vocabulary is shared, so the footer, the composer pill and the chat line can never describe the same state differently.

### Editing settings (terminal)

The terminal dialog-based flow is reachable three ways:

- Press `e` from the `/indexing` page.
- The command **Indexing: settings (dialogs)** in the command palette (a manual escape hatch if the page ever fails to render).
- Automatically: if the host cannot resolve the TUI runtime modules the page
  needs, `/indexing` opens this flow instead of the page.

OpenCode Desktop has a settings page for the same configuration: provider and model from the catalog, vector store, credentials, search limits and the switches, with Build and Refresh actions. Credentials typed there are stored in the settings file; the environment and plugin options keep them out of it.

`indexing_config` (the tool) reports the same configuration as `/indexing-config` and works in every client, because tools run server-side, and `indexing_config_set` changes a value the same way. Together they are the whole configuration surface for clients that do not dispatch slash commands.

Configurable from all four surfaces (the three above plus the Desktop settings page):

- **Vector store** for the own index: Qdrant or LanceDB.
- **Qdrant URL + API key** (local or remote) with connection test.
- **LanceDB directory** with availability test.
- **Embedding provider/model** (local, mistral, openai, ollama, openai-compatible, gemini, voyage, openrouter) and **API key**. The model is chosen from a catalog rather than typed blind.
- **Import from Kilo** toggle with live source detection ("Qdrant ws-… (31,261 pts) · LanceDB …").
- **Kilo search** toggle. Off answers from the own index only, and `indexing_status` says the search is disabled instead of reporting a missing Kilo index.
- **Auto-refresh on search** toggle.
- **Search limits and file extensions.**
- Build / refresh / import actions and a status summary.

### Embedding providers

All eight have an adapter. Every model below is in the catalog, which is what
supplies the dimension, the score threshold and the input ceiling; a model that
is not listed still works, and its dimension is probed from the provider on
first use. See the next section for how far each one has actually been tested.

| Provider | Default model | Also in the catalog | Input ceiling |
| --- | --- | --- | --- |
| `local` | `potion-base-8M-128d` | `potion-multilingual-128M` | 512 |
| `mistral` | `codestral-embed-2505` | `codestral-embed`, `mistral-embed` | 8,192 |
| `openai` | `text-embedding-3-small` | `text-embedding-3-large`, `text-embedding-ada-002` | 8,192 |
| `voyage` | `voyage-code-3` | **`voyage-code-4`**, `voyage-4`, `voyage-4-large`, `voyage-4-lite`, `voyage-3-lite` | **32,000** |
| `gemini` | `gemini-embedding-001` | **`gemini-embedding-2`**, `text-embedding-004`, `embedding-001` | 2,048 (001) / 8,192 (2) |
| `openrouter` | `openai/text-embedding-3-small` | `openai/text-embedding-3-large`, `google/gemini-embedding-2-preview` | 8,192 |
| `ollama` | `nomic-embed-text` | `mxbai-embed-large`, `all-minilm`, `bge-m3` | 512 – 8,192 |
| `openai-compatible` | none | whatever your endpoint serves | probed |

#### Local embeddings (no key, no network)

Two static models, and neither runs a neural network: Model2Vec keeps one vector
per token and averages them, so embedding a chunk is a lookup plus a mean — about
0.2 ms of CPU — with no ONNX runtime and no service.

| Model id | Dim | Where it lives | Cost while loaded | Languages |
| --- | --- | --- | --- | --- |
| `potion-base-8M-128d` | 128 | bundled (~2 MB) | ~40 MB | English |
| `potion-multilingual-128M` | 256 | downloaded once (512 MB fp32 → 123 MB int8) | ~500 MB, released 5 min after the last use | 101 |

`potion-base-8M-128d` is the default when no cloud credential is configured, so a
fresh install indexes offline with no setup. `potion-multilingual-128M` is for
non-English queries or corpora; it is opt-in by model id because the first use
downloads the weights and quantizes them.

Measured on this repository with `bench/run.mjs`:

| Queries | Model | Hit@10 | Recall@10 | MRR | nDCG@10 |
| --- | --- | --- | --- | --- | --- |
| English (25) | `local` English, 128d | 100% | 100% | 0.490 | 0.625 |
| English (25) | `local` multilingual, 256d | 100% | 100% | 0.404 | 0.555 |
| English (25) | `mistral` codestral, 1536d | 100% | 100% | 0.518 | 0.643 |
| Spanish (5, mixed) | `local` English, 128d | 100% | 100% | 0.500 | 0.631 |
| Spanish (5, mixed) | `local` multilingual, 256d | 100% | 100% | 0.433 | 0.579 |

The multilingual model does bridge languages — cosine 0.69–0.77 between a Spanish
question and its English translation, against 0.25 for unrelated text — but on a
corpus of English code the English model still ranks better on both sets. Reach
for the multilingual id when the repository itself carries other languages in
prose or comments; on an English-only codebase the smaller model is both faster
and more accurate. A full rebuild takes ~6 s (English) or ~12 s (multilingual,
warm cache) instead of ~2 min through Mistral.

#### Getting an API key (Mistral)

Mistral is the default provider when a Mistral key is configured, and the only
cloud one tested end to end here, so it is the shortest path to a cloud-backed
index. API access is enabled by default on a free
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

**When Kilo's index cannot be embedded here.** Search reads both indexes, so it
refuses to answer when one of them holds points built with a profile this machine
cannot embed — an expired cloud key, an exhausted budget, a provider that is not
configured. That refusal is deliberate: half an answer looks exactly like a
complete one. `searchKilo: false` (or `KILO_INDEX_SEARCH_KILO=false`) answers
from the own index only, which is what makes a local model usable in a workspace
that still has a Kilo collection.

Turning Kilo search off is a choice, and the plugin reports it as one. With
`searchKilo: false`, `indexing_status` writes that Kilo search is disabled rather
than that no Kilo index exists; `indexing_search` says only the own index was
searched when it finds nothing; and the paused line in `indexing_config` says
search reads the own index only. The two states need different actions — one is
a switch, the other is an index that has to be built — and the old wording sent
readers looking for a build to fix a setting.

`KILO_INDEX_SEARCH_KILO` is the lowest-precedence way to set it. A `searchKilo`
stored in `indexing.json` — which is what the TUI and Desktop switches write —
wins over the environment, and a plugin option wins over both, so an exported
`false` stays in effect only until a switch is flipped. The *Set up locally*
preset respects that: it selects the bundled local model, embedded LanceDB,
import-from-Kilo and auto-refresh, but it no longer turns `searchKilo` on behind
your back.

**Which models can import from Kilo.** Kilo's registry is mirrored entry for
entry, because an import is accepted only when provider, model id and dimension
match exactly. Models marked *ours* in the table above are not in Kilo's
registry and can never be imported; `indexing_config` says which is which. If
your Kilo index uses a different model, set the same provider and model here and
the import costs nothing.

Settings are stored in `~/.config/opencode/indexing.json` (plugin options → `indexing.json` → environment → defaults). Plugin options in `opencode.json` still work and take precedence. API keys set from the TUI or the Desktop page are written to `indexing.json` in plain text; using the environment (`KILO_INDEX_*`) or plugin options keeps them out of that file.

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
| `searchKilo` | Search Kilo's index alongside the own one. `false` answers from the own index only — the escape hatch when Kilo's profile cannot be embedded here — and is reported as disabled search, not as a missing index |
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
| `KILO_INDEX_SEARCH_KILO` | `false` searches only the own index (see `searchKilo`). Lowest precedence: a stored `searchKilo` or a plugin option wins over it |
| `KILO_INDEX_QDRANT_URL` / `KILO_INDEX_QDRANT_API_KEY` | Qdrant connection |
| `KILO_INDEX_LANCEDB_DIR` | Base directory for the own LanceDB stores |
| `KILO_INDEX_KILO_LANCEDB_DIR` | Override Kilo's LanceDB directory (import source) |
| `KILO_INDEX_MISTRAL_KEY`, `KILO_INDEX_OPENAI_KEY`, `KILO_INDEX_OPENAI_COMPATIBLE_URL`, `KILO_INDEX_OPENAI_COMPATIBLE_KEY`, `KILO_INDEX_OLLAMA_URL`, ... | Embedding credentials |

Word about data safety: Kilo's indexes (`ws-*` collections and its LanceDB directory) are **never modified**. Imports are copies.

## Requirements

- **OpenCode 2.2.7 or newer.** The consumer peers are `@opencode/plugin >=2.2.7`
  and `solid-js >=1.9.0`, both optional. The repository pins `@opencode/plugin`
  and `@opencode/theme` to exactly 2.2.7 in devDependencies. The floor is real:
  the Desktop page is built from the settings components OpenCode 2.2.6 added,
  so an older host has nothing to render it with. The pins are exact because the
  page depends on that component set — the SDK the typecheck sees has to be the
  one its components come from.
- **For the terminal UI (prompt-footer indicator and `/indexing` page):** the
  `solid-js` runtime that the host provides. The plugin installs no copy of it:
  the TUI imports the host's singletons through virtual module ids
  (`opentui:runtime-module:…`) and uses no JSX, so both sides share one reactive
  runtime. That is the fix for a plugin loaded from an npm spec, where local
  copies shadowed the host's and the Solid runtime was never bridged — the
  settings page and the footer indicator painted once and never updated (upstream
  [anomalyco/opencode#33884](https://github.com/anomalyco/opencode/issues/33884)).
  `@opentui/*` is not a consumer peer: it is a type-only devDependency, present
  so the typecheck can read the virtual-module declarations, and no runtime path
  in this package loads it. Without the host runtime the settings page degrades
  to dialogs and the footer is simply absent.
- **For the Desktop GUI (settings page, palette commands and composer pill):**
  nothing to build or install. The package ships `dist/gui-experimental.cjs`, a
  prebuilt CommonJS bundle; Vite, vite-plugin-solid and SolidJS are build-time
  toolchain, not installable dependencies, and users never install them.
  OpenCode Desktop provides the GUI SDK (`@opencode/plugin/gui`), the settings
  components the page is made of, and the Solid runtime that the bundle imports.
  `@opencode/theme` is not a consumer peer either: the host provides the theme,
  and the SDK pins the version it was built against.
- **For embeddings: nothing to install or run by default.** With no cloud key the
  plugin uses the bundled static model (English-only, ~2 MB, no network). The
  catalog also offers a multilingual static model that is downloaded once
  (~123 MB after quantization). Set a provider key to switch to a cloud model, or
  run Ollama for a local multilingual one.
- **For the own index: nothing to run.** The default store is embedded LanceDB
  (`@lancedb/lancedb`, pinned to 0.40.0), so there is no server to start, no
  port to free and no container to keep alive.
- **A Qdrant server is only needed if you ask for it**, either by setting
  `vectorStore=qdrant` or because a Kilo index you want to import lives in Qdrant.
  In that case the default URL is `http://localhost:6333`.
- Embedding credentials compatible with the collection you search (the profile is read from the metadata point).

### Where each index lives

The own index and Kilo's index are independent, and each one is chosen on its
own. codegraph keeps a third, and it is the one this plugin never writes to:

| Index | Default | Configured by |
| --- | --- | --- |
| Own index | embedded LanceDB, under `~/.local/state/opencode-indexing/lancedb` | `vectorStore` |
| Kilo index (read-only) | whatever `kilo.jsonc` says | Kilo itself |
| codegraph's graph | `.codegraph/` inside the workspace | codegraph itself |

Kilo's `vectorStore` used to decide where this plugin's own index was written,
because both were read from the same setting chain. That is no longer the case:
Kilo decides where an import **reads from**, and your own index decides where it
**writes to**. If Kilo is on Qdrant and you have not set `vectorStore` yourself,
the own index still goes to LanceDB and `indexing_status` says so.

### Platform support for the embedded store

`@lancedb/lancedb` 0.40.0 is a JavaScript wrapper around a native library, with
one prebuilt binary per platform and no WebAssembly fallback. The platforms it
ships a binary for are:

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

## Semantic search and code graphs

Two indexes, not two options. This plugin builds and searches the semantic one;
it also keeps codegraph's code graph in step for the same folder, so a single
`indexing_build` leaves both current. Neither replaces the other, and this is not
a fork of codegraph — see [The codegraph companion](#the-codegraph-companion)
for the install side.

### The two indexes

| | Semantic index (this plugin) | Code graph (codegraph) |
| --- | --- | --- |
| Question it answers | "Where is the code that does something like X?" | "Who calls X? What breaks if I change it? Path from A to B?" |
| Signal | Meaning (embeddings over chunks) | Structure (symbols, `CALLS`, `DEFINES`, `IMPORTS` edges) |
| Strengths | Natural language, concepts without known identifiers, cross-language | Exact structural facts, multi-hop traversals, no similarity false positives |
| Weaknesses | "Similar" is not "relevant"; no notion of connections | Cannot find a concept with no known symbol; fragile on dynamic code |
| What it costs to stay fresh | **Paid**: the embedding API, re-run when the model changes | **Free**: local parsing and a small graph store, re-run on every edit |

That last row is what shapes the setup. A semantic index is re-embedded only when
the model changes, and that is money; a graph is synced whenever a file is
touched, and that is CPU. Two cadences for two economies — which is the reason
to keep both pointed at one folder rather than at two projects that quietly
drift apart.

### Measuring the difference

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

One caveat, and it is larger than it looks. The benchmark measures
`codegraph query`, the one subcommand that matches **names**. It does **not**
measure what a graph is actually good for — who calls what, what breaks if you
change it, paths between two places. So the fusion above is *semantic + name
matching*, **not** *semantic + graph traversal*. What would actually justify
reaching for the graph is not in those numbers, and this section does not claim
it is.

### Using them together

The division of labour is the one the wider field converges on: use embeddings
to find the entry node **by intent**, then walk the graph for **exact
relationships**.

1. `indexing_search` — "where is the retry logic for failed webhooks". Finds the
   neighbourhood from meaning alone, with no identifier to know in advance.
2. `codegraph_explore` — the same area, returning the verbatim source of the
   relevant symbols, the call paths between them, and what depends on them.
3. `codegraph_impact` / `codegraph_callers` — once the question becomes "what
   breaks if I change this", the graph answers exactly, and a similarity search
   cannot.

Both are live in the same session, so an assistant moves between them without
being asked to.

### Why there are no graph tools in this plugin

There are no `indexing_graph_*` tools here, and that is a decision rather than a
gap. An earlier version of this section proposed adding tree-sitter symbol and
edge extraction into SQLite as a candidate for a future major version. Once
codegraph was available as a companion, that plan would have reimplemented
something another tool already does better — in a second store, behind a second
indexer that has to be kept alive and fresh.

The plugin stays on the semantic side and coexists with grep/read (see the tool
descriptions and the bundled skill). What it adds for the structural half is to
keep it current, not to duplicate it.

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

This plugin interoperates with the open-source [Kilo Code](https://github.com/Kilo-Org/kilocode) indexing format (MIT License, Copyright (c) 2026 Kilo Code). The line-based chunker and the tree-sitter queries are ports of Kilo Code's implementation. It also builds on [opencode](https://github.com/anomalyco/opencode) (MIT), [LanceDB](https://github.com/lancedb/lancedb) (Apache-2.0), [Apache Arrow](https://github.com/apache/arrow) (Apache-2.0), [web-tree-sitter](https://github.com/tree-sitter/tree-sitter) (MIT), [tree-sitter-wasms](https://github.com/Gregoor/tree-sitter-wasms) (Unlicense), [ignore](https://github.com/kaelzhang/node-ignore) (MIT), and — for the terminal UI, whose runtime the host provides — [SolidJS](https://github.com/solidjs/solid) (MIT) and [OpenTUI](https://github.com/sst/opentui) (MIT).

The companion code graph is [CodeGraph](https://github.com/colbymchenry/codegraph) (MIT), a separate project this one installs and drives rather than bundles. Its npm package is `@colbymchenry/codegraph`; the unscoped `codegraph` on npm is a different, unrelated project.

Kilo Code is a trademark of its owners; this project is **unofficial and not affiliated** with Kilo Code or the OpenCode project.

## License

MIT (see `LICENSE`). Portions derived from Kilo Code and other third parties are
documented in `THIRD_PARTY_NOTICES.md`. This project is unofficial and not
affiliated with Kilo Code or OpenCode.
