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
| **权限审批** | opencode 发起权限请求 → QQ 收 🔐 四键卡片（允许一次/总是允许/拒绝/忽略），点按钮静默生效（点击后该按钮回显 ✓/✗，其余按钮保持原样），也可文字回复"允许/总是/拒绝" |
| **选择弹窗桥接** | opencode 的 Form（选择/多选/布尔/文本）→ QQ 📝 卡片，点按钮或回字母（A/B/C）作答；桌面端回合发起的审批/表单**同样**推送（常驻监听，12s 轮询，bot 空闲也收得到） |
| 远程指令 | `/new /stop /status /sessions /history /model /agent /rename /watch /mirror /progress /queue /ledger /send` |
| 富媒体 | 收图（原生附件给 AI 看图）；**收语音**（QQ 内置 ASR 免费转文字进 prompt）；**发图/发文件**（AI 回复含 `QQ_SEND_FILE: <路径>` 标记或 `/send <路径>` 指令，20MB 上限） |
| 引用上下文 | 长按引用某条消息提问，AI 能感知被引用的内容（我方回复也会入索引缓存） |
| 长任务不丢 | 前台 30min 超时 → 后台等待（SSE + 轮询，最长 24h）；停滞 30min 主动提醒（带「已停滞/状态不明/已终结未回传」状态位 + 最近工具动作 + 无进展时长） |
| 投递幂等 | 双层去重：同 msgId 跨进程原子占位 + 同内容在途指纹（窗口=并发在途；已完成消息的重发按重发处理）；同文长回复 24h 出站去重；「已收到」受理回执默认关（`QQ_ACK_RECEIPT=1` 调试召回） |
| 重启恢复 | 网关 session/seq 落盘，重启优先 RESUME（服务端只补断线窗口，不重放 backlog）；在途台账启动对账——已答补投、在跑重挂、排队挂失只通知永不误派 |
| 渲染保真 | 出站有序列表 `1.` 自动转 `1、`（QQ 渲染器对 `N.` 型会跨段续编，实测 `N、`/`一、` 完全保真），代码块内不动、幂等 |
| 自恢复 | 开机竞态退避、端口漂移自动发现与热换基、巡检告警（QQ 主动消息）、看门狗进程守护、单实例锁心跳 + 60s 周期自检（锁被他人接管/锁文件消失 → 自杀退出，杜绝多实例暗跑） |
| 安全 | fail-closed 名单准入（名单外一律拒绝）、下载域白名单、日志密钥打码、推送内容脱敏、危险命令审批由 opencode 权限表驱动（QQ 端四键直达） |

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
| `/rename <名>` | 重命名当前会话（仅本地会话标题，不改服务端标题） |
| `/watch` / `/watch off` | 观察模式：工具调用里程碑实时推送 |
| `/progress` | 手动进度查询：工具调用/失败统计、当前在途状态（本地事件源，零模型调用） |
| `/queue` | 忙碌队列：查看 / `clear` 清空 / `drop <编号>` 定点删除（忙碌时消息自动 FIFO 排队） |
| `/ledger` | 台账视图：快照 / `check` 对账会话历史 / `settle <尾号> confirm` 人工结清（孤儿与在途可追溯） |
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
| `QQ_ACK_RECEIPT` | 关 | 受理即回执气泡「已收到，正在处理」（调试期设 `true`/`on`/`1` 开启） |
| `QQ_GATEWAY_STATE_MAX_HOURS` | 6 | 网关会话持久化恢复窗口（超龄 / RESUME 被拒自动回退 IDENTIFY） |
| `QQ_EVENT_PROBE` | 关 | 插件侧事件探针（`true` 时全量事件类型落 `~/.openqq/opencode-events.jsonl`，诊断用） |
| `OPENCODE_TURN_TIMEOUT_MINUTES` | 30 | 前台回合时限（超时转后台等待） |
| `QQ_DIGEST_ANSWER_MAX_CHARS` | 0（全文） | 摘要卡答案截断上限 |
| `QQ_HISTORY_USER_CLIP` / `QQ_HISTORY_TEXT_CLIP` | 500 / 1200 | /history 用户/AI 行截断 |
| `QQ_SEND_EXTRA_ROOTS` | — | `/send` 额外允许目录（逗号分隔） |
| `QQ_ORPHAN_MS` | 90000 | 孤儿判定阈值（受理后无下文超此时长记孤儿；合法 5s~60min，非法回退默认） |
| `QQ_WATCHDOG_INTERVAL_MS` | 300000 | 插件引导器巡检间隔（5min；计划任务侧由 service install 注册，默认 10min） |
| `QQ_PERM_DEFER_MS` | 500 | 审批弹卡延迟判定窗（0~10s）：窗口内 ask 已被其他端处置则不推 QQ 卡，与桌面静默放行对齐 |
| `QQ_QUEUE_RECEIPTS` | 关 | 队列完成回执「队列 #N 完成」（批量排空防刷，默认关） |
| `QQ_LOG_FILE` | `~/.openqq/openqq.log`（detached 拉起为 `bot.out.log`） | 进程内文件日志路径 |
| `QQBOT_DEFAULT_CWD` | bot 进程工作目录 | 新会话默认项目目录（目录继承链兜底值） |
| `QQ_SANDBOX` | false | QQ 沙箱环境（REST 域切至 sandbox） |
| `QQ_INSTANCE_LOCK` | 开 | 单实例文件锁（`false` 关闭，仅排查多实例问题时临时用） |

## 架构

四层（每文件带 `@input/@output/@pos` 头注释）：

```
src/qq/        QQ 传输层（WS 网关 / REST API / 发送器 / 媒体）
src/opencode/  opencode V2 客户端（REST + SSE 事件流 / 会话 / 历史渲染）
src/core/      业务域（审批/卡片/表单桥/投递/镜像/巡检/端口发现/限额/上下文缓存/发文件，及投递幂等 inbound-dedupe、网关持久化 gateway-state、在途台账 inflight-journal、单实例锁 instance-lock）
src/bridge.ts  编排门面 + 命令系统 commands.ts + 入口 index.ts
```

## 测试

```bash
npm run verify        # tsc + 28 个单元套件（受理幂等/网关持久化/回合归属/渲染适配/台账恢复等）
npm run test:e2e      # 五套 e2e（需 opencode 服务在跑）
```

## 运维入口（全 TS，跨平台，随包分发）

```bash
openqq restart                            # 等空闲 → 停 → 拉（旧 safe-restart.ps1 的替代）
openqq restart --force                    # 跳过空闲等待（维护窗口）
openqq watchdog --once                    # 单次巡检（自启项 / systemd timer / launchd 调用）
openqq watchdog --loop --interval-min 10  # 常驻循环
openqq service install|uninstall|status   # 自启注册：win32=schtasks / linux=systemd user / darwin=launchd
```

判活 = 锁文件 pid + `process.kill(pid, 0)` + 心跳新鲜度（>5 分钟触发重启，启动期有 60s 宽限）。
`~/.openqq/` **只放运行时数据**（`.env`、台账、日志、`heartbeat`、`watchdog.log`），不放任何脚本。

## 排障

| 症状 | 先看 |
|---|---|
| QQ 无响应 | 日志 `~/.openqq/bot.out.log`；看门狗 `~/.openqq/watchdog.log` |
| 进程疑似僵死 | `openqq watchdog --once` —— 一次判定并自愈（先杀残留再拉起） |
| ECONNREFUSED | 桌面服务端口漂移——重启 bot 会自动发现新端口（`~/.openqq/last-discovered.json` 留痕） |
| 桌面弹窗卡住任务 | 后台等待会发带任务的停滞通告（含最近动作与无进展时长）；`/stop` 可终止 |
| 日志见「已有实例待命」 | 单实例锁生效中——另一实例持锁（60s 自检会在锁异动时收敛双活，正常无需处理） |

## 平台注意事项

以下发现来自真实部署（Windows 11 / OpenCode v2.2.2），插件无法修复但会反复绊倒用户，集中存档：

**QQ 平台侧**

1. token 接口 `POST https://bots.qq.com/app/getAppAccessToken` 的参数是 **`clientSecret`**（旧文档写作 `appSecret`）；报错 `100016 invalid appid or secret` 极具误导性——先核对字段名，别急着重置密钥。
2. token 与正式/沙箱无关，统一走正式域名 `bots.qq.com`；**沙箱域名 `sandbox.api.sgroup.qq.com` 没有 token 端点**（请求会返回 `11001 不支持的调用`）。
3. 沙箱 bot 有独立网关：`GET https://sandbox.api.sgroup.qq.com/gateway` → `wss://sandbox.api.sgroup.qq.com/websocket`；沙箱 bot 连正式网关会被 4914 拒绝。

**OpenCode 侧**

4. `opencode plugin add` 偶发无输出挂起（>3min），重试通常成功。
5. `opencode reload` **只增不删**：plugins 数组移除的条目在服务端内存不卸载（旧插件的定时器仍存活），彻底生效需重启服务。
6. 全局插件目录扫描器只认根级入口（package.json exports 指向 `./dist` 子路径会被跳过），**仅影响本地目录形态**；npm 包形态无此限制。
7. `opencode plugin update` 必须带 scope 全名（`@linjz/opencode-qqbot`），裸写包短名报 `Plugin is not configured`。
8. npm 插件缓存在 `~/.cache/opencode/npm/<pkg>@<tag>/<时间戳>/`，update 会新建时间戳目录——对「在缓存文件上打本地补丁」的用户，补丁会静默失效；请避免在缓存副本上打补丁。

## 与 OpenCode 桌面版能力对齐矩阵

QQ 桥的本质是「opencode 交互事件 → QQ 交互原语」的适配器。桌面版 TUI 能处理的每类阻塞式交互，QQ 侧应有对应物（桥接或明确降级）：

| 桌面端交互类型 | QQ 侧现状 | 差距 |
|---|---|---|
| 权限审批（PermissionRequest） | ✅ 四键卡片（允许一次/总是/拒绝/忽略）+ 文字回复 + 桌面端挂起的审批同样推送（常驻监听 12s） | 无 |
| 单字段 Form（单选/多选/布尔/文本） | ✅ 字母按钮卡片 + 文本解析 + 30min TTL + form-journal 持久化 | 无 |
| **多字段 Form（Questions）** | ⚠️ 回退「请在桌面端完成」（明确降级） | 逐字段向导为候选增强（见提案，未实施） |
| 未来 opencode 新增交互类型 | ⚠️ 无对齐机制，只能事后逐个补 | 按矩阵验收：要么随版本桥接、要么登记为「明确降级」，不允许出现未定义状态 |

原则：未支持的类型永远给出明确文案 + 桌面端指引，不允许静默丢弃；多字段向导等增强按最小侵入接入。


## English Summary

**OpenCode QQ Bot** bridges [OpenCode](https://opencode.ai) (an open-source AI coding agent) into QQ (China's largest IM). Talk to your coding agent from your phone: send tasks, approve dangerous tool calls via interactive cards, dictate prompts with built-in voice-to-text, receive long-running results, and even send/receive files.

- **Approval cards & form prompts**: OpenCode permission requests and multi-step forms render as interactive QQ cards (tap to allow/deny, or reply by text)
- **Long tasks never lost**: 30-min foreground timeout falls back to a 24h background wait with status-aware stall notices; results are pushed back on completion
- **Duplicate-proof delivery**: cross-process msgId claim + same-content fingerprint admission; gateway session/seq persisted across restarts (RESUME, no backlog replay)
- **Notify channel**: cron / CI / any process can push results to QQ via `openqq notify` (file-locked outbox, TTL, idempotent by --id)
- **QQ rendering fix**: ordered lists auto-flatten to the `、` style — what you see on desktop matches what lands on QQ

Install: `opencode plugin add @linjz/opencode-qqbot` — Chinese README below, docs/review playbook in the repo.

## License

MIT

