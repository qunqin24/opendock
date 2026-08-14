# Agent Launcher + OpenCode Diff Viewer

[![npm version](https://img.shields.io/npm/v/opencode-diff-viewer.svg)](https://www.npmjs.com/package/opencode-diff-viewer)
[![npm downloads](https://img.shields.io/npm/dm/opencode-diff-viewer.svg)](https://www.npmjs.com/package/opencode-diff-viewer)

一个 CLI 工具，用于在 tmux 中启动各种 AI Agent 工具，并提供 OpenCode diff 查看插件。

## 功能特性

### CLI 工具
- 🚀 **一键启动** - 在 tmux 中启动 OpenCode、Claude CLI、Codex CLI 等
- 🔧 **自动安装 tmux** - 自动检测并安装 tmux
- 📊 **会话管理** - 列出、附加、终止 tmux 会话
- ⚙️ **可配置** - 支持自定义工具配置

### OpenCode 插件
- ✨ **自动安装 lumen** - 插件会自动检测并安装 lumen
- 📝 **/diff 命令** - 快速查看代码变更
- 🤖 **LLM 工具集成** - LLM 可自动调用 `view_diff` 工具

## 安装

```bash
# npm
npm install -g opencode-diff-viewer

# pnpm
pnpm add -g opencode-diff-viewer

# bun
bun add -g opencode-diff-viewer
```

## CLI 使用方法

### 启动 AI 工具

```bash
# 启动 OpenCode
diffviewer opencode

# 启动 Claude CLI
diffviewer claude

# 启动 Codex CLI
diffviewer codex

# 查看 git diff
diffviewer diff
```

### 会话管理

```bash
# 列出所有工具
diffviewer list

# 查看运行中的会话
diffviewer status

# 附加到会话
diffviewer attach opencode

# 终止会话
diffviewer kill opencode
```

### 查看帮助

```bash
diffviewer --help
```

## OpenCode 插件配置

### 1. 配置 OpenCode

创建或编辑 `~/.config/opencode/opencode.json`：

```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "command": {
    "diff": {
      "template": "View git diff using lumen in tmux.",
      "description": "View diff of modified files using lumen TUI"
    }
  },
  "plugin": ["opencode-diff-viewer"]
}
EOF
```

### 2. 在 tmux 中启动 OpenCode

```bash
# 使用 CLI 启动
diffviewer opencode

# 或使用启动脚本
opencode-diff-viewer
./start-opencode.sh
```

### 3. 使用 /diff 命令

在 OpenCode TUI 中输入：

```bash
/diff              # 查看所有修改文件的 diff
/diff src/app.ts   # 查看指定文件的 diff
```

## tmux 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+B` 然后 `D` | 分离会话 |
| `Ctrl+B` 然后 `?` | 查看帮助 |
| `Ctrl+C` | 终止会话 |

## lumen 快捷键

| 快捷键 | 功能 |
|--------|------|
| `j` / `k` 或 `↑` / `↓` | 上/下移动 |
| `{` / `}` | 跳转到上/下一个变更块 |
| `Tab` | 切换侧边栏 |
| `e` | 在编辑器中打开文件 |
| `q` | 退出 |

## 自定义工具配置

创建 `~/.config/diffviewer/config.json` 添加自定义工具：

```json
{
  "tools": {
    "custom": {
      "name": "Custom Tool",
      "command": "custom-command",
      "description": "My custom tool",
      "install": "npm install -g custom-tool"
    }
  }
}
```

## 前置条件

### tmux

CLI 会自动安装 tmux。如果失败，手动安装：

```bash
brew install tmux
# or
apt install tmux
```

### lumen（用于 OpenCode 插件）

插件会自动安装 lumen。如果失败，手动安装：

```bash
brew install jnsahaj/lumen/lumen
# or
cargo install lumen
```

## 项目结构

```
opencode-diff-viewer/
├── bin/
│   └── diffviewer          # CLI 入口
├── start-opencode.sh       # 启动脚本
├── src/
│   ├── index.ts            # OpenCode 插件
│   └── command-diff.md     # /diff 命令定义
├── dist/                   # 编译输出
├── package.json            # npm 配置
└── tsconfig.json           # TypeScript 配置
```

## 开发

```bash
# 克隆项目
git clone https://github.com/AruNi-01/opencode-diff-viewer.git
cd opencode-diff-viewer

# 安装依赖
npm install

# 构建
npm run build

# 链接本地包
npm link -g opencode-diff-viewer

# 测试 CLI
./bin/diffviewer opencode
```

## 发布

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm publish
```

## 依赖

- [tmux](https://github.com/tmux/tmux) - 终端复用器
- [lumen](https://github.com/jnsahaj/lumen) - TUI Diff 查看器
- [@opencode-ai/plugin](https://www.npmjs.com/package/@opencode-ai/plugin) - OpenCode 插件 SDK

## License

MIT

## 作者

[AarynLu](https://github.com/AruNi-01)
