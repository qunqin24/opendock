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
- `search1api_ask` — automatic source routing and relevance ranking (5 credits)
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


## Current API capabilities

Search supports `bingcn`, `yandex`, and `grokipedia`; `sogou` is removed.
Search and news support `day`, `week`, `month`, and `year`. Search accepts
`page` on engines with native pagination.

The default Ask tool accepts only a natural-language `query`. The server
chooses engines and a time window and returns `query`, `intent`, ranked
`results`, and `errors`. Ask results include `source` and `relevance`; this
endpoint returns search results rather than a generated answer. Each call
costs **5 credits**. Use ordinary search when the engine and keywords are known.

Engine-specific search/news attributes stay inside optional per-result
`metadata`: GitHub uses `kind`, `stars`, `language`, and `num_comments`;
Hacker News news results use `story_url`, `points`, and `num_comments`.
`published_date` stays optional at the result top level. Zero counts are
preserved and unavailable fields are omitted. Credit Grokipedia results as
"Powered by xAI".

`search1api_ask` is registered by default. Authenticated requests use
`search1api-cli>=2.0`; existing shared OAuth sessions and API keys still work.
