# @heretek-ai/opencode-searxng

SearXNG web search provider + `searxng` tool for opencode v2. Self-hosted, no API key.

Registers:

- `websearch` provider `searxng` — works with the built-in `websearch` tool once selected.
- `searxng` tool — same backend with explicit per-call `categories`, `engines`, `language`, `time_range`, `safesearch`, `pageno`, `maxResults`.

Query strings are forwarded verbatim, so SearXNG syntax keeps working: `!wikipedia !images :de effect hooks`.

## Requirements

- opencode v2
- A reachable SearXNG instance with JSON enabled (`search.formats` must include `json` in `settings.yml`, otherwise `/search?format=json` returns 403).
- Self-host recommended. Public instances often disable `format=json`, rate-limit, or bot-block.

## Install

```bash
opencode plugin add @heretek-ai/opencode-searxng
```

Or in `opencode.json`:

```json
{
  "plugins": [
    {
      "package": "@heretek-ai/opencode-searxng",
      "options": {
        "baseUrl": "http://localhost:8888",
        "categories": "general",
        "language": "all",
        "safesearch": 1,
        "maxResults": 8
      }
    }
  ],
  "websearch": { "provider": "searxng" }
}
```

See `opencode.example.json` for all options.

## Configuration

| Option | Env | Default | Notes |
|---|---|---|---|
| `baseUrl` (required) | `SEARXNG_BASE_URL` | — | e.g. `http://localhost:8888`. Trailing slash trimmed. Must be http(s). |
| `categories` | `SEARXNG_CATEGORIES` | `general` | Default `categories` param. |
| `engines` | `SEARXNG_ENGINES` | unset | e.g. `wikipedia,duckduckgo`. Unset = server default. |
| `language` | `SEARXNG_LANGUAGE` | `all` | e.g. `en`, `de`. |
| `safesearch` | `SEARXNG_SAFESEARCH` | `1` | `0\|1\|2`. |
| `timeRange` | `SEARXNG_TIME_RANGE` | unset | `day\|week\|month\|year`. |
| `maxResults` | `SEARXNG_MAX_RESULTS` | `8` | Clamped 1–20. |
| `timeoutMs` | `SEARXNG_TIMEOUT_MS` | `25000` | Clamped 1000–120000. |
| `bearerToken` | `SEARXNG_BEARER_TOKEN` | unset | For reverse-proxy fronted instances (`Authorization: Bearer`). |

No default provider is forced. Opt in with `"websearch": { "provider": "searxng" }`.

## Usage

Standard tool (uses plugin defaults):

```
websearch(query="NixOS SearXNG settings.yml search.formats")
```

Structured tool (per-call overrides):

```
searxng(query="effect hooks", engines="wikipedia,duckduckgo", language="en", maxResults=5)
searxng(query="!images :de fennec fox", categories="images")
```

## SearXNG server notes

- `GET {base}/search?q=...&format=json` must return `{"results": [...]}`. Test with:
  ```bash
  curl "$SEARXNG_BASE_URL/search?q=test&format=json" | jq .results[0]
  ```
- `403` almost always means `json` not in `search.formats`.
- `429` means server limiter. `401` means proxy auth.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
npm publish --dry-run
```

Publish is via npm Trusted Publishing (see `.github/workflows/publish.yml`). First manual publish needs `npm publish --access public`.
