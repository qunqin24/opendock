# opencode-brightdata

OpenCode plugin for [Bright Data](https://brightdata.com) — gives your AI agent reliable web scraping, search, and structured data extraction from 40+ platforms via the [Bright Data CLI](https://github.com/nichochar/brightdata-cli).

**Free tier: 5,000 requests/month** across all commands - search, scrape, pipelines, and more. No credit card required.

## Installation

Add the plugin to your `opencode.json` (or global `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@brightdata/opencode-brightdata"]
}
```

Then install the Bright Data CLI:

```bash
# macOS / Linux
curl -fsSL https://cli.brightdata.com/install.sh | bash

# Or via npm (any platform)
npm install -g @brightdata/cli
```

## Authentication

On first use, the agent will prompt you to authenticate. You can also set up in advance:

```bash
# Browser login (recommended)
bdata login

# Or set an API key
export BRIGHTDATA_API_KEY=your-api-key
```

Get an API key at [brightdata.com](https://brightdata.com/cp).

If `BRIGHTDATA_API_KEY` is set in your environment, the plugin automatically passes it to shell commands.

## What it does

This plugin registers Bright Data skills with OpenCode. Once installed, the agent can:

- **Search** Google, Bing, and Yandex with structured JSON results
- **Scrape** any webpage to clean markdown, HTML, JSON, or screenshots — with automatic bot bypass and CAPTCHA solving
- **Pipelines** — extract structured data from 40+ platforms including Amazon, LinkedIn, Instagram, TikTok, YouTube, Reddit, and more
- **Build scrapers** — guided 6-phase workflow for creating production-ready scrapers
- **MCP integration** — 60+ tools for scraping, search, e-commerce, social media, and browser automation
- **Design mirroring** — replicate any website's visual design system
- **Best practices** — auto-loaded API reference when writing Bright Data code
- **Python SDK** — guidance for the `brightdata-sdk` package

All output is written to a `.brightdata/` directory to avoid flooding context.

## Links

- [Bright Data CLI Documentation](https://docs.brightdata.com/toolkits/brightdata-cli)
- [Bright Data CLI GitHub](https://github.com/nichochar/brightdata-cli)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## License

MIT
