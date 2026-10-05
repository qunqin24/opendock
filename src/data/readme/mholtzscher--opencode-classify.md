# OpenCode plugins

Six independent Bun packages for OpenCode V2. Each plugin owns its dependencies, lockfile, and TypeScript configuration; this repository is not a Bun workspace.

## Plugins

| Plugin | What it does | Interface and requirements |
| --- | --- | --- |
| [Classify](./classify/README.md) | Typed judgments and bounded semantic file search with TypeSafe AI, Cloudflare Clef, Laya, or Ollama; file/code/diff evidence | Namespaced server tools and backend-selection command; TUI picker/status. Requires explicit backend configuration. |
| [Cache metrics](./cache-metrics/README.md) | Session input cache-hit rate, token totals, per-response history, and JSON export | TUI sidebar and history panel. History includes subagents by default. |
| [Quota usage](./quota-usage/README.md) | Remaining Codex weekly and OpenCode Go monthly/rolling/weekly account quotas | Web/TUI chat tool and TUI sidebar backed by server RPC. Uses active provider connections. |
| [GitHub tools](./github-tools/README.md) | PR creation/descriptions, review-thread validation and fixes, check investigation, Plannotator review | Four server commands plus the TUI-only `/pr-review` picker. Requires authenticated `gh`. |
| [Spec tools](./spec-tools/README.md) | Create, implement, scrub, simplify, and annotate specifications | Seven server commands; OpenCode 2.0.22+. Requires the skills/tools used by each workflow. |
| [Marketplace](./marketplace/README.md) | Browse a sample catalog of skills, commands, and agents | TUI prototype. Install/update/uninstall actions change durable UI state, not OpenCode resources. |

Each plugin README covers setup and common use, with detailed guides under its `docs/` directory.

## Install

Add the plugins you want to the `plugins` array in `opencode.jsonc`. Use a project configuration or the global `~/.config/opencode/opencode.jsonc` (`$XDG_CONFIG_HOME/opencode/opencode.jsonc` when set). `opencode.json` is also supported. Merge entries into existing settings.

Classify is available on npm as [`@mholtzscher/opencode-classify`](https://www.npmjs.com/package/@mholtzscher/opencode-classify). The other plugins install from Git.

This example lists all six packages. Keep only those you want; Classify's example uses TypeSafe and needs `TYPESAFE_API_KEY` in the **OpenCode server** environment. Choose another backend using its [configuration guide](./classify/docs/CONFIGURATION.md).

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "github:mholtzscher/opencode-plugins#main::path:cache-metrics",
    "github:mholtzscher/opencode-plugins#main::path:quota-usage",
    "github:mholtzscher/opencode-plugins#main::path:github-tools",
    "github:mholtzscher/opencode-plugins#main::path:spec-tools",
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

OpenCode installs the packages and loads their exported TUI entries alongside the server entries. `spec-tools` is server-only. Git installs need no checkout or manual `bun install`; cache metrics includes its prebuilt TUI bundle.

You can also add a package globally with the CLI:

```sh
opencode plugin add @mholtzscher/opencode-classify
opencode plugin add 'github:mholtzscher/opencode-plugins#main::path:cache-metrics'
```

After adding Classify with the CLI, edit its config entry to include the backend options shown above. If switching from Git or a local checkout, replace the existing entry's `package` value with `@mholtzscher/opencode-classify` and keep its options.

Load one copy of each plugin; avoid configuring multiple sources with the same plugin ID. See the [OpenCode V2 plugin guide](https://opencode.ai/v2/docs/plugins) for package updates and reload behavior.

## Runtime setup

- **Classify:** credentials and evidence resolve on the server. Start Laya or Ollama separately for local inference. OpenAI Decisions is reserved but unavailable; the plugin does not execute decisions or automatically fail over.
- **Quota usage:** uses active `openai` and `opencode-go` connections on the server. Codex requires ChatGPT account credentials. Ask for quotas in web or TUI chat; the sidebar refreshes every minute and after successful session execution.
- **GitHub tools:** authenticate `gh` on the server for `/pr`, `/pr-comments`, `/pr-comments-fix`, and `/pr-actions`. `/pr-review` uses `gh` on the TUI host and invokes `/plannotator-review`.
- **Spec tools:** existing specs must be direct files under the invoking session's `specs/` directory. Supply the [workflow dependencies](./spec-tools/docs/WORKFLOWS.md#dependencies), including server-side `/plannotator-annotate` for annotation.
- **Cache metrics and Marketplace:** features run in the TUI. Cache-loss markers are heuristic; Marketplace actions are simulated.

## Development

Run `bun install` inside each plugin you work on. Configure its directory in `plugins`: relative paths resolve from the containing config file, or use an absolute path from another project. The root install only supplies lint tooling.

The repository's [`opencode.jsonc`](./opencode.jsonc) loads all six local plugins and contains operator-specific model, account, and credential settings. Classify defaults to `ollama-nimble`; see its [development configuration](./classify/docs/CONFIGURATION.md#repository-development-configuration) before using hosted profiles or changing models.

With mise 2026.9.18 or later, `mise run opencode` launches the local plugins with isolated `XDG_CONFIG_HOME` under `.opencode-dev/` and `--standalone`. It does not start inference servers. The optional [Laya daemon](./classify/docs/CONFIGURATION.md#start-laya-with-mise) is managed separately.

### Verification

Run `bun run typecheck` in each affected plugin. Run `bun test` in every plugin except Marketplace, which has no test script. Additional details:

| Plugin guide | Notes |
| --- | --- |
| [Classify development](./classify/docs/DEVELOPMENT.md) | Typecheck covers server/TUI entries, providers, and tests. Live checks are opt-in; use the [smoke-testing guide](./classify/docs/SMOKE_TESTING.md). |
| [Cache metrics development](./cache-metrics/docs/DEVELOPMENT.md) | Rebuild with `bun run build:tui` before testing TUI changes and commit `dist/tui.js`. Keep host runtimes external and avoid install/build lifecycle hooks. |
| [Quota usage development](./quota-usage/docs/DEVELOPMENT.md) | Shared server/TUI RPC and provider parsing. |
| [GitHub tools development](./github-tools/docs/DEVELOPMENT.md) | Server workflows and TUI review picker. |
| [Spec tools development](./spec-tools/docs/DEVELOPMENT.md) | Server registration, prompts, and spec-path resolution. |
| [Marketplace development](./marketplace/docs/DEVELOPMENT.md) | Typecheck and interactive prototype checks. |

From the repository root, run `bun install`, then `bun run check` for Ultracite's Oxlint, anti-slop, and Oxfmt checks. `bun run fix` applies fixes and formatting; generated/build output is excluded.

## Releases

Release Please manages independent versions, changelogs, tags, and GitHub releases for all six plugins. Classify also publishes to npm as `@mholtzscher/opencode-classify` through GitHub Actions trusted publishing. See [Releasing](./docs/RELEASING.md) for first-publish setup and the release workflow.
