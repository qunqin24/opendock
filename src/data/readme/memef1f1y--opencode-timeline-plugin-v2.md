# opencode-timeline-plugin-v2

插件截图：

![timeline sidebar](docs/screenshot.png)



OpenCode V2 终端侧边栏的会话历史时间线。

- 仅支持 V2（目标 `opencode@^2`），由 V1 包 `@memef1f1y/opencode-timeline-plugin` 移植而来，V1 包不受影响，可继续在 V1 环境使用。
- 插件 id 仍为 `timeline.viewer`；跳转记忆从 V1 的 `kv` 改为 V2 的 `ctx.storage`（新的命名空间，V1 的记忆不会带过来）。

## 功能

侧边栏区块，按新到老列出本会话的用户消息（30 字摘要 + `HH:MM` 时间戳）。

- 纯鼠标操作：点行跳转主视图到该消息，点标题栏折叠/展开，点“回到底部”滚回最新处。
- 不注册任何快捷键，不会干扰输入框。
- 历史直接从服务端拉取（`message.list` 按 `type: "user"` 最新优先分页），挂载即全量显示，不依赖主视图滚到哪里（原生 `/timeline` 与 TUI 本地消息窗口都只能看到已加载的最近消息）。

已知限制：主视图只渲染已加载窗口，老消息在主视图中没有渲染节点时点行无法跳转，会弹出提示指引先上滚 transcript 加载后再点；窗口内的消息点按即跳。

渲染模型：V2 宿主不会为插件自有响应式更新排帧，推式刷新（`requestRender`、store 写入）会让面板冻结在挂载瞬间的值。因此入口在内容签名变化时重建 slot claim，用一次新鲜挂载代替推式刷新；同 tick 内先摘后建，合并为一帧，签名守卫保证收敛（挂载 → 拉取 → 重挂一次 → 稳定）。

## 安装（npm，推荐）

```sh
opencode plugin add @memef1f1y/opencode-timeline-plugin-v2
```

或写 `~/.config/opencode/cli.json`：

```json
{
  "plugins": [
    {
      "package": "@memef1f1y/opencode-timeline-plugin-v2",
      "options": { "maxItems": 50 }
    }
  ]
}
```

## 安装（本地路径）

```json
{
  "plugins": [
    {
      "package": "/path/to/opencode-timeline-plugin-v2",
      "options": { "maxItems": 50 }
    }
  ]
}
```

参数：`maxItems`（默认 50，最多显示的用户消息数），`debug`（默认 false，打开后显示一行 `dbg …` 快照便于排查）。

重启 TUI，侧边栏末尾出现 `Timeline N` 即生效。

## 包结构

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./tui": "./src/tui.tsx"
  }
}
```

`./tui` 是 CLI 入口（自动加载），`.` 是与之并存的最小服务端入口。无需构建，OpenCode 直接加载 TypeScript 源码。

## 开发

```sh
npm install
npm run typecheck
```

移植对照：V1 `api.state.session.messages()` → `ctx.data.session.message.list()`（V2 消息内联 `text`，无需二次查 parts）；V1 `api.event.on` → `ctx.data.listen` + trailing 合并 + `message.sync()`；V1 `slots.register({ sidebar_content })` → `ctx.ui.slot({ append: "sidebar.content" })`；V1 `api.kv` → `ctx.storage.store`。V1 的键盘导航有意舍弃（会劫持输入框），本包只保留鼠标交互。
