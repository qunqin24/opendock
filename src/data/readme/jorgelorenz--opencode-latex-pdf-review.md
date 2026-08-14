# @jorgelorenz/opencode-latex-pdf-review

OpenCode plugin for PDF <-> LaTeX synchronized review using SyncTeX.

The plugin opens a local split-view UI: PDF on the left, LaTeX source on the right. Clicking in the PDF resolves the source line with SyncTeX, and review comments are submitted to the active OpenCode session.

## Install

Add the package to your OpenCode config:

```json
{
  "plugins": [
    "@jorgelorenz/opencode-latex-pdf-review"
  ]
}
```

No manual copying into `.opencode/plugins` is required.

## Prerequisites

- OpenCode runtime with Bun-enabled plugins
- Bun installed and available on `PATH`
- SyncTeX binary (`synctex`) available on `PATH`
- A PDF compiled with SyncTeX enabled

Compile with SyncTeX (examples):

```bash
pdflatex --synctex=1 main.tex
latexmk -pdf -synctex=1 main.tex
```

Both `main.pdf` and `main.synctex.gz` (or `main.synctex`) must exist.

## Usage

Run in OpenCode:

```text
/latex-pdf-review
```

Or with an explicit PDF path:

```text
/latex-pdf-review chapters/chapter1.pdf
```

## Supported Operating Systems

- Linux
- macOS
- Windows
- WSL

The plugin uses Bun APIs and `spawn`-style process execution (no shell-specific script dependency at runtime).

## Startup Validation

On startup, the plugin validates:

- Bun runtime is available
- `bun` executable exists on `PATH`
- `synctex` executable exists on `PATH`
- target PDF exists
- `.synctex.gz`/`.synctex` exists, or attempts safe auto-compile

Validation failures return clear, user-facing error messages in OpenCode.

## Security

The local HTTP server is hardened for local-only usage:

- binds to `127.0.0.1` only
- validates API input payloads
- rejects path traversal and blocks filesystem access outside workspace
- serves only known UI assets and explicit workspace files
- uses a random per-session token for API authorization

## Troubleshooting

`synctex` not found:

- Install TeX Live (Linux/macOS/WSL) or MiKTeX (Windows)
- Verify with:

```bash
synctex --version
```

PDF found but no SyncTeX mapping:

- Recompile with `--synctex=1`
- Confirm `.synctex.gz` exists next to the PDF

Browser UI does not open automatically:

- Copy the URL from the OpenCode toast and open it manually

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run build
```

## Release

Publishing is automated with GitHub Actions on version tags:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow runs typecheck, lint, build, and then publishes to npm.

## License

MIT
