# Opencode Manager

OpenCode TUI plugin for selecting the MCP servers, plugins, rules, standalone
agents, agent teams, and skills that belong to each project. It combines
repository-owned registries, pinned vendor skill sources, and reusable stack
profiles.

Manager resources never write to OpenCode's global config. Resource files are
materialized under the active worktree's `.opencode/` directory; project config
references may be patched in an existing root config as described below.

## What it manages

- **MCP registry:** complete local and remote MCP definitions in
  `registry/catalog.jsonc`.
- **Plugin registry:** reviewed OpenCode plugin packages added only to the
  active project's `plugin` config array.
- **Custom skills:** skills maintained in this repository under
  `registry/skills/<name>/SKILL.md`.
- **Vendor skills:** reproducible, commit-pinned skill repositories from
  Cloudflare, Microsoft, Hugging Face, Vercel Labs, K-Dense, Qt, and other
  reviewed publishers.
- **Rules:** project instruction files installed under `.opencode/instructions/`
  and registered in the project config's `instructions` list.
- **Agents:** standalone `.md` agents and folder-based teams installed under
  `.opencode/agents/`.
- **Profiles:** curated groups of MCPs, rules, agents, and skills for a project
  stack or scope, such as Cloudflare, architecture, security, or Rust.
- **Individual resources:** every MCP, plugin, rule, agent/team, and top-level
  skill bundle can also be enabled or disabled separately.

## Project scope

The plugin patches the first existing project config in this order:
`.opencode/opencode.jsonc`, `.opencode/opencode.json`, `opencode.jsonc`, then
`opencode.json`. If none exists, it creates `.opencode/opencode.jsonc`. Other
managed files stay under `.opencode/`:

```text
.opencode/
├── opencode.jsonc
├── instructions/
│   └── <selected-rule>.md
├── agents/
│   ├── <standalone-agent>.md
│   └── <selected-team>/
│       └── <member>.md
├── skills/
│   └── <selected-skill>/
└── .opencode-manager/
    ├── .gitignore
    ├── state.json
    ├── backups/               # preserved overrides and disabled resources
    └── cache/                 # ignored vendor Git cache
```

Commit the selected project config (which may be at the worktree root), selected
`.opencode/instructions/`, `.opencode/agents/`, `.opencode/skills/`, and
`.opencode/.opencode-manager/state.json` when the selected stack should be
shared by the project. The vendor cache and lock files are ignored.
Local backups are ignored as well because they may contain project-specific
configuration or skill content.

## Install

OpenCode 1.18.4 or newer is required because this package uses the current TUI
plugin API.

Install the plugin globally when you want the manager available in every
project while keeping all managed resources project-local:

```bash
opencode plugin --global @nguyenthdat/opencode-manager
```

Alternatively, add it to a project's `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@nguyenthdat/opencode-manager"]
}
```

For local development:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-manager/dist/tui.js"]
}
```

Quit and restart OpenCode after changing `tui.json` or installing the plugin.

## Use

Open `/manager` or choose **Project Stack Manager** from the command palette.

The first screen contains:

- Stack profiles, with the number of selected resources.
- The complete MCP registry.
- The project-local OpenCode plugin registry.
- The project rule registry.
- Standalone agents and folder-based agent teams.
- Custom and vendor skill registries.

Inside a profile or registry:

- `Enter` or `Space` toggles the selected resource.
- `Ctrl+E` enables it.
- `Ctrl+D` disables it.
- Skill sources with multiple skills include an **All skills** action for
  installing or removing the complete source in one operation.

Use `/manager-sync` or the **Sync Registry** action to fetch the latest catalog
and registry assets without reinstalling the plugin. The TUI also checks in the
background on startup, throttled to once every six hours. Updates are cloned
into `$XDG_CACHE_HOME/opencode-manager/registry-sync/` (or `~/.cache/...`),
validated against the Git checkout, and swapped atomically. A failed refresh
keeps the last valid snapshot; without one, the TUI falls back to the catalog
bundled with the installed package.

Setting a custom `catalog` plugin option disables automatic remote sync so the
manager never replaces an explicitly configured registry. Set `registrySync`
to `false` to opt out while using the bundled catalog.

Applying a change reloads the active OpenCode project instance once so MCP,
rule, agent, and skill state is refreshed. If reload fails after files were
written, restart OpenCode manually.

## MCP registry

Add MCPs to `registry/catalog.jsonc` under `mcps`. A registry entry contains UI
metadata and a valid OpenCode MCP config:

```jsonc
{
  "mcps": {
    "postgres": {
      "title": "PostgreSQL",
      "description": "Inspect and query the project database.",
      "tags": ["database", "postgres"],
      "config": {
        "type": "local",
        "command": ["bunx", "-y", "@example/postgres-mcp"],
        "environment": {
          "DATABASE_URL": "{env:DATABASE_URL}",
        },
        "enabled": false,
      },
    },
  },
}
```

Use `{env:VARIABLE}` or `{file:path}` references for credentials. Never commit a
resolved token or secret to the registry.

When an MCP is enabled:

1. If no effective same-name MCP exists, its full registry definition is added
   to the existing project config, or to `.opencode/opencode.jsonc` for a new
   config.
2. If an inherited definition exactly matches, only a project-level
   `{ "enabled": true }` override is written.
3. If a same-name definition differs, the operation is refused instead of
   enabling an unrelated command or URL. The TUI asks whether to override it;
   an approved project MCP override is backed up first.
4. Manager-installed definitions receive a fingerprint so registry updates can
   be applied only while the project copy remains unmodified.

## Plugin registry

Plugin entries add reviewed packages to the active project's OpenCode config:

```jsonc
{
  "plugins": {
    "svelte": {
      "title": "Svelte",
      "description": "Official Svelte integration for OpenCode.",
      "tags": ["svelte", "frontend"],
      "package": "@sveltejs/opencode",
    },
  },
}
```

Enabling this entry adds only `"@sveltejs/opencode"` to the existing `plugin`
array. Disabling it removes only that exact package entry. Other plugins,
configuration fields, and JSONC comments are preserved. A same-package tuple
with custom options or a versioned package is treated as a conflict; approved
replacement or removal backs up the previous entry under
`.opencode/.opencode-manager/backups/plugins/`.

Inherited plugins are displayed but cannot be disabled project-locally because
OpenCode has no project-level negative plugin entry. Remove those from their
parent or global config instead.

The bundled Svelte entry follows the official
[`@sveltejs/opencode` installation](https://svelte.dev/docs/ai/opencode-plugin).
It supplies the Svelte MCP, Svelte skills, and the `svelte-file-editor`
subagent.

## Custom skill registry

Create a normal OpenCode skill in this repository:

```text
registry/skills/my-skill/SKILL.md
```

The manifest must have a valid name and non-empty description:

```markdown
---
name: my-skill
description: Use when the project needs this specific workflow.
---

# My Skill
```

The TUI discovers it automatically under **OpenCode Manager Registry**. The
entire skill directory, including scripts, references, assets, and nested
skills, is copied as one bundle.

The bundled registry currently includes 29 custom skills:

- **Engineering workflows:** [`application-debugging`](registry/skills/application-debugging),
  [`native-binary-debugging`](registry/skills/native-binary-debugging),
  [`security-review`](registry/skills/security-review),
  [`defender-xdr-hunting-analyst`](registry/skills/defender-xdr-hunting-analyst),
  [`software-architect`](registry/skills/software-architect),
  [`codebase-design`](registry/skills/codebase-design),
  [`design-patterns`](registry/skills/design-patterns), and
  [`uniffi`](registry/skills/uniffi).
- **Protocol and schema guidance:**
  [`protobuf-best-practices`](registry/skills/protobuf-best-practices) for
  Protobuf schema authoring, compatibility, evolution, and review.
- **Language guidance:** Assembly, Bash, C, C++, C#, Go, Groovy, Java,
  JavaScript, Kotlin, Lua, Objective-C, PHP, PowerShell, Python, Ruby, Rust,
  Swift, TypeScript, and Zig.

See [`registry/skills/README.md`](registry/skills/README.md) for the complete
catalog and each skill's scope.

If the destination skill already exists or a managed copy was edited, the TUI
asks before overriding it. Approved overrides preserve the previous directory
under `.opencode/.opencode-manager/backups/skills/override/`. Disabling a
manager-owned skill moves it to `backups/skills/disabled/` instead of deleting
it permanently.

## Rule registry

OpenCode's canonical root rule file is `AGENTS.md`. For independently selectable
rules, the manager uses OpenCode's additive `instructions` configuration:

```jsonc
{
  "rules": {
    "codebase-memory": {
      "title": "Codebase Memory First",
      "description": "Prefer the project code graph for code discovery.",
      "tags": ["code-intelligence"],
      "path": "rules/codebase-memory.md",
    },
  },
}
```

Enabling the rule copies it to `.opencode/instructions/codebase-memory.md` and
adds the exact relative path to the existing project config's `instructions`
list. Disabling it removes only that exact entry. Unrelated instructions,
config keys, and JSONC comments are preserved.

Existing project rule files and manager-owned rules modified after installation
require confirmation. Replaced and disabled copies are archived under
`.opencode/.opencode-manager/backups/rules/`.

The bundled rules currently cover code-graph-first discovery and parallel agent
orchestration.

## Agent registry

An agent entry has one of two types:

```jsonc
{
  "agents": {
    "search": {
      "type": "single",
      "title": "Search Researcher",
      "description": "Returns source-backed research.",
      "tags": ["research"],
      "path": "agents/search.md",
    },
    "review-team": {
      "type": "team",
      "title": "Review Team",
      "description": "Lead, security, and quality reviewers.",
      "tags": ["code-review"],
      "path": "agents/review-team",
    },
  },
}
```

- `single` installs one file at `.opencode/agents/<id>.md`.
- `team` installs the complete folder at `.opencode/agents/<id>/`. OpenCode
  discovers each member recursively with a name such as
  `<id>/<member-path>`.
- A team must contain at least two valid `.md` agent definitions. Non-agent
  files, symlinks, invalid frontmatter, and unsafe paths are rejected.
- OpenCode subagents do not communicate peer-to-peer. A team that needs
  orchestration should include a `primary` lead that dispatches members and
  relays their results without requiring nested subagent depth.

Same-name inherited standalone agents or teams are reported as conflicts before
a project-local resource shadows them. Project-owned collisions and modified
manager copies require confirmation and are archived under
`.opencode/.opencode-manager/backups/agents/`.

The bundled registry currently includes two standalone agents (`search` and
`software-architect`), a six-member `researcher` team, and a three-member
`review-team`.

## Vendor skill registry

Vendor sources live under `skillSources`:

```jsonc
{
  "skillSources": {
    "vendor": {
      "type": "git",
      "title": "Vendor Skills",
      "repository": "https://github.com/vendor/skills.git",
      "revision": "0123456789abcdef0123456789abcdef01234567",
      "skillsPath": "skills",
      "license": "Apache-2.0",
      "ignoreSymlinks": false,
    },
  },
}
```

`revision` must be a complete commit SHA. Updating a vendor means reviewing its
changes and changing that SHA in the registry. The plugin does not silently
follow a mutable branch.

`ignoreSymlinks` defaults to `false`. It is enabled only for sources such as
Microsoft that publish compatibility symlink mirrors. Discovery skips those
mirrors without following them; installation still rejects any symlink inside
a selected bundle.

For repositories with nested skills, the top-level directory containing a
`SKILL.md` is treated as the selectable bundle. Descendant skills are included
and displayed as part of that bundle.

The requested source expansion adds these pinned collections:

| Source ID              | Repository                                | Canonical path    | Bundles |
| ---------------------- | ----------------------------------------- | ----------------- | ------: |
| `k-dense-scientific`   | `K-Dense-AI/scientific-agent-skills`      | `skills`          |     149 |
| `pm-skills`            | `phuryn/pm-skills`                        | repository root   |      68 |
| `marketing-skills`     | `coreyhaines31/marketingskills`           | `skills`          |      48 |
| `addy-agent-skills`    | `addyosmani/agent-skills`                 | `skills`          |      24 |
| `microsoft-core`       | `microsoft/skills`                        | `.github/skills`  |      13 |
| `microsoft`            | `microsoft/skills`                        | `.github/plugins` |     169 |
| `qt`                   | `TheQtCompanyRnD/agent-skills`            | `skills`          |      12 |
| `huggingface`          | `huggingface/skills`                      | `skills`          |      25 |
| `finance`              | `himself65/finance-skills`                | `plugins`         |      26 |
| `marketcalls-vectorbt` | `marketcalls/vectorbt-backtesting-skills` | `.claude/skills`  |       6 |
| `agiprolabs-trading`   | `agiprolabs/claude-trading-skills`        | `skills`          |      67 |
| `okx`                  | `okx/agent-skills`                        | `skills`          |      11 |
| `adspower-browser`     | `adspower/adspower-browser`               | `skills`          |       1 |

`phuryn/pm-skill` does not exist; the registry uses the upstream repository's
actual plural name, `phuryn/pm-skills`. The duplicated K-Dense request is
registered once. Microsoft is intentionally split into core and plugin sources
to avoid its compatibility mirrors while retaining all 182 bundles.

K-Dense uses mixed per-skill licenses, so no misleading source-wide license is
declared. AGIPro currently includes three upstream stub skills and one broken
cross-skill reference. Seven OKX bundles reference sibling
`skills/_shared/preflight.md`; the current per-bundle skill installation does
not copy that sibling helper, so those specific OKX bundles should be treated as having
an upstream packaging caveat. Same-name skills across different sources remain
protected by the normal conflict and override workflow.

### Automated revision updates

[`update-skill-sources.yml`](.github/workflows/update-skill-sources.yml) runs
every Monday at 04:23 UTC and can also be started with `workflow_dispatch`. It:

1. Resolves the remote `HEAD` commit once per unique Git repository.
2. Patches only `skillSources.<id>.revision`, preserving JSONC comments.
3. Clones every resulting pin and validates all discoverable skill manifests.
4. Runs typecheck, tests, and build.
5. Creates or updates `chore/update-skill-source-revisions` and its pull request.

The workflow never force-pushes or writes directly to the default branch. It
uses the repository `GITHUB_TOKEN`, so the repository setting that permits
GitHub Actions to create pull requests must be enabled.

Run the same operations locally with:

```bash
bun run registry:update --dry-run
bun run registry:update
bun run registry:validate --concurrency 3
```

`registry:update:check` exits non-zero when any pin is stale, which is useful
for external CI policies that want detection without mutation.

## Profiles

Profiles combine MCP IDs, exact skill source paths, rule IDs, and standalone
agent or team IDs:

```jsonc
{
  "profiles": [
    {
      "id": "data-platform",
      "title": "Data Platform",
      "description": "Database MCPs and project-specific data skills.",
      "tags": ["data"],
      "mcps": ["postgres"],
      "skills": [
        { "source": "custom", "path": "schema-review" },
        { "source": "clickhouse", "path": "clickhouse-best-practices" },
      ],
      "rules": ["codebase-memory"],
      "agents": ["review-team"],
    },
  ],
}
```

Profile actions manage only resources declared by the registry. They never
disable or remove unrelated MCPs, rules, agents, or project skills.

A profile whose ID matches a Git skill source ID represents that complete
source. `registry:validate` verifies that it references every current upstream
skill path and no removed path, so revision updates cannot silently leave these
vendor profiles incomplete.

## Safety model

- Project config is edited with targeted JSONC changes, preserving comments and
  unrelated settings. The manager never deletes or replaces the complete
  project config file.
- Duplicate JSON keys and malformed catalog/config files fail closed.
- MCP collisions are refused before a server can be enabled.
- Plugin updates target only matching package entries and preserve unrelated
  project plugins.
- Vendor sources use HTTPS and immutable commits; Git credential prompts,
  submodules, and checkout hooks are disabled.
- Skill symlinks, special files, traversal, oversized files, and oversized
  bundles are rejected.
- Existing or modified skills require an explicit override confirmation and
  are backed up before replacement.
- Disabled skills are archived, not permanently deleted.
- Managed skills are updated without confirmation only when their tree digest
  still matches the last installed version.
- Rule and agent files use the same fingerprint, explicit override, and archive
  guarantees. Agent teams are fingerprinted and replaced as a complete tree.
- Rules patch only the exact managed `instructions` entry; agent operations do
  not modify the project config.

## Development

```bash
bun install
bun run format
bun run format:check
bun run build
bun run typecheck
bun test
```

`bun install` runs the `prepare` script and installs the tracked
`.husky/pre-commit` hook through Husky. Before every commit, `lint-staged`
formats only staged TypeScript, JavaScript, project JSON/JSONC, workflow YAML,
and maintained documentation, then re-stages the formatted content while
preserving unrelated unstaged hunks. Generated `dist/` files and vendored
`registry/skills/` content are intentionally excluded. CI and release
workflows run `format:check` as the non-bypassable enforcement layer.

Release and npm Trusted Publishing instructions are in
[`docs/RELEASING.md`](https://github.com/nguyenthdat/opencode-manager/blob/main/docs/RELEASING.md).
