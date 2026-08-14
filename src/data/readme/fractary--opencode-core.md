# Fractary Core

Core utilities for Fractary - foundational operations for work tracking, repository management, logging, file storage, and documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why Fractary Core?

Fractary Core was born from a simple observation: when building multiple projects with LLMs and agentic tools like Claude Code, the same challenges kept surfacing - managing issues, handling repository operations, organizing logs and documentation, dealing with files across different storage providers. Rather than reinventing these utilities in every project, Fractary Core consolidates them into a single, shared toolset that any project can use.

Even on its own, Fractary Core makes everyday LLM-assisted development easier - interacting with GitHub issues, managing files and logs, organizing documentation, and supporting best practices like spec-driven development. It also serves as the foundational layer for the broader Fractary ecosystem (Codex, FABER, Forge, and others), providing the common utilities they all depend on.

The project is open-source so that anyone working with agentic engineering tools can benefit from and contribute to these shared primitives.

## Design Philosophy

### SDK-First

All deterministic logic lives in the SDK. This makes core operations reliable and consistent regardless of how they're accessed, and means any program can tap into the functionality directly. The CLI wraps the SDK for terminal and scripting use. The MCP server and Claude Code plugins then layer on top, adding AI-agent accessibility. The result is maximum flexibility in how you interact with the same underlying capabilities.

### Generic Over Tool-Specific

Fractary Core provides abstract operations - "repo" not "GitHub", "work" not "Jira" - with a handler/adapter pattern behind the abstraction. This means workflows built on top of Fractary Core don't need to know or care which platform sits behind the interface. Switch from GitHub Issues to Jira, or from local file storage to S3, and the workflows keep working. This is what allows higher-level Fractary plugins and any custom workflows to work with any supported platform without custom integrations.

### Framework-Independent

While much of the early development was done with Claude Code, the architecture intentionally avoids being locked to any single agentic harness or model. The SDK and CLI work anywhere. The MCP server works with any MCP-compatible client. This flexibility is by design - the tools should be useful regardless of which AI model or orchestration framework you choose.

## Platform Support

> **Currently only GitHub is fully implemented** for work tracking and repository operations. Jira, Linear, GitLab, and Bitbucket handler stubs exist for future implementation.

| Toolset | Supported Platforms |
|---------|---------------------|
| **Work** | GitHub Issues (Jira, Linear planned) |
| **Repo** | GitHub (GitLab, Bitbucket planned) |
| **File** | Local, AWS S3, Cloudflare R2, Google Cloud Storage, Google Drive |
| **Logs** | Local storage |
| **Docs** | Local storage |

## Interfaces

Fractary Core exposes the same functionality through four interfaces, each building on the layer below:

| Interface | Package | Install |
|-----------|---------|---------|
| **SDK** | [`@fractary/core`](./sdk/js/) | `npm install -g @fractary/core` |
| **CLI** | [`@fractary/core-cli`](./cli/) | `npm install -g @fractary/core-cli` |
| **MCP Server** | [`@fractary/core-mcp`](./mcp/server/) | `npm install -g @fractary/core-mcp` |
| **Plugins** | 6 Claude Code plugins | See [plugin docs](./docs/interfaces/plugins.md) |

## Quick Start

### SDK

```typescript
import { createWorkManager, createRepoManager } from '@fractary/core';

const workManager = await createWorkManager();
const issue = await workManager.fetchIssue(123);

const repoManager = await createRepoManager();
await repoManager.createBranch('feature/auth', { base: 'main', checkout: true });
```

### CLI

```bash
# Work tracking
fractary-core work issue-fetch 123
fractary-core work issue-create --title "Bug: Login fails" --labels "bug"

# Repository operations
fractary-core repo commit --message "Add feature" --type feat --all
fractary-core repo pr-create --title "Feature PR" --draft

# Log management
fractary-core logs write --type session --title "Debug session" --content "..." --issue 123
fractary-core logs search --query "error" --type session

# File operations
fractary-core file upload ./report.pdf --remote-path exports/report.pdf
fractary-core file list --prefix data/

# Documentation
fractary-core docs doc-create user-guide --title "User Guide" --content "..."
fractary-core docs doc-search --text "authentication"
```

### MCP Server

```json
{
  "mcpServers": {
    "fractary-core": {
      "command": "npx",
      "args": ["-y", "@fractary/core-mcp"]
    }
  }
}
```

### Claude Code Plugins

```
/fractary-core-config-init          # Initialize configuration
/fractary-work-issue-fetch          # Fetch an issue
```

*"Come up with a plan to resolve the issue and then proceed to do so"*

```
/fractary-docs-doc-create           # Create a document
/fractary-repo-commit-push-pr       # Commit, push, and create PR
/fractary-repo-pr-merge             # Merge a pull request
```

## Project Structure

```
core/
├── sdk/js/                # TypeScript SDK (@fractary/core)
├── cli/                   # CLI (@fractary/core-cli)
├── mcp/server/            # MCP Server (@fractary/core-mcp)
├── plugins/               # Claude Code plugins (6 total)
│   ├── core/              # Configuration management
│   ├── work/              # Work item tracking
│   ├── repo/              # Repository operations
│   ├── logs/              # Log management
│   ├── file/              # File storage
│   └── docs/              # Documentation management
├── docs/                  # Documentation
└── templates/             # Log and document templates
```

## Documentation

**[Complete Documentation](./docs/README.md)**

| Documentation | Description |
|---------------|-------------|
| [Getting Started](./docs/getting-started.md) | Install, configure, first operations |
| [Work Tracking](./docs/features/work.md) | Issues, comments, labels, milestones |
| [Repository Management](./docs/features/repo.md) | Branches, commits, PRs, tags, worktrees |
| [File Storage](./docs/features/file.md) | Local, S3, R2, GCS, Google Drive operations |
| [Log Management](./docs/features/logs.md) | Session capture, search, analysis, retention |
| [Documentation](./docs/features/docs.md) | Type-aware docs with validation and refinement |
| [Configuration Guide](./docs/guides/configuration.md) | `.fractary/config.yaml` reference |

## Development

```bash
# Install dependencies (all workspaces)
npm install

# Build all packages
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

### Individual Packages

```bash
cd sdk/js && npm run build    # SDK
cd cli && npm run build       # CLI
cd mcp/server && npm run build # MCP Server
```

## Roadmap

Fractary Core is functional and used daily, but there are clear areas for growth:

- **Additional platform handlers** - Only GitHub is fully implemented today. Building out Jira and Linear handlers for work tracking, and GitLab and Bitbucket handlers for repository operations, would make the generic interface promise real across platforms.
- **Python SDK** - The current SDK is TypeScript-only. A Python SDK would open Fractary Core to the broader AI/ML ecosystem where Python is the dominant language.
- **MCP server hardening** - The MCP server exists but hasn't been heavily used or tested in production. It needs real-world validation, better error handling, and performance testing with various MCP clients.
- **Broader agentic framework support** - While the architecture is framework-independent by design, practical integration testing and documentation for frameworks beyond Claude Code would help make that a reality.

Contributions in any of these areas are welcome.

## License

MIT
