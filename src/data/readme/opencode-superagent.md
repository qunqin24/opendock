# Superagent（P0 原型）

一个运行在 OpenCode TUI 中的双角色 agent 插件：**Router** 负责与人对话和分派任务，**Worker** 在自己的会话里执行单一任务。事件按 thread 直通：同一 thread 的后续消息不再经过 Router，而是直接投递给已经负责该 thread 的 Worker；短时间内到达的多条事件会合并批处理。

## 目录

- [概览](#概览)
  - [当前能力](#当前能力)
  - [不做什么 P0 边界](#不做什么-p0-边界)
- [安装与启用](#安装与启用)
  - [从 npm 安装](#从-npm-安装)
  - [本地开发安装](#本地开发安装)
  - [升级与重启 不支持热加载](#升级与重启-不支持热加载)
- [使用 TUI 命令](#使用-tui-命令)
- [工作原理](#工作原理)
  - [数据流](#数据流)
  - [链式召回与 Router 工具](#链式召回与-router-工具)
  - [粘性续聊 thread 亲和](#粘性续聊-thread-亲和)
  - [工单 Ticket](#工单-ticket)
  - [侧栏工单面板](#侧栏工单面板)
  - [单网关多目录 Router 自管](#单网关多目录-router-自管)
  - [终止会话 abort_session](#终止会话-abort_session)
  - [会话区分 title 与 metadata](#会话区分-title-与-metadata)
  - [Watchdog](#watchdog)
- [RPC 接口](#rpc-接口)
- [配置项](#配置项)
- [开发](#开发)
- [发布与构建](#发布与构建)
- [已知限制与路线图](#已知限制与路线图)
- [文件结构](#文件结构)

## 概览

### 当前能力

- 一个 Router 会话：和用户交互，用 `dispatch` 并行派活。
- 多个 Worker 会话：各自独立执行任务，结束时把结论作为 report 交回 Router。
- thread 亲和（粘性续聊）：首次出现的事件进入 Router 建 Worker，后续事件回到同一 Worker 继续（已结束会被唤起，不会每句话建新会话）。
- 批处理：相邻事件合批，减少重复唤醒。
- 工单：先登记「要什么 + 怎么算完成」，再派活，Worker 终态自动回写；被中断的 Worker 把工单落到 `blocked`，重开即可原单重派。
- TUI 入口：`/superagent`、`/tickets`、`/abort`、`/tools`、`/ticket <id>`（见[使用](#使用-tui-命令)）；工单可用侧栏显示的 4 位短 ID 搜索。

### 不做什么 P0 边界

- 没有内置的 IM 信道（GitHub、邮件、即时通讯等）：事件由 RPC `trigger` 注入，任何调用 `trigger` 的客户端都可以作为本地联调入口。
- Worker 会话不做隐藏，仍然出现在普通会话列表中，方便观察和排障。
- Watchdog 只告警，不自动重启、不自动回收、不升级给 Router。
- 没有 Worker 反向派活：Worker 不能创建子任务给其他 Worker；长期上下文靠链式召回带回 Router。
- 没有生产级的持久化、去重和投递保证；这是 P0 原型。

## 安装与启用

### 从 npm 安装

发布包名是 `opencode-superagent`，与主仓版本线解耦（独立从 `0.1.0` 起步），`exports` 指向预构建产物，不需要在本地编译 TypeScript 或 TSX：

```sh
opencode plugin add opencode-superagent
```

或在 `opencode.jsonc` 里按包名声明（TUI 会把包装进 opencode 自己的插件缓存目录）：

```jsonc
{
  "plugins": ["opencode-superagent"],
}
```

- `dist/server.js` 由 `tsc` 产出，`dist/tui.js` 由 `bun build` + `@opentui/solid/bun-plugin` 预打包。必须预打包的原因：OpenCode 的运行时 Solid transform 会跳过 `node_modules` 里的文件，直接发 `tui.tsx` 会留下裸 JSX，加载时报 `Cannot find module 'react/jsx-dev-runtime'`。
- `agent/*.md` 随包内置（见[本地开发安装](#本地开发安装)第 2 条），agent 定义由插件在 setup 里程序化注册，**不需要复制任何 markdown 文件**。
- 安装后同样要关闭 Location 空闲回收（见[本地开发安装](#本地开发安装)第 3 条），然后重启 TUI。

### 本地开发安装

本仓库根就是插件包本身。

1. 在项目或全局 `opencode.jsonc` 中把插件目录加入 `plugins`。注意：相对路径是**相对于配置文件所在目录**解析的（OpenCode 上游 `config/plugin/source.ts` 的 `scan` 以 `path.dirname(entry.path)` 为基准 `resolve` 以 `./` 或 `../` 开头的目标），不是相对仓库根目录：

   项目级（配置文件是本仓库的 `.opencode/opencode.jsonc`，插件目录即仓库根，所以上一级是 `..`）：

   ```jsonc
   {
     "plugins": [".."],
   }
   ```

   写成 `"."` 会被解析到 `.opencode` 自身，加载失败（日志 `failed to load plugin … ENOENT`）。

   全局（配置文件是 `~/.config/opencode/opencode.jsonc`）：不要用相对路径；插件路径不支持 `~` 展开（只处理 `file://`、`./`、`../` 开头和绝对路径），请写本仓库的绝对路径：

   ```jsonc
   {
     "plugins": ["/abs/path/to/opencode-superagent"],
   }
   ```

   如果已有 `plugins`，追加该项，不要覆盖其他插件。

2. agent 定义由插件在 setup 里程序化注册（`src/agents.ts` 的 `registerAgents`），**不需要手工复制任何 agent 文件**。项目里已有的 `.opencode/agent/superagent-*.md` 仍然优先（文件覆盖注册的同名字段），可用于定制；想回到纯插件定义就删掉这些副本。
   - `agent/*.md` 只是模板：随包发布，用于定制参考，以及在旧内核（`editor.update` 不会为未知 id 兜底创建）上手工兜底。注册失败时插件会打一条 warn 日志并列出没注册上的 id。
   - 模板与代码里的定义由 `test/agent-definition.test.ts` 逐字段比对，改一边会立刻报错。
   - `superagent-router` 是 `mode: primary` + `hidden: true`，`superagent-worker` 是 `mode: subagent`。

3. 关闭 Location 空闲回收，避免后台 Worker 会话被当作空闲会话清理：

   ```jsonc
   {
     "experimental": {
       "location_idle_timeout": false,
     },
   }
   ```

   开发时把上述配置写进仓库根的 `.opencode/opencode.jsonc` 即可（本仓库不提交该文件）。

4. 重启 TUI，确认插件加载成功。

### 升级与重启 不支持热加载

插件没有热加载：改完 `src/` / `server.ts` 或换掉 npm 包版本后，必须**重启 OpenCode 网关**（`opencode service restart`，本仓库可用 `sh restart-service.sh`）才会加载新代码；只重启 TUI 或重开窗口不会更新后台服务。

- 启动日志会打印一行 `superagent <version> loaded; restart the OpenCode gateway after upgrading (no hot reload)`，只含版本号，不含路径、配置、token 或会话信息。
- `status` 工具输出的首行、以及 `status` RPC 的 `version` 字段，都会给出当前**已加载**的插件版本；升级后这里若还是旧版本，说明网关没重启。
- 排查顺序：日志里的版本 → `status` 首行 → `opencode service status`。三者一致仍行为异常时，再怀疑代码本身。

## 使用 TUI 命令

| 命令 | 命令面板名称 | 作用 |
| --- | --- | --- |
| `/superagent` | Superagent | 通过 RPC 创建/获取 Router 会话并跳转过去。 |
| `/tickets` | Superagent tickets | 两级浏览：列表（工单在前、worker 在后）→ 详情。列表里 `⏎` 进详情、`/` 搜索、`q`/`esc` 退出；行尾 `p1 w=xxx123` 的 `w=` 是该工单**最近一次** dispatch 的 worker 会话尾 6 位（没派过不显示）。详情里 `⏎` 进入该行的 worker 会话（工单取最近一次 dispatch 的 worker，先 `session.get` 校验，会话已不存在时提示「该工单的会话 … 不可用」；无 worker 时提示「该工单暂无会话」）、`q`/`esc` 返回列表（搜索词与光标保留），`↑↓`/`PgUp`/`PgDn` 滚动详情。自绘面板（`src/tui-picker.ts`）按终端尺寸放大：默认占终端高度的 75%（12–30 行可见），窄终端自动收列宽。 |
| `/abort` | Superagent abort worker | 选择要终止的 Worker，或首项「清理全部已结束 worker」（`stale`）批量清理；结果显示在 toast 里。 |
| `/tools`（别名 `/superagent-tools`） | Superagent tools | 按调度类/查询类/控制类分组列出 Router 当前可用的全部工具，每行显示风险等级（只读/可写/终止）与必填参数；选中某个工具后弹窗给出参数表（名称、必填、类型、说明）、确认方式与用法，末行「能力边界」列出 Router 不能做什么。清单来自 `src/tools.ts` 的工具注册表，新增工具无需改动该命令。 |
| `/ticket <id>` | Superagent ticket detail | 直接看单张工单详情（`/tickets` 负责浏览 + 搜索，本命令只开一张）。`id` 接受全 ID，也接受侧栏显示的 **4 位短 ID**（如 `dc8d`）；前缀/中间片段同样命中，多个候选会列出让你选。 |

- 短 ID 搜索（`src/ticket-search.ts`）的排序：全 ID 精确 > 后缀（短 ID）> 前缀 > 中间片段 > 标题包含；比较时忽略大小写和 `tk`/`_`/`-` 分隔符，所以 `TK_mwbk-ve34`、`dc8d`、`bkve34` 都能找到 `tk_mwbkve34_dc8d`。歧义（多个同级命中）时不猜，列出候选。
- 选择器是自绘的 `PickerDialog`（`src/tui-picker.ts` 的 `computeDialogSize`），不再受宿主 `dialog.select`「最多 `floor(rows/2)-6` 条、固定 60 列」的限制；键位与内置选择器一致：输入即搜、`↑↓`/`PgUp`/`PgDn`/`Home`/`End` 移动、`⏎` 选择、`esc` 取消。`/tickets` 用同一套尺寸与行布局做两级面板（`TicketBrowser`）：列表页帮助行是「⏎ 详情 · q 退出 · / 搜索」，详情页是「⏎ 进入会话 · q 返回」，进入会话前会先确认该 session 仍存在（`session.get` 成功才跳转，否则在面板底部给 `该工单的会话 … 不可用`）；详情字段由 `src/ticket-detail.ts` 从 `ticket` RPC 的文本解析（短 ID、全 ID、标题、状态、优先级、目标、验收、目录、`档位`（有则显示）、最近 worker、尝试次数、创建/更新时间、报告摘要、历史），导航状态机是纯函数 `src/picker-nav.ts` 的 `ticketStep`。工单行的 `w=` 尾 6 位只在列表里出现，详情用的是完整 session id（`workerBySuffix` 只在唯一命中时接受）。

- TUI 右侧栏（42 列）里有一块「工单」面板，常驻显示工单清单，见[侧栏工单面板](#侧栏工单面板)。

## 工作原理

### 数据流

```text
用户输入 /superagent
        │
        ▼
TUI command ── rpc.router ──▶ 服务端创建/返回 Router 会话
        │
        ▼
trigger(threadID, source, author, text)
        │
        ├── thread 首次出现 ──▶ Router 会话
        │                          │ dispatch（可并行多次）
        │                          ▼
        │                        Worker 会话
        │                          │ report
        │                          ▼
        │                        Router 汇总 ──▶ 用户
        │
        └── thread 已知 ──▶ 直接投递该 thread 的 Worker
                             （相邻事件合批）
```

### 链式召回与 Router 工具

Router 的 system prompt 只保留**字节稳定**的 `ROUTER_PROMPT`（prompt cache 前缀）。动态摘要（worker 数量、pending 数量、trigger 总数、`status` 紧凑列表、当前 thread 工单与链式召回）改为每批事件 flush 时追加在消息历史末尾的 synthetic 消息里，system 前缀不随计数器变化。完整信息按需取（Spill），不要猜：

| 工具 | 用途 |
| --- | --- |
| `dispatch({ task, title?, threadID?, agent?, effort?, directory?, ticketID })` | 派活给后台 Worker，可并行多次调用。`effort` 取该模型 `variants` 中的推理档位（low/medium/high/max），缺省继承 Router 当前档位。 |
| `sleep({ seconds? })` | 暂停 Router 指定秒数（默认 30，范围 1..60 的整数），每 250ms 检查 Worker 终态与新 trigger，变化即提前返回；Goal 模式下 dispatch 后给 Worker 执行时间；真实定时器，不忙等。 |
| `ticket_create({ threadID, title, objective, acceptance, directory, priority?, parentTicketID?, dedupeKey? })` | 建工单：`objective`/`acceptance`(1-10 条)/`directory` 必填，同 thread 同 dedupeKey 自动复用（`reused=true`）。 |
| `ticket_list({ threadID?, status?, since?, limit? })` | 按 thread/状态/更新时间列工单（默认 20 条，上限 100），含 id/state/title/priority/更新时间/worker。 |
| `ticket_update({ ticketID, status?, note? })` | 按状态机推进工单（open→in_progress→blocked/done/failed/cancelled/superseded），非法迁移报错。 |
| `ticket_close({ ticketID, outcome, summary })` | 结单：写 `closeReason`/`closedAt` 与 history。 |
| `status({ includeFinished? })` | Router/pending/Worker/工单计数的紧凑摘要：默认只列活跃 Worker、不带 lastReport，整体 ≤2000 字符；`includeFinished=true` 附最近 20 条已结束 Worker（报告截断）。 |
| `thread_detail({ threadID, limit? })` | 该 thread 的 trigger 列表（时间+作者+截断 300 字/条，默认 20 条）+ 订阅 workers 及其 state/lastReport。 |
| `worker_detail({ sessionID, messages? })` | Worker 的标题/threads/state/lastReport + 最近 N 条（默认 5，上限 10）assistant 消息文本（默认截断 1500 字/条）。 |
| `report_read({ sessionID, offset?, limit? })` | 按字符区间读取 Worker 结束报告的**完整全文**（默认 4000 字/页，上限 20000），返回总长度与 nextOffset。 |
| `worker_prompt({ sessionID, text, delivery?, interrupt? })` | 给已跟踪的 Worker 追加 `[router:follow-up]` 提示词：`delivery` 默认 `queue`，可选 `steer`；`interrupt=true` 先 steer 入队再 `interrupt({ resume: true })`。工单已结单（done/failed/cancelled/superseded）或找不到工单一律拒绝，不会唤醒 Worker。 |
| `abort_session({ sessionID?, reason?, all?, stale? })` | 终止/清理 Worker：中断、等待终态、标记 `aborted`、解除 thread 亲和（见[终止会话](#终止会话-abort_session)）。 |

- 只有 Router 能调这些工具（`dispatch`、`sleep`、`ticket_*`、`thread_detail`/`worker_detail`/`report_read`/`worker_prompt`/`abort_session` 复用 `status` 的权限位，Router 会话已放行；其他会话直调会被拒绝）。
- `dispatch` 的 `effort` 是 **模型 variant**：在 `sessions.create` 时写进 `model.variant`（`sessions.prompt` 没有档位字段，不能逐条改）。合法值以 `ctx.model.list()` 里该模型的 `variants` 为准——服务端对未知 variant 不报错、会存成坏值，所以由插件侧白名单校验：不在列表时报 `dispatch: effort <档位> is not available for <provider>/<model>; available: ...; omit effort to inherit the router's current effort`，不建会话。`effort` 不能和 `agent` 覆盖同用（agent 保留自己的模型）；`model.list` 不可用或模型探测失败时降级为继承 Router 档位并记日志，派发不中断，工单历史写作 `effort=<档位> (unverified: inherited)`。派发时记一条 `effort=<档位>`，`/ticket <id>` 详情里显示「档位：」。
- `worker_prompt` 只接受 `store.workers` 中 `running`/`idle` 的 Worker：Router 自身、未知 session、failed/aborted/done 记录都会被拒绝；工单已结单时错误形如 `worker <id> ticket <id> is closed (<state>); start a new worker instead`，且不会发出任何 prompt/interrupt。
- 何时用哪个档位：`low` 只读查询、跑命令看结果、单文件小改、文案/格式调整、路径已知的机械修改、验证类任务；`medium`（默认）常规实现、多文件小改、补测试、排查单个已明确的失败；`high` 并发/状态机/协议设计、跨模块重构、难复现的 bug、需要在多个方案间权衡。不要因为「保险」一律用 high；不传 `effort` = 继承 Router 当前档位。Worker 失败或被中断后重派升一档（low→medium→high），并在任务描述里写一句升档原因；每次 dispatch 的 `task` 首行写 `effort=<档位>：<理由>`，便于事后核对。
- `sleep` 是 Goal 模式的节流阀：dispatch 之后暂停 Router（默认 30 秒，范围 1..60 的整数，非法值直接报错），用 `Effect.sleep` 真实定时器等待，期间其他任务照常推进，不会忙等。等待期间每 250ms 轮询插件内存状态：Worker 进入终态或新 trigger 入队会立即提前返回，text 形如 `slept 3s of 30s (woken: worker completed)` / `slept 3s of 30s (woken: 2 new event(s))`，output 带 `woken` 字段；被新 trigger 唤醒时以 `delivery: "steer"` flush pending 队列，下一步即可看到，Worker 完成通知由 watcher 投递、不重复。sleep 开始时已存在的终态/pending 不触发虚假唤醒。它是 Router-only 工具：Worker 会话的工具列表里没有它，直调也会被 `guard` 拒绝。
- 唤醒基线比较的是**身份**而不是计数器：终态 Worker 按 `sessionID + state/updatedAt` 快照，pending 按 trigger id 快照。这样「一个终态 Worker 被唤起、同时另一个完成」（终态数不变）或「空闲钩子冲掉队列、同时新 trigger 到达」（队列长度不变）都不会被静默吞掉。
- `store` 与 Worker 注册表挂在 `globalThis` 的稳定 symbol 上（`opencode-superagent.store.v1` / `opencode-superagent.workers.v1`），进程内同一份代码的多个副本（重复安装路径、重新 reconcile）共享同一份状态；不同版本的副本仍需重启网关才能共享。
- `ensureRouter` 的「检查 → 建会话 → 落 KV」被一把进程级信号量串起来（同样挂 `globalThis`：`opencode-superagent.router-lock.v1`），并发调用（新 trigger、`router` RPC、flush 同时触发）不会各建一个 Router 再互相覆盖；持锁后重新读一次 `routerID`，抢输的一方直接复用赢家的会话。Effect 在成功/失败/中断时都会释放许可，一次失败的建会话不会堵住下一次。
- Router 会话的权限位由 `src/tools.ts` 的目录派生（`ROUTER_PERMISSIONS`）：新增工具必须在 spec 里声明 `permission`，`Tool.snapshot` 会按该权限位过滤，漏声明会让工具从模型可见列表里消失。
- 所有 Spill 输出都是紧凑文本，`thread_detail`/`worker_detail` 单次总长度控制在 6000 字内，超出截断并注明；`report_read` 按页返回（默认 4000 字/页）。
- trigger 历史持久化在 KV（`trigger:<id>`，含全文、route、sessionID）：排队事件入队即记（全文，内存同步+KV 异步），flush 后补 `route=router`；直投 Worker 的事件由 prompt 钩子补记（文本与 Worker 可见格式一致）。hydrate 只加载最近 200 条（按 createdAt 倒序），`triggerTotal` 记总数。

### 粘性续聊 thread 亲和

- 同一 thread 的追问默认**回到上一个 Worker 继续**：运行中直接收，已结束（done/idle）会被唤起继续，不会每句话建新会话。
- 只有全新 thread（该 thread 没有 Worker 记录）或上一个 Worker 失败了，消息才进 Router → `dispatch` 建新 Worker。
- 事件入口通过 RPC 注入（任何调用 `trigger` 的客户端）；`trigger` 的 `source` 可用插件选项 `sources` 过滤，未配置则全部放行。
- 插件选项 `worker_detail_message_limit` 控制 `worker_detail` 单条消息截断字数（默认 1500，夹在 200–4000 之间）。
- Worker 结束（`succeeded`/`failed`/`interrupted`）时，`watcher.ts` 把结论写回 Router：完整报告先写入 `report:<sessionID>`（KV，全文，上限 20 万字），Worker 记录只留 2000 字摘要 `lastReport` 供 `status`/`worker_detail` 使用；注入 Router 的事件带上「全文长度 N，可用 report_read 读取」句柄，用 `report_read({ sessionID, offset?, limit? })` 翻页读全文。
- 终态通知按 `worker sessionID + 执行轮次 + 终态` 去重：Worker 记录里的 `notified`（随 `worker:<sessionID>` 落 KV）在通知前写入，同一执行的重复投递（watcher 抖动、host 重投 durable 事件、`hydrate` 重放）不会再注入第二条；`execution` 记录当前执行的 `session.execution.started` 序号，真正的续聊（新执行）会清空 `notified` 并再次通知。注入使用由该身份派生的稳定 `msg_` id，作为 host 侧重投时的最后一道防线。

### 工单 Ticket

工单是「用户要什么 + 怎么算完成」的持久记录。Router 先建单再派活，Worker 的终态自动回写。核心原则：**先建单登记意图，再决定并行或串行；工单是账本，不是派发的副产品**——拆子任务先建全部子单（`parentTicketID`），完成后逐张结单。

- 状态机：`open → in_progress → blocked/done/failed/cancelled/superseded`；`blocked → in_progress` 可回；`done/failed/cancelled/superseded` 为终态，任何非法迁移都报错。`open` 也可直接 `done/failed/cancelled`（派活前就完成/放弃的情况）。
- 必填：`objective`、`acceptance`（1-10 条）、`directory`（绝对路径）；`acceptance` 为空直接拒绝建单，避免占位单。
- 去重：`dedupeKey` 缺省为 `sha1(source + threadID + 归一化 objective)`，建单前在同 thread 找 `open/in_progress` 的同键单，命中则返回原单并标 `reused=true`。
- authorization：自动取 Router 最近一次被投递的 trigger（`triggerID` + 原文摘要 ≤300 字），所以每张单都能追溯「用户当时怎么说的」。
- 存储：`ticket:<id>` 存全量记录；`ticketidx:status:<state>`、`ticketidx:thread:<threadID>`、`ticketidx:all` 是按 createdAt 倒序的派生索引（各截断 200 项）。hydrate 扫 `ticket:` 前缀重建内存与索引，索引丢失不会丢单；历史 Worker 不回填工单。
- 内存与 KV 的一致性：内存只保留最近 500 张（`MEMORY_LIMIT`），查询未命中时**回源 KV 读一次**（`loadTicket`，不扫全表），所以被裁剪掉的老单不会显示成「没有找到工单」；`ticket_list` 在内存页不足时才补扫 KV。KV 写失败不吞：内存已改，写失败的记录进 dirty 队列，下次任意写入/读取时重试（`flushTicketWrites`），否则重启会让旧状态复活。索引写失败同样单独排队重试。
- 长度与截断按**码点**计数（`src/format.ts` 的 `clipCodePoints`/`codePointLength`）：40 个 emoji 的标题是 40 个字符而不是 80，截断也不会把代理对切成半个字符。
- 强制：`dispatch` 的 `ticketID` 必填，工单门禁只作用于 **Router 的工具调用**——工具拿得到宿主的 `context.sessionID`，能证明调用方就是 Router。RPC 的 `dispatch` / `stop` 属于 fail-closed：RPC 上下文里没有调用方身份，伪造 `caller`/`routerID` 也没用，所以两者一律以 `dispatch.rejected` / `stop.rejected` 拒绝（`dispatch` 不会建会话、`stop` 不会中断 Worker），见[RPC 接口](#rpc-接口)。工具路径上的拒绝规则：缺失单据、单据不存在、单据已关闭（非 `open/in_progress`）、`threadID` 与单据不符、或单据已绑定运行中的 Worker，都会给出可操作提示。
- 联动：派发成功即原子绑定——写入 `workerSessionID`、`attempts` 追加一条、`state → in_progress`；绑定失败会回滚新建的 Worker 会话（不会出现「Worker 起来了但单没绑上」）。Worker prompt 头部附「工单 + objective + acceptance」；Worker `done/failed` 由 watcher 结单，`abort_session` 关闭为 `failed`；watchdog 只告警，不改状态也不结单。
- 中断 → `blocked`，可直接重派：Worker 被中断（watcher 收到 `idle`）时，进行中的工单落到 `blocked` 并记一条 `interrupted: <reason>` 的 history，不再原地停在 `in_progress`。`blocked` 是诚实的中间态（任务没完成、这次尝试也不算失败），Router 用 `ticket_update({ status: "in_progress" })` 重开即可**接着派发**——门禁看到「工单在该 Worker 之后被 park 过」就放行那个 `idle` Worker，不需要先 `abort_session` 再建新单。重启路径同理：`hydrate` 把遗留在 `running` 的记录按会话终态回放，`interrupted` 的分支调用同一个 `blockTicketsForWorker`（`src/state.ts`），否则重启后工单会卡在 `in_progress` 而被 idle 门永久拦住。

### 侧栏工单面板

`tui.tsx` 通过公开 slot API 往 OpenCode 会话侧栏注册了一块只读面板，不改 OpenCode 上游 `packages/tui` / `packages/plugin` 任何源码：

```tsx
context.ui.slot({ append: "sidebar.content", render: () => <SidebarTickets context={context} /> })
```

- **位置**：`append: "sidebar.content"`，排在内置 Todo / MCP / Limit 模块之后；侧栏只有 42 列（`SESSION_SIDEBAR_WIDTH`），`sidebar.content` 的 slot input 只有 `sessionID`、没有宽度，所以面板按固定 36 cell 布局（42 − 4 padding − 1 滚动条列，再留 1 cell 余量）。
- **渲染**：
  - 标题行：`工单 <总数>`，有未结单时追加 ` · <N> 未结`（`open`/`in_progress`/`blocked` 计为未结）。
  - 每行：状态符号 + 标题 + 4 位短 ID（`tk_mw7tqs9a_ximd` → `ximd`）。符号与颜色按语义取 theme token：`●` 进行中（info）、`◆` 阻塞（warning）、`○` 待办、`✓` 完成（success）、`✗` 失败（error）、`⊘`/`·` 取消/被取代（muted）。
  - 排序：`in_progress` → `blocked` → `open` → 终态；同一状态内保持服务端 `listTickets` 的 `updatedAt` 倒序（稳定排序）。
  - 终态最多显示 3 条，其余折成 `… 另有 N 条已结`。
  - 截断：标题按**终端显示宽度**截断（CJK 算 2 cell），宽度预算 `36 − 符号1 − 空格1 − 短ID4 − 空格1 = 29`，再保守封顶 26 cell，超出用 `…`；`<text wrapMode="none" truncate>` 再兜一层，保证任何一行都不超宽。
- **数据与刷新**：数据来自既有 RPC `tickets({ limit: 20 })`（`ticket_list` 的渲染版），启动即拉一次，之后每 4s 轮询（`TICKET_PANEL_REFRESH_MS`）。面板只在侧栏可见时挂载（侧栏 `Show` 控制），组件 `onMount`/`onCleanup` 起停定时器，切到终端面板或隐藏侧栏后不再轮询；同一时刻只有一个请求在飞。
- **空态**：没有任何工单时整块不渲染（与内置 sidebar 模块一致），不占侧栏空间、不留空标题。
- **失败降级**：RPC 抛错时显示 `工单 读取失败`（warning 色）；已有列表时降级为标题行追加 ` · 读取失败`，保留上一次的旧数据，不抛错、不影响其他 sidebar 模块。
- **交互**：点击任意一行等同 `/ticket <id>`，弹窗显示该工单详情。slot 只提供渲染，不接管键盘，所以没有回车跳转。
- **为什么解析文本**：`tickets` RPC 只返回 `{ text }`。服务端 `server.ts` 属于后台服务的代码，改动需 `opencode service restart` 才能生效，而本次改动要求不动服务、只重启 TUI，所以面板把 `renderTicketList` 的文本解析回行（`src/ticket-view.ts` 的 `parseTicketList`）。解析对未知行是忽略而非报错；`test/ticket-view.test.ts` 用真实的 `renderTicketList` 输出做往返断言，格式一改测试就会红。
- **已知限制**：`sidebar.content` 的 slot input 没有宽度，面板按固定 36 cell 排；RPC 只给 `{ text }`，所以行数据靠解析、标题在换行处拼接会丢掉断行处的空格（随后统一按 26 cell 截断，不影响观感）；`tickets` 一次最多 20 条，标题里的 `工单 N` 是**本次返回的条数**，工单超过 20 张时不会显示真实总数。
- **验证步骤**（宽终端效果最直观，需要 ≥121 列才会自动显示侧栏）：
  1. 只改 TUI：重启 TUI（`bun run dev:live` 或重开 `opencode`），**不需要**重启后台服务；服务端本次没有改动。
  2. 打开一个 **root 会话**（子会话/Worker 会话按上游逻辑不显示侧栏）。
  3. 宽度 ≥121 列时侧栏自动出现；更窄或之前手动隐藏过，用 `Ctrl-x b`（`session.sidebar.toggle`，默认 leader `<leader>b`）切换。
  4. 有工单时应看到 `工单 N · M 未结` 与若干行 `<符号> <标题> <短ID>`，终态超过 3 条时末行为 `… 另有 N 条已结`。
  5. 无工单时整块消失（空态）。
  6. 窄屏（≤120 列）注意：上游 `session-frame.tsx` 只在 `width - verticalTabsWidth > 120` 时渲染右侧栏，所以此时 `Ctrl-x b` 不会有可见效果——需要把终端调宽，这不是本面板的限制。
  7. RPC 失败降级：停掉后台服务后，面板下一轮（≤4s）显示 `工单 读取失败`；恢复服务后自动回到列表。

### 单网关多目录 Router 自管

所有目录共用一个网关进程，Router 自主管理目录映射，用户只说自然语言（如「去 ai-gw 修登录」），Router 解析并记住：

- `dispatch` 支持 `directory`（绝对路径），透传给 `sessions.create location`，Worker 落到目标目录干活；网关进程本身的目录只是缺省值，不重要。路径的合法性统一由 `src/dirs.ts` 的 `normalizeDirectory` 判定，见下一条。
- **跨平台路径**：接受 POSIX 绝对路径（`/opt/project`）、Windows 盘符路径（`C:\project`、`C:/project`、`c:\project`）和 MSYS/Git-Bash 形式（`/c/project`）。三者都归一化成同一规范形式（`C:\project`，盘符大写、分隔符统一），因此 `C:\x`、`C:/x`、`/c/x` 在别名和 thread 绑定眼里是同一个目录，不会因为写法不同被当成冲突。非法输入（相对路径、纯盘符、空串、超 500 字符、含控制字符）统一报 `directory must be an absolute path: POSIX (/opt/project), Windows (C:\project or C:/project) or MSYS (/c/project)`。
- 目录推断优先级：消息中的绝对路径 > 历史 thread 绑定（事件文本标注「已知目录」）> 已知别名映射（状态行 `dirs:`）> 网关默认目录。
- 别名匹配是**词边界精确匹配**：别名两侧不能紧邻 ASCII 字母/数字/下划线，所以 `app` 不会命中 `appstore` 或 `myapp`，但仍能命中「修复app的问题」和 `app/web`；长别名优先。
- 别名冲突与上限：同一 basename 落到不同目录时，**先登记的保留**，后到的记进冲突表并从自动匹配中排除（宁可回落到 thread 绑定/默认目录，也不派错目录）；别名表上限 24 条（`ALIAS_LIMIT`），超出淘汰最久未动的。状态行只列最近 5 条（`ALIAS_SUMMARY_LIMIT`，新的在前），被折叠的条数与冲突数分别标注为 `+N older` / `conflicts=N`，避免一行被别名表撑爆。
- KV 持久化：`dir:thread:<threadID>` 与 `dir:alias:<小写别名>`；`dispatch` 带目录时自动记住 thread 绑定与目录 basename 别名（如 `/opt/ai-gw` 记住 `ai-gw`），重启后 `hydrateDirs` 读回。冲突时不覆盖先登记的映射，且 KV 里写的也是内存实际保留的那条，避免重启后解析结果翻转。
- 缺失映射时用网关默认目录派发，并在回复中向用户确认正确路径，待用户告知后记住；绝不编造不存在的路径。

全局注册（多目录可用）：在 `~/.config/opencode/opencode.jsonc` 注册一次插件即可，所有目录共用同一网关，无需每个目录单独配置：

```jsonc
{
  "plugins": ["/abs/path/to/opencode-superagent"],
}
```

### 终止会话 abort_session

用户明确要求「终止/清理 Worker」时用 `abort_session`（`src/abort.ts`）：

- 参数：`sessionID`（单个）或 `all: true` / `stale: true`（批量），可选 `reason`；两者不可同时给。
  - `stale: true`：只清理 `done`/`failed`/`idle`/`aborted` 的记录，不中断运行中的 Worker。
  - `all: true`：全部 Worker 都终止，运行中的先中断。
- 单个终止的校验顺序：调用者自身 → Router 会话 → 必须是 superagent 记录的 Worker；用户手动会话、未知 sessionID 一律拒绝（不会误删用户会话）。
- 所有存在的 Worker：无条件先 `session.interrupt`（未运行视为无害 no-op，但会清掉排队中的 prompt，避免 abort 返回后它才开始）。
- 运行中的 Worker：再 `session.wait` 等终态，超时 `ABORT_TIMEOUT_MS = 10s`（超时也会标记 `aborted` 并在结果里注明 `settle-timeout`）。
- 已结束的 Worker（`done`/`failed`/`idle`，或 `time.busy` 不新于 `time.idle`）：不等待，返回 `already-ended`；若 interrupt 清掉了排队 prompt，`lastReport` 记 `interrupted queued prompt`。
- KV 变更（`worker:<sessionID>`）：`state` 置为 `aborted`，`lastReport` 前缀 `aborted (<reason>) [<detail>]`（保留旧 report），`updatedAt` 刷新；**记录保留**，不删除，便于追溯。
- thread 亲和：从 `thread:<threadID>` 的 `workers` 列表移除该会话（列表空则删除该键），后续消息不再投给它；该 thread 没有其它可用 Worker 时，下条消息回落 Router 重新 `dispatch`。Worker 记录里的 `threads` 保留用于追溯。
- 竞态保护：`state` 在中断**之前**就置为 `aborted`，`watcher.ts` 的 `handleEnded`/`session.idle` 会跳过 `aborted`，避免中断落地时被改回 `idle`/`done` 或重复向 Router 报「已完成」。
- 批量结果返回数量与逐条清单（`aborted N, already ended M, session missing K`）。
- 已知限制：`aborted` 记录不会自动回收，只在下次进程启动 `hydrate` 时按会话是否存在清理；`stale` 会解除 thread 亲和，等于放弃该 thread 的「追问回到原 Worker」。

### 会话区分 title 与 metadata

- **判定以 metadata 为准**：Router 建会话写 `metadata.superagent = { role: "router" }`，Worker 写 `{ role: "worker", threads }`（`src/session-meta.ts` 的 `superagentMetadata`）。title 用户可改，不作为判定依据。
- **身份工具函数**（`src/session-meta.ts`，供过滤/统计/后续 UI 复用）：`superagentRole(metadata)`、`isSuperagentSession(session)`、`isRouterSession(session)`、`isWorkerSession(session)`。
- **幂等回填**：`hydrateSessionMeta` 在进程启动 `hydrate` 之后，对 Router id 与 KV 里已知的 Worker 记录补写 `metadata.superagent`（role 已匹配则跳过，其余 metadata 合并而非覆盖）。老会话因此跨重启也能被识别。
- **title 前缀就是 TUI 里的区分手段**：Worker 标题为 `🔧 worker-<thread 简写>-<任务摘要>`（`workerTitle`），Router 为 `🧭 router-main`。TUI 不做插件专有的渲染/装饰，用户靠会话列表里的这两个前缀辨认：`🔧 worker-…` 是后台 Worker，`🧭 router-main` 是 Router。
- **metadata 只做持久化判定**：`metadata.superagent` 是身份判定的**权威**来源（过滤、统计、`hydrate` 回填、`abort_session` 校验都读它），但**不在 TUI 展示**——它不进 title，也不派生角标/列。title 前缀纯粹给人看，用户改名不影响任何判定。

### Watchdog

后台 Worker 停滞检测与 pending 队列崩溃恢复（P0 只告警、不自动杀）。

- **检查间隔**：插件 scope 内 `Stream.tick` 每 60 秒跑一次（`src/watchdog.ts` 的 `WATCHDOG_INTERVAL_MS`），可用插件选项 `watchdogIntervalMs`（毫秒）覆盖。
- **停滞定义**：`state` 为 `running` 的 Worker，若其会话 `time.busy` 比当前早超过 30 分钟（`STALL_TIMEOUT_MS`，可用 `stallTimeoutMs` 覆盖），且 `time.idle` 没有新于 `busy` 的更新（执行期间 `idle` 只保留上一次执行的结束时间），视为停滞。
- **只告警不自动杀**：停滞后向 Router 注入一条 delivery `queue` 的提示（`Worker <sid>（<title>）已停滞 <N> 分钟，建议：stop 后重派或人工介入`）。不修改 Worker 的 `state`/`lastReport`，不结单，也不 interrupt；同一繁忙窗口只告警一次，避免误杀长任务和重复刷屏。
- **单轮错误隔离**：单个 Worker 检查失败只 `logWarning` 并继续下一个；整轮失败也只告警，循环永不退出。
- **pending 队列崩溃恢复**：入队时同步写 KV（键前缀 `pending:`，纯 JSON），flush 成功后删除该键；setup 时从 KV 读回未 flush 的 trigger 重新入内存队列（不自动建 Router，等下一次 `router` RPC 或新 trigger 时再 flush）。同一 id 重复入队会被去重。回放有 TTL（默认 24 小时，插件选项 `pendingTTLMs`）：比 `arrivedAt` 更旧的条目直接从 KV 删除并计入 `store.pendingDropped`（日志一行 warning，`status` 可见），避免崩溃一天后重启把早已过期的追问重新灌给 Router。
- **启动并发**：`hydrate` 与 `hydrateSessionMeta` 的 `session.get` 用 `HYDRATE_CONCURRENCY = 8` 并发（原来是每条一次串行的 N+1 往返），但状态迁移与结单仍按记录原顺序应用，行为与串行时一致。

## RPC 接口

TUI 侧只依赖 `src/protocol.ts` 导出的 `Definition`（`id: "opencode.superagent"`）与 `src/tools.ts` 的工具目录（`/tools` 直接渲染它，不发 RPC）。服务端注册的就是同一个 `Definition` 对象（`server.ts` 的 `ServerDefinition = Definition`），所以方法、入参/出参和声明错误两边不会漂移。TUI 实际调用六个方法：

- `router({}) -> { sessionID }`：创建或返回 Router 会话。
- `status({}) -> { version?, router?, pending, workers }`：`version` 是当前网关加载的插件版本（启动日志里也有），演示命令用它等待 `T-1` 的 Worker 就绪。Router 尚未创建时返回 `{ version, pending, workers }`，省略 `router` 键（显式 `undefined` 会导致输出校验失败）。
- `trigger({ source, threadID, author?, text, title?, createdAt?, id? }) -> { route, sessionID? }`：注入一条事件，`route` 为 `router` / `worker` / `dropped`。
- `abort({ sessionID?, reason?, all?, stale? }) -> { text }`：终止/清理 Worker，被拒绝时抛 `abort.rejected`（带可读 message）。TUI 的 `/abort`（或命令面板「Superagent abort worker」）会列出 Worker 供选择，首项是「清理全部已结束 worker」。
- `tickets({ threadID?, status?, limit? }) -> { text }`：渲染工单列表（按状态分组，窄终端友好），对应侧栏面板与 `/tickets` 的列表页。内存页不足时回源 KV 补齐，被裁剪的老单不会显示成缺失。`status` 是闭合枚举，传非法值（如 `DONE`、拼写错误）会直接被协议校验拒绝，不会退化成「不过滤的完整列表」；服务端另有 `tickets.invalid_status` 作为第二道防线。
- `ticket({ ticketID }) -> { text }`：渲染单张工单详情，对应 `/ticket <id>`；内存未命中时从 KV 读一次再渲染，确实不存在才回 `没有找到工单 <id>`。

契约里还声明了 `dispatch` 与 `stop`：两者只给 Router 的工具使用，**RPC 调用一律 fail-closed**。RPC 传输层不提供调用方 session（`RpcCallContext` 只有 `error`），入参里的 `caller`/`routerID` 可伪造（router id 在 `status` 里公开），因此 `dispatch` 固定返回 `dispatch.rejected`、`stop` 固定返回 `stop.rejected`，既不会建 Worker 也不会中断 Worker。这两个错误与其他方法一样声明在共享 `Definition` 里，server 与 TUI 读同一份定义；真正的 Router 通过工具干活，工具的 `context.sessionID` 由宿主提供，是唯一被信任的身份来源。

## 配置项

插件选项来自 OpenCode 的插件配置（`ctx.options`），均为可选：

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `sources` | 不过滤 | `trigger` 允许的事件来源列表；未配置时全部放行。 |
| `worker_detail_message_limit` | `1500` | `worker_detail` 单条消息截断字数，夹在 200–4000 之间。 |
| `watchdogIntervalMs` | `60000` | Watchdog 检查间隔（毫秒），非正数回退默认。 |
| `stallTimeoutMs` | `1800000` | Worker 停滞判定阈值（毫秒，默认 30 分钟），非正数回退默认。 |
| `pendingTTLMs` | `86400000`（24 小时） | 未投递 trigger 的崩溃重放上限：`hydratePending` 只回放 `arrivedAt` 在 TTL 内的条目，更旧的从 KV 删除并在日志/`status` 记 `pendingDropped`。非数值或非正数回退默认。 |

另外两项属于 OpenCode 自身配置，不是插件选项：

- `plugins`：注册插件（见[安装与启用](#安装与启用)）。
- `experimental.location_idle_timeout: false`：关闭空闲回收，保护后台 Worker 会话。

## 开发

在插件包（本仓库根）内做类型检查：

```sh
bun run typecheck      # bun check --no-script（需要带 `bun check` 子命令的 bun；CI 与发布闸门固定 1.4.4）
bun run typecheck:tsc  # tsc --noEmit，`bun check` 不可用时的等价兜底
```

测试用 `bun test`，在仓库根直接运行即可（本仓库不含上游的 `do-not-run-tests-from-root` 保护）。

发布前跑一次完整闸门（CI 与 `prepublishOnly` 用的是同一条命令，避免「PR 绿了、发布红了」）：

```sh
bun run release:check  # typecheck → test → build → bun pm pack + tarball 内容校验
```

CI（`.github/workflows/ci.yml`）执行的就是 `bun run release:check`；其中 pack 之后会校验入口文件齐全、打包后的版本号与 `package.json` 一致，并确认 `src/`、`test/`、`e2e/`、`script/`、`.github/` 没有被打进包里。任何一步失败都会以非零退出码中断，`npm publish` 随之被阻断。

## 发布与构建

```sh
bun run build          # 清空 dist/，tsc 产出 server + d.ts，bun build 产出 tui.js
npm pack --dry-run     # 预览 tarball（prepack/prepare 会各跑一次 build）
```

- **构建产物**：`dist/server.js` + `dist/server.d.ts` + `dist/src/*.js|.d.ts`（`tsc -p tsconfig.build.json`）；`dist/tui.js`（`Bun.build`，插件 `@opentui/solid/bun-plugin`，内联 `src/` 里 TUI 用到的纯函数）；`dist/tui.d.ts`（`tsc -p tsconfig.build.tui.json`，`emitDeclarationOnly`）。`dist/` 里没有任何 `.ts`/`.tsx` 入口，也没有指向源码的导入。
- **外置模块**：两份产物都把 `effect`、`@opencode/plugin`、`@opencode/client`、`@opentui/*`、`solid-js` 保持为裸导入。OpenCode 宿主提供这些单例，并会拒绝从插件 `node_modules` 加载 `effect`/`@opencode/plugin` 的副本。
- **依赖划分**：`@opencode/schema`（`Tool`、`AbsolutePath` 等运行时用的 schema 助手）是真正的 `dependencies`，宿主不提供它；`@opencode/plugin`、`effect`、`@opentui/solid`、`solid-js` 挂在 `peerDependencies` 且标 `optional`，因为它们只由宿主提供、npm 不该再装一份（`optional` 是为了避免裸 `npm install` 时的噪声告警）。
- **包字段**：`exports` 指向 `./dist/server.js` 与 `./dist/tui.js`（类型由同名 `.d.ts` 解析）；`files` 为 `dist`、`agent`、`README.md`、`CHANGELOG.md`、`LICENSE`；`publishConfig.access: public`。
- **包元数据**：`repository`/`homepage`/`bugs` 均指向 `xtccc/opencode-superagent`，`LICENSE` 版权人为 `xtccc`；这两处只影响元数据，不影响加载。
- **发版流程**：改 `package.json` 版本 + `CHANGELOG.md`，跑全量 `test`/`typecheck`/`build`，提交后打 `v<version>` tag 并 push；CI 通过后再 `npm publish`。
  - 发布闸门：`prepublishOnly` 会执行 `bun run release:check`（等价 `script/release-check.ts`），依次跑 `typecheck` → `test` → `build` → `bun pm pack` 并校验 tarball 内容（入口文件齐全、版本与 `package.json` 一致、没有把 `src/`、`test/`、`e2e/`、`script/`、`.github/` 打进包里）。任一步失败直接阻断 `npm publish`，不需要靠人肉记得先跑测试。
  - 打包产物验证不再依赖已发布的 npm 包：`e2e/plugin-load.e2e.ts` 现在自己 `bun pm pack` 出 tarball 再装进隔离环境加载，详见 `e2e/README.md`。
- **已知限制**：
  - `tui.d.ts` 只声明默认导出的 `Plugin.Definition`，不描述 `setup` 内部类型；TUI 插件是动态加载的，消费方通常只需要包名。
  - `dist/tui.js` 约 87 KB（未压缩，Solid JSX 编译结果 + 内联的 `src/` 纯函数 + 自绘选择器），不包含 `solid-js`/`@opentui/solid`，那部分由宿主提供。
  - `@opencode/schema` 会带上自己的一份 `effect`（其 manifest 的 dependency）。运行时所有 `effect` 导入都被宿主接管，这份副本不会被求值，只是多占几 MB 磁盘。
  - 包版本 `0.5.0` 与主仓 `2.2.5` 解耦，发版需要单独 bump。

## 已知限制与路线图

- **反向派活与接管**：Worker 不能创建子任务，Router 也不能在多轮后重新接管 thread。
- **真实信道**：把 TUI 演示事件换成 IM、GitHub issue/comment、Webhook 等来源，并补上签名与去重。
- **隐藏 Worker**：让 Worker 会话不出现在普通会话列表，只通过 Router 暴露进度（当前只做 title 前缀，未做过滤/分组）。
- **持久化与并发**：事件去重、断线重放、跨进程 thread 租约，以及多 TUI 实例的一致性。
- **跨平台路径（Windows）**：`src/dirs.ts` 的 `normalizeDirectory` 现在同时接受 POSIX 绝对路径、Windows 盘符路径（`C:\repo`、`C:/repo`、`c:\repo`）和 MSYS 形式（`/c/repo`），三者归一化成同一规范形式后再参与别名/thread 绑定比较，见[单网关多目录](#单网关多目录-router-自管)。平台支持矩阵因此是 macOS/Linux/Windows（MSYS 与原生）一致；尚未覆盖的是 UNC 路径（`\\host\share`）与 `~` 展开——它们仍会被判为非法，需要调用方先给出绝对路径。
- **工单 P1**：内存只保留最近 500 张单（更早的仍在 KV，查询时回源读取），跨进程/多实例的工单索引尚未同步；被中断的 Worker 现在会把工单落到 `blocked`（watcher 与重启后的 `hydrate` 都如此），Router 用 `ticket_update({ status: "in_progress" })` 重开即可原单重派，不再需要 `abort_session` 后建新单。仍未自动推进：`blocked` 不会自己变回 `in_progress`，需要 Router 判断。
- **工单 P2**：工单与验收标准的自动核验、按工单聚合的用量/成本统计、工单看板与通知推送。

## 文件结构

```text
.                              # 仓库根即本包
├── tui.tsx                      # TUI 入口：keymap、slash 命令、RPC 调用、侧栏工单面板
├── src/commands.ts              # slash 命令表（名称/描述/面板标题 + run 键），tui.tsx 绑定处理函数
├── server.ts                    # 后台服务入口：注册同一个 Definition
├── src/protocol.ts              # 服务端 RPC 契约（由服务端实现提供）
├── src/version.ts               # 从 package.json 读插件版本（带 fallback），生成启动/status 的版本提示
├── src/ticket-view.ts           # 侧栏面板的纯视图模型：解析 tickets 文本、排序、按 cell 截断
├── src/ticket-detail.ts         # /tickets 详情页：解析 ticket 详情文本并重排成详情行
├── src/picker-nav.ts            # /tickets 两级导航状态机（列表 ⇄ 详情、⏎ 进会话）与帮助行文案
├── src/ticket-search.ts         # 工单搜索：全 ID/前后缀/中间片段/短 ID 排序，TUI 选择器共用
├── src/tui-picker.ts            # 自绘选择器：对话框尺寸、行布局、可见窗口与帮助行
├── src/agents.ts                # Router/Worker agent 的程序化注册（插件 setup 调用）
├── src/                          # 服务端 Router/Worker/批处理实现
├── test/                        # bun test 测试（含 sleep 唤醒可靠性回归）
├── e2e/                         # 真机 e2e：pack 当前工作树 → 隔离 HOME 里加载（本机不默认运行）
├── agent/
│   ├── superagent-router.md     # Router agent 模板（mode: primary，可按需定制，非运行必需）
│   └── superagent-worker.md     # Worker agent 模板（mode: subagent，可按需定制，非运行必需）
├── script/build.ts              # 构建：tsc（server + d.ts）→ bun build（tui.js）
├── script/release-check.ts      # 发布闸门：typecheck → test → build → pack 校验（prepublishOnly 调用）
├── tsconfig.json                # 类型检查（noEmit，含 test/script）
├── tsconfig.build.json          # 构建：server.ts + src → dist/*.js + *.d.ts
├── tsconfig.build.tui.json      # 构建：只为 tui.tsx 产出 dist/tui.d.ts
├── .github/workflows/ci.yml     # CI：release:check（typecheck + test + build + pack 校验）
├── .github/workflows/e2e.yml    # E2E：改 src/ 等代码路径即触发，测本地 pack 出的 tarball
├── restart-service.sh           # 本机重启网关的辅助脚本
├── LICENSE                      # MIT（版权人占位，见「发布与构建」）
└── README.md
```
