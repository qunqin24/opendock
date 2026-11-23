# @jalvarezsamayoa/factory

Portable agents, skills, tools, and Markdown definitions for running a structured software development workflow across OpenCode, Claude Code, and Antigravity.

## What is included

| Item | Name | Purpose |
| --- | --- | --- |
| Skill | `factory` | Eight-gate development workflow coordinating planning, review, and verification |
| Skill | `bug-hunting` | Execution-backed bug hunting with failing tests and a 7-question gate |
| Skill | `field-notes` | Read-before-planning and write-on-failure protocol for project field notes |
| Skill | `scratch-files` | Isolated workspace under `docs/scratch-files/` for pre-plan design drafts |
| Skill | `worklog` | Cross-repo coordination and task tracking through an uncommitted `worklog.org` |
| Command | `/factory` | Control plane for `help`, `workspace [name]`, and `init [harness]` |
| Tool | `factory` | Same control actions exposed as a model-callable tool |
| Agent | `contrarian` | Challenges assumptions and argues for simpler alternatives |
| Agent | `contractor` | Pressure-tests procedures and contracts, stopping at the first gap |
| Agent | `software-reviewer` | Reviews correctness, complexity, maintainability, and test coverage |
| Agent | `security-reviewer` | Reviews authz boundaries, input handling, secrets, and dependencies |
| Agent | `bug-hunter` | Proves defects with executable tests or reproduction scripts |

All agents, skills, and commands ship as real Markdown files under `agents/`, `skills/`, and `commands/` so the same definitions install into OpenCode, Claude Code, and Antigravity.

## Install

### OpenCode

Add the package to the `plugins` array in `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@jalvarezsamayoa/factory"]
}
```

The plugin registers all five skills, the `/factory` command, and the `factory` tool automatically. OpenCode reloads plugins after saving config; run `/reload` if needed.

OpenCode plugins cannot create new agents through the plugin API. Install the agent files once with:

```text
/factory init
```

This writes the five agent files to `.opencode/agents/`. To install them automatically whenever the plugin loads, set the `installAgents` option:

```jsonc
{
  "plugins": [
    {
      "package": "@jalvarezsamayoa/factory",
      "options": { "installAgents": "project" }
    }
  ]
}
```

Set `"global"` to install into `~/.config/opencode/agents/`.

### Claude Code

```bash
npx @jalvarezsamayoa/factory init claude
```

This writes:

```text
.claude/agents/*.md
.claude/skills/<skill>/SKILL.md
.claude/commands/factory.md
```

Pass `--global` to install into `~/.claude/`.

### Antigravity

```bash
npx @jalvarezsamayoa/factory init antigravity
```

This installs a native Antigravity plugin bundle under `.agents/plugins/factory/`:

```text
.agents/plugins/factory/plugin.json
.agents/plugins/factory/agents/*.md
.agents/plugins/factory/skills/<skill>/SKILL.md
```

Pass `--global` to install into `~/.gemini/config/plugins/factory/`. Antigravity discovers the plugin automatically, registers all five subagents from `agents/*.md`, and exposes all five skills.

### Every harness

```bash
npx @jalvarezsamayoa/factory init all
```

## Use

Create a workspace for a ticket or project:

```text
/factory workspace JIRA-123
```

This creates `<cwd>/JIRA-123/`:

```text
JIRA-123/
├── AGENTS.md
├── worklog.org
├── .envrc
├── .tool-versions
├── <harness-dir>/
│   └── field-notes.md
├── docs/
│   ├── backlog/
│   │   └── README.md
│   └── scratch-files/
├── repos/
└── tmp/
```

`<harness-dir>` matches your harness: `.opencode`, `.claude`, or `.agents`.

Then run the eight quality gates defined in the `factory` skill:

1. Plan validation: write an ordered plan with verification checks, complexity budgets, and impact analysis.
2. Contrarian pass: dispatch `contrarian` to challenge assumptions and cut avoidable complexity.
3. Contractor pass: dispatch `contractor` to surface gaps or missing criteria before coding.
4. Test-driven development: write failing tests first, then the minimum code to make them pass.
5. Code review: dispatch `software-reviewer` to review the diff against the plan and complexity limits.
6. Security review: dispatch `security-reviewer` to check trust boundaries, data handling, and secrets.
7. Documentation audit: update `README.md` and `docs/` in the same pass as the code.
8. Verification before completion: run the full test suite, linter, typecheck, and build before claiming completion.

Print the command reference at any time with `/factory help`.

## CLI

The package ships a `factory` binary for harnesses that do not load the OpenCode plugin:

```bash
npx @jalvarezsamayoa/factory help
npx @jalvarezsamayoa/factory workspace checkout-retry
npx @jalvarezsamayoa/factory init claude --global
npx @jalvarezsamayoa/factory init all --force
```

Flags:

- `--global`, `-g`: target user config instead of the current project.
- `--force`, `-f`: overwrite files that differ from the packaged version.
- `--harness`, `-H`: choose `opencode`, `claude`, `antigravity`, or `all`.

Without `--force`, existing files that differ from the packaged version are skipped so local edits are preserved.

## Repository layout

```text
agents/                     Portable agent definitions
skills/                     Skills (factory, bug-hunting, field-notes, scratch-files, worklog)
commands/factory.md         Control-plane command for file-based harnesses
src/index.ts                OpenCode plugin entrypoint
src/factory.ts              Shared actions and argument parsing
src/install.ts              Harness discovery paths and installer
src/workspace.ts            Workspace templates
src/cli.ts                  `factory` binary
test/factory.test.js        Unit tests
```

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
```

Test the OpenCode plugin locally by pointing `opencode.jsonc` at your checkout:

```jsonc
{
  "plugins": ["/absolute/path/to/ai-factory-skills"]
}
```

Or copy the repository into a test project's `.opencode/plugins/factory/` and run `opencode debug agents`.

## Releases

`.github/workflows/release.yml` runs typecheck, build, and tests on every branch and pull request. When tests pass on `main`, the `release` job runs `semantic-release` to bump the version, update `CHANGELOG.md`, commit the release assets back to `main`, create a GitHub Release, and publish to npm.

Commit messages follow Conventional Commits (`fix:` for patch, `feat:` for minor, `BREAKING CHANGE:` for major).

Publishing uses npm OIDC Trusted Publishing (`id-token: write`, no `NPM_TOKEN` secret required). Configure Trusted Publishing on npmjs.com for `jalvarezsamayoa/ai-factory-skills` pointing to `release.yml`.

## Notes

- OpenCode's agent transform can update or remove discovered agents but cannot register new ones. Installing the agent files via `/factory init` or `installAgents` is the supported path.
- The OpenCode plugin uses the V2 plugin API (`Plugin.define` with `setup`).
