# 🌳 opencode-dir-tree-tui

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/opencode-dir-tree-tui"><img src="https://img.shields.io/npm/v/opencode-dir-tree-tui" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/opencode-dir-tree-tui"><img src="https://img.shields.io/npm/dm/opencode-dir-tree-tui" alt="npm downloads per month"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

在 [OpenCode](https://opencode.ai) 终端侧栏浏览项目文件、查看 Git 变更、复制路径，并打开文件和文件夹。

![文件树演示](assets/demo.gif)

## 📦 安装／更新／卸载

要求 **OpenCode ≥ 2.0**，仅适用于终端界面（TUI）。

```bash
opencode plugin add opencode-dir-tree-tui
```

- 更新：`opencode plugin update opencode-dir-tree-tui`
- 卸载：`opencode plugin remove opencode-dir-tree-tui`

更新后若仍使用旧代码，请重启 TUI 客户端，而不是仅重启服务端。

V1 用户请固定使用 `opencode-dir-tree-tui@0.5.1`，参考 [V1 说明](https://github.com/aihaipeng/opencode-dir-tree-tui/blob/v0.5.1/README.zh-CN.md)。

## ⚙️ 设置

运行 `/dirtree-sidebar` 打开 **Dir Tree Sidebar（目录树侧边栏）**。用 `Tab` / `Shift+Tab` 或鼠标点击切换 **Settings（设置）** 与 **Ignore Rules（忽略规则）**；`Esc` 关闭面板。

| 设置 | 说明 | 可选值 |
| --- | --- | --- |
| Show file tree | 显示／隐藏文件树及标题 | `on` / `off` |
| Open file | 用系统默认程序打开文件 | `left-click` / `middle-click` / `right-click` / `off` |
| Copy file path | 复制文件绝对路径 | `left-click` / `middle-click` / `right-click` / `off` |
| Open folder | 用系统默认程序打开文件夹 | `left-click` / `middle-click` / `right-click` / `off` |
| Copy folder path | 复制文件夹绝对路径 | `left-click` / `middle-click` / `right-click` / `off` |
| Expand/collapse folder | 展开／折叠文件夹 | `left-click` / `middle-click` / `right-click` |

设置自动保存，重启后保留。鼠标绑定跨项目共用；显隐与忽略规则按项目保存，子目录会话共用所属项目的设置。面板折叠是临时状态，仅影响当前终端。

## 💡 注意事项

### 默认鼠标操作

| 点击位置 | 左键 | 中键 | 右键 |
| --- | --- | --- | --- |
| 目录 | 展开 / 折叠 | 复制绝对路径 | 用系统默认程序打开 |
| 文件 | — | 复制绝对路径 | 用系统默认程序打开 |

终端必须转发中键，不能用它粘贴；SSH 复制路径需要终端支持 OSC 52。

### Git 颜色

| 颜色 | 状态 |
| --- | --- |
| 主题强调色 | 目录 |
| 绿色 | 新增 `A`、未跟踪 `??`、重命名 `R`、复制 `C` |
| 黄色 | 修改 `M`、文件类型改变 `T` |
| 红色 | 删除 `D`、合并冲突 `UU` / `AA` / `DD` 等 |
| 灰色 | Git 忽略 `!!`，不自动隐藏 |

有变更的文件还会显示 `M`、`??`、`MM` 等 Git 状态标记。

### 忽略规则

规则遵循 `.gitignore` 语法，需要本机可用的 `git` 命令。

| 规则示例 | 效果 |
| --- | --- |
| `node_modules/` | 隐藏任意层级的 `node_modules` 目录 |
| `/dist/` | 仅隐藏项目根目录下的 `dist` 目录 |
| `*.log` | 隐藏任意层级以 `.log` 结尾的文件或目录 |
| `!keep.log` | 放在 `*.log` 后，恢复显示 `keep.log` |

规则只隐藏文件树条目，不改变 Git 追踪，也不导入 `.gitignore`。恢复子项前，其父目录必须可见。

- 面板展开时，文件变化会触发刷新，也会每 10 秒刷新一次；其他 TUI 保存的规则在刷新后生效。
- Git 功能和默认程序打开要求工作区路径在本机可访问。
