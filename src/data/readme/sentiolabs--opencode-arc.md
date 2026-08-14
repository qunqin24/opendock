# Claude, Codex, and OpenCode Marketplaces

This repository contains three marketplace trees:

- `claude-marketplace/` for Claude-facing plugins
- `codex-marketplace/` for Codex-facing plugins
- `opencode-marketplace/` for OpenCode-facing plugins

OpenCode support is rolling out in stages rather than matching Claude and Codex yet. Use the
[Platform Support Matrix](docs/marketplaces/platform-support-matrix.md) and
[OpenCode Roadmap](docs/marketplaces/opencode-roadmap.md) for current coverage and gating.

The repository root is a harness, not the canonical marketplace. Claude and Codex resolve
through root shims:

- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`

OpenCode does not use a root marketplace manifest. Its install entrypoint lives at
`.opencode/INSTALL.md` and installs either project-local `.opencode/` files or global
`~/.config/opencode/` files from the OpenCode marketplace subtree.

Shared support files live in `shared/`, but runtime plugin files stay inside the plugin
roots that each platform resolves.

## Where To Look

- [Claude Marketplace](claude-marketplace/README.md)
- [Codex Marketplace](codex-marketplace/README.md)
- [OpenCode Marketplace](opencode-marketplace/README.md)
- [Platform Support Matrix](docs/marketplaces/platform-support-matrix.md)
- [Migration Rules](docs/marketplaces/migration-rules.md)
- [OpenCode Roadmap](docs/marketplaces/opencode-roadmap.md)

## Current Layout

- `claude-marketplace/plugins/` contains the Claude plugin copies
- `codex-marketplace/plugins/` contains the Codex plugin copies
- `opencode-marketplace/plugins/` contains the OpenCode plugin copies
- `.opencode/INSTALL.md` contains the fetched OpenCode install instructions
- `shared/` contains non-runtime support files such as validation scripts and references
- `docs/` contains design notes and contributor guidance

## Working Rule

Start with explicit platform-specific duplication. Only introduce generation or shared-source rendering if duplicated maintenance becomes a real problem.
