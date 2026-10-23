# MdTracker

[English](README.md)

一个 OpenCode **TUI 侧边栏插件**，用于显示当前会话上下文中所有占用空间的 Markdown 文件 —— 包括 `@`提及、Agent 工具读取 和 `instructions`，并实时统计字符数 / token 数。超过 4000 token 的文件会高亮显示，列表过多时自动折叠，保持侧边栏整洁。

```
Markdown Context
6 files · 4,521 tokens
README.md            1,250ch / 312t
docs/style.md          860ch / 215t
big-file.md   ⚠ 18,400ch / 4,600t   ← 超过 4000 token → 警告色
…
```

## 跟踪范围

| 来源 | 捕获方式 | 作用域 |
| --- | --- | --- |
| `@`提及 / 文件附件 | `chat.message` + `experimental.chat.messages.transform` 钩子（读取 `FilePart.source.path`） | 按会话 |
| Agent 读取 `.md`（read/view/grep 工具） | `tool.execute.before` 钩子（扫描工具参数） | 按会话 |
| `opencode.json` 中的 `instructions` | TUI 直接读取配置 | 始终 |

被跟踪的文件按**当前会话**隔离：新建会话（或重启 OpenCode）会重置列表，其他项目的文件永远不会出现。

## 侧边栏行为

- 标题样式与内置面板（`Context`、`MCP` …）一致 —— 加粗、无图标。
- 按文件 token 数降序排列。
- 文件超过 **4000 token** 时该行变为黄色。
- 文件多于 **6 个**时**自动折叠**，只显示一行摘要：`Markdown Context (N files, T tokens, M over limit)`。点击 ▼/▶ 可展开；一旦你手动点击过，本次会话内会记住你的选择。

## 环境要求

- OpenCode `>= 1.3.13`
  （只有从源码构建时才需要 Node.js。）

## 安装

从 npm 安装 —— OpenCode 会在启动时把它装进包缓存：

```sh
opencode plugin mdtracker -g
```

这会在全局配置（`~/.config/opencode/opencode.json`）里写入 `"plugin": ["mdtracker"]`。完成后**重启 OpenCode** 即可加载。

## 更新

```sh
opencode plugin mdtracker@latest -g
```

（或在配置的 `plugin` 数组里改版本号后重启）

## 卸载

在 `~/.config/opencode/opencode.json` 的 `plugin` 数组里删除 `"mdtracker"`，然后重启 OpenCode。包缓存里的残留可以不管（无害）。

## 从源码安装（开发用）

若要在发布前测试本地改动，内置脚本会构建并部署到标准插件目录：

```powershell
.\install.ps1     # 构建 + 部署到 ~/.config/opencode/plugins/mdtracker + 注册
.\uninstall.ps1   # 移除注册、部署目录和状态文件
```

手动跨平台构建（用于类型检查 / 查看产物）：

```sh
npm install && npm run build
```

## 测试

内置自测命令和样例文件：

- `/test-md-tracker` —— 自动测试工具读取、指标、多文件、警告阈值等路径，并打印一张通过/失败结果表。（它无法自动触发 `@`提及 —— 那需要手动。）
- `test/PLUGIN_TEST.md` —— 用于工具读取路径的样例文件（1,936ch / 489t）。
- `test/MENTION_TEST.md` —— 用于 `@`提及路径的样例文件（1,360ch / 344t）。

如果 `/test-md-tracker` 没被识别，重启一次 OpenCode。

## 工作原理

本插件发布两个入口：

- `src/tui.tsx` —— TUI 插件。向原生 `sidebar_content` 插槽（`api.slots.register`）注册一个 Solid.js 组件。**响应式更新** —— Solid effect 跟踪 `api.state`（会话消息 + 配置），并由 `message.part.updated` / `session.idle` 事件触发对工具读取状态文件的刷新。无轮询。
- `src/server.ts` —— 服务端插件，包含捕获钩子。把解析后的路径和指标写入按会话区分的状态文件。
- `src/metrics.ts` —— 路径解析（相对路径基于项目目录解析）、文件读取（Bun / `node:fs`）、分词。
- `src/shared/state.ts` —— 系统临时目录中按会话区分的 JSON 状态。

**分词器：** 使用 [`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer)（纯 JS `cl100k_base`，无需 WASM）。若加载失败，会自动回退到 `字符数 / 4` 的估算，确保侧边栏永不崩溃。

## 局限性

- TUI 插槽 API（`@opencode-ai/plugin/tui`、`api.slots.register`）**不**在公开文档中，不保证在不同 OpenCode 版本间稳定。
- `instructions` 条目按字面匹配（`.md` 后缀），不做 glob 展开。
- token 数是基于模型编码（`cl100k_base`）的估算值，并非对每个模型都精确。

## 许可证

MIT
