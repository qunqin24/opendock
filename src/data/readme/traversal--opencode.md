# Traversal plugins

Plugins that connect coding agents to [Traversal](https://traversal.com), so your agent can investigate production incidents and find root causes using your observability data.

Each plugin bundles:

- The Traversal remote MCP server (`https://api.prod.traversal.com/mcp/`)
- Skills that teach the agent how to investigate, follow up, and share results

| Agent | Plugin | Authentication |
|---|---|---|
| Claude Code | [`plugins/claude`](plugins/claude) | Traversal API key, prompted on install |
| Cursor | [`plugins/cursor`](plugins/cursor) | Traversal API key, set in the Cursor dashboard |
| Codex | [`plugins/codex`](plugins/codex) | Sign in to Traversal |
| OpenCode | [`plugins/opencode`](plugins/opencode) | Sign in to Traversal, or a Traversal API key in `TRAVERSAL_API_KEY` |

You need a Traversal account. Create an API key at [app.traversal.com](https://app.traversal.com/settings/api-keys) under **Settings > API keys**.

## Install

### Claude Code

```bash
claude plugin marketplace add InteractionLabs/traversal-plugins
claude plugin install traversal@traversal
```

### Cursor

Install **Traversal** from the Cursor Marketplace, then set `TRAVERSAL_API_KEY` under **Plugins → Configure**.

### Codex

```bash
codex plugin marketplace add InteractionLabs/traversal-plugins
```

Then install **Traversal** from the plugin list.

### OpenCode

Requires OpenCode 2. Add the plugin to your `opencode.json`, then sign in:

```jsonc
{ "plugins": ["@traversal/opencode"] }
```

```bash
opencode mcp auth traversal
```

To use an API key instead, set `TRAVERSAL_API_KEY`. See [`plugins/opencode`](plugins/opencode).

### Other MCP clients

Any client that supports streamable HTTP can connect directly. See [docs.traversal.com](https://docs.traversal.com/using-traversal/mcp).

## Repository layout

```
plugins/
├── claude/   Claude Code plugin (.claude-plugin/plugin.json, .mcp.json)
├── cursor/   Cursor plugin (.cursor-plugin/plugin.json, mcp.json)
├── codex/    Codex plugin (plugin.json, mcp.json)
└── opencode/ OpenCode plugin (npm package: package.json, src/index.ts)
.claude-plugin/marketplace.json   Claude Code marketplace
.cursor-plugin/marketplace.json   Cursor marketplace
.agents/plugins/marketplace.json  Codex marketplace
```

## Support

Open an issue in this repository, or contact support@traversal.com.

## Security

To report a security issue, see [SECURITY.md](SECURITY.md). Please don't open a public issue.

## License

[Apache-2.0](LICENSE)
