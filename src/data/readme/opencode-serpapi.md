# <img src="https://user-images.githubusercontent.com/307597/154772945-1b7dba5f-21cf-41d0-bb2e-65b6eff4aaaf.png" width="30" height="30"/> opencode-serpapi

An [OpenCode plugin](https://opencode.ai/docs/plugins) for SerpApi search across Google, Amazon, Walmart, eBay, YouTube, Google Maps, Google Scholar, and [100+ other engines](https://serpapi.com/search-engine-apis). OpenCode 2 also registers SerpApi's hosted MCP server and native web-search provider.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Quick Start

### 1. Get an API key

Sign up at [serpapi.com](https://serpapi.com/users/sign_up?plan=free) and set the key:

> **Free tier** – 250 searches/month, no credit card required.

```bash
export SERPAPI_API_KEY="your_serpapi_key"
```

### 2. Install the plugin

Use the configuration key for your OpenCode version. OpenCode automatically
installs npm plugins at startup.

#### OpenCode 2

Add the package to `plugins` in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-serpapi"]
}
```

#### OpenCode 1.18.29 and later

Add the package to `plugin` in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-serpapi"]
}
```

Restart OpenCode (or start a new session). The package supports both plugin
interfaces from one entrypoint: V1 uses `server()`, while V2 uses `setup()`.

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

The plugin's integrations depend on the OpenCode version:

- **OpenCode 2** registers the hosted SerpApi MCP server at
  `https://mcp.serpapi.com/mcp`, using `SERPAPI_API_KEY` as its bearer header
  when available. It also registers SerpApi as a native web-search provider
  without changing OpenCode's provider selection, plus a direct HTTPS tool named
  `serpapi_rest_search`. Existing user-defined MCP configuration is preserved.
- **OpenCode 1** registers the direct HTTPS tool as `serpapi_search` and adds
  the bundled skill path. It does not automatically register the hosted MCP
  server or a native web-search provider.

Both direct tools call `https://serpapi.com/search.json` with the runtime's
built-in `fetch` and read `SERPAPI_API_KEY` from the OpenCode process. The
bundled `serpapi-web-search` skill provides engine selection, credential
safety, and response guidance.

## Features

- **MCP-native search (OpenCode 2)** — OpenCode receives the `search` tool from the `serpapi` MCP server.
- **OpenCode 2 web search provider** — SerpApi results are available through OpenCode's native web-search API.
- **All SerpApi engines** — the MCP server supports Google, Bing, Amazon, Walmart, eBay, YouTube, Google Maps, Google Scholar, and other engines.
- **MCP header authentication (OpenCode 2)** — the key is read from `SERPAPI_API_KEY` and sent in the MCP `Authorization` header, not embedded in the MCP URL or source code.
- **Structured results** — the MCP server supports JSON, compact responses, Markdown output, and engine-specific parameter validation.
- **Local search guidance** — the bundled skill helps the model choose engines and use engine-specific parameters without owning credentials or making API requests.
- **Direct HTTPS search** — `serpapi_search` on OpenCode 1 and `serpapi_rest_search` on OpenCode 2 use built-in `fetch`, with no CLI, shell, or cURL dependency.
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

- **"Tool not showing up"** — confirm `opencode-serpapi` is listed under `plugins` on OpenCode 2 or `plugin` on OpenCode 1, confirm `SERPAPI_API_KEY` is available to OpenCode, and restart OpenCode.
- **"Invalid API key"** — replace `SERPAPI_API_KEY` with the current key from the [SerpApi dashboard](https://serpapi.com/manage-api-key). On OpenCode 2, restart OpenCode so the MCP header is rebuilt.
- **MCP connection problems (OpenCode 2)** — run `opencode mcp list`; the `serpapi` entry should report `connected`. OpenCode 1 does not auto-register this MCP server.
- **Search request failure** — direct tools return `SerpApi search failed: ...`; the V2 provider reports `SerpApi web search failed: ...`. Both redact the configured key.

For direct HTTPS fallback, use `serpapi_rest_search` on OpenCode 2 or
`serpapi_search` on OpenCode 1. On OpenCode 2, the MCP `search` tool and direct
REST fallback have distinct names. Confirm that `SERPAPI_API_KEY` is available
to the OpenCode process.

## Development

```bash
npm install
npm test
npm run typecheck
```

The test suite mocks `fetch` and covers request parameter mapping, trusted-key
enforcement, HTTP failures, missing credentials, redaction of web-search
provider errors, and V2 MCP/provider registration. OpenCode 1 exposes
`serpapi_search`; OpenCode 2 exposes the MCP `search` tool and the separately
named `serpapi_rest_search` fallback. The bundled skill provides routing and
operational guidance; `engines.ts` supplies query-field mapping for direct
requests.

## Related

- [SerpApi MCP Server](https://github.com/serpapi/serpapi-mcp) — for Claude Desktop, VS Code, and Cursor
- [SerpApi Docs](https://serpapi.com/search-api) — full API reference
- [SerpApi Playground](https://serpapi.com/playground) — interactive API explorer
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins)

## License

MIT License — see [LICENSE](LICENSE) file for details.
