# opencode-crawl4ai

OpenCode plugin that gives AI agents unrestricted web access via [crawl4ai](https://github.com/unclecode/crawl4ai).

Fetch URLs, search the web, extract structured data, take screenshots, deep crawl sites, and discover URLs — all from inside OpenCode.

## Features

- **Fetch** — Retrieve any URL as clean markdown or raw HTML, with stealth mode and JS execution
- **Search** — Web search via SearXNG (primary) or DuckDuckGo (fallback, no setup needed)
- **Extract** — Structured data extraction using CSS selectors
- **Screenshot** — Capture full-page screenshots as base64
- **Crawl** — Deep crawl websites with BFS/DFS strategies
- **Map** — Discover all URLs on a site

## Requirements

- [OpenCode](https://github.com/sst/opencode)
- Python 3.10+ with `uvx` (`pip install uv`)
- Docker (optional, for SearXNG faster search)

## Installation

```bash
bunx opencode-crawl4ai --install
```

Or with npx:

```bash
npx opencode-crawl4ai --install
```

Copies the plugin to `~/.config/opencode/plugins/`. Restart OpenCode to activate.

To install globally:

```bash
npm install -g opencode-crawl4ai
opencode-crawl4ai --install
```

### Optional: faster search with SearXNG

```bash
opencode-crawl4ai searxng          # starts SearXNG on port 8888
export SEARXNG_URL=http://localhost:8888
```

SearXNG aggregates Google, Bing, DuckDuckGo, and more. Without it, the plugin falls back to DuckDuckGo directly.

## CLI Commands

```
opencode-crawl4ai --install       Copy plugin to ~/.config/opencode/plugins/
opencode-crawl4ai --uninstall     Remove plugin
opencode-crawl4ai searxng [port]  Start SearXNG Docker container (default: 8888)
opencode-crawl4ai searxng-stop    Stop SearXNG container
opencode-crawl4ai --help          Show help
```

## Available Tools

Once installed, these tools are available to the AI in OpenCode:

### `crawl4ai_fetch`

Fetch a URL and return its content as markdown (default) or HTML.

```js
crawl4ai_fetch({ url: "https://docs.example.com" })
crawl4ai_fetch({ url: "https://example.com", format: "html" })
crawl4ai_fetch({ url: "https://spa.example.com", wait_for: ".content-loaded" })
crawl4ai_fetch({ url: "https://example.com", js_code: "document.querySelector('.show-more').click()" })
```

### `crawl4ai_search`

Search the web and return results with URL, title, and snippet.

```js
crawl4ai_search({ query: "React hooks tutorial" })
crawl4ai_search({ query: "Python asyncio", limit: 5 })
```

### `crawl4ai_extract`

Extract structured data from a URL using CSS selectors.

```js
crawl4ai_extract({
  url: "https://example.com/product",
  schema: { title: "h1.product-name", price: ".price" }
})
```

### `crawl4ai_screenshot`

Take a screenshot of a web page. Returns base64-encoded image data URL.

```js
crawl4ai_screenshot({ url: "https://example.com" })
crawl4ai_screenshot({ url: "https://example.com", width: 1920, height: 1080 })
```

### `crawl4ai_crawl`

Deep crawl a website starting from a URL, following links up to `max_pages` and `max_depth`.

```js
crawl4ai_crawl({ url: "https://docs.example.com", max_pages: 20 })
crawl4ai_crawl({ url: "https://example.com", strategy: "bfs", max_depth: 2 })
```

### `crawl4ai_map`

Discover all URLs on a website.

```js
crawl4ai_map({ url: "https://example.com" })
crawl4ai_map({ url: "https://example.com", search: "pricing" })
```

### `crawl4ai_version`

Get the installed crawl4ai version.

### `crawl4ai_debug`

Debug the plugin and bridge connection.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SEARXNG_URL` | URL of a SearXNG instance | Falls back to DuckDuckGo |

## How It Works

The plugin's TypeScript layer spawns a Python bridge (`uvx --with crawl4ai --with ddgs python bridge.py`) on each tool call. No persistent Python process is required.

## License

MIT
