# opencode-websearch-localllm

A **self-contained** web search plugin for OpenCode. It searches
[DuckDuckGo](https://duckduckgo.com) itself, fetches the result pages, and
returns a **simplified Markdown version** of each page — **not a summary**.

Because no remote LLM endpoint is involved, it works with **any model opencode
has loaded**, including local ones (llama.cpp, Ollama, vLLM, LM Studio, …).
You don't need a DeepSeek, Anthropic, OpenAI, or cloud search API key.

It exposes two tools via the OpenCode **v1 plugin API** — **no MCP server
required**:

| Tool             | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `web-search`     | Search DuckDuckGo and return simplified Markdown of the top hits. |
| `web-simplify`   | Fetch one URL and return a simplified Markdown version of the page. |

- Searches [DuckDuckGo](https://duckduckgo.com) (no API key).
- Fetches pages and returns a simplified, readable Markdown version — full
  substance, **not a summary**.
- SSRF-safe: blocks private, loopback, link-local, and cloud-metadata targets,
  validates every redirect hop, caps page size and timeouts.
- No JavaScript is executed — pages are parsed as static text.
- Configurable result count, content length, page size, timeout, redirects.

## Why two tools?

OpenCode ships a built-in `webfetch` tool, but it returns the page as raw
markdown/text/html — not a simplified version. This plugin's tools return the
page's **actual readable substance** with only boilerplate (scripts, styles,
nav, forms, images) stripped.

- Use `web-search` to discover URLs for a query.
- Use `web-simplify` when you already have a URL and want its content.

> **Simplified, not summarized.** The plugin does not write an answer for you.
> It hands the model the page's own readable text so any model — including a
> small local one — can reason over the real content with very minimal
> information loss.

## Requirements

- **OpenCode 1.x** with the v1 plugin API (`@opencode-ai/plugin`).
- Node.js 22.14+ (OpenCode's runtime already provides `fetch`).

## Install from npm

Add the published package to the `plugin` array in your OpenCode config —
opencode installs it from the npm registry automatically (its dependencies,
`cheerio` and `turndown`, are pulled in with it):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-websearch-localllm", { "maxResults": 5, "maxContent": 8000 }]
  ]
}
```

Start a fresh OpenCode session so it installs the package and loads the plugin.

## Install from source

Build the plugin, then drop the single compiled file into the **global plugin
directory** so it loads across all your projects.

```sh
# 1. Build
npm install
npm run build            # produces dist/index.js

# 2. Create the global plugin directory (if missing)
mkdir -p ~/.config/opencode/plugins

# 3. Copy the compiled plugin in
cp dist/index.js ~/.config/opencode/plugins/websearch.js
```

The plugin imports `cheerio` and `turndown`. Make sure they are declared in
your config directory's `package.json` so opencode can resolve them (it runs
`bun install` against that file):

```jsonc
// ~/.config/opencode/package.json
{
  "dependencies": {
    "@opencode-ai/plugin": "1.18.4",
    "cheerio": "^1.0.0",
    "turndown": "^7.2.0"
  }
}
```

Then restart OpenCode (start a fresh session, or exit and reopen the TUI) so it
picks up the new plugin file.

> **Note on the tool name.** The built-in `websearch` tool is provider-gated
> (it needs a cloud exa/parallel provider) and a plugin tool named `websearch`
> does not override it. This plugin therefore registers its search tool under
> the distinct name `web-search` so it is reliably exposed to any model,
> including llama.cpp-only setups.

## Configure

Options are passed via the plugin entry in the `plugin` array
(`["opencode-websearch-localllm", { ... }]`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-websearch-localllm", { "maxResults": 5, "maxContent": 8000 }]
  ]
}
```

| Option         | Default                    | Description                                    |
| -------------- | -------------------------- | ---------------------------------------------- |
| `maxResults`   | `5`                        | Max search results returned per query.         |
| `maxContent`   | `8000`                     | Max simplified characters returned per page.   |
| `maxBytes`     | `2000000`                  | Max HTML bytes fetched per page.               |
| `timeoutMs`    | `15000`                    | Per-request timeout in milliseconds.           |
| `maxRedirects` | `5`                        | Max redirects followed per page.               |
| `userAgent`    | desktop Chrome             | User agent sent when fetching pages.           |
| `fetchPages`   | `true`                     | Fetch + simplify pages. When `false`, snippets only. |

## How it works

1. The model calls `web-search` (to search) or `web-simplify` (to fetch a URL).
2. For search, the plugin queries DuckDuckGo for the top `maxResults` hits.
3. For each page it fetches the HTML (SSRF-checked, size/timeout-capped) and
   simplifies it to Markdown: the main content with scripts, styles, nav,
   headers, footers, forms, and images stripped.
4. The plugin returns those simplified pages — the model reads the actual
   content, not a pre-written summary.

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit
npm run build       # emits dist/
npm test            # builds, then runs node --test
```

The plugin is a thin wrapper: pure helpers (`pickPositiveInt`,
`normalizeOptions`, `isPrivateAddress`, `decodeDuckDuckGoUrl`, `parseResults`,
`simplifyHtml`, `fetchAndSimplify`, `simplifyUrl`, `search`, `toContent`) are
exported and covered by unit tests with a mocked `fetch`.

## License

[MIT](./LICENSE) © xeaf
