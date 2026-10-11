# OpenCode plugins

Five independent Bun packages for OpenCode V2. Each plugin owns its dependencies, lockfile, and TypeScript configuration; this repository is not a Bun workspace.

## Plugins

| Plugin | What it does | Interface and requirements |
| --- | --- | --- |
| [Classify](./classify/README.md) | Typed judgments with OpenAI Decisions, TypeSafe AI, Cloudflare Clef, Laya, or Ollama; file/code/diff evidence | Namespaced decision tool and backend-selection command; TUI picker/status. Requires explicit backend configuration. |
| [Cache metrics](./cache-metrics/README.md) | Session input cache-hit rate, token totals, per-response history, and JSON export | TUI sidebar and history panel. History includes the root session and its subagents by default. |
| [Quota usage](./quota-usage/README.md) | Remaining Codex and OpenCode Go account quotas | Web/TUI chat tool and automatically refreshed TUI sidebar. Uses active provider accounts on the server. |
| [Workflow tools](./workflow-tools/README.md) | Spec planning/refinement/implementation, PR publication/metadata, feedback delivery and check investigation | Server commands; see [package.json](./workflow-tools/package.json) for OpenCode requirements. External skills and server-side authenticated `gh` as needed; no TUI entry. |
| [Marketplace](./marketplace/README.md) | Browse a sample catalog of skills, commands, and agents | TUI prototype. Install/update/uninstall actions change durable UI state, not OpenCode resources. |

Each plugin README covers setup and common use. Contributor details belong in its `docs/DEVELOPMENT.md`.

## Install

Add the plugins you want to the `plugins` array in `opencode.jsonc`. Use a project configuration or the global `~/.config/opencode/opencode.jsonc` (`$XDG_CONFIG_HOME/opencode/opencode.jsonc` when set). `opencode.json` is also supported. Merge entries into existing settings.

Use the install target in each plugin's README. The example below uses Git for most packages; Classify and Workflow tools also document npm targets.

This example lists all five packages. Keep only those you want. Classify uses TypeSafe here and needs `TYPESAFE_API_KEY` in the OpenCode server environment. To choose another backend, read [Classify configuration](./classify/docs/CONFIGURATION.md).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "github:mholtzscher/opencode-plugins#main::path:cache-metrics",
    "github:mholtzscher/opencode-plugins#main::path:quota-usage",
    "github:mholtzscher/opencode-plugins#main::path:workflow-tools",
    "github:mholtzscher/opencode-plugins#main::path:marketplace",
    {
      "package": "@mholtzscher/opencode-classify",
      "options": {
        "backends": { "default": { "provider": "typesafe" } },
        "defaultBackend": "default",
      },
    },
  ],
}
```

OpenCode installs the packages and loads their exported TUI entries alongside the server entries. `workflow-tools` is server-only. Git installs need no checkout or manual `bun install`; cache metrics includes its prebuilt TUI bundle.

Load one copy of each plugin. When switching sources, replace the existing entry and retain its options. See the [OpenCode V2 plugin guide](https://opencode.ai/v2/docs/plugins) for CLI installation, updates, and reload behavior. Plugin READMEs cover runtime dependencies and usage.

## Development

### Environment setup

Install [mise](https://mise.jdx.dev/getting-started.html), then from the repository root:

```sh
mise trust
mise install
mise run install
mise run check
```

[`mise.toml`](./mise.toml) pins Bun and Node for local development and CI. CI uses `mise-action` to install only the runtimes needed by each job; publishing uses Node's bundled npm. The configuration also retains the lint tools, uv, Pitchfork, and optional Laya daemon configuration. `mise install` installs tools; `mise run install` installs locked dependencies separately in the root and each plugin, without creating a workspace. Neither command starts Laya.

Use `mise run lint`, `mise run fix`, `mise run typecheck`, or `mise run test` for individual checks. After Cache metrics TUI changes, run `mise run build:tui` before `mise run check` and commit `cache-metrics/dist/tui.js`; checks do not rebuild it automatically. Tasks run from the repository root even when invoked inside a plugin.

For direct `bun` commands, [activate mise in your shell](https://mise.jdx.dev/getting-started.html#activate-mise) or prefix them with `mise exec --`.

### Local plugins

Run `bun install` inside each plugin you work on. Add its directory to `plugins`. Relative paths resolve from the containing config file. You can also use an absolute path from another project. The root install supplies lint tooling only.

The repository's [`opencode.jsonc`](./opencode.jsonc) loads all five local plugins and contains operator-specific settings. See Classify's [development configuration](./classify/docs/CONFIGURATION.md#repository-development-configuration) before using hosted profiles or changing models. Inference servers are managed separately.

Run plain `opencode` from this repository to use the local plugins while retaining global MCP servers, permissions, providers, and CLI settings. The project config merges over the global config, but plugin arrays accumulate rather than replace one another.

### Local plugins versus global installs

On OpenCode V2.0.26, a global package plus its local checkout produces `Duplicate plugin ID` failures. ID-based directives such as `-classify` do not select a source. Loading the local copy re-enables both, and the installed copy wins.

Root `opencode.jsonc` uses experimental `integration.use` policies with `plugin:<package-target>` resources to block installed Git and npm sources in this project. If global package targets change, update these policies to match. Preserve local path entries and their options. This behavior was verified against V2.0.26, whose public policies guide did not document `integration.use`.

After changing plugin sources, open `/plugins` and confirm all five repository plugins are **active, local**, with no duplicate failures. Unrelated global plugins should remain active. CLI preferences still come from global `cli.json`; there is no project-local CLI settings file.

### Verification

Run `bun run typecheck` in each affected plugin. Full repository validation is five typechecks and four test suites: run `bun test` in every plugin except Marketplace, which has no test script. Additional details:

| Plugin guide | Notes |
| --- | --- |
| [Classify development](./classify/docs/DEVELOPMENT.md) | Typecheck covers server/TUI entries, providers, and tests. Live checks are opt-in; use the [smoke-testing guide](./classify/docs/SMOKE_TESTING.md). |
| [Cache metrics development](./cache-metrics/docs/DEVELOPMENT.md) | Rebuild with `bun run build:tui` before testing TUI changes and commit `dist/tui.js`. Keep host runtimes external and avoid install/build lifecycle hooks. |
| [Quota usage development](./quota-usage/docs/DEVELOPMENT.md) | Shared server/TUI RPC and provider parsing. |
| [Workflow tools development](./workflow-tools/docs/DEVELOPMENT.md) | Scoped server services, strict spec paths, PR snapshots and external smoke checklist. |
| [Marketplace development](./marketplace/docs/DEVELOPMENT.md) | Typecheck and interactive prototype checks. |

From the repository root, run `bun install`, then `bun run check` for Ultracite's Oxlint, anti-slop, and Oxfmt checks. `bun run fix` applies fixes and formatting; generated/build output is excluded.

## Releases

Release Please manages independent versions, changelogs, tags, and GitHub releases for all five plugins. Classify and Workflow tools have npm publishing jobs for `@mholtzscher/opencode-classify` and `@mholtzscher/opencode-workflow-tools`, using GitHub Actions trusted publishing after npm-side setup. See [Releasing](./docs/RELEASING.md) for first-publish setup and the release workflow.
