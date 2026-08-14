# @oh-my-sidebar — OpenCode TUI Plugins

[![CI](https://github.com/edso404/oh-my-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/edso404/oh-my-sidebar/actions/workflows/ci.yml)
[![Release](https://github.com/edso404/oh-my-sidebar/actions/workflows/release.yml/badge.svg)](https://github.com/edso404/oh-my-sidebar/actions/workflows/release.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Monorepo for [OpenCode](https://github.com/opencopilotdev/opencode) TUI sidebar plugins, published as scoped npm packages under `@oh-my-sidebar/`.

Plugins extend the OpenCode sidebar with real-time session telemetry — context window usage, token breakdowns by model, and session costs — rendered as native TUI components.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@oh-my-sidebar/opencode-context-progress](./packages/context-progress) | [![npm](https://img.shields.io/npm/v/@oh-my-sidebar/opencode-context-progress)](https://www.npmjs.com/package/@oh-my-sidebar/opencode-context-progress) | Context usage progress bar with color-coded warnings |
| [@oh-my-sidebar/opencode-session-tokens](./packages/session-tokens) | [![npm](https://img.shields.io/npm/v/@oh-my-sidebar/opencode-session-tokens)](https://www.npmjs.com/package/@oh-my-sidebar/opencode-session-tokens) | Per-model token usage breakdown with collapsible view |

## Architecture

```
@oh-my-sidebar (monorepo)
├── packages/
│   ├── context-progress    # Progress bar + cost display
│   └── session-tokens      # Token breakdown by model
└── (published individually to npm)
```

Each plugin is an independent npm package that hooks into the OpenCode TUI plugin system via the `sidebar_content` slot. They share a common dependency stack:

- **Runtime:** Solid.js (reactive UI in terminal)
- **UI framework:** OpenTUI (`@opentui/core` + `@opentui/solid`)
- **Plugin API:** `@opencode-ai/plugin/tui`
- **Build:** TypeScript + tsup (ESM only)

Plugins are registered in the OpenCode TUI configuration (`tui.jsonc`) and rendered as native sidebar widgets with full terminal interactivity — no DOM, no webview, no external processes.

## Prerequisites

- **Node.js** >= 22
- **pnpm** >= 11.9 (install via `corepack enable && corepack prepare pnpm@11.9.0 --activate`)
- **OpenCode** >= 1.4.3 (for running the plugins)

## Getting Started

```bash
pnpm install
pnpm build
```

## Development

```bash
pnpm dev         # watch mode — rebuilds on source changes
pnpm lint        # biome check . (formatting + linting)
pnpm format      # biome check --write . (auto-fix)
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # vitest (per-package)
pnpm check       # lint + typecheck in one pass
```

## Adding a Plugin

```bash
# Copy the template package:
cp -r packages/context-progress packages/my-plugin

# Update package.json: name, description, keywords
# Update src/index.tsx: plugin ID, slot handler
# Add to root README table
# Add to pnpm-workspace.yaml catalog if new dependencies needed
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full contribution workflow.

## Publishing

The project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. All releases are automated via GitHub Actions:

```bash
pnpm changeset        # record version changes (patch/minor/major)
# Merge PR → CI publishes automatically
```

**Do not `npm publish` manually.** Always go through the changesets → PR → main → release pipeline.

| Command | Purpose |
|---------|---------|
| `pnpm changeset` | Create a new changeset |
| `pnpm ci:publish` | Build + publish (CI only) |

## Repository

- **GitHub:** [edso404/oh-my-sidebar](https://github.com/edso404/oh-my-sidebar)
- **Issues:** [github.com/edso404/oh-my-sidebar/issues](https://github.com/edso404/oh-my-sidebar/issues)

## License

MIT — see [LICENSE](./LICENSE).
