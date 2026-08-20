# opencode-token-board

> **OpenCode CLI 实时 Token 统计面板 · 同时支持 Mimo Code**
> Real-time token usage & performance dashboard plugin for OpenCode CLI and Mimo Code.

一个运行在 OpenCode TUI 侧边栏的实时面板,让你**亲眼看见**每次对话的 Token 消耗、缓存命中率与响应性能:
A live sidebar dashboard for the OpenCode TUI that lets you **see** your token consumption, cache hit rate and response performance in real time:

- 📊 **实时 Token 统计** — 输入/输出/推理 Token、成本,随对话滚动更新 / Real-time input/output/reasoning tokens & cost
- ⚡ **缓存命中率** — 上下文缓存命中可视化,帮你判断 prompt 复用效果 / Visual cache-hit rate to gauge prompt reuse
- 🚀 **性能指标** — TTFT / TPS / 延迟,追踪模型响应速度 / TTFT, TPS and latency tracking
- 📈 **报告导出** — HTML / JSON / Markdown 一键生成,数据落盘 `~/.opencode/reports/` / One-click HTML/JSON/Markdown reports
- 💰 **Go 余额查询** — 查询 OpenCode Go 套餐余量 / Check your OpenCode Go plan balance
- 🖥️ **Windows 桌面权限弹窗** — AI 请求权限时右下角弹窗,可远程批准/拒绝 / Native Windows permission toast with allow/deny buttons
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

1. 输入 `/usage`，点击 **Go 配置**
2. 打开用量查询页面 <https://opencode.ai/workspace/wrk_xxx/go>，将 `wrk_xxx` 填入 **Workspace**
3. 按 `F12` 打开开发者工具 → **应用程序** → **Cookie**，找到 `auth`，复制整段文本填入 **Cookie**
4. 点击完成后重启 TUI

## 数据文件

| 文件 | 路径 | 说明 |
|------|------|------|
| JSONL 日志 | `~/.opencode/tokenwatch.jsonl` | 原始请求日志 |
| 聚合统计 | `~/.opencode/tokenwatch-stats.json` | 持久化性能统计 |
| 报告输出 | `~/.opencode/reports/` | HTML / JSON / Markdown 报告 |

## 系统要求

- OpenCode CLI（支持 `opencode db` 命令）
- Node.js 18+

## 构建

```sh
npm install
npm run build
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
   grep -c "notifyPermissionWindows" ~/.cache/opencode/packages/opencode-token-board@latest/node_modules/opencode-token-board/dist/tui.js
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
  → notify.ts 通过 wscript 拉起独立 PowerShell WinForms 弹窗（右下角）
  → 用户点击"允许一次/总是允许/拒绝"
  → 写入 ~/.opencode/tokenwatch-approvals/<requestID>.<reply> 标记文件
  → 插件轮询目录 → api.client.permission.reply() 放行/拒绝
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
   grep -c "notifyPermissionWindows" ~/.cache/mimocode/packages/opencode-token-board@latest/node_modules/opencode-token-board/dist/tui.js
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



## 相关项目

- [opencode-throughput](https://github.com/Howardzhangdqs/opencode-throughput) — 实时 LLM 性能监控，采集 TTFT/TPS/延迟和成本
- [opencode-visual-cache](https://github.com/Hotakus/opencode-visual-cache) — TUI 侧边栏缓存命中率可视化，Token 分布分析
- [magic-context](https://github.com/cortexkit/magic-context/) — 缓存感知的无限上下文 + 跨会话记忆系统
- [opencode-token-watch](https://github.com/Howardzhangdqs/opencode-token-watch) — OpenCode 侧边栏显示 Token 用量
- [AIUsageTracker](https://github.com/rygel/AIUsageTracker) — Windows 托盘小软件，查看模型使用情况

## 许可

MIT
