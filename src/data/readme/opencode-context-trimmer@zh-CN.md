<div align="center">

# ⛲ context-trimmer

### 给 [opencode](https://opencode.ai) 装上「无限上下文」

任意长会话也不撞上下文窗口上限。完整历史留在本地，模型按需取回。

[![npm](https://img.shields.io/npm/v/opencode-context-trimmer?color=cb3837&logo=npm)](https://www.npmjs.com/package/opencode-context-trimmer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![opencode plugin](https://img.shields.io/badge/opencode-plugin-000000)](https://opencode.ai/docs/plugins/)
[![runtime](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun)](https://bun.sh)

**简体中文** · [English](./README.md)

</div>

<table align="center">
<tr>
<td align="center">🌊<br/><b>无限上下文</b><br/><sub>一直聊下去，不会被上下文上限打断</sub></td>
<td align="center">💸<br/><b>不花冤枉钱</b><br/><sub>旧历史不反复重发，就不反复计费</sub></td>
<td align="center">⚡<br/><b>零延时</b><br/><sub>本地瞬时完成，没有额外的模型调用</sub></td>
<td align="center">🎯<br/><b>缓存无损</b><br/><sub>不破坏 prompt 缓存</sub></td>
<td align="center">🔎<br/><b>可随时召回</b><br/><sub>裁掉的内容仍可按需取回，还能跨项目检索</sub></td>
</tr>
</table>

---

## 60 秒上手

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-context-trimmer"]
}
```

重启 opencode，完成。默认开箱即用，无需配置。想微调见 [配置](#配置)。

---

## 为什么

![每次请求的上下文大小：不裁剪时随对话线性增长，直到某次请求超出模型上下文窗口、对话终止；启用 context-trimmer 后粘性窗口将其稳定在一个区间内](docs/assets/cost-curve.zh-CN.png)

opencode 对模型**无状态**：每次请求都重发整段历史。会话越长，重复发送的 token 越多——
几万、几十万，直到某次请求 `exceeds the model context window`，对话戛然而止。

而这每一次重发，都在**真金白银地计费**。会话越长，反复上送早已无关的旧工具输出，
输入 token 就越滚越多，账单随之水涨船高。context-trimmer 在发出前就地裁掉这些冗余——
**裁掉的 token 不上送，不上送就不计费**。它不会让总成本下降，但能摁住「越聊越贵」的失控曲线，
让长会话的开销维持在一个大致稳定的区间。

常见的「压缩/总结」方案要**额外调一次模型**生成摘要：花钱、增延时、还把原文揉成有损概要。
context-trimmer 走另一条路——**纯消息重写**，发出前就地裁掉冗余轮次，不调模型、不丢原文。

| | 压缩/总结 | **context-trimmer** |
|---|---|---|
| 额外 token 费用 | ❌ 每次都调模型 | ✅ 零 |
| 额外延时 | ❌ 额外调一次模型 | ✅ 本地瞬时完成 |
| 原文保真 | ❌ 有损概要 | ✅ 完整留本地 |
| prompt 缓存 | ❌ 前缀重写、失效 | ✅ 粘性边界、无损 |
| 信息找回 | ❌ 无法还原 | ✅ `context_recall` 取回 |

### 符合「局部性原理」

模型当前最需要的，几乎总是**最近几轮**；越久远越少被引用。裁剪因此恰如 CPU 多级缓存：
**最近轮次**常驻快表（完整发送），**较早轮次**降级摘要，**久远轮次**退回主存（本地磁盘），
需要时再用 `context_recall` 换页取回。用极小的召回成本，换一个看似「无限大」的上下文。

## 工作原理

![turn-window 裁剪策略示意图](docs/assets/turn-window.zh-CN.png)

插件挂载 `experimental.chat.messages.transform` 钩子（重写待发送消息的时机），
应用一个可插拔的**策略（strategy）**。内置且默认的唯一策略是 `turn-window`：

- 一**轮（turn）** = 一条或多条连续的用户消息，加上回应它们的助手消息。
  连续的用户消息会被合并成一轮（以吸收轮次中途"排队"发出的消息）。
- 当活跃轮数超过 `threshold` 时触发裁剪：
  - 最近 `recentFullTurns` 轮**完整保留**（用户输入 + 工具循环 + 最终回答）；
  - 再往前的 `priorTrimmedTurns` 轮只保留**用户输入 + 助手最终文本**（丢弃工具循环）；
  - 更早的全部**丢弃**（但可保留面包屑，见下）。
- 裁剪边界是**粘性的**：固定在 `c - (recentFullTurns + priorTrimmedTurns)`，
  随对话增长保持不动，使序列化后的前缀保持逐字节稳定，从而不破坏上游的 prompt 缓存。
  只有当活跃轮数再次超过 `threshold` 时，边界才会向前跳（受缓存门控与硬上限约束，见下）。

裁剪后会在第一条保留的用户消息里合并一段提示，告诉模型较早的上下文已被裁剪，
以及如何取回（见下方工具）。

### 面包屑（保留被丢弃的用户消息摘要）

> "面包屑" 这个名字来自童话《韩塞尔与格蕾特》：兄妹俩被带进森林前，沿路撒下面包屑，
> 好顺着这串痕迹找到回家的路。这里的道理相同——完整历史被丢弃后，我们沿途留下每条旧
> 用户消息的简短摘要（截断过的"碎屑"），让模型顺着线索回忆起"早先聊过什么"，而不至于断片。

被丢弃区域里最近的若干条**用户消息**会被保留为简短"面包屑"，合并进那段提示里，
让模型即便看不到完整历史也有一条回忆线索、不至于完全断片。

- `breadcrumbUserMessages`：保留被丢弃区域中最近多少条用户消息（默认 `100`，`0` 关闭）。
- `breadcrumbMaxTokens`：每条最多保留多少个 token，超出截断并加省略号（默认 `100`）。

#### 截断规则

每条面包屑按 **token** 数截断（按 1 token ≈ 3.5 个 UTF-8 字节估算，换算成字节预算），
不依赖任何分词库：

- 逐字符累加字节数，当加上某个字符会**超过**预算时，就在该字符之前停下。
- **绝不切半个字符**：截断点始终落在字符边界上，一个多字节字符（如 3 字节的汉字、
  或 emoji 这类代理对）要么整体保留、要么整体丢弃，结果始终是合法 UTF-8。
- 发生截断时在末尾追加省略号 `…`。

例如预算 3 token（≈10 字节）、内容 `帮我修复登录`（每字 3 字节）：留下 `帮我修`（9 字节），
第 4 个字会到 12 字节超预算，于是截断为 `帮我修 …`。

#### 组装后的完整提示词

裁剪触发后，插件会把「面包屑块」和「裁剪提示」用一个空行拼接，作为一个合成文本段
（`id: context-trimmer-notice`）插到**第一条保留用户消息**的最前面（不新增额外消息）。
默认配置下、且确有更早消息被丢弃时，插入的完整文本形如：

```text
[context-trimmer] Summaries of earlier user messages that were trimmed (each truncated, as recall hints only):
  1. Help me fix the error on the login page — clicking submit returns a 500 …
  2. Which file holds the database connection pool config …
  3. Make that function async, then add retries …

[context-trimmer] Earlier context has been trimmed, but the full history is still saved in full and can be searched anytime.

When you need the trimmed-away information, call the context_recall tool to fetch the original text:
  - query: keywords to search for; space-separated words are AND-matched (case-insensitive).
  - scope: where to search — a keyword or a session id. "session" (default): this session only, fastest and most relevant. "project": every session in the current project (including subagent child sessions). "all": every session across all projects on the machine — expensive, use ONLY when the user explicitly asks to search across projects, don't escalate on your own. Or pass a session id (e.g. "ses_...") to search exactly that one session.

No need to confirm any path or database location — just call context_recall.
```

组成与边界情况：

- **面包屑块**：一行标题 + 编号列表，每条是被丢弃用户消息的截断文本；最多列出
  `breadcrumbUserMessages` 条（默认 100），每条截到 `breadcrumbMaxTokens`（默认 100）。
  仅当有消息被丢弃且 `breadcrumbUserMessages > 0` 时出现。
- **裁剪提示**：告知模型上下文已被裁剪，以及如何用 `context_recall` 取回。可用 `notice`
  配置项自定义；设为 `""` 可关闭。
- 若两者都为空，则不插入任何提示，消息保持原样。

因为文案恒定，粘性边界稳定时序列化前缀保持逐字节稳定，不会破坏上游 prompt 缓存。

### 缓存感知门控

（重新）触发裁剪会重塑前缀、使上游 prompt 缓存失效（缓存通常有约 5 分钟的 TTL）。
`cacheAwareMinutes` 会推迟触发，直到会话空闲至少这么多分钟——那时缓存本就已过期，
因此不会付出额外的缓存未命中代价。活跃对话期间裁剪会被推迟；设为 `0` 则命中阈值即裁。

#### 硬上限兜底（`hardTriggerTurns`）

缓存门控有一个风险：**持续高频工作**时，每次请求的间隔都小于 `cacheAwareMinutes`，
门控会把触发无限期推迟——粘性边界永不前移，保留区每轮增长一轮、无上限累积，
最终撑爆模型上下文窗口（表现为上游返回 `The request exceeds the model context window`）。

`hardTriggerTurns` 是防溢出兜底：当活跃轮数超过它时，即便缓存仍"热"也强制前移边界
（以一次缓存未命中换取避免硬性溢出）。默认 `0` 表示自动取 `threshold * 2`。

### 会话归属（子 agent 安全）

`experimental.chat.messages.transform` 钩子的入参是空的，拿不到当前会话 id，所以插件
通过 `chat.params` 把每个会话的模型信息桥接到一个按会话 id 建键的存储里。关键在于：
transform 触发时**以消息列表里真实的 `info.sessionID` 为准**来定位上下文，而不是用"最近
一次 `chat.params`"去猜。

这一点对 **subagent（子任务）** 至关重要。子 agent 与父会话跑在同一进程里、交错执行：
子任务运行时会把"最近会话"指针指向子会话；父会话随后接手时，若按"最近会话"去猜，就会
拿到**子会话**的上下文，导致父会话的粘性边界在错误的 key 下查不到——裁剪静默失效、整段
未裁剪的历史被原样上送，最终撑爆上下文窗口。改用消息真实 sessionID 定位后，父会话接手
时总能查到自己的边界，正常裁剪。

## 安装

### 方式一：npm 包（推荐）

在 opencode 配置文件（`~/.config/opencode/opencode.json` 或项目级 `opencode.json`）
的 `plugin` 数组里加入包名，opencode 启动时会自动用 Bun 安装：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-context-trimmer"]
}
```

> **一个配置文件里只能有一个 `plugin` 键。** JSON 会静默保留*最后一个*重复键，
> 所以文件里别处若有多余的 `"plugin": []`，会覆盖这条配置，导致插件永远不加载。

#### 更新 npm 包

opencode 会把 npm 插件缓存在 `~/.cache/opencode/packages/`，每次启动直接复用缓存，
**不会**再去 npm 检查新版本。升级时清掉缓存并重启，下次启动会重新拉取最新版：

```bash
rm -rf ~/.cache/opencode/packages/opencode-context-trimmer*
```

然后在日志里确认版本（见下方「确认已加载」）。

### 方式二：本地文件

opencode 也会自动发现 `~/.config/opencode/plugin/`（或 `plugins/`）下的插件。
把插件入口文件**及其目录**一起复制过去：

```bash
mkdir -p ~/.config/opencode/plugin
cp -R context-trimmer.ts context-trimmer ~/.config/opencode/plugin/
```

### 确认已加载

重启 opencode，然后查看日志：

```bash
grep "\[context-trimmer\]" ~/.local/share/opencode/log/opencode.log
```

你应能看到一行 `plugin loaded version=…`——借此可确认插件已激活、且跑的是哪个版本
（升级或重装后用它核对是否真的生效）。每当裁剪一次请求时，还会看到一行
`trimmed before=… after=…`。

`@opencode-ai/plugin` 与 `@opencode-ai/sdk` 由 opencode 运行时提供——无需手动安装。

## 配置

可选。没有配置文件时使用内置默认值。要自定义，创建：

```
$XDG_CONFIG_HOME/opencode/context-trimmer.json
# 默认：~/.config/opencode/context-trimmer.json
```

```json
{
  "enabled": true,
  "threshold": 20,
  "recentFullTurns": 5,
  "priorTrimmedTurns": 5,
  "cacheAwareMinutes": 5,
  "hardTriggerTurns": 0,
  "breadcrumbUserMessages": 100,
  "breadcrumbMaxTokens": 100
}
```

| 字段 | 默认值 | 含义 |
|------|--------|------|
| `enabled` | `true` | 总开关。`false` 时不改动任何请求。 |
| `threshold` | `20` | 活跃轮数超过此值时（重新）触发裁剪。 |
| `recentFullTurns` | `5` | 最近完整保留的轮数。 |
| `priorTrimmedTurns` | `5` | 再往前只保留"用户输入 + 最终输出"的轮数。 |
| `cacheAwareMinutes` | `5` | 会话空闲达到这么多分钟（缓存已过期）后才（重新）触发。`0` 关闭该门控。 |
| `hardTriggerTurns` | `0` | 防溢出硬上限：活跃轮数超过它时无视缓存门控强制前移边界。`0` 表示自动取 `threshold * 2`。 |
| `breadcrumbUserMessages` | `100` | 被丢弃区域中保留为面包屑的最近用户消息条数。`0` 关闭。 |
| `breadcrumbMaxTokens` | `100` | 每条面包屑最多保留的 token 数（按 ≈3.5 字节/token 换算，在字符边界处截断）。 |

改动在**下一次请求**即生效——无需重启（文件通过 mtime 缓存重新读取）。
文件缺失或格式错误时回落到默认值；单个非法字段只回落该字段的默认值，不影响其余字段。

### 示例：更宽松的裁剪

更晚触发、保留更多——适合更看重上下文完整性、不那么在意 token 成本的场景：

```json
{
  "enabled": true,
  "threshold": 30,
  "recentFullTurns": 8,
  "priorTrimmedTurns": 8,
  "cacheAwareMinutes": 5
}
```

## 取回被裁剪的历史

裁剪只重塑*上游请求*——opencode 仍在本地保留完整历史。插件注册了一个
`context_recall` 工具，让模型可以按需取回被裁掉的内容：

- `query` —— 关键词；以空格分隔的多个词按"与"匹配（大小写不敏感）。
- `scope` —— 查哪里；单个重载参数，既可传关键字，也可直接传会话 id，从窄到宽：
  - `session`（默认）—— 仅当前会话，最快、最相关。
  - `project` —— 当前项目的全部会话（含兄弟会话与 subagent 子会话）。
  - `all` —— 本机**所有项目**的全部会话。可能较慢（无命中时会扫全库），
    因此仅在你明确要求跨项目查找时才用；模型不会因为窄范围没查到就自行升级到 `all`。
  - 会话 id（形如 `ses_...`）—— 只查这一个会话，最精准的定点查法。
    非上述三个关键字的值都会被当作会话 id 处理。

`scope: all` 有个顺手的用法：有时你记得聊过某个话题，却想不起在哪个项目/会话里——
明确让模型用 `all` 跨所有项目按关键词检索，就能把那段对话捞回来，不必翻遍历史。

## 扩展

在 `context-trimmer/strategies/` 下新增一个策略文件，实现 `Strategy` 接口
（`enabled(ctx)` + `apply(messages, ctx)`），并在 `context-trimmer/strategies/index.ts`
中注册。策略按顺序执行，每个都能看到前一个的输出；抛异常的策略会被跳过（fail-open），
因此一个有缺陷的策略永远不会破坏请求。

## 项目结构

```
context-trimmer.ts              插件入口（钩子 + 工具注册）
context-trimmer/
  config.ts                     全局配置加载器（mtime 缓存、fail-safe）
  context.ts                    从 chat.params 桥接的每会话模型/provider 信息
  logger.ts                     基于 client.app.log 的 fail-safe 日志器
  pipeline.ts                   按顺序运行已启用策略（fail-open）
  globals.d.ts                  最小 ambient 声明（不引入 @types/node）
  strategies/
    types.ts                    策略契约
    index.ts                    策略注册表
    turn-window.ts              粘性 turn-window 策略
  tools/
    recall.ts                   context_recall 工具
```

测试与被测文件放在一起，命名为 `*.test.ts`，用 `bun run <file>.test.ts` 运行。
