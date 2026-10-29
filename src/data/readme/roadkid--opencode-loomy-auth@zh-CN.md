# @roadkid/opencode-loomy-auth

[English](../README.md) | 中文

一个面向 Loomy（讯飞）账号的 [OpenCode](https://opencode.ai) / [magpie](https://usemagpie.ai)
provider 插件。用 Loomy 的手机验证码登录，对话经 Loomy 的 OpenAI 兼容模型网关转发，
积分——永久余额与每日赠送两个钱包——以及续满每日赠送的每日 first-login 刷新
都会落到用量卡上。

| Provider id | 登录方式 | 上游主机 |
|---|---|---|
| `loomy` | 手机验证码（+86） | `loomyad.xunfei.cn`（账号平面 `account.xfinfr.com`） |

本包导出 `LoomyAuthPlugin`（`loomy`）。

## 安装

```sh
magpie plugin add github:road-kid/opencode-loomy-auth    # 本仓库
magpie plugin add @roadkid/opencode-loomy-auth  # npm 包名
magpie plugin add .                                      # 本地目录——不经 npm、不经 GitHub
magpie plugin login loomy      # 手机验证码登录
magpie provider test loomy     # 每个 API 发一条小请求，检查链路
magpie quota                   # 积分卡片
```

同一个包也能在 OpenCode 里加载（`opencode.json` 的 `"plugin"` 数组，
然后 `opencode auth login`）。magpie 把登录态存在 `plugin-auth.json`
（mode 600）；OpenCode 存在 `auth.json`。

## 登录

登录走 Loomy 的手机验证码流程，分两步：

- magpie 先收集手机号（中国大陆 11 位；校验前会清洗掉前缀 `+86`/`86`、
  空格与连字符）；
- 插件发送短信验证码（五分钟有效），magpie 弹出六位验证码输入框，
  插件拿验证码换会话。

会话有效期十四天，Loomy 没有续期接口。会话失效时（HTTP 401/403，或业务码
`020002`/`100002`），插件把登录态标记为过期，magpie 会要求重新短信登录——
没有别的路可走。账号 id 是掩码手机号（`138****8000`）；Loomy 的 userid
随凭据一并保存。

账号主机会对两个登录调用校验 HMAC-SHA1 签名。
签名只属于账号平面——网关平面从不签名。

## 请求

对话是 OpenAI Chat（`@ai-sdk/openai-compatible`），发往
`https://loomyad.xunfei.cn/api/v1/chat/completions`，请求体原样透传。
会话 token 放进网关读取的两个头——`token:` 与 `Authorization: Bearer`，
即客户端自己的双写。

积分为零或额度用尽的拒绝（文案带出这层意思的 402、403 或 429）会改写成
429 `rate_limit_error`，magpie 由此把对话切到另一个账号。其余任何
401/403 都是登录态的终点。

## 模型

登录后，模型清单实时读取自 `GET /api/v1/models`：capabilities 变成
工具 / 思考 / 图片位，上下文与输出上限原样透传，每个模型都带
low/medium/high 三档 reasoning-effort 变体。网关把积分倍率拼在展示名尾部
（`MiniMax M3 （x4.0）`——半角全角括号都出现）；插件把后缀拆下来，
不混进名字。上游自己声明免费的模型——名字里带「免费」二字，或倍率恰为零——
带 `free` 位；完全没有倍率的不算免费。不是 chat 模型的行（生图模型就
这么声明）不会出现在清单里：选它就是选一个失败。

实时清单是唯一事实来源，一应答即生效。没有会话、应答为空或请求失败时，
插件回落到代码里的内置表——2026-10-28 同一份目录文本模型的快照，
只随网关目录自身的变迁而过期。下表是网关当天实际返回的目录，
留在这里作实地参考：

| 模型 | 展示名 | 倍率 | 备注 |
|---|---|---|---|
| `spark-x2.6` | Spark-X2.6 正式版(限时免费) | x0.0 | 思考 |
| `spark-x` | Spark-X2.5（限时免费） | x0.0 | 思考 |
| `DeepSeek-V4.1-Flash` | DeepSeek V4.1 Flash | x2.0 | 思考，图片 |
| `MiniMax-M3` | MiniMax M3 | x4.0 | 思考，图片 |
| `Kimi-k2.6` | Kimi k2.6 | x6.5 | 思考，图片 |
| `qwen-3.8-max` | Qwen 3.8 Max | x12.0 | 思考 |
| `GLM-5.3-Flash` | GLM 5.3 Flash | x0.8 | 思考，图片 |
| `qwen3.8-flash` | qwen 3.8 flash | x0.8 | 思考，图片 |
| `mimo-v2.5` | MiMo V2.5 | x3.3 | 思考，图片，音频 |
| `auto` | 自动 · 均衡 | — | 网关自带的路由 |
| `Hy-Image-3.5-preview` | Hy image 3.5 preview | — | 生图 |
| `doubao-seedream-5-lite` | Doubao seedream 5 lite | — | 生图 |
| `qwen-image-3.0-pro` | qwen image 3.0 pro | — | 生图 |

三个生图行声明了 `output_modalities: ["image"]`——它们画图而不是用文字
回答，其应答如何走 chat 端点尚未验证。

## 用量

用量卡展示 Loomy 的两个钱包：

- 余额行：永久 + 每日赠送相加（应答自带总额时用它的）；
- 每日赠送窗口：赠送的已消耗份额作为百分比，旁边是限额内还剩多少。
  `dailyBalance` 是赠送的*剩余*（`dailyQuota` − `dailyConsumed`），所以
  百分比需要赠送的额度：应答自带那对字段时用它的，否则用签到按账号记下的
  `dailyQuota`——笔记存在凭据本身上（宿主自己的存储，插件升级也带着；
  宿主没有这种存储时由插件旁的小文件顶上）。卡片在任何地方都找不到笔记时，
  会自己去问 first-login 的应答——只问一次，该调用按天幂等（客户端本来
  每次登录都调它）——所以新装插件在第一次渲染就自愈，不必等下一次签到；
  不发明份额，不假设额度。窗口带着周期的精确重置时刻——签到应答所标注
  那个日的下一个北京零点——卡片因此倒数到真实的续满，而不是猜出来的时刻；
- 永久行摆在旁边：永久余额，没有窗口可消耗；
- 新手行随行：一次性新手任务（共 10000 积分）还有未领时显示——一个
  aside，绝不是百分比：一次花完的钱包没有窗口可消耗。签到领取它们；
  签到跑过之前，这一行说的是还能领多少。

Loomy 没有专门的余额或签到端点：摘要搭在 points-records 调用上，
「签到」就是 Loomy 客户端每次登录都会调的 first-login。服务端每天把
每日赠送续满一次，应答的 `alreadyProcessed` 区分当天的续满与重复：重复
报 *done*（「今日已刷新」，附赠送还剩多少），当天第一次报 *claimed*——
应答带着完整算式（`dailyQuota` − `dailyConsumed`）时把获得量作为 credit，
否则在消息里报剩余。

## 签到

每日自动运行是 magpie 的，不是插件的：**Daily check-in** 开关在
Settings → Usage → Plugins，随 **magpie ≥ v0.1.1083** 提供，**默认关闭**——
打开后 magpie 每天每账号运行一次刷新（只有失败的结果当天会重试）。
**Check in now** 按钮当场运行一次。OpenCode 不调用这个钩子。

同一次运行还会领取一次性新手任务（八个，共 10000 积分）：串行、分值高的
先领、幂等——其中任何一项被拒绝都不碰每日签到自己的结果。新账号的第一次
签到通常一次同时完成赠送续满与新手钱包入账。

## 已知限制

- **会话十四天，没有续期。** 失效后唯一的路是重新短信登录。
- **积分倍率只存在于展示名后缀。** Loomy 不提供结构化倍率字段；插件把
  后缀拆下来，但无法对目录核验任何数额。
- **图片输入因模型家族而异。** 在早前目录的 `deepseek-v4-flash-0731`
  （已下架）上验证过：它只认网关私有的 `<image_base64>…</image_base64>`
  标记（标准 `image_url` 会被当文本截断），GLM 系相反——只认
  `image_url`，喂标记反而坏。改写是计划中的第二迭代；落地之前，图片输入
  只有 GLM 家族可靠，而较新的 `DeepSeek-V4.1-Flash` 声明了图片输入，
  其形态在此网关上未经验证。
- **`reasoning_effort` 在非思考模型上被忽略。** 每个模型都像客户端那样
  挂着 low/medium/high 变体；上游对不思考的模型丢弃该字段——已知行为。
  哪些模型思考以实时目录声明为准——2026-10-28 当天大多数文本模型都声明了，
  不只 spark 两个。
- **流式工具调用尚未在真实账号上验证。** 桌面网关的 tool_calls 流式
  没有真机运行的记录在案；这是你的 agent 工具循环第一件要验的事。
  如果失败，toolcall 位会在未来的版本里关掉。
- **新手任务由签到领取。** 八个一次性任务（共 10000 积分）在每次签到时
  查询并领取——串行、分值高的先领、幂等：重复应答 `alreadyCompleted`，
  不会重复到账。其中任何一项被拒绝都不碰每日签到自己的结果，还有未领时
  它们的可领总额以 aside 行显示在卡片上。完成与否由上游自行判定；key
  与分值是客户端自己的任务注册表的。

## 免责声明

这是一个非官方的社区包。与讯飞或 Loomy 没有任何关系。实现逆向自桌面
客户端自身的行为并与之对照实测，仅用于个人学习与研究。你的手机号、验证码
与会话只发往 Loomy 自己的主机。积分用于 Loomy 自己的服务；积分还能用在哪
由 Loomy 的条款决定，讯飞并未批准其他用法。账号的风险由你自担。上游协议
变更随时可能使本包失效。

## 开发

```sh
node --test                       # 单元测试（node:test，本地假上游，无网络）
node scripts/check.node.mjs      # 形状校验，与社区 CI 同一套逻辑
```

插件本体是单个 `index.mjs`，零运行时依赖——只有 `node:crypto` 和标准
`fetch`——Bun 与 Node ≥ 20.11 都能加载。
