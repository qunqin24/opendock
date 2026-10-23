# opencode-statusline-plugins

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](README.md) | **简体中文**

一组 [OpenCode](https://opencode.ai/v2) TUI 插件：在底部状态栏显示你的 AI 订阅配额，原生支持 V2。✨

每个插件都直接读取 OpenCode 已有的凭证 —— 无需手动配置，密钥不会离开本地服务进程。🔒

## 🧩 插件

| 插件                                                                      | 订阅配额                                     | npm                                                                                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`opencode-go-statusline`](packages/opencode-go-statusline)               | 🐹 OpenCode Go —— 滚动 5h / 周 / 月          | [![npm version](https://img.shields.io/npm/v/opencode-go-statusline)](https://www.npmjs.com/package/opencode-go-statusline)               |
| [`opencode-copilot-statusline`](packages/opencode-copilot-statusline)     | 🤖 GitHub Copilot —— premium requests / chat | [![npm version](https://img.shields.io/npm/v/opencode-copilot-statusline)](https://www.npmjs.com/package/opencode-copilot-statusline)     |
| [`opencode-kimi-code-statusline`](packages/opencode-kimi-code-statusline) | 🌙 Kimi Code（Kimi For Coding）              | [![npm version](https://img.shields.io/npm/v/opencode-kimi-code-statusline)](https://www.npmjs.com/package/opencode-kimi-code-statusline) |

## 📦 安装

每个插件都是独立的 npm 包 —— 只需安装你需要的：

```sh
opencode plugin add opencode-go-statusline
```

各 provider 的具体说明见对应包的 README。📖

## 📄 License

MIT
