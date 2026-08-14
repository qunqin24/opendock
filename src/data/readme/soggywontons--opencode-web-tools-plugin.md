# opencode-web-tools-plugin

OpenCode plugin providing:

- `web_search` via [SearXNG](https://docs.searxng.org/)
- `web_extract` via [Crawl4AI](https://github.com/unclecode/crawl4ai)

## Prerequisites

- A running [SearXNG](https://docs.searxng.org/admin/install.html) instance with `format=json` enabled. Newer deployments may require an auth token.
- A running [Crawl4AI](https://github.com/unclecode/crawl4ai) instance (v0.9+), which requires a `Bearer` auth token.
- Node.js 18+.

## OpenCode config

```json
{
  "plugin": [
    [
      "@soggywontons/opencode-web-tools-plugin@^0.1.0",
      {
        "searxng": {
          "url": "http://localhost:8877",
          "token": "1234678"
        },
        "crawl4ai": {
          "url": "http://localhost:11235",
          "token": "12345678"
        }
      }
    ]
  ]
}
```

## Supported environment variables

- `SEARXNG_URL`
- `SEARXNG_TOKEN`
- `CRAWL4AI_URL`
- `CRAWL4AI_TOKEN`

Resolution order:

1. Plugin config in `opencode.json`
2. Environment variable
