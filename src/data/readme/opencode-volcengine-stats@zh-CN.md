# opencode-volcengine-stats

[![CI](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/ci.yml)
[![NPM Publish](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/overstart/opencode-volcengine-stats/actions/workflows/npm-publish.yml)
[![NPM Version](https://img.shields.io/npm/v/opencode-volcengine-stats)](https://www.npmjs.com/package/opencode-volcengine-stats)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English](README.md)

一个面向 [OpenCode](https://opencode.ai) **v2** 的 CLI 插件，在会话右侧栏显示
**火山方舟 Coding Plan** 套餐用量（和自带的 context、mcp 面板一样，只在会话中
出现，首页不显示）：

![截图：OpenCode 会话右侧栏中的 5h / 1W / 1M 用量进度条](docs/screenshot.png)

数据来自本机 [`arkcli`](https://www.npmjs.com/package/@volcengine/ark-cli)
——插件本身不调用方舟 API、不处理鉴权。默认每 60s 自动刷新；按
**`ctrl+alt+r`**（或点击进度条下方的 `↻` 行）可立即手动刷新。

> **OpenCode v1 用户：** 本包主线（`1.x`）仅支持 OpenCode **v2**。还在 v1 的
> 用户请固定使用旧版线 `opencode-volcengine-stats@0.3.x`，并按该版本 README 中
> 的 V1 `tui.json` 方式配置。

## 安装

**前置条件：** 已安装并登录 `arkcli`，且在 `PATH` 上：

```bash
npm i -g @volcengine/ark-cli@latest
arkcli auth login
arkcli usage plan --product coding-plan --format json   # 自检
```

然后可让 OpenCode 直接加入全局配置：

```bash
opencode plugin add opencode-volcengine-stats
```

或手动写入 `opencode.json`（全局 `~/.config/opencode/opencode.json`，或项目
`opencode.jsonc` / `.opencode/opencode.json`）后重启 OpenCode：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-volcengine-stats"]
}
```

CLI 会从服务端的有效插件列表自动加载包的 TUI 组件，无需单独的终端配置。如果
你的终端连接的是**远程服务器**，希望插件无论如何都在本地终端生效，请改写到全局
CLI 配置 `~/.config/opencode/cli.json`：

```jsonc
{
  "plugins": ["opencode-volcengine-stats"]
}
```

## 配置

选项通过 `plugins` 条目的对象形式传入：

| 选项            | 默认值          | 含义                         |
|-----------------|-----------------|------------------------------|
| `product`       | `"coding-plan"` | arkcli 产品 id               |
| `bin`           | `"arkcli"`      | arkcli 二进制名称/路径       |
| `pollMs`        | `60000`         | 数据重新拉取间隔（毫秒）     |
| `barWidth`      | `14`            | 进度条轨道宽度（单元格）     |
| `showCountdown` | `true`          | 是否显示重置倒计时           |
| `refreshKey`    | `"ctrl+alt+r"`  | 立即刷新的快捷键             |

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-volcengine-stats",
      "options": { "pollMs": 30000, "barWidth": 18 }
    }
  ]
}
```

## 排障

**`ctrl+alt+r` 没反应（Windows / WSL / tmux 环境）。** 如果连内置的
`ctrl+alt+k`（which-key 面板）也没反应，说明该组合键在到达终端之前就被
拦截——常见元凶是中文输入法（微软拼音会吞 Ctrl+Alt 组合）、AutoHotkey 脚本
或其他系统级热键。可先按 `Win+Space` 切到 English US 键盘布局后再按一次验证。
如果无法解除拦截，可把刷新命令改绑到其他按键，例如 `alt+r`（其 `ESC r`
序列能可靠穿过 WSL 和 tmux）：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-volcengine-stats",
      "options": { "refreshKey": "alt+r" }
    }
  ]
}
```

进度条下方可点击的 `↻` 提示行始终可用，不依赖键盘传输。

## 许可证

[MIT](LICENSE)
