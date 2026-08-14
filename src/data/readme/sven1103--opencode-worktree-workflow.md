# OpenCode Worktree Workflow

`@sven1103/opencode-worktree-workflow` is an npm package that provides OpenCode git worktree helpers for creating synced feature worktrees and cleaning up merged ones.

## Quick start

To get the workflow running in a project:

1. Install the package once by following [Recommended setup](#recommended-setup).
2. Enable the plugin in your OpenCode config as shown in [Recommended setup](#recommended-setup).
3. If you want manual `/wt-new` and `/wt-clean` triggers, install the markdown files from [Install slash commands](#install-slash-commands).
4. If you want policy guidance for when to isolate work, install the skill from [Co-shipped skill](#co-shipped-skill).
5. If you need to understand how the local fallback works, see [CLI fallback](#cli-fallback).

## Verify installation

After setup, verify the surface you installed:

- Plugin: confirm OpenCode exposes `worktree_prepare` and `worktree_cleanup`.
- CLI: run `npx opencode-worktree-workflow --help`.
- Slash commands: confirm `/wt-new <title>` and `/wt-clean` are available.

Quick smoke check:

```sh
npx opencode-worktree-workflow wt-new "docs smoke check" --json
```

That should return a structured result with a `worktree_path`. For release verification before installing, see `docs/releases.md`.

## Recommended setup

Install the package once:

```sh
npm install -D @sven1103/opencode-worktree-workflow
```

Enable the native OpenCode plugin in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@sven1103/opencode-worktree-workflow"]
}
```

This single package provides two access modes:

- native plugin tools inside OpenCode: `worktree_prepare`, `worktree_cleanup`
- local CLI fallback from the same installed package:
  - `npx opencode-worktree-workflow wt-new "<title>" --json`
  - `npx opencode-worktree-workflow wt-clean <args> --json`

In practice:

- if the plugin is loaded, use the native tools first
- if the native tools are unavailable, use the local CLI fallback from the same installed package
- if the package is not installed, no CLI fallback is available

Important distinction:

- `worktree_prepare` and `worktree_cleanup` are native OpenCode tools, not shell commands
- from a terminal, use `npx opencode-worktree-workflow ...` or `./node_modules/.bin/opencode-worktree-workflow ...`

## Install in an OpenCode project

Add the package as a project dependency, following the official docs style:

```json
{
  "dependencies": {
    "@sven1103/opencode-worktree-workflow": "^0.2.0"
  }
}
```

Then reference the installed package from your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@sven1103/opencode-worktree-workflow"]
}
```

Keeping the npm dependency in `package.json` makes the installation more durable even if shared `opencode.json` bundles overwrite plugin entries.

If you do not already install dependencies in your project, you can add the package directly with npm:

```sh
npm install -D @sven1103/opencode-worktree-workflow
```

## Install slash commands

OpenCode loads custom commands from either `.opencode/commands/` (project) or `~/.config/opencode/commands/` (global).

This repo publishes `wt-new.md` and `wt-clean.md` as GitHub Release assets so you can install them without browsing the repository.
For a plain-language explanation of what each release contains, how it is produced, and how to verify it before installing, see `docs/releases.md`.

Project install (latest release):

```sh
mkdir -p .opencode/commands
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-new.md"  -o ".opencode/commands/wt-new.md"
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-clean.md" -o ".opencode/commands/wt-clean.md"
```

```sh
mkdir -p .opencode/commands
wget -qO ".opencode/commands/wt-new.md"  "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-new.md"
wget -qO ".opencode/commands/wt-clean.md" "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-clean.md"
```

Global install (latest release):

```sh
mkdir -p ~/.config/opencode/commands
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-new.md"  -o "$HOME/.config/opencode/commands/wt-new.md"
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-clean.md" -o "$HOME/.config/opencode/commands/wt-clean.md"
```

```sh
mkdir -p ~/.config/opencode/commands
wget -qO "$HOME/.config/opencode/commands/wt-new.md"  "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-new.md"
wget -qO "$HOME/.config/opencode/commands/wt-clean.md" "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/wt-clean.md"
```

Pinned to a specific release tag:

```sh
VERSION=v0.1.0
mkdir -p .opencode/commands
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/download/${VERSION}/wt-new.md"  -o ".opencode/commands/wt-new.md"
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/download/${VERSION}/wt-clean.md" -o ".opencode/commands/wt-clean.md"
```

## Co-shipped skill

This repo also co-ships a `worktree-workflow` skill as a policy layer over the package capability.

- checked-in skill: `skills/worktree-workflow/SKILL.md`
- release asset: `SKILL.md`

The skill teaches when to use task-scoped worktrees, when repo root is still acceptable, and how to prefer the native tool path before falling back to the packaged CLI.

Project-local install (latest release):

```sh
mkdir -p .opencode/skills/worktree-workflow
curl -fsSL "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/SKILL.md" -o ".opencode/skills/worktree-workflow/SKILL.md"
```

```sh
mkdir -p .opencode/skills/worktree-workflow
wget -qO ".opencode/skills/worktree-workflow/SKILL.md" "https://github.com/sven1103-agent/opencode-worktree-plugin/releases/latest/download/SKILL.md"
```

If your setup uses installed skill files, copy the released `SKILL.md` into a `worktree-workflow/` skill folder in the appropriate location for that environment, or consume the checked-in file from this repo directly.

## What the plugin provides

- `worktree_prepare`: create a worktree and matching branch from the latest configured base-branch commit, or the default branch when no base branch is configured
- `worktree_cleanup`: preview connected worktrees against the configured base branch and, when explicitly applied, remove safe or selected review items

This package now ships the plugin capability, a CLI fallback surface, thin slash commands, and a co-shipped policy skill.

These native tools are exposed inside OpenCode after the plugin is loaded. They are not terminal commands.

## Lifecycle hooks (determinism)

If you use this plugin in autonomous agent tasks, the key feature is that it uses OpenCode lifecycle hooks to make workspace selection deterministic.

Hooks implemented by the plugin:

- `tool.execute.before`
  - Enforces isolation for repo-mutating tools by ensuring a session-scoped active worktree exists (requires `sessionID`).
  - Rewrites tool inputs so they operate inside the active worktree by default:
    - `bash`: injects `workdir`/`cwd` when missing
    - `glob`/`grep`: injects `path` when missing
    - known path arguments are rewritten from repo-root paths into the bound `worktree_path`
  - Blocks unsafe calls that cannot be rewritten safely (for example repo-root absolute paths in opaque arguments).
  - For delegated `task` calls: requires the prompt to reference a safe handoff artifact path under `.opencode/sessions/<session>/handoffs/*.json`, then enriches that handoff with the active workspace context (`task_id`, `worktree_path`, `workspace_role`).

- `tool.execute.after`
  - Records tool usage for the session (used to keep runtime state and cleanup advice consistent across steps).
  - After a delegated `task`, correlates the handoff with result artifacts to infer lifecycle transitions (complete/block) and persists them.
  - When completion is detected, emits an advisory cleanup preview (non-fatal if it cannot be generated).

- `experimental.chat.system.transform`
  - Injects an "Active workspace context" block into the system prompt when an active worktree is bound, so agents and tools see the same worktree context every step.

- `command.execute.before`
  - Implements `/wt-new` and `/wt-clean` as thin prompt shims (it rewrites the command output parts so the agent calls `worktree_prepare` / `worktree_cleanup`).

Net effect: once a `sessionID` is in play, the plugin keeps a stable session-to-worktree binding and consistently routes repository actions into that worktree. This removes prompt-only ambiguity ("did the agent remember to cd?") and is what makes the workflow reproducible.

## Typical usage

Most users only need one of these flows:

1. Plugin only: use `worktree_prepare` and `worktree_cleanup` directly in OpenCode.
2. Plugin plus slash commands: use `/wt-new <title>` to start isolated work and `/wt-clean` to preview cleanup.
3. CLI fallback: use `npx opencode-worktree-workflow wt-new "<title>"` when native tools are unavailable.

Typical manual flow:

1. Create a worktree with `worktree_prepare`, `/wt-new <title>`, or `npx opencode-worktree-workflow wt-new "<title>"`.
2. Do the task inside the returned `worktree_path`.
3. Preview cleanup with `worktree_cleanup`, `/wt-clean`, or `npx opencode-worktree-workflow wt-clean preview`.
4. Apply cleanup only when deletion is intentional.

## Structured contract

The package now exposes a versioned structured contract with a `schema_version` field. Native tools return human-readable text and publish the structured result in tool metadata, while CLI `--json` prints the same structured object directly.

- current `schema_version`: `1.0.0`
- contract overview: `docs/contract.md`
- compatibility model: `docs/compatibility.md`
- checked-in schemas for transparency:
  - `schemas/worktree-prepare.result.schema.json`
  - `schemas/worktree-cleanup-preview.result.schema.json`
  - `schemas/worktree-cleanup-apply.result.schema.json`

Human-readable output remains available through the result `message`, but callers should depend on the structured fields rather than parsing prose.

## CLI fallback

The npm package also exposes a local CLI so agents can fall back to the same installed package when the native plugin tools are unavailable.

Use the CLI from a terminal when you want to run the workflow manually. Run it inside a real git repository. By default, the workflow expects a normal remote and base-branch setup such as `origin` plus the repository default branch, unless you override that in `.opencode/worktree-workflow.json`.

Examples:

```sh
npx opencode-worktree-workflow --help
npx opencode-worktree-workflow wt-clean --help
npx opencode-worktree-workflow wt-new "Improve checkout retry logic"
npx opencode-worktree-workflow wt-new "Improve checkout retry logic" --json
npx opencode-worktree-workflow wt-clean preview
npx opencode-worktree-workflow wt-clean apply feature/foo --json
```

Direct local bin examples:

```sh
./node_modules/.bin/opencode-worktree-workflow --help
./node_modules/.bin/opencode-worktree-workflow wt-clean preview
```

Defaults:

- human-readable output by default
- structured output with `--json`
- the CLI shares the same underlying implementation and result contract as the native tools
- the CLI fallback depends on the package already being installed in the project
- if you run it outside a git repo or without the expected remote context, the CLI returns an actionable error

## Compatibility model

The repo keeps config loading, argument normalization, and execution semantics centralized in the package implementation so existing installations continue to work across native tools, CLI fallback, and slash commands.

- compatibility overview: `docs/compatibility.md`
- existing `.opencode/worktree-workflow.json` setups remain the supported configuration path

## Optional project configuration

OpenCode's native `opencode.json` and `opencode.jsonc` files are schema-validated, so they can load this plugin through the standard `plugin` key but they cannot store a custom `worktreeWorkflow` block.

To override this plugin's defaults, put a sidecar config file at `.opencode/worktree-workflow.json`:

```json
{
  "branchPrefix": "wt/",
  "remote": "origin",
  "baseBranch": "release/v0.4.0",
  "worktreeRoot": ".worktrees/$REPO",
  "cleanupMode": "preview",
  "protectedBranches": ["release"]
}
```

Use `opencode.json` only to load the npm plugin itself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@sven1103/opencode-worktree-workflow"]
}
```

Supported settings:

- `branchPrefix`: prefix for generated worktree branches
- `remote`: remote used to detect the default branch and fetch updates
- `baseBranch`: optional branch name used as the creation and cleanup base; defaults to the remote's default branch
- `worktreeRoot`: destination root for new worktrees; supports `$REPO`, `$ROOT`, and `$ROOT_PARENT`
- `cleanupMode`: default cleanup behavior, either `preview` or `apply`
- `protectedBranches`: branches that should never be auto-cleaned

## Uninstall

Remove only the surfaces you installed:

- npm package: `npm remove @sven1103/opencode-worktree-workflow`
- OpenCode plugin entry: remove `@sven1103/opencode-worktree-workflow` from `opencode.json`
- Slash commands: delete `wt-new.md` and `wt-clean.md` from `.opencode/commands/` or `~/.config/opencode/commands/`
- Skill: delete `SKILL.md` from your `worktree-workflow/` skill folder

Optional cleanup:

- remove `.opencode/worktree-workflow.json` if you created it only for this plugin
- remove persisted runtime state from `OPENCODE_WORKTREE_STATE_DIR` or the platform default state directory if you no longer want stored task bindings

## Publish workflow

This repo is prepared for npm publishing from GitHub Actions using npm trusted publishing.

If you consume releases instead of contributing to the repo, `docs/releases.md` is the end-user guide for understanding what the published npm package and GitHub Release assets include.

Typical release flow:

1. Publish the package once manually to create it on npm.
2. Configure the package's trusted publisher on npm for `.github/workflows/publish.yml`.
3. Run the `Prepare Release` workflow from `main` with a version like `0.2.0`.

The release workflow creates a `release/v<version>` branch from `main`, updates `package.json` and `package-lock.json`, commits the version bump there, creates a matching `v<version>` tag, and pushes the branch and tag.

The release workflow then explicitly starts the publish workflow for that tag, which verifies the tag matches `package.json`, runs `npm publish` using OIDC without storing an `NPM_TOKEN` secret, and creates or updates the GitHub Release with generated release notes plus the command assets. Merge the release branch back to `main` afterward if you want the version bump recorded on the default branch.

## Local development

The repo still contains a project-local `.opencode/` setup for development and testing:

- `.opencode/plugins/worktree.js` re-exports the plugin from `src/index.js`
- `.opencode/commands/` contains local slash command wrappers for manual testing
- `.opencode/worktree-workflow.md` documents the local workflow

The publishable npm artifact is limited to `src/` via the root `package.json` `files` field. Install dependencies at the repo root with `npm install` for local development.
