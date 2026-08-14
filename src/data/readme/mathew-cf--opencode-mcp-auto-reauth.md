# opencode-mcp-auto-reauth

An [OpenCode](https://opencode.ai) plugin that refreshes expired MCP OAuth tokens at startup when a refresh token is available.

## Why

Remote MCP servers that use OAuth can leave OpenCode with an expired access token. This plugin performs a safe startup refresh pass so OpenCode can reconnect without manually re-running authentication.

The plugin intentionally **does not** run `opencode mcp auth <server>` from inside OpenCode. Starting the OpenCode CLI while plugins are loading can recursively load the same plugin and crash the process. If a server has no refresh token or no stored OAuth client information, the plugin logs that manual authentication is required instead.

## How it works

1. Reads `mcp-auth.json` from the OpenCode data directory.
2. Checks each stored MCP OAuth entry:
   - **Token still valid** — skips.
   - **No expiry** — skips, matching OpenCode's behavior.
   - **Expired token with `refreshToken` and `clientInfo.clientId`** — refreshes directly via OAuth metadata discovery.
   - **Incomplete OAuth entry with a stored `serverUrl` but no access token** — asks OpenCode's in-process MCP auth API to run the interactive browser flow.
   - **Missing token, refresh token, client id, or server URL** — logs that manual authentication is required.
3. Discovers the token endpoint using standard OAuth protected-resource / authorization-server metadata.
4. Writes refreshed tokens back to `mcp-auth.json` atomically with `0600` permissions where supported.

A 60-second buffer is applied before expiry to avoid racing with startup.

## Install

Add it to your OpenCode config (`opencode.json` or `opencode.jsonc`):

```jsonc
{
  "plugin": [
    "@mathew-cf/opencode-mcp-auto-reauth"
  ]
}
```

## Manual auth fallback

Some OAuth servers do not issue refresh tokens, and some missing-token states do not include enough server metadata for the plugin to start OpenCode's in-process browser flow. For those, run OpenCode's normal authentication command outside of plugin startup:

```bash
opencode mcp auth <server-name>
```

## Disable temporarily

Set this environment variable before starting OpenCode:

```bash
OPENCODE_MCP_AUTO_REAUTH=0 opencode
```

## Platform support

| Platform | Data directory |
|----------|---------------|
| Linux | `$XDG_DATA_HOME/opencode` or `~/.local/share/opencode` |
| macOS | `$XDG_DATA_HOME/opencode` or `~/.local/share/opencode` |
| Windows | `%LOCALAPPDATA%\\opencode` or `~/AppData/Local/opencode` |

The plugin also reads OpenCode config from the current project (`opencode.json(c)` and `.opencode/opencode.json(c)`) plus the global config directory to find a remote server URL if the auth entry does not already include `serverUrl`.

## Known issue: stale `/mcps` status

After the plugin completes interactive auth, it connects the MCP server in the current OpenCode backend session and shows a success toast. The `/mcps` dialog can still show stale `needs_auth` / `Disabled` status until the TUI refreshes its MCP sync state.

This is a display issue: the tools can be available even while the dialog is stale. Pressing `space` on the stale row, reopening/restarting OpenCode, or any future OpenCode-side MCP status refresh event will update the dialog.

## Logs

Activity is logged to `mcp-auto-reauth.log` in the same data directory:

```text
2026-05-27T14:30:01.000Z [mcp-auto-reauth] checking 3 server(s)
2026-05-27T14:30:01.001Z [mcp-auto-reauth] my-server: skip — token still valid or has no expiry
2026-05-27T14:30:01.002Z [mcp-auto-reauth] other-server: refreshing expired OAuth token
2026-05-27T14:30:02.500Z [mcp-auto-reauth] other-server: refreshed successfully
2026-05-27T14:30:02.501Z [mcp-auto-reauth] done (auth file updated)
```

Logs include server names and status messages only. Tokens and client secrets are never logged.

## Development

```bash
bun install
bun run build
bun run typecheck
```

## License

Apache-2.0
