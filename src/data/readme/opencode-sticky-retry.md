# opencode-sticky-retry

A configurable retry plugin for [opencode](https://opencode.ai). It automatically retries failed LLM provider requests (like 5xx errors or network timeouts) so your agent sessions survive transient outages without manual intervention.

## Features

- **Sticky by default:** Retries indefinitely until the request succeeds, the user aborts, or a configured opt-out rule is hit.
- **Smart Backoff:** Exponential backoff with jitter, honoring `Retry-After` headers (429/503).
- **Configurable Opt-outs:** Stop retrying on specific HTTP status codes (e.g., 400, 401) or response body patterns (e.g., "context length exceeded").
- **TUI Notifications:** Shows retry attempts and countdowns directly in opencode's UI.
- **Provider Filtering:** Only intercepts requests to known LLM endpoints by default (OpenAI, Anthropic, etc.), ignoring standard fetch calls.

## Installation

Add the plugin to your `opencode.json` configuration file:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "opencode-sticky-retry"
  ]
}

```

*Note: For local development, you can point directly to the built file: `"./path/to/opencode-sticky-retry/dist/index.js"`.*

## Configuration

You can customize the retry behavior by passing an options object. Here is an example of common overrides to avoid infinite loops on deterministic errors (like bad prompts or context limits):

```jsonc
{
  "plugin": [
    ["opencode-sticky-retry", {
      "nonRetriableStatusCodes": [400, 401, 403, 422],
      "nonRetriableBodyPatterns": ["context length", "content policy"]
    }]
  ]
}

```

### All Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch to enable/disable the plugin. |
| `sticky` | `boolean` | `true` | If `true`, ignore `maxAttempts` and retry forever. |
| `maxAttempts` | `number` | `5` | Max retries when `sticky: false`. |
| `initialDelayMs` | `number` | `1000` | Backoff delay before the second attempt. |
| `maxDelayMs` | `number` | `60000` | Maximum backoff delay cap. |
| `backoffFactor` | `number` | `2` | Exponential growth multiplier. |
| `jitter` | `"none" | "full" | "equal"` | `"equal"` | Randomization applied to the backoff delay. |
| `honorRetryAfter` | `boolean` | `true` | Respect `Retry-After` headers. |
| `nonRetriableStatusCodes` | `number[]` | `[]` | Status codes that should **never** be retried (e.g., `[400, 401]`). |
| `retriableStatusCodes` | `number[]` | `[]` | Strict allowlist. If non-empty, **only** these non-2xx codes are retried. |
| `nonRetriableErrorPatterns` | `(string | RegExp)[]` | `[]` | Match thrown error messages to skip retries (e.g. `["invalid api key"]`). |
| `nonRetriableBodyPatterns` | `(string | RegExp)[]` | `[]` | Match response bodies to skip retries (e.g., `["context length"]`). |
| `urlAllowlist` | `string[]` | `[...]` | Endpoints to intercept. Defaults to common LLM providers. Use `["*"]` to intercept all HTTP requests. |
| `log` | `boolean` | `true` | Log retry events to opencode's logger. |
| `logLevel` | `"debug" | "info" | "warn" | "error"` | `"info"` | Minimum log level. |
| `notify` | `"off" | "events" | "verbose"` | `"events"` | TUI toast notifications. `"events"` suppresses fast burst retries. |

## Development

Requires Node 18+ or Bun.

```bash
# Install dependencies
npm install

# Run typechecking
npm run typecheck

# Build the plugin
npm run build

```

The compiled ESM output will be available in the `dist/` directory.

## License

[MIT](https://www.google.com/search?q=LICENSE)
