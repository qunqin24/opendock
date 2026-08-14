# phlight

A shitty little set of workflow skills that aspires to be a controlled, modular workflow for your AI coding agent. Built on [Superpowers](https://github.com/obra/superpowers).

Every skill accepts `--help` (also `-h`, `help`) to print its usage screen and exit without running. That's the authoritative reference for args, flags, and prerequisites.

## Skills

**Pipeline** (chain with `--auto`):

| Skill | Purpose |
|---|---|
| **architect** | Brainstorm and plan interactively, producing a plan file |
| **split** | Break large plans into PR-sized chunks with dependency tracking |
| **implement** | Execute a plan with subagent-driven development |
| **review** | Opinionated PR fitness review focused on bloat and anti-patterns |
| **merge** | Create PR, wait for checks, merge, cleanup |

**Standalone:**

| Skill | Purpose |
|---|---|
| **fast** | Full pipeline in one session for quick fixes and small features |
| **dispatch** | Send a task or question to an agent in another tmux pane |
| **ask** | Read-only Q&A - ideation, triage, architecture questions |
| **task** | Create, view, and list tasks in your configured provider |
| **cleanup** | Delete stale git branches locally and optionally on remote |
| **project-init** | Detect and configure project context for all skills |
| **skill-build** | Interactive workflow for building new phlight skills |

```
architect -> split (if needed) -> implement -> review -> merge
                                      |                    |
                                      +-- next split plan -+

dispatch -----> [another pane runs fast, implement, or ask]
```

## Flags

`--auto` chains skills together. After each skill completes (and any human stop is cleared), it invokes the next in the pipeline. Attach at any entry point:

```
/phlight-architect my feature --auto
/phlight-implement path/to/plan.md --auto
/phlight-review --auto
```

`--noconfirm` skips the merge confirmation step. All other human stops (plan approval, manual testing) are always enforced.

## Human Stops

Even in `--auto` mode, these always pause for you:

| When | You need to |
|---|---|
| **architect** completes | Read the plan, approve or request changes |
| **implement** completes | Go to the worktree, test manually, confirm it works |
| **implement** hits a project-specific intervention | Follow the documented procedure (migrations, etc.) |
| **merge** is ready | Confirm you want to merge (skipped with `--noconfirm`) |

Everything else is autonomous.

## Installation

### Dependencies

- [Superpowers](https://github.com/obra/superpowers) - brainstorming, writing-plans, executing-plans skills
- [pr-review-toolkit](https://github.com/anthropics/claude-plugins-official) - code-reviewer, code-simplifier agents

### Claude Code (via Plugin Marketplace)

```bash
/plugin marketplace add evansendra/phlight
```

```bash
/plugin install phlight@phlight-marketplace
```

### Claude Code (local development)

```bash
claude --plugin-dir /path/to/phlight
```

### OpenCode

Add phlight as an npm runtime plugin in your OpenCode config, either project-level
`opencode.json` or global `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": ["phlight"]
}
```

Restart OpenCode after changing config. This is the same runtime-plugin pattern
Superpowers uses: the package registers `skills/` from
`.opencode/plugins/phlight.js`. It is not a TUI plugin, so do not install it
through the TUI plugin installer.

OpenCode caches npm plugins under `~/.cache/opencode/packages/`, not `~/.config/opencode/plugins/`.

### Verify

```bash
opencode debug config | rg 'phlight|plugin_origins|skills'
node -p 'require(process.env.HOME + "/.cache/opencode/packages/phlight@latest/node_modules/phlight/package.json").version'
```

In a new OpenCode session, use the skill tool to list skills and confirm the `phlight-*` skills are available.

## Configuration

Config lives in your CLAUDE.md or rules files. Run `/phlight-project-init` for guided setup, or add manually:

```markdown
## Task Management
- tool: github
- repo: owner/repo
- id-format: #xxx
```

Providers: `clickup`, `linear`, `github`, `jira`, `none`

```markdown
## Quality Gates
- test: npm test
- lint: npm run lint
- format: npm run format
```

```markdown
## Plans
- directory: docs/plans
- pr-target: 400
```

Plans config is optional; defaults to `docs/plans/` and 400 lines per PR.

### Config file locations

| Scope | Claude Code | OpenCode |
|---|---|---|
| Project (shared) | `CLAUDE.md` or `.claude/CLAUDE.md` | `opencode.md` or `.opencode/opencode.md` |
| Per-user | `.claude/rules/CLAUDE.local.md` | `.opencode/rules/*.local.md` |
| Global | `~/.claude/CLAUDE.md` | `~/.config/opencode/opencode.md` |

## Quick Start

```
/phlight-fast fix the login redirect loop on the /callback route
```

```
/phlight-architect add CSV export to the reports dashboard --auto
```

## License

MIT
