# OpenCode Graphify Init

[![npm version](https://img.shields.io/npm/v/opencode-graphify-init?logo=npm&label=npm)](https://www.npmjs.com/package/opencode-graphify-init)

Keep existing [Graphify](https://github.com/Graphify-Labs/graphify) graphs fresh in the background. First indexing always requires an explicit `/graphify-index` decision; automatic sessions never start a token-spending first pass.

## Install

Requires OpenCode `>=1.17.15 <2` and Graphify `0.9.32` with MCP support:

```bash
uv tool install "graphifyy[mcp]==0.9.32"
opencode plugin opencode-graphify-init --global
```

Restart OpenCode, open a concrete project, then run:

```text
/graphify-index
```

Choose **code-only** unless you need document indexing. Code-only is local and free; docs mode uses a configured LLM backend and can spend substantial tokens.

## Use

1. Run `/graphify-index` for the first graph.
2. Choose code-only or docs mode.
3. Review the target repositories and confirm indexing.
4. Let later OpenCode sessions refresh stale graphs automatically.

The plugin records the chosen mode under `.ai/graphify-out/`. Environment variables never replace that stored decision.

## Behavior

| Project state | Result |
| --- | --- |
| No graph and no recorded mode | Show one hint; start nothing |
| Missing or unreadable graph with a recorded mode | Rebuild in that mode |
| Graph commit differs from Git `HEAD` | Refresh incrementally |
| Graph is current | Do nothing |

Refreshes run in the background, share a multi-process lock, stop with OpenCode, and keep project state under `.ai/graphify-out/`. See [Graph lifecycle](docs/lifecycle.md) for state, mode changes, and recovery.

## Configure

| Variable | Effect |
| --- | --- |
| `OPENCODE_GRAPHIFY_AUTOINIT=0` | Disable refresh for this OpenCode process |
| `OPENCODE_GRAPHIFY_GLOBAL=0` | Skip global-graph registration |
| `OPENCODE_GRAPHIFY_DOCS=1` | Suggest docs mode; the command still asks |
| `OPENCODE_GRAPHIFY_BACKEND=<name>` | Backend fallback for legacy docs graphs |
| `GRAPHIFY_OUT=.ai/graphify-out` | Keep Graphify CLI and MCP paths aligned |

Use `GRAPHIFY_OUT=.ai/graphify-out` in shells and Graphify MCP configuration. Do not combine it with `--out`.

## Update or remove

A bare `opencode-graphify-init` entry follows npm `latest`. To pin a release:

```bash
opencode plugin opencode-graphify-init@<version> --global --force
```

To remove the plugin, delete only its matching string or tuple from the global `opencode.jsonc` or `opencode.json`, preserve every other entry, and restart OpenCode. There is no global npm installation to uninstall. Existing graph data remains until you remove it separately.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run security:check
```

See [Contributing](CONTRIBUTING.md) for local loading and review rules.

## Help

- [Graph lifecycle and recovery](docs/lifecycle.md)
- [Report a problem](https://github.com/andresnator/opencode-graphify-init/issues)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT License](LICENSE)
