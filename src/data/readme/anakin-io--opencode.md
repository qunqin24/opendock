# Anakin plugin for OpenCode

Gives [OpenCode](https://opencode.ai) [Anakin](https://anakin.io): scrape and crawl
websites, search the web, run deep research, use pre-built Wire actions on hundreds of
sites, monitor pages for changes, compare AI answer engines and drive an AI cloud browser.

The plugin adds two things:

- **Anakin's hosted MCP server** (`https://mcp.anakin.io/mcp`) as the `anakin` MCP
  server, with all 22 Anakin tools. You sign in to your Anakin account once with OAuth;
  there's no API key to copy.
- **Five Anakin skills** that tell the agent when to use which tool: web data, research,
  Wire site actions, monitoring and browser tasks.

## Install

```bash
opencode plugin @anakin-io/opencode       # OpenCode 1
opencode plugin add @anakin-io/opencode   # OpenCode 2
```

Or add it to `opencode.json` yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@anakin-io/opencode"]
}
```

Then sign in to Anakin:

```bash
opencode mcp auth anakin
```

This opens your browser to sign in or create a free Anakin account. Check it with
`opencode mcp list`, which shows `anakin` as connected.

## Use your own server settings

The plugin leaves an `anakin` MCP server you've configured yourself alone. For example,
to use Anakin's local server with an API key instead of signing in:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@anakin-io/opencode"],
  "mcp": {
    "anakin": {
      "type": "local",
      "command": ["npx", "-y", "@anakin-io/mcp"],
      "environment": { "ANAKIN_API_KEY": "{env:ANAKIN_API_KEY}" }
    }
  }
}
```

Get an API key at [anakin.io/dashboard](https://anakin.io/dashboard). Note OpenCode's
`{env:VAR}` syntax for environment variables.

## Tools

| Area | Tools |
|---|---|
| Web data | `scrape`, `search`, `map`, `crawl`, `agentic_search` |
| Wire site actions | `wire_discover`, `wire_catalog`, `wire_read_action`, `wire_write_action`, `wire_identities`, `wire_login`, `wire_build`, `wire_build_status` |
| Monitors | `monitor_create`, `monitor_list`, `monitor_changes`, `monitor_control` |
| AI visibility | `ai_visibility_search`, `ai_visibility_sources` |
| Browser | `session_list`, `session_delete`, `browser_task` |

Each tool spends credits from your Anakin account; see [pricing](https://anakin.io/pricing).

## Compatibility

Works with OpenCode 1 (`server()` plugin API) and OpenCode 2 (`setup()` plugin API).

## Development

```bash
npm install
npm run check   # TypeScript
npm test        # node --test
npm run sync-skills   # copy skills from a sibling agent-skills checkout
```

The skills come from [Anakin-Inc/agent-skills](https://github.com/Anakin-Inc/agent-skills),
the same skills Anakin ships to Claude Code, Codex, Cursor and other agents.

Releases publish to npm from GitHub Actions, with provenance, when a `v*` tag matching
`package.json`'s version is pushed.

## License

MIT
