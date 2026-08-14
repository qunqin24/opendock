# opencode-olostep

OpenCode plugin for [Olostep](https://olostep.com) — gives your AI agent
reliable web scraping, crawling, search, site mapping, and AI-grounded answers
via the [Olostep CLI](https://github.com/olostep/olostep-cli).

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-olostep"]
}
```

Then install the Olostep CLI globally:

```bash
npm install -g olostep-cli
```

## Authentication

The plugin reads your key from the `OLOSTEP_API_KEY` environment variable and
passes it to Olostep commands automatically. Get an API key at
[olostep.com](https://www.olostep.com/dashboard/api-keys) and set it:

```bash
export OLOSTEP_API_KEY="your-key"
```

## What it does

This plugin registers the Olostep CLI skill with OpenCode. Once installed, the
agent can:

- **Search** the web for ranked, relevant results
- **Scrape** any webpage to clean markdown, HTML, JSON, or text
- **Map** all URLs on a website
- **Crawl** entire websites recursively, with include/exclude filters
- **Answer** questions with AI-synthesized responses grounded in live sources
- **Batch** scrape up to ~10,000 URLs at once

Results can be written to an `.olostep/` directory to avoid flooding context.

## Links

- [Olostep documentation](https://docs.olostep.com)
- [Olostep CLI](https://github.com/olostep/olostep-cli)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## License

MIT
