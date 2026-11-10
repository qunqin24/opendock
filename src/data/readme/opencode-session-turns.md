# opencode-session-turns

**OpenCode Desktop 插件：在会话右缘列出每一轮的「用户提问」，悬停展开，点击即刻跳转到那一条消息。**

An OpenCode Desktop plugin that adds a slim rail on the right edge of the
conversation, listing every user turn of the current session. Hover to expand;
click a turn to jump straight to that message.

适用 OpenCode Desktop 2.2.6（以预构建的 `./gui-experimental` 包形式加载）。

```
┌─ 会话轮次 (12) ─────────────┐
│ 09:14  #1  帮我看看这个报错… │
│ 09:22  #2  那改成异步呢？     │
│ 09:35  #3  继续              │
│ ...                         │
└─────────────────────────────┘
```

## 功能

- 列出当前会话的每一轮用户提问（从会话消息接口分页拉取，`type=user`）。
- 鼠标移到窗口右缘的细条上自动展开，移开自动收起；长历史跳转期间面板保持展开。
- 点击任意一轮，**跳转到对应消息**——包括很久以前、尚未渲染的历史轮次。
- 深历史需要逐页加载时，面板头部显示进度，目标轮次带徽标并琥珀色脉冲；
  按 `Esc` 或点 × 可随时取消。
- **历史预热**：宿主自己加载历史每页之间有 2 秒硬冷却，深历史跳转因此要等好几秒。
  轮次条会在**打开会话时**（轮次列表加载完、≥15 轮）就后台把历史预热完并还原视口，
  悬停面板或 `/turns` 也会触发。预热完成后所有跳转都是瞬时的。
- **点击与预热的配合**：点到的轮次已预热 → 直接瞬时跳转；还没预热到 → 头部显示
  「预热中 · 稍等一下」，等预热翻到该轮后自动落地（不打断预热）。
- 定位成功后精准描边闪烁**那一条用户气泡**（跟随气泡自身圆角），不再整行填色。
- 自动高亮当前视口所在的轮次。
- 斜杠命令 `/turns`、快捷键 `⌘⌥R`（Windows/Linux 为 `Ctrl+Alt+R`）展开轮次条。

## 安装

把包名加入 `opencode.json` 的 `plugins` 列表，OpenCode 启动时会自动从 npm 安装：

```json
{
  "plugins": ["opencode-session-turns"]
}
```

然后重启 OpenCode Desktop（GUI bundle 在窗口启动时加载）。

## 使用

- 把鼠标移到会话右侧的细条上展开；
- 或按 `⌘⌥R` / 输入 `/turns` 展开；
- 点击某一轮即可跳到那条消息。

## 实现原理（为什么并不简单）

OpenCode Desktop 2.2.6 有几个必须绕开的陷阱：

- 时间线是**虚拟渲染**的：只有视口附近的行动态挂载，远端轮次不在 DOM 里。
- 桌面端使用**内存路由**：`window.location` 始终停在 `oc://renderer/index.html`，
  与真实路由解耦。直接往 `window.location` 写 `#message-<id>` 或派发 `popstate`，
  会让宿主把 `/index.html` 当成路由解析并抛出致命的 `Unrecognised route!`（会崩）。
- GUI SDK **没有** `scrollToMessage()` / `navigate()` 这类公开 API（`ctx.router` 只读）。

因此本插件的做法是：

1. 用 `ctx.router.path()` 取到真实路由（合法的 `/server/…/session/…` 路径）；
2. 伪造一个 `<a href="<路由>#message-<id>">` 并派发冒泡 click。宿主在 `document`
   上注册的链接拦截器（Solid Router 的 `create` 钩子）会把它交给**内存 router 的
   navigate()**，从而驱动宿主自己的游标状态机加载历史并定位到该行——全程不碰
   `window.location`。
3. 宿主每次 seek 只向前加载**约一页（~5 轮）**历史。宿主在 `hash.changed` 后会进入
   `pending(目标)` 状态并**异步**加载缺失的历史（内部最多重试 12 次）。因此插件
   **只设置一次 hash 然后耐心等待**：任何额外的 hash 切换都会把宿主的 `pending`
   状态重置、打断正在飞行的历史请求，表现为"每次点击只前进一页"。
   只有当宿主连续 5 秒（首屏 9 秒）毫无变化、判定这一轮已经结束时，插件才把
   hash 弹到一个已挂载的轮次再切回来，开启新的一轮；面板头部实时显示
   「已加载 N 页 / 耗时 Xs」，总预算 45 秒，`Esc` 可取消。

已挂载的行则直接用本地滚动，瞬时定位。

## 构建

```sh
npm install
npm run build      # -> dist/gui-experimental.cjs
```

改完源码后重新构建，并在 OpenCode Desktop 里 Reload 插件
（Settings → Extensions → Plugins → Reload）或重启应用。

## 许可证

MIT © meiyx7
