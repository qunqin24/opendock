# OpenCode Search in Session

<p align="center">
  <a href="https://www.npmjs.com/package/@devdengchao/opencode-plugin-search-in-session">
    <img alt="npm" src="https://img.shields.io/npm/v/@devdengchao/opencode-plugin-search-in-session">
  </a>
  <img alt="OpenCode Desktop" src="https://img.shields.io/badge/OpenCode%20Desktop-2.2.x-111">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

在 OpenCode Desktop 的当前会话中搜索关键词，支持按内容范围过滤、命中计数、上下导航、高亮，以及“仅显示匹配内容”。

OpenCode Desktop 2.2.x 已经自带一个 Ctrl+F 文本搜索，但它只扫描用户消息和助手回复的文本。这个插件是增强版：

- 同时搜索用户输入、助手回复、思考过程、工具调用、工具结果和终端命令
- 支持空格分隔的多关键词、引号短语和排除词
- 每个范围显示命中数，可单独关闭
- 命中项使用 CSS Custom Highlight API 高亮
- 上下键 / Enter 在命中项之间导航
- 一键隐藏不相关内容，缩短虚拟时间线的滚动范围
- 面板关闭后可以保留筛选状态，并在标题栏显示筛选 chip
- 打开搜索时自动加载完整会话历史

## 预览

<p align="center">
  <img src="https://raw.githubusercontent.com/DevDengChao/opencode-plugin-search-in-session/main/docs/preview.jpg" alt="在 OpenCode 会话中搜索 github，显示 193 处命中" width="900">
</p>

<p align="center">
  <sub>在会话中搜索 <code>github</code>：193 处命中、33 个片段，并按用户、回复、思考、工具调用和工具结果分类统计。</sub>
</p>

也可以打开交互式预览：[docs/preview.html](./docs/preview.html)。

## 快速开始

### 环境要求

- OpenCode Desktop **2.2.x**（在 2.2.1 上开发和验证）
- 使用 npm 安装时不需要额外安装 Node.js
- 从源码构建时需要 Node.js 20.19+ 和 npm

### 从 npm 安装（推荐）

在全局配置 `~/.config/opencode/opencode.jsonc` 中加入插件：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-search-in-session"
  ]
}
```

也可以固定版本：

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-search-in-session@0.1.0"
]
```

OpenCode 会从 npm 安装并加载这个包，不需要克隆仓库或手动构建。

保存后如果 GUI 没有重新加载，可以重启 Desktop，或在 **Settings > Extensions > Plugins** 中确认插件已启用。

### 从源码安装（开发）

```bash
git clone git@github.com:DevDengChao/opencode-plugin-search-in-session.git
cd opencode-plugin-search-in-session
npm install
npm run build
```

构建产物为 `dist/gui.cjs`。把全局配置指向本地目录：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///E:/my/open-source/opencode-plugin-search-in-session"
  ]
}
```

Windows 上路径示例：`file:///E:/my/open-source/opencode-plugin-search-in-session`。

## 使用

1. 打开一个会话。
2. 按 `Ctrl+F`（macOS 为 `Cmd+F`）打开搜索面板，焦点会自动进入输入框；面板已展开时再次按 `Ctrl+F` 会关闭面板。
3. 输入关键词，面板会显示 `当前/总数` 和每个范围的命中数。
4. 用 `↑` / `↓`、Enter、Shift+Enter 或面板按钮切换命中项。
5. 点击范围复选框可以只搜索某几类内容。
6. 打开“仅显示匹配内容”后，时间线只保留命中的行。
7. 按 Esc 关闭面板；如果筛选仍开启，标题栏会显示 `筛选中 … ×`，点击可以重新打开面板，点击 × 清除筛选。

### 查询语法

| 输入 | 含义 |
| --- | --- |
| `search plugin` | 同一片段内同时包含 `search` 和 `plugin` |
| `"tool output"` | 精确短语 |
| `search -reasoning` | 排除包含 `reasoning` 的片段 |
| `"foo \"bar\""` | 短语中的转义引号 |

默认忽略大小写。多个关键词按 AND 组合；排除词只要求不出现，不参与命中计数。

### 搜索范围

- 用户输入
- 助手回复
- 思考过程
- 工具调用（工具名和输入参数）
- 工具结果（文本输出、文件名、错误信息）
- 终端命令（命令和输出）

## 与内置 Ctrl+F 的关系

插件在 `window` 的 capture 阶段监听 `Ctrl+F`，优先打开自己的面板，并关闭已经打开的内置搜索条。这样可以在不修改 OpenCode 源码的情况下提供增强搜索。

同时注册了一个普通命令“在会话中搜索”，默认快捷键为 `mod+shift+f`，可在 **Settings > Shortcuts** 中修改，也可以从命令面板运行。`Ctrl+F` 作为固定别名，避免和内置 `session.search` 在设置里产生重复快捷键。

## 实现说明

- 搜索索引来自 `session.server.data.session.message.list(session.id)`，不依赖当前 DOM，所以虚拟滚动卸载的消息仍然能统计到。
- 命中后通过 part id 找到时间线中的内容；如果内容在折叠的工具组里，会先展开组，再滚动到具体 part。
- 用户消息、助手文本和思考过程使用 Range + CSS Custom Highlight API 高亮。
- 对于界面没有渲染的 tool 结果（例如 webfetch 的网页正文），仍然会计数和定位到工具调用，并用外框标出对应 part。
- 筛选模式给不匹配的虚拟行加 `data-sis-hidden`，让 TanStack Virtual 的 ResizeObserver 把行高测成 0，从而压缩滚动范围。
- 停止自动跟随最新内容的方式是向时间线发送一个向上的 wheel 事件，避免搜索跳转被“自动滚动到底部”覆盖。

## 开发

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

`npm run dev` 会监听 `dist/gui.cjs`，Desktop 会自动重新加载 GUI 部分。

### 文件结构

```text
src/
├─ index.ts                 # server 入口
├─ gui.tsx                  # GUI 入口：快捷键、命令、面板挂载
├─ controller.ts            # 搜索状态、消息索引、计数、历史加载
├─ labels.ts                # 中英文文案
├─ search/
│  ├─ tokenize.ts           # 空格/引号/排除词解析
│  ├─ parts.ts              # message -> SearchPartRecord
│  ├─ match.ts              # AND 匹配、范围过滤、计数
│  └─ types.ts
├─ timeline/
│  ├─ selectors.ts          # 时间线 DOM 选择器和 part 查找
│  ├─ highlight.ts          # Range + CSS Highlights
│  ├─ filter.ts             # 行隐藏/恢复
│  └─ reveal.ts             # 展开、滚动、历史加载
└─ ui/
   ├─ panel.tsx
   ├─ header.tsx
   └─ styles.css
tests/                       # vitest + jsdom
docs/preview.jpg             # README 预览图
docs/preview.html            # 交互式 UI 预览
```

## 已知限制

- 依赖 OpenCode Desktop 当前的时间线 DOM 结构；Desktop 升级后可能需要适配。
- 工具结果只有在界面实际渲染文本时才能高亮；未渲染的结果会定位到工具调用并用外框提示，导航时按一个片段处理，避免在同一个 webfetch 结果里逐个跳过成千上万个无法高亮的命中。
- 单次搜索最多保留 25,000 个可导航命中，计数仍然是完整值；极端关键词（例如单个字母）可能触发上限。
- 筛选模式依赖虚拟列表测量隐藏行；滚动范围会随着行被测量逐步压缩。
- 搜索打开时会加载完整历史，超大会话可能需要几秒钟。
- 不支持 TUI。

## License

[MIT](./LICENSE) © 2026 DevDengChao
