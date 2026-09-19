# opencode-statusline-plugins

[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**English** | [简体中文](README.zh-CN.md)

Monorepo of [OpenCode](https://opencode.ai/v2) V2-native TUI plugins that show your AI subscription quota in the footer statusline.

Each plugin reads usage from credentials that OpenCode already has — no manual setup, and secrets never leave the local server.

## Plugins

| Plugin                                                                    | Subscription quota                          | Status       |
| ------------------------------------------------------------------------- | ------------------------------------------- | ------------ |
| [`opencode-go-statusline`](packages/opencode-go-statusline)               | OpenCode Go — rolling 5h / weekly / monthly | ✅ Available |
| [`opencode-copilot-statusline`](packages/opencode-copilot-statusline)     | GitHub Copilot — premium requests / chat    | ✅ Available |
| [`opencode-kimi-code-statusline`](packages/opencode-kimi-code-statusline) | Kimi Code (Kimi For Coding)                 | ✅ Available |

## Install

Every plugin is a standalone npm package — install only the ones you need:

```sh
opencode plugin add opencode-go-statusline
```

See each package's README for provider-specific instructions.

Or ask an agent in OpenCode to install it:

```text
Follow https://github.com/lnwu/opencode-statusline-plugins to install opencode-go-statusline
```

## License

MIT
