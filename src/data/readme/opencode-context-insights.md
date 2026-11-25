# opencode-context-insights

简体中文 · [English](https://github.com/LyricsYo/opencode-context-insights/blob/main/README_en.md)

[![npm version](https://img.shields.io/npm/v/opencode-context-insights)](https://www.npmjs.com/package/opencode-context-insights) [![GitHub stars](https://img.shields.io/github/stars/LyricsYo/opencode-context-insights?style=social)](https://github.com/LyricsYo/opencode-context-insights) [![license](https://img.shields.io/npm/l/opencode-context-insights)](LICENSE)

**适用于 [OpenCode](https://opencode.ai) Desktop 的上下文洞察插件：看清每次请求由什么组成、窗口用了多少、上下文如何一步步演进与压缩，以及子 Agent 编队如何分工。** 思路参考 [dsh-context](https://github.com/bowenliang123/dsh-context)。

[`opencode-context-insights`](https://www.npmjs.com/package/opencode-context-insights) 提供会话级的上下文生命周期视图，全部挂在 Desktop 侧栏的一块面板上：

- **总览** — 会话累计的轮数、步数、Token、缓存命中、成本、耗时分布，以及当前请求的窗口占用和自动压缩线。
- **详情** — 选择 **实时** 或任意保留的 step，展开该请求实际组装了什么；配上上下文趋势、耗时趋势、事件、压缩记录、文件活动和命令执行。
- **编队** — 从当前会话向上找到根会话，展开整棵子 Agent 树：编队树、共享时间轴、检查器和派发链路。
- **`/context` 命令** — 在会话里直接开关这块面板，不用离开聊天。

[![Context insights 面板总览](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/overview.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/overview.png)

## 安装 / 更新

### 在 OpenCode 中安装

```bash
opencode plugin add opencode-context-insights
```

或者写进全局 `~/.config/opencode/opencode.json(c)`，OpenCode 启动时会在后台安装缺失的包：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-context-insights"]
}
```

需要固定版本时写成 `opencode-context-insights@0.1.0`；Git 安装可用 `opencode plugin add github:LyricsYo/opencode-context-insights`。

要求 **OpenCode 2.2.6 或更新版本**。Desktop 读取的是全局配置，写在项目配置里只对该项目的窗口生效；Web 版（浏览器里的 OpenCode）不会加载 GUI 部分，只看得到服务端 RPC。

### 从源码安装

```bash
corepack enable
pnpm install
pnpm build
```

`dist/` 是构建产物，不随仓库提交，克隆后必须构建。然后把本目录加进 `opencode.json(c)` 的 `plugins`（路径改成你的实际位置）：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["<path-to-opencode-context-insights>"]
}
```

改了 `src/client/` 用 `pnpm exec vite build --watch` 重新构建，Desktop 会热更新面板；改了 `src/host/`、`src/shared/` 或 `src/index.ts` 需要 `pnpm build` 并重启 OpenCode。

[![侧栏 + 菜单里的上下文入口](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/entry.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/entry.png)

## 使用方法

五个入口，讲的是同一件事：

| 入口 | 功能 |
| --- | --- |
| **总览** 页签 | 会话累计统计、Token 分类、耗时分布、当前上下文、子 Agent 列表。 |
| **详情** 页签 | 上下文浏览器绘制任意请求的组成，加上趋势、事件、文件活动和命令面板。 |
| **编队** 页签 | 整个 Agent 家族：树、时间轴、检查器、派发链路。 |
| **`/context` 命令** | 在会话里开关面板；也出现在命令面板的 **打开上下文洞察**。 |
| **侧栏 + 菜单** | 选 **上下文**，面板作为可拖宽的侧栏页打开。 |

[![总览页签上半部分](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/stats.png)

## 📊 总览页签

### Context Stats

顶部三块摘要：**输入 / 输出**、**缓存命中**（读 / 写）、**成本**（按 models.dev 单价估算，模型不在价目表时回退到 provider 上报）。下面是统计网格：轮数、步数、模型回复（带可见文字的模型响应，工具调用步骤不计）、技能加载、工具调用、命令执行、文件读 / 写 / 搜索、事件数，再往下是工具调用和事件分类 chips。

[![Context Stats 卡](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/context-stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/context-stats.png)

### Token Stats

会话累计 Token 总量（含缓存读取）与分类占比。总量按 provider 用量，分类拆解为估算并按总量校准；卡片角落给出缓存命中率。

[![Token Stats 卡](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/token-stats.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/token-stats.png)

### Timing

七段耗时：TTFT（模型等待）、模型思考、模型回复、工具参数、工具执行、等待回答、其他开销。顶部突出活跃时间（不含等待回答）、平均输出速度和平均 TTFT，其下是分布条、数据和最慢工具。

- **等待回答**只统计 `question` 工具的阻塞时间，也是唯一不计入活跃时间的段。
- **TTFT** 从请求开始算到首个内容块；OpenCode 不保存首 token 时间，所以是近似值。
- 按 step / 轮的分段明细在 **详情** 页的耗时趋势里。

[![Timing 卡](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing.png)

### Current Context

当前请求的上下文总览：provider 上报的 prompt 占模型窗口的比例、剩余窗口、输出预留、自动压缩触发线（红色竖线 + 百分比标注，图例同步给出触发值和占比），以及按类别拆解的堆叠条和图例。

- 压缩线按 `compaction.buffer` 计算（默认窗口的 15%，至少 16k）；`compaction.auto=false` 时显示「已关闭」。
- 总量始终取最近一个**已完成** step 的 provider 上报 prompt；请求进行中继续显示上一次请求的总量和分类，不展示新请求的估算值。

[![Current Context 卡](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/current-context.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/current-context.png)

### Subagents

当前会话派生的子会话，按创建时间升序，显示状态、成本与输入 / 输出 Token。列表最高 420px，超出时滚动，每次渲染 50 行；点击一行会切到 **编队** 页并定位该 Agent，也可在检查器里点 **打开** 在当前窗口打开子会话。

[![Subagents 列表](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/subagents.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/subagents.png)

## 🧱 详情页签

### Context Browser

选择 **实时**（下一个请求）或任意保留的 step，查看该请求实际组装了什么。默认按 9 个类别折叠：系统提示词、工具定义、用户消息、注入内容、技能注入、助手消息、推理、工具调用、工具结果；每类显示项数、估算 Token 和占比，展开后逐项显示完整内容。

- **工具行**：显示调用次数与来源标签（`core` / `mcp:<server>` / 工具命名空间；请求载荷没有来源字段，按名称推断），支持按大小 / 调用次数 / 名称排序。
- **工具调用 / 结果**：调用行展开是参数；结果行展开同时给出参数、状态、结果正文和行数，正文可在「原文 / Markdown」间切换。
- **附件**：消息里的图片和文件以卡片显示尺寸，可点击在 Desktop 预览或系统打开器中打开，不参与 Token 拆解。
- **对比**：分类行可切换到「对比上一步 / 对比上一轮」，显示 ±项数和 ±Token。
- **平铺**：按请求顺序铺开全部项，标注 `#位置` 与 `T轮 S步`。
- 安装插件前的步骤没有 system / tools 快照，只显示消息内容；工具结果被宿主截断时标「已截断」。

[![Context Browser](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser.png)

[![工具结果展开](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser-tool-result.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/browser-tool-result.png)

### 上下文趋势

每个 step 或每一轮一根横向堆叠柱，按 9 个类别拆开。

- 在浏览器展开某个分类时只保留该分类并重算刻度，收起恢复全部。
- 切换 **按步 / 按轮**、**总量 / 变化**；**耗时曲线**用高对比粉色线标在柱上，右侧刻度对应峰值（只算活跃耗时，不含等待回答）。
- **自适应**按当前可见范围缩放柱子和坐标轴，滚动时跟随；**全览**把整个会话压成一条堆叠带。
- 悬停突出输入 / 输出 / 缓存率并列出分类拆解；点击柱子固定到浏览器；悬停柱子或轮标签时下方浏览器实时预览该 step，并同步滚动耗时趋势。
- 图下三行 Step brief：**用户 / 新增 / 回复**，固定行高、超出裁剪，点任一行跳到对应上下文。

[![上下文趋势](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/trend.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/trend.png)

### 耗时趋势

每个 step 或每一轮一根堆叠柱，按 TTFT / 思考 / 回复 / 工具参数 / 工具执行 / 其他开销拆开；柱高和刻度不含等待回答，等待时长在悬停明细里单列。支持横向滚动、自适应、全览，点击选中 step 并突出活跃耗时和输出速度。两张趋势图联动：点任一张的柱子或轮标签，另一张同步选中并滚动到对应项。

[![耗时趋势](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing-trend.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/timing-trend.png)

### 上下文事件

压缩、技能加载、系统注入、模型 / Agent 切换、失败或中断，可按类型筛选。每次渲染 50 条，向下滚动继续加载；每行显示类型、T/S 位置、±Token 和时间，点注入 / 技能 / 压缩行跳到浏览器对应位置。

[![Context Events 列表](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/events.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/events.png)

### 压缩记录

完整的日期时间、原因、压缩前后的 prompt 大小和回收的 Token；点记录会在浏览器中定位到压缩摘要。

[![Compactions 卡](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/compactions.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/compactions.png)

### 文件活动

按文件汇总读 / 写 / 搜索次数和 `+新增 / −删除` 行数，相对路径与绝对路径自动合并。

- 筛选 **全部 / 读取 / 写入 / 搜索 / 图片**，按路径搜索；排序可按次数 / 行数 / 最近 / 路径 / 名称。
- 可预览的文件类型点击文件名即可在 Desktop 预览（悬停出现下划线），目录或行内空白处仍是展开 / 收起；已不存在的文件打删除线并禁用预览。
- 预览打开单独的侧栏页签，返回 Context 时页签、滚动位置、选中步骤和筛选条件都会保留。
- 展开文件可看每次操作的工具、匹配数 / 行数 / 增删、时间与 `T轮 S步`；Code Mode 里嵌套的 shell / read / write / edit / grep 也会计入。

[![File activity](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/file-activity.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/file-activity.png)

### 命令执行

全部 / 失败 / 慢 / 后台筛选（带计数），按命令 / 描述 / 目录 / 程序搜索，最新 / 最慢排序，程序下拉筛选。

- 列表显示状态图标、嵌套 / 后台徽标、多行 / heredoc / 内联标记和耗时；每次渲染 50 条，向下滚动继续加载。
- 点击行展开完整命令与输出，并可 **定位** 到浏览器里对应的工具结果。
- 顶部 **值得注意** 给出最慢、失败最多、重复最多和后台任务，点击即应用筛选，再点清除。

[![命令执行面板](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/commands.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/commands.png)

## 🚢 编队页签

从当前会话向上找到根会话，再展开整棵子 Agent 树。

### 编队树

每个 Agent 一张卡片：状态点、标题、Agent / 模型、输入↑ / 输出↓ Token、models.dev 估算成本（缺失时回退 provider 上报）、上下文构成条、耗时、步数和占模型窗口的比例。父节点居中于子节点上方，叶子共享宽度；宽于侧栏时自动折成多行并保持连线。同级 Agent 按创建时间升序，子级紧跟父级。

[![编队树](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-tree.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-tree.png)

### 时间线

默认视图。每个 Agent 一行，顺序与编队树一致；横轴是压缩后的共享时间轴：横条是该 Agent 的活跃时段，重叠即并行工作；顶部 **Parallel** 条按时间分桶显示并发数量和峰值。

- `question` 等待不计入活跃；父 Agent 等待 `subagent` / `task` 结果期间也不算父 Agent 的活跃时间。
- 没有任何 Agent 活跃的空闲段会折叠，边界用橙色虚线 + 圆点标出，悬停显示被折叠的时长。
- **自适应**按每 5 活跃秒 1px 加宽，标签列和 Parallel 标题固定；**全览**把画布压到面板宽度，一张图看完整个编队。
- 顶部 chips 显示 **活跃时长**（并行段只算一次）和 **活跃时长（累计）**（并行按 Agent 重复计入）；父子之间的曲线箭头是派发链路，悬停高亮整条链路；有活跃工作时显示橙色「现在」竖线。

[![时间线](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-timeline.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-timeline.png)

### 检查器

固定或悬停的 Agent 详情：状态、Token、成本、耗时、步数、窗口占比、模型配置（Agent、provider/model 和会话 ID）、上下文分类图例、下发的提示词和全部消息（提示 / 回复 / 技能 / 上下文，按时间倒序，默认 20 条，向下滚动每次再加载 20 条）。非当前会话提供 **打开**。

[![检查器](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-inspector.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-inspector.png)

### 派发链路

读取父会话里的 `subagent` / `task` 工具调用：优先用 tool 结果 metadata 里的 `sessionID` 精确配对，没有时依次按工具输出里的 `sessionID:`、子会话标题与 `description`、首条 prompt、创建时间回退匹配。子 Agent 检查器显示「派发于」父 Agent、时间和任务描述；父 Agent 检查器列出「派发记录」，点一行即可固定对应子 Agent。匹配不到的调用仍然显示，但标记为不可跳转。

[![派发记录](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-delegation.png)](https://raw.githubusercontent.com/LyricsYo/opencode-context-insights/main/docs/fleet-delegation.png)

## 开发

```bash
corepack enable
pnpm install
pnpm test       # vitest：host / shared 用 node 环境，client 用 jsdom
pnpm coverage   # 生成 coverage/ HTML 报告
pnpm typecheck
pnpm build      # 生成 dist/gui-experimental.cjs 和 dist/index.js
```

测试按层组织：`tests/host`、`tests/shared`、`tests/client`，fixture 与挂载 helper 放在各层目录或 `tests/client/helpers`。组件测试通过 `tests/client/helpers/mount.tsx` 提供 host 的 `PluginContext`，不需要启动 Desktop。

## 喜欢它？

如果这个插件帮你看清了 Agent 正在携带什么，欢迎在 [GitHub](https://github.com/LyricsYo/opencode-context-insights) 点亮 ⭐，也欢迎提交 issue / PR。

## 许可证

[MIT](LICENSE)
