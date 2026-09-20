# opencode-token-board

> **OpenCode CLI 实时 Token 统计面板 · 同时支持 Mimo Code**
> Real-time token usage & performance dashboard plugin for OpenCode CLI and Mimo Code.

一个运行在 OpenCode TUI 侧边栏的实时面板,让你**亲眼看见**每次对话的 Token 消耗、缓存命中率与响应性能:
A live sidebar dashboard for the OpenCode TUI that lets you **see** your token consumption, cache hit rate and response performance in real time:

> 🔔 **更新提示（重要）**
> `0.2.2` 起插件会自动检查 npm 新版本（Toast + 侧边栏 + 一键升级）。
> 若你装的是 **`≤ 0.2.1`，收不到任何自动提示**，请先手动升级一次：
> ```sh
> rm -rf ~/.cache/opencode/packages/opencode-token-board@latest
> ```
> 然后重启 OpenCode；或把配置写成 `"opencode-token-board@0.2.2"`。详见 [更新插件](#更新插件)。
>
> 🔔 **Update notice (important)**
> Since `0.2.2` the plugin auto-checks for updates. If you're on **`≤ 0.2.1`** you won't
> be notified — update once manually via the command above, or pin `"opencode-token-board@0.2.2"`.

- 📊 **实时 Token 统计** — 输入/输出/推理 Token、成本,随对话滚动更新 / Real-time input/output/reasoning tokens & cost
- ⚡ **缓存命中率** — 上下文缓存命中可视化,帮你判断 prompt 复用效果 / Visual cache-hit rate to gauge prompt reuse
- 🚀 **性能指标** — TTFT / TPS / 延迟,追踪模型响应速度 / TTFT, TPS and latency tracking
- 📈 **报告导出** — HTML / JSON / Markdown 一键生成,数据落盘 `~/.opencode/reports/` / One-click HTML/JSON/Markdown reports
- 💰 **Go 余额查询** — 查询 OpenCode Go 套餐余量 / Check your OpenCode Go plan balance
- 🔔 **版本更新提示** — 启动时检查 npm 新版本，侧边栏 + Toast 提示并可一键升级 / Update check with in-TUI upgrade
- 🖥️ **桌面权限弹窗（跨平台）** — AI 请求权限时右下角弹窗,可远程批准/拒绝（Windows WinForms / macOS AppleScript / Linux 通知兜底）/ Cross-platform permission toast with allow/deny buttons
- ⚡ **事件驱动,零轮询** — 权限批准用 `fs.watch`、配置变更用进程内发布订阅、历史消息用事件 + 有界退避重试,不再有常驻定时器 / Event-driven, no polling timers
- 🧩 **兼容 OpenCode 与 Mimo Code** — 同一插件,双端可用 / Works with both OpenCode and Mimo Code

本项目基于 [opencode-token-watch](https://github.com/Howardzhangdqs/opencode-token-watch) 修改而来,特此鸣谢原项目作者。

**新增权限请求弹窗**

![preview1](./assets/preview4.png)

**全部折叠**

![preview1](./assets/preview1.png)

**折叠子项**

![preview2](./assets/preview2.png)

**全部展开**

![preview3](./assets/preview3.png)

## 安装

```sh
npm install opencode-token-board
```

在 `opencode.json` 或 `opencode.jsonc` 中添加：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-token-board"]
}
```

也可以在 OpenCode TUI 中按 `Ctrl+P` 打开命令面板，选择 **Install plugin**，输入 `opencode-token-board` 安装。

## 配置

在 OpenCode TUI 中输入 `/usage` → **设置**，可交互式开关各显示项和切换界面语言，配置自动持久化，无需手动编辑配置文件。

## 用法

在 OpenCode TUI 中输入 `/usage`，选择：

- **HTML 报告** — 选择日期范围，生成仪表盘并在浏览器打开
- **JSON 导出** — 导出完整用量数据至 `~/.opencode/reports/`
- **文本报告** — 导出 Markdown 格式至 `~/.opencode/reports/`
- **设置** — 开关侧边栏显示项、切换语言

## 配置 OpenCode Go 套餐余量查询

> 新版已不再依赖浏览器 Cookie / Workspace ID。opencode.ai 改版后旧页面
> （`/workspace/wrk_xxx/go`）与 Cookie 方案已失效，插件改为直接调用与推理 API
> 同源的用量接口 `GET https://opencode.ai/zen/go/v1/usage`（`Authorization: Bearer <Go API Key>`）。

**默认零配置**：插件会按以下顺序自动解析 Go API Key：

1. `~/.local/share/opencode/auth.json` 中的 `opencode-go`（其次 `opencode`）
2. `~/.config/opencode/opencode.json[c]` 中 `provider.go.options.apiKey`
3. 插件内手动配置（`/usage` → **Go 配置** → **设置 Go API Key**）

只要本机已用 OpenCode 登录/配置过 Go，侧边栏会自动显示滚动 / 本周 / 本月用量，无需任何操作。

如自动解析失败（例如使用独立 API Key），可手动填入：

1. 输入 `/usage`，点击 **Go 配置**
2. 选择 **设置 Go API Key**，粘贴 `sk-...` 开头的 Key（留空则恢复自动解析）
3. 完成后重启 TUI

## 更新插件

opencode **不会自动更新 npm 插件**：它把纯包名解析为 `<name>@latest` 后安装到
`~/.cache/opencode/packages/<name>@latest/`，但只要该目录里已有 `node_modules/<name>`
就直接复用、**不再访问 registry**。因此本插件内置了版本检查来主动提示：

- **启动检查**：插件启动约 1.5s 后请求 `https://registry.npmjs.org/opencode-token-board/latest`，
  每 6 小时最多检查一次（结果缓存于 `api.kv`）。
- **提示方式**：有新版本时弹出 Toast，并在侧边栏底部常驻一行 `⬆ 新版本 vX · /usage`（可点击）。
- **一键升级**：`/usage` → **检查更新** → **立即更新**，会调用 `api.plugins.install("<pkg>@<新版本>")`，
  装到带版本号的新缓存目录并改写配置，重启 TUI 生效。
- **忽略版本**：可选“忽略此版本”，不再对该版本提示。

> ⚠️ **冷启动说明**：内置提示是 0.2.2 才加入的。因此 **0.2.0 / 0.2.1 的用户收不到任何提示**，
> 需要手动升级一次到 `0.2.2+`；此后新版本才会自动提示。

手动更新（任一即可）：

```sh
# 方式 A：清掉缓存目录后重启（会重新解析 @latest）
rm -rf ~/.cache/opencode/packages/opencode-token-board@latest

# 方式 B：配置里写明确版本，重启后装到新目录
#   "plugin": ["opencode-token-board@0.2.2"]
```

本地路径开发模式无需更新机制：`npm run build` 后重启即最新。

## 数据文件

| 文件 | 路径 | 说明 |
|------|------|------|
| JSONL 日志 | `~/.opencode/tokenwatch.jsonl` | 原始请求日志 |
| 聚合统计 | `~/.opencode/tokenwatch-stats.json` | 持久化性能统计 |
| 报告输出 | `~/.opencode/reports/` | HTML / JSON / Markdown 报告 |

## 系统要求

- OpenCode CLI（支持 `opencode db` 命令）
- Node.js 18+
- 操作系统：Windows / macOS / Linux

## 跨平台支持

| 能力 | Windows | macOS | Linux |
|------|---------|-------|-------|
| 侧边栏面板 / 报告 / Go 用量 | ✅ | ✅ | ✅ |
| 浏览器打开报告 | ✅ `start` | ✅ `open` | ✅ `xdg-open` |
| 会话结束桌面提示 | ✅ WinForms | ✅ `osascript display notification` | ✅ `notify-send` |
| 权限弹窗（可批准/拒绝） | ✅ WinForms 三按钮 | ✅ `osascript display dialog` 三按钮 | ✅ `zenity` 三按钮（缺 zenity 时退化为通知） |

说明：

- **凭据/配置路径全平台一致**：opencode 在三大平台都按 XDG 约定读取
  `~/.local/share/opencode/auth.json` 与 `~/.config/opencode/opencode.json[c]`
  （除非显式设置了 `XDG_DATA_HOME` / `XDG_CONFIG_HOME`），插件据此自动发现 Go API Key。
- **macOS 权限弹窗**：通过 `osascript` 弹出系统对话框，点按后由 AppleScript 写入与
  Windows 完全相同的批准标记文件（`~/.opencode/tokenwatch-approvals/<id>.<reply>`），
  因此批准链路无需额外改动。
- **Linux 权限弹窗**：通过 `zenity --question --switch` + 三个 `--extra-button` 提供三按钮，
  点按的按钮文案由 stdout 返回、据此写入批准标记；未安装 zenity 时退化为 `notify-send`
  通知，直接在 TUI 内回复即可。

> 在 Windows 上无法执行 `osascript` / `notify-send`，因此 macOS/Linux 分支通过
> 「生成脚本字符串 + 断言」的方式做单元校验（`npm run test:popup` 覆盖 AppleScript
> 生成、转义、按钮顺序与标记路径），并配合 `tsc` 类型检查；真机行为仍需在对应系统上冒烟。

## 性能设计

插件刻意避免常驻轮询与同步阻塞 I/O：

- **权限批准**：`fs.watch` 监听批准目录（仅在有待审批请求时开启），取代旧的 300ms 轮询。
- **配置变更**：进程内发布订阅（`config-store.ts`），取代旧的 500ms kv 版本轮询。
- **历史消息加载**：打开会话时立即读一次，为空则按 250/500/1000/2000/3000ms 有界退避重试，
  并在 `message.updated` / `session.idle` 事件到达时提前结束；取代旧的 200ms×50 轮询。
- **会话性能统计**：改为异步读 JSONL（`fs/promises` + mtime 缓存），不再在切换会话时同步
  读取整个日志文件阻塞 UI。
- **持久化统计**：内存维护单份统计，写入防抖合并（≤800ms 一次），不再每条消息都同步读写整个文件。
- **渲染节流**：流式期间 `message.part.updated` 高频触发，面板重算节流为最多约 4 次/秒；
  分位数只在生成报告时计算，侧边栏渲染不再对全量样本排序。

## 构建

```sh
npm install
npm run build
npm run test:popup   # 弹窗脚本 + 跨平台脚本生成断言
```

## 插件安装、更新与排障指南（经验文档）

> 本文档记录在 OpenCode / MiMoCode 中安装、更新、排障本插件的完整方法，
> 基于真实排查经历整理，避免每次重新摸索原理。

### 一、插件加载机制（原理）

#### 1. 配置文件位置

| Agent | 服务端插件配置 | TUI 插件配置 |
|-------|----------------|--------------|
| OpenCode | `~/.config/opencode/opencode.jsonc`（或 `opencode.json`） | `~/.config/opencode/tui.json` |
| MiMoCode | `~/.config/mimocode/mimocode.json` / `mimocode.jsonc` | `~/.config/mimocode/tui.json` |

服务端配置示例（`opencode.jsonc` / `mimocode.jsonc`）：

```json
{
  "plugin": ["opencode-token-board"]
}
```

TUI 配置示例（`tui.json`）：

```json
{
  "plugin": [
    ["opencode-token-board", { "enabled": true }]
  ]
}
```

#### 2. 插件引用的两种方式

- **npm 包名**（如 `"plugin": ["opencode-token-board"]`）：
  启动时用 bun 从 npm registry 拉取 **latest** 版本到本地缓存目录，之后一直用缓存。
  - OpenCode 缓存：`~/.cache/opencode/packages/opencode-token-board@latest/`
  - MiMoCode 缓存：`~/.cache/mimocode/packages/opencode-token-board@latest/`

- **本地路径**（开发/调试时用，直接加载本地目录）：
  ```json
  { "plugin": ["D:/AndroidPr/opencode-token-board"] }
  ```

#### 3. 路径判定规则（重要，易踩坑）

OpenCode/MiMoCode 的插件 spec 判定逻辑（`Jq()`）只认三种"本地路径"形式：

1. `file://` 前缀 —— `file:///D:/AndroidPr/opencode-token-board`
2. `.` 开头（相对路径）—— `./my-plugin`
3. Windows 绝对路径 —— `D:/AndroidPr/opencode-token-board`（或 `D:\AndroidPr\...`）

**注意：`file:D:/...`（单斜杠的 `file:` 协议）不会被识别为本地路径**，
会被当作 npm spec 解析导致加载异常。必须写成上面三种形式之一。

#### 4. 插件包的结构要求

插件包通过 package.json 的 `exports` 导出子路径，OpenCode 按需加载：

```json
{
  "main": "./dist/server.js",
  "exports": {
    ".":       { "import": "./dist/server.js" },
    "./server": { "import": "./dist/server.js" },
    "./tui":   { "import": "./dist/tui.js", "config": { "enabled": true } },
    "./package.json": "./package.json"
  }
}
```

- `dist/server.js` 默认导出 `{ id, server }`（服务端插件）
- `dist/tui.js` 默认导出 `{ id, tui }`（TUI 插件）
- 同一个默认导出对象不能同时含 `server()` 和 `tui()`，否则报错
  `must default export either server() or tui(), not both`

### 二、排查"改了代码 / 构建了新产物，但插件不生效"

#### 现象

本地 `npm run build` 产出了新 `dist/`，重启 OpenCode 后新功能（如权限弹窗）不出现。

#### 根因

`opencode.jsonc` 里写的是 npm 包名，OpenCode 从不加载本地 `dist/`，
而是从 **npm registry 拉取已发布的旧版本**到 `~/.cache/opencode/packages/`。
即使 `~/.config/opencode/package.json` 里写了 `"opencode-token-board": "file:..."`、
`~/.config/opencode/node_modules/opencode-token-board` 是指向本地的 junction，
**OpenCode 的插件加载也不走 config 目录的 node_modules** —— 它只认 npm 缓存或显式路径。

#### 排查步骤

1. 确认插件实际加载的是哪个目录、什么版本：
   ```sh
   # 缓存里的版本（OpenCode 实际加载的）
   cat ~/.cache/opencode/packages/opencode-token-board@latest/node_modules/opencode-token-board/package.json | grep version
   # 对比本地构建
   grep '"version"' package.json
   ```
2. 对比缓存包与本地 `dist/` 的构建时间、文件大小，确认缓存是旧产物：
   ```sh
   ls -la ~/.cache/opencode/packages/opencode-token-board@latest/node_modules/opencode-token-board/dist/
   ls -la dist/
   ```
3. 检查缓存包是否包含期望的新逻辑（如权限弹窗函数）：
   ```sh
   grep -c "macPermissionScript" ~/.cache/opencode/packages/opencode-token-board@latest/node_modules/opencode-token-board/dist/tui.js
   ```

#### 解决方案

把 plugin 配置改成本地绝对路径：

```json
{ "plugin": ["D:/AndroidPr/opencode-token-board"] }
```

```json
{
  "plugin": [["D:/AndroidPr/opencode-token-board", { "enabled": true }]]
}
```

重启后即加载本地最新 `dist/`，无需发布。

### 三、权限弹窗功能专项排查

本插件的 Windows 桌面权限弹窗链路：

```
AI 请求权限 → OpenCode 发出 permission.asked 事件
  → TUI 插件 api.event.on("permission.asked") 捕获
  → notify.ts 拉起独立桌面弹窗（Windows: wscript+PowerShell WinForms / macOS: osascript display dialog）
  → 用户点击"允许一次/总是允许/拒绝"
  → 弹窗进程写入 ~/.opencode/tokenwatch-approvals/<requestID>.<reply> 标记文件
  → 插件用 fs.watch 监听该目录（仅在有待审批请求时开启）→ api.client.permission.reply() 放行/拒绝
```

#### 1. 事件名：`permission.asked` 是对的

- 文档（<https://opencode.ai/docs/plugins/>）列出的权限事件是 `permission.asked` / `permission.replied`。
- OpenCode 1.18.x 运行时二进制中确实存在 `permission.asked` 字符串。
- **注意**：`@opencode-ai/plugin` 的 SDK 类型定义（`types.gen.d.ts`）里事件枚举
  写的是 `permission.updated` / `permission.replied`，**没有 `permission.asked`**，
  但那是 SDK 类型滞后，运行时实际发出的就是 `permission.asked`。以运行时为准，
  别因为 TS 类型里没有就改掉监听的事件名。

#### 2. 验证权限请求真的发生了

OpenCode 日志：`~/.local/share/opencode/log/opencode.log`

```sh
grep "asking id=per_" ~/.local/share/opencode/log/opencode.log
```

- 有 `message=asking id=per_xxx permission=xxx` → 权限请求发生了，事件链路应该走通。
- 注意：若日志显示 `action.action=allow`（权限被自动放行），则不会触发
  `permission.asked`，弹窗自然不出现。要测弹窗，需让权限真正处于"询问"状态。

#### 3. 验证弹窗标记目录

`~/.opencode/tokenwatch-approvals/` 下应有 `<requestID>.<reply>` 文件
（requestID 是 `per_xxx` 格式）。若目录里只有手动测试的假文件名
（如 `final-confirm.always`），说明真实权限请求从未触发弹窗。

#### 4. 弹窗不显示时的快速自测

```sh
npm run test:popup   # 校验弹窗脚本生成与 PowerShell 语法
```

### 四、发布到 npm

#### 1. 升级版本号

```sh
npm version 0.2.0 --no-git-tag-version   # 只改版本号，不自动提交/打 tag
```

#### 2. 构建与测试

```sh
npm run test:popup   # 弹窗脚本测试（35 项断言）
npm run build        # prepublishOnly 也会自动执行
```

#### 3. 发布与 2FA

npm 账号开启双因素认证（2FA）后，普通登录 token 发布会报 403：

```
403 Forbidden - PUT https://registry.npmjs.org/opencode-token-board
Two-factor authentication or granular access token with bypass 2fa enabled is required
```

两种解决方式：

- **方式 A：OTP 动态码**
  ```sh
  npm publish --otp=<6位动态码>
  ```
- **方式 B：带 bypass 2FA 的 granular token（推荐，可脚本化）**
  在 npmjs.com → Access Tokens 生成 Granular Access Token，
  勾选 Packages: Read and write + **Bypass 2FA**，然后用临时 `.npmrc` 注入：
  ```powershell
  $tempNpmrc = Join-Path $env:TEMP "publish-npmrc.txt"
  "//registry.npmjs.org/:_authToken=npm_xxxxx" | Set-Content $tempNpmrc
  npm publish --userconfig $tempNpmrc
  Remove-Item $tempNpmrc   # 用完即删，不写入持久配置
  ```

#### 4. 验证发布结果

```sh
npm view opencode-token-board versions --json
npm view opencode-token-board dist-tags --json   # 确认 latest = 0.2.0
```

### 五、MiMoCode 插件更新

MiMoCode 的插件加载机制与 OpenCode 完全一致（缓存目录为
`~/.cache/mimocode/packages/`）。更新步骤：

1. 在 `~/.config/mimocode/package.json` 添加远程依赖：
   ```json
   { "dependencies": { "opencode-token-board": "^0.2.0" } }
   ```
2. 安装（测试 npm 远程下载）：
   ```sh
   cd ~/.config/mimocode && npm install
   ```
3. **关键**：更新 MiMoCode 自己的插件缓存（否则它仍用缓存的旧版）：
   ```sh
   cd ~/.cache/mimocode/packages/opencode-token-board@latest
   # 把 package.json 里的版本改为 0.2.0，然后：
   rm -rf node_modules/opencode-token-board
   npm install
   ```
4. 验证缓存版本与内容：
   ```sh
   grep '"version"' ~/.cache/mimocode/packages/opencode-token-board@latest/node_modules/opencode-token-board/package.json
   grep -c "macPermissionScript" ~/.cache/mimocode/packages/opencode-token-board@latest/node_modules/opencode-token-board/dist/tui.js
   ```
5. 重启 MiMoCode 生效。

### 六、日志速查

| 目标 | 路径 | 关键字 |
|------|------|--------|
| OpenCode 主日志 | `~/.local/share/opencode/log/opencode.log` | `permission.asked`、`asking id=per_`、`evaluated permission` |
| OpenCode TUI 插件加载 | 同上 | `loading tui config`、`applying tui config` |
| MiMoCode 主日志 | `~/.local/share/mimocode/log/main-*.log` | `service=tui.plugin path=opencode-token-board` |
| MiMoCode worker 日志 | `~/.local/share/mimocode/log/worker-*.log` | `service=plugin path=opencode-token-board` |
| 弹窗标记目录 | `~/.opencode/tokenwatch-approvals/` | `<requestID>.once/.always/.reject` |
| 弹窗 PowerShell 报错 | `%TEMP%\opencode-token-board-notify-error.log` | — |

### 七、经验要点（TL;DR）

1. **OpenCode/MiMoCode 加载 npm 插件永远走 `~/.cache/<agent>/packages/` 缓存**，
   不读 config 目录的 node_modules，改代码必须改配置为本地路径或用新版本号发布。
2. **本地路径必须写** `file:///D:/...`、`./xxx` 或 `D:/...`，
   `file:D:/...` 这种写法不被识别。
3. **权限事件名用 `permission.asked`**（SDK 类型里没有它，别被类型定义误导）。
4. **权限自动 allow 时不会触发弹窗**，测弹窗前先确认权限处于"询问"状态。
5. **npm 2FA 账号发布**：用带 bypass 2FA 的 granular token + 临时 `.npmrc`，最省事。
6. **升级版本号用 `npm version x.y.z --no-git-tag-version`**，避免自动提交干扰。
7. **npm 插件不会自动更新**：加载时把纯包名解析为 `<name>@latest`，但 `Npm.add`
   先检查缓存目录 `node_modules/<name>` 是否存在，存在就直接复用、**不再访问 registry**。
   更新需主动处理其一：① 删除 `~/.cache/<agent>/packages/<name>@latest/` 后重启；
   ② 配置里写明确版本 `opencode-token-board@0.2.1`（目录名变化触发新装）；
   ③ 改用本地路径（每次启动直读本地 `dist/`，`npm run build` 后重启即最新）。



## 相关项目

- [opencode-throughput](https://github.com/Howardzhangdqs/opencode-throughput) — 实时 LLM 性能监控，采集 TTFT/TPS/延迟和成本
- [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — TUI 侧边栏缓存命中率可视化，Token 分布分析
- [magic-context](https://github.com/cortexkit/magic-context/) — 缓存感知的无限上下文 + 跨会话记忆系统
- [opencode-token-watch](https://github.com/Howardzhangdqs/opencode-token-watch) — OpenCode 侧边栏显示 Token 用量
- [AIUsageTracker](https://github.com/rygel/AIUsageTracker) — Windows 托盘小软件，查看模型使用情况

## 许可

MIT
