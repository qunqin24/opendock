# Graphify for OpenCode

Bring Graphify's indexed code intelligence and repository memory into OpenCode.
Find symbols, investigate dependencies and change impact, and retrieve saved
repository knowledge through [Graphify MCP](https://graphify.com/mcp).

This plugin connects `https://api.graphify.com/mcp`, adds the `/graphify` command,
and gives the assistant guidance for using repository evidence. OpenCode manages
MCP transport, browser OAuth, and credentials. There are no runtime dependencies,
bundled API keys, or install scripts.

## Install

Supports OpenCode v1 and v2 from the same package. OpenCode v1 support requires
**OpenCode 1.18.29** or newer; tested with **OpenCode 1.18.35**. OpenCode v2
support is tested with **@opencode/cli 2.0.26**. Version **1.1.1** contains the
v2 command compatibility fix; publish that release before using the npm examples below.
You also need a Graphify account with an accessible indexed repository and a
working model provider in OpenCode. Graphify sign-in is separate from model-provider sign-in.

For OpenCode v1, add this entry to your existing `opencode.json` (project) or
`~/.config/opencode/opencode.json` (global), keeping any existing plugin entries:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["graphify-opencode@1.1.1"]
}
```

For OpenCode v2, use `plugins`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["graphify-opencode@1.1.1"]
}
```

OpenCode installs npm plugins at startup. From the configured project, sign in
with your OpenCode binary:

```sh
opencode mcp auth graphify
opencode mcp list
opencode
```

With OpenCode v2, use the binary your v2 installation exposes; some builds use
`opencode2`, while newer dev builds may use `opencode`.

Complete Graphify sign-in in the browser while the terminal remains running.
In OpenCode, try:

```text
/graphify Explain how authentication works in my repository, with file and symbol references.
/graphify What callers and tests might be affected by changing the payment handler?
/graphify Find saved knowledge relevant to the indexing pipeline.
```

The server supplies the current tool names and schemas. The plugin does not
require a fixed tool list or run Graphify locally.

## Existing settings

The plugin adds a `graphify` MCP entry in memory only when one is absent. It does
not rewrite your configuration file or replace an existing connection. It also
preserves an existing `/graphify` command and your tool and permission settings.
Plugin-specific guidance is active only for an enabled remote `graphify` entry
whose URL is exactly `https://api.graphify.com/mcp`. In OpenCode v2, that server
is managed through `mcp.servers.graphify` and uses `disabled: true` to opt out.
The v2 `/graphify` command remains listed when disabled, but refuses to submit a
request until the Graphify connection is enabled. Restart after changing settings.

To disable Graphify in OpenCode v1, add this to your configuration and restart
OpenCode:

```json
{
  "mcp": {
    "graphify": { "enabled": false }
  }
}
```

In OpenCode v2:

```json
{
  "mcp": {
    "servers": {
      "graphify": { "type": "remote", "url": "https://api.graphify.com/mcp", "disabled": true }
    }
  }
}
```

You can use the hosted MCP without this plugin, or configure it explicitly if
your OpenCode build does not expose plugin-added servers to its MCP commands:

OpenCode v1:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "graphify": {
      "type": "remote",
      "url": "https://api.graphify.com/mcp",
      "enabled": true,
      "timeout": 15000
    }
  }
}
```

OpenCode v2:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "graphify": {
        "type": "remote",
        "url": "https://api.graphify.com/mcp",
        "disabled": false,
        "timeout": {
          "startup": 15000,
          "catalog": 15000,
          "execution": 15000
        }
      }
    }
  }
}
```

## Data and permissions

When the assistant uses a Graphify tool, its arguments are sent to Graphify's
hosted service. Results can become context for your selected model provider.
The plugin itself does not scan or upload local files, store credentials, or
automatically save memories. Graphify processes requests under your account's
repository access and billing.

Some server tools save memory or change workspace settings, including the
account's default workspace. When trail capture is enabled, some search and
recall tools may also record query context. Review tool descriptions and configure
[OpenCode permissions](https://opencode.ai/docs/permissions/) for your needs.
Plugin guidance is advisory; OpenCode's permissions remain the enforcement layer.

Graph results describe an indexed snapshot. Verify them against current local
code before editing. Graphify's suggested tests are recommendations, not test runs.
See [Privacy](https://graphify.com/privacy) and [Terms](https://graphify.com/terms).

## Troubleshooting

- **Server needs authentication:** run `opencode mcp auth graphify` from the
  configured project and complete the new browser flow.
- **Browser cannot reach localhost:** keep the initiating terminal alive and
  use the same machine for the browser and CLI. Restart authentication if the
  callback listener has stopped; do not reuse an old callback URL. WSL, SSH, and
  containers may need loopback forwarding appropriate to your environment.
- **Server not found:** confirm the plugin loaded, restart OpenCode, and use the
  explicit MCP configuration above if needed.
- **Connection trouble:** run `opencode mcp debug graphify`. Remove credentials,
  authorization URLs, and private repository details before sharing diagnostics.
- **Wrong or missing repository:** verify repository indexing and workspace
  access in Graphify. Do not assume the local folder has already been indexed.
- **Sign out:** run `opencode mcp logout graphify`.
- **Uninstall:** remove this plugin entry and any explicit `mcp.graphify` entry,
  then restart OpenCode. Sign out first if you also want to remove stored credentials.

## Development

```sh
npm ci
npm test
npm run check
npm pack --dry-run
```

The package exports one default object: OpenCode v2 calls `setup(ctx)`, while
OpenCode v1 calls `server()`. Unit tests exercise v1 and v2 registration,
configuration preservation, deferred MCP registration, disabled connections, literal
command arguments, attachments, delivery, and isolated guidance. The v2 native smoke
test covers command registration, prompt admission, and the context hook; authenticated
Graphify tool execution requires an account and is a separate check.

[Website](https://graphify.com) · [Documentation](https://docs.graphify.com) ·
[Support](mailto:founders@graphify.com) ·
[OpenCode plugins](https://opencode.ai/docs/plugins/) ·
[OpenCode v2 plugins](https://opencode.ai/v2/docs/build/plugins/)
