# OpenCode QQ Bot

通过 QQ 机器人与 [OpenCode](https://opencode.ai) AI 编程助手对话——双向监控桌面会话、远程发起任务、权限审批与选择弹窗直达 QQ、图片语音双向、长任务不丢答案。

[![npm version](https://img.shields.io/npm/v/@linjz/opencode-qqbot)](https://www.npmjs.com/package/@linjz/opencode-qqbot)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![QQ Bot](https://img.shields.io/badge/QQ_Bot-API_v2-red)](https://bot.q.qq.com/wiki/)
[![Bun](https://img.shields.io/badge/Bun->=1.0-fbf0df)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)

> 面向中文用户。OpenCode V2（桌面后台服务）+ QQ 官方开放平台机器人（C2C 单聊 / 群聊 @）。

## 功能一览

| 能力 | 说明 |
|---|---|
| 双向对话 | QQ 消息直达 opencode 会话，AI 回复推回 QQ（markdown 渲染、长文自动结构化分条：表格不拆散、代码块围栏自动修补） |
| 桌面会话镜像 | 📋 摘要卡：桌面会话的最近一轮问答实时推送到 QQ（默认全文） |
| 进度观察 | `/watch` 订阅工具调用里程碑（🔧 命令摘要/退出码），节流合并推送 |
| **权限审批** | opencode 发起权限请求 → QQ 收 🔐 四键卡片（允许一次/总是允许/拒绝/忽略），点按钮静默生效（点击后按钮回显 ✓，其余置灰），也可文字回复"允许/总是/拒绝" |
| **选择弹窗桥接** | opencode 的 Form（选择/多选/布尔/文本）→ QQ 📝 卡片，点按钮或回字母（A/B/C）作答；桌面端回合发起的审批/表单**同样**推送（常驻监听，12s 轮询，bot 空闲也收得到） |
| 远程指令 | `/new /stop /status /sessions /history /model /agent /rename /watch /mirror /progress /queue /send` |
| 富媒体 | 收图（原生附件给 AI 看图）；**收语音**（QQ 内置 ASR 免费转文字进 prompt）；**发图/发文件**（AI 回复含 `QQ_SEND_FILE: <路径>` 标记或 `/send <路径>` 指令，20MB 上限） |
| 引用上下文 | 长按引用某条消息提问，AI 能感知被引用的内容（我方回复也会入索引缓存） |
| 长任务不丢 | 前台 30min 超时 → 后台等待（SSE + 轮询，最长 24h）；停滞 30min 主动提醒"可能桌面端在等弹窗" |
| 自恢复 | 开机竞态退避、端口漂移自动发现与热换基、巡检告警（QQ 主动消息）、看门狗进程守护、网关重投去重 + QQ msgId 跨进程/重启认领 |
| 安全 | fail-closed 名单准入（名单外一律拒绝）、下载域白名单、日志密钥打码、推送内容脱敏 |

## 快速开始

### 前置条件

1. **QQ 机器人凭据**：到 [QQ 开放平台](https://q.qq.com) 创建机器人，拿到 **AppID** 与 **AppSecret**（沙箱调试先在管理端配沙箱账号；正式环境需配服务器公网 IP 白名单）。
2. **OpenCode V2** 在本机运行（bot 连接其后台服务 API）。
3. **运行时**：bun 或 node 任一（推荐 bun；node ≥ 20 亦可，自动改用内置运行包）。

### 选形态（二选一）

| | 插件形态（推荐） | 独立部署形态 |
|---|---|---|
| 适合 | 本机已有 opencode，想装完即用 | 服务器/自定义常驻方式 |
| 安装 | `opencode plugin add @linjz/opencode-qqbot`（或 plugins 数组加 `"@linjz/opencode-qqbot"`） | `npm i -g @linjz/opencode-qqbot`（或 `github:linjz3376/opencode-qqbot`） |
| 常驻 | 插件自动拉起 bot，serve 重启自动恢复 | 自管：`openqq` 前台 / systemd / 任务计划 |
| 配置入口 | `npx @linjz/opencode-qqbot setup`（扫码）或手写 `~/.openqq/.env` | 同上（装完全局命令也可用 `openqq-setup`） |

开发者从源码直装插件形态：`bun run deploy:plugin`（全量包解到全局插件目录，与应用者拿到的发布物一致）。

### 配置（`~/.openqq/.env`，单点密钥）

手机 QQ 扫码绑定（自动写凭据；connector 按需临时安装）：

```bash
npx @linjz/opencode-qqbot setup
# 独立部署形态装过 -g 的话也可直接：openqq-setup
```

或手工创建：

```ini
QQ_APP_ID=你的AppID
QQ_APP_SECRET=你的AppSecret
ALLOWED_USERS=你的QQ openid   # fail-closed：必填，非名单用户一律拒绝
OPENCODE_BASE_URL=http://127.0.0.1:<端口>/api   # opencode 桌面服务地址（2.1.x 端口动态；失联时 bot 启动会自动发现）
OPENCODE_PASSWORD=opencode 服务密码（桌面端服务配置的 Basic auth 密码）
QQ_SANDBOX=false
MAX_REPLY_LENGTH=3000
```

### 启动

- **插件形态**：无需手动启动——装好插件 + 配好凭据后，插件巡检自动拉起 bot；opencode 服务重启也会自动恢复。
- **独立部署形态**：`openqq` 前台运行；常驻按 OS 自选（Windows 用 `deploy/` 任务计划脚本；Linux `systemd --user`；macOS launchd 或 `nohup`）。

<details>
<summary>Linux：systemd --user 单元（复制即用）</summary>

`~/.config/systemd/user/openqq.service`：

```ini
[Unit]
Description=OpenCode QQ Bot
After=network.target

[Service]
Type=simple
ExecStart=openqq
Restart=on-failure
RestartSec=30
# 凭据与数据目录（.env 写入后权限自动 0600）
Environment=HOME=%h

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now openqq
# 登录外也常驻：loginctl enable-linger $USER
```
</details>

<details>
<summary>macOS：launchd plist（复制即用）</summary>

`~/Library/LaunchAgents/net.opencode-qqbot.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>net.opencode-qqbot</string>
  <key>ProgramArguments</key>
  <array><string>/usr/local/bin/openqq</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/openqq.out.log</string>
  <key>StandardErrorPath</key><string>/tmp/openqq.err.log</string>
</dict></plist>
```

```bash
launchctl load ~/Library/LaunchAgents/net.opencode-qqbot.plist
```
</details>

> **单实例**：bot 启动时持文件锁（`~/.openqq/openqq-<appId>.lock`，10s 心跳、30s 僵尸判定）——双开时后到实例待命，宿主退出后自动接管，避免同 bot 多实例被 QQ 网关互踢。`QQ_INSTANCE_LOCK=false` 可关闭。

> **跨平台**：bot 本体零 OS 分支（纯 TS，与 QQ 官方 SDK 同形态）；运行时 bun 优先、node ≥20 自动兜底（跑内置运行包）。Linux/macOS 常驻用 `systemd --user` 或 `nohup` 即可；端口自动发现在三个系统都可用（Linux 走 `ss -tln`，macOS 走 `netstat -an -p tcp`，Windows 走 `netstat -ano -p tcp`）。

## 指令一览

| 指令 | 说明 |
|---|---|
| `/new` | 开新会话 |
| `/stop`（别名 `/cancel`） | 中止当前生成并清空忙碌队列 |
| `/status` | 服务器/会话/模型/Agent 状态 |
| `/sessions` | 列出会话并可选择切换 |
| `/history [N]` | 最近 N 轮历史（默认 3，上限 10；换行/代码块/表格完整保留） |
| `/model` | 查看或切换模型（session 级） |
| `/agent` | 查看或切换 Agent |
| `/rename <名>` | 重命名当前会话 |
| `/watch` / `/watch off` | 观察模式：工具调用里程碑实时推送 |
| `/progress` | 手动进度查询：工具调用/失败统计、当前在途状态（本地事件源，零模型调用） |
| `/queue` | 忙碌队列：查看 / `clear` 清空 / `drop <编号>` 定点删除（忙碌时消息自动 FIFO 排队） |
| `/mirror` | 摘要镜像开关 |
| `/send <路径>` | 把白名单目录内的文件/图片发到 QQ |

## 环境变量（可选调优）

| 变量 | 默认 | 说明 |
|---|---|---|
| `QQ_ACTIVE_DAILY_LIMIT` | 100 | 主动消息日配额（QQ 官方限制 1000/天/关系，留余量） |
| `QQ_PASSIVE_RIDE_WINDOW_MS` | 300000 | 主动降级前"骑"被动窗口的时间窗 |
| `QQ_STREAM_STAGGER_MS` | 300 | 多片回复片间错峰（0=一次性全发） |
| `QQ_SESSION_IDLE_HOURS` | 6 | 闲置会话回收阈值 |
| `QQ_INTERACTION_WATCH_SECONDS` | 12 | 常驻交互监听轮询间隔（0=关闭） |
| `QQ_REDISPATCH_MAX_AGE_MS` | 7200000 | 启动对账时丢失消息的自动重派窗口（0=关闭自动重派只通知；受台账 24h 清账线封顶） |
| `QQ_EVENT_PROBE` | 关 | 插件侧事件探针（`true` 时全量事件类型落 `~/.openqq/opencode-events.jsonl`，诊断用） |
| `OPENCODE_TURN_TIMEOUT_MINUTES` | 30 | 前台回合时限（超时转后台等待） |
| `QQ_DIGEST_ANSWER_MAX_CHARS` | 0（全文） | 摘要卡答案截断上限 |
| `QQ_HISTORY_USER_CLIP` / `QQ_HISTORY_TEXT_CLIP` | 500 / 1200 | /history 用户/AI 行截断 |
| `QQ_SEND_EXTRA_ROOTS` | — | `/send` 额外允许目录（逗号分隔） |

## 架构

四层（每文件带 `@input/@output/@pos` 头注释）：

```
src/qq/        QQ 传输层（WS 网关 / REST API / 发送器 / 媒体）
src/opencode/  opencode V2 客户端（REST + SSE 事件流 / 会话 / 历史渲染）
src/core/      业务域（审批/卡片/表单桥/投递/镜像/巡检/端口发现/限额/上下文缓存/发文件）
src/bridge.ts  编排门面 + 命令系统 commands.ts + 入口 index.ts
```

## 测试

```bash
npm run verify        # tsc + 23 个单元套件
npm run test:e2e      # 五套 e2e（需 opencode 服务在跑）
```

## 排障

| 症状 | 先看 |
|---|---|
| QQ 无响应 | 日志 `%TEMP%\opencode\openqqNN.log`；看门狗 `%TEMP%\opencode\watchdog.log` |
| ECONNREFUSED | 桌面服务端口漂移——重启 bot 会自动发现新端口（`~/.openqq/last-discovered.json` 留痕） |
| 桌面弹窗卡住任务 | 后台停滞 30 分钟会主动提醒；`/stop` 可终止 |

## License

MIT
