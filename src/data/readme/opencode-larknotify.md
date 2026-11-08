# OpenCode Feishu Notifier

面向 OpenCode `1.19.x` 与 `2.x` 的飞书通知与决策插件。同一个 npm 包会按宿主自动选择 V1 / V2 插件接口，不需要安装两个版本。

- **远程开关**：在 OpenCode 里按 `ctrl+x f`（或 `/larknotify`）切换。离开电脑时打开，下面这些才会推送到飞书；坐在电脑前时关闭，飞书保持安静。界面上始终显示开关状态
- 任务进入空闲（`busy → idle`）时推送「任务已结束」通知
- 等待权限（`permission.asked`）时推送提醒，并可在飞书内 `允许一次 / 拒绝`
- 需要你决策（`question.asked`）时把问题做成飞书卡片，支持多个问题分步作答、多选与自定义回答；你在飞书作答后回写到原会话，OpenCode 继续执行
- 多个 OpenCode 会话 / 进程并发时，依次回复互不串场

## 两种运行模式

插件按环境变量自动选择模式，二者互斥，交互优先：

| 模式 | 触发条件 | 能力 | 部署 |
|---|---|---|---|
| `interactive` | 配置了飞书**应用机器人**（`APP_ID/APP_SECRET/RECEIVE_ID`） | 通知 + 决策闭环（question、permission once/reject） | 需要常驻 Broker（插件自动拉起） |
| `notify` | 仅配置了**自定义群机器人** `WEBHOOK` | 仅单向通知（idle / permission / question 文本） | 零部署 |

### 判定顺序

每个 OpenCode 进程在插件启动时判定一次，自上而下命中即停：

1. 插件选项非法（如 `minimumDurationMs: -1`）→ 停用，日志写明原因
2. `OPENCODE_FEISHU_APP_ID`、`OPENCODE_FEISHU_APP_SECRET`、`OPENCODE_FEISHU_RECEIVE_ID` **三个都非空** → `interactive`，**不再查看 `WEBHOOK`**
3. `OPENCODE_FEISHU_WEBHOOK` 合法（https，且路径以 `/open-apis/bot/v2/hook/` 开头）→ `notify`
4. 设了 `WEBHOOK` 但格式不合法 → 停用，日志写明原因
5. 两套都没配 → 静默停用，绝不影响 OpenCode

启动日志会写明结果，例如 `Plugin enabled (interactive, remote switch off)`。

几个容易踩的点：

- **两套变量都配了**：interactive 生效，`WEBHOOK`、`SECRET`、`AT_USER_ID` 全部被忽略（所以 interactive 下的卡片不会 @ 人）。好处是把 `APP_ID` 注释掉就会自动降级成 notify。
- **interactive 配一半最危险**：`APP_ID/APP_SECRET/RECEIVE_ID` 齐了但漏了 `ALLOWED_OPENID`，模式判定仍然选中 interactive（于是 `WEBHOOK` 被忽略），但 Broker 启动失败，在 `broker.log` 写 `[broker] disabled: OPENCODE_FEISHU_ALLOWED_OPENID must list at least one open_id`，结果两种模式都不工作。
- **`WEBHOOK` 写错不一定报错**：只有在没配 interactive 时才会让插件停用；配了 interactive 时 `WEBHOOK` 再错也不影响。
- **模式在启动时定下来**：1.19 改完环境变量要重启 OpenCode；2.x 的 server 插件在后台 service 中运行，改完要 `opencode service restart`。同一台机器上环境变量不同的进程可以分别处于不同模式。
- **interactive 是 notify 的超集**：任务结束通知照样发（由应用机器人发卡片）；既无候选项又不允许自定义回答的问题会自动降级为纯文本通知。不需要为了拿通知而同时配两套。
- **远程开关对两种模式一视同仁**：见下面「远程开关」一节。

## 架构（interactive，单机多进程）

```
多个 OpenCode 进程（各自加载插件）
  ├─ TUI 插件：ctrl+x f 切换远程开关 → 原子写 remote.json；徽标 / 横幅显示状态
  └─ server 插件：监听事件 → 每秒读取 remote.json，开关打开时才推送
           ├─ 按需（惰性）经 Unix socket 连接本地 Broker：通知 / 发起决策
           └─ 收到「用户已决策」→ 调本进程 OpenCode API 回写

单一 Broker 进程（首个插件自动拉起，常驻、空闲自退）
  ├─ 持有唯一飞书应用长连接（WSClient）
  ├─ 发送 / 更新交互卡片
  ├─ 接收 card.action.trigger 回调
  ├─ 路由表 actionToken → 请求上下文（bun:sqlite 持久化）
  └─ 校验操作者 / 去重 / 原子状态机 → 回推发起插件
```

- 飞书应用长连接是**集群模式**，一条回调只投递给一个客户端。因此必须由单一 Broker 持有连接，不能每个 OpenCode 进程各开一条。
- Broker 由首个插件通过文件锁竞争后 `spawn` 启动（detached），其余进程直接连接；无活动连接且无待处理请求超过空闲阈值后自行退出。

OpenCode 2 的 server 插件运行在后台 service 里，TUI 可能运行在另一个进程甚至另一台机器。因此 2.x 下 TUI 优先通过插件 **RPC** 读取/切换远程开关；RPC 不可用时才回退到本机 `remote.json`。Broker、协议和 `remote.json` 的位置在两代之间保持不变。

## 多会话为何不串

每张卡片绑定唯一随机 `actionToken`，Broker 记录 `actionToken → {发起连接, requestID, sessionID, directory, 允许的 open_id, 状态}`。用户任意顺序点击，Broker 按 `actionToken` 精确定位发起进程与 `requestID`，再回写对应会话。配合飞书 `event_id` 去重与 `pending→processing→completed` 原子状态机，实现近似 exactly-once，且不串会话。

## 飞书配置

### interactive：企业自建应用

1. 开发者后台创建**企业自建应用**，开启「机器人」能力
2. 开通权限：`im:message:send_as_bot`、`im:message:readonly`
3. 「事件与回调 → 回调配置」订阅 `card.action.trigger`，并选择**长连接**接收
4. 把应用机器人加入目标群，获取群 `chat_id`
5. 获取允许操作者的 `open_id`（仅名单内用户的点击会被接受）
6. 手机端开启飞书与目标群通知

### notify：自定义群机器人（可选、仅通知）

在目标群添加「自定义机器人」，复制 Webhook，建议启用签名校验并设固定关键词 `[OpenCode]`。

## 环境变量

必须由启动 OpenCode 的进程继承；插件不会读取项目 `.env`，也不会把凭证写入 OpenCode 配置。

### interactive（应用机器人）

```bash
export OPENCODE_FEISHU_APP_ID="cli_xxx"
export OPENCODE_FEISHU_APP_SECRET="xxxxxxxx"
export OPENCODE_FEISHU_RECEIVE_ID="oc_xxx"         # 群 chat_id（默认）或用户 open_id
export OPENCODE_FEISHU_ALLOWED_OPENID="ou_a,ou_b"  # 允许在飞书决策的用户，逗号分隔
```

| 变量 | 必填 | 说明 |
|---|---:|---|
| `OPENCODE_FEISHU_APP_ID` | 是 | 应用 App ID |
| `OPENCODE_FEISHU_APP_SECRET` | 是 | 应用 App Secret（仅 Broker 读取） |
| `OPENCODE_FEISHU_RECEIVE_ID` | 是 | 消息接收方 ID |
| `OPENCODE_FEISHU_RECEIVE_ID_TYPE` | 否 | `chat_id`（默认）/ `open_id` / `user_id` / `union_id` / `email` |
| `OPENCODE_FEISHU_ALLOWED_OPENID` | 是 | 允许操作卡片的 `open_id` 名单 |
| `OPENCODE_FEISHU_SOCKET` | 否 | Broker Unix socket 路径（默认 `$XDG_RUNTIME_DIR/opencode-feishu/broker.sock`） |
| `OPENCODE_FEISHU_ACTION_TTL_MS` | 否 | 卡片/决策有效期，默认 `1800000`（30 分钟） |
| `OPENCODE_FEISHU_IDLE_SHUTDOWN_MS` | 否 | Broker 空闲自退阈值，默认 `1800000` |
| `OPENCODE_FEISHU_DOMAIN` | 否 | 飞书域名，默认 `https://open.feishu.cn` |
| `OPENCODE_FEISHU_BUN` | 否 | `bun` 可执行路径；默认自动探测（`PATH` / `~/.bun` 等），仅在探测不到时需要 |
| `OPENCODE_FEISHU_SERVER_URL` | 否 | OpenCode 2 本地 API 地址；用于 form 回写兜底（自动读取 service 注册文件失败时） |
| `OPENCODE_FEISHU_SERVER_PASSWORD` | 否 | 上项对应的 Basic Auth 密码；也可回退 `OPENCODE_PASSWORD` / `OPENCODE_SERVER_PASSWORD` |

> 注意：当 `RECEIVE_ID_TYPE=open_id` 时，`RECEIVE_ID` 与 `ALLOWED_OPENID` 必须是**当前应用**视角的 `open_id`（open_id 每个应用都不同）。跨应用的 open_id 会被飞书以 `open_id cross app`（code 99992361）拒绝。用群 `chat_id` 或 `user_id` / `email` 可避开该问题。
>
> OpenCode 2 的 server 插件运行在后台 service 中，以上变量必须被 service 继承；修改后执行 `opencode service restart`。

### notify（自定义机器人）

| 变量 | 必填 | 说明 |
|---|---:|---|
| `OPENCODE_FEISHU_WEBHOOK` | 是 | 自定义群机器人 Webhook |
| `OPENCODE_FEISHU_SECRET` | 否 | 机器人签名校验密钥 |
| `OPENCODE_FEISHU_AT_USER_ID` | 否 | 通知中 @ 的用户 open_id |

## 插件选项（1.19：`opencode.json` 第二参数；2.x：`plugins[].options`）

| 选项 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `notifyOnIdle` | boolean | `true` | 任务结束通知 |
| `notifyOnPermission` | boolean | `true` | 权限提醒（notify 模式或未开启远程时） |
| `notifyOnQuestion` | boolean | `true` | 决策提醒（无法交互时的纯通知） |
| `permissionRemote` | boolean | `true` | interactive 下允许远程处理权限（仅 `once`/`reject`，**永不** `always`） |
| `minimumDurationMs` | number | `0` | 任务短于该时长不发结束通知 |

推送与否只由远程开关决定，没有对应的插件选项。

## 安装

插件包含 server 和 TUI 两部分。OpenCode 1.19 与 2.x 的配置格式不同，下面分别说明。

### OpenCode 1.19.x

两个配置文件都要配：

| 部分 | 作用 | 配置文件 |
|---|---|---|
| server 插件 | 监听事件、推送飞书 | `opencode.json` |
| TUI 插件 | 快捷键、开关状态显示 | `tui.json` |

`~/.config/opencode/opencode.json`：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    ["opencode-larknotify", { "notifyOnIdle": true, "notifyOnPermission": true, "notifyOnQuestion": true }]
  ]
}
```

`~/.config/opencode/tui.json`：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-larknotify", {}]]
}
```

### OpenCode 2.x

server 配置写在 `opencode.jsonc` 的 `plugins` 里，**一个条目会同时加载 server 和 TUI 两部分**：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "opencode-larknotify",
      "options": {
        "notifyOnIdle": true,
        "notifyOnPermission": true,
        "notifyOnQuestion": true
      }
    }
  ]
}
```

如果不需要自定义 TUI 快捷键/横幅，到这里就完成了。需要自定义时，TUI 选项要写在 `cli.json`（V2 从 server 插件列表自动加载 TUI 部分时拿不到 `plugins` 里的 options，显式条目会按 id 覆盖并带上 options）：

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-larknotify",
      "options": { "keybind": "<leader>o", "banner": true }
    }
  ]
}
```

V2 的 server 插件运行在后台 service 中，飞书环境变量必须被该 service 继承。修改环境变量后执行：

```bash
opencode service restart
```

`opencode serve`、web、桌面端不加载 TUI 插件，没有快捷键；可以直接写 `remote.json`，见下面「没有 TUI 的环境」。

npm 包由 OpenCode 自动安装，不用手动 `npm install`。首次需要发送通知或发起决策时会自动拉起 Broker（`busy` 不会拉起）。

> **远程开关默认是关的，不打开就不会推送任何飞书消息**。见下面「远程开关」一节。

### 从源码开发

```bash
bun install
bun run build
```

OpenCode 1.19 把两处配置换成构建产物：

```json
// opencode.json
"plugin": [["file:///path/to/op-notifier/dist/index.js", {}]]
// tui.json
"plugin": [["file:///path/to/op-notifier/dist/tui.js", {}]]
```

OpenCode 2.x 的本地插件路径必须是目录，直接指向仓库根目录即可（会通过 `package.json` 的 `exports` 找到 server/tui）：

```jsonc
{
  "plugins": [
    { "package": "/path/to/op-notifier", "options": { "notifyOnIdle": true } }
  ]
}
```

改完源码重新 `bun run build` 并重启 OpenCode 即可生效（Broker 会在协议变化时自动替换，纯渲染改动需要手动结束 Broker 进程）。

## 远程开关

坐在电脑前时，飞书通知是打扰；离开电脑后，又希望 OpenCode 的提问能在手机上处理。远程开关就是为这两种状态准备的：

| 操作 | 说明 |
|---|---|
| `ctrl+x f` | 默认快捷键（leader 键 + `f`），在主页与会话页都可用 |
| `/larknotify` | 斜杠命令，输入框中输入 |
| `ctrl+p` → 「切换飞书通知」 | 命令面板 |
| 点击输入框右侧徽标 | 鼠标切换 |

界面显示：

- 输入框右侧常驻徽标：关闭时灰色 `○ 飞书通知`，开启时绿色 `● 飞书通知`
- 开启时屏幕底部额外显示一行横幅 `● 飞书通知已开启 … ctrl+x f 关闭`，即使有权限/问题面板挡住输入框也能看到
- 每次切换会弹出提示

行为：

| 场景 | 行为 |
|---|---|
| 开关关闭（默认） | 不推送任何飞书消息，任务结束通知也不发；所有请求在 OpenCode 内处理 |
| 关 → 开 | 立即把**仍在等待**的 question / permission 补推到飞书（典型场景：看到 OpenCode 在提问但你要出门，按一下 `ctrl+x f` 即可在手机上作答） |
| 等待期间已在终端作答 | 不会补推 |
| 开启期间 | 与之前一致：question / permission 发卡片、任务结束发通知 |
| 开 → 关 | 已发出的卡片仍然可用；之后在终端作答时，卡片照常更新为「已在 OpenCode 处理」 |

细节：

- **两种模式都受开关控制**：notify 模式（自定义群机器人）同样是开关关闭就不发、打开后补推
- 开关对本机所有 OpenCode 实例统一生效，任意一个 TUI 切换后，其他实例约 1 秒内同步（徽标与推送行为都会同步）
- 状态保存在 socket 同目录的 `remote.json`（默认 `$XDG_RUNTIME_DIR/opencode-feishu/remote.json`），重启电脑后回到关闭。文件缺失、损坏、为符号链接或属于其他用户时一律视为关闭
- OpenCode 1.19：TUI 插件与 server 插件必须解析到同一个 socket 目录（`OPENCODE_FEISHU_SOCKET`）
- OpenCode 2.x：TUI 优先通过 server 插件 RPC 读写开关，因此 TUI 与 server 不在同一进程、甚至通过 `opencode attach` 连接远端 server 时也能切换；RPC 不可用（旧 2.x）才回退本机文件
- 卡片默认 30 分钟过期，外出较久时可调大 `OPENCODE_FEISHU_ACTION_TTL_MS`

### 没有 TUI 的环境

`opencode serve`、web、桌面端、`opencode run` 都不加载 TUI 插件，没有快捷键可按。开关状态就是一个普通文件，直接写它即可（OpenCode 2 的 TUI RPC 不可用时也使用这个文件）：

```bash
# 打开
echo '{"enabled": true}' > "${XDG_RUNTIME_DIR:-/tmp}/opencode-feishu/remote.json"
# 关闭
echo '{"enabled": false}' > "${XDG_RUNTIME_DIR:-/tmp}/opencode-feishu/remote.json"
```

设了 `OPENCODE_FEISHU_SOCKET` 的话，路径是该 socket 的同级目录。插件启动时若开关是关的，日志里会打印完整路径，照着写就行。

注意 `$XDG_RUNTIME_DIR` 是 tmpfs，**重启后文件消失、开关回到关闭**。要让它长期保持打开，把上面那行写进 shell profile、systemd 单元的 `ExecStartPre`，或 CI 的某个步骤。

TUI 插件选项：

| 选项 | 类型 | 默认 | 说明 |
|---|---|---:|---|
| `keybind` | string / string[] / `false` | `"<leader>f"` | 快捷键；`false` 或 `"none"` 关闭快捷键（仍可用 `/larknotify`） |
| `banner` | boolean | `true` | 开启时是否显示底部横幅 |

OpenCode 1.19（`tui.json` 的 `plugin` 第二个元素）：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [["opencode-larknotify", { "keybind": "<leader>o", "banner": true }]]
}
```

OpenCode 2.x（`cli.json` 的 `plugins` 条目；server 部分仍写在 `opencode.jsonc`）：

```jsonc
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "opencode-larknotify",
      "options": { "keybind": "<leader>o", "banner": true }
    }
  ]
}
```

> 自定义快捷键必须写在插件选项里，不能写进全局 `keybinds`（OpenCode 会拒绝未知的 keybind 名称）。

## 决策语义

OpenCode 2 的 question tool 已改为 form。插件会把 `metadata.kind === "question"` 的 form 字段映射回原有的 question 卡片：`string` 字段按单选题处理，`multiselect` 字段按多选题处理；提交时再转成 OpenCode 2 需要的 `{ q0: "A", q1: ["B"] }` 答案对象。其他 form（MCP elicitation、集成认证等）不接管，继续在 OpenCode 内处理。

- `question.asked` / V2 question form：
  - 卡片先用一段 markdown 列出**所有候选项的完整文字**（`1. **选项名** — 说明`），再给出按钮。飞书按钮是单行的 `plain_text`，长文案会被客户端裁掉且无法换行，所以按钮只放「序号 + 选项名」并占满宽度，完整说明一律看上方列表。选项说明过长时会逐级降级（先省略说明、再省略条目）并明确提示
  - 单个单选问题：每个候选项是一个按钮，点击即提交
  - 多个问题：同一张卡片分步作答，标题显示进度（如「2/3」），答完一题自动进入下一题，可用「上一题」修改；全部答完进入「确认你的决策」汇总页，点「确认提交」后一次性回写全部答案（OpenCode 要求所有答案一起提交）
  - 多选问题：选项为可勾选按钮（☑/☐），勾选后点「确认本题」（单题时为「提交」）；上方列表同步显示勾选状态
  - 问题允许自定义回答时（OpenCode 默认开启），卡片提供输入框与「提交自定义回答」，提交的文本作为该题答案（等同终端的「自己输入答案」）；多选题中自定义回答与已勾选项一并提交
  - 只有当某个问题既无候选项又不允许自定义回答时，才降级为纯通知，请回 OpenCode 作答
- 「拒绝(reject)」按钮在任意一步都可用，对应 OpenCode 的拒绝回答，与自定义输入是两回事；空的自定义提交、过期的旧按钮点击都不会改变已作答内容，卡片保持可操作
- `permission.asked`：仅 `允许一次(once)` 与 `拒绝(reject)`；不提供 `always`
- 卡片仅接受名单内 `open_id`（其他人点击只会收到「你无权处理该决策」提示，卡片不变）；`actionToken` 一次性且会过期
- 最终提交后卡片立即变为无按钮的「处理中」，回写成功后更新为「已处理」并列出各题答案；会话已退出或超时则更新为「已失效 / 已过期」

## 空闲与唤醒

- Broker 仅在「没有任何插件连接且无待处理请求」并持续空闲超过 `OPENCODE_FEISHU_IDLE_SHUTDOWN_MS` 后才自行退出。
- 插件采用**惰性连接**：`busy` 不唤醒 Broker，只有在真正需要发送通知或发起决策时才按需连接。空闲会话不占用 Broker。
- 会话空闲一段时间后再来新任务：当需要发通知/决策时插件会按需连接；若 Broker 已自退或崩溃，会被透明地重新拉起并重连（自愈）。首次发送可能有不到 1 秒的拉起延迟。
- 注意：存在**未决策卡片**（等待你在飞书点选）的 OpenCode 进程必须保持运行；该进程退出会使对应卡片变为「会话已失效」。

## 故障与恢复

- Broker 不可用：先按需拉起 / 重连，失败才降级为仅记录告警，不阻塞 OpenCode
- 发起会话已退出：卡片标记「会话已失效」
- Broker 重启：连接只在单个 Broker 进程内有效，重启后上一个 Broker 遗留的未完成决策会被统一标记为失效，对应卡片更新为「决策已失效」，请回 OpenCode 处理
- 升级插件代码：插件与 Broker 之间有协议版本。新插件连接到运行旧代码的 Broker 时会被拒绝，插件会自动停止旧 Broker 并用当前代码重新拉起，因此升级后只需重启 OpenCode；旧插件仍可连接新 Broker
- 飞书或网络异常：不影响 OpenCode，仅记录日志

## 开发

```bash
bun test
bun run typecheck
bun run build
npm pack --dry-run
```

单元测试覆盖配置解析、远程开关（状态文件读写、轮询、关闭时暂存与开启后补推）、通知状态机、决策路由、多问题分步作答状态机、`bun:sqlite` 状态机、卡片构建、IPC 协议兼容、V1/V2 事件归一化、V2 form 映射/回写、RPC 开关，以及插件级集成测试；全部使用临时目录、内存与模拟，不触达真实飞书。

## 排障

```bash
# 1.19
opencode --print-logs --log-level DEBUG
# 2.x
opencode service status
opencode plugin list
```

Broker 日志在 socket 同目录的 `broker.log`。收不到消息时依次检查：**远程开关是否已打开**（输入框右侧应显示 `● 飞书通知`）、环境变量是否被 OpenCode 进程继承、应用权限与 `card.action.trigger` 长连接是否开启、机器人是否在群内、`open_id` 是否在名单、手机端通知是否允许。

插件启动日志会写明开关状态，如 `Plugin enabled (interactive, remote switch off)`；切换时记录 `Feishu remote switched on; pushed N waiting request(s)`。OpenCode 2 的 server 日志在 `~/.local/share/opencode/log/opencode.log`，按 `role=server` 过滤，插件行以 `[opencode-larknotify]` 开头。

常见错误：

- 输入框右侧没有 `○ 飞书通知` 徽标、`ctrl+x f` 无反应：
  - 1.19：`tui.json` 未配置 `dist/tui.js`，或启动 OpenCode 的进程没有继承飞书环境变量。
  - 2.x：先看 `opencode plugin list` 是否有 `opencode.larknotify`；再看后台 service 是否继承了飞书环境变量（修改后 `opencode service restart`）。
- 徽标显示已开启但仍收不到：
  - 1.19：TUI 与 server 插件解析到的 socket 目录不同（例如只给其中一方设置了 `OPENCODE_FEISHU_SOCKET`），或 `opencode.json` 未加载 server 插件。
  - 2.x：server 插件在后台 service 中，检查 service 环境与日志；TUI 通过 RPC 显示状态，RPC 不可用时会回退本机文件。
- `broker.log` 出现 `Failed to change directory` 或找不到 `bun`：系统缺少 `bun` 或不在 `PATH`，用 `OPENCODE_FEISHU_BUN` 指定其绝对路径。
- 发送报 `open_id cross app`（code 99992361）：`RECEIVE_ID` / `ALLOWED_OPENID` 的 open_id 不属于当前应用，改用本应用 open_id，或用群 `chat_id` / `user_id` / `email`。
- 点按钮无反应：开发者后台未开启「长连接」订阅方式，或操作者 open_id 不在 `ALLOWED_OPENID` 名单。
- 2.x question 卡片能收到但回写失败：V2 server 插件上下文没有公开 form API，插件会使用本机 service 注册文件回写。若运行在 `opencode --standalone` 或未注册 service，设置 `OPENCODE_FEISHU_SERVER_URL` 与 `OPENCODE_FEISHU_SERVER_PASSWORD`，否则该 question 只能回 OpenCode 处理；permission 不受影响。

## 限制

- 支持 OpenCode `1.19.x` 与 `2.x`；1.19 使用 V1 插件接口，2.x 使用 V2 插件接口
- OpenCode 2 的 question 已改为 form。插件只接管 `metadata.kind === "question"` 的 form；MCP elicitation、集成认证等通用 form 不接管
- OpenCode 2 的 server 插件上下文没有公开 `session.form`，question 回写依赖本机 service 注册文件或显式 `OPENCODE_FEISHU_SERVER_URL`；两者都不可用时 question 降级为纯通知，permission 仍可闭环
- 决策闭环为单机多进程设计；跨机需自建中心路由
- 1.19 的远程开关依赖本机文件共享状态；2.x 通过 RPC 支持远程 TUI，RPC 不可用的旧 2.x 仍回退本机文件
- 自定义群机器人无法接收回调，决策闭环必须使用企业自建应用
- interactive 模式的 Broker 需要系统可执行的 `bun`（用到 `bun:sqlite` 与 `Bun.listen`）；OpenCode 自带的二进制无法用于启动 Broker，找不到 `bun` 时用 `OPENCODE_FEISHU_BUN` 指定其绝对路径

## License

MIT
