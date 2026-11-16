# opencode-kunrouter-auth

[KunRouter](https://wcnmb.si) 的 **Magpie 插件**（同时兼容 OpenCode）：浏览器一键授权、钱包与订阅额度、每日签到。

> 维护者：[MY-Final](https://github.com/MY-Final) · 插件名：KunRouter · 适用：Magpie / OpenCode

## 装

```sh
git clone https://github.com/MY-Final/opencode-kunrouter-auth.git
magpie plugin add ./opencode-kunrouter-auth
```

或直接 `magpie plugin add https://github.com/MY-Final/opencode-kunrouter-auth`。

## 登录

- **浏览器授权（推荐）**：打开 KunRouter 授权页，登录、选分组、确认授权，浏览器自动跳回本机一次性回调。插件拿不到账号密码，用 PKCE + 随机 `state` + loopback 回调，令牌不进跳转 URL。
- **没有账号**：登录页的「注册并领取鸡蛋」入口会打开注册页并自动填入活动邀请码。邀请码不可用（禁用 / 过期 / 名额满）时入口自动隐藏；换活动用环境变量 `KUNROUTER_INVITE_CODE` 覆盖，不用改代码发版。
- **手动填写 / 更换访问令牌 + API 密钥**：授权服务不可用时的兜底，也是换 Key 的入口。访问令牌读余额和签到，`sk-` 密钥请求模型；只填访问令牌也能登录，但**不能调用模型**（会直接提示补一把 `sk-`）。

访问令牌：后台「个人设置 → 安全设置」；API 密钥：后台「令牌」新建，`sk-` 开头。

### 控制台删了 Key？

下次请求 401 时插件会用访问令牌自动重签一把同名 Key 并写回 Magpie，不需要重新授权；访问令牌也失效才需要重登。

### 想换一把 Key？

插件页打开 KunRouter，点「重新登录」，选「手动填写 / 更换访问令牌 + API 密钥」，把两把钥匙粘贴进去即可。重新登录会覆盖原来那条记录，不会多出 `kunrouter#xxxxxx` 账号，也不用先登出。

```sh
magpie plugin login kunrouter
```

只想换 `sk-`、不想再填访问令牌：在控制台删掉旧 Key，下次请求 401 时插件会自动重签一把同名 Key 并写回 Magpie。

## 选项

| 选项 | 默认 | 干什么 |
| --- | --- | --- |
| `direct_api` | 开 | 模型请求走 `direct.wcnmb.fun`，绕开 Cloudflare 的 100 秒上限；关掉走 `wcnmb.si/v1` |
| `period_window` | 开 | 显示全部订阅额度和滚动窗口；关掉隐藏辅助明细，仍保留当前参与路由的额度 |
| `registration_entry` | 开 | 登录页显示注册入口；邀请码不可用时自动隐藏，关掉完全不提注册 |

改完选项要重载插件，`config` 里的供应商地址才会跟着变。

## 显示什么

- **钱包**：`/api/user/self` 的 `quota`，按 `/api/status` 的 `quota_per_unit` 换算，单位跟随站点币种（本站 🥚）。用户级 `used_quota` 不再标成钱包专属消费。
- **订阅额度**：`/api/subscription/self` 里的套餐总额、已用、剩余和到期时间；Lite 等套餐的日/周/月滚动窗口也会分别显示为进度条。
- **计费优先级**：非默认优先级会跟在顶部套餐名后，不再单独占一行。
- **分组**：优先按已知 Key ID 读取，否则分页按遮罩匹配；读不到退回标注的授权快照或账号默认组。
- **签到**：站点开着 `checkin_enabled` 时每日自动签到。
- **模型**：从 `/v1/models` 拉，失败保留宿主旧列表并标记 fallback；没有旧列表时使用内置占位模型。

路由按站点的 `billing_preference` 选择钱包或可用订阅：同一订阅的窗口同时约束，多个订阅择可用者。“仅订阅”不被零钱包阻断，“仅钱包”不受订阅窗口限制；订阅优先时，只要存在禁止钱包兜底的有效套餐，就遵循该限制。其余额度作为明细展示，不参与宿主的 AND 判断。

模型发现返回完整能力信息，Codex 可据此显示推理强度选择。优先使用接口的 `supported_reasoning_levels` / `reasoning_levels`；GPT-5、GPT-6 系列别名未提供档位时使用 `low`、`medium`、`high`、`xhigh`，接口明确声明不支持推理时不提供档位。实际支持范围仍由上游决定。

每次宿主调用模型发现都会重新请求列表，并遵循「走直连域名」选项。Magpie 可能先显示持久缓存，何时再次调用发现由宿主控制；插件自身无法保证每次打开供应商面板都立即刷新。需要立即更新时使用「重新获取模型」。

用量读取并行开始，共享 10 秒预算并响应宿主取消；套餐名称、分组等辅助信息失败会独立降级。403 权限不足不会直接标记账号过期；签到关闭时不发送签到请求。浏览器授权启动和兑换各有 10 秒网络超时，整个授权最多等待 5 分钟，取消或超时后释放本地回调端口。

## 域名

- `https://wcnmb.si`、`https://wcnmb.fun`、`https://kuncode.120403.xyz` —— 三个可用的控制台与授权入口。
- `https://wcnmb.si/api` —— 插件默认的控制台和管理接口。
- `https://direct.wcnmb.fun/v1`、`https://direct.wcnmb.si/v1` —— 模型 API 直连端点，不提供登录页。

登录时会直接显示三个浏览器入口，用户不用猜当前控制台对应哪个域名：

- `浏览器登录（推荐） · wcnmb.fun`
- `浏览器登录 · wcnmb.si`
- `浏览器登录 · kuncode.120403.xyz`

不设置环境变量时，`wcnmb.fun` 排在第一位，即使服务端 `ServerAddress` 当前配置为 `https://kuncode.120403.xyz`。本地回调始终是 `http://127.0.0.1:随机端口/callback`，不会使用任何公网域名。

`KUNROUTER_AUTH_ORIGIN` 可以调整哪个入口排在第一位；另外两个入口仍会保留：

```sh
KUNROUTER_AUTH_ORIGIN=https://wcnmb.si magpie plugin login kunrouter
```

插件会保留服务端签发的 `flow`，只把 `/desktop/authorize` 的域名换为用户选中的入口。该配置只接受上述三个纯 HTTPS 源地址之一；`direct.*` 不会作为授权入口。一次授权只使用一个固定域名，不在域名间轮询或中途切换，避免 Cookie、Passkey 和登录态不一致。

直连域名网络层挂了会自动回退一次主站 `/v1`。三个公网控制台需要保持同一套登录会话和授权前端；Passkey 站点范围由服务端的 `passkey_rp_ids` 管理。

## 本地联调

```sh
KUNROUTER_SITE=http://localhost:3000 \
KUNROUTER_API=http://localhost:3000 \
magpie plugin login kunrouter
```

后端 `ServerAddress` 要设成同一个 `http://localhost:3000`，否则授权回调会回正式域名；`magpie quota kunrouter` 也要带同样的环境变量。

## 已知边界

- 只有单一 provider id `kunrouter`，一台机器保留一个账号；重新登录会覆盖它。
- 浏览器授权签发的凭据默认 30 天有效，重新授权会轮换两把凭据并按新分组重签。
- 令牌失效时 `usage` 带 `signIn: "expired"`，magpie 会标出来让你重登。
- 模型能力优先读取接口提供的上下文、输出、模态、工具和推理字段，再保留宿主已有值；均未提供时沿用 128k 上下文 / 8k 输出等兼容默认值。
- 首次打开时的模型列表刷新由 Magpie 调度，宿主层问题追踪见 [#21](https://github.com/MY-Final/opencode-kunrouter-auth/issues/21)。
- 流式响应及其 token、缓存 token、工具调用和费用字段原样透传；实际消费统计与价格换算由 Magpie 和上游负责。

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md)。
