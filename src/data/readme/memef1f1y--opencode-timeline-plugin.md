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
| 点击标题栏 | 展开 / 收起列表 |
| `⤓ 回到底部` | 主会话视图滚到最新处 |

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
2. 侧边栏交互全走鼠标：**点击某行**跳转到主视图对应消息，点击**标题栏**展开/收起，点 **`⤓ 回到底部`** 回到最新处。面板常驻（开关已删）。
3. 发一条新消息，列表自动置顶（最新在最上）。

## macOS 说明

- **点了标题没反应**：先确认终端鼠标上报是否打开——能**点击折叠原生侧边栏区块**（Context/LSP/Todo/Files 标题）即正常；若原生区块也点不动，是终端没开鼠标报告（iTerm2：Preferences → Profiles → Terminal → Enable mouse reporting），与插件无关。若原生能点、Timeline 标题点了没反应，提 issue（0.1.5 已在 toggle 后手动请求重绘）。
- **显示 `暂无用户消息（会话共 N 条）`**：括号里就是原始消息总数。`共 0 条` = 宿主还没同步该会话历史（等几秒或重进会话）；`共 N 条（N>0）` = 有数据但无用户消息（该会话确实没发过言，或消息形态漂移，提 issue 请贴这行）。

## 环境要求

- `opencode >= 1.0`（已验证 `1.18.30` ~ `1.18.32`）
- Node 18+，npm 9+（或 bun 1.0+）
- macOS / Linux / WSL 均可
- 侧边栏交互全走鼠标（需要终端开启鼠标支持）；键盘只保留确认、关闭

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
| 点击没反应 | 先看原生侧边栏区块（Context/LSP/Todo/Files）点标题能否折叠：也不能=终端没开鼠标报告；能=提 issue（0.1.5 已加 toggle 后重绘） |
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
    │   ├── useKeybind.ts     # 开关/确认/关闭图层注册与注销（无方向键）
    │   └── useMouseTap.ts    # down/up 双通道点按（macOS release-only 终端兜底）
    └── api/
        └── opencode.ts       # state/event/kv/toast/跳转封装
```

## 已知限制

1. 跳转是 best-effort：优先官方 `api.state.scrollToMessage`（若宿主提供），否则走渲染树查找（`findDescendantById` → 包围的 ScrollBox → `scrollChildIntoView`，等价原生 `scrollBy(child.y - scroll.y - 1)`），再否则 toast + kv 兜底。TUI 本地只加载最近约 20 条分页，太老的消息可能无渲染节点（上游同款限制）。
2. 键盘只保留开关/确认/关闭，侧边栏选中与展开收起走鼠标点击——方向键在输入框有归属，抢过来会劫持输入历史，预期不注册。
3. 树状视图：`TimelineNode.parentId/children` 已预留字段，UI 仍为线性。
