# Codex Web Search BYOK for OpenCode 2

Use a Responses-compatible endpoint for OpenCode 2's `websearch` tool. The plugin calls the endpoint's `web_search` tool and returns source links with a search summary. You can use a different provider for your OpenCode conversation model.

Tested with OpenCode `v2.0.10` on 2026-09-28. The plugin registers `websearch` through `ctx.tool.transform(...editor.add(...))`. Check tool registration, input schema, execution, and permissions when upgrading OpenCode.

[中文说明](./README.zh-CN.md)

## Search options

- Search with `query`, or use `queries` for up to four searches. Up to three requests run at once.
- Limit domains with `allowedDomains` or `blockedDomains`.
- Set `recencyDays`, `maxResults`, and `searchContextSize`.
- Set a timeout for each request. The default is 300 seconds.

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
  "timeoutSeconds": 300
}
```

`timeoutSeconds` accepts an integer from 1 to 3600 and defaults to 300. Each query has its own timer, including queries in later batches. The older `timeoutMs` setting also works (1–3,600,000 milliseconds); `timeoutSeconds` takes precedence when both are set in the same file.

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
