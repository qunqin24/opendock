# oc-mcp-plugin-manager

MCP manager for **OpenCode 2**: per-project enable/disable overrides, MCP refresh, a tool index, and a filtered terminal sidebar. The package has separate `./server` and `./tui` entrypoints; shared internal code is bundled into both.

Requires OpenCode **2.0.16 or later** and Node.js 20+ for the installer. The plugin is compiled against `@opencode/plugin@2.0.16`; current integration verification uses OpenCode 2.0.22. Earlier 2.0 releases are not verified.

## Install

```sh
npx oc-mcp-plugin-manager init --full
npx oc-mcp-plugin-manager init --only reconnect,hide
npx oc-mcp-plugin-manager init --preset hide-unconnected
npx oc-mcp-plugin-manager init --full --global
npx oc-mcp-plugin-manager status
npx oc-mcp-plugin-manager remove
```

Features: `reconnect`, `toggle`, `hide`, `refresh`, `index`. A TTY install prompts for features unless `--yes`, `--full`, `--only`, or `--preset` is supplied. `--no-install` only writes configuration.

The installer detects `opencode` and `opencode2` by their actual `--version`, rather than treating their names as different runtimes. Project installation writes `.opencode/opencode.json(c)`; OpenCode resolves and installs configured npm packages at startup. Global installation also runs `opencode plugin add <package>` before applying the selected options. This OpenCode command always edits global configuration, so the project installer does not invoke it.

The package spec and options are written together:

```jsonc
{
  "plugins": [
    {
      "package": "oc-mcp-plugin-manager",
      "options": {
        "features": { "reconnect": true, "toggle": true, "hide": true, "refresh": true, "index": true }
      }
    }
  ]
}
```

Both plugin targets load from this entry. The installer edits an existing JSONC file when present, preserves comments and unrelated entries, and refuses to overwrite malformed configuration.

## Sidebar settings

With `hide` enabled, the plugin appends a filtered MCP panel to `sidebar.content`. A project install keeps the built-in panel visible alongside it and does not change global terminal settings; status hiding therefore applies only to the added panel. Use `init --global` for complete sidebar filtering. Only global initialization sets `plugin_enabled["opencode.sidebar.mcp"]` to `false` in the **global** terminal configuration `~/.config/opencode/cli.json` to avoid duplicate panels. If `XDG_CONFIG_HOME` is set, its `opencode/` directory is used. `OPENCODE_CONFIG_DIR` overrides this directory when set. This terminal setting affects all projects.

Restart the terminal client after installation or terminal configuration changes. Plain `opencode plugin add oc-mcp-plugin-manager` loads the plugin with defaults but does not disable the built-in sidebar; set the flag above to avoid duplicate panels.

`remove` removes this package from the selected OpenCode scope. It retains global terminal preferences because another project may still use the filtered panel. To restore the built-in MCP panel, remove its `false` flag from global `cli.json` and restart the client. Disabling the `hide` feature in an existing installation also requires restoring that global flag if the filtered panel is no longer needed.

## Toggles and refresh

- `mcp_toggle` is an agent-callable tool with `list`, `enable`, `disable`, and `reset` actions. The terminal `/mcp-toggle` opens a server picker or accepts a server name.
- Overrides persist through OpenCode plugin storage, keyed by project ID. A toggle calls `ctx.mcp.reload()` to apply the updated transform immediately; it does not require a restart.
- `mcp_refresh` accepts `reconnect`, `index`, or `all`. It reloads the MCP domain, reads the resulting status, and optionally writes `.opencode/mcp-tools.json`. Indexing is best effort and groups tool IDs by server prefix.
- The terminal `/mcp-refresh` additionally calls the client MCP `connect` endpoint for failed servers sequentially. Remote endpoints receive a short liveness probe before connection attempts. Periodic terminal recovery probes failed remote servers; failed local processes are retried by explicit refresh.

The server plugin context exposes `list`, `transform`, and `reload`, with **no per-server connect endpoint**. Headless refresh can reapply configuration and report status, but cannot guarantee restarting an exited stdio process. The terminal client has the explicit connect API. Authentication failures still require authentication.

## Hide rules

Rules under `hide.rules` use first-match semantics. Fields within one rule are combined with AND; no match means visible.

```jsonc
{
  "hide": {
    "rules": [
      { "status": ["failed", "needs_auth"], "hide": true },
      { "name": "private-*", "hide": true },
      { "name": "docs", "hide": false }
    ]
  }
}
```

`name` is an anchored glob supporting `*` and `?`. Status names are `connected`, `disabled`, `failed`, `needs_auth`, `needs_client_registration`, and `unknown` (including the host's pending state).

Status-qualified rules filter only the live sidebar and leave model access unchanged. Name-only hide rules also remove or disable the matching server through the server MCP transform. `toggle.pruneMode` selects `drop` (default) or `disable`; an explicit enable override takes precedence over static name pruning.

## Development and publishing

```sh
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run test
bun run pack:check
node packages/v2/bin/cli.js init --local /absolute/path/to/packages/v2 --cwd /path/to/project
```

`--local` requires an explicit package directory with `package.json`, root `server.js`/`tui.js` loader entries, and built `./server` and `./tui` exports; it never searches repository tooling. `packages/core` is private and bundled at build time, so consumers install only `oc-mcp-plugin-manager` from `packages/v2`. Local directories resolve root `server.js` and `tui.js`; these forwarding modules load the same bundled builds as the npm exports. The npm archive includes the forwarding modules, compiled entries, installer, command template, README, and MIT license.

CI validates the build, types, tests, and package contents. The manual publish workflow requires an npm token stored as `NPM_TOKEN`, with package publish permission, and a version that is not already published. The public repository is https://github.com/d4n-sec/oc-mcp-plugin-manager. Publish only from a verified release commit.

API references: [server plugins](https://opencode.ai/v2/docs/build/plugins/), [terminal plugins](https://opencode.ai/v2/docs/build/plugins/cli/), and [terminal configuration migration](https://opencode.ai/v2/docs/migrate-v1/#terminal-client-configuration).

## License

MIT
