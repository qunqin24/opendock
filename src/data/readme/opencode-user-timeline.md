# opencode-user-timeline

![用户节点面板](docs/screenshot.png)

OpenCode 2 TUI 插件：在**会话侧边栏**显示当前会话的用户消息节点列表（类似对话时间线/大纲）。

> English: an OpenCode 2 TUI plugin that lists your messages of the current session
> in the sidebar — scroll through full history and click any node to jump to that
> message. Install: `opencode2 plugin add opencode-user-timeline`.

## 安装

```sh
opencode2 plugin add opencode-user-timeline
```

（也可以手动在 `cli.json` 的 `plugins` 数组里加 `"opencode-user-timeline"`。）

效果（每项 = 一条用户消息节点，最新一条高亮）：

```
◆ 用户节点 (3)
────────────────
14:02 ─ 那之前的那个400多行的脚本移…
14:15 ─ 清理过程中发现 pnpm 缓存…
14:31 ━ 桌面快捷方式仍指向补丁版…
```

## 功能

- 挂载在 `sidebar.content` 插槽，随会话切换自动刷新
- **固定显示 10 行，剩余历史滚轮滚动**：列表区是 `scrollbox`
  （`stickyScroll` 吸附底部），新消息进来始终停在最新一条
- **全量节点**：通过 `context.client.message.list` 分页向服务端拉取完整历史，
  不依赖 TUI 会话窗口的懒加载（刚打开会话无需手动上滚即可看到全部节点）；
  TUI 本地缓存只用于实时增量（新消息即时出现）。首次进入和 undo 才全量重建，
  正常新增只从最新页拉到首个已知节点；节点池仅保存 ID、时间和摘要
- **点击节点直达对应消息**：复用宿主内置导航命令，步数按宿主当前缓存计算
  （与宿主导航读同一数据源，落点精确）；目标已加载时零扰动直达；尚未加载时
  先盖全屏遮盖层（"◆ 正在定位消息…" + 目标预览），罩后直接逐页加载到目标，
  再触发宿主挂载完整 transcript；确认最终落点的 renderable 已出现后才执行回退定位，
  在罩下完成落位后再摘罩——看不到加载过程，也不会在首次行构建完成前提前导航。
  遮盖层用 slot + 绝对定位自绘，
  不走 dialog（宿主滚动命令会关闭 dialog）
- 被点击节点显示 `●` 高亮
- 监听服务端 message/session 事件实时更新，另有 20 秒低频本地轮询兜底
- 节点标记统一为 `─`，点击选中的那条显示 `●` 高亮
- 面板显隐状态持久化（`context.storage.store`），重启 TUI 后保留
- 配色固定为 everforest 主题色（绿 `#a7c080`），见 `src/tui.tsx` 顶部 `COLORS`，可自行修改

## 操作

| 方式 | 命令 |
| --- | --- |
| 快捷键 | `Alt+U` |
| 命令面板 | `Ctrl+P` → "切换用户消息节点面板" |
| 斜杠命令 | `/nodes` |

如需改键位，在 `cli.json` 的 `keybinds` 里对 `user-timeline.toggle` 重新绑定。

## 安装 / 卸载

已在本机全局配置注册（`cli.json` → `plugins` 数组中的 file URL）。
卸载：从 `cli.json` 的 `plugins` 数组中删除对应行，或改为 `-user-nodes` 前缀禁用。

## 选项（可选）

`cli.json` 中可传选项；`visibleRows` 调整可视行数（默认 10），`scroll: false`
关闭滚轮滚动区、退回静态最新 N 行（scrollbox 走原生渲染核心，个别 beta 版本
可能不稳定时的退路，不用改代码）：

```json
{
  "plugins": [
    {
      "package": "opencode-user-timeline",
      "options": { "visibleRows": 10, "scroll": true }
    }
  ]
}
```

## 开发

```sh
npm install        # 仅为类型检查/编辑器补全；运行时由 OpenCode 解析依赖
npx tsc --noEmit   # 类型检查
bun mask-test.tsx  # 离线渲染测试：验证全屏遮盖层布局（bunfig.toml 为其服务）
```

- `src/tui.tsx` — TUI 插件主体（`@opencode-ai/plugin/tui`）
- `src/index.ts` — 服务端壳（`tui: true`，按包发布时可自动加载 TUI 部分）

## 已知限制

- **翻页的正确姿势（beta-18269 实测）**：`GET /api/session/{id}/message` 的 cursor
  内部已编码 order——首页带 `order=desc&limit=200`，后续页**只能单独带 cursor**；
  重复带 order 会导致服务端静默返回空列表。插件照此实现，任意长度会话全量拉取。
- v2 插槽 API 无法在对话流内部逐条消息旁注入 UI，所以节点面板位于侧边栏而不是截图那样的消息左侧行内轨道。
- 未加载节点会通过宿主分页数据层按需加载。插件会优先使用当前 v2 运行时的
  `message.loadMore`；旧宿主没有该能力时才回退到 `session.first` 命令。
- beta-18269 的 `session.first` 会异步递归加载到最早页，最后再执行置顶；目标消息
  中途进入缓存不代表命令已经结束。未加载节点的主路径因此不再用该命令触发分页，
  避免它的最终置顶覆盖插件落点。
- 点击跳转复用宿主的"上一条用户消息"命令逐步回退定位；空白文本（纯附件）的消息
  宿主无法直接定位，点击后会落在它上方最近的可定位消息上（与宿主行为一致）。
- 历史很长（上百条用户消息）时点击最顶端节点会连续 dispatch 较多次导航命令，
  命令本身是同步的状态更新，耗时可忽略，但极端变态长会话下可能有轻微滚动动画。
