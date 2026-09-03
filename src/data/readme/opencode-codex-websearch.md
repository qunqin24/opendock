# opencode-codex-websearch

An [OpenCode](https://opencode.ai) plugin that adds a `codex_web_search` tool backed by ChatGPT's Codex search endpoint. It uses the ChatGPT OAuth credentials already managed by OpenCode, so no separate search API key is required.

## Requirements

- OpenCode with ChatGPT OAuth authentication
- A ChatGPT account with Codex access

Run `opencode auth login` if OpenCode is not already authenticated with ChatGPT.

## Installation

Add the package to your OpenCode configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-codex-websearch"]
}
```

Quit and restart OpenCode after changing the configuration.

## Tool

The plugin registers `codex_web_search` with these arguments:

| Argument | Required | Description |
| --- | --- | --- |
| `query` | Yes | Web search query |
| `max_results` | No | Maximum results, from 1 to 20 (default: 8) |
| `recency` | No | Only return results from the last N days |
| `domains` | No | Only return results from the specified domains |

Results contain only each page's title, URL, and snippet, formatted as Markdown.

## Authentication

The plugin reads OpenCode's `openai` OAuth entry from `OPENCODE_AUTH_CONTENT` or OpenCode's local `auth.json`. Credentials are sent only to ChatGPT's Codex endpoints.

This plugin uses an internal ChatGPT endpoint that may change without notice.

## Releasing

Maintainers publish by updating `package.json`, merging the change to `main`, and publishing a GitHub Release whose tag is `v` followed by the package version. The release workflow publishes to npm through OIDC without an npm token and npm automatically records provenance.

## License

[MIT](LICENSE)
