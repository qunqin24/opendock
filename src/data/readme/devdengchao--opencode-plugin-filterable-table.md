# OpenCode Filterable Table

让 OpenCode Desktop 会话中的 Markdown 表格支持按列筛选。

<p align="center">
  <img src="https://raw.githubusercontent.com/DevDengChao/opencode-plugin-filterable-table/main/docs/preview.jpg" alt="在 OpenCode 会话中筛选 Markdown 表格" width="900">
</p>

<p align="center">
  <sub>在「任务数」列取消勾选 1 后，表格只保留 3 行；底部会显示当前行数，并提供「清除全部筛选」。</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@devdengchao/opencode-plugin-filterable-table">
    <img alt="npm" src="https://img.shields.io/npm/v/@devdengchao/opencode-plugin-filterable-table">
  </a>
  <a href="https://github.com/DevDengChao/opencode-plugin-filterable-table/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/DevDengChao/opencode-plugin-filterable-table/actions/workflows/ci.yml/badge.svg">
  </a>
  <img alt="OpenCode Desktop" src="https://img.shields.io/badge/OpenCode%20Desktop-2.2.x-111">
  <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

<p align="center">
  <a href="./README.md"><strong>简体中文</strong></a> · <a href="./README.en.md">English</a>
</p>

OpenCode 会话里经常出现 Markdown 表格。这个插件会在每个表头右侧加一个漏斗按钮，点开后可以勾选要保留的值，只显示匹配的行。

筛选只发生在当前会话的显示层，不会修改原始 Markdown，也不会改动会话数据。

## 功能

- **表头即入口**：不用打开额外面板，直接在列标题上筛选
- **多选**：同一列可以同时保留多个值
- **搜索**：候选值较多时可以按文本搜索
- **全选 / 全不选 / 重置**：快速调整当前列
- **多列组合**：列与列之间按 AND 组合，同一列内多个值按 OR 组合
- **行数状态**：表格下方显示「显示 X / Y 行」，并可一键清除当前表格的全部筛选
- **空值处理**：空单元格显示为「（空）」，可以像普通值一样勾选或排除
- **主题与语言**：跟随 OpenCode 的亮色/暗色主题和中文/英文界面
- **状态保留**：消息重新渲染或虚拟滚动导致卸载再挂载后，筛选条件会尽量恢复
- **命令面板**：可以运行「清除所有表格筛选」

## 快速开始

### 环境要求

- OpenCode Desktop **2.2.x**（本项目在 2.2.1 上开发和验证）
- 使用 npm 安装时不需要额外安装 Node.js
- 从源码构建时需要 Node.js **20.19+** 和 npm
- Windows、macOS 或 Linux 上的 OpenCode Desktop

### 从 npm 安装（推荐）

包名：

```text
@devdengchao/opencode-plugin-filterable-table
```

在全局配置文件 `~/.config/opencode/opencode.jsonc` 中加入插件。Windows 上通常是
`C:\Users\<用户名>\.config\opencode\opencode.jsonc`：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@devdengchao/opencode-plugin-filterable-table"
  ]
}
```

也可以固定版本：

```jsonc
"plugins": [
  "@devdengchao/opencode-plugin-filterable-table@0.1.1"
]
```

OpenCode 会从 npm 安装并加载这个包，不需要克隆仓库或手动构建。

保存后如果 GUI 没有重新加载，可以重启 Desktop，或在 **Settings > Extensions > Plugins**
中确认 `opencode-plugin-filterable-table` 已启用。

### 从源码安装（开发）

```bash
git clone git@github.com:DevDengChao/opencode-plugin-filterable-table.git
cd opencode-plugin-filterable-table
npm ci
npm run build
```

构建产物为 `dist/gui.cjs`。然后把全局配置指向本地目录：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "file:///absolute/path/to/opencode-plugin-filterable-table"
  ]
}
```

Windows 上路径示例：`file:///E:/my/open-source/opencode-plugin-filterable-table`。

开发时可以加上调试选项，把扫描到的表格数量输出到 Desktop 的 renderer 日志：

```jsonc
{
  "plugins": [
    {
      "package": "@devdengchao/opencode-plugin-filterable-table",
      "options": {
        "debug": true
      }
    }
  ]
}
```

本地源码调试时，把 `package` 换成 `file:///...` 目录即可。

## 使用

1. 打开一个包含 Markdown 表格的会话。
2. 把鼠标移到表头，右侧会出现漏斗图标。
3. 点击漏斗，勾选要保留的值。表格会立即只显示符合条件的行。
4. 其他列可以继续叠加筛选。
5. 值较多时，下拉顶部会出现搜索框。
6. 表格下方出现「显示 X / Y 行」时，点击「清除全部筛选」可以恢复整张表。
7. 也可以在命令面板中运行「清除所有表格筛选」。

空值会显示为「（空）」。长文本会在下拉中截断显示，完整值放在悬停提示里。

## 兼容性

- 当前验证版本：**OpenCode Desktop 2.2.1**
- 依赖 OpenCode Desktop 的 GUI 插件 API；该 API 目前仍是 **experimental**
- 只处理会话时间线中的 Markdown 表格
- **不支持 TUI**。TUI 插件只能按代码块语言注册自定义渲染器，无法自动增强普通 Markdown 表格

> 如果 OpenCode 修改了 Markdown 表格的 DOM 结构，这个插件可能需要适配。相关选择器集中在
> `src/table-filter.ts`，便于后续维护。

## 工作原理

OpenCode Desktop 会把 Markdown 表格渲染成类似下面的结构：

```html
<div data-component="markdown-table">
  <table>...</table>
</div>
```

插件监听会话时间线容器 `[data-slot="session-timeline-scroll"]`，用 `MutationObserver` 发现表格，
在 `<th>` 中注入筛选按钮，并通过挂在 `document.body` 上的 `position: fixed` 浮层显示下拉，
避免被表格外层的 `overflow-x: auto` 裁剪。

筛选状态按会话消息 part 保存，因此表格重新渲染或时间线虚拟滚动时，条件会尽量恢复。插件只修改
DOM 的显示状态，不写入会话内容。

## 开发

```bash
npm run demo       # 浏览器独立演示页，默认 http://localhost:5173
npm run typecheck  # TypeScript 类型检查
npm run test       # jsdom 单元测试
npm run build      # 构建 dist/gui.cjs
npm run dev        # 监听构建，Desktop 会自动重载 GUI 部分
```

本地调试时，把全局配置中的 `plugins` 指向本项目目录。修改源码后运行 `npm run dev` 或
`npm run build`，Desktop 会监听 `dist/gui.cjs` 并重新加载 GUI 部分。

### 文件结构

```text
src/
├─ index.ts          # server 入口：提供插件 id，输出加载日志
├─ gui.ts            # GUI 入口：注入样式、注册命令、安装表格增强
├─ table-filter.ts   # 表格扫描、状态、筛选和 MutationObserver
├─ popover.ts        # 表头下拉的 DOM 与交互
├─ labels.ts         # 中文/英文文案
└─ styles.css        # 使用 OpenCode 主题变量的样式
demo/                # 浏览器演示页
tests/               # jsdom 单元测试
```

## 常见问题

### 表头没有出现漏斗图标

请依次检查：

1. OpenCode Desktop 是否为 2.2.x。
2. **Settings > Extensions > Plugins** 中插件是否已启用。
3. 表格是否位于会话时间线中，而不是设置页、侧边栏或普通网页。
4. 如果是本地源码安装，确认已经执行过 `npm run build`，并且 `dist/gui.cjs` 存在；如果是 npm 安装，确认包已成功安装。
5. 打开调试选项后查看 Desktop renderer 日志中是否有 `[filterable-table]` 输出。

### 修改代码后没有生效

运行 `npm run build`，或保持 `npm run dev` 运行。Desktop 监听的是 `dist/gui.cjs`，不是 `src/`
下的源文件。

### 筛选会修改原始 Markdown 吗？

不会。插件只改变当前页面上的可见行，不改 Markdown、不改数据库，也不影响其他客户端。

### 支持 TUI 吗？

不支持。TUI 的表头内嵌下拉目前没有对应的插件扩展点。

## 已知限制

- 只增强会话时间线中的表格，不增强设置页、侧边栏等位置的普通表格。
- 筛选是显示层效果；被隐藏的行不会出现在选区复制结果中。
- 单元格按可见文本匹配。一个单元格包含多个值时，会作为整体值处理。
- 筛选状态保存在内存中，插件重载或 Desktop 重启后会清空。
- 依赖 OpenCode Desktop 当前的 DOM 结构，升级后可能需要适配。

## 参与贡献

欢迎提交 Issue 和 Pull Request。开发、测试和提交规范见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

- [问题反馈](https://github.com/DevDengChao/opencode-plugin-filterable-table/issues)
- [npm 包](https://www.npmjs.com/package/@devdengchao/opencode-plugin-filterable-table)
- [更新日志](./CHANGELOG.md)
- [English README](./README.en.md)

## License

[MIT](./LICENSE) © 2026 DevDengChao

如果这个插件对你有帮助，欢迎给仓库点一个 Star。
