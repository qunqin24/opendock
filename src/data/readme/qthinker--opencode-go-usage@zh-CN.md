# opencode-go-usage

[![npm version](https://img.shields.io/npm/v/@qthinker/opencode-go-usage)](https://www.npmjs.com/package/@qthinker/opencode-go-usage)
[![license](https://img.shields.io/npm/l/@qthinker/opencode-go-usage)](./LICENSE)
[![ci](https://github.com/QThinkerJR/opencode-go-usage/actions/workflows/ci.yml/badge.svg)](https://github.com/QThinkerJR/opencode-go-usage/actions/workflows/ci.yml)

[English](https://github.com/QThinkerJR/opencode-go-usage/blob/main/README.md) | 简体中文

OpenCode V2 插件：展示 OpenCode Go 订阅的三个用量窗口（5 小时 / 每周 / 每月），TUI 侧栏与 Desktop 侧区面板各有一套进度条。

数据来自本机 OpenCode 服务的 `client.experimental.usage.limits()`。插件不读取 `auth.json`、`opencode.db` 或任何令牌，也不直连上游；服务端负责凭据刷新与 workspace 解析。

> 本项目的 npm 包名是 `@qthinker/opencode-go-usage`，与 npm 上的裸名 `opencode-go-usage` 不是同一个项目。

## 功能

### TUI

- 在 `sidebar.content` 追加只读面板。
- 每行一个窗口：标签、字符进度条（`█` / `░`）、已用百分比、重置倒计时。窗口被限流时用 `LIMITED` 替换百分比。
- 最近一次刷新失败时显示 `stale`。
- 跟随 OpenCode 当前主题。
- `/go-usage-refresh` 立即刷新。

### Desktop

- 会话侧区 pinned 标签页（`Go Usage` / `Go 用量`）。
- HTML/CSS 进度条、刷新按钮、加载骨架、错误/空状态。
- 命令面板命令 **Open Go usage**，默认快捷键 `Ctrl+Shift+G`（macOS 为 `Cmd+Shift+G`），斜杠命令 `/go-usage`。

### 轮询

- 正常时每 60 秒刷新一次。
- 任一窗口 `limited` 或即将重置时缩短为 5 秒。
- 请求失败时保留上一次快照，并标记为 `stale`。

## 前置条件

- OpenCode V2，且账号有 OpenCode Go 订阅。
- TUI 和/或 OpenCode Desktop。Desktop 的 GUI 插件 API 仍被 OpenCode 标注为 experimental；本版本面向 `@opencode/plugin` 2.4.1。
- 从源码开发时需要 Bun 1.4.x。发布到 npm 的包直接携带 TypeScript 源码，由 OpenCode 加载。

## 安装

把包加入**全局** `~/.config/opencode/opencode.json(c)`，这样 Desktop 每个窗口都能看到：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["@qthinker/opencode-go-usage"]
}
```

或让 CLI 修改全局配置：

```bash
opencode plugin add @qthinker/opencode-go-usage
opencode plugin list
```

一个条目会加载 server / TUI / GUI 三个 part。保存后 OpenCode 会重载插件；TUI 也可以执行 `/reload`。Desktop 只读 `opencode.json(c)`，不读 `cli.json`。

> `src/index.ts` 是一个空的 server part，只用于让 OpenCode 注册这个包。没有 server 入口时，OpenCode 会整体跳过该包，TUI part 也不会加载；它不抓数据、不注册工具或 RPC。

## 卸载

```bash
opencode plugin remove @qthinker/opencode-go-usage
```

或从全局 `opencode.json(c)` 中删除该条目并重新加载 OpenCode。

## 使用

- **TUI**：展开侧栏，面板以 `OpenCode Go` 标题显示在侧栏内容中。
- **Desktop**：打开会话，在右侧侧区选择 pinned 的 **Go Usage** 标签页；也可以从命令面板运行 **Open Go usage**，或使用 `/go-usage`、`Ctrl+Shift+G`。
- **立即刷新**：使用 Desktop 面板的刷新按钮，或在 TUI 执行 `/go-usage-refresh`。

### 状态

| 状态 | 含义 |
|---|---|
| `Loading Go usage…` | 首次请求进行中。 |
| `Sign in to OpenCode Console` | 服务端报告当前未登录。 |
| `No Go subscription` | 当前账号没有 OpenCode Go 套餐。 |
| `Usage unavailable` | 请求失败；保留上一次快照并标记 `stale`。 |
| `LIMITED` | Go 在该窗口重置前拒绝请求。TUI 用它替换百分比列，Desktop 在百分比旁显示徽章。 |

显示的数字是宿主返回的用量，不是精确的美元额度。

## 工作原理

`fetchUsage` 使用当前会话目录调用 `client.experimental.usage.limits({ location: { directory } })`。宿主返回 workspace 与 Go 窗口数据，面板只负责渲染。本包不读取、不存储、不转发任何令牌。

TUI part 由 OpenCode 运行时直接解析 `src/tui/index.tsx`；Desktop part 必须预构建为 `dist/gui-experimental.cjs`，通过 `./gui-experimental` 导出。

## 开发

```bash
bun install
bun test              # 纯函数测试 + TUI 无头帧测试（testRender）
bun run typecheck     # tsc --noEmit
bun run build:gui     # 打包 dist/gui-experimental.cjs
npm pack --dry-run    # 构建后检查发布产物
```

把本地配置指向仓库目录（必须是目录，不是文件）：

```jsonc
{
  "plugins": ["C:/path/to/opencode-go-usage"]
}
```

使用本地目录前先执行 `bun run build:gui`，否则 Desktop part 不存在。TUI part 直接从源码加载，Desktop part 是预构建的 CommonJS bundle。

### 目录

```text
src/
  index.ts          inert server part（仅注册包）
  lib/types.ts      UsageState / UsageInfo 契约
  lib/usage.ts      client.experimental.usage.limits + 轮询延迟
  lib/format.ts     百分比、字符条、颜色分级、倒计时
  tui/index.tsx     Plugin.define + sidebar.content slot + 轮询
  tui/panel.tsx     纯 props TUI 面板（OpenTUI）
  tui/theme.ts      主题 token 子集与回退
  gui/index.tsx     GUI Plugin.define + Panel/Command/Style
  gui/panel.tsx     纯 props Desktop 面板（Solid DOM）
  gui/panel.css     作用域 .ogu-* 样式
  gui/i18n.ts       en/zh tab/command 文案
tests/              bun test
```

## 已知限制

- Desktop 插件 API 标注为 experimental，可能随 OpenCode 版本变化。
- Desktop 插件没有常驻左侧 sidebar slot；面板落在会话右侧 side region（pinned tab），Home 屏没有 side region。
- TUI 的 `sidebar.content` 只在侧栏展开时渲染；窄终端/图标 rail（`cli.json` 的 `session.sidebar` 为 `auto` 且宽度不足）不会显示。加宽终端或设为 `"show"` 可见。
- 只展示百分比、`limited`、`resetsAt`；不展示美元金额、credits、Console budgets。
- TUI 面板在挂载时取当前 location 的 directory；同一 TUI 实例内切换目录不会自动重拉（GUI 会）。用量是 workspace 级，实际影响很小；需要时执行 `/go-usage-refresh`。
- `percent` 是宿主返回的用量百分比（上游向下取整），不是精确美元额度。

## 常见问题

- **Desktop 没有面板**：确认插件在全局 `opencode.json(c)`；本地目录需要先执行 `bun run build:gui`，然后重新加载 Desktop 窗口。
- **TUI 没有面板**：展开侧栏，或把 `cli.json` 的 `session.sidebar` 设为 `"show"`。
- **`Sign in to OpenCode Console`**：在应用中登录 OpenCode Console。
- **`No Go subscription`**：当前登录账号没有 OpenCode Go 套餐。

## 许可证

[MIT](./LICENSE)
