<p align="center">
  <img src="assets/recollect_banner.svg" alt="Recollect logo" width="100%">
</p>

<h1 align="center">Recollect</h1>

<p align="center">
  <a href="https://github.com/dkmnx/recollect/actions/workflows/ci.yml"><img src="https://github.com/dkmnx/recollect/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="go.mod"><img src="https://img.shields.io/badge/go-1.27.4-00ADD8" alt="Go Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License: MIT"></a>
  <a href="https://github.com/dkmnx/recollect/releases"><img src="https://img.shields.io/github/v/release/dkmnx/recollect" alt="Latest release"></a>
</p>

Recollect is a Go memory engine for coding agents. It stores facts as Markdown
files and ranks them for recall.

## Description

An agent needs memory that survives a session and stays easy to inspect.
Recollect stores each fact in its own Markdown file. A generated index lists
the facts. The engine searches the corpus, follows links between facts, and
builds derived pages from cited sources.

The packages are written in Go. They depend on the standard library,
`golang.org/x/sys`, `ncruces/go-sqlite3`, and `luist18/sqlite-vec-go`.
Platform-specific code covers atomic file replacement, advisory locks, and the
Windows search cache ACL. The engine is designed to be cross platform. Linux,
macOS arm64, and Windows builds are checked.

Markdown stays the authoritative store, so a person can read and edit the
files without the engine.

Features:

- Fact storage with format-v1 parsing and atomic writes
- Ranked project and user search
- Optional private SQLite search index and hybrid semantic recall
- Privacy filtering and secret detection
- Digests, revision chains, journals, and derived pages
- Prompt section rendering from an injected store and enablement flag
- Fixtures and a ranking corpus that exercise the real store

## Packages

| Package                                                                       | Ecosystem   | Install                                                      | Purpose                                                                             |
| ----------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`github.com/dkmnx/recollect`](https://pkg.go.dev/github.com/dkmnx/recollect) | Go module   | `go get github.com/dkmnx/recollect@latest`                   | Engine library for facts, search, transactions, jobs, and prompt rendering.         |
| [`recollect`](https://github.com/dkmnx/recollect/releases)                    | Go binary   | `go install github.com/dkmnx/recollect/cmd/recollect@latest` | JSON-RPC stdio engine with `version`, `doctor`, and `setup opencode`.               |
| [`opencode-recollect`](https://www.npmjs.com/package/opencode-recollect)      | npm package | `opencode plugin add opencode-recollect@latest`              | OpenCode plugin with the `memory` tool, `/recollect-*` commands, and event capture. |

## Requirements

Go 1.27.4 or later.

## Installation

Build the engine from a checkout:

```sh
git clone https://github.com/dkmnx/recollect
cd recollect
go build -o recollect ./cmd/recollect
```

Install it with:

```sh
go install github.com/dkmnx/recollect/cmd/recollect@latest
```

### One-line install

```sh
curl -fsSL https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.sh | sh
```

Pin a release by replacing `vX.Y.Z` with the tag you want:

```sh
curl -fsSL https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.sh | sh -s -- --version vX.Y.Z
```

On Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.ps1 | iex
```

Pin a Windows release:

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.ps1))) -Version vX.Y.Z
```

This runs the script without inspection. Use the download-and-inspect form
below when you need to review it first.

### Download and inspect

```sh
curl -fsSL https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.sh -o install.sh
less install.sh
sh install.sh --version vX.Y.Z
```

On Windows:

```powershell
irm https://raw.githubusercontent.com/dkmnx/recollect/main/scripts/install.ps1 -OutFile install.ps1
notepad install.ps1
.\install.ps1 -Version vX.Y.Z
```

The scripts install to `~/.local/bin` or
`%LOCALAPPDATA%\Programs\recollect` by default. Pass `--dir` or `-Dir` to
choose another directory, and set `RECOLLECT_INSTALL_DIR` to change the POSIX
default.

The binary serves JSON-RPC on stdin and stdout. It also has setup commands:

```sh
recollect version
recollect doctor
recollect setup opencode
```

`setup opencode` prints the plugin entry for the OpenCode host. Add `--write`
to merge it into the global `opencode.json`.

## Usage

Import the public facade `github.com/dkmnx/recollect/memory` in your Go
program. Open a store over two directories.

```go
package main

import (
    "fmt"
    "os"
    "path/filepath"

    "github.com/dkmnx/recollect/memory"
)

func main() {
    root, err := os.MkdirTemp("", "recollect-demo-")
    if err != nil {
        panic(err)
    }
    userDir := filepath.Join(root, "user")
    projectDir := filepath.Join(root, "project")
    if err := os.MkdirAll(userDir, 0o700); err != nil {
        panic(err)
    }
    if err := os.MkdirAll(projectDir, 0o700); err != nil {
        panic(err)
    }

    store := memory.NewStore(memory.Options{
        UserDir:    userDir,
        ProjectDir: projectDir,
    })
    if _, err := store.EnsureProject(memory.ProjectMeta{
        Root: projectDir,
        Name: "demo",
        Slug: "demo",
    }); err != nil {
        panic(err)
    }

    _, err = store.AppendFact(memory.Fact{
        Name:        "build-command",
        Description: "How to build the project",
        Type:        memory.FactTypeProject,
        Body:        "Run go test ./... before a change.",
    })
    if err != nil {
        panic(err)
    }

    matches, err := store.SearchFacts("build", "", 10)
    if err != nil {
        panic(err)
    }
    for _, match := range matches {
        fmt.Println(match.Name, match.Description)
    }
}
```

Run it from the repository root with `go run ./cmd/demo`.
No credentials are needed.

## Search index

Search is lexical by default. Set `RECOLLECT_SEARCH_INDEX` to choose the
derived index:

- `sqlite` uses the private SQLite FTS5 index under `.engine/search`.
- `hybrid` adds semantic candidates from the built-in deterministic embedder.

Markdown stays authoritative. The index rebuilds from the files and never
replaces them.

## OpenCode

The OpenCode adapter starts the engine as a child process, exposes the
`memory` tool, and registers the `/recollect-*` commands. Build the engine
binary, then add the `opencode-recollect` package to `opencode.jsonc`, or use
the adapter directory from a checkout. The adapter finds the binary from
`binaryPath`, `RECOLLECT_BINARY`, `PATH`, or the default install directory.
See [adapters/opencode/README.md](adapters/opencode/README.md) for the exact
config and verification steps.

## Tests

Run these checks from the repository root.

```sh
go test ./...
go vet ./...
go run ./tools/checktestaudit
```

These commands use the Go toolchain and run on any supported platform. The
audit check requires an audit record in every test file. The test suite
includes the format fixtures and the ranking corpus. The Windows atomic
replacement tests run only on Windows.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before you open a change. It lists the
required toolchain, every check CI runs, the test audit record, and the commit
and branch conventions.

The short version:

```sh
gofmt -l .
go vet ./...
go test ./... -count=1
go test -race ./... -count=1
go run ./tools/checktestaudit
staticcheck ./...
govulncheck ./...
```

Keep new behavior covered by tests at the store or search boundary.

## License

Recollect uses the MIT License. See [LICENSE](LICENSE).

You may use, copy, modify, merge, publish, distribute, sublicense, and sell
copies of the software. Keep the copyright and permission notice in all copies
or substantial portions. The software comes without warranty.
