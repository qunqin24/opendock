# opencode-user-message

OpenCode TUI 插件：在会话侧边栏列出当前会话的全部用户消息，点击任意一条即可跳到对话区对应位置。长会话里回看和定位很快。

![User Message sidebar](https://unpkg.com/opencode-user-message/assets/sidebar.png)

> 截图使用 mock 数据渲染。

## 功能

- **完整时间线**：侧栏平铺全部用户消息，一行一条摘要 + 时间；当天只显示 `HH:mm`，其他日期显示 `MM-DD HH:mm`。
- **点击跳转**：点击消息跳到对话区对应位置；目标消息尚未加载时自动分页加载。
- **当前锚点**：对话区滚动时，侧栏实时高亮当前所在的用户消息。
- **顺序切换**：标题右侧 `↑ / ↓` 切换新旧顺序，状态持久化。默认 `↓` 旧→新（最新在底部），`↑` 新→旧（最新在顶部）。
- **折叠**：超过 2 条时点击标题展开/折叠，状态持久化。
- **实时更新**：监听会话事件增量合并；revert 或消息数量下降时重新拉取。

## 安装

```sh
opencode plugin add opencode-user-message
```

重启 TUI 生效。卸载：

```sh
opencode plugin remove opencode-user-message
```

## 使用

- 点击 `User Message` 标题展开/折叠；超过 9 条时标题后显示数量。
- 点击任意消息行跳转。
- 当天消息显示 `HH:mm`，其他日期显示 `MM-DD HH:mm`；跨零点后下一条消息到达时刷新“今天”判断。

## 本地开发

```sh
bun install
bun run typecheck
bun test
```

在 `~/.config/opencode/cli.json` 的 `plugins` 数组里加入本地项目路径：

```jsonc
{
  "plugins": ["/path/to/opencode-user-message"]
}
```

本地插件由宿主直接加载源码，修改 `tui.tsx` / `timeline.ts` 后热重载生效。

## 调试预览

在 `tui.tsx` 顶部把：

```ts
const MOCK = false // 调试时改成 true
```

改成 `true`，TUI 热重载后会显示 `mock.ts` 生成的 20 多条模拟消息，覆盖今天与跨天时间戳、7 天前后、截断、数量和滚动高亮效果。

- Mock 数据只用于展示，不写入会话；点击 mock 行不会跳转。
- 改回 `false` 即恢复当前会话的真实用户消息。

## 已知限制

- 全量历史通过 `GET /api/session/{id}/message?type=user` 分页获取；旧宿主不支持 `type` 参数时退回全量拉取并在本地过滤。
- 跳转到尚未加载的消息依赖运行时存在但公开插件类型未列出的 `data.session.message.loadMore`；没有该能力时只能跳转已加载消息，并给出提示。
- 跳转依赖宿主命令 `session.messages_last_user` / `session.message.user.previous`，宿主改名时会提示而不是静默失败。
- “今天”按侧栏缓存的 `now` 判断；跨零点后若没有新消息，旧行仍显示 `HH:mm`，直到下一条消息到达才刷新。
- “当前锚点”高亮通过查找 renderer 树中的 transcript scrollbox 实现，属于尽力而为的优化项。
- 时间格式固定为 `MM-DD HH:mm`，不显示年份；跨年且月日相同的消息无法区分。

## License

MIT
