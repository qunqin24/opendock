# opencode-user-message

OpenCode TUI 插件：在会话侧边栏列出当前会话的全部用户消息，点击任意一条即可把对话区滚动到对应位置。

展示结构对齐内置的 MCP 侧栏区块：

```
▼ User Message (12)                      ↑
• 帮我看下这个报错 09:12
── 24/11
• 把测试补上 10:23
• 继续 10:40
── 25/11
```

## 行为

- **侧栏列表**：一行一条用户消息，圆点 + 单行摘要 + 时间。折叠时标题固定显示数量；展开时超过 9 条才显示数量。
- **顺序切换**：标题右侧的 `↑ / ↓` 切换顺序，状态持久化。默认 `↑`：旧→新，最新在底部，日期标签在组下方；`↓`：新→旧，最新在顶部，日期标签在组上方。
- **日期分组**：按本地自然日分组，超过 7 天的消息合并为一个 `7 days ago` 组；老分组里每一行显示 `DD/MM HH:mm`。
  - 只有一个分组时，两种顺序都不显示分组标签。
  - `↓` 模式下，最上方是今天时不显示今天的日期；其他分组仍显示日期。
  - `↑` 模式下，最下方是今天时不显示今天的日期；其他分组仍显示日期。
- **展开 / 折叠**：超过 2 条时点击 `User Message` 标题行切换，状态会持久化，重启 TUI 后保留。
- **点击跳转**：复用宿主自带的用户消息导航命令，跳到目标消息；目标尚未加载时先通过宿主分页加载，再定位。
- **当前锚点**：对话区滚动时，侧栏中当前所在的用户消息会实时高亮（尽力而为，找不到宿主滚动容器时只是不高亮）。
- **实时更新**：监听会话事件增量合并；revert 或本地消息数量下降时重新拉取。

## 安装

发布后：

```sh
opencode plugin add opencode-user-message
```

重启 TUI 生效。卸载：

```sh
opencode plugin remove opencode-user-message
```

## 本地开发

```sh
bun install
bun run typecheck
bun test
```

在 `~/.config/opencode/cli.json` 的 `plugins` 数组里加入本地项目路径：

```jsonc
{
  "plugins": ["/Users/sutie/user-message"]
}
```

本地插件由宿主直接加载源码，修改 `tui.tsx` / `timeline.ts` 后热重载生效。

## 调试预览

在 `tui.tsx` 顶部把：

```ts
const MOCK = false // 调试时改成 true
```

改成 `true`，TUI 热重载后会显示 `mock.ts` 生成的 20 多条模拟消息，覆盖今天、最近几天、7 天边界和 7 天以前的老分组，用来查看真实分组、截断、数量和滚动高亮效果。

- Mock 数据只用于展示，不写入会话；点击 mock 行不会跳转。
- 改回 `false` 即恢复当前会话的真实用户消息。

## 已知限制

- 全量历史通过 `GET /api/session/{id}/message?type=user` 分页获取；旧宿主不支持 `type` 参数时退回全量拉取并在本地过滤。
- 跳转到尚未加载的消息依赖运行时存在但公开插件类型未列出的 `data.session.message.loadMore`；没有该能力时只能跳转已加载消息，并给出提示。
- 跳转依赖宿主命令 `session.messages_last_user` / `session.message.user.previous`，宿主改名时会提示而不是静默失败。
- 日期分组在消息变化时计算；TUI 跨零点长开时，日期标签要到下一条消息才刷新。
- “当前锚点”高亮通过查找 renderer 树中的 transcript scrollbox 实现，属于尽力而为的优化项。

## License

MIT
