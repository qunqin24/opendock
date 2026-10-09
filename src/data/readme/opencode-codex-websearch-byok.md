# Codex Web Search BYOK for OpenCode 2

Use a Responses-compatible endpoint for OpenCode 2's `websearch` tool. The plugin calls the endpoint's `web_search` tool and returns source links with a search summary. You can use a different provider for your OpenCode conversation model.

Tool registration and execution were tested with OpenCode `v2.0.10` on 2026-09-28. Local configuration and plugin controls were checked with `v2.0.22` on 2026-10-09. The plugin registers `websearch` through `ctx.tool.transform(...editor.add(...))`. Check tool registration, input schema, execution, and permissions when upgrading OpenCode.

[中文说明](./README.zh-CN.md)

## Search options

- Search with `query`, or use `queries` for up to four searches. Simultaneous tool calls share a limit of two remote requests per plugin instance.
- Limit domains with `allowedDomains` or `blockedDomains`.
- Set `recencyDays`, `maxResults`, and `searchContextSize`.
- Set a timeout for each request attempt. The default is 600 seconds.
- Temporary failures are retried internally twice, after 5 and 10 seconds. The agent receives the successful result or the final error after retries finish.

`recencyDays` asks the remote model to prefer recent sources. `maxResults` limits the number of links shown for each query.

## Requirements

- OpenCode 2
- A Responses-compatible `/v1/responses` endpoint whose model supports `web_search` and returns source URLs
- The endpoint URL, API key, and model name

## Install

Add the package to your global OpenCode configuration after it is published:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-codex-websearch-byok@<VERSION>"]
}
```

For local development, place the package directory under `~/.config/opencode/plugins/`, or add its path to `plugins`. See [OpenCode plugin loading](https://opencode.ai/v2/docs/plugins).

Remove an earlier `research-websearch` installation before adding this package; both register `websearch`.

Point the plugin to a local JSON file outside your repository:

```json
{
  "plugins": [
    {
      "package": "opencode-codex-websearch-byok@<VERSION>",
      "options": { "configFile": "/path/to/search-config.json" }
    }
  ]
}
```

The local file contains:

```json
{
  "responsesUrl": "https://your-gateway.example/v1/responses",
  "apiKey": "YOUR_KEY",
  "model": "YOUR_SEARCH_MODEL",
  "timeoutSeconds": 600,
  "maxConcurrency": 2,
  "maxRetries": 2,
  "retryDelaySeconds": 5
}
```

`timeoutSeconds` accepts an integer from 1 to 3600 and defaults to 600. Each attempt starts its own timer when the remote request begins. Queueing and retry delays are outside that timer, so a tool call can take longer than 600 seconds. The older `timeoutMs` setting also works (1–3,600,000 milliseconds); `timeoutSeconds` takes precedence when both are set in the same file.

`maxConcurrency` accepts 1–8 and defaults to 2. All calls using the same plugin instance share this limit. A retry releases its slot while waiting.

`maxRetries` accepts 0–5 and defaults to 2, for three attempts per query. `retryDelaySeconds` accepts 1–300 and defaults to 5; the delay doubles after each failure. HTTP 408, 429, 500, 502, 503, and 504, temporary stream errors, network failures, and request timeouts are retried. An HTTP `Retry-After` header can extend the delay to at most 600 seconds. Authentication errors, invalid input, and cancellation stop immediately. Successful queries are retained while other queries retry. If a query still fails, the tool returns a final error with the available remote code and message.

You can also set the URL, model, and key in the environment of the OpenCode process:

```text
OC2_CODEX_RESPONSES_URL=https://your-gateway.example/v1/responses
OC2_CODEX_RESPONSES_MODEL=your-search-model
OC2_CODEX_RESPONSES_API_KEY=your-secret-key
```

An explicit `configFile` takes precedence over these environment variables. `apiKeyEnv` selects a key from a named environment variable. Local installs also recognize the earlier `research-websearch.json` file and `OC2_RESEARCH_WEBSEARCH_*` variables.

If your OpenCode configuration restricts web search, allow the `websearch` action:

```json
{
  "permissions": [
    { "action": "websearch", "resource": "*", "effect": "allow" }
  ]
}
```

Restart OpenCode and run a search. The result should include source URLs.

## Development

```sh
npm test
npm pack --dry-run --json
```
