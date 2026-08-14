# Fractary Codex

Knowledge infrastructure for AI agents.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview

Fractary Codex provides infrastructure for managing organizational knowledge across AI agents and projects. It implements a universal reference system (`codex://` URIs), multi-provider storage, intelligent caching, and file synchronization.

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@fractary/codex`](./sdk/js/) | JavaScript/TypeScript SDK | `npm install @fractary/codex` |
| [`@fractary/codex-cli`](./cli/) | Command-line interface | `npm install -g @fractary/codex-cli` |
| [`@fractary/codex-mcp`](./mcp/server/) | MCP server for AI agents | `npx @fractary/codex-mcp` |
| [Claude Code Plugin](./plugins/codex/) | Claude Code integration | Install via plugin system |

## Quick Start

> **New here?** See the [Getting Started Guide](./docs/getting-started.md) for a full walkthrough: creating a codex repository, setting up a GitHub token, and running your first sync.

### 1. Install

```bash
npm install -g @fractary/codex        # SDK (required by CLI and MCP server)
npm install -g @fractary/codex-cli   # CLI
```

### 2. Initialize configuration

Codex configuration lives in the `codex:` section of `.fractary/config.yaml`, alongside other Fractary plugin settings. This file is created by `@fractary/core` — initialize that first.

**Recommended:** Use the Claude Code plugin. The `/fractary-codex-config init` skill auto-detects your organization, project, and codex repository before writing anything.

**Alternative:** Use the CLI directly:

```bash
fractary-codex config-init --org myorg --codex-repo codex.myorg.com
```

### 3. Fetch documents

```bash
fractary-codex document-fetch codex://myorg/project/docs/api.md
```

### 4. Sync with codex repository

```bash
fractary-codex sync --dry-run
fractary-codex sync
```

### 5. Manage cache

```bash
fractary-codex cache-list --verbose
fractary-codex cache-stats
fractary-codex cache-clear --all
fractary-codex cache-health
```

### 6. Use programmatically

```typescript
import { CodexClient } from '@fractary/codex'

// organizationSlug is optional — auto-detected from git remote if omitted
const client = await CodexClient.create({ organizationSlug: 'myorg' })
const result = await client.fetch('codex://myorg/project/docs/api.md')
console.log(result.content.toString())
```

## MCP Server

Add to `.mcp.json` for AI agent integration:

```json
{
  "mcpServers": {
    "fractary-codex": {
      "command": "npx",
      "args": ["-y", "@fractary/codex-mcp", "--config", ".fractary/config.yaml"]
    }
  }
}
```

## Claude Code Plugin

The plugin provides skills for Claude Code, invocable as slash commands:

| Skill | Description |
|-------|-------------|
| `/fractary-codex-config init` | Initialize codex configuration |
| `/fractary-codex-config update` | Update configuration fields |
| `/fractary-codex-config validate` | Validate configuration (read-only) |
| `/fractary-codex-sync` | Sync project with codex repository |

## URI Format

```
codex://org/project/path/to/file.md
       └─┬─┘└──┬──┘└──────┬───────┘
         │     │          └─ File path within project
         │     └─ Project/repository name
         └─ Organization name
```

## Project Structure

```
codex/
├── sdk/js/             # @fractary/codex - TypeScript SDK
├── cli/                # @fractary/codex-cli - CLI tool
├── mcp/server/         # @fractary/codex-mcp - MCP server
├── plugins/codex/      # Claude Code plugin
│   └── skills/         # Plugin skills (config, sync, memory, etc.)
├── docs/               # Documentation
└── specs/              # Technical specifications
```

## Documentation

- [Getting Started Guide](./docs/getting-started.md) - First-time setup walkthrough
- [Full Documentation Index](./docs/README.md) - All documentation
- [Feature Guides](./docs/features/) - Organized by function, all interfaces side-by-side
- [Configuration Guide](./docs/configuration.md) - Complete configuration reference
- [CLI Command Reference](./cli/README.md) - All commands with options and flags
- [SDK API Reference](./sdk/js/README.md) - TypeScript/JavaScript SDK
- [MCP Server Reference](./mcp/server/README.md) - AI agent integration
- [Plugin Reference](./plugins/codex/README.md) - Claude Code plugin

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm test

# Type check
npm run typecheck
```

## License

Apache-2.0
