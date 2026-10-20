# ystack

A single Claude Code plugin (`ycc`) bundling workflow orchestration, parallel planning, documentation, research, and project management. The repository also generates native compatibility bundles for Cursor, Codex, and opencode.

> **2.0.0 breaking change.** Versions ≤ 1.x shipped 9 separate plugins (`ask`, `plan-workflow`, `git-workflow`, `implement-plan`, `code-report`, `deep-research`, `orchestrate`, `write-docs`, `project`). 2.0.0 collapses all of them into a single `ycc` plugin so every skill is accessible via `ycc:{skill}`. Re-install after upgrading.
> **Migration: `/ycc:ask` and `ycc:ask` retired.** For read-only codebase questions, ask the main session to delegate to `ycc:codebase-advisor`. Request explicit search gaps, assumptions, and analyzed/skipped scope in the answer. Request implementation separately.

## What's inside

<!-- BEGIN:GENERATED-COUNTS -->

The source plugin ships **49 skills**, **49 slash-invocable skills**, and **55 agents**.

<!-- END:GENERATED-COUNTS -->

<!-- BEGIN:GENERATED-COMMANDS -->

| Command / Skill            | Purpose                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ycc:backport`            | Backports merged trunk PRs to maintenance branches.                                                                                                                           |
| `/ycc:blueprint`           | Creates whole-project blueprints and bootstraps new software.                                                                                                                 |
| `/ycc:bundle-author`       | Scaffolds ycc skills and agents for ycc maintainers only.                                                                                                                     |
| `/ycc:bundle-release`      | Prepares ycc bundle releases for ycc maintainers only.                                                                                                                        |
| `/ycc:clean`               | Removes unnecessary project-directory files with approval.                                                                                                                    |
| `/ycc:code-report`         | Generates implementation reports from executed parallel plans.                                                                                                                |
| `/ycc:code-review`         | Reviews local changes or GitHub PRs and saves actionable findings.                                                                                                            |
| `/ycc:compatibility-audit` | Audits ycc compatibility for ycc maintainers only.                                                                                                                            |
| `/ycc:deep-research`       | Conducts multi-perspective strategic research.                                                                                                                                |
| `/ycc:feature-research`    | Researches features with seven specialists and consolidates a feature spec.                                                                                                   |
| `/ycc:formatters`          | Bootstraps project linting and formatting tools.                                                                                                                              |
| `/ycc:frontend-design`     | Builds frontend interfaces with intentional visual direction.                                                                                                                 |
| `/ycc:frontend-patterns`   | Guides React and Next.js component architecture and performance.                                                                                                              |
| `/ycc:git-cleanup`         | Audits stale Git resources and cleans them with approval.                                                                                                                     |
| `/ycc:git-workflow`        | Orchestrates commits, documentation updates, pushes, and PRs.                                                                                                                 |
| `/ycc:go-patterns`         | Use when structuring Go packages or service layers, handling wrapped errors, or managing goroutines and context cancellation.                                                 |
| `/ycc:go-testing`          | Guides Go testing with TDD, table-driven tests, and fuzzing.                                                                                                                  |
| `/ycc:hooks-workflow`      | Generates hook configuration from language rules.                                                                                                                             |
| `/ycc:implement-plan`      | Executes parallel-plan.md with dependency-aware implementor batches.                                                                                                          |
| `/ycc:init`                | Initializes project AI-agent docs and workspace conventions.                                                                                                                  |
| `/ycc:orchestrate`         | Coordinates specialized agents in dependency-resolved batches.                                                                                                                |
| `/ycc:parallel-plan`       | Creates parallel-plan.md from existing shared.md through plan-workflow.                                                                                                       |
| `/ycc:plan`                | Use when comparing two implementation options or walking through tradeoffs before committing to one, breaking a change into steps, or planning conversationally for approval. |
| `/ycc:plan-workflow`       | Use when validating existing research docs before planning, running a research-to-plan workflow, or producing shared.md and parallel-plan.md.                                 |
| `/ycc:pr-autofix`          | Applies GitHub PR comments and resolves review threads.                                                                                                                       |
| `/ycc:prp-commit`          | Stages selected changes and creates one Conventional Commit.                                                                                                                  |
| `/ycc:prp-implement`       | Executes PRP plan files with validation loops, reports, and archiving.                                                                                                        |
| `/ycc:prp-plan`            | Creates self-contained PRP plans with codebase patterns.                                                                                                                      |
| `/ycc:prp-pr`              | Creates GitHub PRs from already-committed branches without commit orchestration.                                                                                              |
| `/ycc:prp-prd`             | Develops problem-first PRDs through interactive discovery.                                                                                                                    |
| `/ycc:prp-spec`            | Writes lightweight single-pass PRP feature specs.                                                                                                                             |
| `/ycc:python-patterns`     | Guides idiomatic Python design and resource handling.                                                                                                                         |
| `/ycc:python-testing`      | Guides pytest testing with TDD, fixtures, and mocks.                                                                                                                          |
| `/ycc:quick-fix`           | Applies inline Quick Review findings without review artifacts.                                                                                                                |
| `/ycc:quick-review`        | Reviews uncommitted changes inline without saving by default.                                                                                                                 |
| `/ycc:release-model`       | Creates, upgrades, or audits RELEASING.md branching policy.                                                                                                                   |
| `/ycc:releaser`            | Prepares external-project releases, notes, and release CI.                                                                                                                    |
| `/ycc:research-to-issues`  | Converts research and planning documents into structured tracking issues.                                                                                                     |
| `/ycc:resume-session`      | Loads saved session context and briefs the next step without starting work.                                                                                                   |
| `/ycc:review-fix`          | Applies saved code-review findings and updates artifact status.                                                                                                               |
| `/ycc:rust-patterns`       | Guides idiomatic Rust ownership, errors, and concurrency.                                                                                                                     |
| `/ycc:rust-testing`        | Guides Rust testing with TDD and property checks.                                                                                                                             |
| `/ycc:save-session`        | Saves session progress, failures, and next steps for later resumption.                                                                                                        |
| `/ycc:shared-context`      | Creates verified shared.md research context through plan-workflow.                                                                                                            |
| `/ycc:ts-patterns`         | Guides framework-agnostic TypeScript types, modules, and async code.                                                                                                          |
| `/ycc:ts-testing`          | Guides TypeScript testing with Vitest and TDD.                                                                                                                                |
| `/ycc:visual-plan`         | Renders existing plans as interactive visual documents.                                                                                                                       |
| `/ycc:visual-recap`        | Builds local-only visual recaps from Git diffs.                                                                                                                               |
| `/ycc:write-docs`          | Coordinates parallel documentation agents to audit and improve project docs.                                                                                                  |

<!-- END:GENERATED-COMMANDS -->

### Maintainer-only workflows

`/ycc:bundle-author`, `/ycc:bundle-release`, and `/ycc:compatibility-audit`
are maintainer-only workflows for this repo's layout. General users can ignore
them — they are not general-purpose tooling. They stay shipped in the single
`ycc` plugin (not excluded from generated targets): `/ycc:bundle-release` backs
the release flow in [RELEASING.md](RELEASING.md), and the other two stay for
single-plugin parity rather than because scripts import them.

### Agents

<!-- BEGIN:GENERATED-AGENTS -->

The plugin bundles **55** specialized agents covering codebase analysis, language experts (Go, Rust, Python, TypeScript), reviewers, planners, documenters, and infrastructure architects.

<details>
<summary>Full agent list (55 agents, grouped by role)</summary>

- **Language experts & implementors** (12): `frontend-ui-developer`, `go-api-architect`, `go-expert-architect`, `nextjs-ux-ui-expert`, `nodejs-backend-architect`, `nodejs-backend-developer`, `python-developer`, `python-expert-architect`, `rust-build-resolver`, `rust-expert-architect`, `typescript-developer`, `typescript-expert-architect`
- **Code review & quality** (7): `backport-conflict-resolver`, `code-reviewer`, `code-simplifier`, `pr-comment-fixer`, `release-fix-applier`, `review-fixer`, `rust-reviewer`
- **Research & discovery** (10): `code-explorer`, `code-finder`, `code-researcher`, `codebase-advisor`, `feature-researcher`, `library-docs-writer`, `practices-researcher`, `prp-researcher`, `research-specialist`, `root-cause-analyzer`
- **Architecture & planning** (5): `architect`, `architecture-analyst`, `code-architect`, `planner`, `test-strategy-planner`
- **Documentation** (7): `api-docs-expert`, `api-documenter`, `code-documenter`, `docs-git-committer`, `documentation-writer`, `feature-writer`, `readme-generator`
- **Infrastructure & DevOps** (7): `ansible-automation-expert`, `cloudflare-architect`, `cloudflare-developer`, `reverse-proxy-architect`, `systems-engineering-expert`, `terraform-architect`, `terraform-developer`
- **Databases** (3): `db-modifier`, `sql-database-developer`, `turso-database-architect`
- **Workflow utilities** (4): `git-cleanup`, `implementor`, `project-file-cleaner`, `releaser`

</details>

<!-- END:GENERATED-AGENTS -->

- **Claude Code:** reference any of them via `subagent_type: "ycc:{agent-name}"`. Canonical source lives in [`ycc/agents/`](ycc/agents/).
- **Cursor:** generated copies live in [`packages/cursor/ycc/agents/`](packages/cursor/ycc/agents/), produced from `ycc/agents/`. See the [Cursor install guide](docs/install/cursor.md).
- **Codex:** generated, Codex-native custom-agent TOMLs live in [`.codex-plugin/agents/`](.codex-plugin/agents/) (produced from `ycc/agents/` — see the [Codex install guide](docs/install/codex.md)).
- **opencode:** generated, opencode-native agent markdown files live in [`.opencode-plugin/agents/`](.opencode-plugin/agents/) (produced from `ycc/agents/` — see the [opencode install guide](docs/install/opencode.md)). Invoke via `@agent-name` or the native v2 `subagent` tool.

**Contributing:** before proposing a new skill or agent, read the Scope & Guardrails policy in [`CONTRIBUTING.md`](CONTRIBUTING.md#scope--guardrails).

- **Credits:** `ycc:visual-plan` and `ycc:visual-recap` are adapted from [BuilderIO/skills](https://github.com/BuilderIO/skills).

## Installation

`ycc` is published as native packages in the Claude Code, Codex, and Cursor
marketplaces of this repository. For Claude Code, install the plugins from the
marketplace:

```bash
# Add the marketplace
/plugin marketplace add yandy-r/ystack

# Install the bundle
/plugin install ycc@ycc

# Optional add-ons: MCP servers, hooks (Claude Code >= 2.1.300), or everything at once
/plugin install ycc-mcp@ycc
/plugin install ycc-hooks@ycc
/plugin install ycc-all@ycc
```

Codex and Cursor:

```bash
codex plugin marketplace add https://github.com/yandy-r/ystack.git
codex plugin add ycc@ycc
codex plugin add ycc-mcp@ycc

agent plugin marketplace add https://github.com/yandy-r/ystack   # then pick packages in /plugins
```

Rules, instructions, settings, and Codex custom agents stay on `install.sh`.
Already installed through `install.sh`? Preview the move onto the native
packages with `./install.sh migrate --target codex` (or `--target claude` /
`--target cursor`; see
[Migrating To Native Packages](docs/install/README.md#migrating-to-native-packages)).

Or enable in `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "ycc@ycc": true
  }
}
```

For local development installs, generated compatibility bundles, model defaults,
and desktop app notes, use the dedicated install guides. Recommended sync form:

```bash
./install.sh sync --target claude --intent hooks,settings,mcp,plugins
./install.sh sync --target claude --intent mods                          # Claude Code mods (ycc/mods)
./install.sh sync --target all --intent settings,rules
./install.sh install --target all --only agents                         # standalone agents, no plugin
./install.sh sync --target codex,claude,opencode --intent mcp            # current project
./install.sh sync --target codex,claude,opencode --intent mcp --global   # user-global
./install.sh sync --target opencode --intent mcp --mcps github,linear    # only these servers
./install.sh list-mcps                                                   # managed MCP server names
./install.sh remove --target all --only mcp                              # undo project MCP
./install.sh remove --target all --intent settings,rules                 # undo any intent, any target
./install.sh cli && ycc completion --install                             # `ycc` on PATH for other projects
```

The `mcp` step defaults to the current project; pass `--global` for user-global
config. `base` ships a target's whole bundle (the `ycc` plugin for Claude and
Codex). `skills`, `agents` and `commands` instead install standalone entries,
one per skill/agent/command, into each tool's own directories
(`~/.claude/skills/<name>`, `~/.codex/agents/<name>.toml`, ...) with no plugin.
On Claude, `commands` is an alias for `skills` (skills are the slash commands);
your own entries there are never touched. `remove` undoes any intent on any target
(`base`, `skills`, `agents`, `commands`, `settings`, `rules`, `mcp`, `hooks`,
`plugins`, `mods`), taking back only what the installer owns and leaving your
own keys, files and servers alone. See
[Project Vs Global Scope](docs/install/README.md#project-vs-global-scope).

`--target` takes a comma-separated list (or `all`); every target is validated
before any of them runs.

Structured config is merged rather than copied: repo-managed keys update while
unknown and locally edited keys remain intact. First-time setup uses `install`
(`./install.sh install --target <t> [--settings --rules --mcp --hooks]`); every
invocation needs a command — a bare `--target ...` is rejected.

Dedicated guides:

| Runtime                        | Install guide                                            |
| ------------------------------ | -------------------------------------------------------- |
| Claude Code / Claude Desktop   | [`docs/install/claude.md`](docs/install/claude.md)       |
| Cursor                         | [`docs/install/cursor.md`](docs/install/cursor.md)       |
| Codex / Codex Desktop          | [`docs/install/codex.md`](docs/install/codex.md)         |
| opencode                       | [`docs/install/opencode.md`](docs/install/opencode.md)   |
| `~/.agents/skills` (Zed etc)   | [`docs/install/agents.md`](docs/install/agents.md)       |
| Shared installer concepts      | [`docs/install/README.md`](docs/install/README.md)       |
| Native packages (all runtimes) | [`docs/install/v6/README.md`](docs/install/v6/README.md) |

## Workflow composition

The planning skills compose into a pipeline:

```
ycc:feature-research → ycc:shared-context → ycc:parallel-plan → ycc:implement-plan → ycc:code-report → ycc:git-workflow
   (research)            (gather files)       (design tasks)      (deploy agents)      (document)         (commit/PR)
```

Use `ycc:plan-workflow` to run the full pipeline, or invoke individual stages. `ycc:shared-context` and `ycc:parallel-plan` are thin aliases over `ycc:plan-workflow --research-only` and `--plan-only` respectively; the pipeline and its artifacts are unchanged.

## Development Sync

Generated trees live under `packages/cursor/`, `packages/claude/`, `packages/omp/`, `.agents-plugin/`, `.codex-plugin/`, and `.opencode-plugin/`. The canonical source is the Claude-facing [`ycc/`](ycc/) tree. Do not hand-edit generated files.

Regenerate and validate derived artifacts with:

```bash
./scripts/sync.sh        # regenerate inventory and compatibility bundles
./scripts/validate.sh    # run every validator; CI runs this on push and PR
```

Both accept `--only <targets>` with comma-separated values.

`sync.sh` targets are `inventory`, `cursor`, `codex`, `opencode`, `omp`, `agents`, and `claude`.

- `inventory` updates `docs/inventory.json` and the `GENERATED-*` regions of `README.md`.
- `cursor` writes native packages under `packages/cursor/`.
- `codex` writes `.codex-plugin/` skills, agents, and plugin metadata.
- `opencode` writes `.opencode-plugin/` skills, agents, commands, `opencode.json`, and `AGENTS.md`.
- `omp` writes OMP (oh-my-pi) skills under `packages/omp/ycc/skills/`, plus the hidden `ycc-shared` skill for `_shared`, task agents under `packages/omp/ycc/agents/`, and one `/ycc:<skill>` command entrypoint per public skill under `packages/omp/ycc/commands/`. It is not installable yet.
- `agents` writes `.agents-plugin/` cross-tool skills for `~/.agents/skills`, plus `ycc-shared/`.
- `claude` writes the native add-on packages under `packages/claude/` (`ycc-mcp`, `ycc-hooks`, and `ycc-all`).

`validate.sh` accepts those names and also `claude-native`, `cursor-native`, `codex-native`, `json`, `config`, `packages`, `release`, `mods`, `practices`, `scope`, and `types`.

- `omp` checks generated OMP skill, agent and command drift (bytes and modes), content policy, command inventory parity, and generator golden tests.
- `claude-native`, `cursor-native`, and `codex-native` check generated native package drift, runtime policy, and fixtures.
- `json` checks `.claude-plugin/marketplace.json` and `ycc/.claude-plugin/plugin.json`.
- `packages` checks `ycc/settings/packages.json`, dependency closures, and catalog parity.
- `config` tests managed-config merge and the `install.sh` sync CLI.
- `release` runs `scripts/test-release-*.sh`.
- `mods` checks the Claude Code mods under `ycc/mods`.
- `practices` checks the authoring ratchet in `scripts/practices-baseline.json`.
- `scope` checks the changed-path mapping behind `--changed`.
- `types` runs `mypy --strict` over the modules listed in `pyproject.toml` `[tool.mypy]`, with mypy pinned in `scripts/requirements-mypy.txt` (installed by CI; locally a matching `python3 -m mypy` or `uvx`).

Examples:

```bash
./scripts/sync.sh --only inventory
./scripts/sync.sh --only claude
./scripts/sync.sh --only cursor
./scripts/validate.sh --only cursor,cursor-native,packages
./scripts/validate.sh --only claude,claude-native,packages
```

`validate.sh` runs its targets concurrently (`--serial` streams them one at a time). `--changed` limits a run to the targets affected by files changed since the branch's push destination; the `pre-push` hook uses it.

CI runs `./scripts/validate.sh` via [`.github/workflows/validate.yml`](.github/workflows/validate.yml) and fails the job on any generated drift, so local and CI paths are identical.

### OpenCode Per-Agent Model Policy

`ycc/settings/models.json` owns OpenCode model policy. Every `ycc/agents/*.md`
basename, plus built-in `general` and `explore`, must have a full `provider/model`
entry in `targets.opencode.agents`. Select by intended capability: deep architecture
or high-risk work uses `openai/gpt-6-astra`; docs, lookup, and routine work uses
`openai/gpt-5.6-terra`; all other agents use `openai/gpt-5.6-sol`. These are
placeholders (`placeholder: true`); users choose available provider models by
capability and cost. `opencode.json` owns assignments; generated agent Markdown
stays model-free. Update this mapping whenever an agent is added, renamed, or
removed, then run `./scripts/sync.sh` and `./scripts/validate.sh`.

## Repository layout

```
ystack/
├── .claude-plugin/
│   └── marketplace.json     # Claude marketplace (ycc, ycc-mcp, ycc-hooks, ycc-all)
├── .agents/
│   └── plugins/
│       └── marketplace.json # repo-local Codex marketplace source
├── .agents-plugin/          # generated cross-tool skills and ycc-shared
├── .codex-plugin/
│   ├── agents/              # generated Codex custom agents (.toml)
│   └── ycc/                 # generated Codex plugin root
│       ├── .codex-plugin/
│       │   └── plugin.json
│       ├── .mcp.json
│       ├── shared/
│       └── skills/
├── packages/                  # generated native packages; do not hand-edit
│   ├── claude/                # ycc-mcp, ycc-hooks, ycc-all
│   ├── cursor/                # ycc, ycc-rules, ycc-mcp, ycc-hooks, installer-fallback
│   └── omp/                   # ycc/{skills,agents,commands} for OMP (not installable until YAN-1171)
├── .opencode-plugin/          # opencode bundle (synced by install.sh install --target opencode)
│   ├── agents/                # generated from ycc/agents
│   ├── commands/              # generated from public ycc/skills (thin, skill-tool dispatch)
│   ├── skills/                # generated from ycc/skills
│   ├── shared/                # generated from ycc/skills/_shared
│   ├── AGENTS.md              # generated rules file (transformed from CLAUDE.md)
│   └── opencode.json          # generated config: $schema + default model + MCP
├── mcp-configs/
│   └── mcp.json               # shared MCP servers; merged/copied by install.sh
├── install.sh                 # sync Claude/Cursor/Codex/opencode targets
├── scripts/
│   ├── generate-codex-skills.sh    # wrapper → generate_codex_skills.py
│   ├── generate_codex_skills.py    # ycc/skills → .codex-plugin/ycc/skills
│   ├── validate-codex-skills.sh    # sync check + Codex skill lint/content policy
│   ├── generate-codex-agents.sh    # wrapper → generate_codex_agents.py
│   ├── generate_codex_agents.py    # ycc/agents → .codex-plugin/agents
│   ├── validate-codex-agents.sh    # sync check + TOML/content policy
│   ├── generate-codex-plugin.sh    # wrapper → generate_codex_plugin.py
│   ├── generate_codex_plugin.py    # plugin manifest + repo-local marketplace metadata
│   ├── validate-codex-plugin.sh    # JSON + sync check
│   ├── generate-cursor-agents.sh   # wrapper → generate_cursor_agents.py
│   ├── generate_cursor_agents.py   # ycc/agents to packages/cursor/ycc/agents
│   ├── validate-cursor-agents.sh   # sync check + content policy
│   ├── generate-cursor-skills.sh   # wrapper → generate_cursor_skills.py
│   ├── generate_cursor_skills.py   # ycc/skills to packages/cursor/ycc/skills
│   ├── validate-cursor-skills.sh   # sync check + content policy
│   ├── generate-cursor-rules.sh    # wrapper → generate_cursor_rules.py
│   ├── generate_cursor_rules.py    # ycc/rules to packages/cursor/ycc-rules/rules (.mdc)
│   ├── generate-cursor-packages.sh # wrapper for generate_cursor_packages.py (sync --only cursor)
│   ├── generate_cursor_packages.py # writes packages/cursor/
│   ├── generate-claude-packages.sh # wrapper for generate_claude_packages.py (sync --only claude)
│   ├── generate_claude_packages.py # writes packages/claude/
│   ├── validate-cursor-rules.sh    # sync + frontmatter lint + content policy
│   ├── generate-opencode-skills.sh    # wrapper → generate_opencode_skills.py
│   ├── generate_opencode_skills.py    # ycc/skills → .opencode-plugin/skills
│   ├── validate-opencode-skills.sh    # sync check + frontmatter lint + content policy
│   ├── generate-opencode-agents.sh    # wrapper → generate_opencode_agents.py
│   ├── generate_opencode_agents.py    # ycc/agents → .opencode-plugin/agents
│   ├── validate-opencode-agents.sh    # sync check + frontmatter lint + content policy
│   ├── generate-opencode-commands.sh  # wrapper → generate_opencode_commands.py
│   ├── generate_opencode_commands.py  # public ycc/skills → .opencode-plugin/commands
│   ├── validate-opencode-commands.sh  # sync check + frontmatter lint + content policy
│   ├── generate-opencode-plugin.sh    # wrapper → generate_opencode_plugin.py
│   ├── generate_opencode_plugin.py    # opencode.json + AGENTS.md + MCP translation
│   ├── validate-opencode-plugin.sh    # JSON schema + sync check
│   ├── generate_opencode_common.py    # shared paths / transforms / model + tool maps
│   ├── opencode_model_aliases.json    # Claude-shorthand → openai/gpt-5.4-family map
│   ├── generate-omp-skills.sh         # wrapper → generate_omp_skills.py
│   ├── generate_omp_skills.py         # ycc/skills → packages/omp/ycc/skills (+ ycc-shared stub)
│   ├── validate-omp-skills.sh         # sync check (bytes + modes) + content policy
│   ├── generate-omp-agents.sh         # wrapper → generate_omp_agents.py
│   ├── generate_omp_agents.py         # ycc/agents → packages/omp/ycc/agents (OMP task agents)
│   ├── validate-omp-agents.sh         # sync check + agent frontmatter/content policy
│   ├── generate-omp-commands.sh       # wrapper → generate_omp_commands.py
│   ├── generate_omp_commands.py       # public ycc/skills → packages/omp/ycc/commands (/ycc:<skill>)
│   └── validate-omp-commands.sh       # sync check + inventory parity + content policy
├── ycc/                       # the consolidated Claude Code plugin
│   ├── .claude-plugin/
│   │   └── plugin.json        # name: "ycc", current version in plugin.json
│   ├── agents/                # agents (source for Cursor/Codex/opencode generation)
│   ├── rules/                 # language-specific rules (common + per-language); source for Cursor .mdc generation
│   ├── settings/              # shared Claude settings: settings.json, models.json, hooks/, rules/, statusline
│   └── skills/                # skills + _shared; public skills are Claude slash commands (source for Cursor/Codex/opencode generation)
│       ├── _shared/           # shared scripts (e.g., resolve-plans-dir.sh)
│       └── {skill-name}/
│           ├── SKILL.md
│           ├── references/    # templates and examples
│           └── scripts/       # validation and helpers
└── docs/
    ├── install/               # runtime-specific install guides
    └── plans/                 # implementation plans
```

## License

[MIT](LICENSE)
