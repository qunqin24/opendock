# opencode-quota-sidebar

[English](./README.md)

OpenCode 插件：在 TUI sidebar 中显示 token 用量和 provider quota，同时让共享的 session title 在 Desktop、Web 和 TUI 中都保持紧凑可读。

![示例截图](./assets/OpenCode-Quota-Sidebar.png)

上面的截图来自 [`./assets/OpenCode-Quota-Sidebar.png`](./assets/OpenCode-Quota-Sidebar.png)，展示的是这个插件实际渲染出来的 TUI 侧边栏布局。

## 核心能力

- 在 TUI sidebar 中渲染结构化的 `TITLE`、`USAGE`、`QUOTA` 三个区块
- 让共享 `session.title` 保持紧凑单行，而不是把多行遥测数据写进所有客户端都共用的标题
- 统计 `session`、`day`、`week`、`month` 四种范围的 usage
- 内置支持 OpenAI、Copilot、Anthropic、Kimi、Zhipu、MiniMax、RightCode 的 quota / balance 获取
- session 级统计可选聚合 descendant subagent sessions
- 提供 `quota_summary` 和 `quota_show` 两个工具

## 架构概览

这个仓库是纯插件实现，不修改 OpenCode 核心代码。

- Server 层：负责 usage 聚合、quota 拉取、状态持久化、title 刷新和工具注册
- TUI 层：负责侧边栏面板渲染，并读取持久化的 sidebar-panel 数据
- Persistence 层：负责全局状态和按日期分片的 session chunk 存储
- Provider Adapter 层：通过统一的 `QuotaSnapshot` 结构屏蔽不同 provider 的 quota/balance 接口差异

依赖 `@opencode-ai/plugin` 和 `@opencode-ai/sdk`。

## 工作方式

这个插件有两条展示路径：

- TUI sidebar panel：渲染结构化的 `TITLE / USAGE / QUOTA`
- Shared session title：保持紧凑单行，供 Desktop、Web、TUI 共同使用

在 `sidebar.titleMode="auto"` 下，共享 title 会保持 compact 单行。更丰富的多段布局由专门的 TUI 插件渲染，而不是直接写进 `session.title`。

当 `sidebar.includeChildren=true` 时，`period=session` 的统计可以聚合子代 subagent sessions。`day/week/month` 范围统计不会合并 descendants。

## 支持的 Provider

内置 quota adapter 如下：

| Provider            | Endpoint family                                            | 鉴权方式 | 展示形态        | 说明                                                                                                            |
| ------------------- | ---------------------------------------------------------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| OpenAI Codex        | `chatgpt.com/backend-api/wham/usage`                       | OAuth    | 多窗口订阅额度  | 读取 ChatGPT usage 窗口，例如短窗口 + 周窗口；Pro 订阅可能额外提供 Codex Spark 限额（`additional_rate_limits`） |
| GitHub Copilot      | `api.github.com/copilot_internal/user`                     | OAuth    | 月度额度        | 使用 Copilot internal user 接口                                                                                 |
| Anthropic           | `api.anthropic.com/api/oauth/usage`                        | OAuth    | 多窗口订阅额度  | 支持 plan-based usage windows                                                                                   |
| Kimi For Coding     | `api.kimi.com/coding/v1/usages`                            | API key  | 多窗口订阅额度  | 通常为 `5h` + weekly                                                                                            |
| Zhipu Coding Plan   | `bigmodel.cn/api/monitor/usage/quota/limit`                | API key  | token quota     | coding plan 风格额度                                                                                            |
| MiniMax Coding Plan | `www.minimaxi.com/v1/api/openplatform/coding_plan/remains` | API key  | 多窗口订阅额度  | 通常为 `5h` + weekly                                                                                            |
| RightCode           | `www.right.codes/account/summary`                          | API key  | 日额度和/或余额 | 按 prefix 匹配订阅，失败时回退为 balance                                                                        |

补充说明：

- 没有内置 quota adapter 的 generic provider 仍然可以参与 usage 聚合，但不会显示 quota/balance
- OpenAI、Copilot、Anthropic 的 quota 支持依赖 OAuth / session auth，而不是通用 API key 账单接口
- **OpenAI Codex Spark**：OpenAI Pro 订阅的 `wham/usage` 响应中可能包含 `additional_rate_limits` 字段，其中带有 `GPT-5.3-Codex-Spark` 等额外功能窗口。插件会自动解析并将其显示在 OpenAI quota 行下，无需额外配置。`code_review_rate_limit`（代码审查额度）目前暂不展示。
- RightCode 可能同时显示 daily allowance 和 balance 两行
- Copilot 支持 quota 展示，但当前不会显示 API-equivalent cost，因为 pricing metadata 不够稳定

## 展示规则

- Sidebar quota 区块只展示当前 session 中实际使用过、且能被 adapter 识别的 provider
- `quota_summary` 会主动抓取默认 quota providers，即使当前 session 没用到
- TUI sidebar 优先读取持久化的 `sidebarPanel` / usage 数据，所以历史 session 打开时也能快速渲染
- compact title 中的 quota 解析只是兜底路径，TUI panel 优先消费结构化持久化数据
- `quota_show` 控制的是共享 title 的装饰开关，TUI panel 仍然是主要的富文本展示入口

title 相关补充：

- `sidebar.titleMode="auto"`：共享 title 保持 compact
- `sidebar.titleMode="compact"`：强制所有客户端都使用 compact title
- `sidebar.titleMode="multiline"`：使用旧的 multiline title 装饰路径
- 共享 title 本质上仍然只有一个 `session.title`，所以复杂布局更适合放在 TUI panel 中

## Sidebar 示例

典型的 TUI sidebar 布局（含 Codex Spark 窗口）：

```text
TITLE
  Fix quota adapter matching
USAGE
  R184 I189k O53.2k
  CR31.4k CW3.2k Cd66%
  API $12.8
QUOTA
  OAI 5h80 R3h20m
      W70 R2D04h
      Sk5h100 R1h00m
      SkW100 R3D04h
  Cop M78 R12D00h
  RC D$88.9/$60 E6D00h
     B260
```

compact shared title 示例：

```text
Fix quota adapter matching | OAI 5h80 R3h20m W70 R2D04h | RC D$88.9/$60 B260 | Cd66% | API$12.8
```

## Pricing And API Cost

`API cost` 表示按 API 单价估算出来的 API 等价成本，不是订阅月费，也不是 provider 的真实账单。

价格来源优先级：

1. OpenCode 主配置（`opencode.jsonc` / `opencode.json`）里的显式模型价格
2. 基于这些显式基础模型价格派生出的 fast/tier 价格
3. `provider.list()` 返回的非零 runtime 价格
4. 基于 runtime metadata 派生出的 fast/tier 价格
5. `models.dev` 远端模型目录价格
6. 插件内置 bundled fallback 价格表

补充说明：

- OpenAI / Anthropic 这类 OAuth provider 的 runtime metadata 经常返回 `cost: 0`，所以 runtime 价格只能作为补充来源
- `provider.list()` 更像 OpenCode 当前运行时暴露出来的模型 metadata 视图，不是稳定权威的官方价格 API
- OpenCode 主配置里的价格层会按字段层叠合并，所以后面的 override 可以只改 `input` / `output`，不会把前层已有的 `cache_*` 或 `context_over_200k` 一起丢掉
- 当 runtime 价格缺失时，插件会把 `models.dev` 作为结构化远端补充来源；这层只会补齐那些在 config / runtime / bundled 之后仍然缺价、且已经被 OpenCode runtime 暴露出来的模型，尤其是 bundled 还没覆盖的新模型
- 如果 `models.dev` 暂时不可达，插件会继续回退到前面的高优先级来源；对仍然没有价格的模型，`API cost` 可能继续显示为 `0`
- 主流模型通常已经被 bundled 表覆盖，因此 token usage 和 quota 功能本身不依赖用户手动配置价格
- 如果你使用的是插件还没内置的新模型，且 runtime 价格仍然是 `0`，那么 `API cost` 可能会显示 `$0.00`，直到你在 OpenCode 主配置里为该模型补充显式价格

想让新模型也显示完整 `API cost`，至少需要满足以下一项：

1. 该模型已经被插件 bundled pricing 覆盖
2. 你在 OpenCode 主配置中为该模型配置了价格
3. runtime `provider.list()` 返回了非零价格
4. runtime `provider.list()` 已经暴露出这个模型，且 `models.dev` 有对应价格

## Tool Report 示例

历史 `quota_summary` markdown 大致会是这样的结构：

```md
## Quota History - Daily since 2026-02-18

### Quota Status

- OpenAI: 5h | 80.0% | reset 3h20m; Weekly | 70.0% | reset 2D04h
- Copilot: Monthly | 78.0% | reset 12D00h
- RightCode: Daily $88.9/$60 | reset 6D00h

### Totals

| Metric       | Total | Avg/Period |
| ------------ | ----: | ---------: |
| Requests     |   184 |       26.3 |
| Total Tokens |  277k |      39.6k |
| Cache Hit    | 63.1% |      58.4% |
| API Cost     | $12.8 |      $1.83 |

### Provider Breakdown

| Provider  | Req | Input | Output | Total | Share | Cache Hit | API Cost |
| --------- | --: | ----: | -----: | ----: | ----: | --------: | -------: |
| OpenAI    | 140 |  160k |    61k |  221k | 79.8% |     66.2% |    $10.4 |
| Anthropic |  44 |   29k |  27.1k | 56.1k | 20.2% |     51.3% |    $2.34 |

### Period Detail

| Period       | Requests | Input | Output | Cache | Cache Hit | Total | API Cost |
| ------------ | -------: | ----: | -----: | ----: | --------: | ----: | -------: |
| 2026-02-18   |       12 | 18.3k |   4.2k |  8.9k |     32.7% | 31.4k |    $1.12 |
| 2026-02-24\* |       17 |  8.1k |   2.0k |  3.4k |     66.0% | 13.5k |    $0.88 |
```

这个工具本身就返回完整 markdown，调用方应该直接展示，而不是再压缩成一句话摘要。

补充说明：

- Sidebar 里用的是 compact token
- Toast 和 markdown report 使用更完整的人类可读文案
- `quota_summary` 可以展示默认 quota providers，即使当前 session 没有使用它们

## 为什么需要 TUI Panel

OpenCode 对 sidebar title 的渲染本质上是一个单一的文本字段。它适合放紧凑的 telemetry，但不适合承载结构化的多段布局。

所以这个插件采用了两层设计：

- shared compact title：保证跨客户端兼容
- dedicated TUI sidebar panel：提供更清晰的区块化展示

这样既不会污染 Desktop/Web 的标题，又能让 TUI 用户看到清晰的 quota dashboard。

## 缩写说明

Usage token：

- `R`：requests
- `I`：input tokens
- `O`：output tokens，已包含 reasoning tokens
- `CR`：cache read tokens
- `CW`：cache write tokens
- `Cd`：cached ratio / cache coverage
- `API`：API-equivalent cost estimate

Quota token：

- `OAI`：OpenAI
- `Cop`：GitHub Copilot
- `Ant`：Anthropic
- `RC`：RightCode
- `B`：balance
- `D`：daily window
- `W`：weekly window
- `M`：monthly window
- `Sk5h`：OpenAI Codex Spark 短窗口（如 5h）
- `SkW`：OpenAI Codex Spark 周窗口
- `R3h20m`：还剩 `3h20m` 重置
- `R2D04h`：还剩 `2D04h` 重置
- `E6D00h`：还剩 `6D00h` 到期

compact quota 片段示例：

- `OAI 5h80 R3h20m`：OpenAI 短窗口剩余 80%，还剩 `3h20m` 重置
- `OAI Sk5h100 R1h00m`：OpenAI Codex Spark 5h 窗口剩余 100%，还剩 `1h00m` 重置
- `OAI SkW100 R3D04h`：OpenAI Codex Spark 周窗口剩余 100%，还剩 `3D04h` 重置
- `Cop M78 R12D00h`：Copilot 月额度剩余 78%，还剩 `12D00h` 重置
- `RC D$88.9/$60 E6D00h B260`：RightCode 日额度 + 余额

## 安装

OpenCode 会分别从 `opencode.json` 和 `tui.json` 加载 server / TUI 插件。

`opencode.json`

```json
{
  "plugin": ["@leo000001/opencode-quota-sidebar@latest"]
}
```

`tui.json`

```json
{
  "plugin": ["@leo000001/opencode-quota-sidebar@latest"]
}
```

OpenCode `>=1.2.15` 时，server 插件放在 `opencode.json`，TUI 插件放在 `tui.json`。

## 配置

常见配置路径：

- `~/.config/opencode/quota-sidebar.config.json`
- `<worktree>/quota-sidebar.config.json`
- `<directory>/quota-sidebar.config.json`
- `<worktree>/.opencode/quota-sidebar.config.json`
- `<directory>/.opencode/quota-sidebar.config.json`
- `OPENCODE_QUOTA_CONFIG=/absolute/path/to/config.json`

最小示例：

```json
{
  "sidebar": {
    "enabled": true,
    "titleMode": "auto",
    "showCost": true,
    "showQuota": true,
    "includeChildren": true
  }
}
```

完整配置示例见 [`quota-sidebar.config.example.json`](./quota-sidebar.config.example.json)。

重要配置项：

- `sidebar.titleMode`：`auto`、`compact`、`multiline`
- `sidebar.showCost`：控制 sidebar、title、markdown report、toast 和 CLI 中的 API-equivalent cost 可见性
- `sidebar.wrapQuotaLines`：长 quota 行是否自动续行并缩进
- `sidebar.includeChildren`：`period=session` 时是否聚合 descendant subagent sessions
  配置采用分层覆盖，后层配置覆盖前层配置：

1. 全局配置
2. worktree 配置
3. directory 配置
4. worktree `.opencode` 配置
5. directory `.opencode` 配置
6. `OPENCODE_QUOTA_CONFIG`

插件还会读取 OpenCode 主配置中的价格，候选路径如下：

1. `~/.config/opencode/opencode.jsonc`
2. `~/.config/opencode/opencode.json`
3. `<worktree>/opencode.jsonc`
4. `<worktree>/opencode.json`
5. `<directory>/opencode.jsonc`
6. `<directory>/opencode.json`
7. `<worktree>/.opencode/opencode.jsonc`
8. `<worktree>/.opencode/opencode.json`
9. `<directory>/.opencode/opencode.jsonc`
10. `<directory>/.opencode/opencode.json`

## Linux CLI Notes

- 当本地没有可用 OpenCode server 时，`opencode-quota` 会自动临时拉起一个 `opencode serve`
- 新版本会在 Linux / Unix 下更主动地清理这个临时 server，让 CLI 在输出报告后自然退出
- 如果 Linux 下仍然出现挂住，建议升级到包含该修复的版本

## 持久化与聚合

插件会把数据写入：

- 全局状态：`<opencode-data>/quota-sidebar.state.json`
- session 分片：`<opencode-data>/quota-sidebar-sessions/YYYY/MM/DD.json`

这些持久化 chunk 会保存 title 状态、cached usage、sidebar-panel payload 和 quota cache，从而让 TUI sidebar 在 session open/resume 时可以直接从结构化状态恢复，而不必完全依赖实时 message 扫描。

usage 聚合采用增量模式。插件会为每个 session 维护 cursor，优先只处理新消息；如果消息历史变化导致增量视图失效，再回退到重扫并刷新持久化 usage。

价格缓存提醒：

- 新版本会在 session usage cache 中持久化 `pricingFingerprint`
- 当模型价格从一个非零值改成另一个非零值时，旧的 API cost cache 会自动失效并重算
- 更老版本只依赖 billing version 判断缓存新鲜度，因此历史 session 的 API cost 可能需要强制重算才能更新
- 历史上已经写入的 `Est$...` decorated title 仍会在清理/还原路径里被识别，但新版本生成的 title 统一使用 `API$...`

## 工具

- `quota_summary`：查看 `session`、`day`、`week`、`month` 的用量和 quota
- `quota_show`：切换 title 装饰开关

行为说明：

- `quota_summary` 返回完整 markdown report
- `quota_summary` 可以同时触发 toast 展示
- `quota_summary` 参数为 `period`、`since`、`last`、`toast`、`includeChildren`
- `quota_summary(includeChildren=true)` 只影响 `period=session`
- `day/week/month` 会扫描所选时间范围内的全部 sessions，所以 child sessions 只要在该范围内有 activity 就会被统计进去
- `day/week/month` 不做 parent 树 rollup；child sessions 会作为独立 sessions 计入，而不是通过 `includeChildren` 合并到 parent
- `since` 和 `last` 互斥
- `period=session` 不支持 `since` / `last`
- `quota_show(enabled=true|false)` 可以显式指定目标状态，而不是只做 toggle
- 历史报告同时支持绝对时间 `since` 和相对区间 `last`
- `since` 支持 `YYYY-MM` 或 `YYYY-MM-DD`
- `last` 需要正整数，并按当前 period 相对计算：`day=7`、`week=8`、`month=6`
- 空参数的 `period=day|week|month` 表示当前自然日 / 自然周 / 自然月

命令别名示例：

如果你想直接走工具输出查看历史，可以在配置里声明调用 `quota_summary` 的命令别名。
旧的 TUI 历史弹窗路径已经移除，历史查看统一回到 tool report。
这些别名本质上仍然是 OpenCode 的 command template，因此会先展开为提示词，再进入模型 / tool 链路。若想要更直接、更干净的输出路径，优先使用独立 CLI。

示例：

- `quota_summary(period=day)` -> 今天
- `quota_summary(period=week)` -> 本周
- `quota_summary(period=month)` -> 本月
- `quota_summary(period=day,last=7)` -> 最近 7 天
- `quota_summary(period=week,last=8)` -> 最近 8 周
- `quota_summary(period=month,last=6)` -> 最近 6 个月
- `quota_summary(period=month,since=2026-01)` -> 从 2026-01 开始

```json
{
  "command": {
    "qday": {
      "description": "Today / last N days / since date",
      "template": "Run /qday for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=day, toast=true. If `$ARGUMENTS` is a positive integer: period=day, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM-DD: period=day, since=<that date>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM-DD."
    },
    "qweek": {
      "description": "This week / last N weeks / since date",
      "template": "Run /qweek for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=week, toast=true. If `$ARGUMENTS` is a positive integer: period=week, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM-DD: period=week, since=<that date>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM-DD."
    },
    "qmonth": {
      "description": "This month / last N months / since month",
      "template": "Run /qmonth for opencode-quota-sidebar. Call tool quota_summary exactly once and return its full report directly. If `$ARGUMENTS` is empty: period=month, toast=true. If `$ARGUMENTS` is a positive integer: period=month, last=<that integer>, toast=true. If `$ARGUMENTS` matches YYYY-MM: period=month, since=<that month>, toast=true. Otherwise briefly explain: empty, positive integer, or YYYY-MM."
    },
    "qtoggle": {
      "description": "Toggle sidebar usage display on/off",
      "template": "Call tool quota_show (no arguments, it toggles)."
    }
  }
}
```

## CLI

这个包同时提供一个独立 CLI dashboard。全局安装或让 `bin` 可执行后：

```bash
npm install -g @leo000001/opencode-quota-sidebar
```

如果不想全局安装，也可以直接用 `npx @leo000001/opencode-quota-sidebar <args>` 运行。

```bash
# 当前周期（单次快照）
opencode-quota day          # 今天
opencode-quota week         # 本周（周一起算）
opencode-quota month        # 本月

# 多周期历史
opencode-quota day 7        # 最近 7 天
opencode-quota week 8       # 最近 8 周
opencode-quota month 6      # 最近 6 个月

# 绝对起始日期
opencode-quota day --since 2026-04-01
opencode-quota week --since 2026-04-01
opencode-quota month --since 2026-01

# 位置参数也接受日期字符串（等同于 --since）
opencode-quota day 2026-04-01
opencode-quota month 2026-01
```

不带 `last` 或 `--since` 时，CLI 渲染单周期快照（`QUOTA + TOTALS + PROVIDERS`）。带 `last` 或 `--since` 时渲染多周期历史，并额外展示更大的多行 `TREND` 区块。

### CLI 语义

- `day` = 当前自然日；`week` = 当前自然周（周一起算）；`month` = 当前自然月
- 位置参数正整数映射为 `last=<N>`（从当前往回数 N 个周期）
- 位置参数日期字符串映射为 `--since`（day/week 用 `YYYY-MM-DD`，month 用 `YYYY-MM`）
- `--since` 和 `--last` 互斥
- `last` 对 day 限制 90，week/month 也有合理范围限制

### Trend 区块

`TREND` 区块仅在多周期模式下出现。每个指标（`Requests`、`Tokens`、`Cache`、`Cost`）都会渲染为一个小型多行柱状图：

- 一行摘要：当前值
- 每个可见周期一行柱状条（最多展示最近 8 个周期）
- 当前周期用 `*` 标记

解读示例：

```text
Requests 12.3k
  04-08   | ███░░░░░░░░░░░░░░░ | 4.1k
  04-09   | ██████░░░░░░░░░░░░ | 8.2k
  04-10*  | █████████████░░░░░ | 12.3k
```

这表示当前 bucket 有 `12.3k` 请求，下面的柱状条则按时间顺序展示各个可见 bucket 的相对大小。

### 连接行为

- CLI 默认连接本地 OpenCode API `http://localhost:4096`
- 通过 `OPENCODE_BASE_URL` 覆盖（例如 `http://192.168.1.10:4096`）
- 如果没有运行中的 server 且未设置 `OPENCODE_BASE_URL`，CLI 会尝试自动启动：
  - **Linux/macOS**：运行 `opencode serve --hostname=127.0.0.1 --port=4096`
  - **Windows**：依次尝试 `opencode.cmd`、`opencode`（通过 `shell: true`）、`bash -lc opencode`
- 自动启动等待最多 10 秒，直到 server 输出 `opencode server listening on <url>`
- 如果自动启动失败，请确认 `opencode` 在你的 `PATH` 中
- 在 Windows 上，如果 `opencode.cmd` 不能被 Node 直接 spawn，`shell: true` 通常是更可靠的兜底路径

### 平台说明

- **终端编码**：dashboard 使用 Unicode 绘框字符和方块元素（`█░`），需要支持 UTF-8 的终端。Windows 用户应使用 Windows Terminal、PowerShell 7+ 或其他支持 UTF-8 的终端。经典 cmd.exe 使用传统代码页（CP437/CP850）时可能显示乱码。
- **对齐**：当 week/month 的可见标签非常长时（例如完整绝对日期范围），CLI 的 trend 标签仍可能被截断。这是当前终端 renderer 的已知展示取舍。
- **Windows PATH**：CLI 会尝试多种命令形式来找到 `opencode`。如果全部失败，请确认 `opencode` 或 `opencode.cmd` 在 PATH 中，或手动启动 server 后设置 `OPENCODE_BASE_URL`。
- **Node.js**：需要 `>=18`

### 环境变量

| 变量                         | 默认值                    | 用途                                               |
| ---------------------------- | ------------------------- | -------------------------------------------------- |
| `OPENCODE_BASE_URL`          | `http://localhost:4096`   | OpenCode API 端点；server 在远程或非默认端口时设置 |
| `OPENCODE_QUOTA_CONFIG_HOME` | `~/.config/opencode`      | 全局配置目录覆盖                                   |
| `OPENCODE_QUOTA_DATA_HOME`   | `~/.local/share/opencode` | 全局数据目录覆盖                                   |

## 开发

```bash
npm install
npm run build
npm test
```

如果改动涉及 TypeScript 类型、配置加载或公共行为，建议额外执行：

```bash
npm run typecheck
```

本地调试时：

- 在 `opencode.json` 里加载 `file:///ABSOLUTE/PATH/opencode-quota-sidebar/dist/index.js`
- 在 `tui.json` 里加载 `file:///ABSOLUTE/PATH/opencode-quota-sidebar/dist/tui.tsx`

Windows 下请使用正斜杠形式的 `file:///` 路径。

## 兼容性与注意事项

- Node.js `>=18`
- OpenCode plugin SDK `@opencode-ai/plugin` / `@opencode-ai/sdk` `^1.3.5`
- OpenCode `>=1.2.15` 时，TUI 配置应放在 `tui.json`
- 共享 title 仍然只有一个 `session.title`，所有客户端共用
- 为了避免 resize 场景的渲染污染，sidebar title 默认避免使用 ANSI 样式码
- 有些 provider 提供真正的 quota window，有些 provider 只提供 balance 数据

## 文档导航

- English README：[`README.md`](./README.md)
- 变更记录：[`CHANGELOG.md`](./CHANGELOG.md)
- 贡献指南：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 安全策略：[`SECURITY.md`](./SECURITY.md)

## 贡献

- 变更记录：[`CHANGELOG.md`](./CHANGELOG.md)
- 适配器与架构说明：[`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 安全策略：[`SECURITY.md`](./SECURITY.md)
