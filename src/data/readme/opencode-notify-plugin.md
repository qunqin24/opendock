# opencode-notify-plugin

[![npm](https://img.shields.io/npm/v/opencode-notify-plugin.svg)](https://www.npmjs.com/package/opencode-notify-plugin)
[![ci](https://github.com/micaiguai/opencode-notify-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/micaiguai/opencode-notify-plugin/actions/workflows/ci.yml)

OpenCode 插件：会话跑完、需要你回答、需要你授权时，发一条 **Windows/macOS/Linux 系统通知**，不用一直盯着终端。

按 opencode **v2.1.2**（`@opencode/plugin` 的 `Plugin` 接口：默认导出 `{ id, setup }`）实现，只订阅事件，不改 opencode 行为。

## 触发时机

| opencode 事件 | 通知标题 | 通知正文 |
| --- | --- | --- |
| `session.execution.succeeded` / `session.idle` | `✅ <项目名>` | `会话完成：<会话标题>` |
| `session.execution.failed` | `⚠️ <项目名>` | `会话失败：<错误信息>` |
| `form.created` | `❓ <项目名>` | `等待回答：<表单标题>（字段…）` |
| `permission.asked` | `🔐 <项目名>` | `等待授权：<action>（资源…）` |

`session.idle` 只在 TUI 里发，`opencode run` 的一轮结束只发 `session.execution.*`，两条都订阅才能覆盖。

几条约定：

- **子会话不提醒**：subagent 结束时父会话也会结束，只提醒父会话，避免刷屏。
- **一轮只提醒一次**：`session.execution.*` 带 `durable.seq`，同一个 seq 视为同一轮；`session.idle` 没有 seq，跟在上一条通知后 3 秒内视为同一轮（所以快速接连的两轮不会互相压掉）。同一 `event id` 10 秒内只提醒一次，去重表在进程内共享，多 location 加载多个插件实例也不会重复弹。
- **不回放历史**：`session.execution.*` 是 durable 事件，插件启动前产生的直接丢掉，避免一加载就弹一堆旧通知。
- **查不到会话也提醒**：`session.get` 失败（会话刚被删）时退回通用文案，不吞掉提醒。

## 接入 opencode

opencode v2 的字段是 `plugins`（数组），v1 是 `plugin`，别混。数组元素可以是包名，也可以是 `{ "package": …, "options": … }`。

### 方式一：从 npm 安装（推荐）

```bash
opencode plugin add opencode-notify-plugin      # 等价于往全局 plugins 里加一条包名
```

或手写全局配置（`~/.config/opencode/opencode.json`）：

```jsonc
{
  "plugins": ["opencode-notify-plugin"]
}
```

要改配置项就写成对象形式：

```jsonc
{
  "plugins": [
    {
      "package": "opencode-notify-plugin",
      "options": { "sound": false }
    }
  ]
}
```

注意别装成 npm 上的 `opencode-notify`——那是别人的另一个实现，名字只差一个后缀。

### 方式二：本地克隆（改代码/调试用）

```bash
git clone https://github.com/micaiguai/opencode-notify-plugin ~/src/opencode-notify-plugin
```

项目级（只对这个项目生效，`opencode.json` 放项目根）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/opencode-notify-plugin"]
}
```

全局（所有项目生效，`~/.config/opencode/opencode.json`）：

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-notify-plugin",
      "options": { "sound": false }
    }
  ]
}
```

### 两种方式共同的注意事项

- 本地克隆时路径指向**仓库目录**，不是 `index.ts`（指到文件会报 `configured plugin path must be a directory`）。目录通过 `package.json` 的 `main` 找到 `index.ts`，由 opencode 的 bun 运行时直接加载 TS，不需要预编译。
- `opencode plugin add` 只接受 npm / Git 包名；本地目录得手写配置。
- 改完重新打开 opencode 生效，`opencode plugin list` 能看到 `opencode-notify-plugin`（`SOURCE` 是实际解析到的入口路径）就说明接上了。
- 没生效时看 `~/.local/share/opencode/log/opencode.log`：加载成功会有 `loading plugin … entrypoint=file:///…/index.ts`；路径写错（比如指到 `.ts` 文件）只有一行 `configured plugin path must be a directory` 的 WARN，界面上不会报错。
- 全新目录里第一次跑 `opencode plugin list` 可能返回 `No plugins found`，紧接着再跑一次就正常，别被这个误导。

## 配置项

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `sound` | `true` | `false` 时静音：Windows 用静音 toast（`<audio silent="true"/>`），macOS 不传 `sound name`。Linux 由通知守护进程决定，插件不做处理 |
| `sticky` | `false` | `true` 时通知留在屏幕上直到用户处理：Windows 用 `scenario="reminder"`，Linux 传 `notify-send -t 0`。**macOS 无效**，见下 |
| `events.sessionFinished` | `true` | 一轮结束（成功或失败）提醒，旧名 `sessionIdle` 仍兼容 |
| `events.formCreated` | `true` | 提问/表单提醒 |
| `events.permissionAsked` | `true` | 授权请求提醒 |

字段类型不对时按默认值处理，不会因为写错配置把插件搞挂。

## 平台实现

- **Windows**：`cmd /c start "" /b powershell.exe -EncodedCommand …` 调 WinRT `ToastNotificationManager`。
  - 走 `start` 而不是直接 spawn，是因为 `opencode run` 一轮结束就退出，直接 spawn 的子进程会被一起回收，toast 还没来得及弹。`start` 把 powershell 甩到独立进程，CLI 退出也能弹出来。
  - 通知内容（XML）通过环境变量传，避免命令行引号和编码问题。
  - AUMID 复用开始菜单里已注册的 `Windows PowerShell`，因此通知能进操作中心，但**通知上的应用名会显示为 "Windows PowerShell"**。
  - `sticky: true` 时用 `<toast scenario="reminder">`，通知驻留到用户处理为止。代价是这个场景**能绕过勿扰模式**，所以默认关闭。
  - `start` 失败时退回直接调 `powershell.exe`。
- **macOS**：`osascript -e 'display notification … '`，文本走 argv，不拼 AppleScript 源码。`sound` 打开时多传一个参数 `Glass` 走 `sound name`（系统自带提示音），关闭时不传这个参数。注意：横幅仍然会在几秒后自动消失，要它一直留在屏幕上只能去 `系统设置 → 通知 → 脚本编辑器` 把样式改成「提醒」，那是系统侧设置，插件改不了。
- **Linux**：`notify-send`，`sound` 由通知守护进程决定，插件不做处理。`sticky: true` 时传 `-t 0` 请求「不自动过期」，但是否真的常驻由守护进程决定——dunst 认，部分实现会忽略 0 退回默认时长。

命令找不到或执行失败只记一行 `[opencode-notify-plugin] …` 日志到 stderr，不影响 opencode 主流程。

## 自检

```bash
npm run typecheck              # tsc --noEmit
npm test                       # node --test（Node 24 直接跑 .ts）
npm run preview                # 真的弹一条“会话完成”通知
npm run preview -- permission  # 弹一条“等待授权”通知
npm run preview -- idle sticky # 预览驻留模式（macOS 上无效，只打一行提示）
```

`preview` 是验证当前机器通知链路最快的方式：能弹出来，说明 `cmd → powershell → WinRT` 这一段没问题。

## 与 opencode 内置通知的关系

opencode v2 的 `~/.config/opencode/cli.json` 里已经有 `attention.notifications`（终端层面的提醒）。本插件走系统通知 API，不依赖终端是否支持 OSC 9 之类的转义序列，两者可以并存。

## 已知限制

- 点通知不会切回对应的终端/会话：需要给插件注册自己的 AUMID（开始菜单快捷方式）并做协议激活，目前没做。
- **通知图标不可自定义**：图标由发送 App 决定（macOS 是「脚本编辑器」的卷轴图标，Windows 是 "Windows PowerShell" 的图标）。插件靠标题里的 emoji（✅ ⚠️ ❓ 🔐）区分事件类型，这是不引入外部依赖前提下唯一可控的视觉标记。
- **macOS 上通知无法常驻**：`osascript` 没有让横幅驻留的 API，`sticky` 在这个平台是空操作（会在 stderr 提示一次）。要驻留只能把通知样式改成「提醒」。
- Windows 上通知的应用名是 "Windows PowerShell"（共用已注册 AUMID 的代价），且 `sticky` 用的 `reminder` 场景会绕过勿扰模式。
- 事件流断开后不会自动重连，要等 opencode 重新加载插件。

## 目录

```
index.ts              # opencode 加载的入口，默认导出 { id, setup }
src/plugin.ts         # 订阅事件、分发通知、返回 cleanup
src/events.ts         # 事件 → 通知文案、去重、子会话过滤
src/notifier.ts       # 串行队列 + 子进程执行 + 超时
src/platform.ts       # 各平台命令与 Windows toast XML
src/options.ts        # 插件 options 解析
test/                 # node:test 单测（不真的弹通知）
scripts/preview.ts    # 手动弹真实通知
```
