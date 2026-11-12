# opencode-desktop-timeline

OpenCode 桌面端右侧的用户消息时间线：每条用户消息一根小横条，当前消息高亮，鼠标移上去展开卡片，点击跳到对应位置。

> English: a right-edge message rail for OpenCode Desktop. One tick per user message, hover for the list, click to jump. Tested on OpenCode Desktop 2.2.5.

## 功能

- 右侧固定刻度条，浮在界面上，不占布局
- 当前消息高亮：和宿主「视口顶部 +100px」的判定规则一致，贴底时高亮最后一条
- 鼠标移到刻度区展开卡片，列出当前会话的全部用户消息
- 点击精确跳转：先遮住时间线，等宿主把目标消息挂载、虚拟列表测量稳定后再对齐、揭开，避免中途滚动和回落
- 字体、字号、深浅色和主题色全部跟随桌面端设置（使用宿主的 `--v2-*` 变量，自定义主题同样生效）
- 与 TUI 插件 [`opencode-user-timeline`](https://www.npmjs.com/package/opencode-user-timeline) 是两个独立插件，可以同时安装

## 要求

- OpenCode Desktop **2.2.x**（在 2.2.5 实测）
- 只在桌面端生效；TUI 和 Web 不显示

## 安装

npm：

```sh
opencode plugin add opencode-desktop-timeline
```

或者手写全局 `~/.config/opencode/opencode.json(c)`：

```jsonc
{
  "plugins": ["opencode-desktop-timeline"]
}
```

不经过 npm，也可以手动克隆到插件目录：

```sh
git clone https://github.com/YangYu10410/opencode-desktop-timeline.git \
  ~/.config/opencode/plugins/opencode-desktop-timeline
```

然后重启 OpenCode。注意：OpenCode 2.2.5 的 `opencode plugin add github:...` 有已知问题（报 `git dep preparation failed`），用上面的克隆方式即可。

装完重启 OpenCode，桌面端按 `Ctrl+R`。

## 使用

- 右侧每条横线 = 一条用户消息，从上到下按时间排列
- 当前消息的横线更长并变成强调色
- 鼠标移到刻度区：展开卡片，`hover` 条目可看完整摘要，点击即跳转
- 跳转过程中时间线会短暂空白（遮罩），通常 50–300ms，跨很远的消息最多约 1 秒

## 卸载

```sh
opencode plugin remove opencode-desktop-timeline
```

或从 `plugins` 里删掉，或加 `"-opencode-desktop-timeline"` 临时禁用。

## 已知限制

- 长会话（100+ 条）刻度会自动压缩间距，极端数量下整体纵向缩放，不会顶出窗口
- 深浅色和主题色跟随桌面端；自定义主题只要覆盖 `--v2-*` 变量即可，否则退回系统 `Canvas/CanvasText`
- 依赖桌面端内部 DOM 约定：`[data-message-id]`、`#message-<id>`、`[data-timeline-virtual-content]`、`[data-session-title]`，以及 `#message-<id>` 深链；桌面端大版本升级可能需要适配
- 跳转精度依赖宿主的虚拟列表行为；宿主滚动尚未测完的极端场景可能出现 1px 级误差（会再对齐一次）

## 开发

```sh
npm install
npm run build
```

构建输出根目录的 `gui-experimental.cjs`。本地调试：

```sh
opencode plugin add /absolute/path/to/this/repo
```

改完 GUI 源码后必须三步：

1. `npm run build`
2. `opencode service restart`（或 `opencode-cli reload`）
3. 桌面端 `Ctrl+R`

**`gui-experimental.cjs` 必须提交。** GitHub 安装不会在安装时构建，缺少这个文件插件就没有 GUI。

## License

MIT
