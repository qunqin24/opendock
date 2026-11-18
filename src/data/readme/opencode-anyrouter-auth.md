# AnyRouter

Magpie 的 AnyRouter 供应商插件：六种登录入口、独立的每日签到、原生多账号路由，以及面向 AnyRouter 拥堵场景的保守重试和四协议请求保护。

插件只包装本供应商的模型请求，不启动后台代理，不改 Codex 配置，也不给其他供应商安装全局拦截器。运行时使用标准 Web API、Node 兼容的只读 API 和隔离 VM，在 Magpie 的 Bun 插件宿主中运行。

## 结论：登录不等于签到

AnyRouter 和 AgentRouter 的签到契约不同。AgentRouter 可以在登录响应中读取 `checked_in`，把一次登录当作签到；AnyRouter 前端则单独调用签到接口：

```text
密码账号签到：
GET  /login                 （建立匿名会话；仅 WAF 重试时）
GET  /api/status
POST /api/user/login?turnstile=
POST /api/user/sign_in       body: {}

已有会话签到：
GET  /api/user/self
POST /api/user/sign_in       body: {}
```

因此本插件不会因为“登录成功”“刷新了余额”或“拿到了模型 key”就宣称签到成功。`sign_in` 的响应才是签到结果。`sign_in` 只带站点 Cookie、`New-API-User`、`X-Requested-With: XMLHttpRequest` 和浏览器请求头，不带模型 `Authorization`。

AnyRouter 的 Turnstile 开关是动态的。`/api/status` 返回 `turnstile_check: true` 时，插件不会发送密码登录，也不会尝试破解验证码；请先在浏览器完成登录，再导入站点会话。对于 AnyRouter 返回的阿里云式 `acw_sc__v2` JS 盾，插件只执行响应中站点自己的内联挑战脚本，在隔离 VM 中捕获它设置的 Cookie 后重试一次；脚本大小、执行时间和可用对象都受限。如果挑战无法完成或遇到 Turnstile，插件会停止并提示改用浏览器会话入口。

## 安装

```sh
magpie plugin add opencode-anyrouter-auth
magpie plugin add github:roiding/opencode-anyrouter-auth
magpie plugin add /path/to/opencode-anyrouter-auth
magpie plugin login anyrouter
```

账号密码和系统访问令牌入口依赖 Magpie 的 keyless 登录支持。插件与社区 AnyRouter 插件共用供应商 ID `anyrouter`；同时安装时用 Magpie 的插件选择功能决定由哪一个服务该供应商，不串联两份认证实现。

旧记录中的 API key、站点会话、用户 ID、显式端点及请求头会通过兼容层读取。不会删除账号、重置令牌、自动创建模型 key，也不会把旧备注误当成邮箱。旧密码本身不是自动签到授权；必须在新登录流程中明确选择开启。

## 登录入口

| 入口 | 需要提供 | 每日签到 | 余额 |
| --- | --- | --- | --- |
| 账号密码 | AnyRouter 站点用户名或邮箱、密码；可处理 `acw_sc__v2` JS 盾，Turnstile 仍需浏览器 | 可选；开启后保存密码 | 有效会话允许时读取 |
| GitHub | 浏览器完成 GitHub 登录，再交接 AnyRouter 会话 | 可选；保存会话 | 有效会话允许时读取 |
| LinuxDO | 浏览器完成 LinuxDO 登录，再交接 AnyRouter 会话 | 可选；保存会话 | 有效会话允许时读取 |
| 浏览器会话 | 浏览器完成登录及 WAF/JS 盾后，导入已登录的 AnyRouter 会话 | 可选；保存会话 | 有效会话允许时读取 |
| 系统访问令牌 | AnyRouter 系统令牌和数字用户 ID | 不支持 | 站点权限允许时读取 |
| 模型 API key | 模型调用密钥 | 不支持 | 不查询账号余额 |

登录、会话、签到和账号查询固定使用 `anyrouter.top`。模型 API 端点在每个登录入口中直接选择 `anyrouter.top` 或 `https://a-ocnfniawgw.cn-shanghai.fcapp.run`。账号密码、GitHub、LinuxDO、浏览器会话和系统访问令牌入口会读取账号已有的模型 key：

- 只有一个有效 key 时直接使用。
- 有多个有效 key 时，要求用户在高级设置中填写数字 key ID。
- 没有有效 key 时明确失败，请用户先在站点创建或启用 key。
- 不调用 `/api/user/token`，不重置系统令牌，不自动创建、旋转或删除模型 key。

系统访问令牌和模型 API key 是不同凭据，不能混用。模型 API key 入口只提供模型发现和推理请求保护。

## GitHub、LinuxDO 与浏览器会话

这三个入口都走“浏览器完成正常登录，再把 AnyRouter 会话交给插件”的流程，不重放已被消费的 OAuth code。

1. 在 Magpie 登录界面选择入口，打开 AnyRouter 登录页。
2. 在浏览器完成 GitHub、LinuxDO 或普通账号登录。
3. 打开浏览器 DevTools 的 Network，刷新 AnyRouter 账号页，找到本站的 `GET /api/user/self`，选择 Copy as cURL（bash 格式）。
4. 将复制内容粘贴到 Magpie 的登录交接框。

也可以粘贴包含以下字段的 JSON：

```json
{
  "cookie": "session=...; acw_tc=...; cdn_sec_tc=...; acw_sc__v2=...",
  "userId": "123"
}
```

插件只解析文本，不执行 cURL 或任何 shell 命令。只接受 `anyrouter.top` 的 `/api/user/self` 请求；`session` Cookie 和数字 `New-Api-User` 必须存在。浏览器客户端头只用于站点接口，不会混入模型请求。

粘贴内容属于敏感凭据，只应保存在本机 Magpie 认证文件中。不要把 Cookie、密码或 cURL 粘贴到聊天、Issue 或日志。

## 每日签到

签到默认关闭，必须同时满足三个条件：

1. 添加账号时明确选择“是 - 保存密码用于每日签到”，或为会话入口选择“是 - 保存会话用于每日签到”。
2. 账号有可用的站点密码或未过期会话，以及经过校验的站点 UID。
3. 在 Magpie 的 **设置（Settings）› 额度（Allowances）** 中打开 AnyRouter 签到开关，并按需打开具体账号的开关。

宿主负责每日调度。插件不创建自己的后台定时器，也不会在余额查询失败时偷偷登录签到。

签到行为：

- 密码模式先读取 `/api/status`，再登录并校验 `/api/user/self`，最后单独调用 `/api/user/sign_in`。如果状态或登录请求返回可识别的 `acw_sc__v2` JS 盾，插件在隔离 VM 中执行站点自己的挑战脚本、合并 `acw_tc`/`cdn_sec_tc`/`acw_sc__v2` 后重试一次；不循环重试。
- 会话模式先只读校验 `/api/user/self`，再调用 `sign_in`，不使用密码。
- 站点返回的用户 ID 必须匹配目标账号；不匹配时不覆盖另一个账号的会话。
- 同一账号同一天的并发签到会合并。
- 北京时间的当天去重只在 `claimed`、`done`、`captcha`、`inactive`、`ineligible` 等终态上生效。
- HTTP 200 但 `success:false` 且映射为 `failed` 的结果不会标记当天完成，也不会写入签到日期，之后仍可重试。
- 验证码、WAF、密码错误、账号无权限或接口未开放不会被当作“签到成功”。

签到结果含义：

| outcome | 含义 |
| --- | --- |
| `claimed` | 本次签到请求成功，且未识别为今日已签到 |
| `done` | 今日已经签到，或并发调用已合并 |
| `captcha` | 需要浏览器完成 Turnstile 或 WAF 验证 |
| `inactive` | 站点当前没有开放签到活动或接口 |
| `ineligible` | 账号无权限，或凭据/会话失效 |
| `failed` | 限流、暂时不可用或其他未完成结果；不写当天完成标记 |

AnyRouter 的签到奖励会增加钱包余额，但不等于每天自动重置模型额度。余额缺失、WAF 拦截或接口失败时显示未知，不会伪造为零，也不会伪造午夜刷新窗口。

## 站点、模型 API 与 WAF

固定站点（登录、会话、签到、余额和账号查询）：

- `anyrouter.top`

模型 API 端点：

- `https://anyrouter.top`
- `https://a-ocnfniawgw.cn-shanghai.fcapp.run`（备用 API）

API 端点选择不会改变登录、会话导入、签到或余额查询地址。上述站点操作始终只访问 `anyrouter.top`，备用 API 域名只用于 `/v1` 或 `/v1beta` 模型请求和模型目录发现。

每个账号在登录时选择一个模型 API 端点。插件重试会留在该账号所选端点内，不会在一次请求中自动切换到另一个 API 域名，以避免重复计费；跨账号切换仍由 Magpie 的原生故障转移负责。

站点会话可能包含 `session`、`acw_tc`、`cdn_sec_tc`、`acw_sc__v2` 等 Cookie。导入时一并保留；登录和签到过程中，站点返回的更新 Cookie 会合并回账号记录。

遇到可识别的 AnyRouter JS 盾页时，插件会执行站点自己的内联挑战脚本，最多重试一次；脚本在隔离 VM 中运行，不能访问网络、文件或进程，并限制脚本大小和执行时间。无法完成挑战时返回需要人工处理的错误，不会在后台循环刷新、破解 Turnstile 或把站点 Cookie 发送给第三方。站点操作使用 Chrome 风格请求头，并设置 `anyrouter.top` 的 `Origin`/`Referer`。

## 模型与请求头

**没有默认模型。** 模型目录按账号发现，公共注册表只补充已发现模型的能力和上限，不会仅凭公共定价表增加账号访问权限。

模型协议映射：

- `claude-*` 和 `*-cc-format` 默认按 Anthropic Messages。
- `gemini-*` 默认按 Gemini。
- 其他模型默认按 Responses。

用户显式声明的 SDK、模型和 API 地址优先。模型元数据逐字段解析：用户覆盖、账号声明、本站 pricing、对应注册表、原厂型号、可信同族信息、宿主已有字段。`context`、`input`、`output` 分别表示总上下文、输入上限和输出上限，不互相冒充。

模型请求原样透传 Magpie 已合并的本次请求和当前模型头。账号自定义头可以覆盖默认头，但不混合其他模型的头。兼容客户端标识默认开启，只在 Responses 协议上恢复 codex 客户端身份；账号自定义头始终优先。

认证头按出站协议选择 Bearer、`x-api-key` 或 `x-goog-api-key`。站点 Cookie、系统访问令牌、密码和 `New-API-User` 不会发送到模型接口。账号自定义头不能覆盖认证、Cookie、Host、连接和长度等受管理字段。

## 重试与请求保护

AnyRouter 常年拥堵，因此默认使用 `anyrouter` 重试配置，而不是上游的宽松默认值：

- 单次选定供应商调用最多额外重试 8 次。
- 资源不匹配最多 1 次，限流最多 3 次，传输错误最多 4 次，可用性错误最多 2 次。
- 退避从 1 秒到 15 秒左右，限流退避带少量抖动，并遵守 `Retry-After`。
- 裸 `429` 按限流处理；裸 `503`、`504` 按可用性处理。
- 带 JSON 的余额不足、无效 key、权限拒绝和模型不存在错误不会因为 HTTP 429 或 5xx 被误重试。
- 总期限、上游空闲期限、客户端取消和响应大小上限始终优先。

这里的 8 次是插件内一次选定供应商调用的上限，不是 Magpie 整个账号故障转移链的总次数。Magpie 的跨账号切换是外层行为。

请求保护覆盖 Responses、Chat Completions、Anthropic Messages 和 Gemini 的流式与非流式请求：

1. 首次请求保留原始字节；普通重试也保留，不预先删历史、不替换模型。
2. 只有 Responses 的明确资源不匹配或 `invalid_encrypted_content` 才允许清理历史。
3. 清理保留消息、图片、phase、工具参数/结果和 `call_id` 配对；不能安全恢复的服务端引用会明确失败。
4. 其他协议不套用 Responses 字段删除，不猜测 thinking、signature 或 thoughtSignature 修复。
5. SSE 在确认协议终止前不交付正文或客户端工具调用；失败尝试整体丢弃。
6. 快速错误保留 HTTP 状态和响应头；保活提交 SSE 后，后续错误通过带原始状态和错误码的 SSE 事件交付，不伪造完成。

保活默认每 10 秒发送不含正文、响应 ID 或工具调用的进度事件。它不重置上游空闲期限，也不保证上游工具只执行一次；重试可能产生重复计费或重复副作用。

## 开关与参数

供应商开关“安全重试加密历史错误”只控制请求保护，不影响登录、签到或账号选择。默认开启。

插件选项示例：

```json
{
  "quotaPerUnit": 500000,
  "filter": {
    "enabled": true,
    "retryProfile": "anyrouter",
    "deadlineMs": 1800000,
    "idleTimeoutMs": 120000,
    "keepaliveMs": 10000,
    "maxBufferBytes": 67108864,
    "maxRequestBytes": 67108864
  }
}
```

`retryProfile` 默认由插件入口设为 `anyrouter`。将 `filter.enabled` 设为 `false` 或关闭供应商开关，可绕过请求保护；登录和站点接口本来就不受这个模型请求过滤器包装。

日志只记录结构化事件、类别、计数和耗时，不记录请求正文、密码、Cookie、令牌、授权码或 state。

## 开发与验收

```sh
npm test
node --test test/provider.test.mjs test/site-client.test.mjs
node --test test/anyrouter-retry.test.mjs
```

普通测试使用模拟响应和本地 HTTP 服务，不读取真实账号，也不调用收费模型。真实宿主/网关测试默认跳过，必须显式提供已安装路径：

```sh
MAGPIE_TEST_HOST=/path/to/host.js \
MAGPIE_TEST_BUN=/path/to/bun \
npm run test:host

MAGPIE_TEST_BINARY=/path/to/magpie \
MAGPIE_TEST_BUN=/path/to/bun \
npm run test:gateway
```

这些测试创建隔离 HOME、临时账号和回环服务，结束后清理，不修改现有 Magpie 配置。可选的 `MAGPIE_TEST_SSE_IDLE=1` 会运行约四分钟的真实网关 SSE 空闲测试。

本包自包含，不捆绑上游源码。旧通用入口 `generic.mjs` 继续保留给非 AnyRouter 场景，默认入口只注册 AnyRouter。

## 来源与许可

行为来源、参考项目和派生关系见 [UPSTREAM.md](UPSTREAM.md)，实现契约见 [DESIGN.md](DESIGN.md)。本包使用 MIT License。
