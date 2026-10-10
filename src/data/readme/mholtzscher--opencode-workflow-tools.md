# OpenCode plugins

Five independent Bun packages for OpenCode V2. Each plugin owns its dependencies, lockfile, and TypeScript configuration; this repository is not a Bun workspace.

## Plugins

| Plugin | What it does | Interface and requirements |
| --- | --- | --- |
| [Classify](./classify/README.md) | Typed judgments with OpenAI Decisions, TypeSafe AI, Cloudflare Clef, Laya, or Ollama; file/code/diff evidence | Namespaced decision tool and backend-selection command; TUI picker/status. Requires explicit backend configuration. |
| [Cache metrics](./cache-metrics/README.md) | Session input cache-hit rate, token totals, per-response history, and JSON export | TUI sidebar and history panel. History includes subagents by default. |
| [Quota usage](./quota-usage/README.md) | Remaining Codex weekly and OpenCode Go monthly/rolling/weekly account quotas | Web/TUI chat tool and TUI sidebar backed by server RPC. Uses active provider connections. |
| [Workflow tools](./workflow-tools/README.md) | Spec planning/refinement/implementation, PR publication/metadata, feedback delivery and check investigation | Eight server commands; OpenCode 2.0.22+. External skills and server-side authenticated `gh` as needed; no TUI entry. |
| [Marketplace](./marketplace/README.md) | Browse a sample catalog of skills, commands, and agents | TUI prototype. Install/update/uninstall actions change durable UI state, not OpenCode resources. |

Each plugin README covers setup and common use, with detailed guides under its `docs/` directory.

## Install

Add the plugins you want to the `plugins` array in `opencode.jsonc`. Use a project configuration or the global `~/.config/opencode/opencode.jsonc` (`$XDG_CONFIG_HOME/opencode/opencode.jsonc` when set). `opencode.json` is also supported. Merge entries into existing settings.

Classify is available on npm as [`@mholtzscher/opencode-classify`](https://www.npmjs.com/package/@mholtzscher/opencode-classify). The other plugins install from Git.

This example lists all five packages. Keep only those you want. Classify uses TypeSafe here and needs `TYPESAFE_API_KEY` in the OpenCode server environment. To choose another backend, read [Classify configuration](./classify/docs/CONFIGURATION.md). Before replacing legacy specification or GitHub plugins, follow [Workflow tools migration](./workflow-tools/docs/MIGRATION.md).

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

Run `bun install` inside each plugin you work on. Add its directory to `plugins`. Relative paths resolve from the containing config file. You can also use an absolute path from another project. The root install supplies lint tooling only.

The repository's [`opencode.jsonc`](./opencode.jsonc) loads all five local plugins and contains operator-specific settings. See Classify's [development configuration](./classify/docs/CONFIGURATION.md#repository-development-configuration) before using hosted profiles or changing models. Inference servers are managed separately.

Run plain `opencode` from this repository to use the local plugins while retaining global MCP servers, permissions, providers, and CLI settings. The project config merges over the global config, but plugin arrays accumulate rather than replace one another.

### Local plugins versus global installs

On OpenCode V2.0.26, a global package plus its local checkout produces `Duplicate plugin ID` failures. ID-based directives such as `-classify` do not select a source. Loading the local copy re-enables both, and the installed copy wins.

Root `opencode.jsonc` uses experimental `integration.use` policies with `plugin:<package-target>` resources to block installed Git and npm sources in this project. If global package targets change, update these policies to match. Preserve local path entries and their options. This behavior was verified against V2.0.26, whose public policies guide did not document `integration.use`.

Before loading Workflow tools, follow [migration prerequisites](./workflow-tools/docs/MIGRATION.md#remove-legacy-sources-first). Removing old deny policies can re-enable global legacy installations with different IDs. Repository changes do not edit global configuration.

After changing plugin sources, open `/plugins` and confirm all five repository plugins are **active, local**, with no duplicate failures or legacy command providers. Unrelated global plugins should remain active. CLI preferences still come from global `cli.json`; there is no project-local CLI settings file.

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
