# agent-steward

> 用于在 OpenCode V1（≥ 1.18.29）或 V2 中调度与编排 AI agent 任务的插件 —— cron、一次性运行、DAG 流水线、矩阵构建、质量门禁、SQLite 历史记录和本地 Web 仪表盘。支持 Windows、macOS 和 Linux。免费开源（MIT）。

[![CI](https://github.com/DeadSno/agent-steward/actions/workflows/ci.yml/badge.svg)](https://github.com/DeadSno/agent-steward/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/agent-steward.svg)](https://www.npmjs.com/package/agent-steward)
[![npm downloads](https://img.shields.io/npm/dm/agent-steward.svg)](https://www.npmjs.com/package/agent-steward)
[![license](https://img.shields.io/npm/l/agent-steward.svg)](LICENSE)
[![node](https://img.shields.io/node/v/agent-steward.svg)](package.json)

Translations: [English](../README.md) · [Русский](README.ru.md).

---

## 快速开始

1. 安装插件（见[安装](#安装)）并重启 OpenCode。
2. 让 agent 调度你的第一个任务 —— 一次调用即可：

   > 创建一个名为 "morning-report" 的任务，每天 09:00 运行，提示词为："Summarize yesterday's git commits and write the report to ~/reports/"。

3. 打开仪表盘观察运行情况：创建任务时 agent 会打印 URL（默认 `http://localhost:3782`），之后也可以随时用 `get_dashboard_info` 工具获取。想不安装任何东西先看看效果？`node scripts/demo-dashboard.mjs` 会在 `http://localhost:3782` 启动一个演示仪表盘。

## 为什么需要它

大多数面向 AI agent 的调度器只是 cron 包装器：按定时器运行一段提示词，再写一个日志文件。本插件把 agent 任务视为**工作流**：

- **DAG 流水线** —— 任务等待依赖完成，并按成功/失败继续链路。
- **矩阵构建** —— 一个模板、N 个仓库，可并行或串行，带并发限制和按 workspace 覆盖的参数。
- **质量门禁** —— 只有 `npm test`（或任意命令）通过时，任务才被标记为成功。
- **可观测性** —— SQLite 历史、指标、日志和本地 Web 仪表盘。
- **无需打开 OpenCode 也能运行** —— cron 与一次性任务注册到操作系统原生调度器（Windows 任务计划程序、launchd、crontab），重启后依然有效。文件、git 和 MCP 事件触发器在插件进程内监听，因此需要 OpenCode 处于运行状态。

一切都运行在你的机器上。没有 SaaS、没有遥测、没有账号。

![本地 Web 仪表盘：矩阵构建、DAG 图、指标与运行历史](dashboard.png)

不想安装 OpenCode 也想看看效果？`node scripts/demo-dashboard.mjs` 会用演示数据在 http://localhost:3782 启动仪表盘。

## 功能

| 领域 | 你能得到什么 |
|---|---|
| 调度 | cron 表达式、通过 `runAt` / `delaySeconds` 的一次性运行、操作系统原生调度器（Windows / macOS / Linux）、IANA 时区（原生支持优先，否则按分钟轮询 + 门禁）、暂停/恢复、会话连续性（`new` / `reuse` / `last`，配合 `sessionMaxRuns` 清理） |
| 可靠性 | 锁文件防重叠、带强制终止的超时、带延迟的重试、崩溃恢复 |
| 质量 | Quality Gate 命令、before/after 钩子、按任务配置的允许/禁止工具列表 |
| 编排 | `dependsOn` DAG、`nextTaskOnSuccess` / `nextTaskOnError` 链路、矩阵扇出（并行/串行、`continue`/`stop`、并发、按 workspace 覆盖、聚合任务） |
| 触发器 | cron、一次性（`triggerType: "once"`）、git 提交（`triggerType: "git"`，分支/路径/忽略过滤）、文件变更（chokidar，支持 glob 掩码 `watchGlobs`/`watchIgnore`）、MCP 事件、入站 webhook（`POST /api/hooks/:task`，HMAC 签名） |
| 多仓库 | 带路径校验的 workspace、按 workspace 运行、围绕父任务的矩阵 |
| 可观测性 | SQLite 历史（success / error / timeout / partial / running）、指标（耗时、token、成本）、可通过 `/api/logs` 读取的 JSONL 运行日志、Prometheus `/metrics`、OTLP 导出、按任务日志、带 14 天分析的本地 Web 仪表盘、历史保留策略与 CSV/JSON 导出 |
| 运维 | dry-run 预览、JSON 导出/导入、模板、多渠道通知（webhook、Telegram、系统原生 toast）、免打扰时段、摘要、加密密钥（`${secret:NAME}`）、审计日志、设置 |
| 接口 | OpenCode GUI 面板、Web 仪表盘、25 个 agent 工具、内置 agent skill |

### 语言

界面提供俄语、英语和中文。默认选择「自动」模式——与 OpenCode 一样，界面语言跟随 OpenCode；
也可以显式选择俄语、英语或中文。语言选择器位于调度器面板顶部（🌐 自动 / Русский / English / 中文），
也可通过 `manage_settings` 工具切换（`action: "update"`，`locale: "zh"` 等）。
`locale: "auto"`（「自动」，默认）跟随 OpenCode 界面语言：面板会立即响应语言切换，
并将解析后的语言发送到服务器，使通知、摘要和仪表盘保持一致。切换无需重启。
仪表盘的本地化仍在推进：部分客户端字符串目前仍为俄语。按设计，agent 工具描述
与 schema 保持英语，输出到控制台的诊断信息保持俄语。

字符串目录位于 `locales/ru.json`、`locales/en.json` 和 `locales/zh.json`；
每个键必须同时存在于三者中，否则 CI 会失败。

## 安装

需要 OpenCode V1（≥ 1.18.29）或 V2，以及 Node.js 22.22+。版本矩阵与界面差异见
[COMPATIBILITY.md](COMPATIBILITY.md)（GUI 与 RPC 仅支持 V2，TUI 两条版本线都支持）。

配置键因版本线而异：

| OpenCode 版本线 | `opencode.jsonc` 中的键 |
|---|---|
| V1（`1.18.29`–`1.19.x`） | `"plugin": ["agent-steward"]` |
| V2（`≥ 2.2.7`） | `"plugins": ["agent-steward"]` |

请使用对应版本线的键，无需同时添加两者。V2 可直接用 CLI：

```bash
opencode plugin add agent-steward
```

V1 手动配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["agent-steward"]
}
```

V2 手动配置：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["agent-steward"],
  "experimental": {
    "schedules": false
  }
}
```

`experimental.schedules: false` 会关闭 OpenCode 内置调度器，避免 agent 把内置任务工具与本插件的工具混淆。OpenCode 2.x 会自动重新加载配置；如未生效，请执行 `/reload`。1.x 修改配置后请重启 OpenCode。TUI 面板随同一个包提供（`exports["./tui"]`），两条版本线都用同一条配置启用。

从源码安装：

```bash
git clone https://github.com/DeadSno/agent-steward.git
cd agent-steward
npm install
npm run build && npm run build:gui
```

## Agent 工具

agent 可获得完整功能 —— 30 个工具，覆盖调度、流水线、运维、可观测性与管理：

| 工具 | 参数 | 作用 |
|---|---|---|
| `schedule_task` | `name`；cron 用 `schedule`，一次性用 `runAt` / `delaySeconds`；可选 `session` / `sessionMaxRuns`、`timeoutSeconds`、`model`、`priority`、`beforeScript`、`afterScript`、`qualityGate`、`dependsOn`、`retryCount`、`retryDelay`、`nextTaskOnSuccess`、`nextTaskOnError`、`triggerType`（`cron`/`file`/`git`/`mcp-event`/`once`）、`mcpEvent`、`watchPath`、`watchGlobs`、`watchIgnore`、`gitBranch`、`gitPaths`、`gitIgnore`、`gitPollSeconds`、`activeDays`、`windowPolicy`（`skip`/`postpone`/`run`）、`workingDirectory`、`workspaceId`、`allowedTools`、`deniedTools`、`legacyShell`、`matrix` | 在操作系统调度器中注册任务（cron、一次性、文件、git 或 MCP 事件触发器） |
| `list_tasks` | — | 返回任务及其 schedule、状态、下次运行、链路、workspace 和矩阵摘要 |
| `update_task` | `name` + 要修改的字段 | 部分更新；省略的字段保留原值，空值表示清空，`matrix: null` 移除矩阵 |
| `delete_task` | `name` | 删除任务（矩阵父任务会一并删除克隆和聚合器） |
| `run_task_now` | `name` | 立即运行任务（矩阵父任务会启动扇出） |
| `pause_task` | `name` | 暂停任务（矩阵父任务会暂停每个克隆） |
| `resume_task` | `name` | 恢复已暂停的任务 |
| `get_history` | `taskName?`、`status?`、`limit?` | 最近运行记录，含耗时、token、成本、模型、质量门禁与钩子 |
| `get_task_logs` | `name`、`lines?` | 运行日志尾部 |
| `dry_run` | `name?` | 模拟流水线（或全部任务）：执行顺序、DAG、矩阵扇出、估算 |
| `manage_workspaces` | `action`、`id?`、`name?`、`path?`、`color?` | 多仓库 workspace：列出、添加、更新、删除 |
| `matrix_control` | `action`、`name?` | 矩阵结果、取消待运行克隆、清理孤儿、预览克隆 |
| `get_metrics` | — | 汇总的运行数、成功数与失败数 |
| `get_analytics` | `days?`、`topLimit?` | 周期报告：数量、成功率、耗时、token、成本、热门任务 |
| `self_analysis` | `days?`、`topLimit?`、`includeAnomalies?` | 周期自检报告：健康评分、异常检测、趋势分析与优化建议 |
| `manage_settings` | `action`、`maxConcurrent?`、`winterMode?`、`notifications?`、`history?` | 读取/更新全局设置（并发、通知、保留策略） |
| `manage_local_ai` | `action`（`get`/`update`/`test`）、`mode?`、`baseUrl?`、`model?`、`timeoutMs?`、`fallback?`、`confidenceThreshold?`、`shadow?` | 读取、更新或测试本地分诊助手；`test` 会发送一条合成通知并返回延迟与判定结果 |
| `manage_templates` | `action`、模板字段 | 列出、保存或删除可复用的任务模板 |
| `manage_profiles` | `action`、`name?`、`port?` | 列出、创建、切换或删除隔离的 profile |
| `transfer_tasks` | `action`、`data?` | 将所有任务导出为 JSON，或重新导入 |
| `send_notification` | `action`（`test`/`digest`）、`channel?`（`all`/`webhook`/`telegram`/`native`） | 测试通知渠道或发送摘要 |
| `get_dashboard_info` | — | 仪表盘端口/URL、平台、标题、当前 profile |
| `cleanup_history` | `retentionDays?`、`maxRecords?` | 按时间或记录上限删除旧历史 |
| `manage_secrets` | `action`、`name?`、`value?` | 创建、列出或删除用于任务 `env` 的 AES-256-GCM 加密密钥 |
| `get_audit_log` | `action?`、`target?`、`actor?`、`since?`、`until?`、`limit?` | 变更审计日志：谁、何时、通过哪个界面改了什么 |
| `emit_event` | `eventName`、`payload?` | 启动订阅该 MCP 事件的任务 |
| `pipeline_validate` | `path?`、`source?` | 校验 `opencode.pipeline.yaml`，不修改任务 |
| `pipeline_apply` | `path?`、`source?`、`dryRun?` | 幂等地创建/更新流水线任务；`dryRun` 只报告差异 |
| `pipeline_export` | `pipeline` | 将流水线任务导出回 YAML |

`schedule_task` 还接受完整的矩阵配置（`workspaceIds`、`strategy`、`failureMode`、`aggregation`、`concurrency`、`overrides`、`createAggregator`）。

## 权限

Agent 任务以 `opencode run --auto` 运行，因此其工具策略必须显式声明。全局设置 `permissions.defaultPolicy`（GUI → Settings，或 `manage_settings`）决定基线：

| 策略 | 默认允许 | 默认禁止 |
|---|---|---|
| `hybrid`（默认） | read、edit、glob、grep、subagent、skill、webfetch、websearch | shell、question |
| `secure` | read、glob、grep、skill | edit、shell、question、webfetch、websearch、subagent |
| `legacy` | 全部十个动作 | — |

`deniedTools` 始终优先。非空的 `allowedTools` 会变成 allowlist：未列出的动作一律禁止，也可以显式恢复被策略禁止的动作（例如 `shell`）。`legacyShell: true` 仅在 `hybrid` 下恢复 `shell`，用于从旧版本迁移的任务。

被阻止的动作会以 `tool.blocked` 写入审计日志，带 `reason: "default-policy"` 和 `hint`；每次运行还会记录当前生效的策略。

推荐做法：把 `git commit`/`push`、构建和测试放在 agent 之外，通过 `qualityGate` 或 `afterScript` 执行（包装器用 `bash -c` 运行它们），让 agent 只保留 `read`/`edit`。这样大多数任务根本不需要 `shell`。

## Agent skill

插件注册了内置 skill `scheduled-job-best-practices`，agent 只在相关时加载指导：cron 设计、自包含提示词、Quality Gate、矩阵并发、DAG 规则以及事故后诊断。无需手动配置 `.opencode/skills`。该 skill 附带 `references/recipes.md` —— 八个可直接复制的配置。

## 矩阵构建

```jsonc
{
  "name": "deploy",
  "schedule": "0 3 * * *",
  "prompt": "Build, test and deploy",
  "matrix": {
    "workspaceIds": ["frontend-id", "backend-id", "mobile-id"],
    "strategy": "parallel",
    "failureMode": "continue",
    "aggregation": "summary",
    "concurrency": 2,
    "createAggregator": true,
    "overrides": {
      "mobile-id": { "qualityGate": "npm run test:mobile" }
    }
  }
}
```

每个 workspace 会得到一个名为 `<parent>-matrix-<workspace>` 的克隆。父任务自身从不运行：它把克隆结果聚合为 `success`、`error` 或 `partial`。编辑父任务时克隆会保持同步；正在运行的克隆不会被改动。

## Pipeline 即代码

用一个 `opencode.pipeline.yaml` 文件描述整个工作流，而不是逐个创建任务：

```yaml
version: 1
name: nightly-release
defaults:
  retryCount: 1
  retryDelay: 120
steps:
  - id: lint
    schedule: "0 2 * * *"
    prompt: Run the linter and fix what it reports.
    qualityGate: npm run lint
  - id: test
    needs: [lint]
    trigger: dag
    prompt: Run the tests and fix failures.
    qualityGate: npm test
```

`needs` 会变成 DAG 依赖，`trigger: dag` 的步骤只在其依赖成功后运行，`defaults` 由所有步骤继承。每个步骤都会成为名为 `<pipeline> <step>` 的任务。

```bash
agent-steward pipeline validate opencode.pipeline.yaml
agent-steward pipeline apply opencode.pipeline.yaml --dry-run
agent-steward pipeline apply opencode.pipeline.yaml
agent-steward pipeline export --pipeline nightly-release --out opencode.pipeline.yaml
```

apply 是幂等的：未变化的步骤会跳过，修改过的步骤会更新，流水线之外的任务不会被触碰。从文件中删除的步骤会被标记为 stale，但不会自动删除。agent 可通过 `pipeline_validate`、`pipeline_apply` 和 `pipeline_export` 使用同样的操作。

完整格式、矩阵扇出、校验规则与限制见 [docs/PIPELINE.md](PIPELINE.md)，可直接复制的示例见 [opencode.pipeline.yaml](../opencode.pipeline.yaml)。

## GUI 与仪表盘

OpenCode 侧边栏显示任务、历史、日志、dry-run、模板、导入/导出、并发限制和矩阵分组。本地 Web 仪表盘额外提供按 workspace 的汇总、矩阵标签页、流水线视图和指标。

```bash
npm run build:gui   # produces gui-experimental.cjs
```

## 工作原理

```
src/
  index.ts              plugin lifecycle, agent tools, RPC
  gui.tsx               OpenCode sidebar panel
  server.ts             local web dashboard
  core/
    scheduler/          Windows / Linux / macOS backends
    matrix.ts           fan-out, aggregation, sync, cancel
    record-history.ts   history, retries, chains, matrix continuation
    dry-run.ts          pipeline simulation
    lock.ts             no-overlap protection
    file-watcher.ts     chokidar triggers
    telegram.ts         Telegram Bot API delivery
    native-notify.ts    Windows Toast / macOS / Linux notifications
  db/                   SQLite: tasks, history, metrics, settings
  task-transfer.ts      export / import / validation
```

任务包装器在任务工作目录中运行 `opencode run`，因此项目级 MCP server 会被自动加载。

### 登录模式（Windows）

任务默认**仅交互式**：只有当创建任务的那个用户登录时，任务计划程序才会启动它们，并使用正常的配置文件、磁盘映射和已保存凭据。传入 `runWhenLoggedOff: true` 可在无用户登录时运行任务（`schtasks /ru SYSTEM`）。这类任务在会话 0 中运行 —— 没有用户配置文件、映射磁盘、网络共享或已保存凭据 —— 因此依赖你环境的任务可能失败；请先用 `dry_run` 测试。在 Linux 上 crontab 本来就无需登录即可运行，而 macOS 的 launchd agent 仅在用户会话内运行。

## 开发

```bash
npm install
npm run build        # tsc
npm run build:gui    # vite
npm test             # 115 test suites, 600+ checks
npm run test:en      # same suites with the English locale
```

`npm run test:en` 会为每个测试套件设置 `OPENCODE_SCHEDULER_LOCALE=en`；该变量是
服务内部钩子，不是用户设置。

详情见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

## 文档

- [docs/ARCHITECTURE.md](ARCHITECTURE.md) —— 进程模型、模块、后端、数据模型。
- [docs/CONCEPT.md](CONCEPT.md) —— north star：可验证的本地优先编排（俄文）。
- [docs/FEATURES.md](FEATURES.md) —— 带示例的完整功能目录。
- [docs/FAQ.md](FAQ.md) —— 恢复场景与运维问答。
- [docs/MIGRATION.md](MIGRATION.md) —— 从 cron、systemd、launchd 或任务计划程序迁移。
- [docs/PIPELINE.md](PIPELINE.md) —— 流水线即代码：文件格式、CLI、幂等 apply。
- [docs/SAVINGS.md](SAVINGS.md) —— "Saved $" 估算如何计算。
- [CROSS_PLATFORM.md](../CROSS_PLATFORM.md) —— Windows / macOS / Linux 的差异与后端。

## FAQ

**OpenCode 关闭时还能运行吗？**
cron 和一次性任务可以。它们注册在操作系统原生调度器中，因此无需打开 OpenCode 窗口即可运行。

文件（`file`）、git（`git`）和 MCP 事件（`mcp-event`）触发器由插件进程监听（chokidar / git 轮询 / MCP 事件总线），因此这些触发器需要 OpenCode 处于运行状态。

| 触发器 | 无需 OpenCode 运行？ | 机制 |
|---|---|---|
| `cron` | ✅ 是 | 操作系统原生调度器（任务计划程序 / launchd / crontab） |
| `once` | ✅ 是 | 操作系统原生调度器，一次性注册 |
| `file` | ❌ 否 | 插件进程内的 chokidar 监听 |
| `git` | ❌ 否 | 插件进程内的 git 轮询 |
| `mcp-event` | ❌ 否 | 插件进程内的 MCP 事件总线 |
| `webhook`（`/api/hooks/:name`） | ❌ 否 | 插件进程内的 HTTP 服务器 |

**没人登录时任务会运行吗？**
在 Windows 上，只有显式设置 `runWhenLoggedOff: true` 才会：任务以 `schtasks /ru SYSTEM` 注册，在会话 0 中运行，没有你的配置文件、映射磁盘或已保存凭据。默认仅交互式 —— 用户登录时任务才运行。Linux crontab 始终无需登录即可运行；macOS launchd agent 仅在用户会话内运行。

**支持哪些平台？**
Windows（任务计划程序）、macOS（launchd）和 Linux（crontab）。后端差异见 [CROSS_PLATFORM.md](../CROSS_PLATFORM.md)。

**我的数据会去哪里？**
哪里都不去。历史、日志、指标和设置都保存在本地 SQLite 中。没有遥测、没有账号、没有云端。

**如何配置 Telegram 通知？**
用 [@BotFather](https://t.me/BotFather) 创建机器人，复制 token，给机器人发一条消息并从 `getUpdates` 读取 `chat_id`（也可以使用群组/频道 ID）。把两者填入侧边栏面板，或用 `manage_settings` 设置 `notifications.telegram`（`enabled`、`botToken`、`chatId`，可选 `parseMode`）。若不想把密钥写进 `settings.json`，可改用 `OPENCODE_SCHEDULER_TELEGRAM_BOT_TOKEN` 和 `OPENCODE_SCHEDULER_TELEGRAM_CHAT_ID` —— 对应字段为空时会使用环境变量。用 `send_notification` 加 `channel: "telegram"` 验证。

**桌面通知需要额外安装包吗？**
不需要。Windows Toast（PowerShell/WinRT）、macOS 通知中心（`osascript`）和 Linux 的 `notify-send` 都是直接调用，无需 `node-notifier`。通过 `notifications.native.enabled` 启用。

**能在夜间静音通知吗？**
可以。设置 `notifications.quietHours`（`enabled`、`from`、`to`，格式 `HH:MM`）。窗口期内成功和 `partial` 运行会被抑制，而失败和超时始终送达。

**如何保存密钥？**
用 `manage_secrets`（或侧边栏的 **🔐 Secrets** 面板）创建加密密钥。密钥以 AES-256-GCM 保存在 `<PLUGIN_DIR>/secrets.json`，并配有密钥文件（`secrets.key`；POSIX 上权限 0600，Windows 上使用仅授予当前用户的 ACL）。在任务 `env` 中用 `${secret:NAME}` 引用 —— 值在运行时替换，并在日志、历史和审计中脱敏。

**能看到谁改了什么吗？**
可以。审计日志（`get_audit_log` 工具、**Audit log** 面板、`GET /api/audit`）记录每一次变更 —— 任务创建/更新/删除/运行、设置、模板、profile、workspace、密钥、导入、历史清理 —— 包含操作者（mcp/gui/http）、来源、时间戳和脱敏后的详情。默认保留 90 天 / 10 000 条记录。

**它与 `experimental.schedules` 有何不同？**
内置调度器只在 OpenCode 打开时运行任务。本插件使用操作系统原生调度器，并额外提供 DAG 流水线、矩阵构建、质量门禁、webhook 和可观测性。

**任务能在其他仓库中运行吗？**
可以。workspace 指向项目路径，矩阵构建可同时在多个 workspace 中运行同一个模板。

## 路线图

- [ROADMAP.md](../ROADMAP.md) —— 冲刺历史与后续计划。
- [ROADMAP-STRATEGY.md](../ROADMAP-STRATEGY.md) —— 定位与六个月规划。

## 许可证

[MIT](../LICENSE)。
