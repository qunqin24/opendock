# PipeLLM WebSearch for OpenClaw

[![npm version](https://img.shields.io/npm/v/pipellm-websearch)](https://www.npmjs.com/package/pipellm-websearch)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Give your AI agent the ability to search the web, read pages, and stay up to date — powered by PipeLLM.

## Packages

This repository contains two packages for different agent hosts. Install only the package for the host you use:

| Agent host | Package | Install |
| --- | --- | --- |
| OpenClaw | `pipellm-websearch` | `npm install pipellm-websearch` |
| Magpie | `@pipellm/magpie-websearch` | `magpie plugin add @pipellm/magpie-websearch` |

The existing OpenClaw package lives at the repository root. The Magpie package lives in [`packages/magpie-websearch`](./packages/magpie-websearch/), has its own `package.json`, and is published independently. The two packages share the PipeLLM WebSearch service but have separate host adapters and release versions.

## ✨ Features

- 🔍 **Web Search** — search the web and get rich, relevant content
- ⚡ **Quick Search** — fast search results when speed matters
- 📄 **Page Reader** — read any URL and get clean, structured text
- 📰 **News Search** — find the latest news and current events

## 🚀 Quick Start

### 1. Install

```bash
npm install pipellm-websearch
```

### 2. Get Your API Key

1. Visit [console.pipellm.com](https://console.pipellm.com)
2. Sign up or log in — new accounts get **$5 free credit**
3. Go to **API Keys** → **Create Key**
4. Copy your key (starts with `pipe-`)

### 3. Configure in OpenClaw

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": ["./node_modules/pipellm-websearch"]
    },
    "entries": {
      "pipellm-websearch": {
        "enabled": true,
        "config": {
          "apiKey": "pipe-your-api-key-here"
        }
      }
    }
  }
}
```

Or configure interactively:

```bash
openclaw configure --section plugins
```

### 4. Enable for Your Agent

```json
{
  "agents": {
    "list": [
      {
        "name": "my-agent",
        "tools": {
          "allow": [
            "pipellm_web_search",
            "pipellm_simple_search",
            "pipellm_web_reader",
            "pipellm_news_search"
          ]
        }
      }
    ]
  }
}
```

### 5. Restart and Use

Restart your OpenClaw gateway. Now your agent can:

```
"Search for the latest developments in quantum computing"
"Read the documentation at https://docs.example.com/guide"
"What's the latest news about OpenAI?"
```

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `pipellm_web_search` | Deep web search with content extraction and relevance ranking |
| `pipellm_simple_search` | Fast web search returning search snippets |
| `pipellm_web_reader` | Read a web page and convert to clean text |
| `pipellm_news_search` | Search recent news articles with content extraction |

Your agent will automatically choose the best tool based on the task — the included skill guide helps it make smart decisions.

## ⚙️ Configuration

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiKey` | ✅ Yes | — | Your PipeLLM API Key |
| `apiEndpoint` | No | `https://api.pipellm.ai` | Custom endpoint for self-hosted instances |

## 💰 Pricing

Each request costs **$0.05**. Check your balance at [console.pipellm.com](https://console.pipellm.com).

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| API Key not configured | Set your key in `openclaw.json` plugin config |
| Authentication failed | Check your key at [console.pipellm.com](https://console.pipellm.com) → API Keys |
| Search timed out | Try a more specific query |
| Cannot connect | Check your internet connection or custom endpoint URL |

## 📄 License

MIT

## Magpie

Magpie users can install the companion tools package:

```bash
magpie plugin add @pipellm/magpie-websearch
magpie plugin login pipellm-websearch
```

The Magpie package provides the same PipeLLM WebSearch capabilities through Magpie's tools MCP service. Its source and package manifest are in [`packages/magpie-websearch`](./packages/magpie-websearch/).
