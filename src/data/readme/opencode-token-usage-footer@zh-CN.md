# opencode-token-usage-footer

[English](README.md) | [简体中文](README.zh-CN.md)

这是一个响应式 OpenCode TUI 底栏插件，用于显示 Token 总量、缓存命中率、
输入、输出、推理 Token、缓存读写、费用和子会话数量。

## 环境要求

- OpenCode 1.18.5 或更高版本
- 使用 OpenCode TUI

## 安装

编辑全局 TUI 配置 `~/.config/opencode/tui.json`，加入 npm 包：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-token-usage-footer"]
}
```

如果已有其他 TUI 插件，把它追加到现有 `plugin` 数组中：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "opencode-wlb-quota",
    "opencode-token-usage-footer"
  ]
}
```

修改配置后完全退出并重新启动 OpenCode。

## 显示内容

底栏会根据终端宽度自动调整：

- 窄屏：Token 总量和缓存命中率
- 中等宽度：输入、输出和费用
- 宽屏：推理 Token、缓存读写和会话数量

统计范围包含当前会话及其所有子会话和子代理会话。打开会话时，插件会在
相关 OpenCode 事件后刷新，并每两秒轮询一次。

缓存命中率计算方式：

```text
缓存读取 /（未缓存输入 + 缓存读取）
```

## 隐私

插件只通过本机 OpenCode TUI API 读取会话统计数据，不会向外部服务发送
数据，也不需要 API Key 或其他凭据。

## 常见问题

### 底栏没有显示

1. 确认正在查看具体会话；首页不会显示统计底栏。
2. 确认插件配置在 `tui.json` 中，而不是 `opencode.json` 中。
3. 确认 OpenCode 版本不低于 1.18.5。
4. 修改配置后完全退出并重新启动 OpenCode。

### 显示 `TOK · unavailable`

插件暂时无法读取当前会话数据。可以等待下一次自动刷新，或重新进入该会话。

## 本地开发

```sh
npm install
npm run typecheck
npm pack --dry-run
```

## 许可证

MIT
