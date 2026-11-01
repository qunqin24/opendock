# opencode-right-preview

OpenCode v2 TUI 插件：**右侧文件启动器面板**（文件浏览 / 快速打开到本地编辑器）。

在主会话里用 `@` 引用文件、或让 AI 读写文件后，这些文件会自动出现在右侧面板里；
**点击文件即调用本地编辑器打开**，不再在终端内渲染内容。支持从常用编辑器列表中
自由选择默认编辑器（`VS Code`、`Cursor`、`WebStorm`、`Vim`…）。

基于 OpenCode v2 官方 `session.panel` 槽位实现，纯 TSX、零构建步骤。

## 功能

- **三个视图**，`t` 循环切换：
  - `会话` —— 本次对话中涉及的所有文件（`@` 引用、AI 读取/创建/修改）
  - `文件` —— 项目目录树，懒加载、隐藏噪声目录、带过滤框
  - `变动` —— 变更追踪，`本轮`（本会话改动）/ `全部`（工作区 Git 变更）
- **点击文件 → 本地编辑器打开**：
  - 自动检测已安装的编辑器（`code` / `cursor` / `subl` / `vim`…在 PATH 上即被识别）
  - 也可手动选择：面板右上角点编辑器名，或命令面板 / `/editor`
  - 无 CLI 的 macOS 应用（WebStorm、PyCharm、TextEdit…）走 `open -a <应用>`
- **键盘**：`↑` `↓` 移动选中、`Enter` 打开、`t` 切视图、`s` 切范围、`f` 全屏、`esc` 关闭
- 三种入口：快捷键 `ctrl+x p`、命令面板、`/preview <路径>`
- 路径安全：只允许打开项目目录内的文件，阻止 `../` 路径穿越

## 安装

### 方式一：通过 OpenCode 插件命令安装（推荐，npm 管理）

```bash
opencode plugin add opencode-right-preview
```

### 方式二：从 GitHub 安装

```bash
opencode plugin add github:CR903/opencode-right-preview
```

### 方式三：手动配置

在 `~/.config/opencode/opencode.json` 或项目根目录的 `opencode.json` 中添加：

```json
{
  "plugins": ["opencode-right-preview"]
}
```

### 本地开发/源码安装

```bash
git clone git@github.com:CR903/opencode-right-preview.git
cd opencode-right-preview
bun install
bun run build            # 把 tui.tsx 编译为 dist/tui.js（npm 包发布的是编译后的纯 JS）

# 方式 A：复制到全局插件目录
cp -r opencode-right-preview ~/.config/opencode/plugins/opencode-right-preview

# 方式 B：配置本地路径
echo '{ "plugins": ["./path/to/opencode-right-preview"] }' > ~/.config/opencode/opencode.json
```

> 为什么 npm 包要预编译：opencode 从 npm 加载 TUI 插件时走 `exports["./tui"]`，
> 若指向 `.tsx`，宿主 bundler 会用默认 React JSX 转换而报 `Cannot find package 'react'`。
> 发布前用 `@opentui/solid/bun-plugin` 把 JSX 降级为 Solid `jsx()` 调用，即可被宿主直接加载。

### 更新插件

```bash
opencode plugin update opencode-right-preview   # 更新指定插件
opencode plugin update                          # 更新所有插件
opencode plugin check                           # 检查是否有新版
```

### 卸载插件

```bash
opencode plugin remove opencode-right-preview
```

## 使用

1. `ctrl+x p` 打开面板（或命令面板里选 “Open the file panel”）。
2. `会话` 标签列出本轮对话涉及的文件，**点击即在本地编辑器中打开**。
3. `/preview src/index.ts` 直接把指定文件丢给编辑器。
4. 点 `文件` 浏览整个项目，点 `变动` 看 AI 到底改了什么。
5. 想换编辑器：点面板右上角的编辑器名，或命令面板里选
   “选择打开文件的本地编辑器”（快捷键 `ctrl+x e`，斜杠命令 `/editor`）。

> 终端宽度不足约 80 列时宿主会强制全屏，这是 OpenCode 的行为，不是插件的 bug。

## 支持的编辑器

| 编辑器 | 识别方式 | 平台 |
|---|---|---|
| VS Code | `code`（PATH），回退 `open -a "Visual Studio Code"` | macOS / Linux |
| Cursor | `cursor`，回退 `open -a "Cursor"` | macOS / Linux |
| Windsurf | `windsurf`，回退 `open -a "Windsurf"` | macOS / Linux |
| Zed | `zed` | macOS / Linux |
| Sublime Text | `subl`，回退 `open -a "Sublime Text"` | macOS / Linux |
| WebStorm | `open -a "WebStorm"` | macOS |
| IntelliJ IDEA | `open -a "IntelliJ IDEA"` | macOS |
| PyCharm | `open -a "PyCharm"` | macOS |
| TextEdit | `open -a "TextEdit"` | macOS |
| Vim | `vim` | 任意 |
| Neovim | `nvim` | 任意 |

选择器会持久化到 `context.storage.store`；未选择时自动检测第一个可用的 CLI 编辑器。

## 工作原理

- **文件收集**
  - 用户消息的 `files[].source.uri`（`@` 引用）
  - AI 消息中已完成工具调用的 `state.input`（只取已知路径键）
  - `filesystem.changed` 事件（新建/修改的文件）
- **数据源**
  - `context.client.session.diff({ sessionID })` → `FileDiffInfo[]`（直接返回数组）
  - `context.client.vcs.diff({ mode: "working", location: { directory } })` → `{ data: FileDiffInfo[] }`
- **面板**：`context.ui.slot({ append: "session.panel" })` + `ui.panel.open("right-preview")`
- **打开编辑器**：`spawn(bin, [file], { detached: true, stdio: "ignore" })`，
  无 CLI 的应用走 `open -a`；二进制不在 PATH 时自动降级到 macOS 应用方式
- **状态**：`context.storage.store` 持久化（键名带 `.v4` 版本后缀）

## 为什么不做终端内预览

OpenCode 宿主的 `<code>` / `<markdown>` 渲染器在插件视图里无法可靠初始化
（tree-sitter client 不初始化、`<markdown>` 按作用域查不到样式），自建语法高亮
又会引入大量代码与性能坑。本插件定位改为**文件启动器**：点击文件 → 交给用户
熟悉的本地编辑器，职责单一、代码精简、不重复造轮子。

## License

MIT