# opencode-fork-tree

OpenCode TUI 插件：把会话的 fork 分支画成一棵树。侧栏随时看结构，`/forks` 里跨分支搜索、跳转，并在任意一条 user message 处继续分叉。

![Conversation tree](https://fastly.jsdelivr.net/npm/opencode-fork-tree@0.1.2/assets/conversation-tree.png)

> 截图使用 mock 数据渲染，不含真实会话。

## 功能

- **侧栏 Forks**：列出当前会话所在的整棵 fork 树，当前分支加粗并显示 `←`；点击任意分支直接跳转。
- **`/forks` 对话树**：所有分支按 lane 展开，共享的前缀只显示一次；输入即过滤，长分支自动折叠。
- **从任意消息分叉**：选中一条 user message，`ctrl+f` 在原消息前创建 fork；文本、文件、agent/skill mention 会一起还原到新会话的输入框。
- **管理分支**：`ctrl+r` 改名，`ctrl+d` 删除。
- **删除占位**：删除后的分支在本次浏览中保留虚线占位，子分支仍按原结构挂回树上。
- **实时同步**：监听 fork、删除、改名、归档等事件，侧栏和对话树自动更新。

## 安装

```sh
opencode plugin add opencode-fork-tree
```

重启 TUI 生效，需要 OpenCode `>= 2.4.0`。

卸载：

```sh
opencode plugin remove opencode-fork-tree
```

## 使用

### 侧栏

![Forks sidebar](https://fastly.jsdelivr.net/npm/opencode-fork-tree@0.1.2/assets/sidebar.png)

- 点击 `Forks` 标题打开对话树；点击左侧三角折叠/展开。
- 点击任意分支行跳转到对应会话。
- 当前会话所在分支加粗并显示 `←`；运行中的分支用主题强调色。
- 没有 fork 时整块隐藏。

### `/forks`

打开当前会话的完整对话树。只展示 user message，assistant 和工具消息不进入树；每条消息一行，右侧显示时间。

| 操作 | 说明 |
| --- | --- |
| 输入 | 按消息内容过滤 |
| `Enter` | 跳转到选中分支；选中折叠摘要时展开 |
| `ctrl+f` | 在选中的 user message 前分叉（`fork here`） |
| `ctrl+r` | 重命名选中的会话 |
| `ctrl+d` | 删除选中的会话 |
| `ctrl+o` | 展开选中的折叠区间 |
| `esc` | 关闭 |

`ctrl+d` 会真实删除会话，且不可撤销。删除时宿主会一并清理子 agent 会话；fork 子分支会以占位符保留在树上。

长分支默认只保留首尾和分叉点附近的消息，其余折叠为 `… N user messages`，用 `ctrl+o` 展开。

### 和内置 `/fork` 的关系

不替换内置 `/fork`，也不改变原有快捷键。内置 `/fork` 继续用于快速分叉；本插件补的是**全局视图**：一次看清所有分支的关系，并能从任意分支的任意消息继续分叉。

## 已知限制

- 只展示 user message，因此 assistant 回复和工具调用不会出现在树里。
- fork 关系来自宿主返回的 `fork.sessionID` 和 boundary；没有这组元数据的会话不会挂到树上。
- 附件还原依赖宿主的实验性 media 接口；宿主升级后接口改名时，带附件的分叉可能失败，并给出错误提示。
- 每个项目最多扫描 20 页、每页 200 个根会话；每个会话最多读取 20 页、每页 200 条 user message。超大项目可能只覆盖最近的一部分。
- 删除会话不可撤销；侧栏和对话树里的占位符只是本地展示记录。
- 分支标题取该分支第一条自己的 user message；没有消息的空分支使用会话标题或 `New fork`。
- 时间显示为本地时区：当天只显示 `HH:mm`，其他日期显示 `MM-DD HH:mm`，不显示年份。

## 本地开发

```sh
bun install
bun run typecheck
bun test
```

在 `~/.config/opencode/cli.json` 的 `plugins` 里加入本地路径：

```jsonc
{
  "plugins": ["/path/to/opencode-fork-tree"]
}
```

修改 `tui.tsx` 或同目录下的模块后，TUI 会热重载。

## License

MIT
