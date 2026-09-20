# opencode-statusline-plugins

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**English** | [简体中文](README.zh-CN.md)

Monorepo of [OpenCode](https://opencode.ai/v2) V2-native TUI plugins that show your AI subscription quota in the footer statusline. ✨

Each plugin reads usage from credentials that OpenCode already has — no manual setup, and secrets never leave the local server. 🔒

## 🧩 Plugins

| Plugin | Subscription quota | npm |
| --- | --- | --- |
| [`opencode-go-statusline`](packages/opencode-go-statusline) | 🐹 OpenCode Go — rolling 5h / weekly / monthly | [![npm version](https://img.shields.io/npm/v/opencode-go-statusline)](https://www.npmjs.com/package/opencode-go-statusline) |
| [`opencode-copilot-statusline`](packages/opencode-copilot-statusline) | 🤖 GitHub Copilot — premium requests / chat | [![npm version](https://img.shields.io/npm/v/opencode-copilot-statusline)](https://www.npmjs.com/package/opencode-copilot-statusline) |
| [`opencode-kimi-code-statusline`](packages/opencode-kimi-code-statusline) | 🌙 Kimi Code (Kimi For Coding) | [![npm version](https://img.shields.io/npm/v/opencode-kimi-code-statusline)](https://www.npmjs.com/package/opencode-kimi-code-statusline) |

## 📦 Install

Every plugin is a standalone npm package — install only the ones you need:

```sh
opencode plugin add opencode-go-statusline
```

See each package's README for provider-specific instructions. 📖

## 📄 License

MIT
