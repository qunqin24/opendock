[English](./README.md) | 简体中文

# opencode-threads

OpenCode TUI 插件：在侧边栏列出当前项目的会话，并把子代理（subagent）会话折叠在派发它的会话下面。

需要 **OpenCode 2.x**（v2 插件 API）。

Fork 自 [Mangome/opencode-sessions-sidebar](https://github.com/Mangome/opencode-sessions-sidebar)，与上游的差异见[下方](#与上游的差异)。

## 功能

- **会话列表**：显示当前项目最近更新的最多 10 个会话（可配置）
- **子代理会话**：子会话挂在父会话下面，默认折叠；展开后用 `├` / `└` 连接符标注，并压暗显示，一眼能看出是从属关系
- **点击切换**：点任意会话直接跳转
- **当前会话标记**：正在看的会话用主题的 success 色圆点标出
- **运行指示**：正在生成回复的会话显示盲文 spinner，子会话同样适用
- **按项目隔离**：只显示当前会话所在目录下的会话
- **实时刷新**：从服务端加载，并监听 `session.created` / `session.renamed` / `session.deleted`
- **面板可折叠**：点标题栏折叠/展开，标题显示会话数，状态跨重启保留
- **斜杠命令**：`/sessions-count` 设置最多显示多少个会话
- **原生外观**：无边框，直接使用主题色，与内置 MCP 侧边栏块一致

## 安装

```bash
opencode plugin add opencode-threads
```

也可以手动加进配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-threads"]
}
```

重启 OpenCode，进入任意会话，侧边栏就会出现这个面板。

## 用法

子代理会话默认收起，展开父会话才看得到。你正在看的会话一定可见：进入子会话时，它的父会话会自动展开并被提到可见范围内。

点 `├` / `└` 连接符只切换展开，点行内其它位置才是跳转会话。

## 斜杠命令

| 命令 | 说明 |
|------|------|
| `/sessions-count` | 设置最多显示的会话数（1-100） |

命令面板（`Ctrl + P`）里也有同一项：`Sessions: Set Max Count`。

## 与上游的差异

上游有意隐藏子代理会话，和内置会话列表保持一致。代价是看不出自己正处在哪个子会话里，也看不出某个父会话派发过什么。

这个 fork 默认同样安静——子会话是折叠的——但允许展开，并且在你查看子会话时始终把父会话露出来。

实现上的几点：

- 会话一次拉全量，本地按 `parentID` 分组，而不是每个父会话发一次请求
- 拉取上限提到 500，因为现在响应里也含子会话；这个上限只影响列表能回溯多远
- 展开状态存在独立的 storage key，不会和面板状态互相干扰

## 开发

```bash
npm install
npm run build      # tsc + esbuild，src/index.tsx -> dist/tui.js
npm run typecheck
```

本地检出可以直接加载，不用发布，配置指向目录即可：

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-threads"]
}
```

## 许可证

MIT。原始作品版权归 Mangome（2026），修改部分归 whoisay（2026）。
