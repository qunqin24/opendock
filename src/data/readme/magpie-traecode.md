# magpie-traecode

用 Trae（字节跳动的 AI IDE）自己的账号在 magpie / OpenCode 里跑对话。两个
provider，各为一个站点：

| Provider id | 登录页 | 换令牌 | 对话 | 签到 / 积分 |
|---|---|---|---|---|
| `trae-cn` | `www.trae.cn/authorization` | `api.trae.com.cn` | `api5-normal.mchost.guru` | `api.trae.cn` |
| `trae-global` | `www.trae.ai/authorization` | `api.trae.ai` | `coresg-normal.trae.ai` | `api-sg-central.trae.ai` |

站点由 provider id 决定，**不由 base_url 或凭证 domain 猜测**：猜错就是请求打到另一个
区域、上游回 401，而错误来自上游，几乎无法定位。

## 这个包的核心：对齐 llm-api 的 trae 渠道

上一版插件（`@magpie-community/opencode-trae-auth`）是从两个开源中转项目反推出来的，
没有请求体加密。本包换成以仓库内 **LLM-API 的 `internal/relay/channel/trae`** 为唯一
设计图纸 —— 那是被生产跑过的一版实现。逐段对应关系：

| 本包 | llm-api 中的来源 | 做什么 |
|---|---|---|
| `lib/crypto.mjs` | `crypto.go` | AES-256-GCM 加密请求体：`key = BASE_KEY`，前 8 字节与 `x-request-pin` 异或，`x-requested-at` 作 aad，body = base64(nonce‖ct‖tag) |
| `lib/headers.mjs` | `headers.go` | SOLO 请求头全套 + 动态 trace id；版本号由 `lib/version.mjs` 从本机 IDE 探测 |
| `lib/payload.mjs` | `payload.go` | OpenAI 请求 → `llm_utils_chat` 信封的四条硬规矩 |
| `lib/sse.mjs` | `solosse.go` | SOLO 事件（`thought` / `output` / `token_usage` / `done` / `error`）→ OpenAI chunk |
| `lib/oauth.mjs` | `oauth.go`、`oauth_refresh.go` | 授权页参数、`ExchangeToken`、`GetUserInfo`、凭证 JSON 解析 |
| `lib/models.mjs` | `fetch_models.go` | `batch_get_detail_param` → 模型清单（过滤规则逐条一致） |
| `lib/account.mjs` | `credit.go` | 设备指纹派生、签到（含 9095 换设备重试）、积分包用量 |
| `lib/plugin.mjs` | `adaptor.go` | 装配：config / provider.models / auth.loader / usage / checkin / methods |
| `lib/sites.mjs` | `constants.go` | 站点表、端点常量、错误码表 |
| `lib/errors.mjs` | 上一版插件实测（llm-api 只认 1005） | 登录失效 / 额度 / 其它的错误分类 |

除 llm-api 之外，还有几处事实是从**上一版插件**（`apps/plugins/packages/trae`）的实测
里搬来的 —— 它没有 llm-api 的加密与 SOLO 头，但在真账号上跑出过一批细节：

| 细节 | 为什么值得要 |
|---|---|
| 错误码表（`1001` / `20101` 失效，`4008` / `1005` / `4011` 额度） | 登录过期能提示重新登录，额度用完给 429，而不是一个 502 |
| 签到的 15 位数字设备号 | 16 位或 32 位 hex 会被 9074 拒（三账号 / 两机子 / 两 ISP 实测） |
| `session_id` / `request_id` | Trae 按 session 归组用量，不带就一次发送碎成好几条 |
| 事件名与字段变体（`message` / `delta`、`content`、`response_done`） | 上游不只发 `output` / `done` |
| `finish_reason` 归一（`max_tokens` → `length`） | 客户端不认上游自己的收尾词 |
| 思维链去重 | 上游会把同一段思考重发 |
| 缓存双口径 + `magpie_cache_unknown` | 缓存计数用 Anthropic 名字发一份，magpie 才不把「没说缓存」读成 0% 命中 |
| 档位名对应表（`low↔light`、`xhigh↔extra_high`） | 两张名字表不同，发错上游直接拒 |
| 积分包 `-1` = 无上限、到期日 ISO 写法、`resetsAt` / `runsOut` | 不然无上限账号卡片空白、快过期的额度看不到 |

## 登录

两种方式，都不需要粘贴令牌手工拼：

1. **浏览器登录**：打开该站点的授权页（IDE 自己的客户端 `en1oxy7wnnw8j9n`），登录并
   允许后，页面把 `Cloud-IDE-JWT` 与 refresh token 送回本机一个临时端口上的
   `/authorize`，插件接住并自动继续。设备标识（`machine_id` / `device_id`）在登录时
   生成并随账号保存 —— 每次请求换新设备会被上游丢掉。
2. **粘贴 JSON 导入**：认两种形态，都是 Go 侧 `Parse` 认的形状：
   - 本插件导出的扁平 `{"accessToken":…,"refreshToken":…,"uid":…}`；
   - **llm-api 里这个渠道的 key 原文**（嵌套 `{"auth":{…},"account":{…}}`）。
   只有 refresh token 的导出也能恢复：先用它换出 access，再用 `GetUserInfo` 验证令牌
   可用，验不过就不让存（存进去只会在每次请求时 401）。

access 临近过期（60 秒内）时请求前自动换一次，refresh token 轮换后写回 magpie；
`refreshLead` 让 magpie 在到期前 5 分钟主动续期。签到与积分这两种「账号域」调用碰上
上游 401 时，会先强制换一次令牌再重试（对齐 llm-api 的 `RefreshKey`：它不看到期时间，
只看上游认不认）。

导入时如果凭证里带 `domain` 且不是本站点的区，会当场拒绝——两地是同一套令牌但不同区域
的域，混用只会得到上游 401。

## 对话

```
客户端 OpenAI 请求
  → prepareBody 归一化          ① content 数组化 ② tools.parameters 变字符串
  → 			                    ③ assistant 的 tool_calls 改名 function_call ④ developer→system
  → AES-256-GCM 加密（每次一个新 salt 与 nonce）
  → POST {api}/api/agent/v3/llm_utils_chat   （SOLO 头 + x-request-pin + x-requested-at）
  → SOLO SSE → OpenAI chunk（流式）或聚合后的 chat.completion（非流式）
```

几个必须说清楚的取舍：

- **上游恒回 SSE**，`stream` 字段被忽略。客户端要非流式结果时由插件聚合，否则客户端
  会把 SSE 文本当 JSON。缺省按非流式（与 OpenAI 一致）：只有显式 `stream: true` 才给流。
  客户端的 `stream_options` 不进上游（llm-api 同样置空），要 usage 由插件自己补片。
- **`tool_choice` 是能力降级**：上游只能表达「禁用工具」（不传 `tools`）与「所有工具
  可选」。所以 `none` 会连 `tools` 一起删；`auto` / `required` / 具名调用在上游无差别，
  具名只能靠提示词引导。
- **上游业务错误走 `event:error`**，不是 HTTP 状态码。不能吞掉，否则客户端只收到一个
  空流。分类见下节「错误分类」。
- 思维链以 `reasoning_content` 回传，并去重（上游会把同一段连发两次，或把「目前为止
  的全部」再发一遍，只发新增）。
- **会话归组**：请求体带 `session_id`（来自 magpie 的会话头，没有就用本对话第一条用户
  消息哈希）与每请求一个的 `request_id`。Trae 按 session 归组用量，不带就是每次都算
  一个新对话，一次用户发送（工具结果回传、重试、换 function）在用量明细里会碎成几条。
- **档位名要翻**：客户端说 `low` / `xhigh`，Trae 要 `light` / `extra_high`。模型表里读到过
  该模型的档位时，翻完不在里面的就不发（Trae 对没有的档位是直接拒的）。
- **HTTP 200 也可能是错误**：上游有回 200 + JSON 错误体的形态。按 content-type 拦下来
  当错误处理，否则会被当成空流。

## 模型表

`provider.models` 从账号自己的 `batch_get_detail_param` 拉（5 分钟缓存），只问
`chat_v3` 一张表 —— 广告出去的模型必须就是对话会用的那条通道，否则「列表里有、一点
就 4001」。过滤规则与 Go 侧一致：`config_switch=false`、`is_invisible_to_user=true`、
非对话类 `usage`、`custom_model_` 前缀、重名一律剔除。拉不到时回落到 `lib/sites.mjs`
的静态清单（CN 15 个、Global 5 个），不会把整个列表搞没。

这个端点不给上下文上限，所以不编：`limit` 是 0（未知）。思考能力与档位都从条目的
`reasoning_effort_config` 读（声明了才报）：对外报客户端认的那套名字
（`low`/`medium`/`high`/`xhigh`/`max`），发请求时再翻回 Trae 的名字（见上节）。条目里
只有本构建认不出的档位名时，当「没有档位」处理，不报半套。

## 错误分类

错误码表来自上一版插件在真账号上的实测（`lib/errors.mjs`），llm-api 只单独认了流内的
1005：

| 情况 | 判据 | 客户端拿到 |
|---|---|---|
| 登录失效 | HTTP 401、码 `1001`（CN）、`20101`（Global） | 401 + `X-Magpie-Sign-In: expired`（提示重新登录） |
| 额度 / 限频 | HTTP 429、码 `4008` / `1005`（CN）、`4011`（Global） | 429 + `rate_limit_error` |
| 其它 | 上游原话 + code | 上游状态（未知当 502） |

HTTP 403 只在文案像「未登录」/「额度」时才改写，避免把权限类 403 说成需要重新登录。

## 签到与积分

`trae-cn` 有每日签到钩子（`trae-global` 不给 —— 它的签到端点没有实测依据，不给这个
钩子界面上就不会出现签到入口）。设备指纹是确定性的：同一个 uid 每次派生同一套
`device_id` / `market_user_id` / `session_id`；遇到 9095（当前设备今日已签到）或频控
才换一套新设备重试，最多两次。

签到这个口子**只收 15 位纯数字设备号**（上一版插件实测：16 位与登录时那个 32 位 hex
被 9074 拒，同一秒换 15 位就过）。所以账号的对话设备号只有在本来就是 15 位数字时才用，
其余一律用从 uid 派生的那个 —— 稳定、不轮换。

积分卡按 `ide_user_ent_usage` 的积分包聚合：只算未过期且还有剩余的包，给出
`已用 / 总量` 与百分比；`credits_limit` 为 `-1` 是「无上限」；到期日可能是秒、毫秒或
ISO 字符串，都认；卡片还会给出 `resetsAt`（最近一个到期日）与 `runsOut`（届时作废的
额度），因为积分包是逐包到期作废的。

## 已知边界

- **Global 的对话域与积分域不是 llm-api 覆盖的**：`coresg-normal.trae.ai` 与
  `api-sg-central.trae.ai` 取自上一版插件的实测表，属未验证项；换区域（US）就是换
  `lib/sites.mjs` 里那两个常量。
- **企业版（SaaS / SSO）账号不单独识别**：llm-api 的 trae 渠道也只有固定常量，不读
  授权页回传的租户 host。企业席位若要求打到自己租户的 console，这里会落在中国区的
  对话域上；上一版插件对这一路径有专门分支，本包没有。
- **站点域名写死**：llm-api 的渠道允许配 BaseURL（企业 / 自定义部署用得上），插件这边
  没有对应开关 —— 要改就是改 `lib/sites.mjs`。同理，凭证里那个 `apiHost` 也**不采用**：
  它是账号登录时写进去的网关，实测同一个账号上它时通时不通（一次 `fetch failed`，几分钟后
  又正常），而站点常量稳定应答。用一个可能陈旧的域名去换掉已验证的网关，只会把能用的
  账号弄挂。
- **不多 function 回退**：上一版插件在 `4001` / `4023` 时会把同一个请求换到别的
  `function`（`solo_agent` 等）重试；本包只用 `chat_v3`（llm-api 的结论：它覆盖面最广，
  且只广告它的模型，所以正常路径不会遇到这个问题）。
- **不做工具调用的文本修复**：有的模型会把工具调用写成文本（`<tool_call>` / DSML /
  GLM 模板）。上一版插件有上千行解析与修复，本包依赖 `llm_utils_chat` 的结构化
  `tool_calls`；真遇到时客户端会看到一段文本而不是一次调用。
- **不滤 IDE 自己的进度文案**：上一版插件会丢掉以 `Building prompt:` 开头的正文；本包
  没用 `create_agent_task` 通道，没有这个来源。
- **积分请求的 `req_source` 取 2**（llm-api 的值）；上一版插件用 0。两个都能返回数据，
  这里跟 llm-api。
- **无非流式 usage 的估算兜底**：上游没发 `token_usage` 时，llm-api 会用 tokenizer 估算
  一份 usage，本包宁可不给也不编数字（客户端与 magpie 自己会统计）。
- **图片模型与非对话模型不暴露**：`batch_get_detail_param` 只用来挑对话模型，图片 /
  视频生成走别的通道。
- 上游没有「具名工具调用」语义（见上文 `tool_choice`）。
- 本包没有 OpenAI Responses / Claude Messages 的入口转换：那是 llm-api 在服务端做的
  一层，插件只在 OpenAI chat completions 这一面服务。

## 开发与测试

```sh
cd apps/magpie-traecode
npm test          # node --test test/*.test.mjs，117 个用例，不需要任何网络与账号
npm run e2e ../../account.json   # 真链路：会花额度，只看结果不要频繁跑
```

单元测试全部跑在本地假上游上（`test/fake.mjs`），断言的是**真实发出去的字节**：
`test/plugin.test.mjs` 会拿响应头里的 `x-request-pin` / `x-requested-at` 把线上那份
base64 密文解开，逐字段核对归一化后的 `llm_utils_chat` 载荷 —— 加密链路、请求头、
SSE 转换、续期回写、签到与积分都在这一层被验证。

## 真实客户端抓包对照（2026-11-18，proxycli + Trae CN.exe）

用 `proxycli` 的进程级透明拦截抓了 Trae CN IDE 自己的流量（170 条），对照结论：

### 对话端点

| 项 | 真客户端 | 本包 |
|---|---|---|
| `accept` | `*/*` | `text/event-stream` |
| 版本头 | `3.4.20` / `20261110` | 版本自动探测（本机 3.4.20）；code 用常量 `20261029` |
| `referer` | `https://trae-api-cn.mchost.guru/…`（另一个网关） | 与请求同域 |
| 额外头 | `x-user-region: CN`、`x-harness: 1`、`traceparent`、风险控制 `x-medusa` / `x-helios` | 不发 |
| 加密 | `x-request-pin` + `x-requested-at`，AES-256-GCM | 一致（用本包的 `decryptBody` 能把真客户端请求体解开） |

实测版本头 / `access_type` / `Accept` / `show_custom_model` 对模型表**没有影响**：四种组合
（版本 3.4.17/3.4.20 × code 20261029/20261110）都是 chat_v3 64 个原始条目 → 过滤后 20 个。
风险控制头（`x-medusa` / `x-helios`）本包不发 —— 不带它们也能正常对话（e2e 已验证），
但上游哪天收紧，这就是第一个要补的地方。

### 版本号自动探测

版本头不写死，有两条取真值的路：

1. **本机装了 IDE** → 读 `product.json` 的 `appVersion`（就是客户端发出去的
   `x-ide-version` / `x-app-version`，2026-11-18 真机 3.4.20 逐字对上）。不联网。
2. **本机没装 IDE**（OpenCode 用户常见）→ 调 Trae 自己的更新检查：故意发一个旧
   `appVersion`，它就把当前最新版本回在 `data.appVersion`（当时 `3.4.22`）。不需要账号
   令牌，只要一组机器与渠道参数（`mid` / `branch` / `packageType` …，少字段它只回
   「缺少 X」，所以参数组合是实测定下来的）。后台探一次、每 6 小时刷一次，失败按 10 分钟退避，
   从不进请求路径 —— 取版本失败不影响对话。

`x-ide-version-code` **没有**可靠来源：`product.json` 里的 `traeVersionCode`（20250325）不是
它，模型表响应、`get_client_config`、`native/config/query`、更新检查的响应里也都没有。
所以这一个仍用常量，不去猜一个看起来像的日期。

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1 | `TRAE_IDE_VERSION` / `TRAE_IDE_VERSION_CODE` | 环境变量，可把两者钉住 |
| 2 | 本机 `product.json` 的 `appVersion` | 只在本机装的区域与站点一致时用（CN 客户端不给 trae.ai 用） |
| 3 | 更新检查探到的最新版本（仅 CN） | Global 的探测参数组合没实测过，所以不给 Global 探 |
| 4 | 内置常量 `3.4.17` / `20261029` | llm-api 基线 |

其他开关：`TRAE_IDE_PRODUCT_JSON=/path/product.json` 指定安装位置（指向不存在路径 = 当作
没装）；`TRAE_IDE_NO_PROBE=1` 关掉联网探测；`TRAE_IDE_VERSION*` 钉住版本时也不再探。
探测结果缓存 5 分钟（安装检测）/ 6 小时（联网）。

真客户端还会用同一个端点跑别的活：抓到的唯一一条 `llm_utils_chat` 其实是**标题生成**
（`function: "utils"`、`usage: "title_generation"`、`conversation_id`、`biz_context`）。说明
`function` 是按用途路由的多个值；本包固定 `chat_v3`（对话）。

### 模型表：字段是真的，已全部读上

`batch_get_detail_param` 的真实响应有 7 张 function 表（builder 34 / builder_v3 50 /
**chat_v3 64** / code_reviewer 3 / code_review_summary 4 / refactor 5 / solo_agent 79），
条目里这些字段现在都读：

| 字段 | 含义 | 之前 |
|---|---|---|
| `context_window_tokens.dev` | 上下文窗口（`max` 是 Max 模式的，本包不给 Max 模式） | 一律 0 |
| `model_detail_list[].max_tokens` | 输出上限 | 一律 0 |
| `display_config.multimodal` | 能不能收图（20 个里 18 个能） | 一律 false |
| `display_config.display_name` | 展示名 | 已读 |
| `display_contact_config.consumption_rate.data.rate` | credits 倍数（0.06 ~ 1.91） | 未读 |
| `extra_config.native_function_call` | 工具调用能力 | 一律 true |
| `reasoning_effort_config.support_thinking` / `default_level` | 思考能力与默认档 | 已读（档位）/ 未读（默认档） |

### 积分：`usage_summary` 才是官方口径

真实响应里 3500 / 130.39 在 `usage_summary.total_amount` / `consumed_amount`，而
`user_entitlement_pack_list` 里有的包**根本没有 `credits_limit`**（只有能力开关）。之前只累加
包会漏数据。现在优先用 `usage_summary`，包只用来算 `resetsAt` / `runsOut`。另外
`is_credits_billing: true` 现在会作为卡片的 plan 显示。

`ide_user_ent_usage` 的请求体在三个实现里各不相同：真 IDE `req_source: 1`、llm-api `2`、
老插件 `0` —— 三者都能返回数据，本包跟 llm-api。

### `session_id` 的用处被直接坐实

`/api/v1/commercial/get_session_usage` 的响应是 `user_usage_group_by_session`，按
`session_id` 聚合（带着 model_name、input/output/cache token、credits）。也就是说
请求体里的 `session_id` 就是用量归组的键 —— 这也解释了为什么本包要把它从 magpie 的会话
推出来。真 IDE 的 session id 是 24 位 ObjectId（本包用 UUID，上游接受并原样回显）。

签到活动本身在 `/trae/api/v2/ug/activity/info` 有 `activity_id: "checkin_credits"`、
`work_credits: 200`、`Enabled: true`；签到的读写仍走 `checkin_credits/status|claim`（已验证）。

## 真账号 e2e（2026-11-18 实测）

`scripts/e2e-live.mjs` 拿一份真实凭证把每条链路跑一遍（模型表 / 非流式 / 流式+工具 /
签到状态 / 积分），输出不含令牌。实测结论：

| 项 | 结果 |
|---|---|
| 模型表 | 20 个模型（chat_v3 原始 64 个经 llm-api 规则过滤），带上下文 256k、输出 32k~64k、credits 倍数、收图与档位 |
| 非流式对话 | 加密体 + SOLO 头被接受，`content` 回传，`finish=stop`，思维链走 `reasoning_content` |
| 流式对话 | 帧里有 `progress_notice` / `metadata` / `timing_cost` / `output` / `extra_info` / `token_usage` / `done` 与 `id:` 行；我们的解析器只认该认的 |
| `session_id` | `metadata` 事件把我们的 `session_id` 原样回显，说明上游按它归组 |
| 工具调用 | 真机是**分片**（第一片 name、第二片 arguments），按 index 累加后得到一次完整调用；非流式聚合也是 |
| 档位翻译 | `low` → `light` 被接受且思考变短（29 字）vs `high`（58 字）；模型没声明的 `xhigh` 被丢掉、不报错 |
| 签到状态 | `checked_in=true`、`enable=true`、credits=100（只读，没 claim） |
| 积分 | 3500 总额 / 130 已用，`resetsAt` 2026-11-20，`runsOut` 69.7 |

这轮 e2e 拓出并修掉了两个单元测试没盖到的 bug：

1. **工具调用曾是「一次碎成两片」**：真机把 name 与 arguments 分两帧发，而我原先当完整
   调用透传，客户端拿到两个半成品。现在空的 `name`/`type` 不再写进分片（写了会覆盖
   已累加的名字），非流式聚合按 index 合并成一次调用。
2. **缓存命中率曾恒为 0%**：真机 `token_usage` 是「具名但 0/0」的常态（`cache_read_input_tokens: 0`），
   我原先会写 `prompt_tokens_details.cached_tokens: 0`，等于告诉客户端「一次都没命中」。
   现在这种情况只打 `magpie_cache_unknown`，不给 0。

```
index.mjs            两个插件函数（OpenCode 1.x 唯一允许的导出形态）
opencode.mjs         1.x / magpie 宿主入口
opencode2.mjs        OpenCode 2.x 适配（与 plugins/scripts/opencode2.mjs 同一份字节）
lib/sites.mjs        sites + 端点常量 + 错误码表
lib/version.mjs      版本探测（本机 product.json → 更新检查 → 常量）
lib/errors.mjs       错误分类（失效 / 额度 / 其它）
lib/crypto.mjs       请求体 AES-256-GCM
lib/headers.mjs      SOLO 头 / VSCode 头 / OAuth 头
lib/payload.mjs      OpenAI → llm_utils_chat
lib/sse.mjs          SOLO 事件 → OpenAI chunk / 聚合消息
lib/oauth.mjs        登录、换令牌、凭证解析
lib/models.mjs       模型表
lib/account.mjs      设备指纹、签到、积分
lib/plugin.mjs       插件装配
scripts/e2e-live.mjs 真账号 e2e（模型表 / 对话 / 工具 / 签到 / 积分）
```
