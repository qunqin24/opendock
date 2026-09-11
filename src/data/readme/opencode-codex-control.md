# opencode-codex-control

An [OpenCode](https://opencode.ai) V2 plugin that exposes **Codex Computer Use**
and **Codex Chrome** as native tools, by bridging Codex's `app-server` JSON-RPC.

> [!IMPORTANT]
> Unofficial. Not affiliated with OpenAI, the Codex team, or the OpenCode team.
> It drives an existing Codex install on your machine and requires the same
> plugins and macOS permissions Codex itself needs. Codex Computer Use is
> macOS-only; Chrome control depends on Codex's bundled Chrome plugin.

## Why a plugin and not an MCP server

Codex's Computer Use and Chrome plugins are not MCP servers. Computer Use ships
as a `node-repl` content variant, Chrome ships no server at all, and the
Computer Use service only honours calls from a Codex-host session. The working
path is `codex app-server` calling the bundled `node_repl` server's `js` tool,
which imports `@oai/sky` or Chrome's `browser-client.mjs`.

This plugin owns one `codex app-server` connection, compiles each typed tool
call into the JavaScript program that performs it, and registers the results
with OpenCode's tool registry. It has no runtime dependencies and spawns
nothing until the first tool call.

## Tools

- `computer_use.*` — macOS desktop control: `list_apps`, `get_app_state`,
  `click`, `type_text`, `press_key`, `paste`, `scroll`, `drag`, `select_text`,
  `set_value`, `perform_secondary_action`.
- `chrome.*` — the real Chrome: `list_tabs`, `new_tab`, `navigate`, `page_info`,
  `read_page`, `read_dom`, `click`, `type_text`, `press_key`, `scroll`,
  `set_value`, `select_text`, `perform_secondary_action`, `drag`,
  `find_elements`, `go_back`, `go_forward`, `reload`, `close_tab`,
  `export_content`.

Interaction uses the accessibility (`ax`) API and `playwright` for reads; the
`dom_cua`/`cua` namespaces are filtered out on Chrome's extension backend.

## Requirements

- OpenCode V2 (`opencode2`).
- The `codex` CLI on `PATH` (or set `codexCli`).
- Computer Use: the shared "Codex Computer Use" app under `$CODEX_HOME`.
- Chrome: Codex's bundled Chrome plugin and the ChatGPT browser extension, used
  once inside Codex.

Each tool reports an ordered setup path when its surface is not installed.

## Install

From npm, in `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-codex-control"]
}
```

From a local checkout (useful while developing):

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-codex-control"]
}
```

## Options

```jsonc
{
  "plugins": [
    {
      "package": "opencode-codex-control",
      "options": {
        "codexHome": "~/.codex",
        "codexCli": "codex",
        "computerUse": true,
        "chrome": true
      }
    }
  ]
}
```

## Permissions and approvals

Every tool carries `options.permission` (`computer_use` or `chrome`), so the
OpenCode permission layer is the consent boundary. To require a prompt for
either surface:

```jsonc
{
  "permissions": [{ "action": "chrome", "resource": "*", "effect": "ask" }]
}
```

Codex's own approval prompts (for example Chrome's per-site access) arrive as
`mcpServer/elicitation/request`. Because the OpenCode tool call has already been
allowed, the plugin answers them automatically and logs the origin as
`[codex-control] Codex approval accept (…)`. Treat this as coarse consent for
now; finer-grained grants are a follow-up.

## Development

```sh
bun install
bun run typecheck
bun test
```

`bun run smoke` exercises the real bridge end to end (it needs a working Codex
install and will launch apps or open browser tabs), so it is not part of CI.

## Layout

```
index.ts                    # entrypoint the OpenCode loader imports
src/plugin.ts               # plugin definition + tool registration
src/controller.ts           # connection lifecycle; call -> result
src/codex/appserver.ts      # codex app-server child + JSON-RPC client
src/codex/install.ts        # CLI/install discovery
src/codex/permissions.ts    # macOS TCC denial -> setup instructions
src/codex/repl.ts           # safe argument encoding + JSON result wrapper
src/tools/computer-use.ts
src/tools/chrome.ts
```

## License and attribution

MIT. Portions are adapted from [Executor](https://github.com/RhysSullivan/executor)
(MIT, Copyright (c) 2026 Rhys Sullivan) — see `NOTICE` and `LICENSE-EXECUTOR`.
