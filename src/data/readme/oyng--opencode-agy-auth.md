# @oyng/opencode-agy-auth

[![npm version](https://img.shields.io/npm/v/@oyng/opencode-agy-auth.svg)](https://www.npmjs.com/package/@oyng/opencode-agy-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A reverse-engineered client for the Google [Antigravity](https://antigravity.google/) CLI (Agy / Code Assist), bundled as an opencode plugin. It adds OAuth authentication and a `google-agy` model provider so opencode can call Gemini, Claude, and GPT models through the Code Assist backend, plus web search, quota, and image tools.

## Features

- **Google OAuth 2.0 (PKCE)** — browser authorization with automatic token refresh.
- **Model support** — Gemini 3.7 / 3.6 / 3.5 / 3.1 Flash & Pro series, `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`.
- **Tools**:
  - `agy_usage` — inspect Code Assist quota and limits
  - `websearch_cited` — grounded web search with inlined citations and a `Sources:` list
  - `read_url_content` — fetch and clean page content
  - `generate_image` — image generation and editing
- **Native context compaction** — protocol-aligned summarization and tool-call flattening.
- **Thinking-chain fidelity** — streaming deduplication, signature self-healing, system-reminder stripping.

## Installation

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "@oyng/opencode-agy-auth"
  ]
}
```

## Debugging

```bash
AGY_DEBUG=1 opencode
```

Logs are written to `./agy_chat_log/` in the working directory.

## License

[MIT](./LICENSE) © 2026 oyng · [Source](https://github.com/yynag/opencode-agy-auth)