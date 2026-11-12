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
| `period_window` | 开 | 显示订阅剩余额度和滚动窗口；关掉只看钱包 |
| `registration_entry` | 开 | 登录页显示注册入口；邀请码不可用时自动隐藏，关掉完全不提注册 |

改完选项要重载插件，`config` 里的供应商地址才会跟着变。

## 显示什么

- **钱包**：`/api/user/self` 的 `quota`，按 `/api/status` 的 `quota_per_unit` 换算，单位跟随站点币种（本站 🥚）。
- **订阅额度**：`/api/subscription/self` 里的套餐总额、已用、剩余和到期时间；Lite 等套餐的日/周/月滚动窗口也会分别显示为进度条。
- **计费优先级**：非默认优先级会跟在顶部套餐名后，不再单独占一行。
- **分组**：读 `/api/desktop/keys` 按 Key 遮罩匹配真实分组，读不到才退回授权时快照。
- **签到**：站点开着 `checkin_enabled` 时每日自动签到。
- **模型**：从 `/v1/models` 拉，拉不到退回内置占位模型。

站点相关 `/api` 请求都有 10 秒超时，网络卡住不会把额度卡和签到一起拖死。

## 域名

- `https://wcnmb.si/api` —— 控制台和管理接口
- `https://kuncode.120403.xyz/desktop/authorize` —— 浏览器授权页
- `https://direct.wcnmb.fun/v1` —— 直连模型请求，绕开 Cloudflare 100 秒上限

直连域名网络层挂了会自动回退一次主站 `wcnmb.si/v1`。授权地址只认 `wcnmb.si`、`wcnmb.fun`、`kuncode.120403.xyz` 及其子域下的 `/desktop/authorize`。

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
- 模型能力参数拿不到真实值，统一按 128k 上下文 / 8k 输出 / 支持工具调用填。

## 更新日志

见 [CHANGELOG.md](./CHANGELOG.md)。
