# opencode-firecrawl-ng

OpenCode plugin that provides tool calls for Firecrawl.

Currently, [`firecrawl-search`](https://www.firecrawl.dev/search), [`firecrawl-developer`](https://www.firecrawl.dev/developer-index), and [`firecrawl-scrape`](https://www.firecrawl.dev/scrape) are implemented.

> [!Note]
> LLM disclaimer: Most of the code was generated with large language models.

## Installation

Install Firecrawl CLI:

```bash
npm install -g firecrawl-cli
```

Authenticate with your browser or API key:

```bash
firecrawl login
```

Finally, add the following to your ~/.config/opencode/opencode.json file:

```json
{
  "plugin": ["opencode-firecrawl-ng"]
}
```
