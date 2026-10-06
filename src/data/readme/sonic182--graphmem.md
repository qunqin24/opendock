# Graphmem

[![CI](https://github.com/sonic182/graphmem/actions/workflows/ci.yml/badge.svg)](https://github.com/sonic182/graphmem/actions/workflows/ci.yml)

---

![Graphmem — Shared, local memory for coding agents](https://raw.githubusercontent.com/sonic182/graphmem/master/docs/assets/graphmem-banner.png)

----

Graphmem gives coding agents shared, local memory and optional code navigation. Claude Code, Codex, OpenCode, pi, and other MCP clients can use the same store, so project decisions and context survive new sessions and switches between tools. It finds relevant memories even when a query uses different words.

Its code helpers find definitions, outline files, list declared imports, and show which symbols changed between Git revisions. Agents get compact results with source ranges before reading code; the rebuildable code index stays separate from durable memories.

> **Using pi?** Install Graphmem with `pi install npm:@sonic182/graphmem`.
> On first startup, approve the matching binary download or select your existing executable. See
> [the pi setup guide](docs/plugins.md#pi).

## Highlights

- Local SQLite storage; no hosted service required.
- Optional syntax-aware code navigation through `find_symbol`, `code_outline`,
  `code_imports`, and `code_diff`, with matching `gmem code` commands.
  Disable it with `GRAPHMEM_CODE=off` or `[code] enabled = false`.
- Scoped memories (`global` or `repo:/absolute/path`) with scope isolation.
- Verified entities and directed relations attached atomically to memories.
- Local `sentence-transformers/msmarco-MiniLM-L6-cos-v5` embeddings through Candle.
- CUDA, CPU, or automatic backend selection.
- MCP server over stdio with `remember`, `recall`, `update`, `stats`, `relate`, `graph`, `inspect`, and `forget` tools.
- `recall` accepts `use_embeddings: false` to force lexical FTS5 ranking.
- Keyboard-driven `gmem tui` to browse memories and graph nodes, filter and
  edit memories, and delete with confirmation.

Memory recall combines local embeddings, graph context, and Personalized PageRank
(inspired by [HippoRAG 2](https://proceedings.mlr.press/v267/gutierrez25a.html)),
with SQLite FTS5 for lexical search.

## Install

**Install it with your AI agent** (Claude Code, Codex, OpenCode, ...): paste this prompt.

```text
Install gmem (Graphmem) for me:
1. Check whether a working `gmem` is already on my PATH with `gmem version`.
2. If it is, keep using it. Otherwise install Graphmem with `npm install --global @sonic182/graphmem`,
   then run `gmem-install` to explicitly download and verify the matching binary.
3. If npm installation is unavailable for my platform, download the matching gmem release binary from
   https://github.com/sonic182/graphmem/releases/latest, verify it against `SHA256SUMS`, and install it in a directory on my PATH.
4. Check it works with `gmem version`.

Stop after that. Then ask me whether I also want the Graphmem plugin
(Claude Code, Codex, OpenCode, pi; it registers the MCP server automatically)
or only the MCP server config. Install neither until I answer.

If I want the plugin, run
`curl --silent https://raw.githubusercontent.com/sonic182/graphmem/refs/heads/master/docs/plugins.md`
and follow the steps for my agent.

For more references, run
`curl --silent https://raw.githubusercontent.com/sonic182/graphmem/refs/heads/master/README.md`
```

For the CLI, run `npm install --global @sonic182/graphmem`, then `gmem-install`.
The package contains launchers, not binaries, and has no `postinstall`: installing
it, even with scripts disabled, does not download or execute a release binary.
The explicit installer reuses a working native `gmem` on your `PATH`; otherwise
it downloads the matching CPU release, verifies `SHA256SUMS`, smoke-tests it,
and caches it by package version and platform. npm does not replace or update
a separately installed binary. Upgrading the npm package requires an explicit
install of the new binary unless a working native `gmem` is already available.

Or install by hand: download the **CPU binary** for your platform from [GitHub Releases](https://github.com/sonic182/graphmem/releases/latest):

| System | Release archive |
| --- | --- |
| Linux x86-64 (glibc) | `gmem-<version>-x86_64-unknown-linux-gnu.tar.gz` |
| macOS Intel | `gmem-<version>-x86_64-apple-darwin.tar.gz` |
| macOS Apple Silicon | `gmem-<version>-aarch64-apple-darwin.tar.gz` |
| Windows x86-64 | `gmem-<version>-x86_64-pc-windows-msvc.zip` |

Check the archive against the release's `SHA256SUMS`, extract it, and put `gmem` (or `gmem.exe`) in a directory on your `PATH`. On Linux/macOS, for example:

```sh
tar -xzf gmem-*.tar.gz  # after downloading one archive
mkdir -p "$HOME/.local/bin"
install -m 755 gmem "$HOME/.local/bin/gmem"
export PATH="$HOME/.local/bin:$PATH"  # also add this to your shell profile
gmem --help
```

On Windows, extract the ZIP into a directory on your user `PATH`, then run `gmem --help` in a new terminal. The Linux build targets Ubuntu 24.04 (glibc 2.39) and requires system OpenSSL 3 (`libssl.so.3`); older systems may need a source build. CUDA support also requires a source build.

Alternatively, install with Rust (this puts `gmem` in `~/.cargo/bin`):

```sh
cargo install --locked --features code --path .                                   # from a checkout
cargo install --locked --features code --git https://github.com/sonic182/graphmem # latest from GitHub
```

Claude Code and Codex need `gmem` on your `PATH`. Pi and OpenCode also resolve
package-local binaries by absolute path; see [docs/plugins.md](docs/plugins.md). `git` must also be on your `PATH` for repository-scoped memory: `gmem` runs `git rev-parse --show-toplevel` to derive the current repository, and falls back to `global` when it cannot.

## Use it with your coding agent

The binary works with any MCP client, but the Claude Code, Codex, and OpenCode plugins also install a skill and lifecycle guidance, so your agent recalls relevant context before a task and records durable decisions after it — without being asked each time. Each plugin bundles its own MCP server config, so there is no separate `mcp add` step. After installing the binary:

```sh
# Claude Code
claude plugin marketplace add sonic182/graphmem
claude plugin install graphmem@graphmem
```

```sh
# Codex
codex plugin marketplace add sonic182/graphmem
codex plugin add graphmem@graphmem
```

```sh
# OpenCode
opencode plugin @sonic182/graphmem --global
```

```sh
# pi
pi install npm:@sonic182/graphmem
# Start Pi and approve setup, or run /graphmem-setup later.
```

See [docs/plugins.md](docs/plugins.md#pi) for details.

## Code navigation (optional)

Only need memory? Set `GRAPHMEM_CODE=off` or `[code] enabled = false` in
`config.toml` to disable the code helpers without affecting memory tools.

Use the code helpers to locate source before grepping or reading whole files:

| MCP tool | What it answers |
| --- | --- |
| `find_symbol` | Where is this function, class, module, or other definition? |
| `code_outline` | What definitions and nesting does this file contain? |
| `code_imports` | Which imports does this file declare? |
| `code_diff` | Which symbols were added, removed, or modified between Git revisions? |

The same helpers work from the CLI. For example, in the Graphmem checkout:

```sh
gmem code find CodeService
gmem code outline src/application/code.rs
gmem code imports src/application/code.rs
gmem code diff origin/master
```

Release binaries include these tools; source builds need `--features code`.
They work on Git checkouts. Outlines, imports, and symbol lookups refresh their
syntax index on demand; diffs outline the two revisions without using the index.
No embedding model is needed. Imports are not resolved to files, and call sites
and cross-file references are not indexed: use `rg` or `ast-grep` for those. The
diff is structural, not a semantic review.

See [docs/cli.md](docs/cli.md#gmem-code) and
[docs/mcp.md](docs/mcp.md#code-navigation-tools) for supported languages, options,
and coverage limits.

## Build

Stable Rust is required. CPU builds need no extra feature:

```sh
cargo build
```

With CUDA support (and a working CUDA toolkit):

```sh
cargo build --features cuda
cargo build --release --features cuda
```

With the code navigation tools (`gmem code`, and the `code_outline`,
`code_imports`, `find_symbol`, and `code_diff` MCP tools; release binaries include them).
They outline Rust, Go, Zig, C, C++, Python, JavaScript/TypeScript,
Elixir/Phoenix templates, Ruby, PHP, Racket, SQL, Bash, CSS, SCSS, and HTML
`<script>`/`<style>`, and add
about 20 MB to the binary:

```sh
cargo build --features code
```

On GPUs older than Ampere (compute capability below 8.0, such as GTX 16xx and RTX 20xx), recent toolkits (CUDA 12.9 and 13.x) fail to build: `candle-kernels` 0.11 redefines `__hmax_nan`/`__hmin_nan`, which those headers now provide (`nvcc` fails in `src/compatibility.cuh`). This is tracked upstream in [huggingface/candle#3737](https://github.com/huggingface/candle/issues/3737). Make sure `nvcc` is on `PATH` (on Arch/Manjaro, `/opt/cuda/bin`).

For full performance on the machine that will run it, build for the local CPU so the compiler can use its newest instructions (AVX2, AVX-512, and so on). This speeds up CPU embedding inference in particular. Drop `cuda` from the feature list if you have no CUDA toolkit:

```sh
RUSTFLAGS="-C target-cpu=native" cargo build --release --features cuda,code
```

A `target-cpu=native` binary may crash with an illegal instruction on older or different CPUs. Build it on the machine that runs it, and do not ship it. Release artifacts target a generic CPU.

The binary is `target/debug/gmem` or `target/release/gmem`.

## CLI

```sh
gmem remember "Use nextest for integration tests" \
  --type convention --scope repo:/absolute/path/to/project
gmem search "integration tests"
gmem graph component api --direction both --max-depth 2
gmem tui
gmem reembed
gmem mcp
```

The default data directory is `~/.graphmem`. Set `GRAPHMEM_HOME` to use a separate store, for example `~/.graphmem-dev`.

In `gmem tui`, use `j`/`k` to navigate, `Tab` to switch between memories and
graph nodes, and `/` to filter memories. Details render common Markdown with
colors; `e` edits a memory through `$VISUAL` or `$EDITOR`, and `d` asks for
confirmation before deletion.

See [docs/cli.md](docs/cli.md) for the complete command reference, including `gmem reembed` (the embedding-model migration command).

## MCP

Configure an MCP client to launch:

```json
{
  "mcpServers": {
    "graphmem": {
      "command": "/absolute/path/to/gmem",
      "args": ["mcp"]
    }
  }
}
```

Use the absolute path to your installed binary; `~/.cargo/bin/gmem` is the path for a Cargo installation.

`recall` uses embeddings by default. For a lexical comparison, pass:

```json
{
  "query": "What handles intermittent outages?",
  "use_embeddings": false,
  "limit": 10
}
```

See [docs/mcp.md](docs/mcp.md) for the complete tool contract.

## Configuration

Configuration is optional — the values below are the built-in defaults and Graphmem runs fine without a config file. To change any of them, create `~/.graphmem/config.toml` (or `$GRAPHMEM_HOME/config.toml`):

```toml
[embedding]
enabled = true
backend = "auto"       # auto, cpu, or cuda
model = "sentence-transformers/msmarco-MiniLM-L6-cos-v5"
revision = "main"
cache_dir = "/home/user/.graphmem/models"
# batch_size = 16      # texts per model call; default 1 on CPU, 16 on CUDA

[retrieval]
seed_top_k = 20            # memories kept as PageRank seeds
seed_temperature = 0.05    # lower sharpens the gap between seeds
memory_seed_weight = 0.5   # share of seed mass for memories vs. the graph
entity_anchor_weight = 0.2 # pull toward entities named in the query
damping = 0.5

[runtime]
worker_threads = 4

[code]
enabled = true         # only in builds with --features code
max_files = 20000      # source files indexed per checkout
index_threads = "auto" # or a number of parsing threads
```

`[code] enabled = false` (or `GRAPHMEM_CODE=off`) hides `gmem code` and the code MCP tools in a binary built with them. Raise `max_files` (or set `GRAPHMEM_CODE_MAX_FILES`) for a larger checkout; the first index then takes longer. `index_threads` (or `GRAPHMEM_CODE_INDEX_THREADS`) sets how many threads parse files while indexing. `"auto"` uses the CPUs the process may run on, honoring CPU affinity and cgroup quotas such as a container's `--cpus` limit. The threads exist only while changed files are being parsed.

`backend = "auto"` selects CUDA when available and otherwise uses CPU. `GRAPHMEM_EMBEDDINGS=off` disables embeddings globally. The model is downloaded and loaded on first use (the first `remember`, `relate`, recall, or `reembed`) and cached locally. `remember` stores its embeddings in the same transaction, so it fails and stores nothing if the model cannot load or embed. `batch_size` also reads `GRAPHMEM_EMBEDDING_BATCH_SIZE` and the `--embedding-batch-size` flag. Under the same precedence (env > flag > file), the environment wins over the flag and the flag wins over `config.toml`, for one `gmem` run including `gmem mcp`.

Every `[retrieval]` key also reads a `GRAPHMEM_RETRIEVAL_*` environment variable and a matching `--retrieval-*` flag (`--retrieval-damping`, etc.), so values can be swept without editing the file. Resolution is per field: **environment variable > command-line flag > `config.toml` > built-in default**. `gmem mcp` accepts the same flags. `seed_temperature` is the one that matters most: raising it flattens ranking toward returning the whole store.

Logs are appended to `~/.graphmem/logs/graphmem.log` (or the corresponding `GRAPHMEM_HOME` directory):

```sh
tail -f ~/.graphmem/logs/graphmem.log
```

## Development

```sh
just verify
```

This runs formatting checks, compilation, Clippy, and the test suite. More background is available in [docs/design.md](docs/design.md) and [docs/schema-evolution.md](docs/schema-evolution.md).

## License

MIT — see [LICENSE](LICENSE).
