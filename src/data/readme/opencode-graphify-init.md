# OpenCode Graphify Init

[![npm version](https://img.shields.io/npm/v/opencode-graphify-init?logo=npm&label=npm)](https://www.npmjs.com/package/opencode-graphify-init)

Keep [Graphify](https://github.com/Graphify-Labs/graphify) code graphs fresh in the background. First indexing requires `/graphify-index` consent; authorized older graphs are automatically reconstructed once under the code-only policy.

## Install

Requires OpenCode `>=2.0.28 <3` and Graphify `0.9.32` with MCP support:

```bash
uv tool install "graphifyy[mcp]==0.9.32"
opencode plugin add opencode-graphify-init
```

Restart OpenCode, open a concrete project, then run:

```text
/graphify-index
```

Confirm the repository set and authorize local, free code-only indexing. Project documentation is not indexed or deleted; source comments and docstrings remain available to Graphify.

## Use

1. Run `/graphify-index` and confirm the target repositories before their first indexing.
2. Let later OpenCode sessions reconstruct legacy graphs once and refresh stale code graphs automatically.

Consent and successful code-only policy state are recorded under `.ai/graphify-out/`. Historical mode/backend settings cannot enable documentation extraction.

## Behavior

| Project state | Result |
| --- | --- |
| No authorized graph or consent | Show one hint; start nothing |
| Previously authorized graph without successful policy proof | Rebuild once from clean generated state, even when current at `HEAD` |
| Graph commit differs from Git `HEAD` | Refresh incrementally with `--code-only` |
| Graph/empty corpus is current | Keep local state; retry pending global work when enabled |

Refreshes run in the background, use exclusive local and global locks, and keep project state under `.ai/graphify-out/`. Interrupted or uncertain work retains its lock until an operator confirms quiescence and removes only that lock. Global reconciliation is separately pending on opt-out or failure; the plugin verifies ownership before a scoped global mutation. See [Graph lifecycle](docs/lifecycle.md) for manual recovery and external-CLI race limitations.

## Configure

| Variable | Effect |
| --- | --- |
| `OPENCODE_GRAPHIFY_AUTOINIT=0` | Disable refresh for this OpenCode process |
| `OPENCODE_GRAPHIFY_GLOBAL=0` | Leave shared global data untouched; retry pending reconciliation when enabled |
| `GRAPHIFY_OUT=.ai/graphify-out` | Keep Graphify CLI and MCP paths aligned |

Use `GRAPHIFY_OUT=.ai/graphify-out` in shells and Graphify MCP configuration. Do not combine it with `--out`.

## Update or remove

A bare `opencode-graphify-init` entry follows npm `latest` when checking or updating plugins. To pin a release, replace the existing entry in `plugins` with `opencode-graphify-init@<version>`, or remove it before adding the pinned version:

```bash
opencode plugin remove opencode-graphify-init
opencode plugin add opencode-graphify-init@<version>
```

Use `opencode plugin update` to update installed package plugins. To remove this plugin:

```bash
opencode plugin remove opencode-graphify-init
```

Restart OpenCode after changing plugins. Existing graph data remains until you remove it separately.

## Migrate from OpenCode 1

This implementation uses the OpenCode v2 plugin API. In `opencode.jsonc` or `opencode.json`, move the package entry from the old `plugin` array to `plugins`; object entries use `{ "package": "opencode-graphify-init", "options": {} }` instead of a tuple. Preserve the other entries and settings.

```json
{
  "plugins": ["opencode-graphify-init"]
}
```

The package includes both server and TUI entrypoints. OpenCode automatically loads the TUI companion from the active server plugin, so no separate `tui.json` entry is needed. Notifications are scoped to the current project and recovered when the TUI connects late. The consent records and graphs under `.ai/graphify-out/` keep their existing lifecycle.

## Develop

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run security:check
```

See [Contributing](CONTRIBUTING.md) for local loading and review rules.

## Help

- [Graph lifecycle and recovery](docs/lifecycle.md)
- [Report a problem](https://github.com/andresnator/opencode-graphify-init/issues)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [MIT License](LICENSE)
