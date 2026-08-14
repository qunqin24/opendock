# Everything OpenCode - OpenCode Plugin

> **Note:** This is a forked version of [everything-claude-code](https://github.com/affaan-m/everything-claude-code) specifically adapted for OpenCode.

![OpenCode](https://img.shields.io/badge/OpenCode-Plugin-blue)
![Version](https://img.shields.io/badge/Version-1.8.0-green)
![License](https://img.shields.io/badge/License-MIT-blue)

Everything OpenCode (EOC) provides a comprehensive plugin for OpenCode with agents, commands, skills, hooks, and rules for AI-assisted software development.

## Features

| Feature | Count | Description |
|---------|-------|-------------|
| **Agents** | 16 | Specialized subagents for delegation |
| **Commands** | 40+ | Slash commands for quick execution |
| **Hooks** | 11+ | Event-based automations |
| **Custom Tools** | 3 | Native tools for testing and security |
| **Instructions** | 1 | Consolidated rules and guidelines |

## Installation

### Quick Install
```bash
# Global install (to ~/.config/opencode/)
bun x eoc-opencode@latest

# Local install (to project .opencode/ directory)
bun x eoc-opencode@latest --local

# Upgrade existing
bun x eoc-opencode@latest --upgrade

# Uninstall
bun x eoc-opencode@latest --uninstall
```

---

## How to Use

### Using Commands

Commands are invoked with `/` prefix. They delegate to specialized agents.

```bash
# Plan a feature
/plan

# Run TDD workflow
/tdd

# Review code
/code-review
```

### Using Agents Directly

You can invoke agents directly via the `/ask` command or by mentioning them:

```bash
# Use planner agent directly
@planner Design a user authentication system

# Use security reviewer
@security-reviewer Audit the auth module
```

### Using Skills

Skills provide domain-specific knowledge. Load them when needed:

```bash
# Load backend patterns skill
@skill backend-patterns

# Load security review skill  
@skill security-review
```

---

## Available Commands

### Planning & Development

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/plan` | Create implementation plan | `/plan Build a user authentication system` |
| `/tdd` | Test-driven development | `/tdd Add login validation` |
| `/code-review` | Code quality review | `/code-review` or `/code-review --security` |
| `/build-fix` | Fix build errors | `/build-fix` |
| `/refactor-clean` | Remove dead code | `/refactor-clean` |

### Testing & Quality

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/e2e` | Generate E2E tests | `/e2e User login flow` |
| `/test-coverage` | Analyze coverage | `/test-coverage` |
| `/verify` | Verification loop | `/verify` |

### Security

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/security-scan` | Security audit | `/security-scan` |

### Language-Specific

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/go-review` | Go code review | `/go-review` |
| `/go-build` | Fix Go build errors | `/go-build` |
| `/go-test` | Run Go tests | `/go-test` |
| `/python-review` | Python code review | `/python-review` |

### Multi-Model Operations

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/multi-plan` | Multi-model planning | `/multi-plan Feature request` |
| `/multi-execute` | Multi-model execution | `/multi-execute Implement auth` |
| `/multi-frontend` | Frontend multi-model | `/multi-frontend React component` |
| `/multi-backend` | Backend multi-model | `/multi-backend API endpoint` |
| `/multi-workflow` | Workflow multi-model | `/multi-workflow Full feature` |

### Documentation & Refactoring

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/update-docs` | Update documentation | `/update-docs` |
| `/refactor-clean` | Clean dead code | `/refactor-clean` |

### Operations & DevOps

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/pm2` | PM2 service management | `/pm2 status` |
| `/setup-pm` | Setup PM2 | `/setup-pm` |
| `/sessions` | Session history | `/sessions` |
| `/harness-audit` | Audit harness | `/harness-audit` |
| `/quality-gate` | Quality checks | `/quality-gate` |

### Loops & Automation

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/loop-start` | Start agentic loop | `/loop-start Build feature` |
| `/loop-status` | Check loop status | `/loop-status` |
| `/evolve` | Auto-evolve code | `/evolve` |

### Learning & Evaluation

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/learn` | Learn from session | `/learn` |
| `/learn-eval` | Evaluate learning | `/learn-eval` |
| `/eval` | Evaluate performance | `/eval` |
| `/checkpoint` | Save checkpoint | `/checkpoint` |

### Model Management

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/model-route` | Route to models | `/model-route` |

### Project Management

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/projects` | List projects | `/projects` |
| `/promote` | Promote changes | `/promote` |

### Instincts

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/instinct-status` | Check instincts | `/instinct-status` |
| `/instinct-export` | Export instincts | `/instinct-export` |
| `/instinct-import` | Import instincts | `/instinct-import` |

---

## Available Agents

### Planning & Architecture
| Agent | Description | How to Use |
|-------|-------------|------------|
| `planner` | Creates detailed implementation plans | `@planner Design a REST API` |
| `architect` | System design and architecture | `@architect Scalable microservices` |

### Development
| Agent | Description | How to Use |
|-------|-------------|------------|
| `tdd-guide` | Enforces test-first development | `@tdd-guide Implement user auth` |
| `build-error-resolver` | Fixes build/compilation errors | `@build-error-resolver` |

### Review & Quality
| Agent | Description | How to Use |
|-------|-------------|------------|
| `code-reviewer` | Code quality and security review | `@code-reviewer` |
| `security-reviewer` | Vulnerability analysis | `@security-reviewer` |
| `e2e-runner` | Playwright E2E tests | `@e2e-runner Login flow` |
| `refactor-cleaner` | Dead code removal | `@refactor-cleaner` |
| `doc-updater` | Documentation sync | `@doc-updater` |

### Language-Specific
| Agent | Description | How to Use |
|-------|-------------|------------|
| `go-reviewer` | Go code review | `@go-reviewer` |
| `go-build-resolver` | Go build errors | `@go-build-resolver` |
| `python-reviewer` | Python code review | `@python-reviewer` |
| `database-reviewer` | Supabase/PostgreSQL | `@database-reviewer` |

### Operations
| Agent | Description | How to Use |
|-------|-------------|------------|
| `chief-of-staff` | Communication triage | `@chief-of-staff` |
| `loop-operator` | Autonomous loops | `@loop-operator` |
| `harness-optimizer` | Config optimization | `@harness-optimizer` |

---

## Available Skills

Skills are loaded on-demand for domain-specific guidance.

### core Skills

| Skill | Description | When to Use |
|-------|-------------|-------------|
| `coding-standards` | TS/JS/React best practices | General development |
| `backend-patterns` | Node.js/Express/Next.js APIs | Backend development |
| `frontend-patterns` | React/Next.js patterns | Frontend development |
| `security-review` | Security checklists | Auth, payments, APIs |
| `tdd-workflow` | TDD methodology | Test-driven development |
| `continuous-learning` | Pattern extraction | Learning from sessions |

### Loading a Skill

```bash
# The skill tool loads automatically when you mention the skill
# e.g., "Use the security-review skill" loads it automatically

# Or explicitly:
@skill security-review
```

---

## Custom Tools

### run-tests
Run test suite with optional coverage:
```typescript
await runTests({ coverage: true, file: "src/auth.test.ts" })
```

### check-coverage
Verify 80%+ test coverage:
```typescript
await checkCoverage({ threshold: 80, reporter: "text" })
```

### security-audit
Run security scan:
```typescript
await securityAudit({ fix: true, deep: false })
```

---

## Hook Events

The plugin supports OpenCode events:

| Event | Description |
|-------|-------------|
| `session.created` | Session initialization |
| `session.idle` | Idle detection |
| `session.deleted` | Cleanup |
| `tool.execute.before` | Pre-tool execution |
| `tool.execute.after` | Post-tool execution |
| `file.edited` | File modification |

---

## File Structure

```
.opencode/
|-- index.ts              # Plugin entry
|-- opencode.json         # Config
|-- agents/               # Agent definitions (with embedded prompts)
|-- commands/            # Command files
|-- instructions/        # Rules
|-- skills/              # Domain skills
|-- tools/               # Custom tools
```

---

## Requirements

- OpenCode 1.8.0+
- Node.js 18+

---

## License

MIT License
