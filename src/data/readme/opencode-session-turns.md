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
- 鼠标移到窗口右缘的细条上自动展开，移开自动收起。
- 点击任意一轮，**跳转到对应消息**——包括很久以前、尚未渲染的历史轮次。
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
3. 宿主每次 seek 只向前加载**约一页（~5 轮）**历史，所以插件会交替把 hash 指向
   「已加载的最早一轮」和目标，逐页把历史翻出来，直到目标行挂载。

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
