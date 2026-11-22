[English](README.md) | [中文](README.zh-CN.md)

# magpie-aws-quick —— 在 magpie 里用你自己的 Amazon Quick（AWS Quick）账号

把**你自己**的 Amazon Quick 登录态（浏览器 OAuth 或桌面端）接成 [magpie](https://github.com/yetone/magpie) 的一个 provider（`aws-quick`），
这样经 magpie 路由的 Claude Code、Codex、Gemini CLI、OpenCode 等 Agent 都能用上 Quick 背后的模型
（以 `magpie models | grep aws-quick` 列出的为准）。

> ⚠️ 仅供个人使用自己的账号。这是驱动 Amazon Quick 桌面客户端的内部双向 WebSocket 协议
> （非公开 API），很可能违反 AWS 服务条款，账号存在被限制/封禁的风险，后果自负。

## 工作方式

magpie 有真正的插件机制：它在 Bun 里加载 **OpenCode provider 插件**。本项目就是这样一个插件：

```
Agent ──(Anthropic / Responses / Chat / Gemini)──▶ magpie 网关 127.0.0.1:3425
      ──(OpenAI Chat Completions)──▶ 本插件的 fetch ──▶ wss://<qbs-cell>/streaming/quickwork-chat-bidirectional-stream
```

关键点：**不需要抓包、不需要代理、不需要改 app**。Amazon Quick 桌面端本身就内置一个
Python 后端（`quickwork-agent`，打包在 `resources/agent.zip` 里），以 `--outpost-only`
模式独立运行后会在 `127.0.0.1:<port>` 暴露 `/health`、`/auth/status`、`/auth/sncs-session`、
`/local/outpost-id` 等本地接口，并能读到桌面端保存在系统凭据存储里的登录态。

插件做的事：

1. **找到并启动 outpost**：优先用 app 已解压到 userData 的 `quickwork-agent`；找不到就把
   `resources/agent.zip` 解压到临时目录再跑。用**我们自己生成的 instance token** 通过
   stdin 交给子进程（与 Electron 主进程 `AgentBridge` 的契约一致），等 `/health` 就绪。
2. **取会话**：`GET /auth/sncs-session` 拿到 `{id_token, ws_host, actor_arn, …}`，
   `GET /local/outpost-id` 拿到设备 id；按 `usable_until` 缓存，临期自动重取。
3. **连聊天 WS**：`wss://<ws_host>/streaming/quickwork-chat-bidirectional-stream`
   （query: `surfaceType`/`token`/`outpostId`/`workingSessionId`/`channel`），
   发 `session_connect`（等 `session_established`/`connected` 应答），再发 `user_message`。
   上行是 `{"eventType":"rawInputEvent","payload":{"payload":base64(inner JSON)}}` 的
   二进制帧；下行是 AWS event-stream 帧（`:event-type=rawOutputEvent`，body 里同样是
   base64 包的 inner JSON）。每 25s 发 `ping`。
4. **协议翻译**：OpenAI 的 `messages` 渲染成 Quick 的 `text`（见下）——
   例外是 system prompt，它走独立的 `user_message.system_prompt` 字段
   （已实测生效）；下行的 `text_delta`/`thinking_delta`/`turn_usage`/
   `message_complete` 转成 OpenAI 的 `content`/`reasoning_content`/`usage`。
   一个 user turn 以 `message_complete`（`continuation_expected !== true`）
   结束——与桌面渲染端判定一致。
5. **会话复用（默认开启）**：三级续接判定——见下文
   [会话复用](#会话复用thread-reuse)。

### 会话复用（thread reuse）

Quick 在服务端按 `thread_id` 保存会话历史，而 OpenAI 客户端每次请求都重发
完整 transcript。本插件用三级续接判定，越精确的优先级越高：

- **增量哈希链** —— 每个请求对规范化后的消息列表计算 `h[k] = H(scope,
  m1…mk)`。命中即表示客户端是在"我们已经回答过的会话"上追加了新消息，
  于是只把新增的尾部（user turn / tool result）发给上游；更早的历史由
  Quick 服务端保存，prompt cache 也保持命中。
- **模糊锚点** —— 客户端扩展压缩/改写旧消息时（compaction、历史手术），
  严格哈希链会断。此时按位置无关的锚点匹配：我们上一条回复的回显，加上
  它之前的三条消息的内容哈希。修剪造成的位置漂移不影响判定；尾部被
  改写过则仍正确地新建 thread。
- **网关会话键** —— 最后兜底：网关会在同一对话的每个请求上打上稳定的
  会话 id（magpie 的 `x-magpie-session` 头；pi 等 OpenAI 客户端也会发
  自己的 session-affinity 头）。即使历史被改写到内容锚点都认不出，
  也能凭这个键续上原 thread；该条目每轮自我刷新，激进压缩也不会让它
  失联。

层级顺序很重要：内容匹配命中永远优先，会话键只在前两级都失败时启用。

- **scope 隔离** —— 哈希链按 `H(账号, agent_mode, thinking_effort,
  system prompt, 工具名集合)` 命名空间隔离：换账号、换模型、换推理强度、
  改 system prompt 或工具集，都会透明地新建 thread，而不是续接到一个
  不匹配的旧会话。
- **编辑/分叉检测** —— 更早消息的任何改动都会改变哈希，所以被编辑或
  分叉的历史永远不会误续接；只有纯追加的尾部才合格。缓存条目使用即
  销毁（single-use），客户端重试也不会重放一个 turn。
- **有界内存** —— 条目空闲 24 小时过期（agent 会话的轮次间隔远超半小时），
  LRU 上限 200 个 thread。缓存持久化到 `thread-sessions.json`（只存哈希 +
  thread id，无内容），插件重载后仍可续接；命中过期 thread 是安全的：
  handler 会用完整 transcript 自动重试一次新 thread。

### 模型：agent_mode，不是模型 id

Quick 的 `user_message` 用 `agent_mode` 选择档位，服务端再路由到具体模型
（`turn_usage` 里有 `resolved_model_id`/`served_model_id`）：

| magpie 模型 id | agent_mode | 实测 resolved_model_id（示例） |
|---|---|---|
| `fast` | fast | `us.anthropic.claude-haiku-5-5` |
| `balanced` | balanced | （随服务端路由） |
| `smart` | smart | `us.anthropic.claude-opus-5-5` |
| `advanced` | advanced | （服务端可能归一到 smart） |

`X-Magpie-Effort` 头（或 body 的 `reasoning_effort`/`thinking_effort`）映射到
`thinking_effort`：`off/low/medium/high/max`。

## 安装

### 1. 前提

- **magpie**（OpenCode 插件宿主）。
- **两种登录方式任选其一**（`magpie login` 时选择）：
  - **账号登录（浏览器 OAuth）**——不需要桌面端。插件在你浏览器里重放桌面端
    自己的 OIDC+PKCE 登录流程，拿到 token 后直接连云端聊天。没装桌面端、
    没有管理员权限的机器也能用。
  - **本地凭据**——**Amazon Quick 桌面版**已安装并**登录**（Windows 默认装在
    `%LOCALAPPDATA%\Programs\quickwork\`，即 `C:\Users\<用户名>\AppData\Local\Programs\quickwork\`；
    macOS 为 `/Applications/Amazon Quick.app`）。Windows 上插件直接从
    Credential Manager 读取应用保存的会话——**不需要 agent.exe、不需要
    outpost**；token 过期走 OIDC 自动续期并写回，桌面端不受影响。其他平台
    （或读取失败时）回退到拉起内置 `quickwork-agent --outpost-only`，复用
    应用登录态——**不需要**桌面端保持运行，登录态存在系统凭据存储里。
- **Node ≥ 22**：只在跑测试时需要；插件本身是纯 ESM、无第三方依赖。

### 2. 安装插件

```bash
magpie plugin add magpie-aws-quick   # 从 npm 安装；也可以写本地目录或 git URL
magpie login aws-quick              # 按提示选择登录方式
```

在 magpie 应用里，也可以到 **插件** 页搜索 "Amazon Quick" 直接安装。

**替代方案：独立 OpenAI 兼容代理**——`node bin/serve.mjs` 把同一个适配层
以 OpenAI Chat Completions 形式挂在 `127.0.0.1:$PORT/v1`（默认 3426），
供不走 magpie 的客户端使用，或通过
`magpie provider add --base-url http://127.0.0.1:3426/v1` 把 Quick 作为
自定义 provider 接入。参数见文件头（建议设置 `PROXY_TOKEN` 鉴权）。

**两种登录方式**

- **账号登录（浏览器 OAuth）**：打开 `quick.aws.com/sn` 登录页，插件在本地
  回调端口接住授权码，自行完成动态客户端注册 + code 换 token + user-info，
  然后把 `{jwt, ws_host, refresh_token, …}` 存到
  `%APPDATA%\magpie-aws-quick\oauth-sessions.json`（Windows）/
  `~/.config/magpie-aws-quick/`（Linux）/
  `~/Library/Application Support/magpie-aws-quick/`（macOS），权限 `0600`。
  约 1 小时有效的 id_token 过期时用存的 refresh_token 自动续期（轮换后的
  refresh_token 也会写回文件）。请求时**不再拉起 outpost**，WS 直连租户的
  `ws_host`。
- **复制登录地址（不自动打开浏览器）**：同样的浏览器 OAuth 流程，但 magpie
  不会打开任何东西——把链接复制到你用来登录 Amazon 的浏览器里打开，登录完
  把地址栏里的完整地址粘贴到 magpie 显示的输入框。如果那个浏览器在别的
  电脑上，访问不到 `127.0.0.1` 回调：第一次粘贴会记下账号信息并提示再来
  一次，第二次粘贴即可完成（保存 15 分钟内有效）。
- **本地凭据**：Windows 上直接读 Credential Manager 里的会话直连聊天
  （OIDC 自动续期 + 写回，桌面端 token 保持有效）；其他平台或读取失败时
  回退到拉起内置 outpost 并调用 `/auth/sncs-session` 校验；未登录会明确
  报错提示先去登录。

### 账号卡片上的用量

插件实现了 magpie 的 `auth.usage` 钩子，账号卡片和 **Usage** 页会显示 Quick
额度：agent 小时数已用多少、套餐总量、套餐名（如 *Quick Lite (free trial)*）
和试用到期时间。数据来自租户数据面的 `getAvailableEntitlementUnits`，用的是
账号自己的 token，和桌面端用量组件的数字一致；重置时间按桌面端的算法取
下个月 1 号。

## 已知限制

- **工具调用是文本约定模拟**：Quick 的 agent 在服务端自带工具链（浏览器、本地文件、MCP 等），
  `tool_start`/`tool_result` 等事件由它自己执行、客户端只观测，`message_complete.tool_calls`
  恒为空。客户端传入的 OpenAI `tools` 通过提示词注入为 `<tool_call>{json}</tool_call>`
  文本约定，由插件解析成标准 `tool_calls` 返回；`tool` 角色的结果渲染为
  `[tool_result …]` 续接同一 thread。可靠性取决于模型遵守约定——已实测
  `tool_choice:'required'` 下 smart/advanced 均能稳定产出；模型偶尔会先用
  自带工具（如联网搜索）直接作答，此时表现为普通文本回复。
  Quick 自带工具的执行结果不会映射为 OpenAI `tool_calls`（那是它内部过程）。
- **图片只支持小图**：内联图片（`data:` URL、Anthropic base64 块、工具结果
  里的图片）会作为 `user_message.attachments` 发出去，但 Quick 把图片的
  base64 和文字算在同一个 64KB 帧里，大约 40KB 以内的图才能发；更大的图会
  被丢弃，并在消息里注明。Quick 自己的上传接口只会把文件投递到已连接的
  设备，直连会话没有设备，所以用不了。非图片文件（`file`/`input_file`）
  仍是占位。
- **采样参数**：`temperature` 等不在协议内，传了也会被服务端忽略（`capabilities.temperature:false`）。
- **会话与账号绑定**：thread 复用的 scope 里包含账号身份哈希；换号后旧 thread 自动失效重建。
- **多窗口/并发**：同一 QuickSocket 上不同 thread 可并行 turn；同一 thread 的并发请求会被拒绝（`busy`）。
- **消息体积**：整个 `user_message` 帧服务端上限 64KB（`text` 与
  `system_prompt` 共享）。超大 system prompt / 工具 schema / 会话历史会自动
  压缩（schema 去注解、工具规格 lite→仅名字降级、历史从旧到新裁、
  tool_result 封顶），
  截断时回复里会带 `> [quick] …已截断` 提示。
- **OAuth 登录仅限 consumer/social 通道**：重放的是桌面端 `quick.aws.com/sn`
  的 `social` provider 流程。走企业 IdP 的租户如果 issuer 不是 Amazon 社交 IdP
  可能无法完成——这种情况请改用本地凭据方式。OAuth 路径以空 `outpostId` 运行
  （服务端接受），将来若有依赖真实设备 id 的服务端能力不适用于此路径。

## 安全与凭据

- instance token 是插件每次启动随机生成的，**只**通过 stdin 交给子进程，不落盘、不进日志。
- 本地凭据路径下 `id_token`/`ws_host`/`actor_arn` 等只在内存中流转；会话缓存
  只存哈希 + thread id（无消息内容），持久化到 `thread-sessions.json`，
  插件重载后仍可续接 thread。
- OAuth 路径会把 `{jwt, refresh_token, client_secret, …}` 存入
  `oauth-sessions.json`（0600）——这是 refresh token 轮换的必然要求，
  与 Quick 桌面端自身在系统凭据存储里保存登录态等价；请保护好自己的用户目录。
- 本地凭据（Credential Manager）路径只**读取**应用已存的会话；续期时把
  新 token **写回同一个凭据**（含 `session@` 孪生项），保证桌面端读到的
  始终是有效 token——等价于应用自己刷新，只是提前帮它做了。
- outpost 的 `/auth/*` 全部要求 `Authorization: Bearer <instance token>`；
  `/health` 是唯一公开端点。
- 插件不会修改 Amazon Quick 的任何文件；`agent.zip` 解压到系统临时目录
  （`<tmp>/magpie-aws-quick/agent/<size>-<mtime>/`），可用 `cacheDir` 选项改位置。

## 开发

```bash
npm test          # node --test test/*.test.mjs（fake WS server，无需真账号）
node _research/smoke-plugin.mjs fast   # 真实冒烟（需要本机 Quick 已登录）
```

协议细节见 [PROTOCOL.zh-CN.md](PROTOCOL.zh-CN.md)。研究过程与抓包记录在 `_research/`（不随插件发布）。

## 许可

MIT。Amazon Quick 是 AWS 的产品，本插件与 Amazon/AWS 无隶属关系。

## 社区

有问题、bug 报告、建议，或想一起折腾？Issue 和 PR 非常欢迎——
**[linux.do](https://linux.do)** 是找我和这个插件社区的最佳入口。
