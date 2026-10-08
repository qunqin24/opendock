# Graphmem

[![CI](https://github.com/sonic182/graphmem/actions/workflows/ci.yml/badge.svg)](https://github.com/sonic182/graphmem/actions/workflows/ci.yml)

![Graphmem — Shared, local memory for coding agents](https://raw.githubusercontent.com/sonic182/graphmem/master/docs/assets/graphmem-banner.png)

Shared, local memory for coding agents. Keep project decisions across sessions
and tools with SQLite storage, local semantic search, and linked entities.
Claude Code, Codex, OpenCode, pi, and other MCP clients can share the same store.

Optional code tools find definitions, outline files, list imports, and compare
symbols between Git revisions.

## Install

```sh
npm install --global @sonic182/graphmem
gmem-install
gmem version
```

The npm package contains launchers. `gmem-install` explicitly downloads and
verifies the matching CPU binary, or reuses a working native `gmem` on your
`PATH`. Package installation itself downloads no binary. After upgrading the
package, run `gmem-install` again; separately installed binaries are not replaced.

Alternatively, download your platform's archive from
[GitHub Releases](https://github.com/sonic182/graphmem/releases/latest), verify
it against `SHA256SUMS`, and put the extracted executable on your `PATH`.
Linux releases require glibc 2.39 and OpenSSL 3. For other systems or CUDA,
[build from source](docs/setup.md#build).

## Use it with your coding agent

Plugins include MCP registration, skills, and guidance to recall context before
work and save durable decisions afterward.

| Agent | Install |
| --- | --- |
| Claude Code | `claude plugin marketplace add sonic182/graphmem`, then `claude plugin install graphmem@graphmem` |
| Codex | `codex plugin marketplace add sonic182/graphmem`, then `codex plugin add graphmem@graphmem` |
| OpenCode | `opencode plugin @sonic182/graphmem --global` |
| pi | `pi install npm:@sonic182/graphmem` |

Claude Code and Codex need `gmem` and Node.js on `PATH`. In Codex, trust the
Graphmem hooks in `/hooks` and start a new thread. Pi offers binary setup on first
startup; OpenCode prints an installer command if needed.

See [plugin setup and troubleshooting](docs/plugins.md).

For another MCP client, configure it to launch your installed binary:

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

## CLI

```sh
gmem remember "Use nextest for integration tests" \
  --type convention --scope repo:/absolute/path/to/project
gmem search "integration tests"
gmem tui
gmem mcp
```

Memories default to the current Git repository; `git` must be on `PATH`.
Outside a repository, the default scope is `global`.
Data lives in `~/.graphmem`; set `GRAPHMEM_HOME` to use another directory.

[CLI reference](docs/cli.md) · [MCP tool reference](docs/mcp.md)

## Code navigation (optional)

Release binaries include these tools; source builds need `--features code`.

| MCP tool | Purpose |
| --- | --- |
| `find_symbol` | Find a definition and its source range |
| `code_outline` | List a file's definitions and nesting |
| `code_imports` | List declared imports |
| `code_diff` | Compare symbols between Git revisions |

```sh
gmem code find CodeService
gmem code outline src/application/code.rs
gmem code imports src/application/code.rs
gmem code diff origin/master
```

These tools work on Git checkouts without an embedding model. They index
definitions, not call sites or references; use `ast-grep` for those.
Set `GRAPHMEM_CODE=off` to disable code tools.

[Options and supported languages](docs/cli.md#gmem-code) ·
[Benchmark results and limitations](docs/evaluation/code-tools-agent-benchmark.md)

## Configuration

No config file is required. To customize embeddings, retrieval, or code indexing,
create `~/.graphmem/config.toml`. See the [configuration reference](docs/setup.md#configuration).

## Build

See [source builds and CUDA setup](docs/setup.md#build).

## Development

```sh
just verify
```

Runs formatting checks, compilation, Clippy, and tests.
[Design](docs/design.md) · [Schema evolution](docs/schema-evolution.md)

To preview the documentation site, run `hugo server --source site`.
See [site setup](site/README.md).

## License

[MIT](LICENSE).
