# opencode-firecrawl-web

Native [Firecrawl](https://firecrawl.dev) tools for [OpenCode 2](https://opencode.ai): web search with filters, rendered page scraping, and search over technical docs, GitHub issues, and pull requests.

The plugin adds three tools and nothing else: no skills, no system prompt text, and no shell commands. Results come back in the tool output, so nothing is written to your project.

## Install

```sh
opencode plugin add opencode-firecrawl-web
```

Or add it to `plugins` in `~/.config/opencode/opencode.json`. To keep one search tool, turn off OpenCode's built-in web search:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-firecrawl-web"],
  "websearch": false
}
```

Keep OpenCode's `webfetch` for plain page and API fetches; it costs no credits.

## Authentication

The plugin uses the first credential it finds:

1. OpenCode's Firecrawl connection: run `/connect`, pick Firecrawl, and paste an API key or sign in.
2. `FIRECRAWL_API_KEY` in the environment.
3. The Firecrawl CLI's login (`firecrawl login`).

`FIRECRAWL_API_URL`, or the CLI's stored API URL, points the tools at a self-hosted Firecrawl. It must use HTTPS, or plain HTTP on localhost. `dev_search` also works without a credential, at a lower rate limit.

## Tools

| Tool | What it does |
| --- | --- |
| `web_search` | Searches the web, news, or images. Filters: GitHub, research, or PDF categories, time range (`tbs`), included or excluded domains, location, and country. Returns 5 results per source by default, up to 20, and can extract a summary or markdown per result. |
| `web_scrape` | Reads a JavaScript-heavy or blocked page as markdown, a summary, links, an answer to a question, or highlights. Supports render waits, mobile emulation, and proxy modes. |
| `dev_search` | Searches the Firecrawl Developer Index of docs, GitHub issues, merged pull requests, and READMEs, and returns matched passages. Filters by artifact type, repository, docs domain, language, topic, license, and stars. |

Every call spends Firecrawl credits, except `dev_search` without a key. Results are marked as untrusted web content.

## Permissions

The tools use OpenCode's own permission actions: `web_search` and `dev_search` check `websearch`, matched on the query, and `web_scrape` checks `webfetch`, matched on the URL. Agents allowed to search or fetch the web, such as the built-in `explore` agent, get these tools too, and a rule that denies `websearch` or `webfetch` removes them.

```jsonc
{
  "permissions": [{ "action": "webfetch", "resource": "*", "effect": "ask" }]
}
```

## Development

```sh
mise install --locked
mise exec --locked -- bun install
mise exec --locked -- bun run validate      # typecheck and tests
mise exec --locked -- bun run pack:inspect  # files npm would publish
```

To try a local checkout, list its absolute path in `plugins`.

## License

MIT