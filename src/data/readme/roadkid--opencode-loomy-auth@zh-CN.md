# @roadkid/opencode-loomy-auth

[English](../README.md) | 中文

一个面向 Loomy（讯飞）账号的 [OpenCode](https://opencode.ai) / [magpie](https://usemagpie.ai)
provider 插件。用 Loomy 的手机验证码登录，对话经 Loomy 的 OpenAI 兼容模型网关转发，
积分——永久余额与每日赠送两个钱包——以及续满每日赠送的每日 first-login 刷新
都会落到用量卡上。

| Provider id | 登录方式 | 上游主机 |
|---|---|---|
| `loomy` | 手机验证码（+86） | `loomyad.xunfei.cn`（账号平面 `account.xfinfr.com`） |

本包导出 `LoomyAuthPlugin`（`loomy`）供 magpie 与 OpenCode v1 读取；从 0.2.0
起另有面向 OpenCode ≥ 2.x 的默认导出（`{ id: "loomy-auth", setup, server }`）
——其中 `server` 就是同一个 V1 工厂，供读取对象式入口的宿主调用（magpie
自己的加载器即属此类）。一个包，各种宿主。

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
然后 `opencode auth login`）；OpenCode ≥ 2.x 走另一条安装路径——见下文
[OpenCode v2](#opencode-v2)。magpie 把登录态存在 `plugin-auth.json`
（mode 600）；OpenCode 存在 `auth.json`。

## OpenCode v2

从 0.2.0 起，本包以默认导出插件（`{ id: "loomy-auth", setup, server }`）的
形态在 OpenCode ≥ 2.x 中加载，与 magpie 和 OpenCode v1 读取的命名导出并存
（magpie 新版加载器读的 `server` 也在同一个默认导出里）。
同一份代码，同一种登录，同一个网关。

### 安装

三种方式，任选其一：

- `opencode.json(c)` 的 `plugins` 键填 npm 包名：
  `"plugins": ["@roadkid/opencode-loomy-auth"]`；
- 同一个键填本地目录：`"plugins": ["E:/path/to/opencode-loomy-auth"]`——
  路径必须是目录，文件路径会被跳过；
- 或把目录直接放进 `~/.config/opencode/plugins/`（全局）或
  `.opencode/plugins/`（项目级）——OpenCode 会自行发现，文件改动热重载。

### 登录

`opencode auth login`（或 TUI 里的 `/connect`）→ 选择 Loomy 集成 →
手机验证码方式 → 输入 11 位手机号 → 收到短信（6 位验证码，5 分钟有效）→
输入验证码 → 完成。会话有效期十四天，没有续期——到期重新登录即可。
桌面版 OpenCode 的账号连接界面用的是同一套服务端 API。

### 模型

登录后 `loomy` provider 自动出现；在那之前它不显示——隐藏正是设计，
防的就是死模型。模型清单实时读取自网关的 `/api/v1/models`，登录状态
变化时自动刷新；网关不可达时回落到内置的 2026-10-28 快照（仅聊天
模型）。网关调用上的 Bearer 认证由宿主自动注入。模型行用各厂商官方
拼写的展示名（名字表不认识的模型保留清洗后的网关名，仅把开头的
品牌词纠正为官方拼写），reasoning 档位取各厂商官方文档真实枚举与
网关每行 `reasoning_efforts` 声明的交集（网关给每个思考模型都声明
同样的五档，但厂商官方页面另有说法：DeepSeek 的 medium/xhigh 是
high 的别名、Qwen 的 high 是 xhigh 的别名、Kimi K2.6 根本没有
effort 参数——只有 none 的关思考是真的）。picker 的 Default 不发
字段，落到网关自己的默认档。

### 积分面板与每日续满

输入 `/loomy`（或在命令面板找「Loomy 积分面板」）唤出一个小面板：登录
状态、积分总额、每日赠送的剩余/总量与北京时间重置时刻，旁边两个动作——
**立即签到**（与「立即签到」按钮同一个 first-login 调用、同一套结果
文案）与**刷新**。每日续满也会在后台自己跑：加载时、每个凭据事件之后、
以及每半小时一次的定时器，静默发出同一次每日签到——成功按北京日记下，
失败就等下一个事件或下一轮再试。桌面版 OpenCode 在自己的窗口里带着
同一个面板——入口在侧边面板启动器，走包里 `./gui-experimental` 的桌面
GUI 入口；这个名字里的 experimental 是上游的原话：GUI 插件 API 尚属
实验性，可能随桌面版更迭变动。

### magpie 专属的部分

用量卡片、签到开关与生图模型花名册挂在 magpie 自己的宿主扩展钩子上
——这些仍是 magpie 专属，而上面的 `/loomy` 面板把积分数字带到了 v2
TUI 里。v2 侧的插件是手机验证码登录、实时模型清单、网关对话，以及
面板。

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
（`MiniMax M3 （x4.0）`——半角全角括号都出现）；插件把后缀拆下来——
名字保持干净，倍率挂到模型记录上，宿主选择器读的正是这个字段。
上游自己声明免费的模型——名字里带「免费」二字，或倍率恰为零——
带 `free` 位；完全没有倍率的不算免费。不是 chat 模型的行不会进聊天
清单：生图模型在 `type` 里就这么声明，而且 id 和名字带着生图模型的
字眼——与宿主自己的图像模型目录同一套词，所以连完全不带 `type` 的行
也照排不误：跟它聊天就是一次失败。

生图模型由插件自己的花名册放回清单旁边——插件为下面三个背书，各自用
花名册给的展示名，线上行自己的事实（上下文与输出上限、能力位）随行。
一条目只在实时目录还认它 id 的时候在表里：Loomy 下架某个生图模型，
下一次应答它就消失，不需要发版；Loomy 新增的，则等把它写进花名册的
那一版。兜底表里没有生图条目——没有实时应答就无法证明它还在，
而「失效了还挂着入口」正是花名册要防的事。宿主侧，列进清单的生图
模型在 id 命中宿主自己的图像模型词表时（`qwen-image`、`seedream`……
`Hy-Image` 不在其列）会进提供方的「图像模型」行；在宿主学会把插件的
生图模型挪出聊天清单之前（yetone/magpie#2792），它们也会以 chip 的
形式留在模型列表里：不勾选即可，没有 agent 会跟它们对话。

实时清单是唯一事实来源，一应答即生效。没有会话、应答为空或请求失败时，
插件回落到代码里的内置表——2026-10-28 同一份目录文本模型的快照，
只随网关目录自身的变迁而过期；快照里的倍率与 free 位随表一并发回宿主，
请求失败也会如实标注，让编辑器知道这份清单是插件的默认表、不是账号的。
下表是网关当天实际返回的目录，
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
回答，其应答如何走 chat 端点尚未验证。旧版清单时代勾过的一行，如今
就是花名册的条目回来了，不再是「清单已不再认识的勾选」。

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
