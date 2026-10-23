# OpenCode File Tree

[![npm](https://img.shields.io/npm/v/opencodev2-file-tree.svg)](https://www.npmjs.com/package/opencodev2-file-tree)
[![license](https://img.shields.io/npm/l/opencodev2-file-tree.svg)](./LICENSE)

OpenCode 2 的终端侧边栏文件树插件：浏览目录、预览文件、文件内搜索、Git 左右对比，并把选中的代码一键加入聊天输入框。

## 功能

- **侧边栏文件树**：按需展开目录，双击预览文件，右键复制绝对路径。
- **只读文件预览**：跟随当前 OpenCode 主题，带语法高亮、行号、文件路径和 Git 状态。
- **文件内搜索**：不区分大小写的字面匹配，自动定位并循环切换结果。
- **Git 左右对比**：左侧 HEAD、右侧工作区，增删高亮、行号与同步滚动。
- **加载到聊天**：拖选代码 → 右键 → `Add to chat`，把绝对路径和所选代码写入聊天输入框。
- **自适应弹窗**：预览居中显示；开启 Git 对比时自动加宽，关闭后恢复。
- **文件信息**：分支、换行符、文件大小、行数与语言。

## 安装

要求 OpenCode 2（CLI / TUI）。

```bash
opencode plugin add opencodev2-file-tree
```

也可以手动在全局 `~/.config/opencode/opencode.json` 的 `plugins` 数组中加入包名：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencodev2-file-tree"]
}
```

- Windows 全局配置：`%USERPROFILE%\.config\opencode\opencode.json`
- 设置了 `XDG_CONFIG_HOME` 时：`$XDG_CONFIG_HOME/opencode/opencode.json`

重启 OpenCode（或执行 `opencode service restart`），打开会话侧边栏即可看到 **Files**。

插件同时提供 `./tui` 入口，OpenCode 的 CLI 会自动加载，不需要再改 `cli.json`。

## 使用

### 文件树

| 操作 | 功能 |
| --- | --- |
| 单击目录 | 展开或折叠 |
| 双击文件 | 打开文件预览 |
| 右键文件 | 复制文件绝对路径 |
| 点击标题行右侧 `Refresh` | 清除目录缓存并重新读取，同时折叠已展开目录 |

文件树读取当前会话位置对应的本地目录，目录优先排列。

### 文件预览

| 操作 | 功能 |
| --- | --- |
| 滚轮 / 方向键 | 滚动内容 |
| 拖选代码 | 选中并高亮（双击选词） |
| 右键选中内容 → `Add to chat` | 把绝对路径和所选代码写入聊天输入框 |
| `Ctrl+F` | 打开文件搜索；在 Git 对比中按下则返回文件视图 |
| `Enter` / `Shift+Enter` | 搜索时跳到下一个 / 上一个匹配 |
| `Ctrl+G` 或右上角 `Git diff` | 开启或关闭 Git 对比 |
| `Esc` | 关闭右键菜单；退出搜索；未搜索时关闭预览 |

搜索使用字面匹配，不解析正则；输入后自动定位首个结果，搜索栏以 `当前序号/总数` 显示，到头后循环。

### Git 对比

对比展示当前文件相对于 HEAD 的差异，包含暂存和未暂存修改；新增文件左侧为空。

开启对比时弹窗自动加宽，为左右两栏留出空间，窗口缩放时同步调整；关闭对比或进入搜索后恢复普通预览宽度。

差异优先通过 OpenCode VCS 接口获取；接口未返回当前文件的修改或调用失败时，回退到本地 `git` 命令。文件没有修改或 Git 读取失败时会显示对应提示。

### 加载到聊天

在预览中拖选代码（双击可选词），在选区上右键弹出菜单：

```text
╭────────────────────────────╮
│ + Add to chat              │
│   12 lines · path + code   │
╰────────────────────────────╯
```

标题栏为操作名称，副标题显示本次选中的行数和插入格式。鼠标悬停时边框与底色提亮；`Esc`、点击代码区、打开搜索或切换 Git 对比都会关闭菜单。

点击后，以下内容会追加到聊天输入框末尾，并保留原始缩进：

    D:\project\src\app.ts

    ```typescript
    export function greet(name: string) {
      return `Hello, ${name}`
    }
    ```

插入成功后预览关闭、焦点回到输入框，并提示 `Added to chat`，内容可继续编辑或直接发送。

如果定位不到聊天输入框（例如还没进入会话），所选内容会复制到剪贴板，并提示手动粘贴。

## 语法高亮

基于 tree-sitter，颜色来自当前 OpenCode 主题。

| 类型 | 语言 |
| --- | --- |
| 内置 | JavaScript、TypeScript、JSX、TSX、Markdown、Zig |
| 按需下载 | Go、Python、Rust、JSON、Bash、CSS、YAML、TOML |

- 按需语法首次使用时从 GitHub 获取并缓存到磁盘。
- 启动 OpenCode 前设置 `FILE_TREE_NO_REMOTE_GRAMMARS=1` 可禁用远程下载；内置语法仍可用。

## 限制

- 预览只读，不支持编辑或保存。
- 单个文件最多预览 **1 MiB**，二进制文件显示提示。
- 文件读取和路径复制发生在运行终端插件的本机，不通过服务端读取远程文件。
- 默认跳过 `.git`、`node_modules`、`.next`、`dist`、`build`、`coverage`、`target`。
- 文件树限制展开深度和条目数量，侧边栏最多显示 45 行，并按终端高度缩减。
- “加载到聊天”依赖 TUI 的编辑器接口。OpenCode 2.1 尚未提供插件级聊天输入框 API，宿主升级后可能需要适配；找不到输入框时会退化为复制到剪贴板。

## 开发

```bash
npm install      # 自动执行 npm run build
npm run build    # 重新编译 dist/
npm run typecheck
npm pack --dry-run
```

TUI 入口源码是 `src/tui.tsx`，但 npm 包导出的是编译后的 `dist/tui.js`。原因是 OpenCode 宿主只对 `node_modules` 之外的 `.tsx` 应用 OpenTUI 的 Solid JSX 转换；直接发布 `.tsx` 会在安装后落到 Bun 默认的 React JSX 运行时，报 `Cannot find package 'react'`。`tsconfig.json` 的 `jsxImportSource` 和文件头部注释只影响类型检查，不能替代编译。

修改 `src/` 后需要 `npm run build` 再重启 OpenCode。开发时也可以在 `opencode.json` 的 `plugins` 中直接写插件目录，但同样读取 `dist/tui.js`。

### 项目结构

```text
src/
  index.ts           服务端插件入口
  tui.tsx            文件树、预览弹窗与交互
  preview-search.ts  搜索匹配与位置计算
  preview-git.ts     本地 Git 差异查询
scripts/
  build.mjs          Solid + TypeScript 预编译，输出到 dist/
dist/                发布产物（npm run build 生成，不提交）
index.ts             本地目录插件的服务端转发入口
tui.ts               本地目录插件的 TUI 转发入口
```

### 版本与依赖

- `@opencode/plugin` 与宿主版本对齐（`2.1.2`）。
- `@opentui/core`、`@opentui/solid`、`solid-js` 作为 peer 依赖，由 OpenCode 提供；本地开发时通过 devDependencies 安装。
- OpenTUI 0.6 要求 `SyntaxStyle` 显式绑定资源归属，插件传入 `renderer.nativeScene`。

### 发布

```bash
npm version patch
npm publish
```

`npm publish` 会通过 `prepare` 自动执行 `npm run build`，打包内容包含 `dist/`、`src/`、`tsconfig.json`、`README.md`、`LICENSE` 和 `package.json`。

包名为 `opencodev2-file-tree`。npm 要求账号启用 2FA，发布时按提示完成浏览器 / Windows Hello 验证。

### 已知实现细节

OpenCode 2.1 尚未暴露写入聊天输入框的插件 API（`context.ui.prompt`）。插件在打开预览时记录 `renderer.currentFocusedEditor`，通过编辑器的 `insertText` 追加内容，与宿主处理 `tui.prompt.append` 的方式一致；宿主提供官方接口后应改为调用官方接口。

## License

[MIT](./LICENSE)
