# magpie-codebuddy-import

给 [magpie](https://github.com/yetone/magpie) 用的 **CodeBuddy / WorkBuddy** 供应商插件。
在社区插件 [`@magpie-community/opencode-workbuddy-auth`](https://github.com/magpie-community/plugins)
之上补了三件它没有的事：

| 能力 | 说明 |
| :-- | :-- |
| 导入账号 JSON | 把 [workbuddy-switch](https://github.com/changexbc/workbuddy-switch) 导出的账号直接变成 magpie 登录，整份文件粘一次全导入 |
| 导出账号 JSON | 反过来：把 magpie 里的账号导成 workbuddy-switch 的格式，换机器、做备份用 |
| 今日已用积分 | 上游只报「一周期累计已用」，magpie 的按天用量靠两次读数相减，被 WorkBuddy 的滚动包打回原形；这里补 WorkBuddy 自己请求流水的真数 |
| 每日签到 | 上游没有 `auth.checkin`，这里补上；magpie 每个北京日替每个账号签一次 |
| 派猫猫旅行 | 国内版成长中心的活动，派发 5 小时一轮、领奖 45 分钟一轮，默认关；也能随时手动跑一轮 |

界面显示 **CodeBuddy / CodeBuddy AI**，provider id 是 `codebuddy` / `codebuddy-ai`
（上游登记的是 workbuddy 系，这里改了 id 并把旧账号自动迁移过来），所以模型 id 是
`codebuddy/glm-5.3`、`codebuddy-ai/...`。

## 快速上手

```sh
# 1. 装（npm 上的版本，和 github: 二选一）
magpie plugin add magpie-codebuddy-import
# 或者跟着仓库走最新提交：
magpie plugin add github:ayuayue/magpie-codebuddy-import

# 2. 重启 magpie（插件改动都要重启才生效）

# 3. 导入账号（二选一）
node scripts/import.mjs "C:\path\to\wb-switch-accounts.json"   # 命令行，推荐
# 或者界面：Providers → 添加账号 → CodeBuddy：导入账号 JSON → 粘 JSON 或 file:路径

# 4. 看结果
magpie accounts codebuddy
magpie accounts codebuddy-ai
```

装完 `magpie plugin list` 应该看到：

```
github:ayuayue/magpie-codebuddy-import (magpie-codebuddy-import 0.1.0)  on
  codebuddy-ai (CodeBuddy AI, 26 models)  signed in as you@example.com
  codebuddy (CodeBuddy, 19 models)  signed in as 你的账号
```

## 一、导入账号

### 界面

Providers → 添加账号 → 选「CodeBuddy：导入账号 JSON」：

```
How do you sign in to CodeBuddy?
  1. CodeBuddy account (browser)
  2. CodeBuddy desktop's sign-in
  3. CodeBuddy API key
  4. CodeBuddy：导入账号 JSON   ← 选这个
```

弹窗标题仍是「在浏览器里完成登录」、输入框标着「验证码」——**这是 magpie 对 code 类
登录方式的通用文案，不用浏览器**，把 JSON 粘进去点「登录」即可。整份导出文件一次
就能导完：属于当前档位的账号由 magpie 保存，另一个档位的账号也一并写进 magpie。
账号多时用 `file:` 路径代替粘贴：

```text
file:C:\path\to\wb-switch-accounts.json
```

### 命令行

```sh
node scripts/import.mjs "C:\path\to\wb-switch-accounts.json"
node scripts/import.mjs          # 不带参数：自动找 Downloads / 桌面里最新的 wb-switch-accounts*.json
```

也可以双击 `导入账号.cmd`，或把 json 拖到它上面。脚本只是替你调
`magpie plugin login`，和界面是同一条路。

已导入过的 uid 会跳过，同一份文件反复导入不会变成两份。

### 导出（备份 / 迁移）

```sh
node scripts/export.mjs           # 写到 Downloads/wb-switch-accounts-<日期>.json
node scripts/export.mjs 备份.json  # 写到指定文件
node scripts/export.mjs -         # 打到标准输出，自己接管道
```

导出的就是下面那份 JSON 格式，**能原样再导入**：换台机器 `node scripts/import.mjs` 就搬过去了。
默认文件名是 `wb-switch-accounts-*.json`，正好是 `import.mjs` 不带参数时会去找的那种，导完直接导回。

只导 `codebuddy` / `codebuddy-ai` 下的 oauth 账号：API key 那种没有 access/refresh，
导出去也不是一个能登录的号；别的供应商（qoder、minimax…）不碰。

> 文件里有 access / refresh token，等于账号本身，别发群里、别传网盘。

### JSON 格式

一个数组，每个元素一个账号；单个对象也行。完整示例见
[`accounts.template.json`](accounts.template.json)。

| 字段 | 必填 | 说明 |
| :-- | :-- | :-- |
| `access_token` | 是 | 也认 `accessToken`、`auth_raw.auth.accessToken` |
| `refresh_token` | 建议 | 没有就只能在 access token 过期前用 |
| `uid` | 建议 | 请求头 `X-User-Id` 用它，magpie 也靠它判重 |
| `variant` | 否 | `cn` / `ai`（`global`、`intl` 也认）；缺省按 `domain` 判断 |
| `domain` | 否 | 国内 `www.codebuddy.cn`，国际 `www.workbuddy.ai` |
| `nickname` / `email` | 否 | 账号显示名，缺省用 uid |
| `expiresAt` / `refreshExpiresAt` | 否 | 毫秒时间戳 |
| `enterpriseId` | 否 | 企业版才需要 |
| `token_type` | 否 | 默认 `Bearer` |

workbuddy-switch 导出的记录原样就能用。**加密的 token 导不进来**：WorkBuddy 5.6 起
桌面端把 token 存成 `{"$wbEncrypted": 1, ...}`，只有 App 自己解得开，遇到会明确报错，
请改用「CodeBuddy account (browser)」重新授权。

## 二、多账号与自动轮换

多个账号导入后，magpie 会按「第一个用着、用完换下一个」调度（Providers 里 `●` 是
当前用的，`○` 是额度用完接班的）。想让某个 agent 在多个模型之间轮换，建一个路由组：

```sh
magpie group add codebuddy models=codebuddy/hy3,codebuddy/glm-5.3,codebuddy/deepseek-v4.1-flash
magpie codebuddy group/codebuddy      # 让 CodeBuddy Code 用这个组
```

> 注意：改 provider id 之前建的路由组会失效（组里还是 `workbuddy/...`，请求会报
> `404 unknown model`），重建一次即可。

## 三、今日已用积分

账号卡片在原来的 `Credits`（一周期累计）下面多一行「今日」，比如：

```
Credits   3954.64 / 4528
今日      141.98 积分 · 10 次请求
```

为什么需要它：magpie 的「今天 / 近 7 天 / 近 30 天」没有别的来源，只能把供应商报的
**累计已用**在相邻两次读数之间相减，差值为负就当周期重开、这一段不计。WorkBuddy 的
积分不是一个整包，而是几十个各自滚动 30 天的包（实测一个账号 69 个、每包 50 分，
发放时间散布在全天），包一过期累计值就倒退一截，于是当天经常显示 0，或把昨天的量
记到今天。实测 2026-10-28：某账号真实 551.95 分，magpie 一条没记到；另一个真实
83.68 分只记到 5.22 分。

「今日」这行走 WorkBuddy 自己的请求流水 `/billing/meter/get-user-request-usage`，
按北京日聚合，**从它家 App/IDE 发的请求也算在内**，不只走 magpie 这条路。显示成
`0 积分 · 7 次请求` 时意思是「用了，但这些模型不要积分」（x0.00 的免费模型），
不是没数据；`今天还没有请求` 才是当天确实一笔没发。

两个已知边界：

- 只查当天，不一次查一周。范围查询会把跨午夜的行重分到两边（同一账号逐日查
  10-28 得 71.99/48 笔、10-29 得 141.98/10 笔，一次查 10-23~10-29 却报 10-28
  198.86/44 笔、10-29 11.07/8 笔），逐日查两边才对得上。
- 一天超过 2000 笔时只数到前 2000 笔，行首标 `≥`。
- 这一行纯展示（不给 `used` / `amount` / `limit`），magpie 既不会拿它去做按天差分，
  路由也不拿它当剩余额度；进度条和接班判断还是照原来的一周期窗口走。

## 四、每日签到

magpie 每个北京日替**每个**登录账号签一次（不是只签第一个）。手动：

```sh
magpie accounts checkin
```

界面上开关只画在供应商**第一个**账号的卡片上（它是供应商级开关），其他账号的卡片
显示各自的签到结果。

签到的返回是 snake_case（`today_checked_in`、`streak_days`），已签的账号直接报
`done`，不会再去做一次注定被拒的领取；WorkBuddy 用 HTTP 400 + 通用码 10001 说
「今天已签到，请明天再来」时也算已签，不当成一天的失败挂在卡片上。每个答案都带
`until`（下一个北京零点），magpie 到点再问，不必到中午前反复追问。

部分账号 WorkBuddy 只认自家 App 发起的签到（缺设备令牌），这种情况会提示
「请在 WorkBuddy App 里签到」，不会无限重试；国际版没有签到活动时报「当前没有签到
活动」。

## 五、派猫猫旅行

国内版成长中心的活动。状态机：`idle` → 派出 → `traveling` → 到点 `arrived` → 领奖。
插件在后台跑两条循环：**领奖 45 分钟一轮**、**派发 5 小时一轮**。

节奏是故意放慢的：workbuddy-switch 的 15/30 分钟是「客户端」的频率，脚本照抄、还卡着
整点跑，最容易被认出来。这里每轮在基准的 60%–140% 之间随机，**北京时间 01:00–08:00
完全不发请求**，启动后也先等 3–10 分钟再跑第一轮。一个账号一天本来就只派一次，拉长
间隔损失不了多少，省掉的是每天近百次查状态。

**开关默认关**，三种打开方式（满足其一）：

```sh
node scripts/travel.mjs on     # 等价于界面开关，改完下一轮就生效
```

- 界面：Providers 页 → **展开 CodeBuddy 那一行** → 面板靠下「自动派猫猫旅行」。
  开关挂在供应商上，所以配了路由组时要去供应商那一行找，不在 agent 面板里。
- 文件：在 magpie 配置目录放一个名为 `travel-on` 的空文件
  （`~/.config/magpie/travel-on`），删掉即关。
- 命令：`node scripts/travel.mjs on` / `off`。

查看进度：

```sh
node scripts/travel.mjs status   # 开关状态 + 每个账号今天派了没、领了多少、跳过原因
node scripts/travel.mjs run      # 立刻跑一轮（派发 + 领奖），不看开关
```

### 只想手动跑一次

默认关，平时不自动跑；要用的时候跑一轮就行。`run` 不看开关，派发和领奖都走一遍，
已经收工的账号连状态都不查（零请求）。装进 magpie 之后脚本藏在插件目录里：

```sh
node ~/.config/magpie/plugins/node_modules/magpie-codebuddy-import/scripts/travel.mjs run
```

在仓库目录里就是 `node scripts/travel.mjs run`。输出逐条打印派出/领奖，最后摊开
当天每个账号的状态：

```
手动跑一轮（派发 + 领奖，不看开关），4 个账号：
  派出 caoayu 西湖
  领奖 鱼 +10
本轮动作 2 个

今天 2026-10-29
  caoayu  已派出→西湖 · 旅行中
  鱼  已领奖 +10 · 今日收工（今天次数用完）
```

细节：

- 只跑 `codebuddy`（国内版），国际版没有成长中心
- 按北京日重置；`daily_limit_reached`（今天次数用完）当天收工
- token 过期或 401 只跳过本轮，**不碰 refresh token**（刷新交给 magpie，避免两边
  同时刷新把 token 用废）
- 状态记在 `~/.config/magpie/travel-state.json`，含每账号状态和最近 200 条日志

## 六、常见问题

**界面里找不到旅行开关** —— 它不在 Providers 列表里，要展开 CodeBuddy 那一行；
或者直接用 `node scripts/travel.mjs on`。

**搜不到这个插件** —— 在 Discover 里搜 `codebuddy` 或 `magpie-codebuddy-import`，
「Unofficial」那一栏里；也可以直接 `magpie plugin add magpie-codebuddy-import`。

**用着用着断了 / 本轮没有输出（stopReason=refusal）** —— 先看
`magpie usage --csv --last 1h`：`status` 是 200 说明网关正常返回了，问题在上游拒答
（WorkBuddy 对不认识的客户端或 system 提示词会回 "Illegal API invocation from an
unapproved channel"）或 agent 自己；换个模型（`magpie codebuddy codebuddy/hy3`）再试
可以快速区分。

**改了插件代码不生效** —— 本地仓库和 magpie 里装的那份是两个位置（`~/.config/magpie/plugins/node_modules/`）。
改完要发版（`npm version patch && npm publish`）再 `magpie plugin rm` + `add` 重装；
只调代码用 `magpie plugin add "<本地目录>"`。

## 更新 / 卸载

```sh
magpie plugin update                                    # 有新版会提示
magpie plugin rm magpie-codebuddy-import                # 卸载（账号保留）

# update 说「已是最新」但版本没动时（bun 的 lockfile 会钉住旧版），重装一次
magpie plugin rm magpie-codebuddy-import && magpie plugin add magpie-codebuddy-import
```

要连账号一起清掉，卸载前先 `magpie plugin logout codebuddy` / `codebuddy-ai`。

## 和市场里的 workbuddy 插件共存

两边 id 不同（这里 `codebuddy`，市场版 `workbuddy`），可以同时装、互不接管，
但账号各存各的、不互通。想让本插件接管某个 provider：
`magpie plugin use github:ayuayue/magpie-codebuddy-import codebuddy`。

## 开发

```sh
node --test test/import.test.mjs test/usage.test.mjs test/export.test.mjs test/travel.test.mjs    # 34 个用例
```

- `index.mjs` 插件入口：id 改名、开关、签到、用量补按日真数、旅行循环的挂载
- `lib/accounts.mjs` 账号解析、写 `plugin-auth.json`、导出、旧 id 迁移
- `lib/usage.mjs` 按北京日聚合 WorkBuddy 的请求流水（今日积分）、billing 接口的请求头
- `lib/travel.mjs` 派猫猫旅行
- `vendor/opencode-workbuddy-auth.mjs` 上游副本（MIT，见 `vendor/LICENSE`），
  更新：`curl -sL https://raw.githubusercontent.com/magpie-community/plugins/HEAD/packages/workbuddy/index.mjs -o vendor/opencode-workbuddy-auth.mjs`

## 许可

MIT。内嵌的上游插件也是 MIT。
