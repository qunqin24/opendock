# opencode-usage-desktop

[![npm](https://img.shields.io/npm/v/opencode-usage-desktop.svg)](https://www.npmjs.com/package/opencode-usage-desktop)
[![GitHub release](https://img.shields.io/github/v/release/sthsmall/opencode-usage-desktop.svg)](https://github.com/sthsmall/opencode-usage-desktop/releases)

[English](https://github.com/sthsmall/opencode-usage-desktop/blob/main/README.md) | 简体中文

OpenCode Desktop 的用量、配额和性能侧边栏。功能上覆盖 OpenChamber 的 Usage/Live TPS 思路，并额外提供设置、通知和统计对话框。

## 功能

- 侧边栏固定的 **Usage** tab（pinned），不占用 composer 上方空间
- 5h / 1w / 1mo 配额，支持 **used / remaining** 切换
- 阈值颜色：默认 50% warning、80% danger，可在设置里改
- 配额 **pace**：进度条上的竖线表示窗口已过去的时间；下方显示 `time %` 和 `on pace / x% under pace / x% over pace`
- **当前 turn** 和 **global** 两套 TTFT / TPS 卡片
- **Live TPS**：左上角实时 TPS + 最近 15 分钟生成速度柱状图（每分钟一根，空白表示该分钟没有生成 token）
- **TPS / TTFT 图**：Usage 侧边栏同一张卡片可切 `15m / 24h / 30d`；Stats 里可切 `24h` / 当前 range，带 avg / p50 / p95
- TPS 统计 output + reasoning；优先使用 provider 返回的真实 token，流式期间用字符估算并标 `estimate`
- 当前会话：Cost、Tokens、Cache hit、Context fill、reasoning share、$/1M
- 命令面板：
  - `Usage: open details`
  - `Usage: open stats`（7d / 30d / 90d / all 统计对话框）
  - `Usage: refresh`
  - `Usage: copy performance metrics`
- 设置页：显示模式、阈值、Live TPS 开关、配额通知开关
- 配额到 danger 阈值时发系统通知（带 session，可去重）

## 数据与算法

### 配额

- **Go 计划**：server 插件通过 `ctx.integration.connection.active("opencode-go")` 取当前连接，再调用
  `https://opencode.ai/zen/go/v1/usage`。凭据只留在 server 进程。
- **Console 预算**：如果登录的是 `opencode` 集成，读取 `data.location.usage.limits()`。
- GUI 用当前 session 的 server client 和 `location` 调用 RPC；远程 server 或切换 workspace 时不会读错目录。
- **Pace**：用 `resetsAt - 固定窗口长度` 估算窗口起点，比较“已用百分比”和“已过去时间百分比”。
  竖线是时间进度；`under pace` 表示用量慢于时间，`over pace` 表示按当前速度可能提前用完。
  monthly 按 30 天估算，实际以服务端 `resetsAt` 为准。

### TTFT

- 当前 turn：`session.step.started` 的 `started` → 第一个 `session.text/reasoning/tool` 事件。
- 历史回复没有实时事件时，用第一个 reasoning 片段的 `time.created` 近似；纯文本历史回复显示 `—`。
- 精确历史和实时值都来自事件时间戳，不使用消息完成时间。

### TPS

- 当前 turn：按字符 delta 实时累计，`chars / 4` 估算，再乘以每个模型学习到的校准系数（0.25–4×）。
- step 结束后用 provider 返回的 `tokens.output + tokens.reasoning` 替换估算值，标 `measured`。
- 分母是字符之间的净生成时间；超过 1 秒的间隔（思考、工具、等待）不计入。
- global：最后一次完成的 compaction 之后，最近 20 条回复的加权平均。
- `time.streamed` 是 provider stream 结束时间，不是首字时间，所以 TTFT 单独从事件算。

### 生成速度柱状图

- 固定最近 **15 分钟**，15 根柱子，每根 1 分钟。
- 空白不是 0，而是那个分钟没有生成 token：模型在思考、调用工具，或者在等待。
- 窗口内完全没有生成时显示 `No generation in the last 15 min`，不再画一排零高度的虚线。
- 没有 turn 时不再显示空白图表，只显示一行 `No turns yet`。
- 左上角是实时 TPS（当前 turn 用 1 秒窗口，空闲时显示 last turn 平均值）。
- `peak` 是这 15 分钟内最高的每分钟速度。

### Stats 里的 TPS / TTFT 柱状图

- Usage 侧边栏的 Live 卡片和这张图合并了：同一张卡片可切 `15m / 24h / 30d`。
- Stats 里是独立区域，可切 `24h` / 当前 Stats range。
- 数据来自当前 session 的 assistant messages。
- 只有两种时间跨度：
  - `24h`：最近 24 小时，**每小时**一根柱子
  - 当前 Stats range（`7d / 30d / 90d / all`）：按**自然日**聚合；超过 92 天自动按周聚合
- 没有响应的时段保留为 1px 基线，不会被压缩掉，横轴是真实时间。
- 显示 `avg / p50 / p95 / n`，TPS 和 TTFT 各一张柱状图。
- `TPS = (output + reasoning tokens) / (streamed - first output)`；分母包含历史消息里的工具/思考时间，可能比实时 TPS 低。
- `TTFT = first reasoning/tool time - message time.created`；纯文本开头的历史消息没有首 token 时间，TTFT 显示为空。
- 当前 session 还有更早消息未加载时，底部提供 `Load older` 逐页加载。
- Stats 的聚合接口只返回 token/cost/activity，没有逐条 response timing；因此这两张图是 **当前 session** 维度，不跨 session 汇总。

### 会话指标卡片

- **Input**：本会话未被 cache 命中的新 prompt token。
- **Output**：本会话的可见输出 token；reasoning 单独计算。
- **Cache read / Cache write**：从缓存读取和写入缓存的 token；read 通常远大于 input。
- **Reasoning share**：`reasoning / (output + reasoning)`，即生成内容里思考 token 的占比。
- **Cost / 1M**：每百万 token 的混合成本；Go 订阅按额度计费，所以常见 `$0`。

### 会话指标算法

- **Cache hit**：`cache.read / (input + cache.read + cache.write)`
- **Context**：最后一条有 token 的 assistant 消息 / 模型 context limit；compaction 之后显示 `—`，直到下一次回复
- **Reasoning share**：`reasoning / (output + reasoning)`
- **Cost / 1M**：`cost / total tokens × 1,000,000`；Go 订阅的 cost 为 0 时显示 `$0`
- 底部的 input / output / cache read / cache write / reasoning share / cost per 1M 现在也是独立卡片，不再挤成两行小字

### 统计对话框

调用 `experimental.session.stats`，支持 7d / 30d / 90d / all，显示 prompts、steps、sessions、active days、tokens、cost、cache hit、$/1M、reasoning share、tool success、subagents、streak、Top models 和 token activity。

另外增加了 OpenChamber 风格的内容：

- **Project scope**：`All projects` / 当前项目切换；缓存 key 包含 project，范围互不污染
- **Token mix**：input / output / cache read / cache write 的堆叠占比和数值
- **Efficiency**：每个 session 的平均 cost、tokens、steps
- **Tool detail**：按需加载 `tools: "detail"`，显示 calls、成功率、failed、unfinished，以及每个工具的中位耗时 p50
- **Token activity**：按天/周统计 token 总量（input + output + reasoning + cache read/write；cache 占比高时数字会很大），空日期保留基线；
  超过 92 天自动按周聚合；柱子上悬停显示日期和 token 数，底部显示起止日期。
  数据通过按天/周调用 `experimental.session.stats`（`tools: "none"`）聚合，带 60 秒缓存；
  30d/90d 首次打开会有短暂加载。

## 构建

```sh
npm install
npm run typecheck
npm run build
```

产物：

- `dist/index.js`：server 插件入口
- `dist/rpc.js`：RPC 定义
- `dist/gui-experimental.cjs`：Desktop GUI bundle

## 安装

### npm

发布后全局配置 `~/.config/opencode/opencode.json`：

```jsonc
{
  "plugins": ["opencode-usage-desktop"]
}
```

或者：

```sh
opencode plugin add opencode-usage-desktop
```

### GitHub

不经过 npm 也可以直接从 GitHub 安装：

```jsonc
{
  "plugins": ["github:sthsmall/opencode-usage-desktop"]
}
```

仓库里提交了 `dist/`，所以不需要在本地构建。

### 本地开发

```jsonc
{
  "plugins": ["D:\\work\\opencode-usage-desktop"]
}
```

保存后 OpenCode 会自动重载；如果侧边栏没有 Usage tab，打开 **Settings > Extensions > Plugins** 点 **Reload**，
或重启桌面应用。改完 `src/gui.tsx` 后重新 `npm run build`，桌面端会自动热重载 GUI。

## 卸载

从 `plugins` 数组里删掉这一项。改之前的配置备份在：
`~/.config/opencode/opencode.json.bak-20261101-usage`。

## 结构

```text
src/
├── index.ts    server 插件：注册 RPC，读取 OpenCode Go 凭据并请求 usage 端点
├── rpc.ts      server 与 GUI 共享的 RPC 定义（JSON Schema）
├── metrics.ts  实时 TPS/TTFT/sparkline 引擎（事件驱动、按模型校准）
└── gui.tsx     GUI：侧边栏面板、设置页、统计对话框、命令
```

## 已知边界

- 只覆盖 OpenCode Go / Console 的配额；`mi` 这类自定义 provider 不在内。
- GUI 插件 API 在 OpenCode 2.2.x 仍是 experimental，升级大版本后可能需要适配。
- Live TPS 在 step 结束前是字符估算；provider 报告真实 token 后才会变成 `measured`。
- 历史纯文本回复的 TTFT 显示 `—`；reasoning 回复用第一个 reasoning 时间近似。
- `cost` 对 Go 订阅通常是 0，这是正常的。
