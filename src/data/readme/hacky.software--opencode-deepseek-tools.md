# opencode-deepseek-tools

DeepSeek's Search and Fetch APIs, wired into OpenCode.

The plugin gives you two tools, `deepseek_search` and `deepseek_fetch`, and registers DeepSeek as a websearch provider. Once it is loaded, OpenCode's normal `websearch` tool uses DeepSeek's index instead of asking for an Exa, Tavily, or Firecrawl key.

It reads the DeepSeek key you already connected in OpenCode. Nothing gets copied into your config.

Requires OpenCode V2 (the plugin is built against `@opencode/plugin` 2.0.24).

## What it adds

`deepseek_search` sends a query to DeepSeek's in-house search engine and returns ranked results: title, URL, site, publication date, relevance score, authority tier, a short snippet, and a longer summary written for a model to read. You can ask for page content too, but it is usually better to leave that off and fetch the pages you care about.

`deepseek_fetch` takes one URL and returns the page as Markdown. DeepSeek rejects pages blocked by site policy, pages without extractable content, and anything that is not HTTP or HTTPS.

The websearch provider is selected as the default when a key is available. If you would rather keep another provider as the default, set `websearchDefault` to `false` and DeepSeek will still be in the provider list when you want it.

## Install

The package is `@hacky.software/opencode-deepseek-tools` on npm. Add it to `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugins": [
    {
      "package": "@hacky.software/opencode-deepseek-tools",
      "options": {
        "websearchDefault": true
      }
    }
  ]
}
```

Or run `opencode plugin add @hacky.software/opencode-deepseek-tools` and add the options by hand.

If you are working from a checkout, point `package` at the directory instead. Then reload the location or restart OpenCode. If DeepSeek is connected in OpenCode, that is the only setup step.

If you would rather use an environment variable, set `DEEPSEEK_API_KEY` before OpenCode starts. The plugin checks these sources, in order:

1. `apiKey` in the plugin options, either a literal key or `{env:NAME}`.
2. The variable named by `apiKeyEnv` (default `DEEPSEEK_API_KEY`), then `DEEPSEEK_API_KEY`.
3. The active credential for OpenCode's `deepseek` integration.

The integration credential is read again for every request, so reconnecting DeepSeek with a new key takes effect without a restart. A malformed `{env:...}` value is ignored rather than sent as a bearer token.

The log lives at `~/.local/share/opencode/log/deepseek-tools.log` and is created with mode `0600`. A healthy load looks like this:

```text
options: baseURL=https://api.deepseek.com · key=OpenCode credential "deepseek" · ...
registered tools: deepseek_search, deepseek_fetch
registered websearch provider "deepseek"
selected "deepseek" as the default websearch provider
```

## Using the tools

The tools are registered in a `deepseek` namespace with Code Mode enabled, so you call them through `execute`:

```js
const results = await tools.deepseek.search({
  query: "bun 1.4 release site:bun.sh",
  count: 5,
})

const page = await tools.deepseek.fetch({ url: results[0].url })
```

Queries are passed through with their operators intact: `site:`, `-site:`, `-term`, `-"exact phrase"`, `"exact phrase"`, `lang:zh,en`, `after:2025-01-01`, and `before:2026-06-01`. Outer whitespace is trimmed.

The regular `websearch` tool accepts the same operators. It does not expose `count` or `need_content`; those are set with plugin options.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `apiKey` | none | Literal key or `{env:NAME}`. |
| `apiKeyEnv` | `DEEPSEEK_API_KEY` | Environment variable to read the key from. |
| `baseURL` | `https://api.deepseek.com` | API base URL. HTTPS is required except for loopback proxies. |
| `timeoutMs` | `30000` | Timeout for one request, including reading the response body. |
| `maxRetries` | `2` | Retries for 408, 429, 5xx, and network failures. |
| `searchCount` | `10` | Default result count for `deepseek_search`. |
| `searchNeedContent` | `false` | Default for `need_content`. |
| `maxContentChars` | `20000` | Per-result cap when content is included. |
| `maxSummaryChars` | `4000` | Per-result cap for summaries and snippets. |
| `maxFetchChars` | `50000` | Cap for one fetched page. |
| `maxOutputChars` | `120000` | Total cap for a search tool result. |
| `websearchDefault` | `true` | Make DeepSeek the default websearch provider. |
| `websearchCount` | `10` | Result count for the built-in websearch tool. |
| `websearchNeedContent` | `false` | Prefer page content over the summary in websearch results. |

## How it behaves

Requests go to `POST /v1/tools/search` and `POST /v1/tools/fetch` with a bearer token. A 408, 429, or 5xx response is retried with exponential backoff, and `Retry-After` is honoured up to 30 seconds. Other 4xx errors are returned as-is, since retrying them would just produce the same answer.

The timeout covers the whole attempt: connecting, waiting for headers, and reading the body. A server that sends headers and then stalls cannot hang a tool call forever.

Errors carry enough context to act on: 401 means the key is wrong, 402 means the account is out of balance, 403 means DeepSeek's security policy rejected the fetch, 404 means the page had no usable content, and 429 means you hit the rate limit. A malformed 200 response is reported as an invalid response instead of being shown as “no results”.

Aborting a session aborts the in-flight request. Cancellation is propagated as a cancelled tool call instead of a successful result.

Search results and fetched pages are untrusted web content. The output says so, and the tool descriptions tell the model not to follow instructions found inside them.

Logs contain a short query preview and URLs with the query string removed. Full queries, signed URL parameters, headers, and bodies are not logged.

## Permissions

The tools are registered with the `websearch` and `webfetch` permission actions. In OpenCode 2.0.24, `options.permission` is only used to hide a tool under a blanket `deny` rule; plugins cannot call `permission.assert`, so `ask` and per-resource rules are not evaluated by these tools. If you need a hard boundary, deny `execute` or these tools wholesale.

## Billing

DeepSeek bills per successful request: $0.75 per 1,000 searches and $0.75 per 1,000 fetches. Failed requests, empty searches, and timeouts are free. Both APIs allow 5 requests per second per account, independently of each other.

## Releasing

Pushing a `v*` tag, or running the workflow manually, publishes through `.github/workflows/publish.yml`.

The first release was published interactively with `npm login --auth-type=web` and the package is now linked to this repository's `publish.yml` through an npm trusted publisher. Later tag releases authenticate via GitHub OIDC with no token.

To bootstrap another new package, either publish it once interactively or add a granular access token as the `NPM_TOKEN` secret. The workflow uses that secret when it is present; delete it after configuring the trusted publisher. The workflow checks that the tag matches `package.json` and skips versions that are already on the registry.

## Development

```sh
bun install
bun test
bun run typecheck
```

The tests use a fake `fetch`, so they do not need an API key or network access.

## License

MIT
