# @novadalabs/opencode-novada

[OpenCode](https://opencode.ai) plugin for [Novada](https://www.novada.com). It adds the hosted Novada MCP server and a skill that tells your agent when to use each Novada tool: web search, page extraction through anti-bot pages, cited multi-source research, and structured records from 14 platforms (Amazon, Google, LinkedIn, TikTok, YouTube, Walmart and more).

Requires OpenCode 2.

## Install

```bash
opencode plugin add @novadalabs/opencode-novada
```

Or add it to `opencode.json` yourself:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@novadalabs/opencode-novada"]
}
```

## Credentials

1. Sign up at [novada.com](https://www.novada.com/?npm-opencode-novada). **Novada MCP comes with $10 in free credit for every new account, no credit card required.** To keep going after the free credit, buy a Scraper API or Web Unblocker plan on the [pricing page](https://www.novada.com/pricing/scraping-solutions/).
2. Open OpenCode, run `/mcps`, select `novada`, and sign in with your Novada account in the browser (OAuth). No API key is needed for this.
3. Prefer an API key? Open the [Novada dashboard](https://dashboard.novada.com/), go to **API Playground** and copy your API key, then add the server yourself as shown under [What the plugin does](#what-the-plugin-does).

The key is sent as `Authorization: Bearer <API key>`. Check your balance any time by asking the agent to run `novada_setup`.

## What the plugin does

- Adds a remote MCP server named `novada` pointing at `https://mcp.novada.com/mcp`. If you already have a server named `novada` in your config, the plugin leaves it alone.
- Adds a `novada` skill that explains which tool fits which task and how billing works.

The plugin adds a third-party hosted service to your OpenCode. To install only the skill and keep full control over the server entry, turn the server off:

```json
{
  "plugins": [
    {
      "package": "@novadalabs/opencode-novada",
      "options": { "mcp": false }
    }
  ]
}
```

Then add the server yourself, for example with an API key header:

```json
{
  "mcp": {
    "servers": {
      "novada": {
        "type": "remote",
        "url": "https://mcp.novada.com/mcp",
        "oauth": false,
        "headers": { "Authorization": "Bearer {env:NOVADA_API_KEY}" }
      }
    }
  }
}
```

## Tools

| Tool | Use it when |
| --- | --- |
| `novada_search` | Find pages by query (Google, DuckDuckGo, Yandex) |
| `novada_extract` | Read one URL, or up to 10 in parallel, including pages that block bots |
| `novada_research` | Answer a complex question with passages from several sources |
| `novada_scrape_<platform>` | Structured records from a platform (Amazon, Google, LinkedIn, TikTok, YouTube, Walmart and more) |
| `novada_crawl` | Pull content from up to 20 related pages on one site |
| `novada_map` | List the URLs on a site before fetching |
| `novada_proxy` | Get a proxy config for your own HTTP client |

Call `novada_discover` for the full list on your connection. Under OpenCode's default Code Mode the tools are called as `tools.novada.<tool>(...)`.

## Links

- [Novada MCP](https://github.com/NovadaLabs/Novada-mcp)
- [Novada](https://www.novada.com)
- [OpenCode plugin docs](https://opencode.ai/docs/plugins)

## License

MIT
