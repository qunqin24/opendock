# opencode-statusline-plugins

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[English](README.md) | **简体中文**

一组 [OpenCode](https://opencode.ai/v2) TUI 插件：在底栏显示 AI 订阅配额，原生支持 V2。✨

每个插件直接读取 OpenCode 已有的凭据，无需手动配置。密钥只保存在本地服务进程中，并且只发送给提供方自己的配额接口。🔒

## 🧩 插件

| 插件                                                                      | 订阅配额                                            | npm                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`opencode-go-statusline`](packages/opencode-go-statusline)               | 🐹 OpenCode Go：滚动 5 小时 / 每周 / 每月           | [![npm version](https://img.shields.io/npm/v/opencode-go-statusline)](https://www.npmjs.com/package/opencode-go-statusline)               |
| [`opencode-copilot-statusline`](packages/opencode-copilot-statusline)     | 🤖 GitHub Copilot：premium requests / chat          | [![npm version](https://img.shields.io/npm/v/opencode-copilot-statusline)](https://www.npmjs.com/package/opencode-copilot-statusline)     |
| [`opencode-kimi-code-statusline`](packages/opencode-kimi-code-statusline) | 🌙 Kimi Code（Kimi For Coding）：滚动 5 小时 / 每周 | [![npm version](https://img.shields.io/npm/v/opencode-kimi-code-statusline)](https://www.npmjs.com/package/opencode-kimi-code-statusline) |

## 📦 安装

每个插件都是独立的 npm 包，只需安装需要的插件：

```sh
opencode plugin add opencode-go-statusline
```

各提供方的具体说明见对应包的 README。参与开发请见 [AGENTS.md](AGENTS.md)。

## 📄 许可证

MIT
