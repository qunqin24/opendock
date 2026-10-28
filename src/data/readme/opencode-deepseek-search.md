# opencode-deepseek-search

DeepSeek [Search & Fetch](https://api-docs.deepseek.com/guides/search/) for **OpenCode V2**.

It registers three things:

- a **websearch provider** (`deepseek`) that backs the built-in `websearch` tool and becomes the default provider;
- **`deepseek_search`** — the same search with `ori_question`, per-call `count`, `need_content` and `localization`;
- **`deepseek_fetch`** — turns a URL into Markdown through the Fetch API, so the model reads a real page instead of scraping HTML.

No MCP server, no browser, no runtime dependencies.

## Requirements

- **OpenCode 2.x** (the `plugins` config field and `ctx.websearch`). OpenCode 1.x uses the legacy plugin loader and will not load this package.
- Node.js 22.14+ at runtime (OpenCode already provides it).
- A DeepSeek API key, or DeepSeek connected in OpenCode.

## Install

```sh
opencode plugin add opencode-deepseek-search
```

Or add it to `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-deepseek-search"],
}
```

Pin a version when you want reproducible setups:

```jsonc
{ "plugins": ["opencode-deepseek-search@0.1.0"] }
```

## Configure

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-deepseek-search",
      "options": {
        "count": 8,
        "needContent": false,
        "localization": "5.18.0.1",
      },
    },
  ],
}
```

| Option | Default | Description |
| --- | --- | --- |
| `count` | `8` | Results per search, clamped to 1-50. Callers can still override per call in `deepseek_search`. |
| `needContent` | `false` | Send `need_content: true` and hand full page content to the model instead of the 600-800 character summary. |
| `maxContentChars` | `4000` | Truncate each result's text before it reaches the model. |
| `maxFetchChars` | `30000` | Truncate Markdown returned by `deepseek_fetch`. |
| `localization` | — | IP address DeepSeek uses to localize results. |
| `apiKey` | — | Key override. Takes precedence over the env var and the stored credential. |
| `baseUrl` | `https://api.deepseek.com` | API origin override, for proxies and tests. |

### API key resolution

1. the `apiKey` plugin option;
2. `DEEPSEEK_API_KEY`;
3. the active credential OpenCode stores for the `deepseek` integration (`/connect` or `opencode auth login`).

No key is needed when DeepSeek is already connected in OpenCode.

## Tools

### `deepseek_search`

| Input | Type | Notes |
| --- | --- | --- |
| `query` | string, required | 1-128 characters. Keywords, not a request. Operators pass through. |
| `ori_question` | string | The user's original question, 1-128 characters. Improves intent understanding. |
| `count` | integer | 1-50, overrides the plugin option for this call. |
| `need_content` | boolean | Full page content instead of summary, for this call. |
| `localization` | string | IP address for this call. |

DeepSeek query operators work unchanged:

```text
site:docs.python.org asyncio task group
opencode plugin -site:npmjs.com -site:reddit.com
"DeepSeek V4.1 Flash" after:2026-10-15 lang:en
PostgreSQL site:github.com OR site:huggingface.co
```

### `deepseek_fetch`

| Input | Type | Notes |
| --- | --- | --- |
| `url` | string, required | Absolute http(s) URL, at most 8192 characters. |
| `max_chars` | integer | Truncate the returned Markdown, 500-200000 characters. |

Returns the page title and body as Markdown. DeepSeek escapes ASCII punctuation in Fetch output (`\#`, `\|`, `\.`); the plugin removes those escapes before the model sees the text.

## Pin the provider

The plugin selects itself as the default provider. To make that explicit, or to keep it stable when other providers are installed:

```jsonc
{ "websearch": { "provider": "deepseek" } }
```

## Permissions

`deepseek_search` declares the `websearch` permission action, and `deepseek_fetch` declares `webfetch`, so the standard OpenCode rules apply to both:

```jsonc
{
  "permissions": [
    { "action": "websearch", "resource": "*", "effect": "ask" },
    { "action": "webfetch", "resource": "*", "effect": "ask" },
  ],
}
```

## Behavior and limits

- **Billing**: `$0.75` per 1000 successful Search requests and the same per 1000 Fetch requests. `count` does not change the price, only the context cost. Failed requests, empty result sets and timeouts are not billed.
- **Rate limits**: 100 QPS for Search, 25 QPS for Fetch, per account.
- Search and Fetch share one key and one API origin; the Fetch API is subject to per-domain limits as well.
- Dates from DeepSeek have day precision and are expressed in Beijing time (midnight UTC+8), so a `published` value can look shifted by one day next to a western source.
- The plugin does not retry on its own: 429 and 5xx surface as readable errors, so the caller decides whether to retry.
- `need_content: true` can return tens of thousands of characters for ten results. Prefer the summary and `deepseek_fetch` for the two or three pages that matter.

## Differences from similar packages

`opencode-websearch-deepseek` also exposes DeepSeek through the V2 plugin API and adds automatic fetch enrichment for the top N results. This package instead focuses on:

- `ori_question` support (absent there),
- two separate tools with per-call `count`, `need_content` and `localization`,
- a pure, dependency-free core with unit tests and no build step.

## Development

```sh
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test (native TS type stripping)
```

Source layout:

- `src/deepseek.ts` — request building, result mapping, errors, Fetch unescaping. No OpenCode imports.
- `src/index.ts` — plugin definition: provider, tools, key resolution.

## License

MIT © Ivan Kiselev
