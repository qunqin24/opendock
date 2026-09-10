# opencode-firecrawl-ng

OpenCode plugin that provides tool calls for Firecrawl.

Currently, only `firecrawl-search` is implemented.

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
