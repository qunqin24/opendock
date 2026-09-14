# opencode-codex-websearch

An [OpenCode v2](https://opencode.ai/v2/docs) websearch provider backed by ChatGPT's Codex search endpoint. It uses the ChatGPT OAuth credentials already managed by OpenCode, so no separate search API key is required.

## Requirements

- OpenCode v2 with the `@opencode/plugin` 2.0.3 API
- An active ChatGPT OAuth connection and a ChatGPT account with Codex access

Connect ChatGPT through `/connect` or `opencode auth login` (use `opencode2` instead if that is your v2 executable). Select the ChatGPT browser or headless OAuth method rather than an OpenAI API key.

## Installation

Add the package and select the `codex` search provider in your OpenCode v2 configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-codex-websearch@0.2.0"],
  "websearch": { "provider": "codex" }
}
```

Alternatively, omit `websearch` and choose **ChatGPT Codex** in OpenCode's search-provider selection UI. Installing the plugin registers the provider without overriding your existing selection.

Quit and restart OpenCode after changing the configuration or updating the plugin.

## Search and options

Ask OpenCode to search the web. Its built-in `websearch` tool accepts `query`; this plugin supplies the results when `codex` is selected. Results contain page titles, URLs, and snippets. OpenCode handles display, permissions, and tool-output formatting.

Configure result limits and filters using plugin options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-codex-websearch@0.2.0",
      "options": {
        "max_results": 8,
        "recency": 30,
        "domains": ["github.com", "opencode.ai"]
      }
    }
  ],
  "websearch": { "provider": "codex" }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `max_results` | `8` | Maximum results returned, an integer from 1 to 20 |
| `recency` | Unrestricted | Only search the last N days, an integer from 1 to 3,650 |
| `domains` | Unrestricted | Search only these domains; up to 20 strings, each 1–253 characters |

Filters apply to every Codex search from this plugin instance. Omit `recency` and `domains` for unrestricted searches. Invalid or unknown options are rejected at plugin setup. Queries are trimmed and must contain 1–500 characters.

Searches have a 15-second deadline including credential resolution and model discovery. Cancellation and plugin cleanup abort pending HTTP requests. Account-eligible models are discovered lazily and cached for the active credential/account in each plugin instance. Results are sanitized and bounded before being returned to OpenCode.

## Permissions

The built-in tool uses the v2 `websearch` permission action, with the search query as its resource. For example, to ask before searches:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permissions": [
    { "action": "websearch", "resource": "*", "effect": "ask" }
  ]
}
```

HTTP errors preserve status codes and `Retry-After` so OpenCode can handle rate limits, including provider fallback when using its `random` provider selection.

## Authentication

For each search, the plugin resolves OpenCode's active `openai` integration connection through the public v2 integration API. OpenCode reads credentials from SQLite, refreshes OAuth tokens when needed, and persists refreshed credentials. The plugin uses `credential.metadata.accountID` for the ChatGPT account header, with token claims as a fallback.

OpenCode owns migration of legacy `auth.json` credentials. This plugin does not read or write `auth.json`, open SQLite directly, or consume `OPENCODE_AUTH_CONTENT`. Authenticate on the OpenCode server running the plugin. If authentication is unavailable, expired after resolution, or rejected by ChatGPT, reconnect ChatGPT through OpenCode.

Credentials are sent only to ChatGPT's Codex endpoints. This plugin uses an internal ChatGPT endpoint that may change without notice.

## Migrating from 0.1.x

Version **0.2.0 requires OpenCode v2** and changes the search interface:

- Rename configuration `plugin` to `plugins`. Package/options tuples become `{ "package": "...", "options": { ... } }` objects.
- Replace references to `codex_web_search` with the built-in `websearch` tool and select provider `codex`.
- Move `max_results`, `recency`, and `domains` from tool arguments into plugin options.
- Migrate permission rules to the v2 `websearch` action.
- Install one copy of the plugin. V2 owns plugin discovery, duplicate-ID diagnostics, and registration cleanup; the old filename-based project/global override logic is removed.
- For local installation, use a plugin directory under `.opencode/plugins/` containing the package and its v2 entrypoint. Explicit local paths should point to the plugin directory.

## Development and verification

Use Node.js 24 or newer for the test runner:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
```

Tests exercise provider registration, options, credential resolution and account changes, model discovery, result conversion, HTTP errors, cancellation, timeouts, and cleanup using synthetic credentials and HTTP responses.

## Releasing

Maintainers publish by updating `package.json`, merging the change to `main`, and publishing a GitHub Release whose tag is `v` followed by the package version (for this release, `v0.2.0`). The release workflow runs typechecking and tests, then publishes to npm through OIDC without an npm token. npm automatically records provenance.

## License

[MIT](LICENSE)
