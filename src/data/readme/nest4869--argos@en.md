<div align="center">

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  <img src="img/logo.png" alt="Argos logo" width="240">
  <p><i>A multi-agent orchestration system for OpenCode.</i></p>
</div>

## Overview

In typical multi-agent systems, a central orchestrator maintains awareness of all agents' roles while delegating tasks. However, this design faces the issue of increasing decision-making load on the orchestrator as the number of agents grows. Furthermore, since all interactions with sub-agents occur within the orchestrator's same context, context window pollution and bloating are likely to occur, which is known to be a factor in declining accuracy for long-term tasks.

Argos is a multi-agent orchestration system for OpenCode developed to mitigation these problems. The orchestrator specifies only "what kind of task it is (tags)" rather than "which agent to ask," and Argos takes over the agent selection.

## Quick Start

### 1. Prerequisites
- **Bun** must be installed
- **OpenCode** must be installed

### 2. Setup & Launch
Installation is completed in the following two steps.

```bash
# Installation and configuration (interactive wizard)
bunx @nest4869/argos install

# Launch OpenCode
opencode
```

## Agents
Argos provides the following 12 types of built-in agents specialized for their roles.

| Name | Role |
| :--- | :--- |
| `orchestrator` | Responsible for planning complex tasks and automatic delegation to specialist agents |
| `architect` | Responsible for creating system designs, technical blueprints, schemas, and implementation plans (does not implement code) |
| `coder` | Responsible for medium-scale feature development, algorithm implementation, and design-based refactoring (approx. 10–500 lines) |
| `designer` | Responsible for UI/UX design and implementation, styling, responsive design, and component design |
| `explorer` | Responsible for high-speed codebase searching, pattern matching, and identifying files or code patterns |
| `fixer` | A specialist focused on ultra-fast fixes and edits to a single file |
| `general` | Responsible for utility tasks such as documentation creation, configuration, and project maintenance |
| `librarian` | Responsible for researching external documentation and libraries, and searching for official documentation or GitHub code examples |
| `oracle` | The only technical advisor that the `orchestrator` can consult directly. Responsible for design decisions and debugging support (not executed as a task) |
| `refactorer` | Responsible for complex multi-file refactoring that requires continuous context |
| `reviewer` | Responsible for auditing code quality based on security, logic, and clean code motivations |
| `tester` | Responsible for generating and running test suites and verifying code correctness |

## Documentation
For more detailed information, please refer to the following documents.

- [Installation Guide](docs/en/installation.md)
- [Configuration Reference](docs/en/configuration.md)
- [Architecture Details](docs/en/architecture.md)
- [Agent Reference](docs/en/agents.md)
- [Tool Reference](docs/en/tools.md)
- [tmux Integration Guide](docs/en/tmux-visualization.md)

## License
MIT

