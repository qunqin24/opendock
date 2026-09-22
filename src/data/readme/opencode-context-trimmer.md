# context-trimmer

一个 [opencode](https://opencode.ai) 插件：在长会话中裁剪发送给上游模型的对话上下文，
降低 token 成本与延迟，同时把完整历史保留在本地、可按需检索。

opencode 对模型是无状态的：每次请求都会把整段对话历史重新发给模型。在长会话里，
这意味着每一轮都要发送几万甚至几十万 token。本插件在消息真正发出前重写待发送的消息列表，
只保留真正需要的轮次。

## 工作原理

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
  只有当活跃轮数再次超过 `threshold` 时，边界才会向前跳。

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
[context-trimmer] 以下是更早对话中被裁剪的用户消息摘要（每条已截断，仅供回忆线索）：
  1. 帮我修复登录页面的报错，点击提交时报 500 …
  2. 数据库连接池配置在哪个文件里 …
  3. 把那个函数改成异步的，然后加上重试 …

[context-trimmer] 较早的上下文已被裁剪，但完整历史仍完整保存，可随时检索。

当你需要被裁剪掉的信息时，调用 context_recall 工具即可取回原文：
  - query：要找的关键词，多个词用空格分隔（大小写不敏感，须全部命中）。
  - scope：默认 "current"（只查本会话，最相关）；本会话查不到时用 "all"（跨全部会话，可覆盖 subagent 子会话）。

无需人工确认路径或数据库位置——直接调用 context_recall 即可。
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

你应能看到一行 `plugin loaded`；每当裁剪一次请求时，还会看到一行
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
- `scope` —— `current`（默认，仅当前会话）或 `all`（所有会话，涵盖 subagent 子会话）。

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
