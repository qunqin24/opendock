# <img src="https://user-images.githubusercontent.com/307597/154772945-1b7dba5f-21cf-41d0-bb2e-65b6eff4aaaf.png" width="30" height="30"/> opencode-serpapi

An [OpenCode plugin](https://opencode.ai/docs/plugins) that connects your agent to SerpApi's hosted MCP server for Google, Amazon, Walmart, eBay, YouTube, Google Maps, Google Scholar, and [100+ other engines](https://serpapi.com/search-engine-apis).

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Quick Start

### 1. Get an API key

Sign up at [serpapi.com](https://serpapi.com/users/sign_up?plan=free) and set the key:

> **Free tier** – 250 searches/month, no credit card required.

```bash
export SERPAPI_API_KEY="your_serpapi_key"
```

### 2. Install the plugin

Add the npm package name to the `plugin` list in `opencode.json`. OpenCode
automatically installs npm plugins at startup:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-serpapi"]
}
```

Restart OpenCode (or start a new session). OpenCode downloads the published
package and the plugin registers SerpApi as a remote MCP server automatically.

### 3. Use it

Ask in natural language and the agent picks the tool and engine on its own:

> *Search Google for the best Python web frameworks*
>
> *Compare prices for AirPods Pro on Amazon, Walmart, and eBay*
>
> *Find academic papers about transformer architectures published after 2020*
>
> *Find well-reviewed coffee shops near Times Square*

## How it works

This is an **OpenCode MCP integration with a native HTTPS fallback**. The plugin:

1. Registers the hosted SerpApi MCP server at `https://mcp.serpapi.com/mcp`.
2. Reads `SERPAPI_API_KEY` from the OpenCode process and resolves it into the
  MCP `Authorization: Bearer ...` header.
3. Exposes a native `serpapi_search` tool that calls
  `https://serpapi.com/search.json` with the runtime's built-in `fetch`.
4. Registers the bundled `serpapi-web-search` skill for engine selection,
  routing, credential safety, and response guidance.

The MCP server is the preferred route. When its tools are unavailable or the
server is disabled, the native tool remains available as the direct HTTPS route.
An existing user-defined `mcp.serpapi` configuration is preserved.

## Features

- **MCP-native search** — OpenCode receives the `search` tool from the `serpapi` MCP server.
- **All SerpApi engines** — the MCP server supports Google, Bing, Amazon, Walmart, eBay, YouTube, Google Maps, Google Scholar, and other engines.
- **MCP header authentication** — the key is read from `SERPAPI_API_KEY` and sent in the MCP `Authorization` header, not embedded in the MCP URL or source code.
- **Structured results** — the MCP server supports JSON, compact responses, Markdown output, and engine-specific parameter validation.
- **Local search guidance** — the bundled skill helps the model choose engines and use engine-specific parameters without owning credentials or making API requests.
- **Portable fallback** — `serpapi_search` uses the runtime's built-in `fetch`, with no CLI, shell, or cURL dependency.
- **Engine-aware queries** — the native tool maps its generic `q` argument to engine-specific fields such as Amazon's `k`, Walmart's `query`, eBay's `_nkw`, and YouTube's `search_query`.

## Supported Engines

| Category | Engines |
|----------|---------|
| Web Search | Google, Google Light, Bing, DuckDuckGo, Yahoo, Yandex, Baidu, Naver |
| AI Search | Google AI Mode, Google AI Overview, Bing Copilot, Brave AI Mode |
| Shopping | Amazon, Walmart, eBay, Google Shopping, Home Depot |
| Local / Maps | Google Maps, Google Local, Yelp, TripAdvisor, OpenTable |
| Research | Google Scholar, Google Patents, Google Trends |
| News | Google News |
| Media | Google Images, Google Videos, YouTube, Google Lens |
| Travel | Google Flights, Google Hotels, Google Travel Explore |
| Jobs | Google Jobs |
| Finance | Google Finance |
| Apps | Google Play, Apple App Store |

Engines not listed in the plugin's query-field map still pass through with `q`.
See the full, current list at [serpapi.com/search-engine-apis](https://serpapi.com/search-engine-apis). Detailed engine, MCP, CLI, REST, credential, and response guidance is bundled under `skills/serpapi-web-search/references/`.

## Troubleshooting

- **"Tool not showing up"** — confirm `opencode-serpapi` is listed under `plugin` in `opencode.json`, confirm `SERPAPI_API_KEY` is available to OpenCode, and restart OpenCode.
- **"Invalid API key"** — replace `SERPAPI_API_KEY` with the current key from the [SerpApi dashboard](https://serpapi.com/manage-api-key), then restart OpenCode so the MCP header is rebuilt.
- **MCP connection problems** — run `opencode mcp list`; the `serpapi` entry should report `connected`.
- **Native request failure** — the tool returns `SerpApi search failed: ...` with the configured key redacted.

If MCP is unavailable, ask the agent to use `serpapi_search`. Confirm that
`SERPAPI_API_KEY` is available to the OpenCode process.

## Development

```bash
npm install
npm test
npm run typecheck
```

The test suite mocks `fetch` and covers request parameter mapping, trusted-key
enforcement, HTTP failures, missing credentials, and resolved MCP header
configuration. The plugin configures the `serpapi` MCP server, whose primary
tool is `search`, and also exposes `serpapi_search` as a native HTTPS route.
The bundled skill provides routing and operational guidance; `engines.ts`
supplies query-field mapping for native requests.

## Related

- [SerpApi MCP Server](https://github.com/serpapi/serpapi-mcp) — for Claude Desktop, VS Code, and Cursor
- [SerpApi Docs](https://serpapi.com/search-api) — full API reference
- [SerpApi Playground](https://serpapi.com/playground) — interactive API explorer
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## License

MIT License — see [LICENSE](LICENSE) file for details.
