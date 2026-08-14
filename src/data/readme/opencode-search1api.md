# Search1API for OpenCode

Native OpenCode tools for live web search, news, page retrieval, sitemap discovery, and trending topics.

## Install

Install for the current project:

```bash
opencode plugin opencode-search1api
```

Or install globally:

```bash
opencode plugin opencode-search1api --global
```

## Authentication

Use one of these methods:

1. Set `SEARCH1API_KEY` in the OpenCode environment.
2. Install `search1api-cli` and run `s1 login` once; the plugin reuses the same OAuth session.
3. Configure the plugin with an `apiKey` option in `opencode.json`.

```json
{
  "plugin": [
    ["opencode-search1api", { "apiKey": "your-api-key" }]
  ]
}
```

Prefer an environment variable or secret manager over committing credentials to configuration files.

Get an API key at [search1api.com](https://www.search1api.com/).

## Tools

- `search1api_search` — search the live web
- `search1api_news` — search current news
- `search1api_crawl` — retrieve readable page content
- `search1api_sitemap` — discover site links
- `search1api_trending` — explore GitHub or Hacker News trends

## Development

```bash
npm install
npm test
```

## License

MIT
