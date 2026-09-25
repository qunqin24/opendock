# opencode-timeline-plugin

OpenCode TUI 对话历史导航：在侧边栏以时间线列出当前会话的用户消息，最新在最上，点击直达主视图对应位置（对标原生 `/timeline`）。

> 技术栈：TypeScript + Solid + OpenTUI，运行于 OpenCode TUI 插件宿主（`@opencode-ai/plugin/tui`）。

## 功能

- 侧边栏时间线：`[角色图标] 摘要（30字符截断） HH:MM`，只收录用户消息（assistant / tool 噪音已过滤），最新在最上
- **点击某行**：选中 + 主会话视图滚动到该消息（复刻原生 `/timeline`：官方 `scrollToMessage` 优先，渲染树 best-effort 兜底）
- **`⤓ 回到底部`**：主会话视图一键滚回最新处
- 显示层 render 期间直读 `api.state`（与原生 Context/MCP/LSP 区块同款宿主订阅），进会话自动刷新，无需手动操作
- 上次选中经 `api.kv` 持久化，重启可恢复

| 操作 | 效果 |
| ---- | ---- |
| 点击行 | 选中 + 跳转到该消息 |
| `⤓ 回到底部` | 主会话视图滚到最新处 |
| `Alt+U` | 显示 / 隐藏面板 |

## 安装

```bash
opencode plugin @memef1f1y/opencode-timeline-plugin@latest
```

重启 opencode TUI 即可（不要加 `--pure`，那会禁用外部插件）。

本地开发版（改完即用，不用发包）：

```bash
git clone https://github.com/1624318455/opencode-timeline-plugin.git
cd opencode-timeline-plugin
npm install
```

然后在 `tui.json` 里用文件路径引用（见下）。

## 配置

`~/.config/opencode/tui.json`（全局，所有项目共用）或 `<你的项目>/.opencode/tui.json`（仅单个项目）：

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    // npm 包写法（推荐）
    ["@memef1f1y/opencode-timeline-plugin@latest", { "maxItems": 50 }],
    // 本地文件写法（开发调试，路径必须是绝对路径）
    // ["/绝对路径/opencode-timeline-plugin/src/panel.tsx", { "maxItems": 50 }]
  ],
  // 按插件 id 开关，默认全启用。关闭本插件：
  // "plugin_enabled": { "timeline.viewer": false }
}
```

| 参数 | 含义 | 默认 |
| ---- | ---- | ---- |
| `maxItems` | 列表最多显示的用户消息数，超出的旧消息收起并计数 | `50` |
| `debug` | 在面板顶部多渲染一行诊断快照（排查用） | 关闭 |

> 本仓库自带的 `tui.json` 只是本地调试示例，OpenCode 不会读它。

## 使用

1. `opencode` 启动 TUI 并进入一个会话，侧边栏出现 `Timeline` 面板。
2. 鼠标**点击某行**跳转到主视图对应消息；点 **`⤓ 回到底部`** 回到最新处；`Alt+U` 显示/隐藏。
3. 发一条新消息，列表自动置顶（最新在最上）。

## 环境要求

- `opencode >= 1.0`（已验证 `1.18.30` ~ `1.18.32`）
- Node 18+，npm 9+（或 bun 1.0+）
- macOS / Linux / WSL 均可；Windows 原生终端注意 `Alt+U` 可能被终端占用
- 鼠标点击需要终端开启鼠标支持（能点侧边栏标题折叠即正常）

## 开发

```bash
git pull
npm install        # 依赖有变化时才需要
npm run typecheck  # 期望：无输出即通过
# 重启 opencode 即可（tui.json 改了也要重启，不热重载）
```

## 排错 FAQ

| 现象 | 检查 |
| ---- | ---- |
| 面板没出现 | 包是否装上（`opencode plugin` 列表里有没有）；文件写法下路径是否为**绝对路径**；启动日志有无 `loading tui config` / ERROR |
| 点击没反应 | 终端鼠标是否可用；是否进了会话（home 页侧边栏没有 session 上下文） |
| 跳转提示无滚动 API | 会话太老的消息可能不在本地渲染树里（TUI 只加载最近约 20 条分页），先 `⤓ 回到底部` 再试 |
| `npm run build` 失败 | 预期行为，当前只有 `typecheck`，`build` 是占位脚本 |

## 项目结构

```
├── package.json          # exports["./tui"] 指向 ./src/panel.tsx
├── tsconfig.json         # jsxImportSource @opentui/solid
├── tui.json              # 本地调试示例（非真实配置）
└── src/
    ├── panel.tsx         # 插件入口：slots.register(sidebar_content)，只做接线
    ├── types.ts          # TimelineNode / truncate / roleIcon / formatTime
    ├── components/
    │   ├── TimelinePanel.tsx # 面板：宿主跟踪读 + 标题 + 回到底部按钮
    │   ├── Timeline.tsx      # scrollbox 列表 + 选中自动滚入视口
    │   └── NodeItem.tsx      # 单节点行渲染 + 点击跳转
    ├── hooks/
    │   ├── useMessages.ts    # 快照/订阅/轮询/选中/跳转记账
    │   └── useKeybind.ts     # Alt+U 图层注册与注销
    └── api/
        └── opencode.ts       # state/event/kv/toast/跳转封装
```

## 已知限制

1. 跳转是 best-effort：优先官方 `api.state.scrollToMessage`（若宿主提供），否则走渲染树查找（`findDescendantById` → 包围的 ScrollBox → `scrollChildIntoView`，等价原生 `scrollBy(child.y - scroll.y - 1)`），再否则 toast + kv 兜底。TUI 本地只加载最近约 20 条分页，太老的消息可能无渲染节点（上游同款限制）。
2. 键盘导航键（`↑/↓`/`Enter`）在输入框聚焦时归编辑器，到不了侧边栏——这是宿主 keymap 焦点优先级，预期行为；主交互是鼠标点击。
3. 树状视图：`TimelineNode.parentId/children` 已预留字段，UI 仍为线性。
