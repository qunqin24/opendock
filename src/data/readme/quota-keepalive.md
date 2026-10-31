<div align="center">

# quota-keepalive

面向 Magpie 全部已登录供应商的额度签到、真实对话保活、执行留痕和额度趋势页面。

[![License](https://img.shields.io/badge/License-MIT-3B82F6?style=for-the-badge)](./LICENSE)
[![npm](https://img.shields.io/npm/v/quota-keepalive?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/quota-keepalive)
[![Magpie](https://img.shields.io/badge/Magpie-Plugin-0EA5A4?style=for-the-badge)](https://github.com/sljdxde/quota-keepalive)
[![Unofficial](https://img.shields.io/badge/Status-Unofficial-F59E0B?style=for-the-badge)](#非官方插件声明)

中文 · [English](./README.en.md)

</div>

---

quota-keepalive 不接管任何供应商的登录，也不会把页面伪装成单一供应商专属功能。
登录、模型、额度和签到 Hook 仍由各供应商插件维护；本插件负责统一检测、调度、
执行和展示。

> **非官方插件声明**
>
> 本项目不是 Magpie 官方插件。签到优先调用供应商插件公开的签到接口；真实对话
> 保活不是供应商授权或保证支持的功能。保活请求通过本机已登录的供应商签名适配器
> 直接发往供应商，不经过第三方服务器，也不会导出令牌，因此降低了凭据泄露风险，
> 但不等于厂商风控风险为零。自动化合成消息仍可能被供应商识别为异常流量，并触发
> 限流、额度冻结、账号限制或封禁。默认关闭保活，仅在理解风险后按需启用，并由
> 使用者自行承担相关后果。

## 功能

- 一键检测 Magpie 当前已登录的供应商、账号、模型和额度窗口。
- 一键签到：通过各供应商登录插件公开的 `auth.checkin` 接口执行，尊重供应商、
  账号两级启停；页面会明确显示未适配或未登录的账号，不会静默跳过。
- 真实对话保活：通过各供应商自己的登录插件取得签名请求，发送一条真实消息。
  默认使用“真实活跃对话”，WorkBuddy CN 会按 dsh 实测语义填充约 25k 输入 token
  并消耗额度；只想做低成本连通性检查时才切换到“短探活”。
- 模型选择：只从该账号实际列出的模型中选择。默认优先近期真实保活成功过的模型，
  再按成功率、成功时间和失败次数排序；没有历史记录时沿用供应商自己的模型顺序，
  不再按免费或价格抢先选择。第一个模型不可用时自动换下一档，全部不可用才记失败。
- 自定义模型：页面里每个供应商都有可搜索的模型下拉框；选中模型会优先尝试，
  失败后仍会自动回退到该账号可用的其他模型。列表会显示倍率、免费状态和模型 ID。
- 定时任务：页面内可配置每 5 分钟到 7 天执行一次，任务可选“只签到”“只保活”
  或“签到 + 保活”。
- 执行记录：检测、签到、模型切换、保活、额度和失败都会写入 JSONL 诊断日志；
  页面“最近执行记录”只展示签到和保活任务，刷新额度不会挤占任务记录。点击记录
  可查看完整执行时间、账号明细和同一轮执行链路。单独账号触发、没有总任务总结
  锚点的保活记录也会显示，不会因为缺少汇总日志而被旧任务掩盖。
- 今日结果：供应商行分别汇总“签到 X/Y”和“保活 X/Y”，账号卡显示已签到、
  签到积分（如 `+100`）、已保活，以及设备受限、额度不足、待重试等具体原因。
  跳过项不再计入“需要处理”，只有明确失败才进入待处理数量。
- 近 5 天历史：每个有执行记录的账号可展开查看最近 5 天的签到、积分和保活结果。
- 额度视图：统一展示账号“可用 / 总计”额度窗口和余额变化，并由 Magpie 的额度历史
  提供趋势数据。供应商若只返回“已用 / 总量”展示值，只有在数值能相互核对时才换算，
  无法确认语义时保留原始展示，避免把“已用”误当成“可用”。
- 自动刷新额度：启用中的供应商每 1 分钟刷新一次，停用的供应商不刷新；顶部可刷新全部
  启用供应商，每个供应商卡片也可单独立即刷新。供应商没有可读取额度卡时记为跳过；
  Magpie 30 秒内已刷新过时使用缓存并记为跳过，只有网络、登录失效或空数据等真实
  异常才记为失败。
- 多账号支持：所有供应商账号逐个执行，同一账号同一北京时间日成功后不会重复发送。
- 账号级控制：每个账号的“签到/保活”开关只控制自动任务；旁边独立的“执行签到”
  “执行保活”按钮只对当前账号立即执行一次。手动保活必须二次确认，仍会遵守供应商
  整体启停，但可以单独执行一个已关闭自动任务的账号。

## 安装

npm 安装（推荐，支持 Magpie 自动检查更新）：

```sh
magpie plugin add quota-keepalive
```

安装后的插件规格会显示为 `quota-keepalive@latest`。Magpie 会在启动后和之后每小时
检查一次更新，并在插件页面提示新版本。更新方式：

```sh
# 更新全部 npm/git 插件
magpie plugin update

# 只更新这个插件
magpie plugin add quota-keepalive
```

页面中的 `Update all` 与 `magpie plugin update` 等价。重新添加同一个 npm 包会替换
旧版本，并保留插件 options、启用/停用状态和供应商偏好。已固定版本
`quota-keepalive@0.1.x` 也会在更新时升级到最新版并解除固定。

从 GitHub 安装（不经过 npm）：

```sh
magpie plugin add github:sljdxde/quota-keepalive
```

从本地目录安装（仅用于开发调试）：

```sh
magpie plugin add "$(pwd)"
```

目录安装会直接读取当前源码，适合修改后立即调试，但不会进入 npm 的版本检查，也不会
被 `magpie plugin update` 更新。开发完成后应切换到 npm 安装。切换前先保存 npm
条目中的 options，再停用目录条目：

```sh
magpie plugin add quota-keepalive
magpie plugin options quota-keepalive '<原来的 options JSON>'
magpie plugin off '<目录插件的 spec>'
magpie plugin rm '<目录插件的 spec>'
```

插件不需要接管 provider。供应商登录仍由 Magpie 已安装的对应社区插件提供；本插件
直接从 Magpie 的插件目录加载这些签名适配器，因此 Magpie 或供应商插件更新后，
只要其公开接口没有变化，本插件仍可继续使用。若供应商包改名为不兼容的接口，页面
会明确显示失败原因，不会静默跳过。

安装后在 Magpie 左侧 `Plugins` 分组打开“额度签到”。如果页面文件刚更新，
重新打开一次插件页即可刷新清单，不需要重启 Magpie。

### 发布新版本

仓库包含 `.github/workflows/publish.yml`，使用 npm Trusted Publishing，不需要把
npm token 写进仓库或 GitHub Secrets：

1. 更新 `package.json` 版本并提交改动。
2. 创建同名 Git tag，例如版本 `0.1.2` 对应 `v0.1.2`。
3. 推送 `main` 和 tag。
4. 在 GitHub 创建并发布对应的 Release。
5. Release 发布后，工作流会重新跑测试、语法检查和 `npm pack`，再通过 OIDC
   发布到 npm。
6. 本机等待 Magpie 的更新提示，或执行 `magpie plugin add quota-keepalive` /
   `magpie plugin update`。

本地手动发布时，npm 如果启用了双因素认证，需要附加当前动态码：

```sh
npm publish --access public --otp=<6 位动态码>
```

不要把动态码、npm token 或恢复码写进仓库、README 或聊天记录。

## 页面操作

- `一键检测`：刷新供应商、账号、模型和额度快照。
- `全部签到`：立即对所有具备签到能力的供应商执行签到。
- `发送保活`：确认真实请求后，为所有已登录且适配的供应商账号发送消息。
- 账号后的“签到/保活”开关：控制该账号是否参加自动任务，不会立即发送请求。
- 账号后的“执行签到/执行保活”：只对当前账号立即执行一次；执行保活会先弹出确认框。
- 连续切换多个开关时会合并成最后一次状态写入，并按 Magpie 的页面配置限频串行保存，
  不会因为快速连续点击触发“每秒只能写入一次”的报错。
- `刷新额度`按钮：立即刷新全部启用供应商额度；供应商卡片内的刷新按钮只刷新该供应商。
- `保存计划`：设置统一执行间隔和任务类型。计划默认关闭，防止无意间消耗积分。
- `真实活跃对话/短探活`：真实活跃对话按 `inputTokens` 填充请求，能增加上活跃记录
  的概率并可能消耗积分；短探活风险、耗时和额度消耗更低，但不保证供应商记录为一次对话。
- 定时计划保存或修改后，从下一个间隔开始执行；下次执行时间会持久化，Magpie 重启或
  电脑休眠后会补跑已经到期的任务。需要立即执行时使用页面顶部的手动按钮。

页面每 5 秒读取一次本地快照；插件后台每 1 分钟刷新启用中供应商的额度，停用项会
跳过。额度刷新仍写入后台诊断日志，但不会出现在页面的签到/保活执行记录中。
执行中的任务会显示在状态条中。快照生成时会一次
计算今日状态和近 5 天摘要，页面轮询只读取结果，不会在浏览器里重复聚合历史日志。
最近执行记录按任务折叠显示；点击任意记录可展开精确执行时间、耗时、供应商、账号
数量、执行 ID、完整说明，以及本次任务下每个账号的结果和积分。

## 模型可用性

保活不是“只选免费或最便宜”后盲目发送：

1. 从供应商模型和该账号的模型白名单取交集。
2. 读取近 5 天真实保活记录，优先该账号成功过的模型。
3. 账号没有记录时，优先该供应商其他账号成功过的模型；仍无记录则跟随供应商模型列表顺序。
4. 已知失败的模型排在未验证模型之后；单个账号最多尝试配置数量的候选模型。
5. 模型不存在、额度拒绝、上游不可用或空回复时切换下一个候选。
6. WorkBuddy CN 的真实活跃对话按 dsh 的 probe 语义发送约 25k 输入和 1 个输出 token。
   活动模式要求响应里出现模型正文，或 usage/credit/prompt token 证据；只有 `[DONE]`、
   空 200、JSON 业务错误、HTML 登录页和超时都不算成功。短探活仍保留低成本兼容模式，
   但不会声称已经留下真实活跃记录。

账号卡片会优先显示最近一次真实保活实际使用的模型（`实际模型`）；没有执行历史时，
依次显示用户指定的 `所选模型` 或自动排序出的 `自动首选`。供应商设置行也会汇总
最近实际使用的模型，日志会保留每次模型切换及失败原因。

展开供应商卡片后，可在“保活模型”输入框里搜索模型名或模型 ID。下拉列表默认包含
该供应商的全部可用模型，并显示免费状态、倍率和模型 ID；选中后点击“自动”可恢复
自动选择。实际请求仍只使用该账号模型白名单中的模型；选中项不可用时自动回退。

## 配置

页面保存的配置写入 Magpie 插件级 options。也可以用命令修改：

```sh
magpie plugin options quota-keepalive '{
  "scheduleEnabled": true,
  "scheduleMinutes": 60,
  "scheduleAction": "all",
  "modelPreferences": {
    "workbuddy": "deepseek-v4.1-flash",
    "codearts": "deepseek-v4.1-flash"
  },
  "modelCandidates": 4,
  "probeMode": "activity",
  "probeMessage": "Magpie daily connectivity check. Reply with OK.",
  "inputTokens": 25000,
  "maxAttempts": 3,
  "timeoutMs": 90000,
  "logMaxBytes": 2097152
}'
```

- `scheduleEnabled`：是否启用定时任务，默认 `false`。
- `scheduleMinutes`：统一执行间隔，默认 60 分钟，范围 5 分钟到 7 天。
- `scheduleAction`：`checkin`、`keepalive` 或 `all`，默认 `checkin`。
- `model`：可选的首选模型；不是白名单，候选仍会按可用性回退。
- `modelPreferences`：按供应商指定首选模型，例如
  `{"workbuddy":"deepseek-v4.1-flash","codearts":"deepseek-v4.1-flash"}`。未配置时
  WorkBuddy CN 默认优先 `deepseek-v4.1-flash`，这是 dsh 实测较稳定的真实对话模型；
  其他供应商按近 5 天可用性排序，没有成功记录时按供应商模型顺序选择，不按免费或倍率抢先选择。
- `modelCandidates`：每个账号每次最多尝试的模型数，默认 4，范围 1–12。
- `probeMode`：`activity`（默认）发送真实活跃对话，约 25k 输入；`short` 只发短消息；
  `context` 是旧版配置的兼容别名，行为与 `activity` 相同。
- `probeMessage`：短探活消息，最多 500 字符；留空时使用默认连通性检查文本。
- `inputTokens`：`activity`/`context` 模式的长输入规模，默认 25000，范围 1000–25000。
- `maxAttempts`：每个账号每个北京时间日最多保活尝试轮数，默认 3。
- `timeoutMs`：单个模型请求的整体截止时间，默认 90 秒，范围 10–180 秒。WorkBuddy
  CN 的 25k 输入请求可能先返回响应头、再继续流式读取；90 秒比 25 秒更接近 dsh 的
  probe 容忍度，同时仍避免任务无限挂起。即使供应商
  登录插件内部忽略中止信号，外层也会结束该候选并继续回退；账号较多时不要调得过大。
- `logMaxBytes`：单个日志上限，默认 2 MiB，超出后轮转一份 `.1`。
- `statePath`、`logPath`、`snapshotPath`、`commandPath`、`schedulePath`：可选绝对路径。

升级提示：旧版本如果已经显式保存过 `probeMode: "short"`，新版本会尊重这项用户设置，
不会静默改成 `activity`。需要点亮 WorkBuddy 活跃记录时，请在页面选择“真实活跃对话”
并保存计划，或者执行 `magpie plugin options quota-keepalive` 更新配置。

## 执行周期与失败

Magpie 自己的每日签到调度仍会在启动后约 2 分钟进行首轮，之后约每 30 分钟巡检；
失败约 30 分钟后重试。本插件的定时任务是额外的统一调度，默认关闭，适合需要更
频繁签到或保活的场景。本插件的定时任务不会在保存后立即执行，也不会在修改后
重启 Magpie；修改配置会替换运行中的定时器，并从新的间隔重新计时。调度状态保存在
`quota-keepalive-schedule.json`，Magpie 重启后会读取上次执行时间和下次执行时间，
已到期的任务会补跑，不会因为反复重启而一直错过执行。

保活失败会按 `maxAttempts` 重试；达到上限后当天不再自动发送。网络失败、登录过期、
模型不可用和空回复都会进入日志。遇到明确的 HTTP 402/429 额度耗尽或免费额度用尽时，
当天停止自动重试，避免持续发送无效请求。当天已经成功后，自动任务和手动触发都会
跳过，不会重复发送；手动“发送保活”只能在当天尚未成功时重试失败账号。供应商整体
停用时，账号级手动按钮也会禁用。

## 日志

默认日志文件：

```text
~/.config/magpie/workbuddy-daily.log.jsonl
```

查看最近记录：

```sh
node ./bin/daily-keepalive-log.js --limit 50
node ./bin/daily-keepalive-log.js --day 2026-10-30 --status failed
node ./bin/daily-keepalive-log.js --json
```

也能通过 Agent 工具 `quota-keepalive_logs` 查询。日志只记录账号稳定哈希、供应商、
结果、模型和脱敏后的错误，不保存令牌、完整账号标识、企业标识或模型回复。

## 安全

- 状态和日志文件以 `0600` 创建，写入使用临时文件和原子 rename。
- `plugin-auth.json` 的更新使用短锁、文件指纹校验和冲突重试。若 Magpie 或其他
  供应商插件在读取后改动了凭据文件，本插件会重新读取并合并，不会直接覆盖新内容。
- 模型回复不会写入状态或日志。
- 日志和页面显示会对令牌、Bearer、API key 和账号标识做脱敏。
- 未安装对应供应商插件、未登录或没有可用模型时，会明确记为跳过或失败。

## 验证

```sh
bun test
bun test --coverage
```

测试使用 mock 请求，不会访问供应商，也不会消耗积分。当前核心 JavaScript
模块的行覆盖率和函数覆盖率均为 100%。性能边界测试覆盖 60 个供应商、600 个账号、
5,000 个模型、10 万条记录和 16 组执行历史的聚合路径；测试使用宽松的固定预算，
同时校验输出规模与结果正确性，避免只看耗时。页面视觉和真实供应商协议仍需在
Magpie 中人工验收。
