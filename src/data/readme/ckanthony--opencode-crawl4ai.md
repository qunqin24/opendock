# @ckanthony/opencode-crawl4ai

OpenCode plugin for [Crawl4AI](https://crawl4ai.com) — gives your AI agent reliable web scraping, deep crawling, LLM-powered extraction, and structured data via the [Crawl4AI CLI](https://docs.crawl4ai.com/core/cli/).

## Installation

### 1. Install the OpenCode plugin

```bash
npm install -g @ckanthony/opencode-crawl4ai
```

Or add it to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@ckanthony/opencode-crawl4ai"]
}
```

Then install the Crawl4AI CLI globally:

```bash
pip install -U crawl4ai
# or
pipx install crawl4ai
```

After installation, run the browser setup once:

```bash
crwl --setup
```

## What it does

This plugin registers the Crawl4AI CLI skill with OpenCode. Once installed, the agent can:

- **Scrape** any webpage to clean markdown, HTML, or structured data
- **Deep crawl** entire websites recursively (BFS or DFS)
- **LLM Q&A** — ask questions about page content using AI
- **Structured extraction** — extract data matching a JSON schema via LLM
- **Content filtering** — filter pages by relevance, regex, or cosine similarity
- **Parallel crawling** — run multiple scrapes in parallel for speed

All output is written to a `.crawl4ai/` directory to avoid flooding context.

## Docker Server Mode (Optional)

If you prefer to run Crawl4AI as a server instead of using the CLI, you can start it via Docker:

```bash
docker pull unclecode/crawl4ai:latest
docker run -d -p 11235:11235 --shm-size=1g unclecode/crawl4ai:latest
```

Then configure the agent to use `http://localhost:11235` as the base URL. The skill covers both CLI and REST API usage.

## Links

- [Crawl4AI Documentation](https://docs.crawl4ai.com/)
- [Crawl4AI GitHub](https://github.com/unclecode/crawl4ai)
- [Crawl4AI CLI Docs](https://docs.crawl4ai.com/core/cli/)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## License

MIT