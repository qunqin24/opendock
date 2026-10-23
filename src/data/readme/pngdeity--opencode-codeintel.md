# @pngdeity/opencode-codeintel

OpenCode V2 plugin providing per-project socket-activated MCP code-intelligence routing and provisioning for **Serena** (`serena`) and the **mcpls** universal LSP fallback (`cclsp`).

## Install

```sh
opencode plugin add @pngdeity/opencode-codeintel
npx @pngdeity/opencode-codeintel install
npx @pngdeity/opencode-codeintel doctor
```

`install` places the systemd user units and maintenance scripts; `doctor`
verifies a language server actually attached. See
[`docs/INSTALL.md`](./docs/INSTALL.md) for prerequisites, lingering, the
environment a proxy-installed language server needs, and uninstall.

## Surfaces Registered

1. **MCP Router (`mcp-route`)**: Routes `serena` and `cclsp` remote MCP entries per project directory using `~/.config/{serena,cclsp}/instances/*.conf`.
2. **`codeintel` Tool**: Single agent-callable entrypoint to enable or inspect code-intelligence coverage for a directory.
3. **`/lsp` Command**: TUI slash command to provision or inspect code-intelligence coverage.
4. **`mcp-instance` Tool**: Direct lifecycle control (`enable`, `disable`, `status`) for the `cclsp` (`mcpls`) fallback instance.
5. **`serena-instance` Tool**: Direct lifecycle control (`enable`, `refresh`, `disable`, `status`, `submodules`) for Serena instances.
6. **`serena-provision` Tool**: Multi-language `project.yml` census and provisioning for Serena 2.0.0.
7. **Code intel sidebar block (`./tui`)**: Backend liveness and the language servers each backend spawned, drawn in the sidebar. Exporting `./tui` beside the main entrypoint is what loads it; OpenTUI and Solid are peers supplied by the host runtime.

## Exports

| subpath | contents |
|---|---|
| `.` / `./server` | the plugin entrypoint and every server surface above |
| `./tui` | the sidebar panel |
| `./core` | conf reading, port allocation, `systemctl`/`git` helpers |
| `./descriptors` | the `SERENA` and `CCLSP` descriptors |
| `./snapshot` | backend/LSP recovery (`readServers`, `currentProject`), renderer-free |

## Companion Systemd Units & Scripts

The systemd user unit templates ship in [`share/systemd/user/`](./share/systemd/user)
and are installed by `codeintel install`. The maintenance scripts they reference
ship in [`bin/`](./bin).

The package owns these files; it does not install them implicitly. There is no
`postinstall`, because OpenCode runs plugin installs with `ignoreScripts: true`,
so one would never fire.
