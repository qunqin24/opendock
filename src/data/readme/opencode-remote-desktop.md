# opencode-remote-desktop

[![npm](https://img.shields.io/npm/v/opencode-remote-desktop.svg)](https://www.npmjs.com/package/opencode-remote-desktop) [![license](https://img.shields.io/npm/l/opencode-remote-desktop.svg)](LICENSE) [![node](https://img.shields.io/node/v/opencode-remote-desktop.svg)](https://nodejs.org)

An always-on Mac that OpenCode can drive, and that you can take over at any moment.

When OpenCode runs as a server on your Mac (mini, Studio or laptop), this plugin lets the agent work on **that machine**: it reuses the browser you are already signed in to, drives real desktop apps through the macOS accessibility tree, and keeps running routine work 24/7 even when no client is connected. When something needs a human (2FA, a QR login, Face ID, a payment password), the agent suspends itself, hands the screen and keyboard back to **you**, and picks up again once you press resume.

- Requirements: a macOS 13+ host, OpenCode 2.2.7+
- Distribution: an OpenCode plugin — add its name to `plugins` in `opencode.json`

---

## Features

**Desktop automation** — locates elements through the macOS accessibility tree instead of guessing coordinates; input goes through AppleScript / CGEvent / clipboard writes and works with any input method.

**Signed-in browser reuse** — attaches to a running Edge or Chrome on the host by reading its CDP port from `DevToolsActivePort`, so cookies, accounts and extensions are already there.

**Human takeover** — the agent calls `computer_request_takeover`; the session suspends and the live screen appears in the desktop app's side panel or in the web console on any device. When you are done, one click hands control back.

**24/7 keep-awake and routines** — `caffeinate` holds the Mac awake while the agent works or waits for you, and releases it afterwards; a built-in scheduler dispatches sessions on Cron or interval.

**One RPC surface** — everything goes through `BotRpc` (`POST <server>/api/rpc/bot/<method>`), so the desktop panel and the web console share one protocol that reuses the server's own password auth and remote tunnel. The plugin never opens a port of its own.

---

## Architecture

```text
┌────────────────────────────────────────────────────────┐
│     OpenCode desktop app / web / mobile clients        │
│   chat session + Live Screen panel / web console       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / RPC / WebSocket
┌──────────────────────────▼─────────────────────────────┐
│              OpenCode Server (macOS host)              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ opencode-remote-desktop                          │  │
│  │  TakeoverManager  suspend / resume state machine │  │
│  │  ScreenLock       who owns the screen (AI / you) │  │
│  │  BotRpc           the only channel for clients   │  │
│  │  RoutineScheduler 24/7 timers                    │  │
│  │  KeepAwake        caffeinate                     │  │
│  └───────────────┬───────────────────┬──────────────┘  │
│  ┌───────────────▼────────┐ ┌────────▼──────────────┐  │
│  │ agent-desktop          │ │ CDP / agent-browser   │  │
│  │ accessibility + CGEvent│ │ attach to Edge/Chrome │  │
│  └────────────────────────┘ └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## Install

### 1. Host dependencies

```bash
npm install -g agent-desktop agent-browser
agent-browser install                      # fetches Chrome for Testing on first run
agent-desktop permissions --guide          # grants Accessibility and Screen Recording
```

Then run `/doctor` inside OpenCode: it checks CLI versions, TCC permissions, the native streaming sidecars and the browser mode, and prints the command to fix whatever is missing.

The low latency WebRTC stream needs native sidecars; without them the plugin falls back to JPEG polling:

```bash
npm run build:native     # needs Go and swiftc
```

Published builds ship `darwin-arm64` binaries. On other architectures compile them locally from `native/`.

### 2. Register the plugin

```json
{
  "plugins": [
    {
      "source": "opencode-remote-desktop",
      "options": {
        "consoleUrl": "https://bot-console.pages.dev",
        "keepAwake": "active",
        "reuseHostBrowser": true,
        "maxImageDimension": 1440,
        "jpegQuality": 72
      }
    }
  ]
}
```

On a controller that should only show the side panel, without registering the `computer_*` tools or the takeover console, pass `"host": false`.

### 3. Let phones and browsers take over

```bash
opencode service set remote true                                  # enable the remote tunnel
opencode service set cors https://bot-console.pages.dev           # allow the console origin
```

The console is a static page already deployed on Cloudflare Pages; you can also build and deploy your own:

```bash
npm run build:pages
npx wrangler pages deploy pages --project-name bot-console
```

---

## Tools and commands

### Tools

| Tool | What it does |
| --- | --- |
| `computer_status` | host OS, resolution, Accessibility grant, console state |
| `computer_screenshot` | captures the screen or one window as compressed JPEG plus logical coordinates |
| `computer_desktop` | native actions: `snapshot`, `click`, `type`, `press`, `scroll` |
| `computer_browser` | drives the host Edge/Chrome: `open`, `snapshot`, `click`, `type`, `eval` |
| `computer_request_takeover` | suspends the session and hands the screen to a human |
| `computer_routine` | routine jobs: `list`, `add`, `remove` |
| `computer_secret_request` | shows a secret card; the value goes straight to the macOS keychain and never back to the agent |
| `computer_secret_type` | types a stored secret into a desktop element, reporting only success or failure |

### Slash commands

| Command | What it does |
| --- | --- |
| `/screen` | opens or toggles the Live Screen side panel |
| `/bot-link` | prints the web console link (no credentials, safe to paste into a session) |
| `/bot` | shows status and the console entry point |
| `/takeover` | suspends the session and requests a takeover manually |
| `/routine` | lists or manages routine jobs |
| `/doctor` | checks the host dependencies |

### Where the Live Screen panel shows up

- **Desktop app connected to a remote server**: side panel available through `Cmd+Shift+S`, `/screen` or the `+` menu.
- **Web clients, phones, TUI, controllers without the plugin**: OpenCode only loads plugin UI in the desktop app, so these use the web console from `/bot-link`.
- When the controller has no panel — judged from a heartbeat the desktop panel sends every 15 seconds — the console link is added to the tool result and the agent pastes it into its reply.

### Screen lock

While the agent is driving the screen (it used a desktop or browser tool, plus a 20 second grace window), remote input is rejected with `agent-busy` so nobody clicks into the middle of an operation. Both the panel and the web console offer **Force takeover**, which interrupts the agent and gives you the screen.

---

## Web console

`https://bot-console.pages.dev/#server=<server>&session=<session>`

- Everything after `#` stays in the browser and is never sent to the page host.
- The first visit asks for the OpenCode server password; later visits read it from localStorage.
- The server address defaults to the OpenCode remote tunnel; the `serverUrl` option overrides it, `consoleUrl` changes the page address and setting it to `""` disables links.

---

## Security

- Every RPC call goes through the OpenCode server's own password auth; the plugin opens no ports.
- Console links carry a server address and a session ID, never credentials.
- The console origin must be in the server's `cors` allowlist or requests are rejected.
- Secrets live only in the macOS keychain (service `opencode-bot`) and never pass through the agent.
- Known limit: entries are written through `/usr/bin/security`, so the same user can read them back with `security find-generic-password`; the plugin can only make those shell commands prompt. While typing, the value is briefly visible in the `agent-desktop` process arguments.

## Limitations

- Only a macOS host can control a desktop; Linux and Windows have no capture backend yet and fall back to JPEG polling.
- Accessibility and Screen Recording must be granted in System Settings, otherwise `/doctor` reports the gap.
- The Live Screen panel needs the desktop app plus a remote server; web and mobile use the web console.

---

## Development

```bash
npm install
npm run typecheck
npm test          # 49 unit tests
npm run build     # builds dist/gui-experimental.cjs
```

## Publishing

Releases go through GitHub Actions trusted publishing (OIDC + provenance), so no npm token lives on a machine:

```bash
git tag v0.2.0 && git push origin v0.2.0   # or run the workflow manually
```

The workflow runs typecheck, tests and the native sidecar build on a macOS runner, then `npm publish --provenance`; a tag that disagrees with `package.json` fails the run.

Authorize the workflow once as a trusted publisher:

```bash
npm trust github opencode-remote-desktop \
  --repo jarvisluk/opencode-remote-desktop \
  --file publish.yml --allow-publish
```

A release that is already on npm is skipped, so tagging an existing version still produces a green run; pair each tag with a GitHub Release for the changelog:

```bash
gh release create v0.2.0 --generate-notes
```

The same trusted publisher setup can be done on npmjs.com under the package's Trusted publishing settings (publisher GitHub Actions, repository `jarvisluk/opencode-remote-desktop`, workflow `publish.yml`). After that, pushing a tag is the whole release.

## License

MIT

---

# 中文文档

让 OpenCode 拥有一台**永远在线、AI 可驾驶、人可随时接管的真实 Mac**。

OpenCode 以服务端形式跑在你的 macOS 机器（Mac mini / Mac Studio / MacBook）上时，这个插件让 Agent 直接操控**这台你自己的电脑**：复用本机已登录的浏览器与账号，通过 macOS 无障碍树操作真实桌面应用，客户端断开也能 7×24 常驻执行例行任务。遇到只有人才能过的关卡（2FA、扫码登录、人脸识别、支付密码），AI 主动挂起，把屏幕与键鼠**交还给你**——在浏览器或手机上操作完，一键把控制权还给 AI。

- 运行环境：macOS 13+ 的宿主机 + OpenCode 2.2.7+
- 打包形态：OpenCode 插件（`opencode.json` 的 `plugins` 里写插件名即可）

## 特性

**桌面级自动化**：基于 macOS 无障碍树（Accessibility API）按 UI 语义定位元素，而不是猜坐标；键鼠注入支持 AppleScript / CGEvent / 剪贴板写入，中英文输入法都能用。

**浏览器登录态复用**：自动连接宿主机上运行中的 Edge / Chrome（读 `DevToolsActivePort` 的 CDP 端口），直接用用户已登录的账号、Cookie 和扩展，不需要每次重新登录。

**人机无缝接管**：Agent 调用 `computer_request_takeover`，会话挂起，宿主机在桌面 App 侧边栏、或任何浏览器里的 Web 控制台给出实时画面；用户点击、滚动、打字完成后，点「完成，恢复 AI」就继续。

**24/7 防休眠与例行任务**：任务执行与等待接管期间用 `caffeinate` 保持清醒，结束后自动释放；内置例行任务调度器，按 Cron 或间隔周期自动派发会话。

**统一 RPC**：所有能力都走 `BotRpc`（`POST <server>/api/rpc/bot/<method>`），桌面面板与 Web 控制台用同一套协议，复用 OpenCode 服务自带的密码认证与远程访问隧道，插件不开自己的端口。

## 架构

```text
┌────────────────────────────────────────────────────────┐
│         OpenCode 桌面 App / Web / 手机客户端            │
│     聊天会话 + Live Screen 面板 / Web 控制台            │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / RPC / WebSocket
┌──────────────────────────▼─────────────────────────────┐
│            OpenCode Server（macOS 宿主机）              │
│  ┌──────────────────────────────────────────────────┐  │
│  │ opencode-remote-desktop                          │  │
│  │  TakeoverManager  挂起/恢复状态机                │  │
│  │  ScreenLock       谁在控制屏幕（AI / 人）        │  │
│  │  BotRpc           面板与控制台的唯一通道         │  │
│  │  RoutineScheduler 全天候定时器                   │  │
│  │  KeepAwake        caffeinate 防休眠              │  │
│  └───────────────┬───────────────────┬──────────────┘  │
│  ┌───────────────▼────────┐ ┌────────▼──────────────┐  │
│  │ agent-desktop          │ │ CDP / agent-browser   │  │
│  │ 无障碍树 + CGEvent     │ │ 连接本机 Edge/Chrome  │  │
│  └────────────────────────┘ └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 安装

### 1. 宿主机依赖

```bash
npm install -g agent-desktop agent-browser
agent-browser install                      # 首次下载 Chrome for Testing
agent-desktop permissions --guide          # 授予辅助功能与屏幕录制权限
```

装完在 OpenCode 里跑 `/doctor` 体检：CLI 版本、TCC 权限、原生直播组件、浏览器连接模式，缺什么会给出修复命令。

想用 WebRTC 低延迟直播（否则自动降级为 JPEG 轮询）需要自己编译原生组件：

```bash
npm run build:native     # 需要 Go 与 swiftc
```

已发布的包内置 `darwin-arm64` 的可执行文件；其他架构请在本机编译（源码在 `native/`）。

### 2. 注册插件

```json
{
  "plugins": [
    {
      "source": "opencode-remote-desktop",
      "options": {
        "consoleUrl": "https://bot-console.pages.dev",
        "keepAwake": "active",
        "reuseHostBrowser": true,
        "maxImageDimension": 1440,
        "jpegQuality": 72
      }
    }
  ]
}
```

只想用侧边栏看屏幕、不注册 `computer_*` 工具的控制端，加 `"host": false`。

### 3. 让手机/网页能接管

```bash
opencode service set remote true                                  # 打开远程访问隧道
opencode service set cors https://bot-console.pages.dev           # 允许控制台页面跨域
```

控制台是纯静态页，已部署在 Cloudflare Pages；也可以自己构建部署：

```bash
npm run build:pages
npx wrangler pages deploy pages --project-name bot-console
```

## 工具与命令

### AI 工具

| 工具 | 作用 |
| --- | --- |
| `computer_status` | 宿主机系统、分辨率、无障碍授权、接管控制台状态 |
| `computer_screenshot` | 截取屏幕或指定窗口，返回压缩 JPEG 与逻辑坐标 |
| `computer_desktop` | 原生桌面动作：`snapshot` 读无障碍树、`click`、`type`、`press`、`scroll` |
| `computer_browser` | 操作宿主机 Edge/Chrome：`open`、`snapshot`、`click`、`type`、`eval` |
| `computer_request_takeover` | 挂起会话、把屏幕交给人类，返回接管入口 |
| `computer_routine` | 例行任务：`list`、`add`、`remove` |
| `computer_secret_request` | 弹密钥输入卡片，值直接进 macOS 钥匙串，不返回给 Agent |
| `computer_secret_type` | 把已存密钥键入桌面元素，只返回成功与否 |

### 斜杠命令

| 命令 | 作用 |
| --- | --- |
| `/screen` | 打开/切换侧边栏 Live Screen |
| `/bot-link` | 给出 Web 控制台链接（不含凭证，可安全发进会话） |
| `/bot` | 查看状态与控制台入口 |
| `/takeover` | 手动挂起会话并请求接管 |
| `/routine` | 列出或管理例行任务 |
| `/doctor` | 宿主机依赖体检 |

### Live Screen 面板在哪出现

- **桌面 App 连远端服务**时才有侧边栏面板：`Cmd+Shift+S`、`/screen` 或侧边栏 `+` 菜单都能打开。桌面 App 连本机服务时面板、`+` 菜单项和 `/screen` 都会隐藏。
- **Web 端（含手机浏览器）不加载插件界面**——OpenCode 只在桌面 App 里加载配置中插件的 UI。所以 web / 手机、TUI、没装插件的控制端，靠 `/bot-link` 给出的 Web 控制台接管。
- 接管时若控制端没有面板（由桌面 App 里面板每 15 秒发的心跳判断），控制台链接会自动附在工具结果里，Agent 会原样贴进回复。

### 屏幕锁

Agent 正在操作屏幕时（用过桌面/浏览器工具，含其后 20 秒宽限），远程输入会被拒绝并返回 `agent-busy`，避免人在 AI 操作中途误触。面板与 Web 控制台都有「强制接管」按钮：中断 AI 并把屏幕交给人。

## Web 控制台

`https://bot-console.pages.dev/#server=<服务器地址>&session=<会话>`

- 参数放在 `#` 之后，不会发送给页面服务器。
- 首次打开输入 OpenCode 服务器密码，之后存在该浏览器的 localStorage。
- 服务器地址默认取 OpenCode 远程隧道，也可以用插件选项 `serverUrl` 指定；`consoleUrl` 改页面地址，设为 `""` 关闭链接。

## 安全

- 所有 RPC 都走 OpenCode 服务自身的密码认证，插件不开监听端口。
- 控制台链接里只有服务器地址与会话 ID，没有任何凭证。
- Web 控制台页面必须在服务的 `cors` 白名单里，否则请求被拒。
- 密钥只存 macOS 钥匙串（服务名 `opencode-bot`），值不经过 Agent、不进聊天记录。
- 已知限制：钥匙串条目由 `/usr/bin/security` 写入，同一用户的 `security find-generic-password` 能直接读出，插件只能让这类 shell 命令弹确认；键入密钥时值会短暂出现在 `agent-desktop` 的进程参数里。

## 限制

- 只有 macOS 宿主机能控制桌面；Linux / Windows 尚无 capture 后端，会退化为 JPEG 轮询。
- 首次使用需要在「系统设置 → 隐私与安全性」里授予辅助功能与屏幕录制权限，否则 `/doctor` 会报错。
- Live Screen 面板仅桌面 App + 远端服务可见；web/手机只能走控制台。

## 开发

```bash
npm install
npm run typecheck
npm test          # 49 项单元测试
npm run build     # 构建 dist/gui-experimental.cjs
```

## 发布

发版走 GitHub Actions 的 trusted publishing（OIDC + provenance），不需要在本机存 npm token：

```bash
git tag v0.2.0 && git push origin v0.2.0   # 或手动触发 workflow_dispatch
```

workflow 会在 macOS runner 上跑 typecheck、测试、编译原生 sidecar，然后 `npm publish --provenance`。tag 与 `package.json` 的版本不一致会直接失败。

首次需要在 npm 上授权这个 workflow 作为 trusted publisher：

```bash
npm trust github opencode-remote-desktop \
  --repo jarvisluk/opencode-remote-desktop \
  --file publish.yml --allow-publish
```

已经发过的版本会被自动跳过，所以给旧版本补 tag 也能跑绿；每个 tag 建议配一个 GitHub Release 记录变更：

```bash
gh release create v0.2.0 --generate-notes
```

也可以在 npmjs.com 的包设置 → Trusted publishing 里添加（Publisher: GitHub Actions，Repository: `jarvisluk/opencode-remote-desktop`，Workflow: `publish.yml`）。之后每次发版只要推 tag。

## License

MIT
