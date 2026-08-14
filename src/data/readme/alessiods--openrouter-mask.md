# openrouter-mask

[![npm version](https://img.shields.io/npm/v/@alessiods/openrouter-mask.svg)](https://www.npmjs.com/package/@alessiods/openrouter-mask)
[![license](https://img.shields.io/npm/l/@alessiods/openrouter-mask.svg)](LICENSE)

OpenCode plugin that masks your API requests as **Hermes Agent** on OpenRouter.

## What it does

When you send requests through OpenRouter, this plugin overrides the following HTTP headers:

| Header | Value |
|---|---|
| `HTTP-Referer` | `https://hermes-agent.nousresearch.com/` |
| `X-OpenRouter-Title` | `Hermes Agent` |
| `X-OpenRouter-Categories` | `personal-agent,cli-agent` |

This makes your requests appear as if they originate from the Hermes Agent application on OpenRouter, which can help with rate limits, usage tracking, and attribution.

## Install

### npm

```bash
npm install @alessiods/openrouter-mask
```

### OpenCode

Add to your `opencode.json`:

```json
{
  "plugin": ["@alessiods/openrouter-mask"]
}
```

### From source

```json
{
  "plugin": ["path/to/openrouter-mask/.opencode/plugins/openrouter-mask.mjs"]
}
```

## How it works

The plugin hooks into OpenCode's `chat.headers` lifecycle event and injects the spoofed headers before each request is sent to the OpenRouter API.

```typescript
import type { Plugin } from "@opencode-ai/plugin"

export default (async () => {
  return {
    "chat.headers": async (input, output) => {
      output.headers["HTTP-Referer"] = "https://hermes-agent.nousresearch.com/"
      output.headers["X-OpenRouter-Title"] = "Hermes Agent"
      output.headers["X-OpenRouter-Categories"] = "personal-agent,cli-agent"
    },
  }
}) satisfies Plugin
```

## Configuration

No configuration needed. Install and it works.

## License

MIT
